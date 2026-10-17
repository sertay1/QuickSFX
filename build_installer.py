"""Builds QuickSFX-Setup.exe standalone Windows installer.
Zips the plugin and engine into bundle.zip, then compiles installer_gui.py into a single .exe.
"""
import os
import sys
import shutil
import zipfile
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_SRC = os.path.join(HERE, "resolve-plugin", "com.serta.sfxfinder")
DIST_ENGINE = os.path.join(HERE, "dist", "quicksfx-engine")
BUNDLE_DIR = os.path.join(HERE, "build", "bundle_staging", "com.serta.sfxfinder")
BUNDLE_ZIP = os.path.join(HERE, "bundle.zip")
ICON_ICO = os.path.join(PLUGIN_SRC, "img", "icon.ico")


def prepare_bundle():
    print("[1/3] Preparing bundle payload...")
    if os.path.exists(os.path.dirname(BUNDLE_DIR)):
        shutil.rmtree(os.path.dirname(BUNDLE_DIR))
    os.makedirs(BUNDLE_DIR, exist_ok=True)

    # 1. Copy plugin files
    for item in os.listdir(PLUGIN_SRC):
        s = os.path.join(PLUGIN_SRC, item)
        d = os.path.join(BUNDLE_DIR, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    # 2. Copy standalone engine
    engine_dest = os.path.join(BUNDLE_DIR, "engine")
    if os.path.isdir(DIST_ENGINE):
        print("  -> Including pre-compiled standalone engine...")
        shutil.copytree(DIST_ENGINE, engine_dest)
    else:
        print("  -> Warning: dist/quicksfx-engine not found, including Python source...")
        os.makedirs(engine_dest, exist_ok=True)
        for f in ["server.py", "sound_services.py", "resolve_bridge.py"]:
            sf = os.path.join(HERE, f)
            if os.path.isfile(sf):
                shutil.copy2(sf, os.path.join(engine_dest, f))

    # Also copy static folder
    static_src = os.path.join(HERE, "static")
    if os.path.isdir(static_src):
        shutil.copytree(static_src, os.path.join(engine_dest, "static"), dirs_exist_ok=True)

    # 3. Create zip
    print("[2/3] Compressing into bundle.zip...")
    staging_root = os.path.join(HERE, "build", "bundle_staging")
    if os.path.exists(BUNDLE_ZIP):
        os.remove(BUNDLE_ZIP)

    with zipfile.ZipFile(BUNDLE_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(staging_root):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, staging_root)
                zf.write(full_path, rel_path)

    print(f"  -> Created {BUNDLE_ZIP} ({os.path.getsize(BUNDLE_ZIP) / (1024*1024):.1f} MB)")


def compile_installer():
    print("[3/3] Compiling QuickSFX-Setup.exe with PyInstaller...")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "QuickSFX-Setup",
        "--add-data", f"{BUNDLE_ZIP};.",
    ]
    if os.path.isfile(ICON_ICO):
        cmd.extend(["--icon", ICON_ICO])

    cmd.append("installer_gui.py")

    subprocess.check_call(cmd, cwd=HERE)
    exe_path = os.path.join(HERE, "dist", "QuickSFX-Setup.exe")
    if os.path.isfile(exe_path):
        print()
        print("=" * 60)
        print(f"[SUCCESS] Standalone Installer Built Successfully!")
        print(f"Installer: {exe_path}")
        print(f"Size: {os.path.getsize(exe_path) / (1024*1024):.1f} MB")
        print("Users can simply download and double-click QuickSFX-Setup.exe!")
        print("=" * 60)


if __name__ == "__main__":
    prepare_bundle()
    compile_installer()
