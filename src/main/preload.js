const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFiles: () => ipcRenderer.invoke('file:open'),
  processFile: (filePath, options) => ipcRenderer.invoke('file:process', filePath, options),
  saveFile: (data, defaultName) => ipcRenderer.invoke('file:save', data, defaultName),

  // Data operations
  getConversionHistory: (filter) => ipcRenderer.invoke('data:getHistory', filter),
  saveConversion: (record) => ipcRenderer.invoke('data:saveConversion', record),
  getTemplates: () => ipcRenderer.invoke('data:getTemplates'),
  saveTemplate: (template) => ipcRenderer.invoke('data:saveTemplate', template),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Event listeners
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update:available', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update:downloaded', callback);
  },
  onShowSettings: (callback) => {
    ipcRenderer.on('app:showSettings', callback);
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
