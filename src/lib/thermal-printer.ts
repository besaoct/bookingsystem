import { Booking, Cinema, TicketCopyConfig, TaxConfig } from '@/types';

declare global {
  interface Window {
    electronAPI?: {
      printThermalTickets: (
        htmlContent: string,
        options?: {
          silent?: boolean;
          printerName?: string;
          widthCm?: number | string;
          heightCm?: number | string;
        }
      ) => Promise<boolean>;
      getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
      saveBackupFile: (data: Uint8Array) => Promise<boolean>;
      loadBackupFile: () => Promise<Uint8Array | null>;
      getSqlWasmBinary?: () => Promise<Uint8Array | null>;
      printDCRDocument?: (options: {
        htmlContent: string;
        orientation?: 'portrait' | 'landscape';
        pageSize?: string;
        printerName?: string;
        silent?: boolean;
      }) => Promise<boolean>;
      saveDCRPDF?: (options: {
        htmlContent: string;
        orientation?: 'portrait' | 'landscape';
        pageSize?: string;
        defaultFileName?: string;
      }) => Promise<boolean>;
      printCurrentPage: () => void;
      isElectron: boolean;
      platform: string;
      windowControls: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
      };
    };
  }
}

export interface TicketPrintData {
  cinema: Cinema;
  booking: Booking;
  copyConfigs: TicketCopyConfig[];
  taxConfig: TaxConfig;
  ticketWidthCm?: number | string;
  ticketHeightCm?: number | string;
  printerName?: string;
}

export function generateThermalTicketHTML(data: TicketPrintData): string {
  const { cinema, booking, copyConfigs } = data;
  const widthCm = data.ticketWidthCm || '10.2';
  const heightCm = data.ticketHeightCm || '3.5';

  const activeCopies = copyConfigs
    .filter((c) => c.is_enabled)
    .sort((a, b) => a.print_order - b.print_order);

  // If no copy configs enabled, fallback to 1 standard copy
  const copiesToPrint = activeCopies.length > 0 ? activeCopies : [{
    id: 1,
    copy_name: 'Customer',
    is_enabled: true,
    print_order: 1,
    header_label: 'C',
    purpose: 'Customer Entry Ticket',
  }];

  const seatsList = booking.seats || [];
  const seatLabels = seatsList.map((s) => `${s.row_name}-${s.seat_number}`).join(', ');
  const seatClass = seatsList[0]?.seat_class_name?.toUpperCase() || '';
  const qty = seatsList.length;

  const tickets = booking.tickets || [];
  const firstTicketNo = tickets[0]?.ticket_no || (booking.booking_no ? booking.booking_no.slice(-7) : '');
  const txnNo = `A${String(booking.id).padStart(6, '0')}-${firstTicketNo ? firstTicketNo.slice(-2) : '01'}W`;
  const invNo = `000${String(booking.id).padStart(6, '0')}`;

  // Date breakdown
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

  return copiesToPrint
    .map((copy) => {
      const copyBadge = copy.header_label ? copy.header_label.trim().charAt(0) : 'D';
      return `
      <div class="ticket-slip" style="width: ${widthCm}cm; height: ${heightCm}cm; max-height: ${heightCm}cm; box-sizing: border-box; padding: 4px 6px; font-family: 'Montserrat', sans-serif; font-size: 8px; line-height: 1.1; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; background: #fff; color: #000; border: 1px solid #000;">
        
        <!-- Header Top: Copy Code Badge + Cinema Name + Quantity Circle -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #000; padding-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1.5px solid #000; font-weight: 900; font-size: 9px; border-radius: 2px;">${copyBadge}</span>
            <span style="font-weight: 900; font-size: 9.5px; letter-spacing: 0.2px; text-transform: uppercase;">${cinema.header_text || cinema.name || ''}</span>
          </div>
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border: 1.5px solid #000; border-radius: 50%; font-weight: 900; font-size: 9px;">
            ${qty}
          </div>
        </div>

        <!-- Movie Title Line -->
        <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${booking.movie_name || ''} ${booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
        </div>

        <!-- Middle 3-Column Section -->
        <div style="display: grid; grid-template-columns: 1.4fr 1.1fr 1fr; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin-top: 1px; font-size: 7.5px;">
          
          <!-- Column 1: Financial & Tax Breakup -->
          <div style="border-right: 1px solid #000; padding-right: 4px; line-height: 1.15;">
            <div style="display: flex; justify-content: space-between;">
              <span>ADM</span>
              <span style="font-weight: 700;">${admNet}</span>
              ${is3D ? `<span>3D Net</span><span style="font-weight: 700;">${threeDNet}</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>CGST</span>
              <span style="font-weight: 700;">${booking.total_cgst.toFixed(2)}</span>
              ${is3D ? `<span>3D CGST</span><span style="font-weight: 700;">00.00</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>SGST</span>
              <span style="font-weight: 700;">${booking.total_sgst.toFixed(2)}</span>
              ${is3D ? `<span>3D SGST</span><span style="font-weight: 700;">00.00</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>S.CH</span>
              <span style="font-weight: 700;">${booking.total_service_charge.toFixed(2)}</span>
            </div>
            <div style="font-weight: 900; font-size: 8.5px; margin-top: 1px;">
              Total: ${booking.total_gross.toFixed(2)}
            </div>
          </div>

          <!-- Column 2: Date, Showtime & SAC Code -->
          <div style="border-right: 1px solid #000; padding: 0 4px; line-height: 1.25;">
            <div style="font-weight: 800; font-size: 8.5px;">${formattedDate}</div>
            <div style="font-weight: 800; font-size: 9px; margin-top: 1px;">${showTimeDisplay}</div>
            <div style="font-weight: 700; font-size: 7.5px; margin-top: 2px;">SAC 997321</div>
          </div>

          <!-- Column 3: Auditorium, Seat Numbers & Class -->
          <div style="padding-left: 4px; line-height: 1.2; text-align: left;">
            <div style="font-weight: 800; font-size: 8.5px;">${booking.screen_name || ''}</div>
            <div style="font-weight: 900; font-size: 9.5px; letter-spacing: 0.3px;">${seatLabels}</div>
            <div style="font-weight: 900; font-size: 9px; text-transform: uppercase; margin-top: 1px;">${seatClass}</div>
          </div>
        </div>

        <!-- Footer Section: Tax IDs and Audit Tracking -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 6.5px; line-height: 1.1; padding-top: 1px;">
          <div style="font-weight: 600;">
            ${cinema.gstin ? `<div>GSTIN: ${cinema.gstin}</div>` : ''}
            ${cinema.cin ? `<div>CIN: ${cinema.cin}</div>` : ''}
          </div>
          <div style="text-align: right; font-weight: 600;">
            <div>Ticket No: ${firstTicketNo}&nbsp;&nbsp;L.No. Transaction No: ${txnNo}</div>
            <div>INV No. : ${invNo}&nbsp;&nbsp;Issued on: ${issuedOn}</div>
          </div>
        </div>
      </div>
      `;
    })
    .join('');
}

export async function printTickets(data: TicketPrintData, silent = false): Promise<boolean> {
  const html = generateThermalTicketHTML(data);
  const widthCm = data.ticketWidthCm || '10.2';
  const heightCm = data.ticketHeightCm || '3.5';

  if (window.electronAPI) {
    return window.electronAPI.printThermalTickets(html, {
      silent,
      printerName: data.printerName,
      widthCm,
      heightCm,
    });
  } else {
    // Browser fallback
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket Print</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');
    
    * {
      box-sizing: border-box;
      font-family: 'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    @page {
      size: ${widthCm}cm ${heightCm}cm;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .ticket-slip {
      width: ${widthCm}cm;
      height: ${heightCm}cm;
      max-height: ${heightCm}cm;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      font-family: 'Montserrat', system-ui, -apple-system, sans-serif !important;
    }
    .ticket-slip:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    const triggerPrint = () => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    };

    let printed = false;
    const executePrint = () => {
      if (printed) return;
      printed = true;
      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (doc?.fonts?.ready) {
        doc.fonts.ready.then(() => {
          setTimeout(triggerPrint, 150);
        });
      } else {
        setTimeout(triggerPrint, 350);
      }
    };

    printFrame.onload = executePrint;
    printFrame.srcdoc = fullHtml;

    // Safety fallback timer if onload doesn't fire
    setTimeout(() => {
      if (!printed) {
        executePrint();
      }
    }, 1200);

    return true;
  }
}
