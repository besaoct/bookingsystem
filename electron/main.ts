import { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { execSync } from 'child_process';

function getRawMachineId(): string {
  try {
    if (process.platform === 'darwin') {
      const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { timeout: 3000 }).toString();
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i);
      if (match && match[1]) return match[1];
    } else if (process.platform === 'win32') {
      try {
        const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { timeout: 3000 }).toString();
        const match = output.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) return match[1];
      } catch {
        const output = execSync('wmic csproduct get uuid', { timeout: 3000 }).toString();
        const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) return lines[1];
      }
    } else if (process.platform === 'linux') {
      if (fs.existsSync('/etc/machine-id')) {
        return fs.readFileSync('/etc/machine-id', 'utf8').trim();
      }
      if (fs.existsSync('/var/lib/dbus/machine-id')) {
        return fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
      }
    }
  } catch (err) {
    console.warn('Native machine ID query failed, falling back to CPU/network signature:', err);
  }

  // Fallback to stable system properties
  const cpuInfo = os.cpus().map(c => c.model).join(',');
  const hostname = os.hostname();
  const arch = os.arch();
  return `${hostname}-${arch}-${cpuInfo}`;
}

function getFormattedMachineId(): string {
  const raw = getRawMachineId();
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  return `BS-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Booking System',
    // Hide native title bar; we render our own themed one
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac && { trafficLightPosition: { x: 14, y: 14 } }),
    frame: isMac, // frameless on Windows/Linux, inset on macOS
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    backgroundColor: '#1a56db', // matches --primary hsl(217 88% 46%)
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler for Thermal Ticket Printing (10.2 cm x 3.5 cm)
ipcMain.handle('print-thermal-tickets', async (_event, htmlContent: string, options?: { silent?: boolean; printerName?: string; widthCm?: number | string; heightCm?: number | string }) => {
  try {
    const widthCm = Number(options?.widthCm) || 10.2;
    const heightCm = Number(options?.heightCm) || 3.5;
    const widthMicrons = Math.round(widthCm * 10000);
    const heightMicrons = Math.round(heightCm * 10000);

    const printWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      title: 'Ticket Print',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        javascript: true,
      },
    });

    const fullHtml = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');
          * {
            box-sizing: border-box;
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif !important;
            -webkit-font-smoothing: antialiased;
          }
          @page {
            size: ${widthCm}cm ${heightCm}cm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif !important;
            font-size: 8pt;
            line-height: 1.15;
            background: #fff;
            color: #000;
          }
          .ticket-slip {
            width: ${widthCm}cm;
            height: ${heightCm}cm;
            max-height: ${heightCm}cm;
            page-break-after: always;
            box-sizing: border-box;
            padding: 2mm 3mm;
            overflow: hidden;
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif !important;
          }
          .ticket-slip:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>`;

    await printWindow.loadURL('about:blank');
    await printWindow.webContents.executeJavaScript(
      `document.open(); document.write(${JSON.stringify(fullHtml)}); document.close();`
    );

    // Give fonts/layout a moment to settle before printing
    await new Promise((r) => setTimeout(r, 600));

    // Validate the printer name
    const availablePrinters = await printWindow.webContents.getPrintersAsync();
    const printerNames = availablePrinters.map((p) => p.name);
    const hasValidPrinter =
      !!options?.printerName && printerNames.includes(options.printerName);

    // Any platform with a named thermal printer: direct silent print
    // (webContents.print with silent:true + deviceName works on both macOS and Windows)
    if (hasValidPrinter) {
      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: options?.silent ?? true,
            deviceName: options!.printerName!,
            margins: { marginType: 'none' },
            pageSize: { width: widthMicrons, height: heightMicrons },
          },
          (success, failureReason) => {
            try { if (!printWindow.isDestroyed()) printWindow.close(); } catch (_) {}
            if (!success) console.error('Ticket print failed:', failureReason);
            resolve(success);
          }
        );
      });
    }

    // macOS or no named printer: printToPDF → temp file → open in system viewer
    // Use A4 so content renders correctly; user selects custom paper in the print dialog
    const pdfBuffer = await printWindow.webContents.printToPDF({
      landscape: false,
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
    });

    try { if (!printWindow.isDestroyed()) printWindow.close(); } catch (_) {}

    const tmpDir = app.getPath('temp');
    const tmpFile = path.join(tmpDir, `Ticket_${Date.now()}.pdf`);
    fs.writeFileSync(tmpFile, pdfBuffer);

    await shell.openPath(tmpFile);
    return true;
  } catch (err) {
    console.error('Error in print-thermal-tickets handler:', err);
    return false;
  }
});

// Window control IPC handlers
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());
ipcMain.handle('win:is-maximized', () => mainWindow?.isMaximized() ?? false);

// Print current page (for DCR report etc.) — triggers native print dialog
ipcMain.on('print-page', () => {
  if (!mainWindow) return;
  mainWindow.webContents.print(
    {
      silent: false,
      landscape: true,
      pageSize: 'A4',
      margins: { marginType: 'printableArea' },
    },
    (success, errorType) => {
      if (!success) console.error('Print failed:', errorType);
    }
  );
});

// Print DCR document: renders to PDF via printToPDF, writes to a temp file,
// then opens it in the OS default PDF viewer (Preview on macOS, Edge/Adobe on Windows).
// This is the only approach that reliably triggers the native OS print dialog on all platforms.
ipcMain.handle(
  'print-dcr-document',
  async (
    _event,
    options: {
      htmlContent: string;
      orientation?: 'portrait' | 'landscape';
      pageSize?: string;
      printerName?: string;
      silent?: boolean;
    }
  ) => {
    try {
      const printWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 850,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          javascript: true,
        },
      });

      await printWindow.loadURL('about:blank');
      await printWindow.webContents.executeJavaScript(
        `document.open(); document.write(${JSON.stringify(options.htmlContent)}); document.close();`
      );

      // Wait for fonts and layout to render fully
      await new Promise((r) => setTimeout(r, 800));

      const pdfBuffer = await printWindow.webContents.printToPDF({
        landscape: options?.orientation !== 'portrait',
        pageSize: (options?.pageSize as any) || 'A4',
        printBackground: true,
        margins: { marginType: 'printableArea' },
      });

      try { if (!printWindow.isDestroyed()) printWindow.close(); } catch (_) {}

      // Write to a temp file and open in the OS default PDF viewer
      // macOS: opens in Preview (Cmd+P for print panel)
      // Windows: opens in Edge / Adobe Reader (Ctrl+P for print dialog)
      const tmpDir = app.getPath('temp');
      const tmpFile = path.join(tmpDir, `DCR_Report_${Date.now()}.pdf`);
      fs.writeFileSync(tmpFile, pdfBuffer);

      await shell.openPath(tmpFile);
      return true;
    } catch (err) {
      console.error('Error in print-dcr-document handler:', err);
      return false;
    }
  }
);

// Save DCR Report as high-resolution PDF
ipcMain.handle(
  'save-dcr-pdf',
  async (
    _event,
    options: {
      htmlContent: string;
      orientation?: 'portrait' | 'landscape';
      pageSize?: string;
      defaultFileName?: string;
    }
  ) => {
    try {
      if (!mainWindow) return false;
      const printWindow = new BrowserWindow({
        show: false,
        width: 1024,
        height: 768,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          javascript: true,
        },
      });

      await printWindow.loadURL('about:blank');
      await printWindow.webContents.executeJavaScript(
        `document.open(); document.write(${JSON.stringify(options.htmlContent)}); document.close();`
      );
      await new Promise((r) => setTimeout(r, 400));

      const pdfBuffer = await printWindow.webContents.printToPDF({
        landscape: options?.orientation === 'landscape',
        pageSize: (options?.pageSize as any) || 'A4',
        printBackground: true,
        margins: {
          top: 0.35,
          bottom: 0.35,
          left: 0.35,
          right: 0.35,
        },
      });

      printWindow.close();

      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save DCR Report as PDF',
        defaultPath:
          options?.defaultFileName ||
          `DCR_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      });

      if (filePath) {
        fs.writeFileSync(filePath, pdfBuffer);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error in save-dcr-pdf handler:', err);
      return false;
    }
  }
);

// Get available printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// Backup & Restore IPC handlers
ipcMain.handle('save-backup-file', async (_event, data: Uint8Array) => {
  if (!mainWindow) return false;
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Cinema Database Backup',
    defaultPath: `Booking_System_Backup_${new Date().toISOString().slice(0, 10)}.sqlite`,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
  });

  if (filePath) {
    fs.writeFileSync(filePath, Buffer.from(data));
    return true;
  }
  return false;
});

ipcMain.handle('load-backup-file', async () => {
  if (!mainWindow) return null;
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Cinema Database Backup',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    properties: ['openFile'],
  });

  if (filePaths && filePaths.length > 0) {
    const buffer = fs.readFileSync(filePaths[0]);
    return new Uint8Array(buffer);
  }
  return null;
});

// IPC Handler to load sql-wasm.wasm binary directly from disk (100% offline & file:// protocol safe)
ipcMain.handle('get-sql-wasm-binary', async () => {
  try {
    const candidates = [
      path.join(app.getAppPath(), 'dist', 'sql-wasm.wasm'),
      path.join(__dirname, '../dist/sql-wasm.wasm'),
      path.join(__dirname, 'sql-wasm.wasm'),
      path.join(process.resourcesPath, 'app.asar/dist/sql-wasm.wasm'),
      path.join(process.resourcesPath, 'dist', 'sql-wasm.wasm'),
      path.join(process.resourcesPath, 'sql-wasm.wasm'),
      path.join(app.getAppPath(), 'public', 'sql-wasm.wasm'),
      path.join(__dirname, '../public/sql-wasm.wasm'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        return new Uint8Array(buf);
      }
    }
  } catch (err) {
    console.error('Failed to read sql-wasm.wasm binary in main process:', err);
  }
  return null;
});

// IPC Handler to retrieve Hardware Machine ID
ipcMain.handle('get-machine-id', async () => {
  return getFormattedMachineId();
});

// IPC Handler to load a .lic license file via native OS open dialog
ipcMain.handle('load-license-file', async () => {
  if (!mainWindow) return null;
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Software License File (.lic)',
    filters: [
      { name: 'Booking System License (*.lic, *.json)', extensions: ['lic', 'json', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const content = fs.readFileSync(filePaths[0], 'utf8');
      return content;
    } catch (err) {
      console.error('Failed to read selected license file:', err);
    }
  }
  return null;
});

// IPC Handler to save a .lic license file via native OS save dialog
ipcMain.handle('save-license-file', async (_event, defaultName: string, content: string) => {
  if (!mainWindow) return false;
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save License File',
    defaultPath: defaultName || 'Booking_System_Software_License.lic',
    filters: [{ name: 'License File (*.lic)', extensions: ['lic'] }],
  });

  if (filePath) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
});

