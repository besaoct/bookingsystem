import { DCRReportData, Cinema } from '@/types';

export interface GenerateDCROptions {
  reportData: DCRReportData;
  cinema?: Cinema | null;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
}

export function generateDCRHtml({
  reportData,
  cinema,
  orientation = 'landscape',
  pageSize = 'A4',
}: GenerateDCROptions): string {
  const cinemaTitle = (cinema?.name || reportData.cinema_name || 'Cinema').toUpperCase();
  const address = cinema?.address || '';
  const gstin = cinema?.gstin || '';
  const dateStr = reportData.date;
  const dayName = reportData.day_name;
  const generatedTime = new Date().toLocaleTimeString();

  const showGroupsHtml = reportData.show_groups
    .map((group) => {
      const rowsHtml = group.rows
        .map(
          (r) => `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #1e293b;">${r.seat_class_name}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 11px;">${r.opening_no}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 11px;">${r.closing_no}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${r.rate.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: #1d4ed8;">${r.total_sold}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${r.net_amount.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${r.cgst_amount.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${r.sgst_amount.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${r.total_tax.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #047857;">${r.gross_receipts.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${r.service_charge.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">0.00</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">0.00</td>
        </tr>`
        )
        .join('');

      return `
      <div style="margin-bottom: 14px; page-break-inside: avoid;">
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-bottom: none; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #0f172a;">
          <div>
            <span style="color: #1d4ed8; text-transform: uppercase;">${group.show_name}</span> (${group.start_time}) • 
            <span style="color: #0f172a;">${group.movie_name}</span> • 
            <span style="color: #64748b;">${group.screen_name}</span>
          </div>
          <div style="background: #e2e8f0; padding: 2px 8px; border-radius: 3px; font-size: 10px;">
            ${group.subtotal.total_sold} SOLD • ₹${group.subtotal.gross_receipts.toFixed(2)}
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; font-weight: 700; color: #475569; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">Class</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">Op. No</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">Cl. No</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Rate</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">Sold</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Net (ADM)</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">CGST</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">SGST</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Tax</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Gross</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">S.Charge</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">MC Tax</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Cess</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background: #f1f5f9; font-weight: 700; color: #0f172a; border-top: 2px solid #94a3b8;">
              <td colspan="4" style="padding: 6px 8px; border: 1px solid #cbd5e1;">SHOW SUBTOTAL</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; color: #1d4ed8;">${group.subtotal.total_sold}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${group.subtotal.net_amount.toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${group.subtotal.cgst_amount.toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${group.subtotal.sgst_amount.toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${group.subtotal.total_tax.toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #047857;">${group.subtotal.gross_receipts.toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${group.subtotal.service_charge.toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">0.00</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">0.00</td>
            </tr>
          </tbody>
        </table>
      </div>`;
    })
    .join('');

  // Payment Modes Table HTML
  const paymentRowsHtml = (reportData.payment_summaries || [])
    .map(
      (pm) => `
      <tr>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${pm.payment_mode_name}</td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">${pm.total_bookings}</td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #047857;">₹${pm.total_amount.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const cancellationHtml = reportData.cancellation_summary && reportData.cancellation_summary.cancelled_tickets > 0
    ? `<div style="margin-top: 10px; padding: 6px 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 2px; font-size: 10.5px; color: #991b1b; display: flex; justify-content: space-between;">
        <span><strong>Cancellations Recorded Today:</strong> ${reportData.cancellation_summary.cancelled_tickets} Ticket(s)</span>
        <span><strong>Refunded Gross:</strong> ₹${reportData.cancellation_summary.refunded_gross.toFixed(2)}</span>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${cinemaTitle} - DCR Report ${dateStr}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.35;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    table {
      page-break-inside: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
    <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0f172a;">
      ${cinemaTitle}
    </div>
    ${address ? `<div style="font-size: 10.5px; color: #475569; margin-top: 2px;">${address}</div>` : ''}
    <div style="font-size: 12px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.05em;">
      DAILY COLLECTION REPORT (DCR)
    </div>
    <div style="display: flex; justify-content: center; gap: 24px; font-size: 10.5px; color: #334155; margin-top: 5px;">
      <span>DATE: <strong>${dateStr}</strong> (${dayName})</span>
      <span>GENERATED: <strong>${generatedTime}</strong></span>
      ${gstin ? `<span>GSTIN: <strong>${gstin}</strong></span>` : ''}
    </div>
  </div>

  <!-- Show Breakdown -->
  ${
    reportData.show_groups.length === 0
      ? '<div style="text-align: center; padding: 30px; color: #64748b; font-weight: 600;">No shows scheduled or bookings recorded for this date.</div>'
      : showGroupsHtml
  }

  <!-- Grand Total Summary -->
  <div style="margin-top: 14px; page-break-inside: avoid;">
    <div style="background: #1d4ed8; color: #ffffff; padding: 6px 10px; font-weight: 800; font-size: 11px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; border-radius: 2px 2px 0 0;">
      <span>TODAY'S GRAND TOTAL COLLECTION SUMMARY</span>
      <span style="background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 2px;">
        ${reportData.grand_total.total_sold} TICKETS SOLD
      </span>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; background: #ffffff;">
      <thead>
        <tr style="background: #f8fafc; font-weight: 700; color: #475569; font-size: 10px; text-transform: uppercase;">
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Metric</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">Total Sold</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Total Net (ADM)</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Total CGST</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Total SGST</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Total Tax</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Gross Receipts</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Service Charge</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Cess</th>
        </tr>
      </thead>
      <tbody>
        <tr style="font-weight: 700; color: #0f172a; background: #f1f5f9;">
          <td style="padding: 8px; border: 1px solid #cbd5e1; color: #1d4ed8;">ALL SHOWS AGGREGATE</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #1d4ed8; font-size: 12px;">${reportData.grand_total.total_sold}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${reportData.grand_total.net_amount.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${reportData.grand_total.cgst_amount.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${reportData.grand_total.sgst_amount.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${reportData.grand_total.total_tax.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #047857; font-size: 12px;">₹${reportData.grand_total.gross_receipts.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${reportData.grand_total.service_charge.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹0.00</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${
    paymentRowsHtml
      ? `
  <!-- Payment Mode Summary -->
  <div style="margin-top: 14px; page-break-inside: avoid; width: 50%;">
    <div style="background: #0f172a; color: #ffffff; padding: 5px 10px; font-weight: 700; font-size: 10.5px; text-transform: uppercase;">
      PAYMENT MODE BREAKDOWN
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
      <thead>
        <tr style="background: #f8fafc; font-weight: 600; color: #475569;">
          <th style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: left;">Mode</th>
          <th style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;">Bookings</th>
          <th style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRowsHtml}
      </tbody>
    </table>
  </div>`
      : ''
  }

  ${cancellationHtml}

  <!-- Statutory Disclaimer Footer -->
  <div style="margin-top: 24px; padding-top: 10px; border-top: 1px dashed #94a3b8; text-align: center;">
    <p style="font-style: italic; color: #64748b; font-size: 10px; margin: 0;">
      * This is a system generated report and does not require a physical signature.
    </p>
  </div>
</body>
</html>`;
}
