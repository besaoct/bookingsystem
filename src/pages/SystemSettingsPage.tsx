import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { auditService } from '@/services';
import { TicketCopyConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Copy, Save, CheckCircle, Sliders, Database, RotateCcw, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const SystemSettingsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');

  const { ticketCopies, updateTicketCopies, systemSettings, updateSystemSetting, fetchSettings } = useSettingsStore();
  const [copies, setCopies] = useState<TicketCopyConfig[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // System settings local form
  const [ticketWidth, setTicketWidth] = useState('10.2');
  const [ticketHeight, setTicketHeight] = useState('3.5');
  const [printerName, setPrinterName] = useState('Default Thermal POS-80');
  const [invoiceSeries, setInvoiceSeries] = useState('NC-LKP-26');
  const [financialYear, setFinancialYear] = useState('2026-2027');

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchSettings();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (ticketCopies.length > 0) {
      setCopies([...ticketCopies]);
    }
    if (systemSettings) {
      setTicketWidth(systemSettings['ticket_width_cm'] || '10.2');
      setTicketHeight(systemSettings['ticket_height_cm'] || '3.5');
      setPrinterName(systemSettings['thermal_printer_name'] || 'Default Thermal POS-80');
      setInvoiceSeries(systemSettings['invoice_series'] || 'NC-LKP-26');
      setFinancialYear(systemSettings['financial_year'] || '2026-2027');
    }
  }, [ticketCopies, systemSettings]);

  const handleToggleCopy = (id: number) => {
    setCopies(
      copies.map((c) => (c.id === id ? { ...c, is_enabled: !c.is_enabled } : c))
    );
  };

  const handleUpdateLabel = (id: number, label: string) => {
    setCopies(
      copies.map((c) => (c.id === id ? { ...c, header_label: label.toUpperCase() } : c))
    );
  };

  const handleUpdateCopyName = (id: number, name: string) => {
    setCopies(
      copies.map((c) => (c.id === id ? { ...c, copy_name: name } : c))
    );
  };

  const handleSaveAll = async () => {
    await updateTicketCopies(copies);
    await updateSystemSetting('ticket_width_cm', ticketWidth);
    await updateSystemSetting('ticket_height_cm', ticketHeight);
    await updateSystemSetting('thermal_printer_name', printerName);
    await updateSystemSetting('invoice_series', invoiceSeries);
    await updateSystemSetting('financial_year', financialYear);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Printer className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Printer, Ticket Copies &amp; System Settings
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="text-success text-xs font-bold flex items-center mr-2">
              <CheckCircle className="w-4 h-4 mr-1" /> Settings Saved Successfully
            </span>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticket Copies Configuration Card */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center space-x-1.5">
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Configurable Simultaneous Ticket Copies</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <p className="text-xs text-muted-foreground">
              When a booking is confirmed, all enabled copies are queued and printed in sequence.
            </p>

            <div className="border border-border rounded-xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Copy Name</th>
                    <th className="px-3 py-2.5 w-10 text-center">Print Label</th>
                    <th className="px-3 py-2.5 text-center">Enabled</th>
                    <th className="px-3 py-2.5">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {copies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground font-bold text-[11px]">{c.print_order}</td>
                      <td className="px-3 py-2.5">
                        <Input
                          value={c.copy_name}
                          onChange={(e) => handleUpdateCopyName(c.id, e.target.value)}
                          className="h-7 text-xs font-semibold w-32"
                          placeholder="e.g. Customer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Input
                          value={c.header_label}
                          onChange={(e) => handleUpdateLabel(c.id, e.target.value)}
                          className="h-7 text-xs font-bold w-14 text-center mx-auto"
                          maxLength={3}
                          placeholder="D/A/C"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(c.is_enabled)}
                          onChange={() => handleToggleCopy(c.id)}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-[11px]">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Physical Thermal Printer & Series Card */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Thermal Ticket Dimensions &amp; Series</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Ticket Width (cm)
                </label>
                <Input
                  value={ticketWidth}
                  onChange={(e) => setTicketWidth(e.target.value)}
                  placeholder="10.2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Ticket Height (cm)
                </label>
                <Input
                  value={ticketHeight}
                  onChange={(e) => setTicketHeight(e.target.value)}
                  placeholder="3.5"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Thermal POS Printer Device Name
              </label>
              <Input
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="e.g. POS-80 / Citizen / Epson Thermal"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Invoice / Ticket Prefix Series
                </label>
                <Input
                  value={invoiceSeries}
                  onChange={(e) => setInvoiceSeries(e.target.value)}
                  placeholder="NC-LKP-26"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Financial Year
                </label>
                <Input
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  placeholder="2026-2027"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Management & Re-seed Card */}
        {isSystemAdmin && (
          <Card className="lg:col-span-2 border-amber-500/30 bg-card shadow-xs">
            <CardHeader className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Database Initialization &amp; Factory Re-Seed</span>
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]">
                10 Seats Layout &amp; Default Masters
              </Badge>
            </CardHeader>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-xl text-muted-foreground text-2xs leading-relaxed">
                <p className="font-semibold text-foreground">
                  Reset local SQLite database to original fresh seed state:
                </p>
                <p>
                  Includes 10-seat layout (A: 1-3, B: 1-3, C: 1-4), GOENKA ENTERPRISES &amp; distributors, movie catalog, schedule, dynamic pricing, and standard operator/admin accounts.
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={async () => {
                  if (
                    window.confirm(
                      '⚠️ Re-seed database to default factory state?\n\n' +
                      'All tables will be restored with the 10-seat layout and initial masters.'
                    )
                  ) {
                    await auditService.resetDatabaseToSeed();
                    window.location.reload();
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-Seed Database
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Save button */}
        {canUpdate && (
          <div className="lg:col-span-2 flex justify-end">
            <Button variant="default" size="default" onClick={handleSaveAll} className="font-bold px-6 cursor-pointer">
              <Save className="w-4 h-4 mr-1.5" />
              Save Printer &amp; Copy Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
