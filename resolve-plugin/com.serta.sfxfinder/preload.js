const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sfx', {
    close: () => ipcRenderer.send('win:close'),
    minimize: () => ipcRenderer.send('win:minimize'),
    togglePin: () => ipcRenderer.invoke('win:togglePin'),
    isPinned: () => ipcRenderer.invoke('win:isPinned'),
    startDrag: (filePath) => ipcRenderer.send('drag:start', filePath),
    reveal: (filePath) => ipcRenderer.send('shell:reveal', filePath),
    openExternal: (url) => ipcRenderer.send('shell:openExternal', url),
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    applyUpdate: (updateInfo) => ipcRenderer.invoke('app:applyUpdate', updateInfo),
    onUpdateProgress: (cb) => ipcRenderer.on('app:updateProgress', (e, data) => cb(data)),
    reloadWindow: () => ipcRenderer.send('app:reloadWindow'),
    resetTestVersion: () => ipcRenderer.invoke('app:resetTestVersion'),
    onHidden: (cb) => ipcRenderer.on('app:hidden', () => { try { cb(); } catch (e) {} }),
    onRestored: (cb) => ipcRenderer.on('app:restored', () => { try { cb(); } catch (e) {} })
});
