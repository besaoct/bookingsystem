import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return `₹${amount.toFixed(2)}`;
}

export function formatNumber(val: number | null | undefined, pad = 6): string {
  if (val === null || val === undefined || isNaN(val)) return "000000";
  return String(val).padStart(pad, '0');
}

export function getLocalDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : new Date();
}

export function formatDateIndian(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = parseDateString(dateStr);
    return format(d, 'EEE, dd-MM-yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateDisplay(dateStr: string, pattern = 'dd MMM yyyy'): string {
  if (!dateStr) return "";
  try {
    const d = parseDateString(dateStr);
    return format(d, pattern);
  } catch {
    return dateStr;
  }
}
