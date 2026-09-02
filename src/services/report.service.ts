import { dbService } from '@/db/sqlite-service';
import { DCRReportData, DCRShowGroup, DCRRow } from '@/types';
import { getLocalDateString } from '@/lib/utils';

export const reportService = {
  async generateDCRReport(selectedDate: string, cinemaName = 'Booking System'): Promise<DCRReportData> {
    await dbService.init();

    // Query shows active for this date (or having booked tickets on this date)
    const shows = dbService.query<any>(`
      SELECT s.*, m.name as movie_name, sc.name as screen_name
      FROM shows s
      LEFT JOIN movies m ON s.movie_id = m.id
      LEFT JOIN screens sc ON s.screen_id = sc.id
      WHERE s.is_active = 1 AND (s.show_date = ? OR s.id IN (SELECT show_id FROM bookings WHERE booking_date = ?))
      ORDER BY s.start_time ASC, s.id ASC
    `, [selectedDate, selectedDate]);

    const seatClasses = dbService.query<any>("SELECT * FROM seat_classes WHERE is_active = 1 ORDER BY display_order ASC");

    // Strictly query tickets for this show date
    const ticketItems = dbService.query<any>(`
      SELECT bs.*, b.show_id, b.booking_date, b.is_gst_applied, t.ticket_no
      FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.id
      LEFT JOIN tickets t ON t.booking_id = b.id AND t.copy_type = 'CUSTOMER'
      WHERE b.booking_date = ? AND b.status = 'BOOKED'
      ORDER BY t.ticket_no ASC
    `, [selectedDate]);

    // Payment Modes breakdown for the selected show date
    const paymentSummaries = dbService.query<any>(`
      SELECT pm.id as payment_mode_id, pm.name as payment_mode_name, 
             COUNT(b.id) as total_bookings, 
             COALESCE(SUM(b.total_gross), 0) as total_amount
      FROM payment_modes pm
      LEFT JOIN bookings b ON b.payment_mode_id = pm.id AND b.booking_date = ? AND b.status = 'BOOKED'
      GROUP BY pm.id, pm.name
      ORDER BY total_amount DESC, pm.id ASC
    `, [selectedDate]);

    // Cancellation summary for the selected show date
    const cancellationStats = dbService.queryOne<any>(`
      SELECT 
        (SELECT COUNT(bs.id) FROM booking_seats bs JOIN bookings b2 ON bs.booking_id = b2.id WHERE b2.booking_date = ? AND b2.status = 'CANCELLED') as cancelled_tickets,
        COALESCE(SUM(total_gross), 0) as refunded_gross,
        COALESCE(SUM(total_net), 0) as refunded_net
      FROM bookings
      WHERE booking_date = ? AND status = 'CANCELLED'
    `, [selectedDate, selectedDate]);

    const showGroups: DCRShowGroup[] = [];

    let grandTotalTickets = 0;
    let grandTotalNet = 0;
    let grandTotalCGST = 0;
    let grandTotalSGST = 0;
    let grandTotalTax = 0;
    let grandTotalGross = 0;
    let grandTotalServiceCharge = 0;

    for (const s of shows) {
      const classRows: DCRRow[] = [];
      let subTotalTickets = 0;
      let subTotalNet = 0;
      let subTotalCGST = 0;
      let subTotalSGST = 0;
      let subTotalTax = 0;
      let subTotalGross = 0;
      let subTotalServiceCharge = 0;

      for (const sc of seatClasses) {
        const matchingItems = ticketItems.filter(
          (ti) => ti.show_id === s.id && (ti.seat_class_id === sc.id || ti.seat_class_name === sc.name)
        );

        if (matchingItems.length === 0) continue;

        const pricing = dbService.queryOne<any>(
          "SELECT * FROM pricing WHERE (show_id = ? OR show_id IS NULL) AND seat_class_id = ? ORDER BY show_id DESC",
          [s.id, sc.id]
        );
        const rate = pricing ? pricing.base_price : (matchingItems[0]?.price_net || 100);

        const ticketNos = matchingItems.map((m) => m.ticket_no).filter(Boolean);
        const openingNo = ticketNos.length > 0 ? ticketNos[0] : '—';
        const closingNo = ticketNos.length > 0 ? ticketNos[ticketNos.length - 1] : '—';

        const sold = matchingItems.length;
        const net = matchingItems.reduce((sum, item) => sum + (item.price_net || 0), 0);
        const cgst = matchingItems.reduce((sum, item) => sum + (item.cgst || 0), 0);
        const sgst = matchingItems.reduce((sum, item) => sum + (item.sgst || 0), 0);
        const tax = cgst + sgst;
        const gross = matchingItems.reduce((sum, item) => sum + (item.price_gross || 0), 0);
        const scAmount = matchingItems.reduce((sum, item) => sum + (item.service_charge || 0), 0);

        subTotalTickets += sold;
        subTotalNet += net;
        subTotalCGST += cgst;
        subTotalSGST += sgst;
        subTotalTax += tax;
        subTotalGross += gross;
        subTotalServiceCharge += scAmount;

        classRows.push({
          seat_class_id: sc.id,
          seat_class_name: sc.name,
          opening_no: openingNo,
          closing_no: closingNo,
          rate,
          total_sold: sold,
          net_amount: net,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_tax: tax,
          gross_receipts: gross,
          service_charge: scAmount,
          cess: 0,
          tax_on_sc: 0,
        });
      }

      if (classRows.length > 0) {
        showGroups.push({
          show_id: s.id,
          show_name: s.show_name,
          start_time: s.start_time,
          movie_name: s.movie_name || 'Movie',
          screen_name: s.screen_name || 'Screen 1',
          rows: classRows,
          subtotal: {
            total_sold: subTotalTickets,
            net_amount: subTotalNet,
            cgst_amount: subTotalCGST,
            sgst_amount: subTotalSGST,
            total_tax: subTotalTax,
            gross_receipts: subTotalGross,
            service_charge: subTotalServiceCharge,
            cess: 0,
            tax_on_sc: 0,
          },
        });
      }

      grandTotalTickets += subTotalTickets;
      grandTotalNet += subTotalNet;
      grandTotalCGST += subTotalCGST;
      grandTotalSGST += subTotalSGST;
      grandTotalTax += subTotalTax;
      grandTotalGross += subTotalGross;
      grandTotalServiceCharge += subTotalServiceCharge;
    }

    const dateObj = new Date(selectedDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      cinema_name: cinemaName,
      date: selectedDate,
      day_name: dayNames[dateObj.getDay()] || '',
      show_groups: showGroups,
      payment_summaries: paymentSummaries.filter((p: any) => p.total_amount > 0),
      cancellation_summary: {
        cancelled_tickets: cancellationStats?.cancelled_tickets || 0,
        refunded_gross: cancellationStats?.refunded_gross || 0,
        refunded_net: cancellationStats?.refunded_net || 0,
      },
      grand_total: {
        total_sold: grandTotalTickets,
        net_amount: grandTotalNet,
        cgst_amount: grandTotalCGST,
        sgst_amount: grandTotalSGST,
        total_tax: grandTotalTax,
        gross_receipts: grandTotalGross,
        service_charge: grandTotalServiceCharge,
        cess: 0,
        tax_on_sc: 0,
      },
    };
  },

  async getDashboardStats(dateStr?: string): Promise<{
    grossRevenue: number;
    netRevenue: number;
    gstAmount: number;
    ticketsSold: number;
    ticketsCancelled: number;
    occupancyPct: number;
    activeShows: any[];
    recentBookings: any[];
  }> {
    await dbService.init();
    const today = dateStr || getLocalDateString();

    const bookingsSummary = dbService.queryOne<any>(`
      SELECT 
        COALESCE(SUM(total_gross), 0) AS total_gross,
        COALESCE(SUM(total_net), 0) AS total_net,
        COALESCE(SUM(total_cgst + total_sgst), 0) AS total_gst,
        (SELECT COUNT(*) FROM booking_seats bs JOIN bookings b2 ON bs.booking_id = b2.id WHERE b2.booking_date = ? AND b2.status = 'BOOKED') AS total_tickets
      FROM bookings
      WHERE booking_date = ? AND status = 'BOOKED'
    `, [today, today]);

    const cancelledCount = dbService.queryOne<any>(`
      SELECT COUNT(*) AS cancelled_count
      FROM bookings
      WHERE booking_date = ? AND status = 'CANCELLED'
    `, [today])?.cancelled_count || 0;

    const shows = dbService.query<any>(`
      SELECT s.*, m.name AS movie_name, m.duration_min AS movie_duration, mt.name AS movie_type_name, sc.name AS screen_name, sc.capacity
      FROM shows s
      LEFT JOIN movies m ON s.movie_id = m.id
      LEFT JOIN movie_types mt ON m.movie_type_id = mt.id
      LEFT JOIN screens sc ON s.screen_id = sc.id
      WHERE s.is_active = 1 AND (s.show_date = ? OR s.id IN (SELECT show_id FROM bookings WHERE booking_date = ?))
      ORDER BY s.start_time ASC, s.id ASC
    `, [today, today]);

    let totalCapacity = 0;
    let totalSoldSeats = 0;

    for (const show of shows) {
      const sold = dbService.queryOne<any>(`
        SELECT COUNT(*) AS count
        FROM booking_seats bs
        JOIN bookings b ON bs.booking_id = b.id
        WHERE b.show_id = ? AND (b.booking_date = ? OR date(b.created_at) = ?) AND b.status = 'BOOKED'
      `, [show.id, today, today])?.count || 0;

      show.sold_seats = sold;
      totalCapacity += show.capacity || 140;
      totalSoldSeats += sold;
    }

    const occupancy = totalCapacity > 0 ? Math.round((totalSoldSeats / totalCapacity) * 100) : 0;

    const recent = dbService.query<any>(`
      SELECT b.*, m.name AS movie_name, s.show_name, s.start_time, pm.name AS payment_mode_name
      FROM bookings b
      LEFT JOIN shows s ON b.show_id = s.id
      LEFT JOIN movies m ON s.movie_id = m.id
      LEFT JOIN payment_modes pm ON b.payment_mode_id = pm.id
      ORDER BY b.id DESC
      LIMIT 6
    `);

    return {
      grossRevenue: bookingsSummary?.total_gross || 0,
      netRevenue: bookingsSummary?.total_net || 0,
      gstAmount: bookingsSummary?.total_gst || 0,
      ticketsSold: bookingsSummary?.total_tickets || 0,
      ticketsCancelled: cancelledCount,
      occupancyPct: occupancy,
      activeShows: shows,
      recentBookings: recent,
    };
  },
};
