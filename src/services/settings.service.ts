import { dbService } from '@/db/sqlite-service';
import { Cinema, TaxConfig, TicketCopyConfig, PaymentMode } from '@/types';

export const settingsService = {
  async getCinema(): Promise<Cinema | null> {
    await dbService.init();
    return dbService.queryOne<Cinema>("SELECT * FROM cinemas ORDER BY id ASC LIMIT 1");
  },

  async saveCinema(cinema: Partial<Cinema>): Promise<void> {
    await dbService.init();
    const existing = dbService.queryOne<Cinema>("SELECT id FROM cinemas ORDER BY id ASC LIMIT 1");
    if (existing) {
      dbService.run(
        `UPDATE cinemas 
         SET name = ?, address = ?, gstin = ?, cin = ?, contact_numbers = ?, header_text = ?, footer_text = ? 
         WHERE id = ?`,
        [
          cinema.name ?? '',
          cinema.address ?? '',
          cinema.gstin ?? '',
          cinema.cin ?? '',
          cinema.contact_numbers ?? '',
          cinema.header_text ?? '',
          cinema.footer_text ?? '',
          existing.id,
        ]
      );
    } else {
      dbService.run(
        `INSERT INTO cinemas (name, address, gstin, cin, contact_numbers, header_text, footer_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cinema.name ?? '',
          cinema.address ?? '',
          cinema.gstin ?? '',
          cinema.cin ?? '',
          cinema.contact_numbers ?? '',
          cinema.header_text ?? '',
          cinema.footer_text ?? '',
        ]
      );
    }
  },

  async getTaxConfigs(): Promise<TaxConfig[]> {
    await dbService.init();
    return dbService.query<TaxConfig>("SELECT * FROM tax_configs ORDER BY id ASC");
  },

  async saveTaxConfig(tax: Partial<TaxConfig>): Promise<void> {
    await dbService.init();
    if (tax.id) {
      dbService.run(
        `UPDATE tax_configs 
         SET cgst_pct = ?, sgst_pct = ?, service_charge_amount = ?, service_charge_is_pct = ?, 
             apply_gst_default = ?, gst_on_service_charge = ?, tax_calculation_method = ?, rounding_rule = ? 
         WHERE id = ?`,
        [
          tax.cgst_pct ?? 9,
          tax.sgst_pct ?? 9,
          tax.service_charge_amount ?? 12,
          tax.service_charge_is_pct ? 1 : 0,
          tax.apply_gst_default ? 1 : 0,
          tax.gst_on_service_charge ? 1 : 0,
          tax.tax_calculation_method || 'INCLUSIVE',
          tax.rounding_rule || 'NORMAL',
          tax.id,
        ]
      );
    } else {
      dbService.run(
        `INSERT INTO tax_configs (cgst_pct, sgst_pct, service_charge_amount, service_charge_is_pct, apply_gst_default, gst_on_service_charge, tax_calculation_method, rounding_rule) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tax.cgst_pct ?? 9,
          tax.sgst_pct ?? 9,
          tax.service_charge_amount ?? 12,
          tax.service_charge_is_pct ? 1 : 0,
          tax.apply_gst_default ? 1 : 0,
          tax.gst_on_service_charge ? 1 : 0,
          tax.tax_calculation_method || 'INCLUSIVE',
          tax.rounding_rule || 'NORMAL',
        ]
      );
    }
  },

  async getTicketCopyConfigs(): Promise<TicketCopyConfig[]> {
    await dbService.init();
    return dbService.query<TicketCopyConfig>("SELECT * FROM ticket_copy_configs ORDER BY print_order ASC");
  },

  async saveTicketCopyConfig(config: Partial<TicketCopyConfig>): Promise<void> {
    await dbService.init();
    if (config.id) {
      dbService.run(
        "UPDATE ticket_copy_configs SET copy_name = ?, header_label = ?, purpose = ?, print_order = ?, is_enabled = ? WHERE id = ?",
        [config.copy_name, config.header_label, config.purpose || '', config.print_order || 1, config.is_enabled ? 1 : 0, config.id]
      );
    } else {
      dbService.run(
        "INSERT INTO ticket_copy_configs (copy_name, header_label, purpose, print_order, is_enabled) VALUES (?, ?, ?, ?, ?)",
        [config.copy_name, config.header_label, config.purpose || '', config.print_order || 1, config.is_enabled ? 1 : 0]
      );
    }
  },

  async getSystemSettings(): Promise<Record<string, string>> {
    await dbService.init();
    const rows = dbService.query<{ setting_key: string; setting_value: string }>("SELECT setting_key, setting_value FROM system_settings");
    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.setting_key] = r.setting_value;
    });
    return map;
  },

  async saveSystemSetting(key: string, value: string, groupName = 'general'): Promise<void> {
    await dbService.init();
    const existing = dbService.queryOne<{ id: number }>(
      "SELECT id FROM system_settings WHERE setting_key = ?",
      [key]
    );

    if (existing) {
      dbService.run(
        "UPDATE system_settings SET setting_value = ? WHERE id = ?",
        [value, existing.id]
      );
    } else {
      dbService.run(
        "INSERT INTO system_settings (setting_key, setting_value, group_name) VALUES (?, ?, ?)",
        [key, value, groupName]
      );
    }
  },

  async getPaymentModes(): Promise<PaymentMode[]> {
    await dbService.init();
    return dbService.query<PaymentMode>("SELECT * FROM payment_modes WHERE is_active = 1 ORDER BY id ASC");
  },

  async getAllPaymentModes(): Promise<PaymentMode[]> {
    await dbService.init();
    return dbService.query<PaymentMode>("SELECT * FROM payment_modes ORDER BY id ASC");
  },

  async savePaymentMode(pm: Partial<PaymentMode>): Promise<void> {
    await dbService.init();
    if (pm.id) {
      dbService.run("UPDATE payment_modes SET name = ?, is_active = ? WHERE id = ?", [pm.name, pm.is_active ? 1 : 0, pm.id]);
    } else {
      dbService.run("INSERT INTO payment_modes (name, is_active) VALUES (?, 1)", [pm.name]);
    }
  },

  async softDeleteLookup(tableName: string, id: number): Promise<void> {
    await dbService.init();
    const tableMap: Record<string, string> = {
      distributors: 'distributors',
      languages: 'languages',
      movie_types: 'movie_types',
      categories: 'categories',
      movie_categories: 'categories',
      seat_classes: 'seat_classes',
      cancellation_reasons: 'cancellation_reasons',
      payment_modes: 'payment_modes',
    };
    const targetTable = tableMap[tableName];
    if (!targetTable) {
      throw new Error(`Invalid table for soft delete: ${tableName}`);
    }
    dbService.run(`UPDATE ${targetTable} SET is_active = 0 WHERE id = ?`, [id]);
  },
};
