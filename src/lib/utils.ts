import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatDateIndian(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dayNames[d.getDay()]}, ${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}
