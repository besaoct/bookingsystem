import React, { useState, useEffect } from 'react';
import { DCRReportData, DCRShowGroup, DCRRow, DCRPaymentSummary } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { reportService } from '@/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { generateDCRHtml } from '@/lib/dcr-html';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Loader2,
  Calendar,
  CreditCard,
  Ban,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { cn, getLocalDateString } from '@/lib/utils';

export const DCRReportPage: React.FC = () => {
  const { cinema, fetchSettings } = useSettingsStore();
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [reportData, setReportData] = useState<DCRReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const data = await reportService.generateDCRReport(selectedDate, cinema?.name || 'Booking System');
      setReportData(data);
    } catch (e) {
      console.error('Failed to generate DCR report:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [selectedDate, cinema]);

  const handlePrint = async () => {
    if (!reportData) return;
    setIsPrinting(true);
    try {
      const htmlContent = generateDCRHtml({
        reportData,
        cinema,
        orientation: 'landscape',
        pageSize: 'A4',
      });

      if (window.electronAPI?.printDCRDocument) {
        await window.electronAPI.printDCRDocument({
          htmlContent,
          orientation: 'landscape',
          pageSize: 'A4',
          silent: false,
        });
      } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 350);
        } else {
          window.print();
        }
      }
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let csv = 'CINEMA DAILY COLLECTION REPORT (DCR)\n';
    csv += `Cinema: ${reportData.cinema_name}\n`;
    if (cinema?.address) csv += `Address: ${cinema.address}\n`;
    if (cinema?.gstin) csv += `GSTIN: ${cinema.gstin}\n`;
    csv += `Date: ${reportData.date} (${reportData.day_name})\n\n`;
    csv += 'Show,Start Time,Movie,Screen,Class,Opening No,Closing No,Rate,Sold,Net,CGST,SGST,Total Tax,Gross Receipts,Service Charge\n';

    reportData.show_groups.forEach((group: DCRShowGroup) => {
      group.rows.forEach((r: DCRRow) => {
        csv += `"${group.show_name}","${group.start_time}","${group.movie_name}","${group.screen_name}","${r.seat_class_name}","${r.opening_no}","${r.closing_no}",${r.rate},${r.total_sold},${r.net_amount.toFixed(2)},${r.cgst_amount.toFixed(2)},${r.sgst_amount.toFixed(2)},${r.total_tax.toFixed(2)},${r.gross_receipts.toFixed(2)},${r.service_charge.toFixed(2)}\n`;
      });
    });

    if (reportData.payment_summaries && reportData.payment_summaries.length > 0) {
      csv += '\nPAYMENT BREAKDOWN\n';
      csv += 'Mode,Bookings,Total Amount\n';
      reportData.payment_summaries.forEach((pm) => {
        csv += `"${pm.payment_mode_name}",${pm.total_bookings},${pm.total_amount.toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DCR_Report_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none font-sans">
      {/* Top Controls Bar */}
      <div className="bg-card border border-border rounded-xs p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs print:hidden">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Daily Collection Report (DCR)
          </span>
          <Badge variant="outline" className="text-2xs font-mono font-bold">
            STATUTORY GST AUDIT FORMAT
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              className="h-8"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !reportData} className="cursor-pointer">
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV Export
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            disabled={isLoading || isPrinting || !reportData}
            className="font-bold cursor-pointer"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print DCR
              </>
            )}
          </Button>
        </div>
      </div>

      {/* DCR Report Sheet Container */}
      <div className="flex-1 bg-card border border-border rounded-xs p-5 overflow-y-auto print:border-none print:p-0 print:overflow-visible print:shadow-none shadow-xs dcr-report-sheet">
        {/* Report Header */}
        <div className="text-center pb-4 border-b border-border mb-4 space-y-1">
          <h1 className="text-base font-extrabold tracking-widest text-foreground uppercase">
            {(cinema?.name || reportData?.cinema_name) ? `${String(cinema?.name || reportData?.cinema_name).toUpperCase()} — ` : ''}DAILY COLLECTION REPORT
          </h1>
          {cinema?.address && (
            <p className="text-[11px] text-muted-foreground font-medium">
              {cinema.address}
            </p>
          )}
          <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
            DAILY COLLECTION REPORT (SHOW &amp; CLASS WISE)
          </h2>
          <div className="text-xs text-muted-foreground flex justify-center space-x-6 pt-1">
            <span>DATE: <strong className="text-foreground">{reportData?.date}</strong> ({reportData?.day_name})</span>
            <span>GENERATED: <strong className="text-foreground">{new Date().toLocaleTimeString()}</strong></span>
            {cinema?.gstin && (
              <span>GSTIN: <strong className="text-foreground">{cinema.gstin}</strong></span>
            )}
          </div>
        </div>

        {/* Top Summary Stat KPI Cards */}
        {reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5 print:hidden">
            <div className="p-2.5 bg-muted/30 border border-border rounded-xs">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Total Tickets</div>
              <div className="text-base font-black text-primary mt-0.5">{reportData.grand_total.total_sold}</div>
            </div>
            <div className="p-2.5 bg-muted/30 border border-border rounded-xs">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Net ADM Receipts</div>
              <div className="text-base font-black text-foreground mt-0.5">₹{reportData.grand_total.net_amount.toFixed(2)}</div>
            </div>
            <div className="p-2.5 bg-muted/30 border border-border rounded-xs">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">GST Collected (18%)</div>
              <div className="text-base font-black text-destructive mt-0.5">₹{reportData.grand_total.total_tax.toFixed(2)}</div>
            </div>
            <div className="p-2.5 bg-muted/30 border border-border rounded-xs">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Service Charge</div>
              <div className="text-base font-black text-foreground mt-0.5">₹{reportData.grand_total.service_charge.toFixed(2)}</div>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xs">
              <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Grand Total Gross</div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{reportData.grand_total.gross_receipts.toFixed(2)}</div>
            </div>
          </div>
        )}

        {reportData?.show_groups.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-medium space-y-2">
            <Calendar className="w-8 h-8 text-muted-foreground/60 mb-1" />
            <div className="text-sm font-bold text-foreground">No Ticket Sales for {selectedDate}</div>
            <p className="max-w-md text-xs text-muted-foreground">
              No shows had tickets issued or confirmed for this show date.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {reportData?.show_groups.map((group: DCRShowGroup) => (
              <div key={group.show_id} className="border border-border rounded-xs overflow-hidden shadow-xs">
                {/* Show Header */}
                <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-bold flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="uppercase text-white font-extrabold">{group.show_name} SHOW ({group.start_time})</span>
                    <span className="opacity-60">•</span>
                    <span className="truncate max-w-md">{group.movie_name}</span>
                  </div>
                  <span className="text-primary-foreground/80 font-semibold">{group.screen_name}</span>
                </div>

                {/* Show Table Grid */}
                <div className="overflow-x-auto print:overflow-visible print:w-full">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted border-b border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2.5">Class</th>
                        <th className="px-3 py-2.5 text-center">Opening No</th>
                        <th className="px-3 py-2.5 text-center">Closing No</th>
                        <th className="px-3 py-2.5 text-right">Rate</th>
                        <th className="px-3 py-2.5 text-center">Total Sold</th>
                        <th className="px-3 py-2.5 text-right">Net</th>
                        <th className="px-3 py-2.5 text-right">CGST</th>
                        <th className="px-3 py-2.5 text-right">SGST</th>
                        <th className="px-3 py-2.5 text-right">Total Tax</th>
                        <th className="px-3 py-2.5 text-right">Gross Receipts</th>
                        <th className="px-3 py-2.5 text-right">Service Charge</th>
                        <th className="px-3 py-2.5 text-right">Cess</th>
                        <th className="px-3 py-2.5 text-right pr-3">Tax on SC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.rows.map((row: DCRRow) => (
                        <tr key={row.seat_class_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-semibold text-foreground">
                            {row.seat_class_name}
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground font-semibold font-mono">{row.opening_no}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground font-semibold font-mono">{row.closing_no}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{row.rate.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center font-bold text-primary">{row.total_sold}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-medium">{row.net_amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-medium">{row.cgst_amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-medium">{row.sgst_amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-medium">{row.total_tax.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground">₹{row.gross_receipts.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-medium">{row.service_charge.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-medium">0.00</td>
                          <td className="px-3 py-2 text-right pr-3 text-muted-foreground font-medium">0.00</td>
                        </tr>
                      ))}

                      {/* Show Subtotal Row */}
                      <tr className="bg-muted/40 font-bold border-t-2 border-border text-foreground">
                        <td colSpan={4} className="px-3 py-2.5 uppercase">
                          SHOW SUBTOTAL ({group.show_name})
                        </td>
                        <td className="px-3 py-2.5 text-center text-primary">{group.subtotal.total_sold}</td>
                        <td className="px-3 py-2.5 text-right">{group.subtotal.net_amount.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">{group.subtotal.cgst_amount.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">{group.subtotal.sgst_amount.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">{group.subtotal.total_tax.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{group.subtotal.gross_receipts.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">{group.subtotal.service_charge.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">0.00</td>
                        <td className="px-3 py-2.5 text-right pr-3">0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* GRAND TODAY TOTAL SUMMARY TABLE */}
            {reportData && (
              <div className="border border-border rounded-xs overflow-hidden mt-5 shadow-xs">
                <div className="bg-primary text-primary-foreground px-3 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>TODAY'S GRAND TOTAL COLLECTION SUMMARY</span>
                  <span className="bg-white/20 px-2.5 py-0.5 rounded-xs font-extrabold">
                    {reportData.grand_total.total_sold} TICKETS SOLD
                  </span>
                </div>
                <table className="w-full text-xs text-left bg-card">
                  <thead className="bg-muted border-b border-border font-semibold text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">Metric</th>
                      <th className="px-3 py-2.5 text-center">Total Tickets</th>
                      <th className="px-3 py-2.5 text-right">Total Net (ADM)</th>
                      <th className="px-3 py-2.5 text-right">Total CGST</th>
                      <th className="px-3 py-2.5 text-right">Total SGST</th>
                      <th className="px-3 py-2.5 text-right">Total GST Tax</th>
                      <th className="px-3 py-2.5 text-right">Gross Receipts</th>
                      <th className="px-3 py-2.5 text-right">Total Service Charge</th>
                      <th className="px-3 py-2.5 text-right pr-3">Total Cess</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground font-semibold text-xs">
                    <tr>
                      <td className="px-3 py-3 font-sans font-bold text-primary">ALL SHOWS AGGREGATE</td>
                      <td className="px-3 py-3 text-center text-primary font-bold text-sm">
                        {reportData.grand_total.total_sold}
                      </td>
                      <td className="px-3 py-3 text-right">₹{reportData.grand_total.net_amount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right">₹{reportData.grand_total.cgst_amount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right">₹{reportData.grand_total.sgst_amount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-destructive font-bold">₹{reportData.grand_total.total_tax.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        ₹{reportData.grand_total.gross_receipts.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right">₹{reportData.grand_total.service_charge.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right pr-3">₹0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Breakdown: Payment Modes & Cancellations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {/* Payment Mode Breakdown */}
              {reportData && reportData.payment_summaries && reportData.payment_summaries.length > 0 && (
                <div className="border border-border rounded-xs overflow-hidden shadow-xs">
                  <div className="bg-muted/60 px-3 py-2 text-xs font-bold uppercase text-foreground flex items-center space-x-1.5 border-b border-border">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    <span>Payment Mode Breakdown</span>
                  </div>
                  <table className="w-full text-xs text-left bg-card">
                    <thead className="bg-muted/30 border-b border-border text-[10px] uppercase font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Payment Mode</th>
                        <th className="px-3 py-2 text-center">Transactions</th>
                        <th className="px-3 py-2 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.payment_summaries.map((pm: DCRPaymentSummary) => (
                        <tr key={pm.payment_mode_id}>
                          <td className="px-3 py-2 font-semibold text-foreground">{pm.payment_mode_name}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground font-medium">{pm.total_bookings}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{pm.total_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cancellation & Refund Summary */}
              {reportData && reportData.cancellation_summary && (
                <div className="border border-border rounded-xs overflow-hidden shadow-xs">
                  <div className="bg-muted/60 px-3 py-2 text-xs font-bold uppercase text-foreground flex items-center space-x-1.5 border-b border-border">
                    <Ban className="w-3.5 h-3.5 text-destructive" />
                    <span>Cancellation &amp; Refund Audit</span>
                  </div>
                  <div className="p-3 bg-card space-y-2 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Cancelled Tickets Today:</span>
                      <span className="font-bold text-destructive">{reportData.cancellation_summary.cancelled_tickets} Ticket(s)</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Refunded Net Amount:</span>
                      <span className="font-medium text-foreground">₹{reportData.cancellation_summary.refunded_net.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground border-t border-border pt-1.5">
                      <span className="font-semibold text-foreground">Total Refunded Gross:</span>
                      <span className="font-bold text-destructive text-xs">₹{reportData.cancellation_summary.refunded_gross.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System-Generated Report Notice */}
        <div className="mt-8 pt-4 border-t border-dashed border-border text-center">
          <p className="italic text-muted-foreground text-[11px]">
            * This is a system generated report and does not require a physical signature.
          </p>
        </div>
      </div>
    </div>
  );
};
