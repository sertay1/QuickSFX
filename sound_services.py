import os
import re
import json
import urllib.parse
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from bs4 import BeautifulSoup
from curl_cffi import requests

BASE_DOWNLOAD_DIR = os.environ.get("QUICKSFX_DIR") or os.path.join(os.path.expanduser("~"), "Music", "QuickSFX")
os.makedirs(BASE_DOWNLOAD_DIR, exist_ok=True)

def sanitize_filename(filename):
    cleaned = re.sub(r'[\\/*?:"<>|]', "", filename)
    cleaned = cleaned.strip()
    if not cleaned.lower().endswith(".mp3"):
        cleaned += ".mp3"
    return cleaned

class PixabayProvider:
    def __init__(self, session):
        self.session = session
        self.cache = {}

    def search(self, query="", page=1):
        query = query.strip()
        cache_key = f"{query.lower()}_{page}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        if query:
            q_enc = urllib.parse.quote(query)
            url = f"https://pixabay.com/sound-effects/search/{q_enc}/?pagi={page}"
        else:
            url = f"https://pixabay.com/sound-effects/?pagi={page}"

        try:
            res = self.session.get(url, impersonate="chrome120", timeout=7)
            if res.status_code != 200:
                return []

            m = re.search(r'window\.__BOOTSTRAP_URL__\s*=\s*[\'"]([^\'"]+)[\'"]', res.text)
            if not m:
                return []

            bootstrap_url = "https://pixabay.com" + m.group(1)
            b_res = self.session.get(bootstrap_url, impersonate="chrome120", timeout=7)
            if b_res.status_code != 200:
                return []

            data = b_res.json()
            page_data = data.get("page", {})
            results = page_data.get("results", [])

            items = []
            for r in results:
                sources = r.get("sources", {})
                src = sources.get("src")
                if not src:
                    continue

                duration_sec = r.get("duration", 0)
                mins = duration_sec // 60
                secs = duration_sec % 60
                duration_str = f"{mins:02d}:{secs:02d}"

                raw_filename = sources.get("filename") or f"pixabay_{r.get('id')}.mp3"
                clean_name = sanitize_filename(raw_filename)

                items.append({
                    "id": f"px_{r.get('id')}",
                    "name": r.get("name") or r.get("title") or "Pixabay SFX",
                    "duration": duration_sec,
                    "duration_formatted": duration_str,
                    "audio_url": src,
                    "filename": clean_name,
                    "source": "pixabay"
                })

            self.cache[cache_key] = items
            return items
        except Exception as e:
            print(f"[Pixabay] Error: {e}")
            return []


class MixkitProvider:
    def __init__(self, session):
        self.session = session
        self.cache = {}

    def search(self, query="", page=1):
        query = query.strip()
        cache_key = f"{query.lower()}_{page}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        q_slug = re.sub(r'[^a-zA-Z0-9_\- ]', '', query).replace(' ', '-')
        if q_slug:
            url = f"https://mixkit.co/free-sound-effects/{q_slug}/?page={page}"
        else:
            url = f"https://mixkit.co/free-sound-effects/?page={page}"

        try:
            res = self.session.get(url, impersonate="chrome120", timeout=7)
            if res.status_code != 200:
                return []

            soup = BeautifulSoup(res.text, "html.parser")
            cards = soup.find_all("div", attrs={"data-controller": re.compile(r"audio-player")})
            items = []

            for c in cards:
                mp3 = c.get("data-audio-player-preview-url-value")
                if not mp3:
                    continue
                parent = c.find_parent("div", class_=re.compile(r"item-grid__item")) or c.parent
                title_el = parent.find(["h2", "h3"]) or parent.find("a", class_=re.compile(r"title"))
                title = title_el.text.strip() if title_el else "Mixkit SFX"
                item_id = c.get("data-audio-player-item-id-value") or "sfx"
                filename = sanitize_filename(f"mixkit_{item_id}_{re.sub(r'[^a-zA-Z0-9]', '_', title)}.mp3")

                items.append({
                    "id": f"mk_{item_id}",
                    "name": title,
                    "duration": 0,
                    "duration_formatted": "HD Studio",
                    "audio_url": mp3,
                    "filename": filename,
                    "source": "mixkit"
                })

            self.cache[cache_key] = items
            return items
        except Exception as e:
            print(f"[Mixkit] Error: {e}")
            return []


class MyInstantsProvider:
    def __init__(self, session):
        self.session = session
        self.cache = {}

    def search(self, query="", page=1):
        query = query.strip()
        cache_key = f"{query.lower()}_{page}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        if query:
            q_enc = urllib.parse.quote(query)
            url = f"https://www.myinstants.com/en/search/?name={q_enc}&page={page}"
        else:
            url = f"https://www.myinstants.com/en/index/us/?page={page}"

        try:
            res = self.session.get(url, impersonate="chrome120", timeout=7)
            if res.status_code != 200:
                return []

            soup = BeautifulSoup(res.text, "html.parser")
            buttons = soup.find_all("div", class_="instant")
            items = []

            for b in buttons:
                link = b.find("a", class_="instant-link")
                title = link.text.strip() if link else "Instant Sound"
                btn = b.find("button", class_="small-button")
                onclick = btn.get("onclick") if btn else ""

                m = re.search(r"play\('([^']+)'", onclick)
                if not m:
                    continue

                sound_path = m.group(1)
                audio_url = "https://www.myinstants.com" + sound_path

                safe_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', title).replace(' ', '_')
                clean_name = sanitize_filename(f"myinstants_{safe_title}.mp3")

                items.append({
                    "id": f"mi_{clean_name}",
                    "name": title,
                    "duration": 0,
                    "duration_formatted": "Meme SFX",
                    "audio_url": audio_url,
                    "filename": clean_name,
                    "source": "myinstants"
                })

            self.cache[cache_key] = items
            return items
        except Exception as e:
            print(f"[MyInstants] Error: {e}")
            return []


class FreesoundProvider:
    def __init__(self, session):
        self.session = session
        self.cache = {}

    def search(self, query="", page=1):
        query = query.strip()
        cache_key = f"{query.lower()}_{page}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        if not query:
            query = "foley"

        q_enc = urllib.parse.quote(query)
        url = f"https://freesound.org/search/?q={q_enc}&page={page}"

        try:
            res = self.session.get(url, impersonate="chrome120", timeout=7)
            if res.status_code != 200:
                return []

            soup = BeautifulSoup(res.text, "html.parser")
            cards = soup.find_all("div", attrs={"data-sound-id": True})
            items = []

            for c in cards:
                sound_id = c.get("data-sound-id")
                title = c.get("data-title") or f"Freesound_{sound_id}"
                mp3_url = c.get("data-mp3")
                if not mp3_url:
                    continue

                duration_raw = float(c.get("data-duration") or 0)
                duration_sec = int(duration_raw)
                mins = duration_sec // 60
                secs = duration_sec % 60
                duration_str = f"{mins:02d}:{secs:02d}"

                safe_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', title).replace(' ', '_')
                clean_name = sanitize_filename(f"freesound_{sound_id}_{safe_title}.mp3")

                items.append({
                    "id": f"fs_{sound_id}",
                    "name": title,
                    "duration": duration_sec,
                    "duration_formatted": duration_str,
                    "audio_url": mp3_url,
                    "filename": clean_name,
                    "source": "freesound"
                })

            self.cache[cache_key] = items
            return items
        except Exception as e:
            print(f"[Freesound] Error: {e}")
            return []


EXPLORE_CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "explore_cache.json")
ALL_SOURCES = ["pixabay", "mixkit", "myinstants", "freesound"]
SOURCE_TIMEOUT = 9          # hard cap (seconds) for a whole unified search
QUERY_CACHE_MAX = 200       # LRU size for unified results


class ThreadSafeSession:
    """curl_cffi Session objects are NOT thread-safe. Flask serves requests on many
    threads and the unified search fans out on a thread pool, so sharing one Session
    caused random hangs/empty results. Each thread now gets its own Session."""

    def __init__(self):
        self._local = threading.local()

    def _session(self):
        s = getattr(self._local, "s", None)
        if s is None:
            s = requests.Session()
            self._local.s = s
        return s

    def get(self, *args, **kwargs):
        return self._session().get(*args, **kwargs)


class SoundManager:
    def __init__(self):
        self.session = ThreadSafeSession()
        self.providers = {
            "pixabay": PixabayProvider(self.session),
            "mixkit": MixkitProvider(self.session),
            "myinstants": MyInstantsProvider(self.session),
            "freesound": FreesoundProvider(self.session),
        }
        # Two long-lived pools: one coordinates searches, one does the per-site fetches.
        # (Using a single pool for both could deadlock when it fills up.)
        self.search_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="sfx-search")
        self.fetch_pool = ThreadPoolExecutor(max_workers=12, thread_name_prefix="sfx-fetch")
        self.lock = threading.Lock()
        self.query_cache = OrderedDict()
        self.inflight = {}            # cache_key -> Future (dedupes identical concurrent searches)
        self.download_locks = {}
        self.explore_cache = None
        self._load_explore_cache()

    # ---------- explore cache ----------
    def _load_explore_cache(self):
        try:
            if os.path.exists(EXPLORE_CACHE_PATH):
                with open(EXPLORE_CACHE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict) and isinstance(data.get("items"), list):
                    self.explore_cache = data
        except Exception:
            self.explore_cache = None

    def _save_explore_cache(self, items):
        self.explore_cache = {"items": items}
        try:
            tmp = EXPLORE_CACHE_PATH + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.explore_cache, f)
            os.replace(tmp, EXPLORE_CACHE_PATH)   # atomic: never leaves a half-written file
        except Exception:
            pass

    # ---------- query cache (LRU) ----------
    def _cache_get(self, key):
        with self.lock:
            if key in self.query_cache:
                self.query_cache.move_to_end(key)
                return self.query_cache[key]
        return None

    def _cache_put(self, key, value):
        with self.lock:
            self.query_cache[key] = value
            self.query_cache.move_to_end(key)
            while len(self.query_cache) > QUERY_CACHE_MAX:
                self.query_cache.popitem(last=False)

    # ---------- search ----------
    @staticmethod
    def _interleave(results_by_source, sources):
        combined, seen = [], set()
        max_len = max((len(v) for v in results_by_source.values()), default=0)
        for i in range(max_len):
            for src in sources:
                items = results_by_source.get(src) or []
                if i < len(items) and items[i]["id"] not in seen:
                    seen.add(items[i]["id"])
                    combined.append(items[i])
        return combined

    def search_unified(self, query="", active_sources=None, page=1):
        sources = [s for s in (active_sources or []) if s in self.providers] or list(ALL_SOURCES)
        q = (query or "").strip()
        page = max(1, int(page or 1))
        key = (q.lower(), tuple(sorted(sources)), page)

        cached = self._cache_get(key)
        if cached is not None:
            return cached

        # Instant first page for the empty "Keşfet" feed.
        if not q and page == 1 and self.explore_cache:
            items = [it for it in self.explore_cache["items"] if it.get("source") in sources]
            if items:
                return {"items": items, "page": 1, "query": "", "cached": True, "failed": []}

        # If the exact same search is already running (fast typing / double clicks), share it.
        with self.lock:
            fut = self.inflight.get(key)
            if fut is None:
                fut = self.search_pool.submit(self._run_search, q, sources, page, key)
                self.inflight[key] = fut
                fut.add_done_callback(lambda _f, k=key: self._drop_inflight(k))
        try:
            return fut.result(timeout=SOURCE_TIMEOUT + 5)
        except Exception:
            return {"items": [], "page": page, "query": q, "failed": sources}

    def _drop_inflight(self, key):
        with self.lock:
            self.inflight.pop(key, None)

    def _run_search(self, q, sources, page, key):
        futures = {self.fetch_pool.submit(self.providers[s].search, q, page): s for s in sources}
        results = {}
        try:
            for f in as_completed(futures, timeout=SOURCE_TIMEOUT):
                try:
                    results[futures[f]] = f.result() or []
                except Exception:
                    results[futures[f]] = []
        except FuturesTimeout:
            pass  # slow sources are skipped instead of freezing the whole search

        failed = []
        for s in sources:
            # providers only cache successful fetches; anything missing there failed or timed out
            if f"{q.lower()}_{page}" not in self.providers[s].cache:
                failed.append(s)
            results.setdefault(s, [])

        combined = self._interleave(results, sources)
        res = {"items": combined, "page": page, "query": q, "failed": failed}

        # Only cache complete results -> a temporary site hiccup is never "remembered".
        if not failed:
            self._cache_put(key, res)
            if not q and page == 1 and set(sources) == set(ALL_SOURCES) and combined:
                self._save_explore_cache(combined)
        return res

    # ---------- download ----------
    def download_sound(self, audio_url, filename, source="general"):
        if not audio_url or not filename:
            raise Exception("Geçersiz ses bilgisi")
        clean_name = sanitize_filename(filename)
        dest_path = os.path.join(BASE_DOWNLOAD_DIR, clean_name)

        with self.lock:
            lk = self.download_locks.setdefault(dest_path, threading.Lock())
        # Same file requested twice at once (hover prefetch + click) -> download only once.
        with lk:
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
                return dest_path
            res = self.session.get(audio_url, impersonate="chrome120", timeout=20)
            if res.status_code != 200 or len(res.content) <= 500:
                raise Exception(f"Ses indirilemedi (HTTP {res.status_code})")
            tmp = dest_path + ".part"
            with open(tmp, "wb") as f:
                f.write(res.content)
            os.replace(tmp, dest_path)   # never leaves a corrupt half-file that Resolve would import
            return dest_path
