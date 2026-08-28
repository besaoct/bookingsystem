import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/types';
import { auditService } from '@/services';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Upload, ShieldCheck, FileText } from 'lucide-react';

export const AuditBackupPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const lList = await auditService.getLogs(100);
      setLogs(lList);
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportBackup = async () => {
    try {
      const data = auditService.exportDatabaseBackup();

      if (window.electronAPI) {
        const success = await window.electronAPI.saveBackupFile(data);
        if (success) setStatusMessage('Database backup saved successfully.');
      } else {
        // Browser download fallback
        const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Booking_System_Backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
        a.click();
        setStatusMessage('Database backup file downloaded.');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.error('Backup error:', e);
      setStatusMessage('Failed to export backup.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (reader.result instanceof ArrayBuffer) {
        const uintArray = new Uint8Array(reader.result);
        await auditService.restoreDatabaseBackup(uintArray);
        setStatusMessage('Database restored successfully from backup.');
        fetchLogs();
        setTimeout(() => setStatusMessage(null), 4000);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none font-sans">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Audit Trail &amp; Database Backup
          </span>
        </div>

        {statusMessage && (
          <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
            <ShieldCheck className="w-4 h-4 mr-1 shrink-0 text-white" />
            <span>{statusMessage}</span>
          </span>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Left Column: Backup / Restore Controls */}
        <div className="space-y-4 overflow-y-auto">
          {/* Card 1: Export Backup */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center space-x-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export Database Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Creates a complete offline <code>.sqlite</code> snapshot containing all movies, seat layouts, ticket sales, revenue records, and masters.
              </p>
              <Button variant="default" size="sm" onClick={handleExportBackup} className="w-full font-bold cursor-pointer shadow-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Database (.sqlite)
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Restore Backup */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-success" />
                <span>Restore from Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Restore an existing <code>.sqlite</code> or <code>.db</code> backup file previously exported from this system.
              </p>
              <label className="inline-flex w-full items-center justify-center font-semibold transition-colors border border-input bg-card text-foreground hover:bg-muted rounded-xs h-9 px-3 text-xs cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5 text-success" />
                <span>Select Backup File...</span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Audit Logs Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xs p-4 flex flex-col overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              <span className="uppercase tracking-wider">SYSTEM AUDIT TRAIL LOGS</span>
            </div>
            <span className="text-3xs text-muted-foreground font-medium">
              Showing last {logs.length} events
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Module</th>
                  <th className="px-3 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap font-medium text-xs">{l.created_at}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{l.username}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={
                          l.action.includes('CANCEL') || l.action.includes('DELETE') || l.action.includes('RESET')
                            ? 'destructive'
                            : l.action.includes('CREATE') || l.action.includes('UPDATE')
                            ? 'blue'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 uppercase text-muted-foreground font-semibold text-[11px]">{l.module}</td>
                    <td className="px-3 py-2.5 text-foreground truncate max-w-xs text-xs font-medium">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
