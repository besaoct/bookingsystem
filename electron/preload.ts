import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  printThermalTickets: (
    htmlContent: string,
    options?: {
      silent?: boolean;
      printerName?: string;
      widthCm?: number | string;
      heightCm?: number | string;
    }
  ) => Promise<boolean>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
  saveBackupFile: (data: Uint8Array) => Promise<boolean>;
  loadBackupFile: () => Promise<Uint8Array | null>;
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

