import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';

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

    // Use about:blank + executeJavaScript to reliably write HTML
    // (data: URLs can silently fail in packaged Electron apps)
    await printWindow.loadURL('about:blank');
    await printWindow.webContents.executeJavaScript(
      `document.open(); document.write(${JSON.stringify(fullHtml)}); document.close();`
    );

    // Give fonts/layout a moment to settle before printing
    await new Promise((r) => setTimeout(r, 600));

    // Validate the printer name — check if the configured printer is actually installed
    const availablePrinters = await printWindow.webContents.getPrintersAsync();
    const printerNames = availablePrinters.map((p) => p.name);
    const hasValidPrinter =
      !!options?.printerName && printerNames.includes(options.printerName);

    if (!hasValidPrinter) {
      // No valid printer configured — show the window so the OS print dialog
      // is visible (includes Save as PDF / Download on macOS & Windows)
      printWindow.show();
      if (mainWindow) mainWindow.blur();
    }

    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          // Silent only if a valid named printer was found; otherwise show dialog
          silent: hasValidPrinter ? (options?.silent ?? false) : false,
          deviceName: hasValidPrinter ? options!.printerName! : '',
          margins: {
            marginType: 'none',
          },
          pageSize: {
            width: widthMicrons,
            height: heightMicrons,
          },
        },
        (success, failureReason) => {
          printWindow.close();
          if (!success) {
            console.error('Print failed:', failureReason);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
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
  mainWindow.webContents.print({ silent: false }, (success, errorType) => {
    if (!success) console.error('Print failed:', errorType);
  });
});

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
