import React, { useState, useEffect } from 'react';
import { Booking, Cinema, TicketCopyConfig, TaxConfig } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle, Copy, FileText } from 'lucide-react';
import { printTickets, fitTicketContent, resolveTicketDimensions, OFFLINE_FONT_MAP } from '@/lib/thermal-printer';
import { useSettingsStore } from '@/store/useSettingsStore';

interface TicketPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed?: () => void;
  booking: Booking | null;
  cinema: Cinema | null;
  copyConfigs: TicketCopyConfig[];
  taxConfig: TaxConfig | null;
  systemSettings?: Record<string, string>;
}

export const TicketPreviewModal: React.FC<TicketPreviewModalProps> = ({
  isOpen,
  onClose,
  onBookingConfirmed,
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
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedCopyTab, setSelectedCopyTab] = useState<string>('ALL');
  const previewRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (previewRef.current) {
      fitTicketContent(previewRef.current);
    }
  });

  if (!isOpen || !booking || !cinema || !taxConfig) return null;

  const { widthCm: ticketWidth, heightCm: ticketHeight } = resolveTicketDimensions({
    ticketWidthCm: systemSettings?.['ticket_width_cm'],
    ticketHeightCm: systemSettings?.['ticket_height_cm'],
  });
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
  const padV = Math.max(1, Math.min(marginMm, 3));
  const padH = Math.max(2, Math.min(marginMm * 1.5, 5));

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

  const layoutMode = (systemSettings?.['ticket_layout_mode'] as 'side-by-side' | 'side-by-side-x' | 'side-by-side-y' | 'vertical-continuous' | 'sequential') || 'side-by-side';
  const rotation = (systemSettings?.['ticket_rotation'] as '0' | '90' | '180' | '270') || '0';
  const rotationDeg = Number(rotation) || 0;

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
          rotation,
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
        setIsConfirmed(true);
        // Auto-close and notify parent after 2 seconds
        setTimeout(() => {
          setPrintSuccess(false);
          setIsConfirmed(false);
          if (onBookingConfirmed) onBookingConfirmed();
        }, 2000);
      }
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  const isVertical =
    orientation === 'portrait' ||
    Number(ticketHeight) > Number(ticketWidth);


  const renderModalTicketContent = (copy: TicketCopyConfig, blockW?: number, blockH?: number) => {
    const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
    const badgeFontSize = copyBadge.length > 2 ? '7.5px' : '9px';
    const cinemaName = cinema.header_text || cinema.name || '';
    const gstin = cinema.show_gstin_on_ticket && cinema.gstin ? cinema.gstin : null;
    const cin = cinema.cin || null;

    const baseWeight = Number(fontWeight) || 600;
    const boldWeight = Math.min(900, baseWeight + 200);
    const semiWeight = Math.min(900, baseWeight + 100);
    const normalWeight = baseWeight;

    const padV = Math.max(1, Math.min(marginMm, 3));
    const padH = Math.max(2, Math.min(marginMm * 1.5, 5));

    const wCm = blockW !== undefined ? blockW : Number(ticketWidth);
    const hCm = blockH !== undefined ? blockH : Number(ticketHeight);
    const isSlipVertical = orientation === 'portrait' || hCm > wCm;

    const rawMovieName = booking.movie_name || (booking as any).movieTitle || '';
    const rawMovieType = booking.movie_type_name || '';
    const displayMovieTitle = rawMovieName ? rawMovieName.trim().toUpperCase() : 'CINEMA MOVIE';
    const displayMovieType = rawMovieType ? rawMovieType.trim().toUpperCase() : '';
    const fullMovieName = displayMovieType && !displayMovieTitle.includes(displayMovieType)
      ? `${displayMovieTitle} ${displayMovieType}`
      : displayMovieTitle;

    // Landscape content — used directly for landscape slips, rotated inside portrait slips
    const landscapeContent = (
      <div data-ticket-scale="1" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transformOrigin: 'top left', fontFamily: resolvedFontFamily, fontSize: effectiveFontSize, fontWeight: normalWeight }}>
        {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: '0.2em', minWidth: 0, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3em', minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5em', height: '1.5em', border: '1.5px solid #000', fontWeight: boldWeight, fontSize: badgeFontSize, borderRadius: '2px', flexShrink: 0 }}>
              {copyBadge}
            </span>
            <span style={{ fontWeight: boldWeight, fontSize: '1.15em', letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cinemaName}
            </span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.6em', height: '1.6em', border: '1.5px solid #000', borderRadius: '50%', fontWeight: boldWeight, fontSize: '1.0em', flexShrink: 0, marginLeft: '0.2em' }}>
            {qty}
          </div>
        </div>

        {/* Movie Title Line - Guaranteed visible after headline line */}
        <div style={{ fontWeight: semiWeight, fontSize: '1.05em', textTransform: 'uppercase', margin: '0.1em 0', lineHeight: 1.25, minHeight: '1.25em', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fullMovieName}
        </div>

        {/* Middle 3 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '0.2em 0', fontSize: '0.9em', flexShrink: 0 }}>
          {/* Column 1: Financials */}
          <div style={{ borderRight: '1px solid #000', paddingRight: '0.3em', lineHeight: 1.18, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: normalWeight }}>ADM</span>
              <span style={{ fontWeight: semiWeight }}>{admNet}</span>
            </div>
            {is3D && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: normalWeight }}>3D</span>
                <span style={{ fontWeight: semiWeight }}>{threeDNet}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: normalWeight }}>CGST</span>
              <span style={{ fontWeight: semiWeight }}>{booking.total_cgst.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: normalWeight }}>SGST</span>
              <span style={{ fontWeight: semiWeight }}>{booking.total_sgst.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: normalWeight }}>S.CH</span>
              <span style={{ fontWeight: semiWeight }}>{booking.total_service_charge.toFixed(2)}</span>
            </div>
            <div style={{ fontWeight: boldWeight, fontSize: '1.05em', marginTop: '0.1em', borderTop: '0.5px solid #000' }}>
              Total: {booking.total_gross.toFixed(2)}
            </div>
          </div>

          {/* Column 2: Date & Time */}
          <div style={{ borderRight: '1px solid #000', padding: '0 0.3em', lineHeight: 1.2, overflow: 'hidden' }}>
            <div style={{ fontWeight: semiWeight, fontSize: '1.0em', whiteSpace: 'nowrap' }}>{formattedDate}</div>
            <div style={{ fontWeight: semiWeight, fontSize: '1.05em', margin: '0.1em 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{showTimeDisplay}</div>
            <div style={{ fontWeight: semiWeight, fontSize: '0.88em', marginTop: '0.15em' }}>SAC 997321</div>
          </div>

          {/* Column 3: Screen & Seat */}
          <div style={{ paddingLeft: '0.3em', lineHeight: 1.2, textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontWeight: semiWeight, fontSize: '1.0em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.screen_name || ''}</div>
            <div style={{ fontWeight: boldWeight, fontSize: '1.15em', letterSpacing: '0.03em', wordBreak: 'break-all' }}>{seatLabels}</div>
            <div style={{ fontWeight: boldWeight, fontSize: '1.05em', textTransform: 'uppercase', margin: '0.1em 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seatClass}</div>
          </div>
        </div>

        {/* Footer Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.78em', lineHeight: 1.15, paddingTop: '0.15em', fontWeight: normalWeight, flexShrink: 0 }}>
          <div style={{ overflow: 'hidden', maxWidth: '50%' }}>
            {gstin ? <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>GSTIN: {gstin}</div> : null}
            {cin ? <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>CIN: {cin}</div> : null}
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div>Ticket No: {firstTicketNo}&nbsp;&nbsp;L.No. Transaction No: {txnNo}</div>
            <div>INV No. : {invNo}&nbsp;&nbsp;Issued on: {issuedOn}</div>
          </div>
        </div>
      </div>
    );

    // For portrait/vertical slips: rotate the landscape content 90° so text reads along the long edge
    if (isSlipVertical) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%', clipPath: 'inset(0)' }}>
          <div data-ticket-box="1" style={{
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

        {/* Visual Clean Thermal Slips Container */}
        <div ref={previewRef} className="p-6 bg-muted/20 border border-border/40 rounded-xs overflow-auto max-h-[65vh] flex w-full select-text">
          {/* Safe auto-margin scroll container prevents left/top clipping */}
          <div className="m-auto flex items-center justify-center shrink-0">
            <div
              className="transition-all duration-200 shrink-0"
              style={{
                transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
                transformOrigin: 'center center',
              }}
            >
              {(layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x') && selectedCopyTab === 'ALL' ? (
                /* Multi-Column Single Perforated Sheet across X with fixed 3-part slots */
                (() => {
                  const TOTAL_PARTS_X = 3;
                  const effectivePartsX = Math.max(TOTAL_PARTS_X, activeCopies.length);
                  const blockW = Number((Number(ticketWidth) / effectivePartsX).toFixed(4));
                  const blockH = Number(ticketHeight);
                  const isSlipVert = orientation === 'portrait' || blockH > blockW;
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
                        fontWeight: fontWeight,
                        fontSize: effectiveFontSize,
                        lineHeight: 1.15,
                      }}
                    >
                      {activeCopies.map((copy, idx) => (
                        <div
                          key={copy.id}
                          data-ticket-box={!isSlipVert ? '1' : undefined}
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
                            borderLeft: idx > 0 ? '1.5px dashed #64748b' : 'none',
                          }}
                        >
                          {renderModalTicketContent(copy, blockW, blockH)}
                        </div>
                      ))}
                      {Array.from({ length: effectivePartsX - activeCopies.length }).map((_, bIdx) => (
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
                            borderLeft: '1.5px dashed #64748b',
                          }}
                        >
                          <span>Part {activeCopies.length + bIdx + 1}</span>
                          <span className="text-[9px] opacity-70">(Blank / Unprinted)</span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : layoutMode === 'side-by-side-y' && selectedCopyTab === 'ALL' ? (
                /* Multi-Copy Single Perforated Sheet along Y with fixed slots */
                (() => {
                  const TOTAL_PARTS_Y = 3;
                  const effectivePartsY = Math.max(TOTAL_PARTS_Y, activeCopies.length);
                  const blockW = Number(ticketWidth);
                  const blockH = Number((Number(ticketHeight) / effectivePartsY).toFixed(4));
                  const isSlipVert = orientation === 'portrait' || blockH > blockW;
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
                        fontWeight: fontWeight,
                        fontSize: effectiveFontSize,
                        lineHeight: 1.15,
                      }}
                    >
                      {activeCopies.map((copy, idx) => (
                        <div
                          key={copy.id}
                          data-ticket-box={!isSlipVert ? '1' : undefined}
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
                            borderTop: idx > 0 ? '1.5px dashed #64748b' : 'none',
                          }}
                        >
                          {renderModalTicketContent(copy, blockW, blockH)}
                        </div>
                      ))}
                      {Array.from({ length: effectivePartsY - activeCopies.length }).map((_, bIdx) => (
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
                            borderTop: '1.5px dashed #64748b',
                          }}
                        >
                          <span>Part {activeCopies.length + bIdx + 1} (Blank)</span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : layoutMode === 'vertical-continuous' && selectedCopyTab === 'ALL' ? (
                /* Multi-Copy Continuous Uncut Strip */
                <div
                  className="bg-white text-black shadow-md select-text rounded-xs flex flex-col border border-neutral-800 shrink-0 transition-all"
                  style={{
                    fontFamily: resolvedFontFamily,
                    fontWeight: fontWeight,
                    fontSize: effectiveFontSize,
                    lineHeight: 1.15,
                  }}
                >
                  {activeCopies.map((copy, idx) => (
                    <div
                      key={copy.id}
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
                      {renderModalTicketContent(copy)}
                    </div>
                  ))}
                </div>
              ) : (
                /* Sequential / Single Copy Slips */
                <div className="flex flex-col items-center gap-4">
                  {(selectedCopyTab === 'ALL'
                    ? activeCopies
                    : activeCopies.filter((c) => c.header_label === selectedCopyTab)
                  ).map((copy) => (
                    <div
                      key={copy.id}
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
                        fontWeight: fontWeight,
                        fontSize: effectiveFontSize,
                        lineHeight: 1.15,
                      }}
                    >
                      {renderModalTicketContent(copy)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info & Confirmation */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-2xs text-muted-foreground font-mono">
            Sheet: <strong className="text-foreground">{layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x' ? `${ticketWidth} cm (X) × ${ticketHeight} cm (Y) (${activeCopies.length} × ${(Number(ticketWidth) / (activeCopies.length || 1)).toFixed(1)} cm)` : layoutMode === 'side-by-side-y' || layoutMode === 'vertical-continuous' ? `${ticketWidth} cm (X) × ${ticketHeight} cm (Y)` : `${ticketWidth} cm (X) × ${ticketHeight} cm (Y)`}</strong> ({orientation.toUpperCase()}{rotation !== '0' ? `, ${rotation}°` : ''})
          </div>
          <div className="flex items-center space-x-2">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-600 text-white text-xs font-extrabold tracking-wide animate-pulse">
                <CheckCircle className="w-4 h-4" />
                BOOKING CONFIRMED — closing…
              </span>
            ) : printSuccess ? (
              <span className="text-emerald-600 text-xs font-bold flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" /> Printed Successfully
              </span>
            ) : null}
            <Button variant="outline" size="sm" onClick={onClose} disabled={isConfirmed}>
              Done / Close
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
