import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TicketCopyConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import {
  Printer,
  Copy,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  Scissors,
  Compass,
  Eye,
  Layers,
  Settings2,
  Type,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { OFFLINE_FONT_MAP } from '@/lib/thermal-printer';

export const TICKET_FONT_FAMILIES = [
  {
    id: 'system-sans',
    name: 'System Sans-Serif',
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    description: 'Modern, balanced, ultra-crisp on all displays & thermal heads (Segoe UI / SF Pro / Roboto)',
  },
  {
    id: 'arial',
    name: 'Arial / Helvetica',
    stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    description: 'Clean geometry, universally supported standard for box office slips',
  },
  {
    id: 'verdana',
    name: 'Verdana',
    stack: 'Verdana, Geneva, sans-serif',
    description: 'Wide proportions, maximum clarity on 203 DPI thermal heads',
  },
  {
    id: 'tahoma',
    name: 'Tahoma',
    stack: 'Tahoma, Verdana, Segoe, sans-serif',
    description: 'Narrow letter width, fits dense invoice and financial breakdowns',
  },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS',
    stack: '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
    description: 'Distinctive open letterforms, excellent legibility on roll paper',
  },
  {
    id: 'consolas',
    name: 'Consolas',
    stack: 'Consolas, "Courier New", "Lucida Console", Monaco, monospace',
    description: 'Fixed-width tabular alignment for receipts and auditor slips',
  },
  {
    id: 'courier',
    name: 'Courier New',
    stack: '"Courier New", Courier, monospace',
    description: 'Traditional retro cinema box office ticket style',
  },
  {
    id: 'impact',
    name: 'Impact',
    stack: 'Impact, "Arial Black", sans-serif',
    description: 'Punchy heavy characters for maximum contrast',
  },
];

export const TICKET_FONT_SIZES = [
  { value: '6.5', label: '6.5 pt (Ultra-Compact / Dense)' },
  { value: '7.5', label: '7.5 pt (Compact / POS-58)' },
  { value: '8.0', label: '8.0 pt (Standard Cinema Slip - Recommended)' },
  { value: '8.5', label: '8.5 pt (Medium Clear)' },
  { value: '9.0', label: '9.0 pt (Large / High-DPI 300)' },
  { value: '10.0', label: '10.0 pt (Extra-Large / Bold)' },
];

export const TICKET_FONT_WEIGHTS = [
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi-Bold (600 - Recommended)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra-Bold / Heavy (800)' },
];

const PAPER_PRESETS = [
  { label: 'Cinema Fanfold (10.2 × 3.5 cm / 4" × 1.38")', width: '10.2', height: '3.5', orientation: 'landscape' },
  { label: 'Tall Cinema Ticket (10.2 × 5.4 cm / 4" × 2.12")', width: '10.2', height: '5.4', orientation: 'landscape' },
  { label: 'Wide Cinema Slip (12.0 × 4.0 cm)', width: '12.0', height: '4.0', orientation: 'landscape' },
  { label: 'Standard POS-80 Roll (8.0 × 5.0 cm)', width: '8.0', height: '5.0', orientation: 'portrait' },
  { label: 'Compact POS-58 Roll (5.8 × 4.0 cm)', width: '5.8', height: '4.0', orientation: 'portrait' },
];

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
  const [ticketOrientation, setTicketOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [ticketMarginMm, setTicketMarginMm] = useState('2');
  const [ticketFontScale, setTicketFontScale] = useState('100');
  const [ticketFontFamily, setTicketFontFamily] = useState('system-sans');
  const [ticketFontSizePt, setTicketFontSizePt] = useState('8.0');
  const [ticketFontWeight, setTicketFontWeight] = useState('600');
  const [ticketAutoCut, setTicketAutoCut] = useState(true);
  const [ticketFeedLines, setTicketFeedLines] = useState('0');
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
      setTicketOrientation((systemSettings['ticket_orientation'] as 'portrait' | 'landscape') || 'landscape');
      setTicketMarginMm(systemSettings['ticket_margin_mm'] || '2');
      setTicketFontScale(systemSettings['ticket_font_scale'] || '100');
      setTicketFontFamily(systemSettings['ticket_font_family'] || 'system-sans');
      setTicketFontSizePt(systemSettings['ticket_font_size_pt'] || '8.0');
      setTicketFontWeight(systemSettings['ticket_font_weight'] || '600');
      setTicketAutoCut(systemSettings['ticket_auto_cut'] !== 'false');
      setTicketFeedLines(systemSettings['ticket_feed_lines'] || '0');
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
    await updateSystemSetting('ticket_orientation', ticketOrientation);
    await updateSystemSetting('ticket_margin_mm', ticketMarginMm);
    await updateSystemSetting('ticket_font_scale', ticketFontScale);
    await updateSystemSetting('ticket_font_family', ticketFontFamily);
    await updateSystemSetting('ticket_font_size_pt', ticketFontSizePt);
    await updateSystemSetting('ticket_font_weight', ticketFontWeight);
    await updateSystemSetting('ticket_auto_cut', ticketAutoCut ? 'true' : 'false');
    await updateSystemSetting('ticket_feed_lines', ticketFeedLines);
    await updateSystemSetting('thermal_printer_name', printerName);
    await updateSystemSetting('silent_print', silentPrint ? 'true' : 'false');
    await updateSystemSetting('invoice_series', invoiceSeries);
    await updateSystemSetting('financial_year', financialYear);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const applyPreset = (preset: typeof PAPER_PRESETS[0]) => {
    setTicketWidth(preset.width);
    setTicketHeight(preset.height);
    setTicketOrientation(preset.orientation as 'landscape' | 'portrait');
  };

  const resolvedFontFamily =
    OFFLINE_FONT_MAP[ticketFontFamily] ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none font-sans">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Printer className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Thermal Printer &amp; Ticket Configuration
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 mr-1 shrink-0 text-white" />
              <span>Printer Settings Saved Successfully</span>
            </span>
          )}
          {canUpdate && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAll}
              className="font-semibold px-4 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Settings
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Ticket Copies & Live Mini Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>Simultaneous Ticket Copies</span>
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
            <CardContent className="p-3 space-y-3 text-xs">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When a booking is confirmed, all enabled copies are queued and printed sequentially on the POS terminal.
              </p>

              <div className="border border-border rounded-xs overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-muted/50 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 w-12 text-center">Order</th>
                      <th className="px-2.5 py-1.5">Copy Name</th>
                      <th className="px-2 py-1.5 w-14 text-center">Label</th>
                      <th className="px-2.5 py-1.5">Purpose / Role</th>
                      <th className="px-2 py-1.5 w-12 text-center">Active</th>
                      {canUpdate && <th className="px-2 py-1.5 w-10 text-center">Del</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {copies.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-1.5 text-center">
                          <Input
                            type="number"
                            value={c.print_order}
                            onChange={(e) =>
                              handleUpdatePrintOrder(c.id, parseInt(e.target.value) || 1)
                            }
                            className="h-6 w-10 text-center p-0.5 text-2xs mx-auto"
                            disabled={!canUpdate}
                            min={1}
                            max={99}
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <Input
                            value={c.copy_name}
                            onChange={(e) => handleUpdateCopyName(c.id, e.target.value)}
                            className="h-6 text-2xs font-semibold px-1.5 w-24"
                            disabled={!canUpdate}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Input
                            value={c.header_label}
                            onChange={(e) => handleUpdateLabel(c.id, e.target.value)}
                            className="h-6 w-10 text-center uppercase font-mono font-bold text-2xs px-1 mx-auto"
                            maxLength={3}
                            disabled={!canUpdate}
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <Input
                            value={c.purpose || ''}
                            onChange={(e) => handleUpdatePurpose(c.id, e.target.value)}
                            placeholder="e.g. Security Gate Pass"
                            className="h-6 text-2xs px-1.5 w-32"
                            disabled={!canUpdate}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={c.is_enabled}
                            onChange={() => handleToggleCopy(c.id)}
                            className="rounded-xs text-primary h-3.5 w-3.5 cursor-pointer align-middle"
                            disabled={!canUpdate}
                          />
                        </td>
                        {canUpdate && (
                          <td className="px-2 py-1.5 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleDeleteCopy(c.id, c.copy_name)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete Copy"
                            >
                              <Trash2 className="w-3 h-3" />
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

          {/* Real-time Interactive Mini Slip Preview Card */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>Ticket Preview</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono font-medium">
                  {ticketWidth}cm × {ticketHeight}cm
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center justify-center bg-slate-200/80 dark:bg-slate-900/80 rounded-b-xs">
              <div
                className="bg-white text-black shadow-md select-none rounded-xs flex flex-col justify-between transition-all overflow-hidden"
                style={{
                  width: ticketOrientation === 'landscape' ? '250px' : '175px',
                  minHeight: ticketOrientation === 'landscape' ? '86px' : '124px',
                  padding: `${Math.max(2, Number(ticketMarginMm) || 2) * 1.8}px`,
                  fontFamily: resolvedFontFamily,
                  fontWeight: ticketFontWeight,
                  fontSize: `${(Number(ticketFontSizePt) * (Number(ticketFontScale) / 100) * 0.95).toFixed(1)}px`,
                  lineHeight: 1.15,
                }}
              >
                {/* Mini Slip Header */}
                <div className="flex justify-between items-start border-b border-black pb-0.5 mb-1 leading-tight">
                  <div className="overflow-hidden">
                    <div className="font-black text-[8.5px] uppercase truncate">Grand Galaxy Cinema</div>
                    <div className="font-bold text-[7.5px] truncate text-slate-900">AVATAR: FIRE AND ASH (3D)</div>
                  </div>
                  <div className="border border-black px-1 py-0.2 text-[8px] font-black shrink-0 ml-1 rounded-xs">
                    S
                  </div>
                </div>

                {/* Mini 3 Columns */}
                <div className="grid grid-cols-3 gap-1 text-[7px] border-b border-black pb-1 mb-0.5 leading-tight">
                  <div className="border-r border-black pr-0.5">
                    <div>ADM: 230.24</div>
                    <div>GST: 41.44</div>
                    <div className="font-black text-[7.5px] mt-0.5">Tot: ₹300</div>
                  </div>
                  <div className="border-r border-black px-0.5">
                    <div className="font-bold">Today</div>
                    <div className="font-bold">06:30 PM</div>
                    <div className="text-[6px] text-slate-700">SAC 997321</div>
                  </div>
                  <div className="pl-0.5">
                    <div className="font-bold">AUDI 1</div>
                    <div className="font-black text-[8px]">C-1, C-2</div>
                    <div className="font-bold text-[6.5px]">GOLD PLUS</div>
                  </div>
                </div>

                {/* Mini Footer */}
                <div className="flex justify-between items-end text-[6px] text-slate-700 leading-none pt-0.5">
                  <div>GSTIN: 33AAAAA0000A1Z5</div>
                  <div className="text-right">TKT #0008602 | {invoiceSeries}/0001</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 w-full">
                <span className="px-2 py-0.5 rounded-xs bg-card border border-border text-foreground text-xs font-medium shadow-2xs">
                  Font: <strong className="text-primary font-bold">{TICKET_FONT_FAMILIES.find((f) => f.id === ticketFontFamily)?.name || ticketFontFamily}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-card border border-border text-foreground text-xs font-medium shadow-2xs">
                  Size: <strong className="text-primary font-bold">{ticketFontSizePt} pt</strong>
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-card border border-border text-foreground text-xs font-medium shadow-2xs">
                  Weight: <strong className="text-primary font-bold">{ticketFontWeight}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-card border border-border text-foreground text-xs font-medium shadow-2xs">
                  Scale: <strong className="text-primary font-bold">{ticketFontScale}%</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Physical Thermal Printer Preferences (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <span>Thermal Hardware Preferences &amp; Typography</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Paper Dimension Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-primary mr-1" />
                    <span>Quick Paper Size Presets</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Click to auto-fill</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PAPER_PRESETS.map((p) => {
                    const isCurrent =
                      ticketWidth === p.width &&
                      ticketHeight === p.height &&
                      ticketOrientation === p.orientation;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        disabled={!canUpdate}
                        className={`text-left p-2 rounded-xs border transition-all cursor-pointer text-2xs ${
                          isCurrent
                            ? 'bg-primary/10 border-primary text-primary font-semibold shadow-xs'
                            : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <div className="font-semibold">{p.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5 uppercase">
                          {p.width} × {p.height} cm ({p.orientation})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Width & Height Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Ticket Slip Width (cm)
                  </label>
                  <Input
                    value={ticketWidth}
                    onChange={(e) => setTicketWidth(e.target.value)}
                    placeholder="10.2"
                    disabled={!canUpdate}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Physical ticket width in cm (e.g. 10.2 cm = 4 inches)
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Ticket Slip Height (cm)
                  </label>
                  <Input
                    value={ticketHeight}
                    onChange={(e) => setTicketHeight(e.target.value)}
                    placeholder="3.5"
                    disabled={!canUpdate}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Continuous slip cut length or pre-printed leaf height
                  </p>
                </div>
              </div>

              {/* Orientation Preference */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5 text-primary mr-1" />
                  <span>Printing Orientation</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTicketOrientation('landscape')}
                    disabled={!canUpdate}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketOrientation === 'landscape'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Landscape (Horizontal)</span>
                      {ticketOrientation === 'landscape' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      Standard for cinema fanfold tickets (e.g. 10.2cm × 3.5cm)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketOrientation('portrait')}
                    disabled={!canUpdate}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketOrientation === 'portrait'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Portrait (Vertical)</span>
                      {ticketOrientation === 'portrait' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      Ideal for standard POS roll receipt format (58mm / 80mm)
                    </p>
                  </button>
                </div>
              </div>

              {/* Offline Typography Controls */}
              <div className="border border-border rounded-xs p-3 bg-muted/20 space-y-3">
                <div className="flex items-center space-x-2 border-b border-border/60 pb-1.5">
                  <Type className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Offline Typography &amp; Printhead Standards
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Offline Font Family Stack (Local System Fonts)
                  </label>
                  <select
                    value={ticketFontFamily}
                    onChange={(e) => setTicketFontFamily(e.target.value)}
                    disabled={!canUpdate}
                    className="w-full h-8 px-2 bg-background border border-border rounded-xs text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {TICKET_FONT_FAMILIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    {TICKET_FONT_FAMILIES.find((f) => f.id === ticketFontFamily)?.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Base Font Size (pt)
                    </label>
                    <select
                      value={ticketFontSizePt}
                      onChange={(e) => setTicketFontSizePt(e.target.value)}
                      disabled={!canUpdate}
                      className="w-full h-8 px-2 bg-background border border-border rounded-xs text-xs font-medium"
                    >
                      {TICKET_FONT_SIZES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Font Weight
                    </label>
                    <select
                      value={ticketFontWeight}
                      onChange={(e) => setTicketFontWeight(e.target.value)}
                      disabled={!canUpdate}
                      className="w-full h-8 px-2 bg-background border border-border rounded-xs text-xs font-medium"
                    >
                      {TICKET_FONT_WEIGHTS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Density Scaling (%)
                    </label>
                    <select
                      value={ticketFontScale}
                      onChange={(e) => setTicketFontScale(e.target.value)}
                      disabled={!canUpdate}
                      className="w-full h-8 px-2 bg-background border border-border rounded-xs text-xs font-medium"
                    >
                      <option value="90">90% (Compact)</option>
                      <option value="100">100% (Standard)</option>
                      <option value="110">110% (High-DPI)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Margins & Edge Padding */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Edge Padding / Margin (mm)
                  </label>
                  <select
                    value={ticketMarginMm}
                    onChange={(e) => setTicketMarginMm(e.target.value)}
                    disabled={!canUpdate}
                    className="w-full h-8 px-2 bg-background border border-border rounded-xs text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="0">None (0 mm) - Edge to Edge</option>
                    <option value="1">Tight (1 mm)</option>
                    <option value="2">Standard (2 mm) - Recommended</option>
                    <option value="3">Relaxed (3 mm)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Inner whitespace distance from thermal paper edge
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Extra Trailing Feed Lines
                  </label>
                  <select
                    value={ticketFeedLines}
                    onChange={(e) => setTicketFeedLines(e.target.value)}
                    disabled={!canUpdate}
                    className="w-full h-8 px-2 bg-background border border-border rounded-xs text-xs font-medium"
                  >
                    <option value="0">0 (None)</option>
                    <option value="1">1 Blank Line</option>
                    <option value="2">2 Blank Lines</option>
                    <option value="3">3 Blank Lines</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Advances ticket slip past manual tear bar
                  </p>
                </div>
              </div>

              {/* Cutter Controls */}
              <div className="border border-border rounded-xs p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <label htmlFor="autoCutToggle" className="text-xs font-semibold text-foreground cursor-pointer">
                      Auto-Cutter / Page Break Between Copies
                    </label>
                  </div>
                  <input
                    type="checkbox"
                    id="autoCutToggle"
                    checked={ticketAutoCut}
                    onChange={(e) => setTicketAutoCut(e.target.checked)}
                    className="rounded-xs text-primary h-4 w-4 cursor-pointer"
                    disabled={!canUpdate}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Sends page break cut instructions between each ticket copy (Security, Office, Customer).
                </p>
              </div>

              {/* Thermal POS Printer Device Selector */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Thermal POS Printer Hardware Device
                  </label>
                  {window.electronAPI?.getPrinters && (
                    <button
                      type="button"
                      onClick={scanPrinters}
                      disabled={isScanningPrinters}
                      className="text-[10px] text-primary hover:underline flex items-center cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                      {isScanningPrinters ? 'Scanning...' : 'Scan Connected Printers'}
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
                  Matches the installed OS printer driver name on the host computer.
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
                  <label htmlFor="silentPrintToggle" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Direct Silent Printing (Skip OS Dialog for named device)
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  When unchecked (default), clicking Print opens the standard OS printing dialog setup. When checked with a matching printer, print jobs are sent directly for instant counter ticketing.
                </p>
              </div>

              {/* Invoice Prefix & FY */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
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
        </div>
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
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Print Label (1-3 Chars) *</label>
              <Input
                value={newHeaderLabel}
                onChange={(e) => setNewHeaderLabel(e.target.value.toUpperCase())}
                placeholder="e.g. G, FB, U"
                maxLength={3}
                required
              />
              <p className="text-[10px] text-muted-foreground">Printed badge on top-right</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Print Order</label>
              <Input
                type="number"
                value={newPrintOrder}
                onChange={(e) => setNewPrintOrder(parseInt(e.target.value) || 1)}
                min={1}
                max={99}
              />
              <p className="text-[10px] text-muted-foreground">Sequence in print queue</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Purpose / Role Description</label>
            <Input
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
              placeholder="e.g. Concession Snack Counter Voucher"
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
              className="font-semibold cursor-pointer"
            >
              Add Ticket Copy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
