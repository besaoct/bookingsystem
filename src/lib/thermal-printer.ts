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
          rotation?: '0' | '90' | '180' | '270' | number;
          marginMm?: number | string;
          fontScale?: number | string;
          fontFamily?: string;
          fontSizePt?: number | string;
          fontWeight?: string;
          autoCut?: boolean;
          feedLines?: number;
          layoutMode?: 'side-by-side' | 'side-by-side-x' | 'side-by-side-y' | 'vertical-continuous' | 'sequential';
          copiesCount?: number;
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
  rotation?: '0' | '90' | '180' | '270' | number;
  marginMm?: number | string;
  fontScale?: number | string;
  fontFamily?: string;
  fontSizePt?: number | string;
  fontWeight?: string;
  autoCut?: boolean;
  feedLines?: number;
  layoutMode?: 'side-by-side' | 'side-by-side-x' | 'side-by-side-y' | 'vertical-continuous' | 'sequential';
}

/**
 * Font stacks quote family names with SINGLE quotes on purpose: these strings are interpolated into
 * HTML `style="..."` attributes, where a double quote would close the attribute early and silently
 * drop every declaration after it. Single quotes are equally valid CSS and safe in every consumer
 * (HTML attribute, <style> block, and React style objects).
 */
export const OFFLINE_FONT_MAP: Record<string, string> = {
  'system-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  'arial': "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  'verdana': 'Verdana, Geneva, sans-serif',
  'tahoma': 'Tahoma, Verdana, Segoe, sans-serif',
  'trebuchet': "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif",
  'consolas': "Consolas, 'Courier New', 'Lucida Console', Monaco, monospace",
  'courier': "'Courier New', Courier, monospace",
  'impact': "Impact, 'Arial Black', sans-serif",
};

/** Single source of truth for the ticket stock. Default continuous 3-part roll liner is 10.2 cm across x 10.2 cm feed. */
export const DEFAULT_TICKET_WIDTH_CM = 10.2;
export const DEFAULT_TICKET_HEIGHT_CM = 10.2;

/**
 * Resolves the configured ticket dimensions to positive numbers in cm.
 *
 * Every consumer - the generated HTML, the IPC print options, the print page box and both previews -
 * must resolve them through here, so the paper, the page box and the preview can never disagree.
 * An empty, non-numeric or non-positive setting falls back to the default stock.
 */
export function resolveTicketDimensions(input: {
  ticketWidthCm?: number | string;
  ticketHeightCm?: number | string;
}): { widthCm: number; heightCm: number } {
  const w = Number(input.ticketWidthCm);
  const h = Number(input.ticketHeightCm);
  return {
    widthCm: Number.isFinite(w) && w > 0 ? w : DEFAULT_TICKET_WIDTH_CM,
    heightCm: Number.isFinite(h) && h > 0 ? h : DEFAULT_TICKET_HEIGHT_CM,
  };
}

/** Escapes a value for safe interpolation into ticket HTML (cinema/movie/screen names are user data). */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Scales each ticket's content to fit inside the configured stock dimensions.
 *
 * A slip is a fixed frame at exactly the width x height set in Printer Settings. Its content is laid
 * out at the configured font size and then reduced uniformly — as a photographic reduction, so text,
 * rules and spacing all shrink together — until it fits inside that frame on both axes. Content that
 * already fits is left at scale 1, exactly as configured.
 *
 * The trick is to give the wrapper a logical box of frame/scale and then scale it by that factor:
 * `justify-content: space-between` then still distributes the blocks across the full frame, and no
 * block can be squeezed out of existence the way a shrink-to-fit flex layout would do.
 *
 * Deliberately self-contained — it is serialised with `toString()` and injected into the print
 * document, so it must not reference anything outside its own body.
 */
export function fitTicketContent(root: Document | HTMLElement | null, minScale = 0.4): void {
  try {
    if (!root) return;
    var boxes = root.querySelectorAll('[data-ticket-box]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i] as HTMLElement;
      var content = box.querySelector('[data-ticket-scale]') as HTMLElement | null;
      if (!content) continue;
      const contentEl: HTMLElement = content;

      var cs = window.getComputedStyle(box);
      var frameW =
        box.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      var frameH =
        box.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0');
      if (!(frameW > 0) || !(frameH > 0)) continue;

      var apply = function (scale: number) {
        if (scale >= 1) {
          contentEl.style.width = '100%';
          contentEl.style.height = '100%';
          contentEl.style.transform = '';
        } else {
          contentEl.style.width = frameW / scale + 'px';
          contentEl.style.height = frameH / scale + 'px';
          contentEl.style.transform = 'scale(' + scale + ')';
        }
      };
      var fits = function () {
        return (
          contentEl.scrollHeight <= contentEl.clientHeight + 0.5 &&
          contentEl.scrollWidth <= contentEl.clientWidth + 0.5
        );
      };

      apply(1);
      if (fits()) continue;

      var low = minScale;
      var high = 1;
      var best = minScale;
      for (var step = 0; step < 14; step++) {
        var mid = (low + high) / 2;
        apply(mid);
        if (fits()) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }
      apply(best);
    }
  } catch (e) {
    // Never let a fit failure stop a ticket from printing.
  }
}

/**
 * The auto-fit, wrapped as a <script> that rides along with the printed HTML so the Electron print
 * window and the browser-print iframe both fit exactly the way the on-screen preview does.
 */
function ticketAutoFitScriptTag(): string {
  return '';
}

/**
 * Formats a list of booking seats into clean, compact seat label strings.
 * Sequential seats are formatted with ranges:
 * - Same row sequence: e.g. A-1, A-2, A-3, A-4 -> "A-1 to A-4"
 * - Cross-row sequence: e.g. A-3, A-4, B-1, B-2, B-3, B-4, B-5 -> "A-3 to B-5"
 * - Non-sequential or mixed: e.g. A-1, A-3, B-1 to B-4
 */
export function formatSeatRanges(
  seats?: Array<{ row_name?: string; seat_number?: number | string; seat_id?: number }> | null
): string {
  if (!seats || seats.length === 0) return '';
  if (seats.length === 1) {
    const s = seats[0];
    return `${s.row_name || ''}-${s.seat_number || ''}`.replace(/^-|-$/, '');
  }

  interface ParsedSeat {
    rowName: string;
    seatNum: number;
    seatId?: number;
  }

  const parsed: ParsedSeat[] = seats.map((s) => {
    const rowName = (s.row_name || '').trim().toUpperCase();
    const seatNum = typeof s.seat_number === 'number' ? s.seat_number : parseInt(String(s.seat_number || 0), 10) || 0;
    return {
      rowName,
      seatNum,
      seatId: s.seat_id,
    };
  });

  // Sort by row name (alphabetical/natural) then by seat number
  parsed.sort((a, b) => {
    const rowCmp = a.rowName.localeCompare(b.rowName, undefined, { numeric: true });
    if (rowCmp !== 0) return rowCmp;
    return a.seatNum - b.seatNum;
  });

  const isNextRow = (r1: string, r2: string): boolean => {
    if (!r1 || !r2) return false;
    if (r1.length === 1 && r2.length === 1) {
      return r2.charCodeAt(0) === r1.charCodeAt(0) + 1;
    }
    return false;
  };

  const blocks: ParsedSeat[][] = [];
  let currentBlock: ParsedSeat[] = [parsed[0]];

  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1];
    const curr = parsed[i];

    // 1. Same row & consecutive seat number
    const isSameRowContiguous = prev.rowName === curr.rowName && prev.seatNum + 1 === curr.seatNum;

    // 2. Cross-row contiguous: either consecutive seat_id, OR adjacent row with curr starting at 1
    const isCrossRowContiguous =
      Boolean(prev.seatId && curr.seatId && curr.seatId === prev.seatId + 1) ||
      (isNextRow(prev.rowName, curr.rowName) && curr.seatNum === 1);

    if (isSameRowContiguous || isCrossRowContiguous) {
      currentBlock.push(curr);
    } else {
      blocks.push(currentBlock);
      currentBlock = [curr];
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const blockStrings = blocks.map((block) => {
    if (block.length === 1) {
      return `${block[0].rowName}-${block[0].seatNum}`;
    }
    if (block.length === 2) {
      return `${block[0].rowName}-${block[0].seatNum}, ${block[1].rowName}-${block[1].seatNum}`;
    }
    const start = `${block[0].rowName}-${block[0].seatNum}`;
    const end = `${block[block.length - 1].rowName}-${block[block.length - 1].seatNum}`;
    return `${start} to ${end}`;
  });

  return blockStrings.join(', ');
}

/**
 * Calculates a dynamically scaled font size for seat numbers
 * so that single/few seats remain crisp and prominent,
 * while large/many seat bookings automatically scale down.
 */
export function getSeatFontSize(seatLabels: string, seatCount: number = 1): string {
  const len = seatLabels.length;
  if (len > 36 || seatCount > 10) return '0.75em';
  if (len > 26 || seatCount > 7) return '0.84em';
  if (len > 18 || seatCount > 4) return '0.96em';
  if (len > 12 || seatCount > 2) return '1.05em';
  return '1.14em'; // crisp, prominent, slightly smaller than the previous 1.22em
}

export function generateThermalTicketHTML(data: TicketPrintData): string {
  const { cinema, booking, copyConfigs, invoiceSeries } = data;
  const sacCode = cinema?.sac_code || data.taxConfig?.sac_code || '999615';
  const { widthCm, heightCm } = resolveTicketDimensions(data);
  const layoutMode = data.layoutMode || 'side-by-side-x';
  const rotation = data.rotation || '0';
  const rotationDeg = Number(rotation) || 0;

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
  const seatLabels = formatSeatRanges(seatsList);
  const seatFontSize = getSeatFontSize(seatLabels, seatsList.length);
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

  let showPeriod = '';
  let showTime = booking.start_time || '';
  if (booking.show_name && booking.show_name.trim()) {
    const cleanName = booking.show_name.trim();
    const isTimeString = /^\d{1,2}:\d{2}/.test(cleanName);
    if (!isTimeString) {
      showPeriod = cleanName.replace(/,\s*$/, '');
    } else if (!booking.start_time) {
      showTime = cleanName;
    }
  }
  if (!showPeriod && showTime && /^(morning|matinee|first|second|night|evening|noon|late|early)[,\s]/i.test(showTime)) {
    const parts = showTime.split(/[,\s]+(?=\d{1,2}:\d{2})/i);
    if (parts.length === 2) {
      showPeriod = parts[0].trim();
      showTime = parts[1].trim();
    }
  }
  const now = new Date();
  const issuedOn = `${dStr}-${bookingDateObj.toLocaleString('en-US', { month: 'short' })}-${String(yStr).slice(-2)} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

  const baseWeight = Number(data.fontWeight) || 600;
  const boldWeight = Math.min(900, baseWeight + 200);
  const semiWeight = Math.min(900, baseWeight + 100);
  const normalWeight = baseWeight;

  const isSideBySideX = layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x';
  const isSideBySideY = layoutMode === 'side-by-side-y';
  const isContinuous = layoutMode === 'vertical-continuous';

  const baseFontSize = isSideBySideY
    ? (data.fontSizePt ? Math.min(Number(data.fontSizePt), 7.5) : 7.2)
    : (Number(data.fontSizePt) || 8.0);
  const fontScale = Number(data.fontScale) || 100;
  const effectiveFontSizePt = ((baseFontSize * fontScale) / 100).toFixed(1);

  const fontFamilyKey = data.fontFamily || 'system-sans';
  const resolvedFontFamily =
    OFFLINE_FONT_MAP[fontFamilyKey] ||
    fontFamilyKey ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const marginMm = data.marginMm !== undefined ? Number(data.marginMm) : 1.5;
  const padV = isSideBySideY ? 0.7 : Math.max(1, Math.min(marginMm, 3));
  const padH = isSideBySideY ? 2.0 : Math.max(2, Math.min(marginMm * 1.5, 5));

  const rawMovieName = booking.movie_name || (booking as any).movieTitle || '';
  const rawMovieType = booking.movie_type_name || '';
  const displayMovieTitle = rawMovieName ? rawMovieName.trim().toUpperCase() : 'CINEMA MOVIE';
  const displayMovieType = rawMovieType ? rawMovieType.trim().toUpperCase() : '';
  const fullMovieName = displayMovieType && !displayMovieTitle.includes(displayMovieType)
    ? `${displayMovieTitle} ${displayMovieType}`
    : displayMovieTitle;

  // Standard continuous roll stock has 3 fixed parts/columns (e.g. 10.2 cm / 3 = 3.4 cm each).
  // Ticket width and height are fixed to 1 part so single-ticket prints never stretch across the roll.
  const TOTAL_ROLL_PARTS_X = 3;
  const effectivePartsX = isSideBySideX ? Math.max(TOTAL_ROLL_PARTS_X, copiesToPrint.length) : 1;
  const blockWidthCm = isSideBySideX
    ? Number((Number(widthCm) / effectivePartsX).toFixed(4))
    : Number(widthCm);

  const TOTAL_ROLL_PARTS_Y = 3;
  const effectivePartsY = isSideBySideY ? Math.max(TOTAL_ROLL_PARTS_Y, copiesToPrint.length) : 1;
  const blockHeightCm = isSideBySideY
    ? Number((Number(heightCm) / effectivePartsY).toFixed(4))
    : Number(heightCm);

  // In side-by-side-y, each ticket is horizontal (blockWidthCm > blockHeightCm). It must NOT be rotated.
  // In side-by-side-x, each ticket is vertical (blockHeightCm > blockWidthCm). It is rotated 90deg.
  const isVertical =
    isSideBySideX
      ? true
      : isSideBySideY
      ? false
      : (data.orientation === 'portrait' && Number(blockHeightCm) > Number(blockWidthCm));

  // If autoCut is unchecked, do not print borders or dashed cut lines because the paper roll already has pre-perforated lines
  const showCutLines = data.autoCut === true;

  const slipsHtml = copiesToPrint
    .map((copy, idx) => {
      const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
      const badgeFontSize = copyBadge.length > 2 ? '7.5px' : '9px';

      const slipWidthStyle = isSideBySideX
        ? `width: ${blockWidthCm}cm; min-width: ${blockWidthCm}cm; max-width: ${blockWidthCm}cm; height: ${blockHeightCm}cm; min-height: ${blockHeightCm}cm; max-height: ${blockHeightCm}cm; flex-shrink: 0; page-break-after: avoid; page-break-inside: avoid; border: none; ${showCutLines && idx > 0 ? 'border-left: 1.5px dashed #000;' : ''}`
        : isSideBySideY || isContinuous
        ? `width: ${blockWidthCm}cm; min-width: ${blockWidthCm}cm; max-width: ${blockWidthCm}cm; height: ${blockHeightCm}cm; min-height: ${blockHeightCm}cm; max-height: ${blockHeightCm}cm; flex-shrink: 0; page-break-after: avoid; page-break-inside: avoid; border: none; ${showCutLines && idx > 0 ? 'border-top: 1.5px dashed #000;' : ''}`
        : `width: ${blockWidthCm}cm; min-width: ${blockWidthCm}cm; max-width: ${blockWidthCm}cm; height: ${blockHeightCm}cm; min-height: ${blockHeightCm}cm; max-height: ${blockHeightCm}cm; flex-shrink: 0; border: none; ${showCutLines ? 'page-break-after: always;' : ''}`;

      // Landscape content — used for landscape slips directly, rotated 90° inside portrait slips
      const contentHtml = `
        <!-- Header Top: Copy Code Badge + Cinema Name + Quantity Circle -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000; padding-bottom: 1px; min-width: 0; flex-shrink: 0 !important;">
          <div style="display: flex; align-items: center; gap: 0.3em; min-width: 0; overflow: hidden; flex: 1;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em; border: 1.5px solid #000; font-weight: ${boldWeight}; font-size: ${badgeFontSize}; border-radius: 2px; flex-shrink: 0;">${esc(copyBadge)}</span>
            <span style="font-weight: ${boldWeight}; font-size: 1.1em; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.1; word-break: break-word;">${esc(cinema.header_text || cinema.name)}</span>
          </div>
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 1.6em; height: 1.6em; border: 1.5px solid #000; border-radius: 50%; font-weight: ${boldWeight}; font-size: 1.0em; flex-shrink: 0; margin-left: 0.2em;">
            ${qty}
          </div>
        </div>

        <!-- Movie Title Line -->
        <div style="font-weight: ${semiWeight}; font-size: 1.05em; text-transform: uppercase; margin: 0.5px 0; line-height: 1.15; min-height: 1.15em; flex-shrink: 0 !important; word-break: break-word;">
          ${esc(fullMovieName)}
        </div>

        <!-- Middle 3-Column Section -->
        <div style="display: grid; grid-template-columns: 1.35fr 1.15fr 1fr; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 0; font-size: 0.88em; line-height: 1.10; flex-shrink: 0 !important;">
          
          <!-- Column 1: Financial & Tax Breakup -->
          <div style="border-right: 1px solid #000; padding-right: 0.3em; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 0.80em; line-height: 1.05;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: ${normalWeight};">ADM</span>
                <span style="font-weight: ${semiWeight};">${admNet}</span>
              </div>
              ${is3D ? `<div style="display: flex; justify-content: space-between;"><span style="font-weight: ${normalWeight};">3D</span><span style="font-weight: ${semiWeight};">${threeDNet}</span></div>` : ''}
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: ${normalWeight};">CGST</span>
                <span style="font-weight: ${semiWeight};">${booking.total_cgst.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: ${normalWeight};">SGST</span>
                <span style="font-weight: ${semiWeight};">${booking.total_sgst.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: ${normalWeight};">S.CH</span>
                <span style="font-weight: ${semiWeight};">${booking.total_service_charge.toFixed(2)}</span>
              </div>
            </div>
            <div style="font-weight: ${boldWeight}; font-size: 1.25em; margin-top: 1px; border-top: 0.5px solid #000; white-space: nowrap;">
              Total: ${booking.total_gross.toFixed(2)}
            </div>
          </div>

          <!-- Column 2: Date, Showtime & SAC Code -->
          <div style="border-right: 1px solid #000; padding: 0 0.3em; line-height: 1.15; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-weight: ${boldWeight}; font-size: 1.12em; line-height: 1.12; word-break: break-word;">${esc(formattedDate)}</div>
              <div style="margin-top: 1px; line-height: 1.15; word-break: break-word;">
                ${showPeriod ? `<span style="font-weight: ${semiWeight}; font-size: 0.82em; text-transform: capitalize;">${esc(showPeriod)}, </span>` : ''}
                <span style="font-weight: ${boldWeight}; font-size: 1.22em; white-space: nowrap;">${esc(showTime)}</span>
              </div>
            </div>
            <div style="font-weight: ${semiWeight}; font-size: 0.80em; margin-top: 1px; white-space: nowrap;">SAC ${esc(sacCode)}</div>
          </div>

          <!-- Column 3: Auditorium, Seat Numbers & Class -->
          <div style="padding-left: 0.3em; line-height: 1.15; text-align: left; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-weight: ${boldWeight}; font-size: 1.20em; text-transform: uppercase; line-height: 1.12; word-break: break-word;">${esc(booking.screen_name)}</div>
              <div style="font-weight: ${boldWeight}; font-size: ${seatFontSize}; letter-spacing: 0.02em; line-height: 1.12; word-break: break-word;">${esc(seatLabels)}</div>
            </div>
            <div style="font-weight: ${boldWeight}; font-size: 1.10em; text-transform: uppercase; margin-top: 1px; line-height: 1.12; word-break: break-word;">${esc(seatClass)}</div>
          </div>
        </div>

        <!-- Footer Section: Tax IDs and Audit Tracking -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.74em; line-height: 1.08; padding-top: 0.5px; font-weight: ${normalWeight}; flex-shrink: 0 !important;">
          <div style="max-width: 50%; line-height: 1.1; word-break: break-all;">
            ${cinema.show_gstin_on_ticket && cinema.gstin ? `<div>GSTIN: ${esc(cinema.gstin)}</div>` : ''}
            ${cinema.cin ? `<div>CIN: ${esc(cinema.cin)}</div>` : ''}
          </div>
          <div style="text-align: right; line-height: 1.1; word-break: break-word;">
            <div>Ticket No: ${esc(firstTicketNo)}&nbsp;&nbsp;L.No. Txn: ${esc(txnNo)}</div>
            <div>INV No. : ${esc(invNo)}&nbsp;&nbsp;${esc(issuedOn)}</div>
          </div>
        </div>
        `;

      // For portrait/vertical slips (Side-by-Side X): rotate content 90° so text reads along the long edge
      if (isVertical) {
        const wCm = blockWidthCm;
        const hCm = blockHeightCm;
        return `
        <div class="ticket-slip" style="${slipWidthStyle} box-sizing: border-box; padding: 0; font-family: ${resolvedFontFamily} !important; font-size: ${effectiveFontSizePt}pt; font-weight: ${normalWeight}; line-height: 1.15; background: #fff; color: #000; position: relative; overflow: hidden; clip-path: inset(0);">
          <div style="position: absolute; left: 0; top: 0; width: ${hCm}cm; height: ${wCm}cm; transform: translate(0, ${hCm}cm) rotate(-90deg); transform-origin: 0 0; padding: ${padV}mm ${padH}mm; box-sizing: border-box; font-family: ${resolvedFontFamily} !important; font-size: ${effectiveFontSizePt}pt; font-weight: ${normalWeight}; overflow: hidden;">
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid #000; border-radius: 2px; padding: 1mm 1.5mm; box-sizing: border-box;">
              ${contentHtml}
            </div>
          </div>
        </div>
        `;
      }

      // Horizontal slips (Side-by-Side Y): printed directly left-to-right without rotation
      return `
      <div class="ticket-slip" style="${slipWidthStyle} box-sizing: border-box; padding: ${padV}mm ${padH}mm; font-family: ${resolvedFontFamily} !important; font-size: ${effectiveFontSizePt}pt; font-weight: ${normalWeight}; line-height: 1.15; background: #fff; color: #000; overflow: hidden;">
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid #000; border-radius: 2px; padding: 1mm 1.5mm; box-sizing: border-box;">
          ${contentHtml}
        </div>
      </div>
      `;
    })
    .join('');

  // When printing fewer copies than the physical roll's part count (e.g. 1 copy on a 3-part roll),
  // generate blank placeholder slots so the active ticket stays strictly in Slot 1 and does not stretch.
  let blankSlipsHtml = '';
  if (isSideBySideX && copiesToPrint.length < effectivePartsX) {
    const blanksCount = effectivePartsX - copiesToPrint.length;
    for (let b = 0; b < blanksCount; b++) {
      blankSlipsHtml += `
      <div class="ticket-slip ticket-slip-blank" style="width: ${blockWidthCm}cm; min-width: ${blockWidthCm}cm; max-width: ${blockWidthCm}cm; height: ${blockHeightCm}cm; min-height: ${blockHeightCm}cm; max-height: ${blockHeightCm}cm; flex-shrink: 0; box-sizing: border-box; ${showCutLines ? 'border: 1px solid #000; border-left: 1.5px dashed #000;' : 'border: none;'} background: #fff;"></div>`;
    }
  } else if (isSideBySideY && copiesToPrint.length < effectivePartsY) {
    const blanksCount = effectivePartsY - copiesToPrint.length;
    for (let b = 0; b < blanksCount; b++) {
      blankSlipsHtml += `
      <div class="ticket-slip ticket-slip-blank" style="width: ${blockWidthCm}cm; min-width: ${blockWidthCm}cm; max-width: ${blockWidthCm}cm; height: ${blockHeightCm}cm; min-height: ${blockHeightCm}cm; max-height: ${blockHeightCm}cm; flex-shrink: 0; box-sizing: border-box; ${showCutLines ? 'border: 1px solid #000; border-top: 1.5px dashed #000;' : 'border: none;'} background: #fff;"></div>`;
    }
  }

  const allSlipsHtml = `${slipsHtml}${blankSlipsHtml}`;
  const autoFitScript = ticketAutoFitScriptTag();

  if (layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x') {
    return `
    <div class="ticket-page-grid" style="width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${heightCm}cm; min-height: ${heightCm}cm; max-height: ${heightCm}cm; box-sizing: border-box; display: flex; flex-direction: row; flex-wrap: nowrap; background: #fff; margin: 0; padding: 0; overflow: hidden; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid;">
      ${allSlipsHtml}
    </div>
    ${autoFitScript}`;
  } else if (layoutMode === 'side-by-side-y') {
    return `
    <div class="ticket-page-grid-y" style="width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${heightCm}cm; min-height: ${heightCm}cm; max-height: ${heightCm}cm; box-sizing: border-box; display: flex; flex-direction: column; flex-wrap: nowrap; background: #fff; margin: 0; padding: 0; overflow: hidden; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid;">
      ${allSlipsHtml}
    </div>
    ${autoFitScript}`;
  } else if (layoutMode === 'vertical-continuous') {
    const totalHeight = Number((Number(heightCm) * copiesToPrint.length).toFixed(2));
    return `
    <div class="ticket-vertical-strip" style="width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${totalHeight}cm; min-height: ${totalHeight}cm; max-height: ${totalHeight}cm; box-sizing: border-box; display: flex; flex-direction: column; background: #fff; margin: 0; padding: 0;">
      ${slipsHtml}
    </div>
    ${autoFitScript}`;
  }

  return `${slipsHtml}${autoFitScript}`;
}

export async function printTickets(data: TicketPrintData, silent = false): Promise<boolean> {
  const html = generateThermalTicketHTML(data);
  const { widthCm, heightCm } = resolveTicketDimensions(data);
  const orientation = data.orientation || 'portrait';
  const marginMm = data.marginMm !== undefined ? data.marginMm : 2;
  const fontScale = data.fontScale !== undefined ? data.fontScale : 100;
  const fontFamily = data.fontFamily || 'system-sans';
  const fontSizePt = data.fontSizePt !== undefined ? data.fontSizePt : 8.0;
  const fontWeight = data.fontWeight || '600';
  const autoCut = data.autoCut !== false;
  const feedLines = data.feedLines || 0;
  const layoutMode = data.layoutMode || 'side-by-side';

  const activeCopies = data.copyConfigs
    .filter((c) => c.is_enabled)
    .sort((a, b) => a.print_order - b.print_order);
  const copiesCount = activeCopies.length > 0 ? activeCopies.length : 1;

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
      rotation: data.rotation,
      marginMm,
      fontScale,
      fontFamily,
      fontSizePt,
      fontWeight,
      autoCut,
      feedLines,
      layoutMode,
      copiesCount,
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
