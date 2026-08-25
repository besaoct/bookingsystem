import React, { useState } from 'react';
import { Booking, Cinema, TicketCopyConfig, TaxConfig } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle, RefreshCw, Copy, FileText } from 'lucide-react';
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
  const seatClass = seatsList[0]?.seat_class_name?.toUpperCase() || 'STANDARD';
  const qty = seatsList.length;
  const tickets = booking.tickets || [];
  const firstTicketNo = tickets[0]?.ticket_no || booking.booking_no.slice(-7);
  const txnNo = `A${String(booking.id).padStart(6, '0')}-${firstTicketNo.slice(-2)}W`;
  const invNo = `000${String(booking.id).padStart(6, '0')}`;

  const bookingDateObj = new Date(booking.booking_date || new Date());
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[bookingDateObj.getDay()] || 'Tue';
  const dStr = String(bookingDateObj.getDate()).padStart(2, '0');
  const mStr = String(bookingDateObj.getMonth() + 1).padStart(2, '0');
  const yStr = bookingDateObj.getFullYear();
  const formattedDate = `${dayName}, ${dStr}-${mStr}-${yStr}`;

  const is3D = Boolean(booking.movie_type_name?.toUpperCase().includes('3D') || booking.movie_name?.toUpperCase().includes('3D'));
  const threeDNet = is3D ? (40.00 * qty).toFixed(2) : '00.00';
  const admNet = is3D ? Math.max(0, booking.total_net - Number(threeDNet)).toFixed(2) : booking.total_net.toFixed(2);

  const showPrefix = (booking.show_name || 'Mor').slice(0, 3);
  const showTimeDisplay = `${showPrefix}, ${booking.start_time || '11:30 AM'}`;
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
              className={`px-2.5 py-1 text-2xs font-extrabold rounded-xs transition-colors cursor-pointer ${
                selectedCopyTab === 'ALL'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              ALL ({activeCopies.length} COPIES)
            </button>
            {activeCopies.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCopyTab(c.header_label)}
                className={`px-2.5 py-1 text-2xs font-extrabold rounded-xs transition-colors cursor-pointer ${
                  selectedCopyTab === c.header_label
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-xs'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
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
              onClick={() => handlePrint(false)}
              disabled={isPrinting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              {isPrinting ? 'Printing...' : 'PRINT TICKETS (F9)'}
            </Button>
          </div>
        </div>

        {/* Visual Thermal Slips Container */}
        <div className="bg-slate-200/80 dark:bg-slate-900/80 p-4 rounded-xs flex flex-col items-center space-y-4 overflow-y-auto max-h-[55vh]">
          {(selectedCopyTab === 'ALL'
            ? activeCopies
            : activeCopies.filter((c) => c.header_label === selectedCopyTab)
          ).map((copy) => {
            const copyBadge = copy.header_label ? copy.header_label.trim().charAt(0) : 'D';
            return (
              <div
                key={copy.id}
                className="bg-white text-black rounded-xs border border-black shadow-md p-2 flex flex-col justify-between select-text"
                style={{ width: `${ticketWidth}cm`, height: `${ticketHeight}cm`, boxSizing: 'border-box' }}
              >
                {/* Header Top: Copy Badge + Cinema Name + Quantity Circle */}
                <div className="flex justify-between items-center border-b border-black pb-0.5">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 border border-black font-black text-[9px] rounded-xs">
                      {copyBadge}
                    </span>
                    <span className="font-black text-[9.5px] uppercase tracking-wider">
                      {cinema.header_text || cinema.name}
                    </span>
                  </div>
                  <div className="inline-flex items-center justify-center w-4 h-4 border border-black rounded-full font-black text-[9px]">
                    {qty}
                  </div>
                </div>

                {/* Movie Title Line */}
                <div className="font-extrabold text-[9.5px] uppercase truncate pl-4">
                  {booking.movie_name || 'SPIDER-MAN : BRAND NEW DAY 3D'} {booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
                </div>

                {/* Middle 3-Column Section */}
                <div className="grid grid-cols-3 border-t border-b border-black py-0.5 text-[7.5px] leading-tight">
                  {/* Column 1: Financial & Tax Breakup */}
                  <div className="border-r border-black pr-1.5 space-y-0.2">
                    <div className="flex justify-between">
                      <span>ADM</span>
                      <span className="font-bold">{admNet}</span>
                      {is3D && <span>3D Net</span>}
                      {is3D && <span className="font-bold">{threeDNet}</span>}
                    </div>
                    <div className="flex justify-between">
                      <span>CGST</span>
                      <span className="font-bold">{booking.total_cgst.toFixed(2)}</span>
                      {is3D && <span>3D CGST</span>}
                      {is3D && <span className="font-bold">00.00</span>}
                    </div>
                    <div className="flex justify-between">
                      <span>SGST</span>
                      <span className="font-bold">{booking.total_sgst.toFixed(2)}</span>
                      {is3D && <span>3D SGST</span>}
                      {is3D && <span className="font-bold">00.00</span>}
                    </div>
                    <div className="flex justify-between">
                      <span>S.CH</span>
                      <span className="font-bold">{booking.total_service_charge.toFixed(2)}</span>
                    </div>
                    <div className="font-black text-[8px] pt-0.5">
                      Total: {booking.total_gross.toFixed(2)}
                    </div>
                  </div>

                  {/* Column 2: Date, Showtime & SAC Code */}
                  <div className="border-r border-black px-1.5 space-y-0.5">
                    <div className="font-bold text-[8px]">{formattedDate}</div>
                    <div className="font-bold text-[8.5px]">{showTimeDisplay}</div>
                    <div className="font-semibold text-[7px] text-neutral-800">SAC 997321</div>
                  </div>

                  {/* Column 3: Auditorium, Seat Numbers & Class */}
                  <div className="pl-1.5 space-y-0.5">
                    <div className="font-bold text-[8px]">{booking.screen_name || 'Audi 1'}</div>
                    <div className="font-black text-[9px]">{seatLabels}</div>
                    <div className="font-black text-[8.5px] uppercase">{seatClass}</div>
                  </div>
                </div>

                {/* Footer Section: Tax IDs & Audit Tracking */}
                <div className="flex justify-between items-end text-[6.5px] leading-tight pt-0.5 font-medium">
                  <div>
                    <div>GSTIN: {cinema.gstin || '18AJVPD0031E3Z1'}</div>
                    <div>CIN: {cinema.cin || '0'}</div>
                  </div>
                  <div className="text-right">
                    <div>Ticket No: {firstTicketNo} &nbsp; L.No. Transaction No: {txnNo}</div>
                    <div>INV No. : {invNo} &nbsp; Issued on: {issuedOn}</div>
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
