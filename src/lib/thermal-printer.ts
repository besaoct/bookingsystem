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

/** Single source of truth for the ticket stock. Default stock is 10.2 cm across x 3.5 cm feed. */
export const DEFAULT_TICKET_WIDTH_CM = 10.2;
export const DEFAULT_TICKET_HEIGHT_CM = 3.5;

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
  return (
    '<script>(function(){var fit=' +
    fitTicketContent.toString() +
    ';function run(){fit(document);}run();' +
    "if(document.readyState!=='complete'){window.addEventListener('load',run);}" +
    'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(run);}})();</' +
    'script>'
  );
}

export function generateThermalTicketHTML(data: TicketPrintData): string {
  const { cinema, booking, copyConfigs, invoiceSeries } = data;
  const { widthCm, heightCm } = resolveTicketDimensions(data);
  const layoutMode = data.layoutMode || 'side-by-side';
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

  const baseWeight = Number(data.fontWeight) || 600;
  const boldWeight = Math.min(900, baseWeight + 200);
  const semiWeight = Math.min(900, baseWeight + 100);
  const normalWeight = baseWeight;

  const baseFontSize = Number(data.fontSizePt) || 8.0;
  const fontScale = Number(data.fontScale) || 100;
  const effectiveFontSizePt = ((baseFontSize * fontScale) / 100).toFixed(1);

  const fontFamilyKey = data.fontFamily || 'system-sans';
  const resolvedFontFamily =
    OFFLINE_FONT_MAP[fontFamilyKey] ||
    fontFamilyKey ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const marginMm = data.marginMm !== undefined ? Number(data.marginMm) : 2;
  const padV = Math.max(1, Math.min(marginMm, 3));
  const padH = Math.max(2, Math.min(marginMm * 1.5, 5));

  const rawMovieName = booking.movie_name || (booking as any).movieTitle || '';
  const rawMovieType = booking.movie_type_name || '';
  const displayMovieTitle = rawMovieName ? rawMovieName.trim().toUpperCase() : 'CINEMA MOVIE';
  const displayMovieType = rawMovieType ? rawMovieType.trim().toUpperCase() : '';
  const fullMovieName = displayMovieType && !displayMovieTitle.includes(displayMovieType)
    ? `${displayMovieTitle} ${displayMovieType}`
    : displayMovieTitle;

  const isVertical =
    data.orientation === 'portrait' ||
    Number(heightCm) > Number(widthCm);

  const slipsHtml = copiesToPrint
    .map((copy, idx) => {
      const copyBadge = copy.header_label ? copy.header_label.trim() : 'C';
      const badgeFontSize = copyBadge.length > 2 ? '7.5px' : '9px';
      const isSideBySideX = layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x';
      const isSideBySideY = layoutMode === 'side-by-side-y';
      const isContinuous = layoutMode === 'vertical-continuous';

      const slipWidthStyle = isSideBySideX
        ? `width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${heightCm}cm; min-height: ${heightCm}cm; max-height: ${heightCm}cm; page-break-after: avoid; border: 1px solid #000; border-left: ${idx > 0 ? '1.5px dashed #000' : '1px solid #000'};`
        : isSideBySideY || isContinuous
        ? `width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${heightCm}cm; min-height: ${heightCm}cm; max-height: ${heightCm}cm; page-break-after: avoid; page-break-inside: avoid; border: 1px solid #000; border-top: ${idx > 0 ? '1.5px dashed #000' : '1px solid #000'};`
        : `width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${heightCm}cm; min-height: ${heightCm}cm; max-height: ${heightCm}cm; page-break-after: always; border: 1px solid #000;`;

      // Landscape content — used for landscape slips directly, rotated 90° inside portrait slips
      const contentHtml = `
        <!-- Header Top: Copy Code Badge + Cinema Name + Quantity Circle -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #000; padding-bottom: 0.2em; min-width: 0; flex-shrink: 0 !important;">
          <div style="display: flex; align-items: center; gap: 0.3em; min-width: 0; overflow: hidden; flex: 1;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em; border: 1.5px solid #000; font-weight: ${boldWeight}; font-size: ${badgeFontSize}; border-radius: 2px; flex-shrink: 0;">${esc(copyBadge)}</span>
            <span style="font-weight: ${boldWeight}; font-size: 1.15em; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(cinema.header_text || cinema.name)}</span>
          </div>
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 1.6em; height: 1.6em; border: 1.5px solid #000; border-radius: 50%; font-weight: ${boldWeight}; font-size: 1.0em; flex-shrink: 0; margin-left: 0.2em;">
            ${qty}
          </div>
        </div>

        <!-- Movie Title Line - Guaranteed visible after headline line with flex-shrink: 0 and min-height -->
        <div style="font-weight: ${semiWeight}; font-size: 1.05em; text-transform: uppercase; margin: 0.1em 0; line-height: 1.25; min-height: 1.25em; flex-shrink: 0 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${esc(fullMovieName)}
        </div>

        <!-- Middle 3-Column Section -->
        <div style="display: grid; grid-template-columns: 1.4fr 1.1fr 1fr; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 0.2em 0; font-size: 0.9em; flex-shrink: 0 !important;">
          
          <!-- Column 1: Financial & Tax Breakup -->
          <div style="border-right: 1px solid #000; padding-right: 0.3em; line-height: 1.18; overflow: hidden;">
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
            <div style="font-weight: ${boldWeight}; font-size: 1.05em; margin-top: 0.1em; border-top: 0.5px solid #000;">
              Total: ${booking.total_gross.toFixed(2)}
            </div>
          </div>

          <!-- Column 2: Date, Showtime & SAC Code -->
          <div style="border-right: 1px solid #000; padding: 0 0.3em; line-height: 1.2; overflow: hidden;">
            <div style="font-weight: ${semiWeight}; font-size: 1.0em; white-space: nowrap;">${esc(formattedDate)}</div>
            <div style="font-weight: ${semiWeight}; font-size: 1.05em; margin-top: 0.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(showTimeDisplay)}</div>
            <div style="font-weight: ${semiWeight}; font-size: 0.88em; margin-top: 0.15em;">SAC 997321</div>
          </div>

          <!-- Column 3: Auditorium, Seat Numbers & Class -->
          <div style="padding-left: 0.3em; line-height: 1.2; text-align: left; overflow: hidden;">
            <div style="font-weight: ${semiWeight}; font-size: 1.0em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(booking.screen_name)}</div>
            <div style="font-weight: ${boldWeight}; font-size: 1.15em; letter-spacing: 0.03em; word-break: break-all;">${esc(seatLabels)}</div>
            <div style="font-weight: ${boldWeight}; font-size: 1.05em; text-transform: uppercase; margin-top: 0.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(seatClass)}</div>
          </div>
        </div>

        <!-- Footer Section: Tax IDs and Audit Tracking -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.78em; line-height: 1.15; padding-top: 0.15em; font-weight: ${normalWeight}; flex-shrink: 0 !important;">
          <div style="overflow: hidden; max-width: 50%;">
            ${cinema.show_gstin_on_ticket && cinema.gstin ? `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">GSTIN: ${esc(cinema.gstin)}</div>` : ''}
            ${cinema.cin ? `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">CIN: ${esc(cinema.cin)}</div>` : ''}
          </div>
          <div style="text-align: right; white-space: nowrap;">
            <div>Ticket No: ${esc(firstTicketNo)}&nbsp;&nbsp;L.No. Transaction No: ${esc(txnNo)}</div>
            <div>INV No. : ${esc(invNo)}&nbsp;&nbsp;Issued on: ${esc(issuedOn)}</div>
          </div>
        </div>
        `;

      // For portrait/vertical slips: rotate content 90° so text reads along the long edge
      if (isVertical) {
        const wCm = Number(widthCm);
        const hCm = Number(heightCm);
        return `
        <div class="ticket-slip" style="${slipWidthStyle} box-sizing: border-box; padding: 0; font-family: ${resolvedFontFamily} !important; font-size: ${effectiveFontSizePt}pt; font-weight: ${normalWeight}; line-height: 1.15; background: #fff; color: #000; position: relative; overflow: visible; clip-path: inset(0);">
          <div data-ticket-box="1" style="position: absolute; left: 0; top: 0; width: ${hCm}cm; height: ${wCm}cm; transform: translate(0, ${hCm}cm) rotate(-90deg); transform-origin: 0 0; padding: ${padV}mm ${padH}mm; box-sizing: border-box; font-family: ${resolvedFontFamily} !important; font-size: ${effectiveFontSizePt}pt; font-weight: ${normalWeight}; overflow: hidden;">
            <div data-ticket-scale="1" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; transform-origin: top left;">
              ${contentHtml}
            </div>
          </div>
        </div>
        `;
      }

      // The slip is the fixed frame at exactly the configured stock size; the inner wrapper holds the
      // content and is what fitTicketContent() scales down to fit inside that frame.
      return `
      <div class="ticket-slip" data-ticket-box="1" style="${slipWidthStyle} box-sizing: border-box; padding: ${padV}mm ${padH}mm; font-family: ${resolvedFontFamily} !important; font-size: ${effectiveFontSizePt}pt; font-weight: ${normalWeight}; line-height: 1.15; background: #fff; color: #000; overflow: hidden;">
        <div data-ticket-scale="1" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; transform-origin: top left;">
          ${contentHtml}
        </div>
      </div>
      `;
    })
    .join('');

  const autoFitScript = ticketAutoFitScriptTag();

  if (layoutMode === 'side-by-side' || layoutMode === 'side-by-side-x') {
    const totalWidth = Number((Number(widthCm) * copiesToPrint.length).toFixed(2));
    return `
    <div class="ticket-page-grid" style="width: ${totalWidth}cm; min-width: ${totalWidth}cm; max-width: ${totalWidth}cm; height: ${heightCm}cm; min-height: ${heightCm}cm; max-height: ${heightCm}cm; box-sizing: border-box; display: flex; flex-direction: row; background: #fff; margin: 0; padding: 0;">
      ${slipsHtml}
    </div>
    ${autoFitScript}`;
  } else if (layoutMode === 'side-by-side-y') {
    const totalHeight = Number((Number(heightCm) * copiesToPrint.length).toFixed(2));
    return `
    <div class="ticket-page-grid-y" style="width: ${widthCm}cm; min-width: ${widthCm}cm; max-width: ${widthCm}cm; height: ${totalHeight}cm; min-height: ${totalHeight}cm; max-height: ${totalHeight}cm; box-sizing: border-box; display: flex; flex-direction: column; background: #fff; margin: 0; padding: 0;">
      ${slipsHtml}
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
  const widthCm = data.ticketWidthCm || (data.orientation === 'portrait' ? '3.5' : '10.2');
  const heightCm = data.ticketHeightCm || (data.orientation === 'portrait' ? '10.2' : '3.5');
  const orientation = data.orientation || 'landscape';
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
