import os
import sys
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")
import subprocess
import threading
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sound_services import SoundManager, BASE_DOWNLOAD_DIR, sanitize_filename
from resolve_bridge import ResolveBridge

app = Flask(__name__, static_folder="static")
CORS(app)

sound_manager = SoundManager()
bridge = ResolveBridge()

GLOBAL_CATEGORIES = [
    {"label": "✨ Hepsi", "query": ""},
    {"label": "💨 Whoosh & Geçiş", "query": "whoosh"},
    {"label": "💥 Impact & Vuruş", "query": "impact"},
    {"label": "🎬 Sinematik & Riser", "query": "cinematic"},
    {"label": "⚡ Glitch & Bozulma", "query": "glitch"},
    {"label": "🎭 Meme & Viral", "query": "vine boom"},
    {"label": "🔔 UI & Bildirim", "query": "pop"},
    {"label": "🎮 Oyun & Discord", "query": "game"},
    {"label": "🌿 Doğa & Ambiyans", "query": "ambience"},
    {"label": "👣 Foley & Adım", "query": "footsteps"},
    {"label": "🤡 Komedi & Karikatür", "query": "cartoon"},
    {"label": "👻 Korku & Gerilim", "query": "horror"},
]

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

@app.route("/api/audio/<path:filename>")
def serve_audio(filename):
    clean_name = sanitize_filename(filename)
    return send_from_directory(BASE_DOWNLOAD_DIR, clean_name)

@app.route("/api/categories")
def get_categories():
    return jsonify(GLOBAL_CATEGORIES)

@app.route("/api/status")
def get_status():
    status = bridge.get_status()
    return jsonify(status)

@app.route("/api/search")
def search():
    query = request.args.get("q", "")
    sources_str = request.args.get("sources", "")
    active_sources = [s.strip() for s in sources_str.split(",") if s.strip()]
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1

    results = sound_manager.search_unified(query=query, active_sources=active_sources, page=page)
    return jsonify(results)

@app.route("/api/health")
def health():
    return jsonify({"ok": True})

@app.route("/api/config")
def config():
    return jsonify({
        "download_dir": BASE_DOWNLOAD_DIR,
        "version": "1.0.0"
    })

@app.route("/api/shutdown")
def shutdown():
    import time
    def _kill():
        time.sleep(0.15)
        os._exit(0)
    threading.Thread(target=_kill, daemon=True).start()
    return jsonify({"ok": True})

@app.route("/api/prefetch", methods=["POST"])
def prefetch():
    data = request.json or {}
    try:
        path = sound_manager.download_sound(data.get("audio_url"), data.get("filename"))
        return jsonify({"success": True, "local_path": path})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/action", methods=["POST"])
def perform_action():
    data = request.json or {}
    audio_url = data.get("audio_url")
    filename = data.get("filename")
    source = data.get("source", "general")
    mode = data.get("mode", "playhead") # playhead, append, pool_only

    if not audio_url or not filename:
        return jsonify({"success": False, "error": "Geçersiz ses bilgisi."}), 400

    try:
        # 1. Download file
        local_path = sound_manager.download_sound(audio_url, filename, source=source)

        # 2. Add to DaVinci Resolve
        result = bridge.import_and_insert(local_path, mode=mode)
        result["local_path"] = local_path
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/open-folder", methods=["POST"])
def open_folder():
    data = request.json or {}
    local_path = data.get("local_path")
    try:
        if local_path and os.path.exists(local_path):
            subprocess.Popen(["explorer", f"/select,{local_path}"])
        else:
            subprocess.Popen(["explorer", BASE_DOWNLOAD_DIR])
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    print(f"Starting Unified Multi-Platform SFX Server on http://127.0.0.1:8765...")
    app.run(host="127.0.0.1", port=8765, debug=False, threaded=True, use_reloader=False)
