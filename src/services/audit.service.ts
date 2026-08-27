import { dbService } from '@/db/sqlite-service';
import { AuditLog } from '@/types';

export const auditService = {
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    await dbService.init();
    return dbService.query<AuditLog>("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", [limit]);
  },

  async log(userId: number, username: string, action: string, module: string, details?: string): Promise<void> {
    await dbService.init();
    try {
      dbService.run(
        "INSERT INTO audit_logs (user_id, username, action, module, details) VALUES (?, ?, ?, ?, ?)",
        [userId, username, action, module, details || '']
      );
    } catch (e) {
      console.warn('Audit log write note:', e);
    }
  },

  exportDatabaseBackup(): Uint8Array {
    return dbService.exportBackup();
  },

  async restoreDatabaseBackup(binaryData: Uint8Array): Promise<void> {
    await dbService.restoreBackup(binaryData);
  },

  async getLogs(limit = 100): Promise<AuditLog[]> {
    return this.getAuditLogs(limit);
  },

  async resetDatabaseToDefault(): Promise<void> {
    await dbService.resetToDefaultSeed();
  },

  async resetDatabaseToSeed(): Promise<void> {
    await dbService.resetToDefaultSeed();
  },

  async fullSystemReset(): Promise<void> {
    await dbService.fullSystemReset();
  },
};
