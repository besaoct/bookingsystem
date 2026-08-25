-- Offline Cinema Ticketing & Management Database Schema (SQLite)

-- 1. Users and Granular Role Permissions
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

-- 2. Cinema / Theatre Master
CREATE TABLE IF NOT EXISTS cinemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  gstin TEXT NOT NULL,
  cin TEXT,
  logo_path TEXT,
  header_text TEXT,
  contact_numbers TEXT
);

-- 3. Core Masters
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

-- 4. Movies Master
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

-- 5. Shows Master
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

-- 6. Dynamic Seat Layout (Rows & Seats)
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

-- 7. Pricing Master
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

-- 8. Tax / GST Master Configuration
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

-- 9. Other Masters
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

-- 10. Bookings, Booking Seats & Multi-Copy Tickets
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

-- 11. System Settings & Audit Logs
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
