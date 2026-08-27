import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TicketCopyConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Printer, Copy, Save, CheckCircle, Sliders } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const PrinterSettingsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');

  const { ticketCopies, updateTicketCopies, systemSettings, updateSystemSetting, fetchSettings } = useSettingsStore();
  const [copies, setCopies] = useState<TicketCopyConfig[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Printer settings local form
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
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none font-sans">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Printer className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Printer &amp; Ticket Copies Setup
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="text-success text-xs font-bold flex items-center mr-2">
              <CheckCircle className="w-4 h-4 mr-1" /> Printer Settings Saved Successfully
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticket Copies Configuration Card */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Configurable Simultaneous Ticket Copies</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a booking is confirmed, all enabled copies are queued and printed sequentially on the POS terminal.
            </p>

            <div className="border border-border rounded-xs overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap min-w-120">
                <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-2.5 whitespace-nowrap">#</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Copy Name</th>
                    <th className="px-3 py-2.5 w-16 text-center whitespace-nowrap">Print Label</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Enabled</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border whitespace-nowrap">
                  {copies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground font-semibold text-[11px] whitespace-nowrap">{c.print_order}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Input
                          value={c.copy_name}
                          onChange={(e) => handleUpdateCopyName(c.id, e.target.value)}
                          className="h-7 text-xs font-medium w-32"
                          placeholder="e.g. Customer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <Input
                          value={c.header_label}
                          onChange={(e) => handleUpdateLabel(c.id, e.target.value)}
                          className="h-7 text-xs font-semibold w-14 text-center mx-auto"
                          maxLength={3}
                          placeholder="D/A/C"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={Boolean(c.is_enabled)}
                          onChange={() => handleToggleCopy(c.id)}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-[11px] whitespace-nowrap">{c.purpose}</td>
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
            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Thermal Ticket Dimensions &amp; Series</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Ticket Width (cm)
                </label>
                <Input
                  value={ticketWidth}
                  onChange={(e) => setTicketWidth(e.target.value)}
                  placeholder="10.2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
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
              <label className="text-xs font-medium text-foreground">
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
                <label className="text-xs font-medium text-foreground">
                  Invoice / Ticket Prefix Series
                </label>
                <Input
                  value={invoiceSeries}
                  onChange={(e) => setInvoiceSeries(e.target.value)}
                  placeholder="NC-LKP-26"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
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

        {/* Save button */}
        {canUpdate && (
          <div className="lg:col-span-2 flex justify-end">
            <Button variant="default" size="default" onClick={handleSaveAll} className="font-semibold px-6 cursor-pointer">
              <Save className="w-4 h-4 mr-1.5" />
              Save Printer &amp; Ticket Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
