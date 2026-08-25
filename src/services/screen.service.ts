import { dbService } from '@/db/sqlite-service';
import { Screen, SeatClass, SeatRow, Seat } from '@/types';

export const screenService = {
  async getScreens(activeOnly = true): Promise<Screen[]> {
    await dbService.init();
    const sql = `SELECT * FROM screens ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY id ASC`;
    return dbService.query<Screen>(sql);
  },

  async getScreenById(id: number): Promise<Screen | null> {
    await dbService.init();
    return dbService.queryOne<Screen>("SELECT * FROM screens WHERE id = ?", [id]);
  },

  async saveScreen(screen: Partial<Screen>): Promise<number> {
    await dbService.init();
    if (screen.id) {
      dbService.run(
        "UPDATE screens SET name = ?, capacity = ?, is_active = ? WHERE id = ?",
        [screen.name, screen.capacity || 140, screen.is_active ? 1 : 0, screen.id]
      );
      return screen.id;
    } else {
      dbService.run(
        "INSERT INTO screens (name, capacity, is_active) VALUES (?, ?, 1)",
        [screen.name, screen.capacity || 140]
      );
      const inserted = dbService.queryOne<{ id: number }>("SELECT last_insert_rowid() as id");
      return inserted?.id || 0;
    }
  },

  async deleteScreen(id: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE screens SET is_active = 0 WHERE id = ?", [id]);
  },

  async getSeatClasses(activeOnly = false): Promise<SeatClass[]> {
    await dbService.init();
    const sql = `SELECT * FROM seat_classes ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY display_order ASC`;
    return dbService.query<SeatClass>(sql);
  },

  async saveSeatClass(sc: Partial<SeatClass>): Promise<void> {
    await dbService.init();
    if (sc.id) {
      dbService.run(
        "UPDATE seat_classes SET name = ?, color = ?, display_order = ?, is_active = ? WHERE id = ?",
        [sc.name, sc.color || '#3b82f6', sc.display_order || 1, sc.is_active ? 1 : 0, sc.id]
      );
    } else {
      dbService.run(
        "INSERT INTO seat_classes (name, color, display_order, is_active) VALUES (?, ?, ?, 1)",
        [sc.name, sc.color || '#3b82f6', sc.display_order || 1]
      );
    }
  },

  async deleteSeatClass(id: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE seat_classes SET is_active = 0 WHERE id = ?", [id]);
  },

  async getScreenSeatRows(screenId: number): Promise<SeatRow[]> {
    await dbService.init();
    return dbService.query<SeatRow>(
      "SELECT * FROM seat_rows WHERE screen_id = ? ORDER BY display_order ASC",
      [screenId]
    );
  },

  async getScreenSeats(screenId: number): Promise<any[]> {
    await dbService.init();
    const sql = `
      SELECT s.*, 
             sr.row_name, 
             sr.display_order as row_order, 
             sc.name as seat_class_name, 
             sc.color as seat_class_color
      FROM seats s
      JOIN seat_rows sr ON s.row_id = sr.id
      JOIN seat_classes sc ON s.seat_class_id = sc.id
      WHERE sr.screen_id = ?
      ORDER BY sr.display_order ASC, s.seat_number ASC
    `;
    return dbService.query<any>(sql, [screenId]);
  },

  async saveScreenLayout(
    screenId: number,
    rows: Array<{
      row_name: string;
      row_order: number;
      seats: Array<{ seat_number: number; seat_class_id: number; is_active: boolean }>;
    }>
  ): Promise<void> {
    await dbService.init();
    // Delete existing seats & rows for this screen
    const existingRows = dbService.query<SeatRow>("SELECT id FROM seat_rows WHERE screen_id = ?", [screenId]);
    for (const r of existingRows) {
      dbService.run("DELETE FROM seats WHERE row_id = ?", [r.id]);
    }
    dbService.run("DELETE FROM seat_rows WHERE screen_id = ?", [screenId]);

    // Insert new rows & seats
    let totalSeats = 0;
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const displayOrder = row.row_order || rIdx + 1;
      dbService.run(
        "INSERT INTO seat_rows (screen_id, row_name, display_order) VALUES (?, ?, ?)",
        [screenId, row.row_name, displayOrder]
      );
      const rowIdRes = dbService.queryOne<{ id: number }>("SELECT last_insert_rowid() as id");
      const rowId = rowIdRes?.id;

      if (rowId) {
        for (let sIdx = 0; sIdx < row.seats.length; sIdx++) {
          const seat = row.seats[sIdx];
          const isBlocked = seat.is_active === false ? 1 : 0;
          dbService.run(
            "INSERT INTO seats (row_id, seat_number, seat_class_id, is_aisle, is_blocked, is_wheelchair, pos_x, pos_y) VALUES (?, ?, ?, 0, ?, 0, ?, ?)",
            [rowId, seat.seat_number, seat.seat_class_id, isBlocked, sIdx + 1, displayOrder]
          );
          if (!isBlocked) totalSeats++;
        }
      }
    }

    dbService.run("UPDATE screens SET capacity = ? WHERE id = ?", [totalSeats, screenId]);
  },

  async addRowToScreen(screenId: number, rowName: string, seatsCount: number, seatClassId: number): Promise<void> {
    await dbService.init();
    const rows = await this.getScreenSeatRows(screenId);
    const nextOrder = rows.length + 1;

    const rowRes = dbService.run(
      "INSERT INTO seat_rows (screen_id, row_name, display_order) VALUES (?, ?, ?)",
      [screenId, rowName.toUpperCase(), nextOrder]
    );
    const newRowId = rowRes.lastInsertRowid;

    for (let i = 1; i <= seatsCount; i++) {
      dbService.run(
        "INSERT INTO seats (row_id, seat_number, seat_class_id, is_aisle, is_blocked, is_wheelchair, pos_x, pos_y) VALUES (?, ?, ?, 0, 0, 0, ?, ?)",
        [newRowId, i, seatClassId, i, nextOrder]
      );
    }

    // Update screen capacity
    const countRes = dbService.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM seats s JOIN seat_rows r ON s.row_id = r.id WHERE r.screen_id = ? AND s.is_blocked = 0",
      [screenId]
    );
    if (countRes) {
      dbService.run("UPDATE screens SET capacity = ? WHERE id = ?", [countRes.count, screenId]);
    }
  },

  async updateRowSeatClass(rowId: number, seatClassId: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE seats SET seat_class_id = ? WHERE row_id = ?", [seatClassId, rowId]);
  },

  async updateSeatClass(seatId: number, seatClassId: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE seats SET seat_class_id = ? WHERE id = ?", [seatClassId, seatId]);
  },

  async deleteRow(rowId: number, screenId?: number): Promise<void> {
    await dbService.init();
    dbService.run("DELETE FROM seats WHERE row_id = ?", [rowId]);
    dbService.run("DELETE FROM seat_rows WHERE id = ?", [rowId]);

    if (screenId) {
      const countRes = dbService.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM seats s JOIN seat_rows r ON s.row_id = r.id WHERE r.screen_id = ? AND s.is_blocked = 0",
        [screenId]
      );
      if (countRes) {
        dbService.run("UPDATE screens SET capacity = ? WHERE id = ?", [countRes.count, screenId]);
      }
    }
  },

  async toggleSeatAisle(seatId: number, currentAisle: boolean): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE seats SET is_aisle = ? WHERE id = ?", [currentAisle ? 0 : 1, seatId]);
  },

  async toggleSeatBlocked(seatId: number, currentBlocked: boolean): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE seats SET is_blocked = ? WHERE id = ?", [currentBlocked ? 0 : 1, seatId]);
  },

  async toggleSeatWheelchair(seatId: number, currentWheelchair: boolean): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE seats SET is_wheelchair = ? WHERE id = ?", [currentWheelchair ? 0 : 1, seatId]);
  },
};
