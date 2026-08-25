import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/types';
import { auditService } from '@/services';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Upload, RotateCcw, ShieldCheck, FileText } from 'lucide-react';

export const AuditBackupPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const lList = await auditService.getLogs(50);
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

  const [isResetting, setIsResetting] = useState(false);

  const handleResetSeed = async () => {
    if (
      !window.confirm(
        '⚠️ ARE YOU SURE YOU WANT TO RE-SEED THE DATABASE?\n\n' +
        'This will reset SQLite data to defaults:\n' +
        '• Screen 1 with exact 10 Seats (Row A: 1-3, Row B: 1-3, Row C: 1-4)\n' +
        '• Distributors (GOENKA ENTERPRISES, Sony, YRF, etc.)\n' +
        '• Movies (Spider-Man 3D, Kalki 3D, Stree 2)\n' +
        '• Show Timings & Dynamic Pricing\n' +
        '• Clean Ticket Copies (D, A, C)\n' +
        '• Default System Admin & Operator accounts\n\n' +
        'Click OK to proceed.'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      await auditService.resetDatabaseToSeed();
      setStatusMessage('Database reseeded successfully with 10-seat layout and default masters!');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error('Failed to reseed database:', e);
      setStatusMessage('Error: Failed to reseed database.');
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Audit Trail &amp; Database Backup
          </span>
        </div>

        {statusMessage && (
          <span className="text-success text-xs font-bold flex items-center bg-success/10 px-2.5 py-1 rounded-xs border border-success/20 animate-pulse">
            <ShieldCheck className="w-4 h-4 mr-1 text-success" /> {statusMessage}
          </span>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Left Column: Backup / Restore / Reset Controls */}
        <div className="space-y-4 overflow-y-auto">
          {/* Card 1: Factory Re-Seed (Prominent) */}
          <Card className="border-amber-500/40 bg-card shadow-xs">
            <CardHeader className="p-3 bg-amber-500/10 border-b border-amber-500/20">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Re-Seed Database</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Resets the SQLite database to fresh factory seed data:
              </p>
              <ul className="text-2xs text-muted-foreground list-disc list-inside space-y-1 bg-muted/40 p-2 rounded-xs border border-border">
                <li>Exact 10 Seats: A (1-3), B (1-3), C (1-4)</li>
                <li>Distributors: GOENKA ENTERPRISES, Sony, etc.</li>
                <li>Movies, Shows, Pricing &amp; GST Rules</li>
                <li>Default Admin &amp; Operator Accounts</li>
              </ul>
              <Button
                variant="default"
                size="sm"
                onClick={handleResetSeed}
                disabled={isResetting}
                className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Reseeding Database...' : 'Run Database Re-Seed'}
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Export Backup */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center space-x-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export Database Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-xs text-muted-foreground">
                Downloads the complete `.sqlite` database file with all bookings and settings.
              </p>
              <Button variant="outline" size="sm" onClick={handleExportBackup} className="w-full font-bold cursor-pointer">
                <Download className="w-3.5 h-3.5 mr-1" /> Export Backup File
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Restore Backup */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-success" />
                <span>Restore from Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-xs text-muted-foreground">
                Restore an existing `.sqlite` or `.db` backup file.
              </p>
              <label className="inline-flex w-full items-center justify-center font-semibold transition-colors border border-input bg-card text-foreground hover:bg-muted rounded-xs h-9 px-3 text-xs cursor-pointer">
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
                      <Badge variant={l.action.includes('CANCEL') ? 'destructive' : 'outline'} className="text-[10px]">
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
