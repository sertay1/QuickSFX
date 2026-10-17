"""QuickSFX Standalone GUI Installer for Windows.
A lightweight, modern dark-themed setup wizard for DaVinci Resolve.
"""
import os
import sys
import shutil
import zipfile
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox

DEST_ROOT = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins"
PLUGIN_DIR = os.path.join(DEST_ROOT, "com.serta.sfxfinder")
RESOLVE_EXE = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe"

COLOR_BG = "#111113"
COLOR_CARD = "#1a1a1e"
COLOR_TEXT = "#f0f0f4"
COLOR_MUTED = "#8e8e98"
COLOR_ACCENT = "#587319"
COLOR_ACCENT_HOVER = "#6b8a20"
COLOR_BORDER = "#2a2a30"
COLOR_SUCCESS = "#3ddc84"
COLOR_DANGER = "#e5484d"


def get_resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller."""
    try:
        base_path = sys._MEIPASS
    except AttributeError:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


class QuickSFXInstallerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("QuickSFX Setup")
        self.root.geometry("480x420")
        self.root.resizable(False, False)
        self.root.configure(bg=COLOR_BG)

        # Center window
        self.root.update_idletasks()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f"{w}x{h}+{x}+{y}")

        # Try to set icon
        icon_path = get_resource_path(os.path.join("resolve-plugin", "com.serta.sfxfinder", "img", "icon.ico"))
        if os.path.isfile(icon_path):
            try:
                self.root.iconbitmap(icon_path)
            except Exception:
                pass

        self.setup_ui()
        self.check_status()

    def setup_ui(self):
        # Header Container
        header = tk.Frame(self.root, bg=COLOR_BG)
        header.pack(fill="x", padx=24, pady=(22, 12))

        # Title & Subtitle
        title_box = tk.Frame(header, bg=COLOR_BG)
        title_box.pack(side="left")

        title = tk.Label(
            title_box,
            text="QuickSFX ⚡",
            font=("Segoe UI", 18, "bold"),
            fg=COLOR_TEXT,
            bg=COLOR_BG
        )
        title.pack(anchor="w")

        subtitle = tk.Label(
            title_box,
            text="DaVinci Resolve Workflow Integration Plugin",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED,
            bg=COLOR_BG
        )
        subtitle.pack(anchor="w")

        # Main Card Box
        card = tk.Frame(self.root, bg=COLOR_CARD, highlightthickness=1, highlightbackground=COLOR_BORDER)
        card.pack(fill="both", expand=True, padx=24, pady=10)

        # Status text
        self.status_title = tk.Label(
            card,
            text="Ready to Install",
            font=("Segoe UI", 12, "bold"),
            fg=COLOR_TEXT,
            bg=COLOR_CARD
        )
        self.status_title.pack(anchor="w", padx=16, pady=(16, 6))

        self.status_desc = tk.Label(
            card,
            text="Installs QuickSFX into DaVinci Resolve Studio.\nNo Python installation or command line required.",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED,
            bg=COLOR_CARD,
            justify="left"
        )
        self.status_desc.pack(anchor="w", padx=16, pady=(0, 14))

        # Destination info
        dest_box = tk.Frame(card, bg="#141416", highlightthickness=1, highlightbackground="#24242a")
        dest_box.pack(fill="x", padx=16, pady=4)

        tk.Label(
            dest_box,
            text="Target Folder:",
            font=("Segoe UI", 8, "bold"),
            fg=COLOR_MUTED,
            bg="#141416"
        ).pack(anchor="w", padx=8, pady=(6, 2))

        self.dest_label = tk.Label(
            dest_box,
            text=PLUGIN_DIR,
            font=("Consolas", 8),
            fg=COLOR_TEXT,
            bg="#141416",
            wraplength=400,
            justify="left"
        )
        self.dest_label.pack(anchor="w", padx=8, pady=(0, 6))

        # Progress bar
        self.progress = ttk.Progressbar(card, mode="indeterminate")
        self.progress.pack(fill="x", padx=16, pady=(14, 6))

        self.log_label = tk.Label(
            card,
            text="Click 'Install QuickSFX' to begin.",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED,
            bg=COLOR_CARD
        )
        self.log_label.pack(anchor="w", padx=16, pady=(0, 12))

        # Actions Row (Footer)
        footer = tk.Frame(self.root, bg=COLOR_BG)
        footer.pack(fill="x", padx=24, pady=(10, 20))

        self.uninstall_btn = tk.Button(
            footer,
            text="Uninstall",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED,
            bg="#1d1d22",
            activebackground="#26262d",
            activeforeground=COLOR_DANGER,
            relief="flat",
            bd=0,
            padx=12,
            pady=6,
            cursor="hand2",
            command=self.on_uninstall
        )
        self.uninstall_btn.pack(side="left")

        self.close_btn = tk.Button(
            footer,
            text="Close",
            font=("Segoe UI", 9),
            fg=COLOR_TEXT,
            bg="#222228",
            activebackground="#2c2c34",
            activeforeground="#fff",
            relief="flat",
            bd=0,
            padx=16,
            pady=6,
            cursor="hand2",
            command=self.root.destroy
        )
        self.close_btn.pack(side="right", padx=(8, 0))

        self.install_btn = tk.Button(
            footer,
            text="⚡ Install QuickSFX",
            font=("Segoe UI", 10, "bold"),
            fg="#ffffff",
            bg=COLOR_ACCENT,
            activebackground=COLOR_ACCENT_HOVER,
            activeforeground="#ffffff",
            relief="flat",
            bd=0,
            padx=20,
            pady=6,
            cursor="hand2",
            command=self.on_install
        )
        self.install_btn.pack(side="right")

    def check_status(self):
        if os.path.exists(PLUGIN_DIR):
            self.status_title.config(text="QuickSFX is currently installed", fg=COLOR_SUCCESS)
            self.log_label.config(text="Click 'Install' to update or 'Uninstall' to remove.")
            self.install_btn.config(text="🔄 Update / Reinstall")

    def on_install(self):
        self.install_btn.config(state="disabled")
        self.uninstall_btn.config(state="disabled")
        self.progress.start(10)
        self.log_label.config(text="Deploying files into DaVinci Resolve...", fg=COLOR_TEXT)
        threading.Thread(target=self._run_install, daemon=True).start()

    def _run_install(self):
        try:
            os.makedirs(DEST_ROOT, exist_ok=True)

            # Check if bundle.zip exists inside resource directory
            bundle_zip = get_resource_path("bundle.zip")
            if os.path.isfile(bundle_zip):
                with zipfile.ZipFile(bundle_zip, "r") as z:
                    z.extractall(DEST_ROOT)
            else:
                # If running directly from dev source repository
                src_dir = get_resource_path(os.path.join("resolve-plugin", "com.serta.sfxfinder"))
                if not os.path.isdir(src_dir):
                    raise RuntimeError(f"Source folder not found: {src_dir}")

                os.makedirs(PLUGIN_DIR, exist_ok=True)
                # Copy plugin UI files
                for item in os.listdir(src_dir):
                    s = os.path.join(src_dir, item)
                    d = os.path.join(PLUGIN_DIR, item)
                    if os.path.isdir(s):
                        shutil.copytree(s, d, dirs_exist_ok=True)
                    else:
                        try:
                            shutil.copy2(s, d)
                        except PermissionError:
                            pass

                # Copy pre-compiled engine or source engine
                engine_dest = os.path.join(PLUGIN_DIR, "engine")
                os.makedirs(engine_dest, exist_ok=True)
                dist_engine = get_resource_path(os.path.join("dist", "quicksfx-engine"))
                if os.path.isdir(dist_engine):
                    shutil.copytree(dist_engine, engine_dest, dirs_exist_ok=True)
                else:
                    for f in ["server.py", "sound_services.py", "resolve_bridge.py"]:
                        sf = get_resource_path(f)
                        if os.path.isfile(sf):
                            shutil.copy2(sf, os.path.join(engine_dest, f))

            self.root.after(0, self._install_success)
        except Exception as e:
            self.root.after(0, lambda: self._install_failed(str(e)))

    def _install_success(self):
        self.progress.stop()
        self.status_title.config(text="Installation Complete! 🎉", fg=COLOR_SUCCESS)
        self.status_desc.config(
            text="QuickSFX is ready in DaVinci Resolve Studio!\nNavigate to: Workspace -> Workflow Integrations -> QuickSFX"
        )
        self.log_label.config(text="✅ Successfully installed.", fg=COLOR_SUCCESS)
        self.install_btn.config(text="Installed", state="disabled", bg="#2e3814")
        self.uninstall_btn.config(state="normal")

        # Change close button to "Launch Resolve" if resolve exists
        if os.path.isfile(RESOLVE_EXE):
            self.close_btn.config(
                text="Launch Resolve",
                bg=COLOR_ACCENT,
                command=self.launch_resolve
            )

    def _install_failed(self, error_msg):
        self.progress.stop()
        self.status_title.config(text="Installation Failed", fg=COLOR_DANGER)
        self.log_label.config(text=f"Error: {error_msg}", fg=COLOR_DANGER)
        self.install_btn.config(state="normal")
        self.uninstall_btn.config(state="normal")
        messagebox.showerror("Installation Error", f"Could not install QuickSFX:\n\n{error_msg}\n\nTry running this installer as Administrator.")

    def on_uninstall(self):
        if not os.path.exists(PLUGIN_DIR):
            messagebox.showinfo("QuickSFX", "QuickSFX is not installed.")
            return

        if messagebox.askyesno("Uninstall QuickSFX", "Are you sure you want to remove QuickSFX from DaVinci Resolve?"):
            try:
                shutil.rmtree(PLUGIN_DIR)
                self.status_title.config(text="Uninstalled", fg=COLOR_MUTED)
                self.log_label.config(text="QuickSFX was successfully removed.", fg=COLOR_TEXT)
                self.install_btn.config(text="⚡ Install QuickSFX", state="normal", bg=COLOR_ACCENT)
                self.uninstall_btn.config(state="disabled")
                messagebox.showinfo("QuickSFX", "QuickSFX has been uninstalled.")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to uninstall: {e}\nTry running as Administrator.")

    def launch_resolve(self):
        if os.path.isfile(RESOLVE_EXE):
            try:
                subprocess.Popen([RESOLVE_EXE])
            except Exception:
                pass
        self.root.destroy()


def main():
    root = tk.Tk()
    app = QuickSFXInstallerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
