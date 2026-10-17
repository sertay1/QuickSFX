import os
import sys
import threading

API_PATH = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules"
if API_PATH not in sys.path:
    sys.path.append(API_PATH)

try:
    import DaVinciResolveScript as dvr
except ImportError:
    dvr = None

SFX_BIN_NAME = "SFX Finder"
SFX_TRACK_NAME = "SFX"


def timecode_to_frame(tc, fps, drop_frame=False):
    """Converts HH:MM:SS:FF (or HH:MM:SS;FF for drop-frame) to an absolute frame number.
    Timecode counts frames with an integer timebase (29.97 -> 30), so we must not multiply by 29.97."""
    is_df = drop_frame or ";" in tc
    parts = [int(p) for p in tc.replace(";", ":").split(":")]
    hh, mm, ss, ff = parts
    base = int(round(fps))
    total = ((hh * 3600) + (mm * 60) + ss) * base + ff
    if is_df and base in (30, 60):
        drop = 2 if base == 30 else 4
        total_minutes = hh * 60 + mm
        total -= drop * (total_minutes - total_minutes // 10)
    return total


class ResolveBridge:
    """Resolve's scripting API is not thread-safe. Flask handles status polling and
    insert requests on different threads at the same time, so every call into Resolve
    is serialized through one lock."""

    def __init__(self):
        self.resolve = None
        self.project_manager = None
        self.lock = threading.RLock()

    def get_resolve(self):
        if not dvr:
            return None
        # Reuse the existing connection while it's alive (scriptapp() is slow).
        if self.resolve is not None:
            try:
                pm = self.resolve.GetProjectManager()
                if pm:
                    self.project_manager = pm
                    return self.resolve
            except Exception:
                pass
        try:
            self.resolve = dvr.scriptapp("Resolve")
            self.project_manager = self.resolve.GetProjectManager() if self.resolve else None
            if not self.project_manager:
                self.resolve = None
            return self.resolve
        except Exception as e:
            print(f"[ResolveBridge] Error connecting: {e}")
            self.resolve = None
            return None

    def get_status(self):
        with self.lock:
            return self._get_status()

    def _get_status(self):
        resolve = self.get_resolve()
        if not resolve:
            return {"connected": False, "message": "DaVinci Resolve bağlı değil"}
        try:
            proj = self.project_manager.GetCurrentProject()
            if not proj:
                return {"connected": True, "project_open": False}
            timeline = proj.GetCurrentTimeline()
            return {
                "connected": True,
                "project_open": True,
                "project_name": proj.GetName(),
                "has_timeline": timeline is not None,
                "timeline_name": timeline.GetName() if timeline else None,
                "timecode": timeline.GetCurrentTimecode() if timeline else None,
            }
        except Exception as e:
            self.resolve = None
            return {"connected": False, "message": str(e)}

    # ---------- helpers ----------
    def _get_or_create_bin(self, media_pool):
        root = media_pool.GetRootFolder()
        for folder in root.GetSubFolderList() or []:
            if folder.GetName() == SFX_BIN_NAME:
                return folder
        return media_pool.AddSubFolder(root, SFX_BIN_NAME) or root

    def _find_clip(self, folder, file_path):
        target = os.path.abspath(file_path).lower()
        for c in folder.GetClipList() or []:
            if (c.GetClipProperty("File Path") or "").lower() == target:
                return c
        return None

    def _clip_length_frames(self, clip, fps):
        try:
            frames = clip.GetClipProperty("Frames")
            if frames and int(frames) > 0:
                return int(frames)
        except Exception:
            pass
        try:
            dur = clip.GetClipProperty("Duration")
            if dur:
                return max(1, timecode_to_frame(dur, fps))
        except Exception:
            pass
        return int(round(fps)) * 10

    def _pick_free_audio_track(self, timeline, start, end):
        """Returns index of an audio track that's empty within [start, end).
        Prefers a track named SFX; never touches a track with overlapping clips. Creates one if needed."""
        count = timeline.GetTrackCount("audio") or 0
        candidates = list(range(1, count + 1))
        # Prefer SFX-named tracks first, then the highest tracks (least likely to hold dialogue).
        candidates.sort(key=lambda i: (timeline.GetTrackName("audio", i) != SFX_TRACK_NAME, -i))
        for idx in candidates:
            if timeline.GetIsTrackLocked("audio", idx):
                continue
            if idx == 1:
                continue  # A1 usually holds the main dialogue/camera audio; keep it untouched.
            busy = False
            for item in timeline.GetItemListInTrack("audio", idx) or []:
                if item.GetStart() < end and item.GetEnd() > start:
                    busy = True
                    break
            if not busy:
                return idx
        timeline.AddTrack("audio", "stereo")
        new_idx = timeline.GetTrackCount("audio")
        try:
            timeline.SetTrackName("audio", new_idx, SFX_TRACK_NAME)
        except Exception:
            pass
        return new_idx

    # ---------- main action ----------
    def import_and_insert(self, file_path, mode="playhead"):
        with self.lock:
            try:
                return self._import_and_insert(file_path, mode)
            except Exception as e:
                self.resolve = None
                return {"success": False, "error": f"Resolve hatası: {e}"}

    def _import_and_insert(self, file_path, mode="playhead"):
        if not os.path.exists(file_path):
            return {"success": False, "error": "Ses dosyası bulunamadı."}

        if not self.get_resolve():
            return {"success": False, "error": "DaVinci Resolve'a bağlanılamadı."}

        proj = self.project_manager.GetCurrentProject()
        if not proj:
            return {"success": False, "error": "Açık proje yok."}

        media_pool = proj.GetMediaPool()
        sfx_bin = self._get_or_create_bin(media_pool)
        media_pool.SetCurrentFolder(sfx_bin)

        clip = self._find_clip(sfx_bin, file_path)
        if not clip:
            imported = media_pool.ImportMedia([os.path.abspath(file_path)]) or []
            clip = imported[0] if imported else self._find_clip(sfx_bin, file_path)
        if not clip:
            return {"success": False, "error": "Media Pool'a aktarılamadı."}

        name = clip.GetName()
        if mode == "pool_only":
            return {"success": True, "message": f"Media Pool'a eklendi · {name}"}

        timeline = proj.GetCurrentTimeline()
        if not timeline:
            return {"success": True, "message": f"Timeline yok, Media Pool'a eklendi · {name}"}

        fps = float(timeline.GetSetting("timelineFrameRate") or 24)
        drop = str(timeline.GetSetting("timelineDropFrameTimecode") or "0") == "1"
        length = self._clip_length_frames(clip, fps)

        if mode == "append":
            start = timeline.GetEndFrame()
        else:
            tc = timeline.GetCurrentTimecode()
            start = timecode_to_frame(tc, fps, drop)

        track_idx = self._pick_free_audio_track(timeline, start, start + length)
        res = media_pool.AppendToTimeline([{
            "mediaPoolItem": clip,
            "mediaType": 2,
            "trackIndex": track_idx,
            "recordFrame": start,
        }])
        if not res:
            return {"success": False, "error": "Timeline'a yerleştirilemedi."}

        where = "sona" if mode == "append" else timeline.GetCurrentTimecode()
        return {"success": True, "message": f"A{track_idx} · {where} · {name}"}
