import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TicketCopyConfig, Booking, Cinema, TaxConfig } from '@/types';
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
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { printTickets,  TicketPrintData, OFFLINE_FONT_MAP } from '@/lib/thermal-printer';

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

export const PrinterSettingsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');

  const {
    cinema,
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
  const [ticketLayoutMode, setTicketLayoutMode] = useState<
    'side-by-side' | 'side-by-side-x' | 'side-by-side-y' | 'vertical-continuous' | 'sequential'
  >('side-by-side-y');
  const [ticketWidth, setTicketWidth] = useState('10.2');
  const [ticketHeight, setTicketHeight] = useState('10.2');
  const [ticketOrientation, setTicketOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [ticketRotation, setTicketRotation] = useState<'0' | '90' | '180' | '270'>('0');
  const [ticketMarginMm, setTicketMarginMm] = useState('1.5');
  const [ticketFontScale, setTicketFontScale] = useState('100');
  const [ticketFontFamily, setTicketFontFamily] = useState('system-sans');
  const [ticketFontSizePt, setTicketFontSizePt] = useState('8.0');
  const [ticketFontWeight, setTicketFontWeight] = useState('600');
  const [ticketAutoCut, setTicketAutoCut] = useState(false);
  const [ticketFeedLines, setTicketFeedLines] = useState('0');
  const [printerName, setPrinterName] = useState('Default Thermal POS-80');
  const [invoiceSeries, setInvoiceSeries] = useState('NC-LKP-26');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [silentPrint, setSilentPrint] = useState(false);

  // Test Print Status
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean | null>(null);

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
      setTicketLayoutMode((systemSettings['ticket_layout_mode'] as any) || 'side-by-side-y');
      setTicketWidth(systemSettings['ticket_width_cm'] || '10.2');
      setTicketHeight(systemSettings['ticket_height_cm'] || '10.2');
      setTicketOrientation((systemSettings['ticket_orientation'] as any) || 'portrait');
      setTicketRotation((systemSettings['ticket_rotation'] as any) || '0');
      setTicketMarginMm(systemSettings['ticket_margin_mm'] || '2');
      setTicketFontScale(systemSettings['ticket_font_scale'] || '100');
      setTicketFontFamily(systemSettings['ticket_font_family'] || 'system-sans');
      setTicketFontSizePt(systemSettings['ticket_font_size_pt'] || '8.0');
      setTicketFontWeight(systemSettings['ticket_font_weight'] || '600');
      setTicketAutoCut(systemSettings['ticket_auto_cut'] !== undefined ? systemSettings['ticket_auto_cut'] === 'true' : false);
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
    await updateSystemSetting('ticket_layout_mode', ticketLayoutMode);
    await updateSystemSetting('ticket_width_cm', ticketWidth);
    await updateSystemSetting('ticket_height_cm', ticketHeight);
    await updateSystemSetting('ticket_orientation', ticketOrientation);
    await updateSystemSetting('ticket_rotation', ticketRotation);
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

  const handleSetOrientation = (newOrientation: 'portrait' | 'landscape') => {
    setTicketOrientation(newOrientation);
    const w = Number(ticketWidth);
    const h = Number(ticketHeight);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      if (newOrientation === 'landscape' && h > w) {
        setTicketWidth(String(h));
        setTicketHeight(String(w));
      } else if (newOrientation === 'portrait' && w > h) {
        setTicketWidth(String(h));
        setTicketHeight(String(w));
      }
    }
  };

  const handleSetLayoutMode = (
    newLayoutMode: 'side-by-side' | 'side-by-side-x' | 'side-by-side-y' | 'vertical-continuous' | 'sequential'
  ) => {
    setTicketLayoutMode(newLayoutMode);
  };

  const handleTestPrint = async () => {
    setIsTestPrinting(true);
    setTestPrintSuccess(null);
    try {
      const sampleBooking: Booking = {
        id: 1001,
        booking_no: 'BKG-2026-001001',
        show_id: 1,
        booking_date: new Date().toISOString(),
        total_net: 240.0,
        total_cgst: 21.6,
        total_sgst: 21.6,
        total_service_charge: 24.0,
        total_gross: 307.2,
        is_gst_applied: true,
        payment_mode_id: 1,
        booked_by: 1,
        status: 'BOOKED',
        customer_phone: '9876543210',
        created_at: new Date().toISOString(),
        start_time: '06:30 PM',
        movie_name: 'AVATAR : FIRE AND ASH',
        movie_type_name: '3D',
        screen_name: 'AUDI 1',
        seats: [
          {
            id: 1,
            booking_id: 1001,
            seat_id: 1,
            row_name: 'A',
            seat_number: 1,
            seat_class_id: 1,
            seat_class_name: 'GOLD',
            price_net: 120,
            cgst: 10.8,
            sgst: 10.8,
            service_charge: 12,
            price_gross: 153.6,
          },
          {
            id: 2,
            booking_id: 1001,
            seat_id: 2,
            row_name: 'A',
            seat_number: 2,
            seat_class_id: 1,
            seat_class_name: 'GOLD',
            price_net: 120,
            cgst: 10.8,
            sgst: 10.8,
            service_charge: 12,
            price_gross: 153.6,
          },
        ],
        tickets: [
          {
            id: 1,
            booking_id: 1001,
            ticket_no: 'TKT-009571',
            copy_type: 'Customer',
            printed_at: new Date().toISOString(),
            is_cancelled: false,
          },
          {
            id: 2,
            booking_id: 1001,
            ticket_no: 'TKT-009572',
            copy_type: 'Office',
            printed_at: new Date().toISOString(),
            is_cancelled: false,
          },
        ],
      };

      const sampleCinema: Cinema = cinema || {
        id: 1,
        name: 'GRAND MULTIPLEX CINEMAS',
        header_text: 'GRAND MULTIPLEX CINEMAS',
        gstin: '29AAAAA0000A1Z5',
        cin: 'U74999KA2026PTC000000',
        show_gstin_on_ticket: true,
        address: '123 Entertainment Blvd, Bengaluru',
      };

      const sampleTaxConfig: TaxConfig = {
        id: 1,
        cgst_pct: 9,
        sgst_pct: 9,
        service_charge_amount: 12,
        service_charge_is_pct: false,
        apply_gst_default: true,
        gst_on_service_charge: false,
        tax_calculation_method: 'EXCLUSIVE',
        rounding_rule: 'NORMAL',
      };

      const printData: TicketPrintData = {
        cinema: sampleCinema,
        booking: sampleBooking,
        copyConfigs: copies,
        taxConfig: sampleTaxConfig,
        ticketWidthCm: ticketWidth,
        ticketHeightCm: ticketHeight,
        printerName: printerName,
        invoiceSeries: invoiceSeries,
        orientation: ticketOrientation,
        rotation: ticketRotation,
        marginMm: Number(ticketMarginMm) || 2,
        fontScale: Number(ticketFontScale) || 100,
        fontFamily: ticketFontFamily,
        fontSizePt: Number(ticketFontSizePt) || 8.0,
        fontWeight: ticketFontWeight,
        autoCut: ticketAutoCut,
        feedLines: Number(ticketFeedLines) || 0,
        layoutMode: ticketLayoutMode,
      };

      const success = await printTickets(printData, silentPrint);
      setTestPrintSuccess(success);
      setTimeout(() => setTestPrintSuccess(null), 4000);
    } catch (err) {
      console.error('Test print failed:', err);
      setTestPrintSuccess(false);
      setTimeout(() => setTestPrintSuccess(null), 4000);
    } finally {
      setIsTestPrinting(false);
    }
  };

  const resolvedFontFamily =
    OFFLINE_FONT_MAP[ticketFontFamily] ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const isVertical =
    ticketOrientation === 'portrait' ||
    Number(ticketHeight) > Number(ticketWidth);

  const padV = Math.max(1, Math.min(Number(ticketMarginMm) || 2, 3));
  const padH = Math.max(2, Math.min((Number(ticketMarginMm) || 2) * 1.5, 5));

  const renderTicketInnerContent = (c: TicketCopyConfig, blockW?: number, blockH?: number) => {
    const copyBadge = c.header_label ? c.header_label.trim() : 'C';
    const badgeFontSize = copyBadge.length > 2 ? '7.5px' : '9px';
    const cinemaName = cinema?.header_text || cinema?.name || 'GRAND MULTIPLEX CINEMAS';
    const gstin = cinema?.show_gstin_on_ticket && cinema?.gstin ? cinema.gstin : null;
    const cin = cinema?.cin || null;

    const baseWeight = Number(ticketFontWeight) || 600;
    const boldWeight = Math.min(900, baseWeight + 200);
    const semiWeight = Math.min(900, baseWeight + 100);
    const normalWeight = baseWeight;

    const isSideBySideY = ticketLayoutMode === 'side-by-side-y';
    const padV = isSideBySideY ? 1.0 : Math.max(1, Math.min(Number(ticketMarginMm) || 2, 3));
    const padH = isSideBySideY ? 2.5 : Math.max(2, Math.min((Number(ticketMarginMm) || 2) * 1.5, 5));

    const wCm = blockW !== undefined ? blockW : Number(ticketWidth);
    const hCm = blockH !== undefined ? blockH : Number(ticketHeight);
    const isSlipVertical = (ticketLayoutMode === 'side-by-side' || ticketLayoutMode === 'side-by-side-x')
      ? true
      : isSideBySideY
      ? false
      : (ticketOrientation === 'portrait' && hCm > wCm);

    const landscapeContent = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '1px', minWidth: 0, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3em', minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5em', height: '1.5em', border: '1.5px solid #000', fontWeight: boldWeight, fontSize: badgeFontSize, borderRadius: 2, flexShrink: 0 }}>
              {copyBadge}
            </span>
            <span style={{ fontWeight: boldWeight, fontSize: '1.1em', letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cinemaName}
            </span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.6em', height: '1.6em', border: '1.5px solid #000', borderRadius: '50%', fontWeight: boldWeight, fontSize: '1.0em', flexShrink: 0, marginLeft: '0.2em' }}>
            2
          </div>
        </div>

        {/* Movie Title Line */}
        <div style={{ fontWeight: semiWeight, fontSize: '1.05em', textTransform: 'uppercase', margin: '0.5px 0', lineHeight: 1.15, minHeight: '1.15em', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          AVATAR : FIRE AND ASH 3D
        </div>

        {/* Middle 3-Column Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.15fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '0.5px 0', fontSize: '0.88em', lineHeight: 1.10, flexShrink: 0 }}>
          {/* Column 1: Financial & Tax Breakup */}
          <div style={{ borderRight: '1px solid #000', paddingRight: '0.3em', lineHeight: 1.10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: normalWeight }}>ADM</span><span style={{ fontWeight: semiWeight }}>160.00</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: normalWeight }}>3D</span><span style={{ fontWeight: semiWeight }}>80.00</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: normalWeight }}>CGST</span><span style={{ fontWeight: semiWeight }}>21.60</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: normalWeight }}>SGST</span><span style={{ fontWeight: semiWeight }}>21.60</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: normalWeight }}>S.CH</span><span style={{ fontWeight: semiWeight }}>24.00</span></div>
            <div style={{ fontWeight: boldWeight, fontSize: '1.05em', marginTop: '0.5px', borderTop: '0.5px solid #000' }}>Total: 307.20</div>
          </div>

          {/* Column 2: Date, Showtime & SAC Code */}
          <div style={{ borderRight: '1px solid #000', padding: '0 0.3em', lineHeight: 1.12, overflow: 'hidden' }}>
            <div style={{ fontWeight: semiWeight, fontSize: '1.0em', whiteSpace: 'nowrap' }}>Tue, 25-08-2026</div>
            <div style={{ fontWeight: semiWeight, fontSize: '1.05em', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Evening, 06:30 PM</div>
            <div style={{ fontWeight: semiWeight, fontSize: '0.85em', marginTop: '1px' }}>SAC 997321</div>
          </div>

          {/* Column 3: Auditorium, Seat Numbers & Class */}
          <div style={{ paddingLeft: '0.3em', lineHeight: 1.12, textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontWeight: semiWeight, fontSize: '1.0em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>AUDI 1</div>
            <div style={{ fontWeight: boldWeight, fontSize: '1.15em', letterSpacing: '0.03em', wordBreak: 'break-all' }}>A-1, A-2</div>
            <div style={{ fontWeight: boldWeight, fontSize: '1.05em', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>GOLD</div>
          </div>
        </div>

        {/* Footer Section: Tax IDs and Audit Tracking */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.74em', lineHeight: 1.08, paddingTop: '0.5px', fontWeight: normalWeight, flexShrink: 0 }}>
          <div style={{ overflow: 'hidden', maxWidth: '50%' }}>
            {gstin ? <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>GSTIN: {gstin}</div> : null}
            {cin ? <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>CIN: {cin}</div> : null}
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div>Ticket No: 009571&nbsp;&nbsp;L.No. Txn: A000001-71W</div>
            <div>INV No. : {invoiceSeries}/000001&nbsp;&nbsp;25-Aug-26 06:30 PM</div>
          </div>
        </div>
      </div>
    );

    // For portrait/vertical slips: rotate the landscape content 90° so text reads along the long edge
    if (isSlipVertical) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%', clipPath: 'inset(0)' }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${hCm}cm`,
            height: `${wCm}cm`,
            transform: `translate(0, ${hCm}cm) rotate(-90deg)`,
            transformOrigin: '0 0',
            padding: `${padV}mm ${padH}mm`,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}>
            {landscapeContent}
          </div>
        </div>
      );
    }

    return landscapeContent;
  };

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
          {testPrintSuccess === true && (
            <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 mr-1 shrink-0 text-white" />
              <span>Test Print Sent!</span>
            </span>
          )}
          {testPrintSuccess === false && (
            <span className="bg-destructive text-destructive-foreground text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
              <span>Test Print Failed</span>
            </span>
          )}
          {isSaved && (
            <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 mr-1 shrink-0 text-white" />
              <span>Printer Settings Saved Successfully</span>
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestPrint}
            disabled={isTestPrinting}
            className="font-semibold px-3 cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            {isTestPrinting ? 'Printing Test...' : 'Test Print'}
          </Button>
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

          {/* Real-time Interactive Ticket Preview Card */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>Ticket Print Preview</span>
                </CardTitle>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded-xs bg-muted border border-border font-medium">
                    {ticketWidth}cm × {ticketHeight}cm
                  </span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-primary/10 text-primary border border-primary/20 font-bold uppercase">
                    {ticketOrientation}
                  </span>
                  {ticketRotation !== '0' && (
                    <span className="px-1.5 py-0.5 rounded-xs bg-accent text-accent-foreground border border-border font-bold">
                      {ticketRotation}°
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-muted/20 overflow-auto min-h-[360px] max-h-[620px] rounded-b-xs select-text flex">
              {/* Safe auto-margin scroll container prevents left/top clipping */}
              <div className="m-auto flex items-center justify-center shrink-0">
                <div
                  className="transition-all duration-200 shrink-0"
                  style={{
                    transform: Number(ticketRotation) ? `rotate(${Number(ticketRotation)}deg)` : undefined,
                    transformOrigin: 'center center',
                  }}
                >
                  {ticketLayoutMode === 'side-by-side-y' ? (
                    /* Single sheet multi-copy along Feed - Y (3 horizontal slips across 10.2cm sheet) */
                    (() => {
                      const activeList = copies.filter((c) => c.is_enabled).length > 0
                        ? copies.filter((c) => c.is_enabled).sort((a, b) => a.print_order - b.print_order)
                        : [{ id: 1, header_label: 'C', copy_name: 'Customer', is_enabled: true, print_order: 1, purpose: 'Customer' }];
                      const TOTAL_PARTS_Y = 3;
                      const effectivePartsY = Math.max(TOTAL_PARTS_Y, activeList.length);
                      const blockW = Number(ticketWidth || 10.2);
                      const blockH = Number((Number(ticketHeight || 10.2) / effectivePartsY).toFixed(4));
                      return (
                        <div
                          className="bg-white text-black shadow-md select-text rounded-xs flex flex-col border border-neutral-800 shrink-0 transition-all overflow-hidden"
                          style={{
                            width: `${blockW}cm`,
                            minWidth: `${blockW}cm`,
                            maxWidth: `${blockW}cm`,
                            height: `${ticketHeight}cm`,
                            minHeight: `${ticketHeight}cm`,
                            maxHeight: `${ticketHeight}cm`,
                            fontFamily: resolvedFontFamily,
                            fontWeight: ticketFontWeight,
                            fontSize: `${((Number(ticketFontSizePt) || 8) * (Number(ticketFontScale) || 100)) / 100}pt`,
                            lineHeight: 1.15,
                          }}
                        >
                          {activeList.map((c, idx) => (
                            <div
                              key={c.id || idx}
                              className="flex flex-col justify-between overflow-hidden relative shrink-0"
                              style={{
                                width: `${blockW}cm`,
                                minWidth: `${blockW}cm`,
                                maxWidth: `${blockW}cm`,
                                height: `${blockH}cm`,
                                minHeight: `${blockH}cm`,
                                maxHeight: `${blockH}cm`,
                                padding: `${padV}mm ${padH}mm`,
                                boxSizing: 'border-box',
                                borderTop: idx > 0 && ticketAutoCut ? '1.5px dashed #64748b' : 'none',
                              }}
                            >
                              {renderTicketInnerContent(c, blockW, blockH)}
                            </div>
                          ))}
                          {Array.from({ length: effectivePartsY - activeList.length }).map((_, bIdx) => (
                            <div
                              key={`blank-y-${bIdx}`}
                              className="flex flex-col items-center justify-center overflow-hidden relative shrink-0 bg-neutral-50/70 text-neutral-400 text-[10px] select-none italic"
                              style={{
                                width: `${blockW}cm`,
                                minWidth: `${blockW}cm`,
                                maxWidth: `${blockW}cm`,
                                height: `${blockH}cm`,
                                minHeight: `${blockH}cm`,
                                maxHeight: `${blockH}cm`,
                                boxSizing: 'border-box',
                                borderTop: ticketAutoCut ? '1.5px dashed #64748b' : 'none',
                              }}
                            >
                              <span>Part {activeList.length + bIdx + 1} (Blank / Unprinted)</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : ticketLayoutMode === 'side-by-side' || ticketLayoutMode === 'side-by-side-x' ? (
                    /* Single sheet multi-copy side-by-side across X with fixed 3-part roll stock slots */
                    (() => {
                      const activeList = copies.filter((c) => c.is_enabled).length > 0
                        ? copies.filter((c) => c.is_enabled).sort((a, b) => a.print_order - b.print_order)
                        : [{ id: 1, header_label: 'C', copy_name: 'Customer', is_enabled: true, print_order: 1, purpose: 'Customer' }];
                      const TOTAL_PARTS_X = 3;
                      const effectivePartsX = Math.max(TOTAL_PARTS_X, activeList.length);
                      const blockW = Number((Number(ticketWidth || 10.5) / effectivePartsX).toFixed(4));
                      const blockH = Number(ticketHeight || 10.2);
                      const isSlipVert = ticketOrientation === 'portrait' || blockH > blockW;
                      return (
                        <div
                          className="bg-white text-black shadow-md select-text rounded-xs flex flex-row items-stretch border border-neutral-800 shrink-0 transition-all overflow-hidden"
                          style={{
                            width: `${ticketWidth}cm`,
                            minWidth: `${ticketWidth}cm`,
                            maxWidth: `${ticketWidth}cm`,
                            height: `${blockH}cm`,
                            minHeight: `${blockH}cm`,
                            maxHeight: `${blockH}cm`,
                            fontFamily: resolvedFontFamily,
                            fontWeight: ticketFontWeight,
                            fontSize: `${((Number(ticketFontSizePt) || 8) * (Number(ticketFontScale) || 100)) / 100}pt`,
                            lineHeight: 1.15,
                          }}
                        >
                          {/* Active copy slots */}
                          {activeList.map((c, idx) => (
                            <div
                              key={c.id || idx}
                              className="flex flex-col justify-between overflow-hidden relative shrink-0"
                              style={{
                                width: `${blockW}cm`,
                                minWidth: `${blockW}cm`,
                                maxWidth: `${blockW}cm`,
                                height: `${blockH}cm`,
                                minHeight: `${blockH}cm`,
                                maxHeight: `${blockH}cm`,
                                padding: isSlipVert ? 0 : `${padV}mm ${padH}mm`,
                                boxSizing: 'border-box',
                                borderLeft: idx > 0 && ticketAutoCut ? '1.5px dashed #64748b' : 'none',
                              }}
                            >
                              {renderTicketInnerContent(c, blockW, blockH)}
                            </div>
                          ))}
                          {/* Blank placeholder slots when fewer copies are enabled on the 3-part roll */}
                          {Array.from({ length: effectivePartsX - activeList.length }).map((_, bIdx) => (
                            <div
                              key={`blank-${bIdx}`}
                              className="flex flex-col items-center justify-center overflow-hidden relative shrink-0 bg-neutral-50/70 text-neutral-400 text-[10px] select-none italic"
                              style={{
                                width: `${blockW}cm`,
                                minWidth: `${blockW}cm`,
                                maxWidth: `${blockW}cm`,
                                height: `${blockH}cm`,
                                minHeight: `${blockH}cm`,
                                maxHeight: `${blockH}cm`,
                                boxSizing: 'border-box',
                                borderLeft: ticketAutoCut ? '1.5px dashed #64748b' : 'none',
                              }}
                            >
                              <span>Part {activeList.length + bIdx + 1}</span>
                              <span className="text-[9px] opacity-70">(Blank / Unprinted)</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : ticketLayoutMode === 'vertical-continuous' ? (
                    /* Continuous uncut vertical roll with tear lines */
                    <div
                      className="bg-white text-black shadow-md select-text rounded-xs flex flex-col border border-neutral-800 shrink-0 transition-all"
                      style={{
                        fontFamily: resolvedFontFamily,
                        fontWeight: ticketFontWeight,
                        fontSize: `${((Number(ticketFontSizePt) || 8) * (Number(ticketFontScale) || 100)) / 100}pt`,
                        lineHeight: 1.15,
                      }}
                    >
                      {(copies.filter((c) => c.is_enabled).length > 0
                        ? copies.filter((c) => c.is_enabled).sort((a, b) => a.print_order - b.print_order)
                        : [{ id: 1, header_label: 'C', copy_name: 'Customer', is_enabled: true, print_order: 1, purpose: 'Customer' }]
                      ).map((c, idx) => (
                        <div
                          key={c.id || idx}
                          data-ticket-box={!isVertical ? '1' : undefined}
                          className="flex flex-col justify-between overflow-hidden relative shrink-0"
                          style={{
                            width: `${ticketWidth}cm`,
                            minWidth: `${ticketWidth}cm`,
                            maxWidth: `${ticketWidth}cm`,
                            height: `${ticketHeight}cm`,
                            minHeight: `${ticketHeight}cm`,
                            maxHeight: `${ticketHeight}cm`,
                            padding: isVertical ? 0 : `${padV}mm ${padH}mm`,
                            boxSizing: 'border-box',
                            borderTop: idx > 0 ? '1.5px dashed #64748b' : 'none',
                          }}
                        >
                          {renderTicketInnerContent(c)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Separated cut slips */
                    <div className="flex flex-col items-center gap-4">
                      {(copies.filter((c) => c.is_enabled).length > 0
                        ? copies.filter((c) => c.is_enabled).sort((a, b) => a.print_order - b.print_order)
                        : [{ id: 1, header_label: 'C', copy_name: 'Customer', is_enabled: true, print_order: 1, purpose: 'Customer' }]
                      ).map((c, idx) => (
                        <div
                          key={c.id || idx}
                          data-ticket-box={!isVertical ? '1' : undefined}
                          className="bg-white text-black shadow-md select-text rounded-xs relative overflow-hidden border border-neutral-800 shrink-0 transition-all"
                          style={{
                            width: `${ticketWidth}cm`,
                            minWidth: `${ticketWidth}cm`,
                            maxWidth: `${ticketWidth}cm`,
                            height: `${ticketHeight}cm`,
                            minHeight: `${ticketHeight}cm`,
                            maxHeight: `${ticketHeight}cm`,
                            padding: isVertical ? 0 : `${padV}mm ${padH}mm`,
                            boxSizing: 'border-box',
                            fontFamily: resolvedFontFamily,
                            fontWeight: ticketFontWeight,
                            fontSize: `${((Number(ticketFontSizePt) || 8) * (Number(ticketFontScale) || 100)) / 100}pt`,
                            lineHeight: 1.15,
                          }}
                        >
                          {renderTicketInnerContent(c)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            {/* Typography & Dimension Quick Badges */}
            <div className="p-2.5 bg-muted/40 border-t border-border flex flex-wrap items-center justify-center gap-1.5 w-full">
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
              {/* Roll Stock Presets */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Continuous Roll Stock Presets</span>
                  <span className="text-[10px] text-muted-foreground">Click to auto-configure dimensions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTicketWidth('10.2');
                      setTicketHeight('10.2');
                      setTicketLayoutMode('side-by-side-y');
                      setTicketOrientation('portrait');
                      setTicketRotation('0');
                    }}
                    disabled={!canUpdate}
                    className={`p-2 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketWidth === '10.2' && ticketHeight === '10.2' && ticketLayoutMode === 'side-by-side-y'
                        ? 'bg-primary/15 text-foreground border-primary font-semibold ring-1 ring-primary'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="font-bold text-xs">Standard 3-Part Roll (Recommended)</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">10.2 cm × 10.2 cm (Along Feed - Y)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketWidth('10.5');
                      setTicketHeight('10.2');
                      setTicketLayoutMode('side-by-side-y');
                      setTicketOrientation('portrait');
                      setTicketRotation('0');
                    }}
                    disabled={!canUpdate}
                    className={`p-2 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketWidth === '10.5' && ticketHeight === '10.2' && ticketLayoutMode === 'side-by-side-y'
                        ? 'bg-primary/15 text-foreground border-primary font-semibold ring-1 ring-primary'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="font-bold text-xs">Wide 3-Part Roll</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">10.5 cm × 10.2 cm (Along Feed - Y)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketWidth('8.0');
                      setTicketHeight('15.0');
                      setTicketLayoutMode('vertical-continuous');
                      setTicketOrientation('portrait');
                      setTicketRotation('0');
                    }}
                    disabled={!canUpdate}
                    className={`p-2 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketWidth === '8.0' && ticketHeight === '15.0'
                        ? 'bg-primary/15 text-foreground border-primary font-semibold ring-1 ring-primary'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="font-bold text-xs">Single POS-80 Roll</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">8.0 cm × 15.0 cm (Single strip)</div>
                  </button>
                </div>
              </div>

              {/* Custom Width & Height Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Total Roll Page Width (X) [cm]</span>
                    <span className="text-[10px] text-primary font-mono font-semibold">Across Roll</span>
                  </label>
                  <Input
                    value={ticketWidth}
                    onChange={(e) => setTicketWidth(e.target.value)}
                    placeholder="10.5"
                    disabled={!canUpdate}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Total roll liner width across all 3 parts ({((Number(ticketWidth || 10.5)) / 3).toFixed(2)} cm per part). Single tickets print strictly inside Part 1 without stretching across the roll.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Feed Length / Height (Y) [cm]</span>
                    <span className="text-[10px] text-emerald-500 font-mono font-semibold">Feed Direction</span>
                  </label>
                  <Input
                    value={ticketHeight}
                    onChange={(e) => setTicketHeight(e.target.value)}
                    placeholder="10.2"
                    disabled={!canUpdate}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Continuous feed length along paper travel direction per print / cut (e.g. 10.2 cm)
                  </p>
                </div>
              </div>

              {/* Printing Orientation & Rotation Direction */}
              <div className="space-y-2.5 pt-1">
                <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5 text-primary mr-1" />
                  <span>Printing Orientation &amp; Content Direction</span>
                </label>
                
                {/* Orientation Options */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetOrientation('landscape')}
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
                      Standard for multi-column cinema fanfold sheets or wide slips
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetOrientation('portrait')}
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
                      Standard for continuous POS roll receipt format &amp; vertical slips
                    </p>
                  </button>
                </div>

                {/* Content Rotation Direction Buttons */}
                <div className="pt-1">
                  <div className="text-[11px] font-medium text-foreground mb-1.5 flex items-center justify-between">
                    <span>Content Rotation &amp; Direction</span>
                    <span className="text-muted-foreground font-mono text-2xs">{ticketRotation}°</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: '0', label: '0° Normal' },
                      { id: '90', label: '90° CW' },
                      { id: '180', label: '180° Invert' },
                      { id: '270', label: '270° CCW' },
                    ].map((rot) => (
                      <button
                        key={rot.id}
                        type="button"
                        onClick={() => setTicketRotation(rot.id as '0' | '90' | '180' | '270')}
                        disabled={!canUpdate}
                        className={`py-1.5 px-2 rounded-xs border text-center cursor-pointer transition-all text-xs ${
                          ticketRotation === rot.id
                            ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {rot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ticket Copy Layout Mode (Side-by-Side X vs Side-by-Side Y vs Continuous vs Sequential) */}
              <div className="space-y-1.5 pt-1 border-t border-border">
                <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-primary mr-1" />
                  <span>Ticket Copies Layout &amp; Paper Feed Direction</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetLayoutMode('side-by-side')}
                    disabled={!canUpdate}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketLayoutMode === 'side-by-side' || ticketLayoutMode === 'side-by-side-x'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Side-by-Side (Across Roll - X)</span>
                      {(ticketLayoutMode === 'side-by-side' || ticketLayoutMode === 'side-by-side-x') && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      Copies sit horizontally across roll width X with vertical perforation lines.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetLayoutMode('side-by-side-y')}
                    disabled={!canUpdate}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketLayoutMode === 'side-by-side-y'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Side-by-Side (Along Feed - Y)</span>
                      {ticketLayoutMode === 'side-by-side-y' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      Copies sit vertically along feed length Y with horizontal perforation lines on 1 sheet.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetLayoutMode('vertical-continuous')}
                    disabled={!canUpdate}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketLayoutMode === 'vertical-continuous'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Continuous Roll (Uncut)</span>
                      {ticketLayoutMode === 'vertical-continuous' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      Continuous uncut roll printing with dashed tear lines between copies.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetLayoutMode('sequential')}
                    disabled={!canUpdate}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-all ${
                      ticketLayoutMode === 'sequential'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Individual Cut Slips</span>
                      {ticketLayoutMode === 'sequential' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      Sends auto-cut commands after each copy for individual POS cut slips.
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
                      Print Tear &amp; Cut Division Lines (Between Copies)
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
                  Prints dashed cut/tear lines between copies. Uncheck this if your thermal roller paper already has pre-perforated tear lines.
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
