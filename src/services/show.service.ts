import { dbService } from '@/db/sqlite-service';
import { Show } from '@/types';
import { getLocalDateString } from '@/lib/utils';

export const showService = {
  async getShows(options?: { date?: string; screenId?: number; activeOnly?: boolean }): Promise<Show[]> {
    await dbService.init();
    const { date, screenId, activeOnly = true } = options || {};

    let sql = `
      SELECT s.*, 
             m.name as movie_name, 
             m.duration_min as movie_duration,
             mt.name as movie_type_name,
             l.name as language_name,
             c.name as category_name,
             sc.name as screen_name
      FROM shows s
      LEFT JOIN movies m ON s.movie_id = m.id
      LEFT JOIN movie_types mt ON m.movie_type_id = mt.id
      LEFT JOIN languages l ON m.language_id = l.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN screens sc ON s.screen_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND s.is_active = 1';
    }

    if (date) {
      sql += ' AND s.show_date = ?';
      params.push(date);
    }

    if (screenId) {
      sql += ' AND s.screen_id = ?';
      params.push(screenId);
    }

    sql += ' ORDER BY s.start_time ASC, s.id DESC';

    return dbService.query<Show>(sql, params);
  },

  async getShowById(id: number): Promise<Show | null> {
    await dbService.init();
    const sql = `
      SELECT s.*, 
             m.name as movie_name, 
             m.duration_min as movie_duration,
             mt.name as movie_type_name,
             l.name as language_name,
             c.name as category_name,
             sc.name as screen_name
      FROM shows s
      LEFT JOIN movies m ON s.movie_id = m.id
      LEFT JOIN movie_types mt ON m.movie_type_id = mt.id
      LEFT JOIN languages l ON m.language_id = l.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN screens sc ON s.screen_id = sc.id
      WHERE s.id = ?
    `;
    return dbService.queryOne<Show>(sql, [id]);
  },

  async saveShow(show: Partial<Show>): Promise<void> {
    await dbService.init();
    const today = getLocalDateString();
    if (show.id) {
      dbService.run(
        `UPDATE shows 
         SET show_name = ?, screen_id = ?, movie_id = ?, start_time = ?, duration_min = ?, show_date = ?, is_active = ? 
         WHERE id = ?`,
        [
          show.show_name,
          show.screen_id,
          show.movie_id,
          show.start_time,
          show.duration_min || 150,
          show.show_date || today,
          show.is_active ? 1 : 0,
          show.id,
        ]
      );
    } else {
      dbService.run(
        `INSERT INTO shows (show_name, screen_id, movie_id, start_time, duration_min, show_date, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          show.show_name,
          show.screen_id,
          show.movie_id,
          show.start_time,
          show.duration_min || 150,
          show.show_date || today,
        ]
      );
    }
  },

  async deleteShow(id: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE shows SET is_active = 0 WHERE id = ?", [id]);
  },
};
