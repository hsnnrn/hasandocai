import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { homedir } from 'os';

// Using ConvertAPI for document conversion

let mainWindow: BrowserWindow;

// Auto-save directory path
const getAutoSavePath = () => {
  return path.join(homedir(), 'Documents', 'DocData');
};

// Ensure DocData directory exists
const ensureDocDataDirectory = async () => {
  const docDataPath = getAutoSavePath();
  try {
    await mkdir(docDataPath, { recursive: true });
    console.log('DocData directory ensured:', docDataPath);
  } catch (error) {
    console.error('Failed to create DocData directory:', error);
  }
};

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.svg')
  });

  // Load the React app - always use development mode for now
  mainWindow.loadURL('http://localhost:3000');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// File processing handlers - Only iLovePDF API
ipcMain.handle('file:process', async (event, filePath, options) => {
  try {
    console.log('File processing started for:', filePath);
    console.log('Processing options:', options);
    
    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);
    
    // Using ConvertAPI for processing
    console.log('Using ConvertAPI for processing');
    
    // Import ConvertAPI service
    const { ConvertAPIService } = await import('./services/ConvertAPIService');
    const convertAPI = new ConvertAPIService('w9G3Anhj1OyLztslOZmwaZcjwJhNpSbn');
    
    let result;
    
    // Determine conversion type based on file extension and output format
    const fileExtension = filePath.toLowerCase().split('.').pop();
    const isImageFile = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'].includes(fileExtension);
    const isPdfFile = fileExtension === 'pdf';
    
    // Handle specific ConvertAPI tools
    if (options.iLovePDFTool) {
      const toolMap: { [key: string]: { from: string, to: string, method?: string } } = {
        'pdf_to_docx': { from: 'pdf', to: 'docx' },
        'pdf_to_jpg': { from: 'pdf', to: 'jpg' },
        'pdf_to_png': { from: 'pdf', to: 'png' },
        'pdf_to_html': { from: 'pdf', to: 'html' },
        'pdf_to_txt': { from: 'pdf', to: 'txt' },
        'docx_to_pdf': { from: 'docx', to: 'pdf' },
        'docx_to_html': { from: 'docx', to: 'html' },
        'docx_to_txt': { from: 'docx', to: 'txt' },
        'jpg_to_pdf': { from: 'jpg', to: 'pdf' },
        'png_to_pdf': { from: 'png', to: 'pdf' },
        'xlsx_to_pdf': { from: 'xlsx', to: 'pdf' },
        'xlsx_to_html': { from: 'xlsx', to: 'html' },
        'xlsx_to_csv': { from: 'xlsx', to: 'csv' },
        'pptx_to_pdf': { from: 'pptx', to: 'pdf' },
        'pptx_to_jpg': { from: 'pptx', to: 'jpg' },
        'pdf_to_ocr': { from: 'pdf', to: 'txt', method: 'ocr' },
        'image_to_ocr': { from: 'jpg', to: 'txt', method: 'ocr' },
        'pdf_to_searchable': { from: 'pdf', to: 'pdf', method: 'ocr' },
        'compress_pdf': { from: 'pdf', to: 'pdf', method: 'compress' },
        'merge_pdf': { from: 'pdf', to: 'pdf', method: 'merge' },
        'split_pdf': { from: 'pdf', to: 'pdf', method: 'split' },
        'watermark_pdf': { from: 'pdf', to: 'pdf', method: 'watermark' },
        'unlock_pdf': { from: 'pdf', to: 'pdf', method: 'unlock' }
      };

      const tool = toolMap[options.iLovePDFTool];
      if (tool) {
        if (tool.method === 'compress') {
          result = await convertAPI.compressPDF(fileBuffer, options.quality || 'medium');
        } else if (tool.method === 'ocr') {
          if (options.iLovePDFTool === 'pdf_to_ocr') {
            result = await convertAPI.extractTextFromPDF(fileBuffer);
          } else if (options.iLovePDFTool === 'image_to_ocr') {
            result = await convertAPI.extractTextFromImage(fileBuffer, tool.from);
          } else if (options.iLovePDFTool === 'pdf_to_searchable') {
            result = await convertAPI.makePDFSearchable(fileBuffer);
          } else {
            result = await convertAPI.convertFile(fileBuffer, tool.from, tool.to);
          }
        } else {
          result = await convertAPI.convertFile(fileBuffer, tool.from, tool.to);
        }
      } else {
        // Fallback to PDF to DOCX
        console.log('Unknown tool, defaulting to PDF to DOCX');
        result = await convertAPI.convertPDFToDOCX(fileBuffer);
      }
    } else {
      // Auto-detect conversion type
      if (isImageFile && options.outputFormat === 'pdf') {
        console.log('Converting image to PDF');
        result = await convertAPI.convertJPGToPDF(fileBuffer, path.basename(filePath), options.outputDirectory);
      } else if (isPdfFile && options.outputFormat === 'docx') {
        console.log('Converting PDF to DOCX');
        result = await convertAPI.convertPDFToDOCX(fileBuffer, path.basename(filePath), options.outputDirectory);
      } else if (isPdfFile && options.outputFormat === 'jpg') {
        console.log('Converting PDF to JPG');
        result = await convertAPI.convertPDFToJPG(fileBuffer, path.basename(filePath), options.outputDirectory);
      } else {
        // Fallback to PDF to DOCX
        console.log('Default conversion: PDF to DOCX');
        result = await convertAPI.convertPDFToDOCX(fileBuffer, path.basename(filePath), options.outputDirectory);
      }
    }
    
    console.log('ConvertAPI result:', result);
    
    // Auto-save to specified directory if conversion was successful
    if (result.success && result.outputPath && options.outputDirectory) {
      try {
        const { mkdir } = await import('fs/promises');
        const { readFile, writeFile } = await import('fs/promises');
        
        // Ensure output directory exists
        await mkdir(options.outputDirectory, { recursive: true });
        
        // Generate output filename
        const fileName = path.basename(filePath);
        const nameWithoutExt = path.parse(fileName).name;
        const outputExt = path.extname(result.outputPath);
        const autoSavePath = path.join(options.outputDirectory, `${nameWithoutExt}_converted${outputExt}`);
        
        // Copy the converted file to output directory
        const convertedFileBuffer = await readFile(result.outputPath);
        await writeFile(autoSavePath, convertedFileBuffer);
        
        // Update result with auto-save path
        result.autoSavePath = autoSavePath;
        console.log('File auto-saved to:', autoSavePath);
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't fail the conversion if auto-save fails
      }
    }
    
    return result;
  } catch (error) {
    console.error('File processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

// Other IPC handlers
ipcMain.handle('file:open', async () => {
  const { dialog } = await import('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'] },
      { name: 'Word Documents', extensions: ['doc', 'docx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('file:save', async (event, data, defaultName) => {
  const { dialog } = await import('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Word Documents', extensions: ['docx'] },
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    const fs = await import('fs/promises');
    await fs.writeFile(result.filePath, data);
    return result.filePath;
  }
  return null;
});

// Directory selection handler
ipcMain.handle('selectDirectory', async () => {
  const { dialog } = await import('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Output Directory'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Get default output directory
ipcMain.handle('getDefaultDirectory', async () => {
  const { homedir } = await import('os');
  return path.join(homedir(), 'Documents', 'DocData');
});

// Data handlers
ipcMain.handle('data:getHistory', async () => {
  // Return empty array for now
  return [];
});

ipcMain.handle('data:saveConversion', async (event, record) => {
  // Save conversion record (implement as needed)
  console.log('Saving conversion record:', record);
  return true;
});

ipcMain.handle('data:getTemplates', async () => {
  return [];
});

ipcMain.handle('data:saveTemplate', async (event, template) => {
  console.log('Saving template:', template);
  return true;
});

// Settings handlers
ipcMain.handle('settings:get', async (event, key) => {
  return null;
});

ipcMain.handle('settings:set', async (event, key, value) => {
  console.log('Setting:', key, value);
  return true;
});

ipcMain.handle('settings:getAll', async () => {
  return {};
});

// App info handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// Initialize DocData directory when app starts
app.whenReady().then(async () => {
  await ensureDocDataDirectory();
});
