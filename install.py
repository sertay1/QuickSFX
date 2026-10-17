"""QuickSFX Installer for DaVinci Resolve Workflow Integration.
Deploys the plugin and embedded python engine into DaVinci Resolve's Workflow Integration directory.
"""
import os
import sys
import json
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_SRC = os.path.join(HERE, "resolve-plugin", "com.serta.sfxfinder")
DEST_ROOT = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins"
DEST = os.path.join(DEST_ROOT, "com.serta.sfxfinder")
SDK_NODE = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Workflow Integrations\Examples\SamplePlugin\WorkflowIntegration.node"

ENGINE_FILES = [
    "server.py",
    "sound_services.py",
    "resolve_bridge.py"
]

OLD_LAUNCHERS = [
    os.path.expandvars(r"%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\Pixabay_SFX.py"),
    os.path.join(os.path.expanduser("~"), "Desktop", "Pixabay SFX (DaVinci).bat"),
]


def find_best_python():
    """Detect pythonw.exe if available next to sys.executable, else fallback to sys.executable."""
    exe_dir = os.path.dirname(sys.executable)
    pythonw = os.path.join(exe_dir, "pythonw.exe")
    if os.path.isfile(pythonw):
        return pythonw
    return sys.executable


def main():
    print("=" * 55)
    print("           QuickSFX Installer for DaVinci Resolve")
    print("=" * 55)

    if not os.path.isdir(PLUGIN_SRC):
        print(f"[ERROR] Plugin source directory not found: {PLUGIN_SRC}")
        sys.exit(1)

    # 1. Ensure WorkflowIntegration.node exists
    node_dest = os.path.join(PLUGIN_SRC, "WorkflowIntegration.node")
    if not os.path.isfile(node_dest):
        if os.path.isfile(SDK_NODE):
            print(f"[INFO] Copying SDK WorkflowIntegration.node...")
            shutil.copy2(SDK_NODE, node_dest)
        else:
            print("[WARNING] WorkflowIntegration.node not found. Some Resolve features might require it.")

    # 2. Prepare destination
    os.makedirs(DEST_ROOT, exist_ok=True)
    os.makedirs(DEST, exist_ok=True)

    def safe_copy(src, dst):
        try:
            shutil.copy2(src, dst)
        except PermissionError:
            if os.path.exists(dst):
                print(f"[INFO] Preserving in-use file: {os.path.basename(dst)}")
            else:
                raise

    # 3. Copy plugin UI files
    print("[INFO] Installing plugin files...")
    for item in os.listdir(PLUGIN_SRC):
        s = os.path.join(PLUGIN_SRC, item)
        d = os.path.join(DEST, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            safe_copy(s, d)

    # 4. Copy backend engine files into DEST/engine/
    engine_dest = os.path.join(DEST, "engine")
    os.makedirs(engine_dest, exist_ok=True)
    
    dist_engine = os.path.join(HERE, "dist", "quicksfx-engine")
    if os.path.isdir(dist_engine):
        print("[INFO] Deploying pre-compiled standalone engine (Zero Python dependency)...")
        shutil.copytree(dist_engine, engine_dest, dirs_exist_ok=True)
    else:
        print("[INFO] Deploying Python engine source...")
    
    # Always include source files as fallback
    for f in ENGINE_FILES:
        src_file = os.path.join(HERE, f)
        if os.path.isfile(src_file):
            shutil.copy2(src_file, os.path.join(engine_dest, f))

    # Also copy static folder if present
    static_src = os.path.join(HERE, "static")
    if os.path.isdir(static_src):
        shutil.copytree(static_src, os.path.join(engine_dest, "static"), dirs_exist_ok=True)

    # 5. Write configuration
    py_path = find_best_python()
    cfg = {
        "pythonPath": py_path,
        "engineDir": engine_dest,
        "version": "2.0.0"
    }
    cfg_file = os.path.join(DEST, "config.json")
    with open(cfg_file, "w", encoding="utf-8") as fp:
        json.dump(cfg, fp, indent=2)
    print(f"[INFO] Configured Python interpreter: {py_path}")

    # 6. Cleanup legacy scripts
    for p in OLD_LAUNCHERS:
        if os.path.exists(p):
            try:
                os.remove(p)
                print(f"[INFO] Cleaned up legacy launcher: {p}")
            except Exception:
                pass

    print()
    print("=" * 55)
    print("[SUCCESS] QuickSFX successfully installed!")
    print(f"Location: {DEST}")
    print()
    print("How to use:")
    print("1. Open (or restart) DaVinci Resolve Studio.")
    print("2. In the top menu, go to:")
    print("   Workspace -> Workflow Integrations -> QuickSFX")
    print("=" * 55)


if __name__ == "__main__":
    try:
        main()
    except PermissionError as e:
        print()
        print("[ERROR] Permission denied!")
        print("Please run this installer as Administrator (Right click -> Run as administrator).")
        sys.exit(2)
    except Exception as e:
        print()
        print(f"[ERROR] Installation failed: {e}")
        sys.exit(1)
