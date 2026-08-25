import { create } from 'zustand';
import { Cinema, TaxConfig, PaymentMode, TicketCopyConfig, CancellationReason } from '@/types';
import { settingsService, bookingService } from '@/services';

interface SettingsState {
  cinema: Cinema | null;
  taxConfig: TaxConfig | null;
  paymentModes: PaymentMode[];
  ticketCopies: TicketCopyConfig[];
  cancellationReasons: CancellationReason[];
  systemSettings: Record<string, string>;
  isLoading: boolean;

  fetchSettings: () => Promise<void>;
  updateCinema: (cinema: Partial<Cinema>) => Promise<void>;
  updateTaxConfig: (taxConfig: Partial<TaxConfig>) => Promise<void>;
  updateTicketCopies: (copies: TicketCopyConfig[]) => Promise<void>;
  updateSystemSetting: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  cinema: null,
  taxConfig: null,
  paymentModes: [],
  ticketCopies: [],
  cancellationReasons: [],
  systemSettings: {},
  isLoading: true,

  fetchSettings: async () => {
    try {
      const cinema = await settingsService.getCinema();
      const taxConfigs = await settingsService.getTaxConfigs();
      const taxConfig = taxConfigs[0] || null;

      const paymentModes = await settingsService.getPaymentModes();
      const ticketCopies = await settingsService.getTicketCopyConfigs();
      const cancellationReasons = await bookingService.getCancellationReasons();
      const systemSettings = await settingsService.getSystemSettings();

      set({
        cinema,
        taxConfig,
        paymentModes,
        ticketCopies,
        cancellationReasons,
        systemSettings,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to fetch settings:', e);
      set({ isLoading: false });
    }
  },

  updateCinema: async (data) => {
    const current = get().cinema;
    if (!current) return;
    const updated = { ...current, ...data };
    await settingsService.saveCinema(updated);
    set({ cinema: updated });
  },

  updateTaxConfig: async (data) => {
    const current = get().taxConfig;
    if (!current) return;
    const updated = { ...current, ...data };
    await settingsService.saveTaxConfig(updated);
    set({ taxConfig: updated });
  },

  updateTicketCopies: async (copies) => {
    for (const copy of copies) {
      await settingsService.saveTicketCopyConfig(copy);
    }
    set({ ticketCopies: copies });
  },

  updateSystemSetting: async (key: string, value: string) => {
    await settingsService.saveSystemSetting(key, value);
    const updated = { ...get().systemSettings, [key]: value };
    set({ systemSettings: updated });
  },
}));
