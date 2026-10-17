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
const GITHUB_REPO = 'sertay1/QuickSFX';

// Test mode configuration (set enabled: false for production GitHub releases)
const TEST_UPDATE_MOCK = {
    enabled: false,
    mockVersion: '1.1.1',
    releaseName: 'QuickSFX v1.1.1 (Test Release)',
    releaseUrl: 'https://github.com/sertay1/QuickSFX'
};

function getAppVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        return pkg.version || '1.0.0';
    } catch (e) {
        return '1.0.0';
    }
}
let APP_VERSION = getAppVersion();

function setAppVersion(newVer) {
    try {
        const pkgPath = path.join(__dirname, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.version = newVer;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4), 'utf8');
        APP_VERSION = newVer;
    } catch (e) {}
}

function parseSemver(v) {
    if (!v) return [0, 0, 0];
    const clean = String(v).replace(/^[^\d]*/, '');
    return clean.split('.').map(n => parseInt(n, 10) || 0);
}

function compareVersions(v1, v2) {
    const p1 = parseSemver(v1);
    const p2 = parseSemver(v2);
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
        const curVer = getAppVersion();

        const fallbackTest = () => {
            if (TEST_UPDATE_MOCK.enabled && compareVersions(TEST_UPDATE_MOCK.mockVersion, curVer) > 0) {
                return resolve({
                    updateAvailable: true,
                    currentVersion: curVer,
                    latestVersion: TEST_UPDATE_MOCK.mockVersion,
                    releaseUrl: TEST_UPDATE_MOCK.releaseUrl,
                    downloadUrl: 'mock',
                    releaseName: TEST_UPDATE_MOCK.releaseName,
                    isTest: true
                });
            }
            return resolve({ updateAvailable: false, currentVersion: curVer });
        };

        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'QuickSFX-App',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 3500
        };

        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                return fallbackTest();
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const tag = release.tag_name || '';
                    const remoteVer = tag.replace(/^[^\d]*/, '');
                    const gitHubUpdateAvailable = compareVersions(remoteVer, curVer) > 0;

                    if (gitHubUpdateAvailable) {
                        let downloadUrl = release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
                        let zipUrl = null;
                        let exeUrl = null;

                        if (Array.isArray(release.assets)) {
                            const zipAsset = release.assets.find(a => a.name && (a.name.endsWith('.zip') || a.name.includes('plugin')));
                            if (zipAsset && zipAsset.browser_download_url) {
                                zipUrl = zipAsset.browser_download_url;
                            }
                            const exeAsset = release.assets.find(a => a.name && a.name.endsWith('.exe'));
                            if (exeAsset && exeAsset.browser_download_url) {
                                exeUrl = exeAsset.browser_download_url;
                            }
                        }

                        return resolve({
                            updateAvailable: true,
                            currentVersion: curVer,
                            latestVersion: remoteVer || tag,
                            releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
                            downloadUrl: zipUrl || exeUrl || downloadUrl,
                            zipUrl: zipUrl,
                            exeUrl: exeUrl,
                            releaseName: release.name || tag,
                            isTest: false
                        });
                    }

                    // If GitHub has no newer version, fallback to mock test mode if available
                    fallbackTest();
                } catch (e) {
                    fallbackTest();
                }
            });
        });

        req.on('error', () => fallbackTest());
        req.on('timeout', () => { req.destroy(); fallbackTest(); });
        req.end();
    });
}

function applyInAppUpdate(updateInfo, sender) {
    return new Promise(async (resolve, reject) => {
        const sendProgress = (pct, stage) => {
            try {
                if (sender && !sender.isDestroyed()) {
                    sender.send('app:updateProgress', { percent: pct, stage: stage });
                }
            } catch (e) {}
        };

        try {
            if (updateInfo.isTest) {
                // Test mode: Simulate realistic multi-stage update process smoothly
                sendProgress(15, 'connecting');
                await new Promise(r => setTimeout(r, 400));
                sendProgress(45, 'downloading');
                await new Promise(r => setTimeout(r, 600));
                sendProgress(80, 'verifying');
                await new Promise(r => setTimeout(r, 500));
                sendProgress(95, 'installing');

                // Update local version in package.json to test version (1.1.1)
                setAppVersion(updateInfo.latestVersion || '1.1.1');

                await new Promise(r => setTimeout(r, 400));
                sendProgress(100, 'done');
                return resolve({ success: true, version: updateInfo.latestVersion || '1.1.1' });
            }

            // Real in-app update from GitHub release
            const targetUrl = updateInfo.zipUrl || updateInfo.exeUrl || updateInfo.downloadUrl;
            if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
                throw new Error('Invalid download URL');
            }

            sendProgress(10, 'connecting');
            const tempDir = app.getPath('temp');

            // Helper to download file with redirect handling and progress tracking
            const downloadFile = (url, destPath) => new Promise((dlResolve, dlReject) => {
                const getWithRedirect = (curUrl, redirectCount = 0) => {
                    if (redirectCount > 5) return dlReject(new Error('Too many redirects'));
                    const client = curUrl.startsWith('https') ? https : http;
                    const headers = { 'User-Agent': 'QuickSFX-App', 'Accept': '*/*' };
                    client.get(curUrl, { headers }, (res) => {
                        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                            return getWithRedirect(res.headers.location, redirectCount + 1);
                        }
                        if (res.statusCode !== 200) {
                            return dlReject(new Error(`Download failed with status ${res.statusCode}`));
                        }
                        const total = parseInt(res.headers['content-length'] || '0', 10);
                        let received = 0;
                        const fileStream = fs.createWriteStream(destPath);
                        res.on('data', chunk => {
                            received += chunk.length;
                            if (total > 0) {
                                const pct = Math.min(85, Math.floor(10 + (received / total) * 75));
                                sendProgress(pct, 'downloading');
                            }
                        });
                        res.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            dlResolve();
                        });
                        fileStream.on('error', dlReject);
                    }).on('error', dlReject);
                };
                getWithRedirect(url);
            });

            // Case A: Setup .exe download -> run silently
            if (targetUrl.toLowerCase().includes('.exe')) {
                const exePath = path.join(tempDir, `quicksfx-setup-${Date.now()}.exe`);
                await downloadFile(targetUrl, exePath);
                sendProgress(90, 'installing');

                await new Promise((runResolve, runReject) => {
                    exec(`"${exePath}" --silent`, (err) => {
                        if (!err) {
                            try { fs.unlinkSync(exePath); } catch (e) {}
                            return runResolve();
                        }
                        // If direct exec failed (e.g. requires elevation), fallback to Start-Process RunAs
                        const psCmd = `Start-Process -FilePath '${exePath}' -ArgumentList '--silent' -Verb RunAs -Wait`;
                        exec(`powershell -NoProfile -Command "${psCmd}"`, (psErr) => {
                            try { fs.unlinkSync(exePath); } catch (e) {}
                            if (psErr) return runReject(new Error(`Kurulum tamamlanamadı: ${psErr.message || err.message}`));
                            runResolve();
                        });
                    });
                });

                setAppVersion(updateInfo.latestVersion);
                sendProgress(100, 'done');
                return resolve({ success: true, version: updateInfo.latestVersion });
            }

            // Case B: .zip archive download -> extract and overwrite
            const zipPath = path.join(tempDir, `quicksfx-update-${Date.now()}.zip`);
            const extractDir = path.join(tempDir, `quicksfx-extract-${Date.now()}`);
            await downloadFile(targetUrl, zipPath);

            sendProgress(88, 'installing');

            // 1. Kill background engine to unlock .exe and .pyd files before overwriting
            await new Promise((kResolve) => {
                exec('taskkill /F /IM quicksfx-engine.exe /T', () => setTimeout(kResolve, 500));
            });

            // Extract using PowerShell built-in Expand-Archive
            await new Promise((exResolve, exReject) => {
                exec(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, (err) => {
                    if (err) return exReject(err);
                    exResolve();
                });
            });

            // Find extracted plugin files
            const findPluginFolder = (dir) => {
                if (fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'manifest.xml'))) {
                    return dir;
                }
                const subdirs = fs.readdirSync(dir, { withFileTypes: true });
                for (const sub of subdirs) {
                    if (sub.isDirectory()) {
                        const found = findPluginFolder(path.join(dir, sub.name));
                        if (found) return found;
                    }
                }
                return null;
            };

            const pluginSource = findPluginFolder(extractDir);
            if (pluginSource) {
                const copyRecursive = (src, dest) => {
                    fs.mkdirSync(dest, { recursive: true });
                    const entries = fs.readdirSync(src, { withFileTypes: true });
                    for (const entry of entries) {
                        const s = path.join(src, entry.name);
                        const d = path.join(dest, entry.name);
                        if (entry.isDirectory()) {
                            copyRecursive(s, d);
                        } else {
                            try {
                                fs.copyFileSync(s, d);
                            } catch (copyErr) {
                                // Safely skip locked files (e.g. WorkflowIntegration.node)
                            }
                        }
                    }
                };
                copyRecursive(pluginSource, __dirname);
            }

            try { fs.unlinkSync(zipPath); } catch (e) {}
            try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (e) {}

            setAppVersion(updateInfo.latestVersion);
            setTimeout(() => {
                startEngine();
            }, 300);
            sendProgress(100, 'done');
            resolve({ success: true, version: updateInfo.latestVersion });
        } catch (err) {
            reject(err);
        }
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

    // 2. Kill engine process tree forcefully on Windows
    try {
        if (engineProc && engineProc.pid) {
            exec(`taskkill /F /PID ${engineProc.pid} /T`, () => {});
        } else {
            exec('taskkill /F /IM quicksfx-engine.exe /T', () => {});
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
            width: data.width ? Math.max(395, data.width) : 395,
            height: data.height ? Math.max(565, data.height) : 565
        };
    } catch (e) {
        return { width: 395, height: 565 };
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
        width: s.width || 395,
        height: s.height || 565,
        x: s.x, y: s.y,
        minWidth: 395,
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
        return getAppVersion();
    });

    ipcMain.handle('app:applyUpdate', async (event, updateInfo) => {
        try {
            return await applyInAppUpdate(updateInfo, event.sender);
        } catch (e) {
            return { success: false, error: e.message || String(e) };
        }
    });

    ipcMain.on('app:reloadWindow', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
        }
    });

    ipcMain.handle('app:resetTestVersion', () => {
        setAppVersion('1.0.0');
        return '1.0.0';
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
