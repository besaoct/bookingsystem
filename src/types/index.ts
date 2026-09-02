// User & Permissions Types
export type UserRole = 'SYSTEM_ADMIN' | 'OPERATOR';

export interface User {
  id: number;
  username: string;
  password_hash?: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface RolePermission {
  id: number;
  role: UserRole;
  module: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

// Master Entities
export interface Cinema {
  id: number;
  name: string;
  address: string;
  gstin: string;
  cin?: string;
  logo_path?: string;
  header_text?: string;
  contact_numbers?: string;
  show_gstin_on_ticket?: boolean;
}

export interface Distributor {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  is_active: boolean;
}

export interface Language {
  id: number;
  name: string;
  is_active?: boolean;
}

export interface MovieType {
  id: number;
  name: string; // 2D, 3D, IMAX, 4DX
  is_active?: boolean;
}

export interface Category {
  id: number;
  name: string; // U, UA, A, S
  is_active?: boolean;
}

export type MovieCategory = Category;

export interface SeatClass {
  id: number;
  name: string; // Gold Plus, Gold, Platinum1, Platinum2, Silver
  color: string; // Hex color code for seat map
  display_order: number;
  is_active: boolean;
}

export interface Screen {
  id: number;
  name: string;
  capacity: number;
  is_active: boolean;
}

// Movie Master
export interface Movie {
  id: number;
  name: string;
  distributor_id: number;
  language_id: number;
  movie_type_id: number;
  category_id: number;
  rating?: string;
  star_cast?: string;
  duration_min: number;
  start_date: string;
  end_date: string;
  run?: number;
  week?: number;
  no_of_shows?: number;
  inr_tax_pct?: number;
  ms_tax_pct?: number;
  is_tax_free?: boolean;
  tax_loss_pct?: number;
  rebate_cgst?: boolean;
  rebate_sgst?: boolean;
  is_active: boolean;
  created_at?: string;

  // Populated fields from joins
  distributor_name?: string;
  language_name?: string;
  movie_type_name?: string;
  category_name?: string;
}

// Show Timing Master
export interface Show {
  id: number;
  movie_id: number;
  screen_id: number;
  show_name: string; // Morning, Matinee, Evening, Night
  start_time: string; // e.g. "11:30 AM" or "11:30"
  duration_min: number;
  show_date: string; // YYYY-MM-DD
  is_active: boolean;

  // Populated fields
  movie_name?: string;
  movie_type_name?: string;
  screen_name?: string;
}

// Dynamic Seat Layout Architecture
export interface SeatRow {
  id: number;
  screen_id: number;
  row_name: string; // A, B, K, AA etc.
  display_order: number;
}

export type SeatStatus = 'AVAILABLE' | 'SELECTED' | 'BOOKED' | 'BLOCKED' | 'AISLE';

export interface Seat {
  id: number;
  row_id: number;
  row_name?: string;
  seat_number: number;
  seat_class_id: number;
  seat_class_name?: string;
  seat_class_color?: string;
  is_aisle: boolean;
  is_blocked: boolean;
  is_wheelchair: boolean;
  pos_x: number;
  pos_y: number;
  
  // Dynamic runtime status (single source of truth)
  status?: SeatStatus;
  price?: number;
}

// Pricing Master
export interface Pricing {
  id: number;
  seat_class_id: number;
  show_id?: number;
  movie_id?: number;
  movie_type_id?: number;
  base_price: number;
  service_charge: number;
  cgst_pct: number;
  sgst_pct: number;
  effective_from: string;
  effective_to: string;
  is_active: boolean;

  // Joined fields
  seat_class_name?: string;
  show_name?: string;
  start_time?: string;
}

export type PricingRule = Pricing;

// Tax / GST Master Configuration
export interface TaxConfig {
  id: number;
  cgst_pct: number;
  sgst_pct: number;
  service_charge_amount: number;
  service_charge_is_pct: boolean;
  apply_gst_default: boolean;
  gst_on_service_charge: boolean;
  tax_calculation_method: 'INCLUSIVE' | 'EXCLUSIVE';
  rounding_rule: 'NORMAL' | 'FLOOR' | 'CEILING';
}

export interface PaymentMode {
  id: number;
  name: string; // Cash, UPI, Card
  is_active: boolean;
}

export interface CancellationReason {
  id: number;
  reason: string;
  is_active: boolean;
}

export interface TicketCopyConfig {
  id: number;
  copy_name: string; // Customer, Office, Security, Extra
  is_enabled: boolean;
  print_order: number;
  header_label: string; // CUSTOMER, OFFICE, SECURITY
  purpose: string;
}

// Bookings and Tickets
export type BookingStatus = 'BOOKED' | 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: number;
  booking_no: string;
  booking_ref?: string;
  show_id: number;
  booking_date: string;
  total_net: number;
  total_cgst: number;
  total_sgst: number;
  total_service_charge: number;
  total_gross: number;
  is_gst_applied: boolean;
  payment_mode_id: number;
  booked_by: number;
  status: BookingStatus;
  customer_phone?: string;
  created_at: string;
  updated_at?: string;

  // Joined fields
  show_name?: string;
  start_time?: string;
  movie_name?: string;
  movie_type_name?: string;
  screen_name?: string;
  booked_by_name?: string;
  payment_mode_name?: string;
  seats?: BookingSeat[];
  tickets?: Ticket[];
}

export interface BookingSeat {
  id: number;
  booking_id: number;
  seat_id: number;
  row_name: string;
  seat_number: number;
  seat_class_id: number;
  seat_class_name: string;
  price_net: number;
  cgst: number;
  sgst: number;
  service_charge: number;
  price_gross: number;
}

export type BookingItem = BookingSeat;

export interface Ticket {
  id: number;
  booking_id: number;
  ticket_no: string;
  copy_type: string; // Customer, Office, Security
  printed_at: string;
  is_cancelled: boolean;
  cancelled_at?: string;
  cancelled_by?: number;
  cancel_reason_id?: number;
  cancel_reason_text?: string;
}

// Daily Collection Report (DCR) Types
export interface DCRRow {
  seat_class_id: number;
  seat_class_name: string;
  opening_no: string;
  closing_no: string;
  rate: number;
  total_sold: number;
  net_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_tax: number;
  gross_receipts: number;
  service_charge: number;
  cess: number;
  tax_on_sc: number;
}

export interface DCRShowGroup {
  show_id: number;
  show_name: string;
  start_time: string;
  movie_name: string;
  screen_name: string;
  rows: DCRRow[];
  subtotal: {
    total_sold: number;
    net_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    total_tax: number;
    gross_receipts: number;
    service_charge: number;
    cess: number;
    tax_on_sc: number;
  };
}

export interface DCRPaymentSummary {
  payment_mode_id: number;
  payment_mode_name: string;
  total_bookings: number;
  total_amount: number;
}

export interface DCRCancellationSummary {
  cancelled_tickets: number;
  refunded_gross: number;
  refunded_net: number;
}

export interface DailyCollectionReport {
  date: string;
  day_name: string;
  cinema_name: string;
  show_groups: DCRShowGroup[];
  payment_summaries?: DCRPaymentSummary[];
  cancellation_summary?: DCRCancellationSummary;
  grand_total: {
    total_sold: number;
    net_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    total_tax: number;
    gross_receipts: number;
    service_charge: number;
    cess: number;
    tax_on_sc: number;
  };
}

export type DCRReportData = DailyCollectionReport;

// Audit Log
export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

// System Settings
export interface SystemSettings {
  ticket_width_cm: number;
  ticket_height_cm: number;
  thermal_printer_name: string;
  silent_print: boolean;
  default_gst_enabled: boolean;
  allow_operator_gst_toggle: boolean;
  auto_reprint_copies: number;
  financial_year: string;
  invoice_series: string;
  session_timeout_min: number;
}
