import initSqlJs, { Database } from 'sql.js';
import { SEED_DATA_SQL } from './seed';

const SCHEMA_SQL = `
-- Users & Permissions
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('SYSTEM_ADMIN', 'OPERATOR')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_create INTEGER NOT NULL DEFAULT 1,
  can_read INTEGER NOT NULL DEFAULT 1,
  can_update INTEGER NOT NULL DEFAULT 1,
  can_delete INTEGER NOT NULL DEFAULT 0,
  UNIQUE(role, module)
);

-- Cinema
CREATE TABLE IF NOT EXISTS cinemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  gstin TEXT NOT NULL,
  cin TEXT,
  logo_path TEXT,
  header_text TEXT,
  footer_text TEXT,
  contact_numbers TEXT
);

-- Masters
CREATE TABLE IF NOT EXISTS distributors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS movie_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS seat_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS screens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Movies
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  distributor_id INTEGER NOT NULL,
  language_id INTEGER NOT NULL,
  movie_type_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  rating TEXT,
  star_cast TEXT,
  duration_min INTEGER NOT NULL DEFAULT 120,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  run INTEGER DEFAULT 1,
  week INTEGER DEFAULT 1,
  no_of_shows INTEGER DEFAULT 4,
  inr_tax_pct REAL DEFAULT 0,
  ms_tax_pct REAL DEFAULT 0,
  is_tax_free INTEGER DEFAULT 0,
  tax_loss_pct REAL DEFAULT 0,
  rebate_cgst INTEGER DEFAULT 0,
  rebate_sgst INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (distributor_id) REFERENCES distributors(id),
  FOREIGN KEY (language_id) REFERENCES languages(id),
  FOREIGN KEY (movie_type_id) REFERENCES movie_types(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Shows
CREATE TABLE IF NOT EXISTS shows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  screen_id INTEGER NOT NULL,
  show_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 120,
  show_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (movie_id) REFERENCES movies(id),
  FOREIGN KEY (screen_id) REFERENCES screens(id)
);

-- Dynamic Seat Layout
CREATE TABLE IF NOT EXISTS seat_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  screen_id INTEGER NOT NULL,
  row_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  FOREIGN KEY (screen_id) REFERENCES screens(id)
);

CREATE TABLE IF NOT EXISTS seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_class_id INTEGER NOT NULL,
  is_aisle INTEGER NOT NULL DEFAULT 0,
  is_blocked INTEGER NOT NULL DEFAULT 0,
  is_wheelchair INTEGER NOT NULL DEFAULT 0,
  pos_x INTEGER NOT NULL DEFAULT 0,
  pos_y INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (row_id) REFERENCES seat_rows(id) ON DELETE CASCADE,
  FOREIGN KEY (seat_class_id) REFERENCES seat_classes(id)
);

-- Pricing
CREATE TABLE IF NOT EXISTS pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seat_class_id INTEGER NOT NULL,
  show_id INTEGER,
  movie_id INTEGER,
  movie_type_id INTEGER,
  base_price REAL NOT NULL,
  service_charge REAL NOT NULL DEFAULT 0,
  cgst_pct REAL NOT NULL DEFAULT 9.0,
  sgst_pct REAL NOT NULL DEFAULT 9.0,
  effective_from TEXT NOT NULL,
  effective_to TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (seat_class_id) REFERENCES seat_classes(id)
);

-- Tax / GST Config
CREATE TABLE IF NOT EXISTS tax_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cgst_pct REAL NOT NULL DEFAULT 9.0,
  sgst_pct REAL NOT NULL DEFAULT 9.0,
  service_charge_amount REAL NOT NULL DEFAULT 12.0,
  service_charge_is_pct INTEGER NOT NULL DEFAULT 0,
  apply_gst_default INTEGER NOT NULL DEFAULT 1,
  gst_on_service_charge INTEGER NOT NULL DEFAULT 0,
  tax_calculation_method TEXT NOT NULL DEFAULT 'INCLUSIVE',
  rounding_rule TEXT NOT NULL DEFAULT 'NORMAL'
);

-- Masters
CREATE TABLE IF NOT EXISTS payment_modes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reason TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ticket_copy_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  copy_name TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  print_order INTEGER NOT NULL DEFAULT 1,
  header_label TEXT NOT NULL,
  purpose TEXT
);

CREATE TABLE IF NOT EXISTS report_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  column_key TEXT NOT NULL UNIQUE,
  column_label TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 1,
  formula TEXT
);

-- Bookings & Tickets
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_no TEXT UNIQUE NOT NULL,
  show_id INTEGER NOT NULL,
  booking_date TEXT NOT NULL,
  total_net REAL NOT NULL,
  total_cgst REAL NOT NULL,
  total_sgst REAL NOT NULL,
  total_service_charge REAL NOT NULL,
  total_gross REAL NOT NULL,
  is_gst_applied INTEGER NOT NULL DEFAULT 1,
  payment_mode_id INTEGER NOT NULL,
  booked_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'BOOKED' CHECK(status IN ('BOOKED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(id),
  FOREIGN KEY (booked_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  seat_id INTEGER NOT NULL,
  row_name TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_class_id INTEGER NOT NULL,
  seat_class_name TEXT NOT NULL,
  price_net REAL NOT NULL,
  cgst REAL NOT NULL,
  sgst REAL NOT NULL,
  service_charge REAL NOT NULL,
  price_gross REAL NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id) REFERENCES seats(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  ticket_no TEXT NOT NULL,
  copy_type TEXT NOT NULL,
  printed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  cancelled_at TEXT,
  cancelled_by INTEGER,
  cancel_reason_id INTEGER,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (cancelled_by) REFERENCES users(id),
  FOREIGN KEY (cancel_reason_id) REFERENCES cancellation_reasons(id)
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL DEFAULT '',
  group_name TEXT NOT NULL DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
`;

const LOCAL_STORAGE_DB_KEY = 'booking_system_db';

class SQLiteService {
  private db: Database | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: () => '/sql-wasm.wasm',
        });

        if (SQL) {
          const savedData = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
          if (savedData) {
            try {
              const binaryArray = new Uint8Array(JSON.parse(savedData));
              this.db = new SQL.Database(binaryArray);
            } catch (e) {
              console.error('Failed to load saved database, initializing fresh', e);
              this.db = new SQL.Database();
            }
          } else {
            this.db = new SQL.Database();
          }

          // Run schema creation (no-op for existing tables)
          this.db!.run(SCHEMA_SQL);

          // Schema migrations: add missing columns to existing tables
          // SQLite does not support ADD COLUMN IF NOT EXISTS, so we try/catch each
          const columnMigrations = [
            "ALTER TABLE languages ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
            "ALTER TABLE movie_types ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
            "ALTER TABLE categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
          ];
          for (const m of columnMigrations) {
            try { this.db!.run(m); } catch (_) { /* column already exists, skip */ }
          }

          // Migrate system_settings from old 'key/value' schema to new schema
          // Detect old schema by checking if 'setting_key' column is missing
          try {
            this.db!.run("SELECT setting_key FROM system_settings LIMIT 1");
          } catch (_) {
            // Old schema detected — migrate data then recreate table
            try {
              const oldRows = this.db!.exec("SELECT key, value FROM system_settings");
              this.db!.run("DROP TABLE IF EXISTS system_settings");
              this.db!.run(`CREATE TABLE system_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL DEFAULT '',
                group_name TEXT NOT NULL DEFAULT 'general'
              )`);
              if (oldRows.length > 0 && oldRows[0].values) {
                for (const row of oldRows[0].values) {
                  try {
                    this.db!.run(
                      "INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)",
                      [String(row[0]), String(row[1])]
                    );
                  } catch (_) { /* skip duplicates */ }
                }
              }
            } catch (e) {
              console.warn('system_settings migration note:', e);
            }
          }

          // Migrate shows table: old schema had start_date/end_date, new has show_date
          try {
            this.db!.run("SELECT show_date FROM shows LIMIT 1");
          } catch (_) {
            // Old schema detected — drop and recreate shows (seed will repopulate)
            try {
              this.db!.run("DROP TABLE IF EXISTS shows");
              this.db!.run(`CREATE TABLE shows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                movie_id INTEGER NOT NULL,
                screen_id INTEGER NOT NULL,
                show_name TEXT NOT NULL,
                start_time TEXT NOT NULL,
                duration_min INTEGER NOT NULL DEFAULT 120,
                show_date TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (movie_id) REFERENCES movies(id),
                FOREIGN KEY (screen_id) REFERENCES screens(id)
              )`);
              // Clear pricing too since show FKs changed
              this.db!.run("DELETE FROM pricing WHERE show_id IS NOT NULL");
              console.info('Migrated shows table from old start_date/end_date schema');
            } catch (e) {
              console.warn('shows migration error:', e);
            }
          }

          // Run declarative seed data (INSERT OR REPLACE — always up to date)
          this.db!.run(SEED_DATA_SQL);

          // Ensure standard role and credential consistency
          try {
            this.db!.run("UPDATE users SET role = 'OPERATOR' WHERE role = 'ADMIN';");
            this.db!.run("UPDATE role_permissions SET role = 'OPERATOR' WHERE role = 'ADMIN';");
            this.db!.run("UPDATE users SET password_hash = 'operator123', role = 'OPERATOR', is_active = 1 WHERE LOWER(TRIM(username)) = 'operator';");
            this.db!.run("UPDATE users SET password_hash = 'admin123', role = 'SYSTEM_ADMIN', is_active = 1 WHERE LOWER(TRIM(username)) = 'sysadmin';");
            this.saveToStorage();
          } catch (e) {
            console.warn('Migration note:', e);
          }

          this.isInitialized = true;
        } else {
          console.error('Failed to instantiate SQL.js database engine');
        }
      } catch (err) {
        console.error('SQLiteService init error:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  public saveToStorage(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const array = Array.from(data);
      localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(array));
    } catch (e) {
      console.error('Failed to persist SQLite database to storage', e);
    }
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const list = this.query<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  public run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    const idRes = this.db.exec("SELECT last_insert_rowid() as id, changes() as changes;");
    const lastInsertRowid = Number(idRes[0]?.values[0]?.[0] || 0);
    const changes = Number(idRes[0]?.values[0]?.[1] || 0);
    this.saveToStorage();
    return { lastInsertRowid, changes };
  }

  public exec(sql: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql);
    this.saveToStorage();
  }

  public exportBackup(): Uint8Array {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export();
  }

  public async restoreBackup(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });
    this.db = new SQL.Database(data);
    this.saveToStorage();
  }

  public async resetToDefaultSeed(): Promise<void> {
    // Wipe the stored database entirely and start fresh
    localStorage.removeItem(LOCAL_STORAGE_DB_KEY);

    const SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });

    // Create a completely new blank database
    this.db = new SQL.Database();

    // Run schema (creates all tables fresh)
    this.db.run(SCHEMA_SQL);

    // Apply column migrations on the fresh schema (no-ops since schema is new, but kept for consistency)
    const colMigrations = [
      "ALTER TABLE languages ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
      "ALTER TABLE movie_types ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
      "ALTER TABLE categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
    ];
    for (const m of colMigrations) {
      try { this.db.run(m); } catch (_) { /* already added by schema */ }
    }

    // Insert fresh seed data
    this.db.run(SEED_DATA_SQL);

    this.saveToStorage();
    this.isInitialized = true;
    this.initPromise = Promise.resolve();
  }
}

export const dbService = new SQLiteService();
