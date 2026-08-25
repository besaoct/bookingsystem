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
}

const electronAPI: IElectronAPI = {
  printThermalTickets: (htmlContent: string, options) =>
    ipcRenderer.invoke('print-thermal-tickets', htmlContent, options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  saveBackupFile: (data: Uint8Array) => ipcRenderer.invoke('save-backup-file', data),
  loadBackupFile: () => ipcRenderer.invoke('load-backup-file'),
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
