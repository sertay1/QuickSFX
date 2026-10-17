// QuickSFX — DaVinci Resolve Workflow Integration plugin (Electron main process).
// Resolve launches this from Workspace → Workflow Integrations → QuickSFX.
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn, exec } = require('child_process');

const PLUGIN_ID = 'com.serta.sfxfinder';
const PORT = 8765;
const APP_VERSION = '1.0.0';
const GITHUB_REPO = 'sertay1/QuickSFX';

function compareVersions(v1, v2) {
    const p1 = (v1 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const p2 = (v2 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        const a = p1[i] || 0;
        const b = p2[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }
    return 0;
}

function checkGitHubUpdate() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'QuickSFX-App',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 4000
        };

        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                return resolve({ updateAvailable: false, currentVersion: APP_VERSION });
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const tag = release.tag_name || '';
                    const remoteVer = tag.replace(/^v/, '');
                    const updateAvailable = compareVersions(remoteVer, APP_VERSION) > 0;
                    
                    let downloadUrl = release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
                    if (Array.isArray(release.assets)) {
                        const setupAsset = release.assets.find(a => a.name && a.name.endsWith('.exe'));
                        if (setupAsset && setupAsset.browser_download_url) {
                            downloadUrl = setupAsset.browser_download_url;
                        }
                    }

                    resolve({
                        updateAvailable,
                        currentVersion: APP_VERSION,
                        latestVersion: remoteVer || tag,
                        releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
                        downloadUrl: downloadUrl,
                        releaseName: release.name || tag
                    });
                } catch (e) {
                    resolve({ updateAvailable: false, currentVersion: APP_VERSION });
                }
            });
        });

        req.on('error', () => resolve({ updateAvailable: false, currentVersion: APP_VERSION }));
        req.on('timeout', () => { req.destroy(); resolve({ updateAvailable: false, currentVersion: APP_VERSION }); });
        req.end();
    });
}

let mainWindow = null;
let workflow = null;
let isQuitting = false;

let engineProc = null;

// ---------- Clean Exit Handler ----------
function cleanExit(isResolveQuitting = false) {
    if (isQuitting) return;
    isQuitting = true;

    // 0. Save state and instantly vanish the window (0ms delay, prevents "Not responding" hang)
    try { saveState(); } catch (e) {}
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            mainWindow.removeAllListeners('close');
            mainWindow.hide();
            mainWindow.destroy();
        } catch (e) {}
        mainWindow = null;
    }

    // 1. Tell Python engine to shutdown immediately and release RAM
    try {
        const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/shutdown', timeout: 300 });
        req.on('error', () => {});
    } catch (e) {}

    // 2. Kill engine process if we spawned it
    try {
        if (engineProc && !engineProc.killed) {
            engineProc.kill();
        }
    } catch (e) {}

    // 3. Cleanup WorkflowIntegration native handle ONLY when Resolve itself is shutting down.
    // Calling CleanUp() while DaVinci Resolve is actively running causes a synchronous native C++ lock/deadlock.
    if (isResolveQuitting) {
        try {
            if (workflow && typeof workflow.CleanUp === 'function') {
                workflow.CleanUp();
            }
        } catch (e) {}
    }

    // 4. Forceful immediate process exit to guarantee no lingering background handles
    setTimeout(() => {
        try {
            process.exit(0);
        } catch (e) {
            app.exit(0);
        }
    }, 40);
}

// ---------- Single instance lock ----------
// When user clicks the menu item in Resolve again, un-hide and focus the window immediately.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.exit(0);
} else {
    app.on('second-instance', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            try { mainWindow.webContents.send('app:restored'); } catch (e) {}
        } else {
            createWindow();
        }
    });
}

// ---------- Window state ----------
const statePath = () => path.join(app.getPath('userData'), 'sfxfinder-window.json');
function loadState() {
    try {
        const data = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
        return {
            ...data,
            width: data.width ? Math.max(370, data.width) : 370,
            height: data.height ? Math.max(565, data.height) : 565
        };
    } catch (e) {
        return { width: 370, height: 565 };
    }
}
function saveState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const b = mainWindow.getBounds();
        fs.writeFileSync(statePath(), JSON.stringify({ ...b, pinned: mainWindow.isAlwaysOnTop() }));
    } catch (e) { /* ignore */ }
}

// ---------- Python engine ----------
function pingEngine() {
    return new Promise((resolve) => {
        const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/health', timeout: 500 }, (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

function getEngineDir() {
    try {
        const cfgPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(cfgPath)) {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            if (cfg.engineDir && fs.existsSync(cfg.engineDir)) return cfg.engineDir;
        }
    } catch (e) {}

    const internalEngine = path.join(__dirname, 'engine');
    if (fs.existsSync(path.join(internalEngine, 'server.py'))) {
        return internalEngine;
    }
    if (fs.existsSync(path.join(__dirname, 'server.py'))) {
        return __dirname;
    }
    return internalEngine;
}

function getPythonCandidates() {
    const list = [];
    try {
        const cfgPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(cfgPath)) {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            if (cfg.pythonPath && fs.existsSync(cfg.pythonPath)) {
                list.push(cfg.pythonPath);
            }
        }
    } catch (e) {}

    list.push('pythonw', 'python', 'py');

    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData) {
        const progPy = path.join(localAppData, 'Programs', 'Python');
        if (fs.existsSync(progPy)) {
            try {
                const subdirs = fs.readdirSync(progPy);
                for (const d of subdirs) {
                    const pw = path.join(progPy, d, 'pythonw.exe');
                    if (fs.existsSync(pw)) list.push(pw);
                    const p = path.join(progPy, d, 'python.exe');
                    if (fs.existsSync(p)) list.push(p);
                }
            } catch (e) {}
        }
    }
    return list;
}

async function startEngine() {
    try {
        if (await pingEngine()) return; // Already running

        // 1. Check for pre-compiled standalone engine (ZERO Python requirement!)
        const standaloneCandidates = [
            path.join(__dirname, 'engine', 'quicksfx-engine.exe'),
            path.join(__dirname, 'quicksfx-engine.exe'),
            path.join(getEngineDir(), 'quicksfx-engine.exe')
        ];
        for (const exe of standaloneCandidates) {
            if (fs.existsSync(exe)) {
                const proc = spawn(exe, [], {
                    cwd: path.dirname(exe),
                    windowsHide: true,
                    stdio: 'ignore',
                    detached: true
                });
                engineProc = proc;
                proc.unref();
                return;
            }
        }

        // 2. Fallback to Python script execution if running from source
        const engineDir = getEngineDir();
        const script = path.join(engineDir, 'server.py');
        if (!fs.existsSync(script)) return;

        const candidates = getPythonCandidates();
        for (const py of candidates) {
            if (py.includes('\\') && !fs.existsSync(py)) continue;
            try {
                const proc = spawn(py, [script], {
                    cwd: engineDir,
                    windowsHide: true,
                    stdio: 'ignore',
                    detached: true
                });
                engineProc = proc;
                proc.unref(); // Detach completely so it never blocks Electron
                return;
            } catch (e) { /* try next candidate */ }
        }
    } catch (e) {}
}

// ---------- Resolve WorkflowIntegration native hook ----------
function initWorkflowIntegration() {
    try {
        workflow = require('./WorkflowIntegration.node');
        if (workflow && typeof workflow.Initialize === 'function') {
            if (workflow.Initialize(PLUGIN_ID)) {
                if (typeof workflow.RegisterCallback === 'function') {
                    workflow.RegisterCallback('ResolveQuit', () => {
                        cleanExit(true);
                    });
                }
            }
        }
    } catch (e) {
        workflow = null;
    }
}

// ---------- Window creation ----------
function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        return;
    }

    const s = loadState();
    mainWindow = new BrowserWindow({
        width: s.width || 370,
        height: s.height || 565,
        x: s.x, y: s.y,
        minWidth: 370,
        minHeight: 565,
        frame: false,
        alwaysOnTop: s.pinned !== false,
        backgroundColor: '#111113',
        title: 'QuickSFX',
        icon: path.join(__dirname, 'img', 'icon.ico'),
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('moved', saveState);
    mainWindow.on('resized', saveState);

    // Terminate completely on close so 0 MB of RAM is consumed in the background!
    mainWindow.on('close', (e) => {
        if (e && typeof e.preventDefault === 'function') {
            try { e.preventDefault(); } catch (err) {}
        }
        cleanExit(false);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ---------- IPC ----------
function registerIpc() {
    ipcMain.on('win:close', () => {
        cleanExit(false);
    });

    ipcMain.on('win:minimize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
    });

    ipcMain.handle('win:togglePin', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return false;
        const next = !mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(next);
        saveState();
        return next;
    });

    ipcMain.handle('win:isPinned', () => {
        return (mainWindow && !mainWindow.isDestroyed()) ? mainWindow.isAlwaysOnTop() : false;
    });

    // Native OS drag: lets the user drop the downloaded file straight onto the Resolve timeline.
    ipcMain.on('drag:start', (event, filePath) => {
        if (!filePath || !fs.existsSync(filePath)) return;
        event.sender.startDrag({ file: filePath, icon: path.join(__dirname, 'img', 'drag.png') });
    });

    ipcMain.on('shell:reveal', (event, filePath) => {
        if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
    });

    ipcMain.on('shell:openExternal', (event, url) => {
        if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
            shell.openExternal(url);
        }
    });

    ipcMain.handle('app:checkUpdate', async () => {
        return await checkGitHubUpdate();
    });

    ipcMain.handle('app:getVersion', () => {
        return APP_VERSION;
    });
}

// ---------- App lifecycle ----------
app.whenReady().then(() => {
    registerIpc();
    createWindow();
    initWorkflowIntegration();
    startEngine();
});

app.on('before-quit', () => {
    cleanExit(false);
});

app.on('window-all-closed', () => {
    cleanExit(false);
});
