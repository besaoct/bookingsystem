import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  printThermalTickets: (
    htmlContent: string,
    options?: {
      silent?: boolean;
      printerName?: string;
      widthCm?: number | string;
      heightCm?: number | string;
      orientation?: 'portrait' | 'landscape';
      marginMm?: number | string;
      fontScale?: number | string;
      fontFamily?: string;
      fontSizePt?: number | string;
      fontWeight?: string;
      autoCut?: boolean;
      feedLines?: number;
      layoutMode?: 'side-by-side' | 'vertical-continuous' | 'sequential';
    }
  ) => Promise<boolean>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
  saveBackupFile: (data: Uint8Array) => Promise<boolean>;
  loadBackupFile: () => Promise<Uint8Array | null>;
  getSqlWasmBinary: () => Promise<Uint8Array | null>;
  printDCRDocument: (options: {
    htmlContent: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: string;
    printerName?: string;
    silent?: boolean;
  }) => Promise<boolean>;
  saveDCRPDF: (options: {
    htmlContent: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: string;
    defaultFileName?: string;
  }) => Promise<boolean>;
  printCurrentPage: () => void;
  getMachineId: () => Promise<string>;
  loadLicenseFile: () => Promise<string | null>;
  saveLicenseFile: (defaultName: string, content: string) => Promise<boolean>;
  isElectron: boolean;
  platform: string;
  windowControls: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
}

const electronAPI: IElectronAPI = {
  printThermalTickets: (htmlContent: string, options) =>
    ipcRenderer.invoke('print-thermal-tickets', htmlContent, options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  saveBackupFile: (data: Uint8Array) => ipcRenderer.invoke('save-backup-file', data),
  loadBackupFile: () => ipcRenderer.invoke('load-backup-file'),
  getSqlWasmBinary: () => ipcRenderer.invoke('get-sql-wasm-binary'),
  printDCRDocument: (options) => ipcRenderer.invoke('print-dcr-document', options),
  saveDCRPDF: (options) => ipcRenderer.invoke('save-dcr-pdf', options),
  printCurrentPage: () => ipcRenderer.send('print-page'),
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  loadLicenseFile: () => ipcRenderer.invoke('load-license-file'),
  saveLicenseFile: (defaultName, content) => ipcRenderer.invoke('save-license-file', defaultName, content),
  isElectron: true,
  platform: process.platform,
  windowControls: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);


