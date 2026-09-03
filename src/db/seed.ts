// Database Seeding & Clean Baseline Logic for Offline Cinema Ticketing & Management System

export const CLEAN_SYSTEM_BASELINE_SQL = `
-- 1. Base Role Permissions Matrix
INSERT OR IGNORE INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete) VALUES
(1, 'SYSTEM_ADMIN', 'movies', 1, 1, 1, 1),
(2, 'SYSTEM_ADMIN', 'shows', 1, 1, 1, 1),
(3, 'SYSTEM_ADMIN', 'seat_layout', 1, 1, 1, 1),
(4, 'SYSTEM_ADMIN', 'pricing', 1, 1, 1, 1),
(5, 'SYSTEM_ADMIN', 'taxes', 1, 1, 1, 1),
(6, 'SYSTEM_ADMIN', 'booking', 1, 1, 1, 1),
(7, 'SYSTEM_ADMIN', 'cancellation', 1, 1, 1, 1),
(8, 'SYSTEM_ADMIN', 'reports', 1, 1, 1, 1),
(9, 'SYSTEM_ADMIN', 'settings', 1, 1, 1, 1),
(10, 'SYSTEM_ADMIN', 'master_others', 1, 1, 1, 1),
(11, 'SYSTEM_ADMIN', 'users', 1, 1, 1, 1),
(12, 'SYSTEM_ADMIN', 'audit_backup', 1, 1, 1, 1),
(13, 'SYSTEM_ADMIN', 'system_settings', 1, 1, 1, 1),

(14, 'OPERATOR', 'booking', 1, 1, 1, 0),
(15, 'OPERATOR', 'cancellation', 1, 1, 0, 0),
(16, 'OPERATOR', 'reports', 0, 0, 0, 0),
(17, 'OPERATOR', 'movies', 0, 0, 0, 0),
(18, 'OPERATOR', 'shows', 0, 0, 0, 0),
(19, 'OPERATOR', 'seat_layout', 0, 0, 0, 0),
(20, 'OPERATOR', 'pricing', 0, 0, 0, 0),
(21, 'OPERATOR', 'taxes', 0, 0, 0, 0),
(22, 'OPERATOR', 'settings', 0, 0, 0, 0),
(23, 'OPERATOR', 'master_others', 0, 0, 0, 0),
(24, 'OPERATOR', 'users', 0, 0, 0, 0),
(25, 'OPERATOR', 'audit_backup', 0, 0, 0, 0),
(26, 'OPERATOR', 'system_settings', 0, 0, 0, 0);

-- 2. Blank Cinema Master Skeleton
INSERT OR IGNORE INTO cinemas (id, name, address, gstin, cin, header_text, contact_numbers, show_gstin_on_ticket) VALUES
(1, 'Nakshatra Cinemas', 'NT Road, North Lakhimpur, Assam', '18AJVPD0031E3ZI', '0', 'NAKSHATRA CINEMAS - LAKHIMPUR', '6001884647', 1);

-- 3. Core Standard System Lookups
INSERT OR IGNORE INTO languages (id, name, is_active) VALUES
(1, 'Hindi', 1),
(2, 'English', 1),
(3, 'Assamese', 1),
(4, 'Bengali', 1),
(5, 'Tamil', 1),
(6, 'Telugu', 1),
(7, 'Malayalam', 1),
(8, 'Marathi', 1),
(9, 'Kannada', 1),
(10, 'Punjabi', 1),
(11, 'Gujarati', 1);

INSERT OR IGNORE INTO movie_types (id, name, is_active) VALUES
(1, '2D', 1),
(2, '3D', 1),
(3, '4DX', 1),
(4, 'IMAX 2D', 1),
(5, 'IMAX 3D', 1),
(6, 'ICE', 1),
(7, 'ScreenX', 1);

INSERT OR IGNORE INTO categories (id, name, is_active) VALUES
(1, 'U', 1),
(2, 'UA', 1),
(3, 'A', 1),
(4, 'S', 1);

INSERT OR IGNORE INTO seat_classes (id, name, color, display_order, is_active) VALUES
(1, 'Gold Plus', '#f59e0b', 1, 1),
(2, 'Gold', '#eab308', 2, 1),
(3, 'Platinum', '#64748b', 3, 1),
(4, 'Silver', '#94a3b8', 4, 1),
(5, 'Recliner', '#8b5cf6', 5, 1),
(6, 'Balcony', '#06b6d4', 6, 1),
(7, 'Box', '#ec4899', 7, 1);

-- 4. Tax / GST Master Configuration
INSERT OR IGNORE INTO tax_configs (id, cgst_pct, sgst_pct, service_charge_amount, service_charge_is_pct, apply_gst_default, gst_on_service_charge, tax_calculation_method, rounding_rule) VALUES
(1, 9.0, 9.0, 0.0, 0, 1, 0, 'INCLUSIVE', 'NORMAL');

-- 5. Payment Modes
INSERT OR IGNORE INTO payment_modes (id, name, is_active) VALUES
(1, 'Cash', 1),
(2, 'UPI / QR', 1),
(3, 'Credit / Debit Card', 1),
(4, 'Online / Booking Partner', 1);

-- 6. Cancellation Reasons
INSERT OR IGNORE INTO cancellation_reasons (id, reason, is_active) VALUES
(1, 'Customer requested refund before show start', 1),
(2, 'Wrong show timing or movie selected', 1),
(3, 'Technical breakdown / Power outage', 1),
(4, 'Show cancelled by cinema administration', 1),
(5, 'Duplicate booking created by mistake', 1);

-- 7. Ticket Copy Configurations
INSERT OR IGNORE INTO ticket_copy_configs (id, copy_name, is_enabled, print_order, header_label, purpose) VALUES
(1, 'Security', 1, 1, 'S', 'Security Gate Pass'),
(2, 'Office', 1, 2, 'O', 'Office / Accounts Copy'),
(3, 'Customer', 1, 3, 'C', 'Customer Entry Ticket');

-- 8. Report Parameters for Daily Collection Report (DCR)
INSERT OR IGNORE INTO report_parameters (id, column_key, column_label, is_visible, display_order, formula) VALUES
(1, 'seat_class_name', 'Class', 1, 1, 'RAW'),
(2, 'opening_no', 'Opening No', 1, 2, 'MIN_TICKET_NO'),
(3, 'closing_no', 'Closing No', 1, 3, 'MAX_TICKET_NO'),
(4, 'rate', 'Rate', 1, 4, 'BASE_PRICE'),
(5, 'total_sold', 'Total Sold', 1, 5, 'COUNT_SEATS'),
(6, 'net_amount', 'Net', 1, 6, 'SUM_NET'),
(7, 'cgst_amount', 'CGST', 1, 7, 'SUM_CGST'),
(8, 'sgst_amount', 'SGST', 1, 8, 'SUM_SGST'),
(9, 'total_tax', 'Total Tax', 1, 9, 'SUM_TAX'),
(10, 'gross_receipts', 'Gross Receipts', 1, 10, 'SUM_GROSS'),
(11, 'service_charge', 'Service Charge', 1, 11, 'SUM_SC'),
(12, 'cess', 'Cess', 1, 12, 'SUM_CESS'),
(13, 'tax_on_sc', 'Tax on SC', 1, 13, 'SUM_SC_TAX');

-- 9. System Settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, group_name) VALUES
('ticket_layout_mode', 'side-by-side-x', 'printer'),
('ticket_width_cm', '10.2', 'printer'),
('ticket_height_cm', '10.2', 'printer'),
('ticket_orientation', 'portrait', 'printer'),
('ticket_rotation', '0', 'printer'),
('ticket_margin_mm', '1.5', 'printer'),
('ticket_font_scale', '100', 'printer'),
('ticket_auto_cut', 'false', 'printer'),
('ticket_font_family', 'system-sans', 'printer'),
('ticket_font_size_pt', '8.0', 'printer'),
('ticket_font_weight', '600', 'printer'),
('thermal_printer_name', 'Default Thermal POS-80', 'printer'),
('silent_print', 'false', 'printer'),
('default_gst_enabled', 'true', 'tax'),
('allow_operator_gst_toggle', 'true', 'tax'),
('auto_reprint_copies', '3', 'printer'),
('financial_year', '2026-2027', 'general'),
('invoice_series', 'NC-LKP-26', 'general'),
('session_timeout_min', '480', 'general');
`;

export const SEED_DATA_SQL = `
-- 1. Default Users (Initial setup: admin123 / operator123)
INSERT OR IGNORE INTO users (id, username, password_hash, name, role, is_active) VALUES
(1, 'sysadmin', 'admin123', 'System Administrator', 'SYSTEM_ADMIN', 1),
(2, 'operator', 'operator123', 'Box Office Operator', 'OPERATOR', 1);

-- 2. Role Permissions Matrix
INSERT OR IGNORE INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete) VALUES
(1, 'SYSTEM_ADMIN', 'movies', 1, 1, 1, 1),
(2, 'SYSTEM_ADMIN', 'shows', 1, 1, 1, 1),
(3, 'SYSTEM_ADMIN', 'seat_layout', 1, 1, 1, 1),
(4, 'SYSTEM_ADMIN', 'pricing', 1, 1, 1, 1),
(5, 'SYSTEM_ADMIN', 'taxes', 1, 1, 1, 1),
(6, 'SYSTEM_ADMIN', 'booking', 1, 1, 1, 1),
(7, 'SYSTEM_ADMIN', 'cancellation', 1, 1, 1, 1),
(8, 'SYSTEM_ADMIN', 'reports', 1, 1, 1, 1),
(9, 'SYSTEM_ADMIN', 'settings', 1, 1, 1, 1),
(10, 'SYSTEM_ADMIN', 'master_others', 1, 1, 1, 1),
(11, 'SYSTEM_ADMIN', 'users', 1, 1, 1, 1),
(12, 'SYSTEM_ADMIN', 'audit_backup', 1, 1, 1, 1),
(13, 'SYSTEM_ADMIN', 'system_settings', 1, 1, 1, 1),

(14, 'OPERATOR', 'booking', 1, 1, 1, 0),
(15, 'OPERATOR', 'cancellation', 1, 1, 0, 0),
(16, 'OPERATOR', 'reports', 0, 0, 0, 0),
(17, 'OPERATOR', 'movies', 0, 0, 0, 0),
(18, 'OPERATOR', 'shows', 0, 0, 0, 0),
(19, 'OPERATOR', 'seat_layout', 0, 0, 0, 0),
(20, 'OPERATOR', 'pricing', 0, 0, 0, 0),
(21, 'OPERATOR', 'taxes', 0, 0, 0, 0),
(22, 'OPERATOR', 'settings', 0, 0, 0, 0),
(23, 'OPERATOR', 'master_others', 0, 0, 0, 0),
(24, 'OPERATOR', 'users', 0, 0, 0, 0),
(25, 'OPERATOR', 'audit_backup', 0, 0, 0, 0),
(26, 'OPERATOR', 'system_settings', 0, 0, 0, 0);

-- 3. Cinema Details
INSERT OR IGNORE INTO cinemas (id, name, address, gstin, cin, header_text, contact_numbers, show_gstin_on_ticket) VALUES
(1, 'Nakshatra Cinemas', 'NT Road, North Lakhimpur, Assam', '18AJVPD0031E3ZI', '0', 'NAKSHATRA CINEMAS - LAKHIMPUR', '6001884647', 1);

-- 4. Core Masters & Catalogs
INSERT OR IGNORE INTO languages (id, name, is_active) VALUES
(1, 'Hindi', 1),
(2, 'English', 1),
(3, 'Assamese', 1),
(4, 'Bengali', 1),
(5, 'Tamil', 1),
(6, 'Telugu', 1),
(7, 'Malayalam', 1),
(8, 'Marathi', 1),
(9, 'Kannada', 1),
(10, 'Punjabi', 1),
(11, 'Gujarati', 1);

INSERT OR IGNORE INTO movie_types (id, name, is_active) VALUES
(1, '2D', 1),
(2, '3D', 1),
(3, '4DX', 1),
(4, 'IMAX 2D', 1),
(5, 'IMAX 3D', 1),
(6, 'ICE', 1),
(7, 'ScreenX', 1);

INSERT OR IGNORE INTO categories (id, name, is_active) VALUES
(1, 'U', 1),
(2, 'UA', 1),
(3, 'A', 1),
(4, 'S', 1);

INSERT OR IGNORE INTO distributors (id, name, contact_person, phone, is_active) VALUES
(1, 'GOENKA ENTERPRISES', 'R. Goenka', '9811122334', 1),
(2, 'Sony Pictures Entertainment', 'Rajiv Sharma', '9822233445', 1),
(3, 'Yash Raj Films Distribution', 'Anil Mehta', '9833344556', 1),
(4, 'Dharma Productions', 'Vikram Sen', '9844455667', 1),
(5, 'Warner Bros India', 'Sanjay Dutt', '9855566778', 1),
(6, 'Zee Studios', 'Alok Nath', '9866677889', 1),
(7, 'Pen Marudhar Entertainment', 'Mukesh Bhatt', '9877788990', 1),
(8, 'PVR Inox Pictures', 'Kamal Gianchandani', '9888899001', 1);

INSERT OR IGNORE INTO seat_classes (id, name, color, display_order, is_active) VALUES
(1, 'Gold Plus', '#f59e0b', 1, 1),
(2, 'Gold', '#eab308', 2, 1),
(3, 'Platinum', '#64748b', 3, 1),
(4, 'Silver', '#94a3b8', 4, 1),
(5, 'Recliner', '#8b5cf6', 5, 1),
(6, 'Balcony', '#06b6d4', 6, 1),
(7, 'Box', '#ec4899', 7, 1);

INSERT OR IGNORE INTO screens (id, name, capacity, is_active) VALUES
(1, 'Nakshatra', 10, 1);

-- 5. Exact 10 Seat Layout for Screen 1 (A BOX 4, B BOX 3, C BOX 3)
INSERT OR IGNORE INTO seat_rows (id, screen_id, row_name, display_order) VALUES
(1, 1, 'A', 1),
(2, 1, 'B', 2),
(3, 1, 'C', 3);

INSERT OR IGNORE INTO seats (id, row_id, seat_number, seat_class_id, is_aisle, is_blocked, is_wheelchair, pos_x, pos_y) VALUES
-- Row A (4 seats: A BOX 4)
(1, 1, 1, 7, 0, 0, 0, 1, 1),
(2, 1, 2, 7, 0, 0, 0, 2, 1),
(3, 1, 3, 7, 0, 0, 0, 3, 1),
(4, 1, 4, 7, 0, 0, 0, 4, 1),
-- Row B (3 seats: B BOX 3)
(5, 2, 1, 7, 0, 0, 0, 1, 2),
(6, 2, 2, 7, 0, 0, 0, 2, 2),
(7, 2, 3, 7, 0, 0, 0, 3, 2),
-- Row C (3 seats: C BOX 3)
(8, 3, 1, 7, 0, 0, 0, 1, 3),
(9, 3, 2, 7, 0, 0, 0, 2, 3),
(10, 3, 3, 7, 0, 0, 0, 3, 3);

-- 6. Movie Catalog
INSERT OR IGNORE INTO movies (id, name, distributor_id, language_id, movie_type_id, category_id, rating, star_cast, duration_min, start_date, end_date, run, week, no_of_shows, inr_tax_pct, ms_tax_pct, is_tax_free, tax_loss_pct, rebate_cgst, rebate_sgst, is_active) VALUES
(1, 'Spider-Man : Brand New Day 3D', 1, 2, 2, 2, 'UA', 'Tom Holland, Zendaya, Jacob Batalon', 150, date('now', 'localtime', '-10 days'), date('now', 'localtime', '+60 days'), 1, 1, 4, 0, 0, 0, 0, 0, 0, 1),
(2, 'Kalki 2898 AD 3D', 2, 1, 2, 2, 'UA', 'Prabhas, Deepika Padukone, Amitabh Bachchan, Kamal Haasan', 180, date('now', 'localtime', '-10 days'), date('now', 'localtime', '+60 days'), 1, 1, 4, 0, 0, 0, 0, 0, 0, 1),
(3, 'Stree 2', 6, 1, 1, 2, 'UA', 'Rajkummar Rao, Shraddha Kapoor, Pankaj Tripathi', 147, date('now', 'localtime', '-5 days'), date('now', 'localtime', '+60 days'), 1, 1, 4, 0, 0, 0, 0, 0, 0, 1),
(4, 'Devara : Part 1 2D', 4, 6, 1, 2, 'UA', 'NTR Jr, Janhvi Kapoor, Saif Ali Khan', 178, date('now', 'localtime', '-3 days'), date('now', 'localtime', '+90 days'), 1, 1, 4, 0, 0, 0, 0, 0, 0, 1),
(5, 'Pushpa 2 : The Rule 2D', 3, 6, 1, 2, 'UA', 'Allu Arjun, Rashmika Mandanna, Fahadh Faasil', 190, date('now', 'localtime', '-3 days'), date('now', 'localtime', '+90 days'), 1, 1, 4, 0, 0, 0, 0, 0, 0, 1);

-- 7. Show Timings
INSERT OR IGNORE INTO shows (id, movie_id, screen_id, show_name, start_time, duration_min, show_date, is_active) VALUES
(1, 1, 1, 'Morning', '11:30 AM', 150, date('now', 'localtime'), 1),
(2, 1, 1, 'Matinee', '02:45 PM', 150, date('now', 'localtime'), 1),
(3, 2, 1, 'Evening', '06:15 PM', 180, date('now', 'localtime'), 1),
(4, 3, 1, 'Night', '09:30 PM', 147, date('now', 'localtime'), 1),
(5, 4, 1, 'Late Matinee', '05:00 PM', 178, date('now', 'localtime', '+1 day'), 1),
(6, 5, 1, 'Late Night', '08:30 PM', 190, date('now', 'localtime', '+1 day'), 1);

-- 8. Dynamic Pricing Master
INSERT OR IGNORE INTO pricing (id, seat_class_id, show_id, base_price, service_charge, cgst_pct, sgst_pct, effective_from, effective_to, is_active) VALUES
(1, 1, NULL, 150.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(2, 2, NULL, 130.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(3, 3, NULL, 140.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(4, 4, NULL, 100.00, 10.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(5, 5, NULL, 250.00, 15.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(6, 6, NULL, 160.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(7, 7, NULL, 160.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),

(8, 1, 1, 150.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(9, 2, 1, 130.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(10, 3, 1, 140.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(11, 4, 1, 100.00, 10.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),

(12, 1, 2, 180.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(13, 2, 2, 150.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(14, 3, 2, 160.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(15, 4, 2, 110.00, 10.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),

(16, 1, 3, 200.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(17, 2, 3, 170.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(18, 3, 3, 180.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(19, 4, 3, 120.00, 10.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),

(20, 1, 4, 180.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(21, 2, 4, 150.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(22, 3, 4, 160.00, 12.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1),
(23, 4, 4, 110.00, 10.00, 9.0, 9.0, '2026-01-01', '2099-12-31', 1);

-- 9. Tax / GST Master Configuration
INSERT OR IGNORE INTO tax_configs (id, cgst_pct, sgst_pct, service_charge_amount, service_charge_is_pct, apply_gst_default, gst_on_service_charge, tax_calculation_method, rounding_rule) VALUES
(1, 9.0, 9.0, 12.0, 0, 1, 0, 'INCLUSIVE', 'NORMAL');

-- 10. Payment Modes
INSERT OR IGNORE INTO payment_modes (id, name, is_active) VALUES
(1, 'Cash', 1),
(2, 'UPI / QR', 1),
(3, 'Credit / Debit Card', 1),
(4, 'Online / Booking Partner', 1);

-- 11. Cancellation Reasons
INSERT OR IGNORE INTO cancellation_reasons (id, reason, is_active) VALUES
(1, 'Customer requested refund before show start', 1),
(2, 'Wrong show timing or movie selected', 1),
(3, 'Technical breakdown / Power outage', 1),
(4, 'Show cancelled by cinema administration', 1),
(5, 'Duplicate booking created by mistake', 1);

-- 12. Ticket Copy Configurations
INSERT OR IGNORE INTO ticket_copy_configs (id, copy_name, is_enabled, print_order, header_label, purpose) VALUES
(1, 'Security', 1, 1, 'S', 'Security Gate Pass'),
(2, 'Office', 1, 2, 'O', 'Office / Accounts Copy'),
(3, 'Customer', 1, 3, 'C', 'Customer Entry Ticket');

-- 13. Report Parameters for Daily Collection Report (DCR)
INSERT OR IGNORE INTO report_parameters (id, column_key, column_label, is_visible, display_order, formula) VALUES
(1, 'seat_class_name', 'Class', 1, 1, 'RAW'),
(2, 'opening_no', 'Opening No', 1, 2, 'MIN_TICKET_NO'),
(3, 'closing_no', 'Closing No', 1, 3, 'MAX_TICKET_NO'),
(4, 'rate', 'Rate', 1, 4, 'BASE_PRICE'),
(5, 'total_sold', 'Total Sold', 1, 5, 'COUNT_SEATS'),
(6, 'net_amount', 'Net', 1, 6, 'SUM_NET'),
(7, 'cgst_amount', 'CGST', 1, 7, 'SUM_CGST'),
(8, 'sgst_amount', 'SGST', 1, 8, 'SUM_SGST'),
(9, 'total_tax', 'Total Tax', 1, 9, 'SUM_TAX'),
(10, 'gross_receipts', 'Gross Receipts', 1, 10, 'SUM_GROSS'),
(11, 'service_charge', 'Service Charge', 1, 11, 'SUM_SC'),
(12, 'cess', 'Cess', 1, 12, 'SUM_CESS'),
(13, 'tax_on_sc', 'Tax on SC', 1, 13, 'SUM_SC_TAX');

-- 14. System Settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, group_name) VALUES
('ticket_layout_mode', 'side-by-side-x', 'printer'),
('ticket_width_cm', '10.2', 'printer'),
('ticket_height_cm', '10.2', 'printer'),
('ticket_orientation', 'portrait', 'printer'),
('ticket_rotation', '0', 'printer'),
('ticket_margin_mm', '1.5', 'printer'),
('ticket_font_scale', '100', 'printer'),
('ticket_auto_cut', 'false', 'printer'),
('ticket_feed_lines', '0', 'printer'),
('ticket_font_family', 'system-sans', 'printer'),
('ticket_font_size_pt', '8.0', 'printer'),
('ticket_font_weight', '600', 'printer'),
('thermal_printer_name', 'Default Thermal POS-80', 'printer'),
('silent_print', 'false', 'printer'),
('default_gst_enabled', 'true', 'tax'),
('allow_operator_gst_toggle', 'true', 'tax'),
('auto_reprint_copies', '3', 'printer'),
('financial_year', '2026-2027', 'general'),
('invoice_series', 'NC-LKP-26', 'general'),
('session_timeout_min', '480', 'general');
`;
