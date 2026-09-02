import React, { useState } from 'react';
import { Booking, Cinema, TicketCopyConfig, TaxConfig } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle, Copy, FileText } from 'lucide-react';
import { printTickets } from '@/lib/thermal-printer';

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
  systemSettings,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [selectedCopyTab, setSelectedCopyTab] = useState<string>('ALL');

  if (!booking || !cinema || !taxConfig) return null;

  const ticketWidth = systemSettings?.['ticket_width_cm'] || '10.2';
  const ticketHeight = systemSettings?.['ticket_height_cm'] || '3.5';
  const printerName = systemSettings?.['thermal_printer_name'];

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

  let showTimeDisplay = booking.start_time || '';
  if (booking.show_name && booking.show_name.trim()) {
    const cleanName = booking.show_name.trim();
    const isTimeString = /^\d{1,2}:\d{2}/.test(cleanName);
    if (!isTimeString) {
      showTimeDisplay = `${cleanName}, ${booking.start_time || ''}`;
    } else if (!booking.start_time) {
      showTimeDisplay = cleanName;
    }
  }
  const now = new Date();
  const issuedOn = `${dStr}-${bookingDateObj.toLocaleString('en-US', { month: 'short' })}-${String(yStr).slice(-2)} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

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
      title="Thermal Ticket Issuance & Print Preview"
      description={`${ticketWidth} cm × ${ticketHeight} cm Thermal Format | Booking Ref: ${booking.booking_no}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Controls: Copy Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setSelectedCopyTab('ALL')}
              className={`px-2.5 py-1 text-2xs font-extrabold rounded-xs transition-all border cursor-pointer ${
                selectedCopyTab === 'ALL'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              ALL ({activeCopies.length} COPIES)
            </button>
            {activeCopies.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCopyTab(c.header_label)}
                className={`px-2.5 py-1 text-2xs font-extrabold rounded-xs transition-all border cursor-pointer ${
                  selectedCopyTab === c.header_label
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                [{c.header_label}] {c.copy_name}
              </button>
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
        <div className="bg-slate-200/80 dark:bg-slate-900/80 p-4 rounded-xs flex flex-col items-center space-y-4 overflow-y-auto max-h-[62vh] min-h-55">
          {(selectedCopyTab === 'ALL'
            ? activeCopies
            : activeCopies.filter((c) => c.header_label === selectedCopyTab)
          ).map((copy) => {
            const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
            const badgeFontSize = copyBadge.length > 2 ? '7.5px' : '9px';
            return (
              <div
                key={copy.id}
                className="bg-white text-black rounded-xs shadow-md select-text shrink-0"
                style={{
                  width: `${ticketWidth}cm`,
                  minHeight: `${ticketHeight}cm`,
                  boxSizing: 'border-box',
                  padding: '4px 6px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '8px',
                  lineHeight: 1.1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: '#fff',
                  color: '#000',
                  border: '1px solid #000',
                }}
              >
                {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', minWidth: '14px', height: '14px', padding: '0 2px', border: '1.5px solid #000', fontWeight: 900, fontSize: badgeFontSize, borderRadius: '2px' }}>
                      {copyBadge}
                    </span>
                    <span style={{ fontWeight: 900, fontSize: '9.5px', letterSpacing: '0.2px', textTransform: 'uppercase' }}>
                      {cinema.header_text || cinema.name || ''}
                    </span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', border: '1.5px solid #000', borderRadius: '50%', fontWeight: 900, fontSize: '9px' }}>
                    {qty}
                  </div>
                </div>

                {/* Movie Title Line */}
                <div style={{ fontWeight: 800, fontSize: '9.5px', textTransform: 'uppercase', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {booking.movie_name || ''} {booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
                </div>

                {/* Middle 3-Column Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0', marginTop: '1px', fontSize: '7.5px' }}>
                  {/* Column 1: Financial & Tax Breakup */}
                  <div style={{ borderRight: '1px solid #000', paddingRight: '4px', lineHeight: 1.15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ADM</span>
                      <span style={{ fontWeight: 700 }}>{admNet}</span>
                      {is3D && <span>3D Net</span>}
                      {is3D && <span style={{ fontWeight: 700 }}>{threeDNet}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CGST</span>
                      <span style={{ fontWeight: 700 }}>{booking.total_cgst.toFixed(2)}</span>
                      {is3D && <span>3D CGST</span>}
                      {is3D && <span style={{ fontWeight: 700 }}>00.00</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>SGST</span>
                      <span style={{ fontWeight: 700 }}>{booking.total_sgst.toFixed(2)}</span>
                      {is3D && <span>3D SGST</span>}
                      {is3D && <span style={{ fontWeight: 700 }}>00.00</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>S.CH</span>
                      <span style={{ fontWeight: 700 }}>{booking.total_service_charge.toFixed(2)}</span>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '8.5px', marginTop: '1px' }}>
                      Total: {booking.total_gross.toFixed(2)}
                    </div>
                  </div>

                  {/* Column 2: Date, Showtime & SAC Code */}
                  <div style={{ borderRight: '1px solid #000', padding: '0 4px', lineHeight: 1.25 }}>
                    <div style={{ fontWeight: 800, fontSize: '8.5px' }}>{formattedDate}</div>
                    <div style={{ fontWeight: 800, fontSize: '9px', marginTop: '1px' }}>{showTimeDisplay}</div>
                    <div style={{ fontWeight: 700, fontSize: '7.5px', marginTop: '2px' }}>SAC 997321</div>
                  </div>

                  {/* Column 3: Auditorium, Seat Numbers & Class */}
                  <div style={{ paddingLeft: '4px', lineHeight: 1.2, textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '8.5px' }}>{booking.screen_name || ''}</div>
                    <div style={{ fontWeight: 900, fontSize: '9.5px', letterSpacing: '0.3px' }}>{seatLabels}</div>
                    <div style={{ fontWeight: 900, fontSize: '9px', textTransform: 'uppercase', marginTop: '1px' }}>{seatClass}</div>
                  </div>
                </div>

                {/* Footer Section: Tax IDs & Audit Tracking */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6.5px', lineHeight: 1.1, paddingTop: '1px', fontWeight: 600 }}>
                  <div>
                    {cinema.gstin && <div>GSTIN: {cinema.gstin}</div>}
                    {cinema.cin && <div>CIN: {cinema.cin}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>Ticket No: {firstTicketNo}&nbsp;&nbsp;L.No. Transaction No: {txnNo}</div>
                    <div>INV No. : {invNo}&nbsp;&nbsp;Issued on: {issuedOn}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
