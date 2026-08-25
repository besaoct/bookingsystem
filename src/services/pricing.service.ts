import { dbService } from '@/db/sqlite-service';
import { Pricing } from '@/types';

export const pricingService = {
  async getBasePricing(): Promise<Pricing[]> {
    await dbService.init();
    const sql = `
      SELECT p.*,
             sc.name AS seat_class_name,
             s.show_name,
             s.start_time
      FROM pricing p
      LEFT JOIN seat_classes sc ON p.seat_class_id = sc.id
      LEFT JOIN shows s ON p.show_id = s.id
      WHERE p.is_active = 1
      ORDER BY sc.display_order ASC, p.id ASC
    `;
    return dbService.query<Pricing>(sql);
  },

  async getPricingForClassAndShow(seatClassId: number, showId?: number): Promise<Pricing | null> {
    await dbService.init();
    if (showId) {
      const showOverride = dbService.queryOne<Pricing>(
        "SELECT * FROM pricing WHERE seat_class_id = ? AND show_id = ? AND is_active = 1 LIMIT 1",
        [seatClassId, showId]
      );
      if (showOverride) return showOverride;
    }

    return dbService.queryOne<Pricing>(
      "SELECT * FROM pricing WHERE seat_class_id = ? AND (show_id IS NULL OR show_id = 0) AND is_active = 1 LIMIT 1",
      [seatClassId]
    );
  },

  async saveClassPricing(pricing: Partial<Pricing> & { id?: number; seat_class_id: number; base_rate?: number; base_price?: number }): Promise<void> {
    await dbService.init();
    const price = pricing.base_price ?? pricing.base_rate ?? 150;
    const sc = pricing.service_charge ?? 12;
    const cgst = pricing.cgst_pct ?? 9;
    const sgst = pricing.sgst_pct ?? 9;
    const effFrom = pricing.effective_from || '2026-01-01';
    const effTo = pricing.effective_to || '2099-12-31';

    if (pricing.id) {
      dbService.run(
        "UPDATE pricing SET seat_class_id = ?, base_price = ?, service_charge = ?, cgst_pct = ?, sgst_pct = ?, effective_from = ?, effective_to = ? WHERE id = ?",
        [pricing.seat_class_id, price, sc, cgst, sgst, effFrom, effTo, pricing.id]
      );
      return;
    }

    const existing = dbService.queryOne<Pricing>(
      "SELECT id FROM pricing WHERE seat_class_id = ? AND (show_id IS NULL OR show_id = 0)",
      [pricing.seat_class_id]
    );

    if (existing) {
      dbService.run(
        "UPDATE pricing SET base_price = ?, service_charge = ?, cgst_pct = ?, sgst_pct = ?, effective_from = ?, effective_to = ? WHERE id = ?",
        [price, sc, cgst, sgst, effFrom, effTo, existing.id]
      );
    } else {
      dbService.run(
        "INSERT INTO pricing (seat_class_id, show_id, base_price, service_charge, cgst_pct, sgst_pct, effective_from, effective_to, is_active) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1)",
        [pricing.seat_class_id, price, sc, cgst, sgst, effFrom, effTo]
      );
    }
  },

  async saveShowPriceOverride(override: { id?: number; show_id: number; seat_class_id: number; custom_base_rate?: number; base_price?: number; service_charge?: number; cgst_pct?: number; sgst_pct?: number; effective_from?: string; effective_to?: string }): Promise<void> {
    await dbService.init();
    const price = override.base_price ?? override.custom_base_rate ?? 150;
    const sc = override.service_charge ?? 12;
    const cgst = override.cgst_pct ?? 9;
    const sgst = override.sgst_pct ?? 9;
    const effFrom = override.effective_from ?? '2026-01-01';
    const effTo = override.effective_to ?? '2099-12-31';

    if (override.id) {
      dbService.run(
        "UPDATE pricing SET show_id = ?, seat_class_id = ?, base_price = ?, service_charge = ?, cgst_pct = ?, sgst_pct = ?, effective_from = ?, effective_to = ? WHERE id = ?",
        [override.show_id, override.seat_class_id, price, sc, cgst, sgst, effFrom, effTo, override.id]
      );
      return;
    }

    const existing = dbService.queryOne<Pricing>(
      "SELECT id FROM pricing WHERE show_id = ? AND seat_class_id = ?",
      [override.show_id, override.seat_class_id]
    );

    if (existing) {
      dbService.run(
        "UPDATE pricing SET base_price = ?, service_charge = ?, cgst_pct = ?, sgst_pct = ?, effective_from = ?, effective_to = ? WHERE id = ?",
        [price, sc, cgst, sgst, effFrom, effTo, existing.id]
      );
    } else {
      dbService.run(
        "INSERT INTO pricing (seat_class_id, show_id, base_price, service_charge, cgst_pct, sgst_pct, effective_from, effective_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [override.seat_class_id, override.show_id, price, sc, cgst, sgst, effFrom, effTo]
      );
    }
  },

  async deletePricing(id: number): Promise<void> {
    await dbService.init();
    dbService.run("DELETE FROM pricing WHERE id = ?", [id]);
  },
};
