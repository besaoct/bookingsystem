import { app, BrowserWindow, ipcMain, dialog,  shell, Menu, MenuItemConstructorOptions } from 'electron';
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

function restoreOrCreateMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name || 'Booking System',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            restoreOrCreateMainWindow();
          },
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              {
                label: 'Booking System',
                accelerator: 'CmdOrCtrl+1',
                click: () => {
                  restoreOrCreateMainWindow();
                },
              },
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Booking System Help',
          click: async () => {
            await shell.openExternal('https://github.com/besaoct/bookingsystem');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
  setupApplicationMenu();
  createWindow();

  app.on('activate', () => {
    restoreOrCreateMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler for Thermal Ticket Printing with Customizable Preferences
ipcMain.handle(
  'print-thermal-tickets',
  async (
    _event,
    htmlContent: string,
    options?: {
      silent?: boolean;
      printerName?: string;
      widthCm?: number | string;
      heightCm?: number | string;
      orientation?: 'portrait' | 'landscape';
      rotation?: '0' | '90' | '180' | '270' | number;
      marginMm?: number | string;
      fontScale?: number | string;
      fontFamily?: string;
      fontSizePt?: number | string;
      fontWeight?: string;
      autoCut?: boolean;
      feedLines?: number;
      layoutMode?: 'side-by-side' | 'side-by-side-x' | 'side-by-side-y' | 'vertical-continuous' | 'sequential';
      copiesCount?: number;
    }
  ) => {
    try {
      const isLandscape = options?.orientation === 'landscape';
      const rotationDeg = Number(options?.rotation) || 0;
      const DEFAULT_TICKET_WIDTH_CM = 10.2;
      const DEFAULT_TICKET_HEIGHT_CM = 3.5;
      const parsedWidth = Number(options?.widthCm);
      const parsedHeight = Number(options?.heightCm);
      const widthCm = Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : DEFAULT_TICKET_WIDTH_CM;
      const heightCm = Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : DEFAULT_TICKET_HEIGHT_CM;
      const marginMm = options?.marginMm !== undefined ? Number(options.marginMm) : 2;
      const fontScale = Number(options?.fontScale) || 100;
      const baseFontSize = Number(options?.fontSizePt) || 8.0;
      const effectiveFontSize = ((baseFontSize * fontScale) / 100).toFixed(1);
      const fontWeight = options?.fontWeight ? String(options.fontWeight) : '600';
      const autoCut = options?.autoCut !== false;
      const feedLines = Number(options?.feedLines) || 0;
      const layoutMode = options?.layoutMode || 'side-by-side';
      const copiesCount = Math.max(1, Number(options?.copiesCount) || 1);

      let sheetWidthCm = widthCm;
      let sheetHeightCm = heightCm;

      if (layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x') {
        sheetWidthCm = Number((widthCm * copiesCount).toFixed(2));
        sheetHeightCm = heightCm;
      } else if (layoutMode === 'side-by-side-y' || layoutMode === 'vertical-continuous') {
        sheetWidthCm = widthCm;
        sheetHeightCm = Number((heightCm * copiesCount).toFixed(2));
      } else {
        sheetWidthCm = widthCm;
        sheetHeightCm = heightCm;
      }

      // Rotation bounding box: after rotating W×H by theta, the new extents are:
      //   Wp = |W*cos(t)| + |H*sin(t)|,  Hp = |W*sin(t)| + |H*cos(t)|
      // This matches the preview which uses rotate(Ndeg) transform-origin: center center.
      const toRad = (d: number) => d * Math.PI / 180;
      const cosT = Math.abs(Math.cos(toRad(rotationDeg)));
      const sinT = Math.abs(Math.sin(toRad(rotationDeg)));
      const printPageWidthCm = Number((sheetWidthCm * cosT + sheetHeightCm * sinT).toFixed(4));
      const printPageHeightCm = Number((sheetWidthCm * sinT + sheetHeightCm * cosT).toFixed(4));

      // Center-center offset so the rotated wrapper stays fully in positive page space
      const wrapperLeftCm = Number(((printPageWidthCm - sheetWidthCm) / 2).toFixed(4));
      const wrapperTopCm = Number(((printPageHeightCm - sheetHeightCm) / 2).toFixed(4));
      const sheetTransform = rotationDeg
        ? `transform: rotate(${rotationDeg}deg); transform-origin: center center;`
        : '';

      const FONT_MAP: Record<string, string> = {
        'system-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        'arial': "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        'verdana': "Verdana, Geneva, sans-serif",
        'tahoma': "Tahoma, Verdana, Segoe, sans-serif",
        'trebuchet': "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif",
        'consolas': "Consolas, 'Courier New', 'Lucida Console', Monaco, monospace",
        'courier': "'Courier New', Courier, monospace",
        'impact': "Impact, 'Arial Black', sans-serif",
      };

      const fontFamilyKey = options?.fontFamily || 'system-sans';
      const resolvedFontFamily =
        FONT_MAP[fontFamilyKey] ||
        fontFamilyKey ||
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      const widthMicrons = Math.round(printPageWidthCm * 10000);
      const heightMicrons = Math.round(printPageHeightCm * 10000);

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

      const feedHtml =
        feedLines > 0
          ? Array.from({ length: feedLines })
              .map(() => '<div style="height: 4mm; line-height: 4mm;">&nbsp;</div>')
              .join('')
          : '';

      const fullHtml = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * {
              box-sizing: border-box;
              font-family: ${resolvedFontFamily} !important;
              -webkit-font-smoothing: antialiased;
            }
            @page {
              size: ${printPageWidthCm}cm ${printPageHeightCm}cm;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: ${printPageWidthCm}cm;
              height: ${printPageHeightCm}cm;
              font-family: ${resolvedFontFamily} !important;
              font-size: ${effectiveFontSize}pt;
              font-weight: ${fontWeight};
              line-height: 1.15;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              overflow: hidden;
              position: relative;
            }
            .ticket-sheet-wrapper {
              position: absolute;
              top: ${wrapperTopCm}cm;
              left: ${wrapperLeftCm}cm;
              width: ${sheetWidthCm}cm;
              height: ${sheetHeightCm}cm;
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              ${sheetTransform}
            }
            .ticket-page-grid {
              display: flex;
              flex-direction: row;
              width: ${sheetWidthCm}cm;
              min-width: ${sheetWidthCm}cm;
              max-width: ${sheetWidthCm}cm;
              height: ${sheetHeightCm}cm;
              min-height: ${sheetHeightCm}cm;
              max-height: ${sheetHeightCm}cm;
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: auto;
              break-after: auto;
            }
            .ticket-page-grid-y {
              display: flex;
              flex-direction: column;
              width: ${sheetWidthCm}cm;
              min-width: ${sheetWidthCm}cm;
              max-width: ${sheetWidthCm}cm;
              height: ${sheetHeightCm}cm;
              min-height: ${sheetHeightCm}cm;
              max-height: ${sheetHeightCm}cm;
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: auto;
              break-after: auto;
            }
            .ticket-vertical-strip {
              display: flex;
              flex-direction: column;
              width: ${sheetWidthCm}cm;
              min-width: ${sheetWidthCm}cm;
              max-width: ${sheetWidthCm}cm;
              height: ${sheetHeightCm}cm;
              min-height: ${sheetHeightCm}cm;
              max-height: ${sheetHeightCm}cm;
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: auto;
              break-after: auto;
            }
            .ticket-slip {
              width: ${widthCm}cm;
              min-width: ${widthCm}cm;
              max-width: ${widthCm}cm;
              height: ${heightCm}cm;
              min-height: ${heightCm}cm;
              max-height: ${heightCm}cm;
              box-sizing: border-box;
              padding: ${marginMm}mm;
              font-family: ${resolvedFontFamily} !important;
              font-weight: ${fontWeight};
              overflow: hidden;
              ${autoCut && layoutMode === 'sequential' ? 'page-break-after: always; break-after: page;' : 'page-break-after: avoid; break-after: avoid;'}
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .ticket-slip:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          </style>
        </head>
        <body>
          <div class="ticket-sheet-wrapper">
            ${htmlContent}
          </div>
          ${feedHtml}
        </body>
        </html>`;

      await printWindow.loadURL('about:blank');
      await printWindow.webContents.executeJavaScript(
        `document.open(); document.write(${JSON.stringify(fullHtml)}); document.close();`
      );

      // Give fonts/layout a moment to settle before printing
      await new Promise((r) => setTimeout(r, 600));

      // Validate the printer name if specified
      const availablePrinters = await printWindow.webContents.getPrintersAsync();
      const printerNames = availablePrinters.map((p) => p.name);
      const hasValidPrinter =
        !!options?.printerName && printerNames.includes(options.printerName);

      // Silent print only when explicitly requested AND a matching printer is connected
      const isSilent = Boolean(options?.silent && hasValidPrinter);

      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: isSilent,
            deviceName: hasValidPrinter ? options!.printerName! : undefined,
            landscape: false,
            margins: { marginType: 'none' },
            printBackground: true,
            pageSize: { width: widthMicrons, height: heightMicrons },
          },
          (success, failureReason) => {
            try { if (!printWindow.isDestroyed()) printWindow.close(); } catch (_) {}
            if (!success && failureReason !== 'cancelled') {
              console.error('Ticket print failed:', failureReason);
            }
            resolve(success);
          }
        );
      });
    } catch (err) {
      console.error('Error in print-thermal-tickets handler:', err);
      return false;
    }
  }
);

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
      const availablePrinters = await printWindow.webContents.getPrintersAsync();
      const printerNames = availablePrinters.map((p) => p.name);
      const hasValidPrinter =
        !!options?.printerName && printerNames.includes(options.printerName);

      const isSilent = Boolean(options?.silent && hasValidPrinter);

      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: isSilent,
            deviceName: hasValidPrinter ? options!.printerName! : undefined,
            landscape: options?.orientation === 'landscape',
            pageSize: (options?.pageSize as any) || 'A4',
            printBackground: true,
            margins: { marginType: 'printableArea' },
          },
          (success, failureReason) => {
            try { if (!printWindow.isDestroyed()) printWindow.close(); } catch (_) {}
            if (!success && failureReason !== 'cancelled') {
              console.error('DCR document print failed:', failureReason);
            }
            resolve(success);
          }
        );
      });
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

