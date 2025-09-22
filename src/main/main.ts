import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileProcessingService } from './services/FileProcessingService';
import { LocalDataService } from './services/LocalDataService';

// Initialize services
const fileProcessor = new FileProcessingService();
const localData = new LocalDataService();
const store = new Store();

// Enable live reload for Electron in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '../../node_modules/.bin/electron'),
      hardResetMethod: 'exit'
    });
  } catch {}
}

class DocumentConverterApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = !app.isPackaged;

  constructor() {
    this.setupApp();
  }

  private setupApp(): void {
    // App event handlers
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupMenu();
      this.setupIpcHandlers();
      this.setupAutoUpdater();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      // Cleanup before quitting
      fileProcessor.cleanup();
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
      icon: path.join(__dirname, '../../assets/icon.png'),
    });

    // Load the app
    if (this.isDev) {
      const devUrls = [
        process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000',
        'http://localhost:3001',
      ];

      this.mainWindow
        .loadURL(devUrls[0])
        .catch(() => this.mainWindow?.loadURL(devUrls[1]));

      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (this.isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Files...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleOpenFiles(),
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.showSettings(),
          },
          { type: 'separator' },
          {
            role: 'quit',
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Document Converter',
            click: () => this.showAbout(),
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // File operations
    ipcMain.handle('file:open', this.handleOpenFiles.bind(this));
    ipcMain.handle('file:process', this.handleFileProcess.bind(this));
    ipcMain.handle('file:save', this.handleFileSave.bind(this));

    // Data operations
    ipcMain.handle('data:getHistory', (_, filter) => localData.getConversionHistory(filter));
    ipcMain.handle('data:saveConversion', (_, record) => localData.saveConversion(record));
    ipcMain.handle('data:getTemplates', () => localData.getTemplates());
    ipcMain.handle('data:saveTemplate', (_, template) => localData.saveTemplate(template));

    // Settings
    ipcMain.handle('settings:get', (_, key: string) => store.get(key));
    ipcMain.handle('settings:set', (_, key: string, value: any) => store.set(key, value));
    ipcMain.handle('settings:getAll', () => store.store);

    // App info
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:getPlatform', () => process.platform);
  }

  private async handleOpenFiles(): Promise<string[]> {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported', extensions: ['pdf', 'docx', 'xlsx', 'csv'] },
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Word Documents', extensions: ['docx'] },
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'CSV Files', extensions: ['csv'] },
      ],
    });

    return result.canceled ? [] : result.filePaths;
  }

  private async handleFileProcess(event: any, filePath: string, options: any): Promise<any> {
    try {
      return await fileProcessor.processFile(filePath, options);
    } catch (error) {
      console.error('File processing error:', error);
      throw error;
    }
  }

  private async handleFileSave(event: any, data: Buffer, defaultName: string): Promise<string | null> {
    const result = await dialog.showSaveDialog(this.mainWindow!, {
      defaultPath: defaultName,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Word Documents', extensions: ['docx'] },
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'CSV Files', extensions: ['csv'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      const fs = require('fs').promises;
      await fs.writeFile(result.filePath, data);
      return result.filePath;
    }

    return null;
  }

  private setupAutoUpdater(): void {
    if (!this.isDev) {
      autoUpdater.checkForUpdatesAndNotify();

      autoUpdater.on('update-available', () => {
        this.mainWindow?.webContents.send('update:available');
      });

      autoUpdater.on('update-downloaded', () => {
        this.mainWindow?.webContents.send('update:downloaded');
      });
    }
  }

  private showSettings(): void {
    this.mainWindow?.webContents.send('app:showSettings');
  }

  private showAbout(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About Document Converter',
      message: 'Document Converter',
      detail: `Version: ${app.getVersion()}\nAI-powered local document conversion tool`,
    });
  }
}

// Initialize the app
new DocumentConverterApp();
