import React, { useState, useEffect } from 'react';
import { DCRReportData, DCRShowGroup, DCRRow } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { reportService } from '@/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { FileSpreadsheet, Printer, Download, RefreshCw } from 'lucide-react';

export const DCRReportPage: React.FC = () => {
  const { cinema, fetchSettings } = useSettingsStore();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<DCRReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${cinema?.name || reportData?.cinema_name || 'Cinema'} - DCR Report ${selectedDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
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

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DCR_Report_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
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

        <div className="flex items-center space-x-3">
          <div className="w-44">
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !reportData}>
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV Export
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} disabled={isLoading || !reportData} className="font-bold">
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xs p-5 overflow-y-auto print:border-none print:p-0 print:overflow-visible print:shadow-none shadow-xs dcr-report-sheet">
        <div className="text-center pb-4 border-b border-border mb-4 space-y-1">
          <h1 className="text-base font-extrabold tracking-widest text-foreground uppercase">
            {cinema?.name || reportData?.cinema_name || 'BOOKING SYSTEM'} - DAILY COLLECTION REPORT
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

        {reportData?.show_groups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs font-medium">
            No ticket sales or active bookings found for {selectedDate}.
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
                          <td className="px-3 py-2 text-center text-muted-foreground font-semibold">{row.opening_no}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground font-semibold">{row.closing_no}</td>
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
                        <td className="px-3 py-2.5 text-right text-primary font-extrabold">₹{group.subtotal.gross_receipts.toFixed(2)}</td>
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
                      <td className="px-3 py-3 text-right text-success font-bold text-sm">
                        ₹{reportData.grand_total.gross_receipts.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right">₹{reportData.grand_total.service_charge.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right pr-3">₹0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer Signature Block for Accounting */}
        <div className="mt-8 pt-4 border-t border-border grid grid-cols-3 text-center text-xs text-muted-foreground">
          <div>
            <div className="h-8 border-b border-dashed border-border w-40 mx-auto" />
            <span className="mt-1 block font-semibold text-foreground">Prepared By (Box Office Operator)</span>
          </div>
          <div>
            <div className="h-8 border-b border-dashed border-border w-40 mx-auto" />
            <span className="mt-1 block font-semibold text-foreground">Verified By (Duty Manager)</span>
          </div>
          <div>
            <div className="h-8 border-b border-dashed border-border w-40 mx-auto" />
            <span className="mt-1 block font-semibold text-foreground">Authorized Signature (Proprietor)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
