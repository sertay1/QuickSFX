# QuickSFX ⚡

<p align="center">
  <img src="resolve-plugin/com.serta.sfxfinder/img/logo.png" alt="QuickSFX Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Fast, unified sound effects search and timeline integration for DaVinci Resolve.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/DaVinci%20Resolve-Studio%2018%2B-blue?logo=blackmagicdesign" alt="DaVinci Resolve Studio">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows" alt="Windows">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License: MIT">
</p>

---

**QuickSFX** is a native **Workflow Integration plugin** for **DaVinci Resolve**. It lets video editors browse, search, preview, and instantly drop thousands of free sound effects from multiple top platforms directly into their project timeline without ever leaving DaVinci Resolve.

---

## ✨ Features

- **🌐 Multi-Source Search:** Simultaneously queries **Pixabay**, **Mixkit**, **MyInstants**, and **Freesound** with instant filtering.
- **⚡ Instant Timeline Insertion:**
  - **At Playhead:** Places the audio clip directly at your current timeline cursor.
  - **At Timeline End:** Appends to the end of the SFX audio track.
  - **Media Pool Only:** Imports directly into your project's `SFX Finder` bin without touching the timeline.
- **🖐 Native Drag & Drop:** Drag any sound effect row directly onto any track or location on your timeline.
- **🎧 Responsive Audio Player Deck:**
  - Interactive scrubbing bar to jump to any part of the audio.
  - 2-second quick jump (`←` / `→`) and continuous audio loop toggle.
  - Smooth volume slider with mouse-wheel scroll adjustment and mute toggle.
- **🏷️ Quick Preset Tags:** Pre-configured filters for Whoosh, Impact, Riser, Glitch, Transition, Meme, Vine boom, Foley, Ambience, and more (supports horizontal mouse-wheel scrolling).
- **🌍 Bilingual & Customizable:**
  - Built-in **English** 🇬🇧 and **Türkçe** 🇹🇷 language options.
  - **Dark**, **Light**, and **System** appearance themes.
  - Always-on-top window pin toggle.
- **⚡ Auto-Managed Backend:** Automatically boots the local Python audio engine in the background—no manual server terminal required.

---

## 📋 Requirements

1. **DaVinci Resolve Studio 18 or later**  
   *(Note: Workflow Integrations is a native feature of DaVinci Resolve Studio).*
2. **Windows 10 / 11 (64-bit)**
3. **Python 3.10+** *(Only required if building from source or using the manual Python installer; NOT needed if using `QuickSFX-Setup.exe`).*

---

## 🚀 Installation

### Option 1: Standalone Windows Installer (Easiest — Recommended ⭐)

> 💡 **No Python installation, terminal commands, or dependencies required!**

1. Go to the [Releases](https://github.com/sertay1/QuickSFX/releases) page and download **`QuickSFX-Setup.exe`**.
2. Double-click **`QuickSFX-Setup.exe`** and click **⚡ Install QuickSFX**.
3. Open **DaVinci Resolve Studio** and navigate to:  
   👉 **Workspace → Workflow Integrations → QuickSFX**

---

### Option 2: 1-Click Batch Setup (From Source)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/sertay1/QuickSFX.git
   ```
2. Double-click **`install.bat`** (or right-click → **Run as administrator**).
3. The script automatically verifies Python, installs dependencies, and deploys the plugin.
4. Launch DaVinci Resolve Studio → **Workspace → Workflow Integrations → QuickSFX**.

---

### Option 3: Manual Python Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the deployment script:
   ```bash
   python install.py
   ```
3. Restart DaVinci Resolve Studio.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `/` | Focus search bar |
| `Space` | Play / Pause audio preview |
| `Enter` | Insert selected sound to timeline |
| `←` / `→` | Rewind / Fast forward preview by 2 seconds |
| `↑` / `↓` | Navigate through sound results list |
| `Esc` | Clear search or close modals |

---

## 🗑️ Uninstallation

To remove QuickSFX from DaVinci Resolve:
- Double-click **`uninstall.bat`**  
*(or delete `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.serta.sfxfinder`)*

---

## 📜 License

This project is open-source under the [MIT License](LICENSE). Sound effects provided by Pixabay, Mixkit, MyInstants, and Freesound are subject to their respective platform licenses and terms of use.
