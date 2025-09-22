import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFiles: () => ipcRenderer.invoke('file:open'),
  processFile: (filePath: string, options: any) => ipcRenderer.invoke('file:process', filePath, options),
  saveFile: (data: Buffer, defaultName: string) => ipcRenderer.invoke('file:save', data, defaultName),

  // Data operations
  getConversionHistory: (filter?: any) => ipcRenderer.invoke('data:getHistory', filter),
  saveConversion: (record: any) => ipcRenderer.invoke('data:saveConversion', record),
  getTemplates: () => ipcRenderer.invoke('data:getTemplates'),
  saveTemplate: (template: any) => ipcRenderer.invoke('data:saveTemplate', template),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Event listeners
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update:available', callback);
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update:downloaded', callback);
  },
  onShowSettings: (callback: () => void) => {
    ipcRenderer.on('app:showSettings', callback);
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Types for TypeScript
declare global {
  interface Window {
    electronAPI: {
      openFiles: () => Promise<string[]>;
      processFile: (filePath: string, options: any) => Promise<any>;
      saveFile: (data: Buffer, defaultName: string) => Promise<string | null>;
      getConversionHistory: (filter?: any) => Promise<any[]>;
      saveConversion: (record: any) => Promise<void>;
      getTemplates: () => Promise<any[]>;
      saveTemplate: (template: any) => Promise<void>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<void>;
      getAllSettings: () => Promise<any>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      onShowSettings: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
