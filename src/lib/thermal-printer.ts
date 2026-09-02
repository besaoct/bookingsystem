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
          orientation?: 'portrait' | 'landscape';
          marginMm?: number | string;
          fontScale?: number | string;
          fontFamily?: string;
          fontSizePt?: number | string;
          fontWeight?: string;
          autoCut?: boolean;
          feedLines?: number;
          layoutMode?: 'side-by-side' | 'vertical-continuous' | 'sequential';
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
      getMachineId?: () => Promise<string>;
      loadLicenseFile?: () => Promise<string | null>;
      saveLicenseFile?: (defaultName: string, content: string) => Promise<boolean>;
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
  invoiceSeries?: string;
  orientation?: 'portrait' | 'landscape';
  marginMm?: number | string;
  fontScale?: number | string;
  fontFamily?: string;
  fontSizePt?: number | string;
  fontWeight?: string;
  autoCut?: boolean;
  feedLines?: number;
  layoutMode?: 'side-by-side' | 'vertical-continuous' | 'sequential';
}

export const OFFLINE_FONT_MAP: Record<string, string> = {
  'system-sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'arial': 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  'verdana': 'Verdana, Geneva, sans-serif',
  'tahoma': 'Tahoma, Verdana, Segoe, sans-serif',
  'trebuchet': '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
  'consolas': 'Consolas, "Courier New", "Lucida Console", Monaco, monospace',
  'courier': '"Courier New", Courier, monospace',
  'impact': 'Impact, "Arial Black", sans-serif',
};

export function generateThermalTicketHTML(data: TicketPrintData): string {
  const { cinema, booking, copyConfigs, invoiceSeries } = data;
  const widthCm = data.ticketWidthCm || '10.2';
  const heightCm = data.ticketHeightCm || '3.5';
  const layoutMode = data.layoutMode || 'side-by-side';

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
  const invSeq = `000${String(booking.id).padStart(6, '0')}`;
  const invNo = invoiceSeries ? `${invoiceSeries}/${invSeq}` : invSeq;

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

  const slipsHtml = copiesToPrint
    .map((copy, idx) => {
      const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
      const badgeFontSize = copyBadge.length > 2 ? '7px' : '9px';
      const slipWidthStyle =
        layoutMode === 'side-by-side'
          ? `width: ${widthCm}cm; min-width: ${widthCm}cm; min-height: ${heightCm}cm; height: ${heightCm}cm; page-break-after: avoid; border: 1px solid #000; border-left: ${idx > 0 ? '1.5px dashed #000' : '1px solid #000'};`
          : layoutMode === 'vertical-continuous'
          ? `width: ${widthCm}cm; min-height: ${heightCm}cm; height: ${heightCm}cm; page-break-after: avoid; page-break-inside: avoid; border: 1px solid #000; border-top: ${idx > 0 ? '1.5px dashed #000' : '1px solid #000'};`
          : `width: ${widthCm}cm; min-height: ${heightCm}cm; height: ${heightCm}cm; page-break-after: always; border: 1px solid #000;`;

      return `
      <div class="ticket-slip" style="${slipWidthStyle} box-sizing: border-box; padding: 4px 5px; font-family: inherit; font-size: 8px; line-height: 1.1; display: flex; flex-direction: column; justify-content: space-between; background: #fff; color: #000;">
        
        <!-- Header Top: Copy Code Badge + Cinema Name + Quantity Circle -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #000; padding-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 3px; min-width: 0; overflow: hidden;">
            <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 14px; height: 14px; padding: 0 2px; border: 1.5px solid #000; font-weight: 900; font-size: ${badgeFontSize}; border-radius: 2px; shrink: 0;">${copyBadge}</span>
            <span style="font-weight: 900; font-size: 9px; letter-spacing: 0.1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cinema.header_text || cinema.name || ''}</span>
          </div>
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; border: 1.5px solid #000; border-radius: 50%; font-weight: 900; font-size: 8.5px; shrink: 0; margin-left: 2px;">
            ${qty}
          </div>
        </div>

        <!-- Movie Title Line -->
        <div style="font-weight: 800; font-size: 9px; text-transform: uppercase; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${booking.movie_name || ''} ${booking.movie_type_name && !booking.movie_name?.includes(booking.movie_type_name) ? booking.movie_type_name : ''}
        </div>

        <!-- Middle 3-Column Section -->
        <div style="display: grid; grid-template-columns: 1.35fr 1.15fr 1fr; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin-top: 1px; font-size: 7.5px;">
          
          <!-- Column 1: Financial & Tax Breakup -->
          <div style="border-right: 1px solid #000; padding-right: 3px; line-height: 1.15;">
            <div style="display: flex; justify-content: space-between;">
              <span>ADM</span>
              <span style="font-weight: 700;">${admNet}</span>
              ${is3D ? `<span>3D</span><span style="font-weight: 700;">${threeDNet}</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>CGST</span>
              <span style="font-weight: 700;">${booking.total_cgst.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>SGST</span>
              <span style="font-weight: 700;">${booking.total_sgst.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>S.CH</span>
              <span style="font-weight: 700;">${booking.total_service_charge.toFixed(2)}</span>
            </div>
            <div style="font-weight: 900; font-size: 8px; margin-top: 1px;">
              Total: ${booking.total_gross.toFixed(2)}
            </div>
          </div>

          <!-- Column 2: Date, Showtime & SAC Code -->
          <div style="border-right: 1px solid #000; padding: 0 3px; line-height: 1.2;">
            <div style="font-weight: 800; font-size: 8px; white-space: nowrap;">${formattedDate}</div>
            <div style="font-weight: 800; font-size: 8.5px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${showTimeDisplay}</div>
            <div style="font-weight: 700; font-size: 7px; margin-top: 1px;">SAC 997321</div>
          </div>

          <!-- Column 3: Auditorium, Seat Numbers & Class -->
          <div style="padding-left: 3px; line-height: 1.2; text-align: left; overflow: hidden;">
            <div style="font-weight: 800; font-size: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${booking.screen_name || ''}</div>
            <div style="font-weight: 900; font-size: 9px; letter-spacing: 0.2px; word-break: break-word;">${seatLabels}</div>
            <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${seatClass}</div>
          </div>
        </div>

        <!-- Footer Section: Tax IDs and Audit Tracking -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 6px; line-height: 1.1; padding-top: 1px;">
          <div style="font-weight: 600;">
            ${cinema.show_gstin_on_ticket && cinema.gstin ? `<div>GSTIN: ${cinema.gstin}</div>` : ''}
            ${cinema.cin ? `<div>CIN: ${cinema.cin}</div>` : ''}
          </div>
          <div style="text-align: right; font-weight: 600; white-space: nowrap;">
            <div>Tkt: ${firstTicketNo}&nbsp;&nbsp;Txn: ${txnNo}</div>
            <div>INV: ${invNo}&nbsp;&nbsp;${issuedOn}</div>
          </div>
        </div>
      </div>
      `;
    })
    .join('');

  if (layoutMode === 'side-by-side') {
    return `
    <div class="ticket-page-grid" style="display: flex; flex-direction: row; width: fit-content; background: #fff;">
      ${slipsHtml}
    </div>
    `;
  } else if (layoutMode === 'vertical-continuous') {
    return `
    <div class="ticket-vertical-strip" style="display: flex; flex-direction: column; width: ${widthCm}cm; background: #fff;">
      ${slipsHtml}
    </div>
    `;
  }

  return slipsHtml;
}

export async function printTickets(data: TicketPrintData, silent = false): Promise<boolean> {
  const html = generateThermalTicketHTML(data);
  const widthCm = data.ticketWidthCm || '10.2';
  const heightCm = data.ticketHeightCm || '3.5';
  const orientation = data.orientation || 'landscape';
  const marginMm = data.marginMm !== undefined ? data.marginMm : 2;
  const fontScale = data.fontScale !== undefined ? data.fontScale : 100;
  const fontFamily = data.fontFamily || 'system-sans';
  const fontSizePt = data.fontSizePt !== undefined ? data.fontSizePt : 8.0;
  const fontWeight = data.fontWeight || '600';
  const autoCut = data.autoCut !== false;
  const feedLines = data.feedLines || 0;
  const layoutMode = data.layoutMode || 'side-by-side';

  const resolvedFontFamily =
    OFFLINE_FONT_MAP[fontFamily] ||
    fontFamily ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const effectiveFontSize = ((Number(fontSizePt) * Number(fontScale)) / 100).toFixed(1);

  if (window.electronAPI) {
    return window.electronAPI.printThermalTickets(html, {
      silent,
      printerName: data.printerName,
      widthCm,
      heightCm,
      orientation,
      marginMm,
      fontScale,
      fontFamily,
      fontSizePt,
      fontWeight,
      autoCut,
      feedLines,
      layoutMode,
    });
  }

  // Browser fallback (100% offline)
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
  <style>
    * {
      box-sizing: border-box;
      font-family: ${resolvedFontFamily} !important;
      -webkit-font-smoothing: antialiased;
    }
    @page {
      size: ${widthCm}cm ${heightCm}cm ${orientation};
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-size: ${effectiveFontSize}pt;
      font-weight: ${fontWeight};
      font-family: ${resolvedFontFamily} !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket-page-grid {
      width: 100%;
      max-width: ${widthCm}cm;
      min-height: ${heightCm}cm;
      height: ${heightCm}cm;
      box-sizing: border-box;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: auto;
      break-after: auto;
      padding: ${marginMm}mm;
    }
    .ticket-page-grid .ticket-slip {
      width: 100% !important;
      min-height: auto !important;
      height: 100% !important;
      box-sizing: border-box;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .ticket-slip {
      width: ${widthCm}cm;
      min-height: ${heightCm}cm;
      padding: ${marginMm}mm;
      box-sizing: border-box;
      ${autoCut && layoutMode === 'sequential' ? 'page-break-after: always; break-after: page;' : ''}
      page-break-inside: avoid;
      break-inside: avoid;
      font-family: ${resolvedFontFamily} !important;
      font-weight: ${fontWeight};
      overflow: hidden;
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
