import React, { useState } from 'react';
import { Booking, Cinema, TicketCopyConfig, TaxConfig } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle, Copy, FileText } from 'lucide-react';
import { printTickets, OFFLINE_FONT_MAP } from '@/lib/thermal-printer';
import { useSettingsStore } from '@/store/useSettingsStore';

interface TicketPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  cinema: Cinema | null;
  copyConfigs: TicketCopyConfig[];
  taxConfig: TaxConfig | null;
  systemSettings?: Record<string, string>;
}

export const TicketPreviewModal: React.FC<TicketPreviewModalProps> = ({
  isOpen,
  onClose,
  booking,
  cinema,
  copyConfigs,
  taxConfig,
  systemSettings: propSystemSettings,
}) => {
  const { systemSettings: storeSystemSettings } = useSettingsStore();
  const systemSettings = propSystemSettings || storeSystemSettings;
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [selectedCopyTab, setSelectedCopyTab] = useState<string>('ALL');

  if (!booking || !cinema || !taxConfig) return null;

  const ticketWidth = systemSettings?.['ticket_width_cm'] || '10.2';
  const ticketHeight = systemSettings?.['ticket_height_cm'] || '3.5';
  const printerName = systemSettings?.['thermal_printer_name'];
  const orientation = (systemSettings?.['ticket_orientation'] as 'portrait' | 'landscape') || 'landscape';
  const marginMm = systemSettings?.['ticket_margin_mm'] !== undefined ? Number(systemSettings['ticket_margin_mm']) : 2;
  const fontScale = systemSettings?.['ticket_font_scale'] !== undefined ? Number(systemSettings['ticket_font_scale']) : 100;
  const fontFamily = systemSettings?.['ticket_font_family'] || 'system-sans';
  const fontSizePt = systemSettings?.['ticket_font_size_pt'] !== undefined ? Number(systemSettings['ticket_font_size_pt']) : 8.0;
  const fontWeight = systemSettings?.['ticket_font_weight'] || '600';
  const autoCut = systemSettings?.['ticket_auto_cut'] !== 'false';
  const feedLines = systemSettings?.['ticket_feed_lines'] !== undefined ? Number(systemSettings['ticket_feed_lines']) : 0;

  const resolvedFontFamily =
    OFFLINE_FONT_MAP[fontFamily] ||
    fontFamily ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const effectiveFontSize = `${(Number(fontSizePt) * (fontScale / 100)).toFixed(1)}pt`;

  const activeCopies = copyConfigs
    .filter((c) => c.is_enabled)
    .sort((a, b) => a.print_order - b.print_order);

  const seatsList = booking.seats || [];
  const seatLabels = seatsList.map((s) => `${s.row_name}-${s.seat_number}`).join(', ');
  const seatClass = seatsList[0]?.seat_class_name?.toUpperCase() || '';
  const qty = seatsList.length;
  const tickets = booking.tickets || [];
  const firstTicketNo = tickets[0]?.ticket_no || (booking.booking_no ? booking.booking_no.slice(-7) : '');
  const txnNo = `A${String(booking.id).padStart(6, '0')}-${firstTicketNo ? firstTicketNo.slice(-2) : '01'}W`;
  const invoiceSeries = systemSettings?.['invoice_series'] || '';
  const invSeq = `000${String(booking.id).padStart(6, '0')}`;
  const invNo = invoiceSeries ? `${invoiceSeries}/${invSeq}` : invSeq;

  const bookingDateObj = new Date(booking.booking_date || new Date());
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[bookingDateObj.getDay()] || '';
  const dStr = String(bookingDateObj.getDate()).padStart(2, '0');
  const mStr = String(bookingDateObj.getMonth() + 1).padStart(2, '0');
  const yStr = bookingDateObj.getFullYear();
  const formattedDate = `${dayName}, ${dStr}-${mStr}-${yStr}`;

  const is3D = Boolean(booking.movie_type_name?.toUpperCase().includes('3D') || booking.movie_name?.toUpperCase().includes('3D'));
  const threeDNet = is3D ? (40.00 * qty).toFixed(2) : '00.00';
  const admNet = is3D ? Math.max(0, booking.total_net - Number(threeDNet)).toFixed(2) : booking.total_net.toFixed(2);

  let showTimeDisplay = booking.show_name || '';
  if (booking.show_name) {
    const cleanName = booking.show_name.replace(/^(morning|matinee|first|second|night|late|early)\s*(show)?\s*[-–:]*\s*/i, '').trim();
    if (booking.start_time && !cleanName.includes(booking.start_time)) {
      showTimeDisplay = `${cleanName}, ${booking.start_time || ''}`;
    } else if (!booking.start_time) {
      showTimeDisplay = cleanName;
    }
  }
  const now = new Date();
  const issuedOn = `${dStr}-${bookingDateObj.toLocaleString('en-US', { month: 'short' })}-${String(yStr).slice(-2)} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

  const layoutMode = (systemSettings?.['ticket_layout_mode'] as 'side-by-side' | 'vertical-continuous' | 'sequential') || 'side-by-side';

  const handlePrint = async (silent = false) => {
    setIsPrinting(true);
    setPrintSuccess(false);

    try {
      const success = await printTickets(
        {
          cinema,
          booking,
          copyConfigs: selectedCopyTab === 'ALL'
            ? activeCopies
            : activeCopies.filter((c) => c.header_label === selectedCopyTab),
          taxConfig,
          ticketWidthCm: ticketWidth,
          ticketHeightCm: ticketHeight,
          printerName,
          invoiceSeries,
          orientation,
          marginMm,
          fontScale,
          fontFamily,
          fontSizePt,
          fontWeight,
          autoCut,
          feedLines,
          layoutMode,
        },
        silent
      );

      if (success) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ticket Preview"
      description={`Booking Ref: ${booking.booking_no}`}
      maxWidth="4xl"
    >
      <div className="flex flex-col space-y-4">
        {/* Controls Bar: Copy Tabs + Print Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={selectedCopyTab === 'ALL' ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedCopyTab('ALL')}
              className="text-xs font-semibold cursor-pointer"
            >
              <Copy className="w-3 h-3 mr-1" />
              All Copies ({activeCopies.length})
            </Button>
            {activeCopies.map((c) => (
              <Button
                key={c.id}
                variant={selectedCopyTab === c.header_label ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSelectedCopyTab(c.header_label)}
                className="text-xs font-semibold uppercase cursor-pointer"
              >
                [{c.header_label}] {c.copy_name}
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrint(systemSettings?.['silent_print'] === 'true')}
              disabled={isPrinting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              {isPrinting ? 'Printing...' : 'PRINT TICKETS'}
            </Button>
          </div>
        </div>

        {/* Visual Thermal Slips Container */}
        {layoutMode === 'side-by-side' && selectedCopyTab === 'ALL' ? (
          /* Multi-Column 3-Panel Single Perforated Sheet (Horizontally Scrollable) */
          <div className="bg-slate-900 p-4 rounded-xs overflow-x-auto w-full">
            <div
              className="bg-white text-black shadow-2xl select-text rounded-xs flex flex-row items-stretch border border-black shrink-0 transition-all w-fit"
              style={{
                fontFamily: resolvedFontFamily,
                fontWeight: fontWeight,
                fontSize: `${Number(fontSizePt) || 8}pt`,
                lineHeight: 1.15,
              }}
            >
              {activeCopies.map((copy, idx) => {
                const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
                return (
                  <div
                    key={copy.id}
                    className="flex flex-col justify-between overflow-hidden relative shrink-0"
                    style={{
                      width: `${ticketWidth}cm`,
                      minWidth: `${ticketWidth}cm`,
                      height: `${ticketHeight}cm`,
                      minHeight: `${ticketHeight}cm`,
                      padding: `${Math.max(2, Number(marginMm) || 2)}mm`,
                      boxSizing: 'border-box',
                      borderLeft: idx > 0 ? '1.5px dashed #64748b' : 'none',
                    }}
                  >
                    {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '13px', height: '13px', padding: '0 2px', border: '1.5px solid #000', fontWeight: 900, fontSize: copyBadge.length > 2 ? '6.5px' : '8px', borderRadius: '2px', flexShrink: 0 }}>
                          {copyBadge}
                        </span>
                        <span style={{ fontWeight: 900, fontSize: '8.5px', letterSpacing: '0.1px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cinema.header_text || cinema.name || ''}
                        </span>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', border: '1.5px solid #000', borderRadius: '50%', fontWeight: 900, fontSize: '8px', flexShrink: 0, marginLeft: '2px' }}>
                        {qty}
                      </div>
                    </div>

                    {/* Movie Title */}
                    <div style={{ fontWeight: 800, fontSize: '8.5px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {booking.movie_name || ''} {booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
                    </div>

                    {/* Middle 3 Columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.15fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0', marginTop: '1px', fontSize: '7.5px' }}>
                      {/* Column 1: Financials */}
                      <div style={{ borderRight: '1px solid #000', paddingRight: '3px', lineHeight: 1.15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>ADM</span>
                          <span style={{ fontWeight: 700 }}>{admNet}</span>
                          {is3D && <span>3D</span>}
                          {is3D && <span style={{ fontWeight: 700 }}>{threeDNet}</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>CGST</span>
                          <span style={{ fontWeight: 700 }}>{booking.total_cgst.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>SGST</span>
                          <span style={{ fontWeight: 700 }}>{booking.total_sgst.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>S.CH</span>
                          <span style={{ fontWeight: 700 }}>{booking.total_service_charge.toFixed(2)}</span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '8px', marginTop: '1px' }}>
                          Total: ₹{booking.total_gross.toFixed(2)}
                        </div>
                      </div>

                      {/* Column 2: Date & Time */}
                      <div style={{ borderRight: '1px solid #000', padding: '0 3px', lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, fontSize: '8px', whiteSpace: 'nowrap' }}>{formattedDate}</div>
                        <div style={{ fontWeight: 800, fontSize: '8.5px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{showTimeDisplay}</div>
                        <div style={{ fontWeight: 700, fontSize: '7px', marginTop: '1px' }}>SAC 997321</div>
                      </div>

                      {/* Column 3: Screen & Seat */}
                      <div style={{ paddingLeft: '3px', lineHeight: 1.2, textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 800, fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.screen_name || ''}</div>
                        <div style={{ fontWeight: 900, fontSize: '9px', letterSpacing: '0.2px', wordBreak: 'break-word' }}>{seatLabels}</div>
                        <div style={{ fontWeight: 900, fontSize: '8px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seatClass}</div>
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6px', lineHeight: 1.1, paddingTop: '1px', fontWeight: 600 }}>
                      <div>
                        {cinema.show_gstin_on_ticket && cinema.gstin ? <div style={{ fontWeight: 700 }}>GSTIN: {cinema.gstin}</div> : null}
                        {cinema.cin ? <div>CIN: {cinema.cin}</div> : null}
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div>Tkt: {firstTicketNo}&nbsp;&nbsp;Txn: {txnNo}</div>
                        <div>INV: {invNo}&nbsp;&nbsp;{issuedOn}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : layoutMode === 'vertical-continuous' && selectedCopyTab === 'ALL' ? (
          /* Multi-Copy Continuous Uncut Strip (Vertically Scrollable) */
          <div className="bg-slate-900 p-4 rounded-xs overflow-y-auto max-h-[62vh] flex flex-col items-center w-full">
            <div
              className="bg-white text-black shadow-2xl select-text rounded-xs flex flex-col border border-black shrink-0 transition-all w-fit"
              style={{
                fontFamily: resolvedFontFamily,
                fontWeight: fontWeight,
                fontSize: `${Number(fontSizePt) || 8}pt`,
                lineHeight: 1.15,
              }}
            >
              {activeCopies.map((copy, idx) => {
                const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
                return (
                  <div
                    key={copy.id}
                    className="flex flex-col justify-between overflow-hidden relative shrink-0"
                    style={{
                      width: `${ticketWidth}cm`,
                      minWidth: `${ticketWidth}cm`,
                      height: `${ticketHeight}cm`,
                      minHeight: `${ticketHeight}cm`,
                      padding: `${Math.max(2, Number(marginMm) || 2)}mm`,
                      boxSizing: 'border-box',
                      borderTop: idx > 0 ? '1.5px dashed #64748b' : 'none',
                    }}
                  >
                    {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '13px', height: '13px', padding: '0 2px', border: '1.5px solid #000', fontWeight: 900, fontSize: copyBadge.length > 2 ? '6.5px' : '8px', borderRadius: '2px', flexShrink: 0 }}>
                          {copyBadge}
                        </span>
                        <span style={{ fontWeight: 900, fontSize: '8.5px', letterSpacing: '0.1px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cinema.header_text || cinema.name || ''}
                        </span>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', border: '1.5px solid #000', borderRadius: '50%', fontWeight: 900, fontSize: '8px', flexShrink: 0, marginLeft: '2px' }}>
                        {qty}
                      </div>
                    </div>

                    {/* Movie Title */}
                    <div style={{ fontWeight: 800, fontSize: '8.5px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {booking.movie_name || ''} {booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
                    </div>

                    {/* Middle 3 Columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.15fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0', marginTop: '1px', fontSize: '7.5px' }}>
                      {/* Column 1: Financials */}
                      <div style={{ borderRight: '1px solid #000', paddingRight: '3px', lineHeight: 1.15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>ADM</span>
                          <span style={{ fontWeight: 700 }}>{admNet}</span>
                          {is3D && <span>3D</span>}
                          {is3D && <span style={{ fontWeight: 700 }}>{threeDNet}</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>CGST</span>
                          <span style={{ fontWeight: 700 }}>{booking.total_cgst.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>SGST</span>
                          <span style={{ fontWeight: 700 }}>{booking.total_sgst.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>S.CH</span>
                          <span style={{ fontWeight: 700 }}>{booking.total_service_charge.toFixed(2)}</span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '8px', marginTop: '1px' }}>
                          Total: ₹{booking.total_gross.toFixed(2)}
                        </div>
                      </div>

                      {/* Column 2: Date & Time */}
                      <div style={{ borderRight: '1px solid #000', padding: '0 3px', lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, fontSize: '8px', whiteSpace: 'nowrap' }}>{formattedDate}</div>
                        <div style={{ fontWeight: 800, fontSize: '8.5px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{showTimeDisplay}</div>
                        <div style={{ fontWeight: 700, fontSize: '7px', marginTop: '1px' }}>SAC 997321</div>
                      </div>

                      {/* Column 3: Audi & Seat */}
                      <div style={{ paddingLeft: '3px', lineHeight: 1.2, textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 800, fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.screen_name || ''}</div>
                        <div style={{ fontWeight: 900, fontSize: '9px', letterSpacing: '0.2px', wordBreak: 'break-word' }}>{seatLabels}</div>
                        <div style={{ fontWeight: 900, fontSize: '8px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seatClass}</div>
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6px', lineHeight: 1.1, paddingTop: '1px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {cinema.show_gstin_on_ticket && cinema.gstin ? <div style={{ fontWeight: 700 }}>GSTIN: {cinema.gstin}</div> : null}
                        {cinema.cin ? <div>CIN: {cinema.cin}</div> : null}
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div>Tkt: {firstTicketNo}&nbsp;&nbsp;Txn: {txnNo}</div>
                        <div>INV: {invNo}&nbsp;&nbsp;{issuedOn}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Sequential / Single Copy Slips (Vertically Scrollable) */
          <div className="bg-slate-900 p-4 rounded-xs overflow-y-auto max-h-[62vh] flex flex-col items-center gap-4 w-full">
            {(selectedCopyTab === 'ALL'
              ? activeCopies
              : activeCopies.filter((c) => c.header_label === selectedCopyTab)
            ).map((copy) => {
              const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
              return (
                <div
                  key={copy.id}
                  className="bg-white text-black shadow-2xl select-text rounded-xs flex flex-col justify-between border border-black shrink-0 transition-all"
                  style={{
                    width: `${ticketWidth}cm`,
                    minHeight: `${ticketHeight}cm`,
                    height: `${ticketHeight}cm`,
                    padding: `${Math.max(2, Number(marginMm) || 2)}mm`,
                    boxSizing: 'border-box',
                    fontFamily: resolvedFontFamily,
                    fontWeight: fontWeight,
                    fontSize: `${Number(fontSizePt) || 8}pt`,
                    lineHeight: 1.15,
                  }}
                >
                  {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '14px', height: '14px', padding: '0 2px', border: '1.5px solid #000', fontWeight: 900, fontSize: copyBadge.length > 2 ? '7px' : '8.5px', borderRadius: '2px', flexShrink: 0 }}>
                        {copyBadge}
                      </span>
                      <span style={{ fontWeight: 900, fontSize: '9px', letterSpacing: '0.1px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cinema.header_text || cinema.name || ''}
                      </span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '15px', height: '15px', border: '1.5px solid #000', borderRadius: '50%', fontWeight: 900, fontSize: '8.5px', flexShrink: 0, marginLeft: '2px' }}>
                      {qty}
                    </div>
                  </div>

                  {/* Movie Title Line */}
                  <div style={{ fontWeight: 800, fontSize: '9px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {booking.movie_name || ''} {booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
                  </div>

                  {/* Middle 3-Column Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.15fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0', marginTop: '1px', fontSize: '7.5px' }}>
                    {/* Column 1: Financial & Tax Breakup */}
                    <div style={{ borderRight: '1px solid #000', paddingRight: '3px', lineHeight: 1.15 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>ADM</span>
                        <span style={{ fontWeight: 700 }}>{admNet}</span>
                        {is3D && <span>3D</span>}
                        {is3D && <span style={{ fontWeight: 700 }}>{threeDNet}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>CGST</span>
                        <span style={{ fontWeight: 700 }}>{booking.total_cgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>SGST</span>
                        <span style={{ fontWeight: 700 }}>{booking.total_sgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>S.CH</span>
                        <span style={{ fontWeight: 700 }}>{booking.total_service_charge.toFixed(2)}</span>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '8px', marginTop: '1px' }}>
                        Total: ₹{booking.total_gross.toFixed(2)}
                      </div>
                    </div>

                    {/* Column 2: Date, Showtime & SAC Code */}
                    <div style={{ borderRight: '1px solid #000', padding: '0 3px', lineHeight: 1.2 }}>
                      <div style={{ fontWeight: 800, fontSize: '8px', whiteSpace: 'nowrap' }}>{formattedDate}</div>
                      <div style={{ fontWeight: 800, fontSize: '8.5px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{showTimeDisplay}</div>
                      <div style={{ fontWeight: 700, fontSize: '7px', marginTop: '1px' }}>SAC 997321</div>
                    </div>

                    {/* Column 3: Auditorium, Seat Numbers & Class */}
                    <div style={{ paddingLeft: '3px', lineHeight: 1.2, textAlign: 'left', overflow: 'hidden' }}>
                      <div style={{ fontWeight: 800, fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.screen_name || ''}</div>
                      <div style={{ fontWeight: 900, fontSize: '9px', letterSpacing: '0.2px', wordBreak: 'break-word' }}>{seatLabels}</div>
                      <div style={{ fontWeight: 900, fontSize: '8px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seatClass}</div>
                    </div>
                  </div>

                  {/* Footer Section: Tax IDs & Audit Tracking */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6px', lineHeight: 1.1, paddingTop: '1px', fontWeight: 600 }}>
                    <div>
                      {cinema.show_gstin_on_ticket && cinema.gstin ? <div style={{ fontWeight: 700 }}>GSTIN: {cinema.gstin}</div> : null}
                      {cinema.cin ? <div>CIN: {cinema.cin}</div> : null}
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div>Tkt: {firstTicketNo}&nbsp;&nbsp;Txn: {txnNo}</div>
                      <div>INV: {invNo}&nbsp;&nbsp;{issuedOn}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info & Confirmation */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-2xs text-slate-500">
            Target Size: <strong>10.2 cm × 3.5 cm</strong> (Compatible with Thermal Receipt Printers)
          </div>
          <div className="flex items-center space-x-2">
            {printSuccess && (
              <span className="text-emerald-600 text-xs font-bold flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" /> Printed Successfully
              </span>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Done / Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
