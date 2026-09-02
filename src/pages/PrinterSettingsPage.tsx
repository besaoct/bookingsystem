import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TicketCopyConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Printer, Copy, Save, CheckCircle, Sliders, Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const PrinterSettingsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');

  const {
    ticketCopies,
    updateTicketCopies,
    addTicketCopy,
    deleteTicketCopy,
    systemSettings,
    updateSystemSetting,
    fetchSettings,
  } = useSettingsStore();

  const [copies, setCopies] = useState<TicketCopyConfig[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Printer settings local form
  const [ticketWidth, setTicketWidth] = useState('10.2');
  const [ticketHeight, setTicketHeight] = useState('3.5');
  const [printerName, setPrinterName] = useState('Default Thermal POS-80');
  const [invoiceSeries, setInvoiceSeries] = useState('NC-LKP-26');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [silentPrint, setSilentPrint] = useState(false);

  // Detected Hardware Printers
  const [detectedPrinters, setDetectedPrinters] = useState<Array<{ name: string; isDefault: boolean }>>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);

  // Add Copy Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCopyName, setNewCopyName] = useState('');
  const [newHeaderLabel, setNewHeaderLabel] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [newPrintOrder, setNewPrintOrder] = useState<number>(4);

  const scanPrinters = async () => {
    if (window.electronAPI?.getPrinters) {
      setIsScanningPrinters(true);
      try {
        const list = await window.electronAPI.getPrinters();
        setDetectedPrinters(list || []);
      } catch (err) {
        console.warn('Failed to detect system printers:', err);
      } finally {
        setIsScanningPrinters(false);
      }
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchSettings();
      await scanPrinters();
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
      const maxOrder = ticketCopies.reduce((max, c) => Math.max(max, c.print_order || 0), 0);
      setNewPrintOrder(maxOrder + 1);
    }
    if (systemSettings) {
      setTicketWidth(systemSettings['ticket_width_cm'] || '10.2');
      setTicketHeight(systemSettings['ticket_height_cm'] || '3.5');
      setPrinterName(systemSettings['thermal_printer_name'] || 'Default Thermal POS-80');
      setInvoiceSeries(systemSettings['invoice_series'] || 'NC-LKP-26');
      setFinancialYear(systemSettings['financial_year'] || '2026-2027');
      setSilentPrint(systemSettings['silent_print'] === 'true');
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

  const handleUpdatePurpose = (id: number, purpose: string) => {
    setCopies(
      copies.map((c) => (c.id === id ? { ...c, purpose } : c))
    );
  };

  const handleUpdatePrintOrder = (id: number, order: number) => {
    setCopies(
      copies.map((c) => (c.id === id ? { ...c, print_order: order } : c))
    );
  };

  const handleOpenAddModal = () => {
    const maxOrder = copies.reduce((max, c) => Math.max(max, c.print_order || 0), 0);
    setNewPrintOrder(maxOrder + 1);
    setNewCopyName('');
    setNewHeaderLabel('');
    setNewPurpose('');
    setIsAddModalOpen(true);
  };

  const handleAddCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopyName.trim() || !newHeaderLabel.trim()) return;

    await addTicketCopy({
      copy_name: newCopyName.trim(),
      header_label: newHeaderLabel.trim().toUpperCase(),
      purpose: newPurpose.trim() || `${newCopyName.trim()} Copy`,
      print_order: newPrintOrder || copies.length + 1,
      is_enabled: true,
    });

    setIsAddModalOpen(false);
    setNewCopyName('');
    setNewHeaderLabel('');
    setNewPurpose('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleDeleteCopy = async (id: number, name: string) => {
    if (copies.length <= 1) {
      alert('At least one ticket copy configuration must remain active.');
      return;
    }
    if (confirm(`Are you sure you want to delete the "${name}" ticket copy?`)) {
      await deleteTicketCopy(id);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleSaveAll = async () => {
    await updateTicketCopies(copies);
    await updateSystemSetting('ticket_width_cm', ticketWidth);
    await updateSystemSetting('ticket_height_cm', ticketHeight);
    await updateSystemSetting('thermal_printer_name', printerName);
    await updateSystemSetting('silent_print', silentPrint ? 'true' : 'false');
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
            <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 mr-1 shrink-0 text-white" />
              <span>Printer Settings Saved Successfully</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticket Copies Configuration Card */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Configurable Simultaneous Ticket Copies</span>
            </CardTitle>

            {canUpdate && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleOpenAddModal}
                className="font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-primary" />
                Add Copy
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a booking is confirmed, all enabled copies are queued and printed sequentially on the POS terminal. You can edit copy names, print labels, and purpose descriptions below.
            </p>

            <div className="border border-border rounded-xs overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap min-w-140">
                <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  <tr>
                    <th className="px-2.5 py-2 w-14 text-center whitespace-nowrap">Order</th>
                    <th className="px-3 py-2 whitespace-nowrap">Copy Name</th>
                    <th className="px-2.5 py-2 w-16 text-center whitespace-nowrap">Label</th>
                    <th className="px-3 py-2 whitespace-nowrap">Purpose / Role</th>
                    <th className="px-2.5 py-2 w-14 text-center whitespace-nowrap">Active</th>
                    {canUpdate && <th className="px-2.5 py-2 w-12 text-center whitespace-nowrap">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border whitespace-nowrap">
                  {copies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        <Input
                          type="number"
                          value={c.print_order}
                          onChange={(e) => handleUpdatePrintOrder(c.id, Number(e.target.value))}
                          className="h-7 text-xs font-semibold w-12 text-center mx-auto"
                          min={1}
                          max={99}
                          disabled={!canUpdate}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input
                          value={c.copy_name}
                          onChange={(e) => handleUpdateCopyName(c.id, e.target.value)}
                          className="h-7 text-xs font-medium w-32"
                          placeholder="e.g. Customer"
                          disabled={!canUpdate}
                        />
                      </td>
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        <Input
                          value={c.header_label}
                          onChange={(e) => handleUpdateLabel(c.id, e.target.value)}
                          className="h-7 text-xs font-semibold w-14 text-center mx-auto uppercase"
                          maxLength={4}
                          placeholder="C"
                          disabled={!canUpdate}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input
                          value={c.purpose || ''}
                          onChange={(e) => handleUpdatePurpose(c.id, e.target.value)}
                          className="h-7 text-xs font-normal min-w-44"
                          placeholder="Purpose of this ticket copy"
                          disabled={!canUpdate}
                        />
                      </td>
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={Boolean(c.is_enabled)}
                          onChange={() => handleToggleCopy(c.id)}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer align-middle"
                          disabled={!canUpdate}
                        />
                      </td>
                      {canUpdate && (
                        <td className="px-2.5 py-2 text-center whitespace-nowrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDeleteCopy(c.id, c.copy_name)}
                            disabled={copies.length <= 1}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
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
                  disabled={!canUpdate}
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
                  disabled={!canUpdate}
                />
              </div>
            </div>

            {/* Thermal POS Printer Device Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Thermal POS Printer Device Name
                </label>
                {window.electronAPI?.getPrinters && (
                  <button
                    type="button"
                    onClick={scanPrinters}
                    disabled={isScanningPrinters}
                    className="text-[10px] text-primary hover:underline flex items-center cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                    {isScanningPrinters ? 'Scanning...' : 'Scan Printers'}
                  </button>
                )}
              </div>

              {detectedPrinters.length > 0 && (
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    {detectedPrinters.map((p) => {
                      const isSelected = printerName === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setPrinterName(p.name)}
                          className={`px-2.5 py-1 text-2xs rounded-xs border transition-all cursor-pointer flex items-center space-x-1 ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                              : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 mr-0.5 text-white" />}
                          <span>{p.name}</span>
                          {p.isDefault && <span className="text-[9px] opacity-75 font-normal">(Default)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Input
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="e.g. POS-80 / Citizen / Epson Thermal"
                disabled={!canUpdate}
              />
              <p className="text-[10px] text-muted-foreground">
                Matches the installed printer driver on the host computer.
              </p>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="silentPrintToggle"
                  checked={silentPrint}
                  onChange={(e) => setSilentPrint(e.target.checked)}
                  className="rounded-xs text-primary h-4 w-4 cursor-pointer align-middle"
                  disabled={!canUpdate}
                />
                <label htmlFor="silentPrintToggle" className="text-xs font-medium text-foreground cursor-pointer select-none">
                  Direct Silent Printing (Skip OS Dialog for named device)
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                When unchecked (default), clicking Print opens the standard OS printing dialog setup. When checked with a matching printer, print jobs are sent directly.
              </p>
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
                  disabled={!canUpdate}
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
                  disabled={!canUpdate}
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

      {/* Add New Ticket Copy Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Ticket Copy Configuration"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCopySubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Copy Name *</label>
            <Input
              value={newCopyName}
              onChange={(e) => setNewCopyName(e.target.value)}
              placeholder="e.g. Gate Pass, F&B Voucher, Usher Slip"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Print Label (1-4 Chars) *</label>
              <Input
                value={newHeaderLabel}
                onChange={(e) => setNewHeaderLabel(e.target.value.toUpperCase())}
                placeholder="e.g. G, FB, A"
                maxLength={4}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Print Sequence Order</label>
              <Input
                type="number"
                value={newPrintOrder}
                onChange={(e) => setNewPrintOrder(Number(e.target.value))}
                min={1}
                max={99}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Purpose Description</label>
            <Input
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
              placeholder="e.g. Gate Security Check, Refreshment Voucher"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="font-bold cursor-pointer"
            >
              Add Ticket Copy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
