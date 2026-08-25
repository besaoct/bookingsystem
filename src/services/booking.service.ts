import { dbService } from '@/db/sqlite-service';
import { Booking, BookingSeat, Ticket, CancellationReason, TaxConfig } from '@/types';
import { calculateSeatTaxes } from '@/lib/tax-calculator';

export interface CreateBookingParams {
  showId: number;
  showDate: string;
  selectedSeats: Array<{
    id: number;
    row_name: string;
    seat_number: number;
    seat_class_id: number;
    class_name: string;
    base_price: number;
    service_charge: number;
  }>;
  applyGst: boolean;
  paymentModeId: number;
  bookedByUserId: number;
  taxConfig: TaxConfig;
  movieName?: string;
  movieTypeName?: string;
  screenName?: string;
  startTime?: string;
}

export const bookingService = {
  async getBookedSeatIdsForShow(showId: number): Promise<number[]> {
    await dbService.init();
    const rows = dbService.query<{ seat_id: number }>(`
      SELECT bs.seat_id 
      FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.id
      WHERE b.show_id = ? AND b.status = 'BOOKED'
    `, [showId]);
    return rows.map((r) => r.seat_id);
  },

  async createBooking(params: CreateBookingParams): Promise<Booking> {
    await dbService.init();
    const {
      showId,
      showDate,
      selectedSeats,
      applyGst,
      paymentModeId,
      bookedByUserId,
      taxConfig,
      movieName,
      movieTypeName,
      screenName,
      startTime,
    } = params;

    let totalNet = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalServiceCharge = 0;
    let totalGross = 0;

    const itemizedSeats = selectedSeats.map((seat) => {
      const calc = calculateSeatTaxes(seat.base_price, taxConfig, applyGst, seat.service_charge);
      totalNet += calc.baseNet;
      totalCgst += calc.cgst;
      totalSgst += calc.sgst;
      totalServiceCharge += calc.serviceCharge;
      totalGross += calc.grossTotal;
      return { seat, calc };
    });

    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bookingNo = `BK-${dateStr}-${String(timestamp).slice(-4)}`;

    const bookingRes = dbService.run(`
      INSERT INTO bookings (
        booking_no, show_id, booking_date,
        total_net, total_cgst, total_sgst, total_service_charge, total_gross,
        is_gst_applied, payment_mode_id, booked_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED')
    `, [
      bookingNo,
      showId,
      showDate || new Date().toISOString().slice(0, 10),
      totalNet,
      totalCgst,
      totalSgst,
      totalServiceCharge,
      totalGross,
      applyGst ? 1 : 0,
      paymentModeId,
      bookedByUserId,
    ]);

    const bookingId = bookingRes.lastInsertRowid;

    // Get next ticket number
    const lastTicket = dbService.queryOne<{ max_ticket: string }>(
      "SELECT max(CAST(ticket_no AS INTEGER)) as max_ticket FROM tickets"
    );
    let nextTicketNum = (lastTicket && lastTicket.max_ticket ? Number(lastTicket.max_ticket) : 9570) + 1;

    const createdSeats: BookingSeat[] = [];
    const createdTickets: Ticket[] = [];

    for (const item of itemizedSeats) {
      const bsRes = dbService.run(`
        INSERT INTO booking_seats (
          booking_id, seat_id, row_name, seat_number,
          seat_class_id, seat_class_name, price_net, cgst, sgst, service_charge, price_gross
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        bookingId,
        item.seat.id,
        item.seat.row_name,
        item.seat.seat_number,
        item.seat.seat_class_id,
        item.seat.class_name,
        item.calc.baseNet,
        item.calc.cgst,
        item.calc.sgst,
        item.calc.serviceCharge,
        item.calc.grossTotal,
      ]);

      createdSeats.push({
        id: bsRes.lastInsertRowid,
        booking_id: bookingId,
        seat_id: item.seat.id,
        row_name: item.seat.row_name,
        seat_number: item.seat.seat_number,
        seat_class_id: item.seat.seat_class_id,
        seat_class_name: item.seat.class_name,
        price_net: item.calc.baseNet,
        cgst: item.calc.cgst,
        sgst: item.calc.sgst,
        service_charge: item.calc.serviceCharge,
        price_gross: item.calc.grossTotal,
      });

      const formattedTicketNo = String(nextTicketNum).padStart(6, '0');
      nextTicketNum++;

      const copies = ['CUSTOMER', 'OFFICE', 'SECURITY'];
      for (const copy of copies) {
        const tktRes = dbService.run(`
          INSERT INTO tickets (booking_id, ticket_no, copy_type, printed_at, is_cancelled)
          VALUES (?, ?, ?, datetime('now', 'localtime'), 0)
        `, [bookingId, formattedTicketNo, copy]);

        createdTickets.push({
          id: tktRes.lastInsertRowid,
          booking_id: bookingId,
          ticket_no: formattedTicketNo,
          copy_type: copy,
          printed_at: new Date().toISOString(),
          is_cancelled: false,
        });
      }
    }

    // Payment mode name
    const pm = dbService.queryOne<{ name: string }>("SELECT name FROM payment_modes WHERE id = ?", [paymentModeId]);

    // Audit log
    dbService.run(`
      INSERT INTO audit_logs (user_id, username, action, module, details)
      VALUES (?, (SELECT username FROM users WHERE id = ?), 'BOOK_TICKETS', 'booking', ?)
    `, [
      bookedByUserId,
      bookedByUserId,
      `Booked ${selectedSeats.length} seats for show #${showId}. Total Gross: ₹${totalGross.toFixed(2)}`,
    ]);

    return {
      id: bookingId,
      booking_no: bookingNo,
      show_id: showId,
      booking_date: showDate,
      total_net: totalNet,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
      total_service_charge: totalServiceCharge,
      total_gross: totalGross,
      is_gst_applied: applyGst,
      payment_mode_id: paymentModeId,
      booked_by: bookedByUserId,
      status: 'BOOKED',
      created_at: new Date().toISOString(),
      show_name: startTime ? `${startTime} Show` : 'Show',
      start_time: startTime,
      movie_name: movieName || 'Cinema Movie',
      movie_type_name: movieTypeName,
      screen_name: screenName || 'Screen 1',
      payment_mode_name: pm?.name || 'CASH',
      seats: createdSeats,
      tickets: createdTickets,
    };
  },

  async getBookings(options?: { date?: string; searchQuery?: string }): Promise<Booking[]> {
    await dbService.init();
    const { date, searchQuery } = options || {};

    let sql = `
      SELECT b.*, 
             s.show_name, 
             s.start_time, 
             m.name as movie_name, 
             mt.name as movie_type_name,
             sc.name as screen_name, 
             u.name as booked_by_name, 
             pm.name as payment_mode_name
      FROM bookings b
      LEFT JOIN shows s ON b.show_id = s.id
      LEFT JOIN movies m ON s.movie_id = m.id
      LEFT JOIN movie_types mt ON m.movie_type_id = mt.id
      LEFT JOIN screens sc ON s.screen_id = sc.id
      LEFT JOIN users u ON b.booked_by = u.id
      LEFT JOIN payment_modes pm ON b.payment_mode_id = pm.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      sql += ' AND b.booking_date = ?';
      params.push(date);
    }

    if (searchQuery && searchQuery.trim()) {
      sql += ' AND (b.booking_no LIKE ? OR m.name LIKE ?)';
      const pattern = `%${searchQuery.trim()}%`;
      params.push(pattern, pattern);
    }

    sql += ' ORDER BY b.id DESC';

    const list = dbService.query<Booking>(sql, params);

    // Fetch seats for each booking
    for (const b of list) {
      b.seats = dbService.query<BookingSeat>(`
        SELECT * FROM booking_seats WHERE booking_id = ? ORDER BY id ASC
      `, [b.id]);
    }

    return list;
  },

  async cancelBooking(bookingId: number, reasonId: number, userId: number, reasonText?: string): Promise<boolean> {
    await dbService.init();
    
    // Update booking status
    dbService.run(
      "UPDATE bookings SET status = 'CANCELLED' WHERE id = ?",
      [bookingId]
    );

    // Update tickets
    dbService.run(
      `UPDATE tickets 
       SET is_cancelled = 1, 
           cancelled_at = datetime('now', 'localtime'), 
           cancelled_by = ?, 
           cancel_reason_id = ? 
       WHERE booking_id = ?`,
      [userId, reasonId, bookingId]
    );

    // Log audit
    dbService.run(
      "INSERT INTO audit_logs (user_id, username, action, module, details) VALUES (?, (SELECT username FROM users WHERE id = ?), 'CANCEL_BOOKING', 'cancellation', ?)",
      [userId, userId, `Cancelled booking #${bookingId} - Reason: ${reasonText || reasonId}`]
    );

    return true;
  },

  async getCancellationReasons(): Promise<CancellationReason[]> {
    await dbService.init();
    return dbService.query<CancellationReason>("SELECT * FROM cancellation_reasons WHERE is_active = 1");
  },

  async saveCancellationReason(reasonData: { id?: number; reason: string; is_active?: boolean } | string): Promise<void> {
    await dbService.init();
    if (typeof reasonData === 'string') {
      dbService.run("INSERT INTO cancellation_reasons (reason, is_active) VALUES (?, 1)", [reasonData]);
    } else if (reasonData.id) {
      dbService.run("UPDATE cancellation_reasons SET reason = ?, is_active = ? WHERE id = ?", [reasonData.reason, reasonData.is_active !== false ? 1 : 0, reasonData.id]);
    } else {
      dbService.run("INSERT INTO cancellation_reasons (reason, is_active) VALUES (?, 1)", [reasonData.reason]);
    }
  },

  async deleteCancellationReason(id: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE cancellation_reasons SET is_active = 0 WHERE id = ?", [id]);
  },
};
