import { TaxConfig } from '@/types';

export interface CalculatedSeatPrice {
  baseNet: number;
  cgst: number;
  sgst: number;
  serviceCharge: number;
  grossTotal: number;
}

export function calculateSeatTaxes(
  priceValue: number, // Base or Gross price depending on method
  taxConfig: TaxConfig,
  applyGst: boolean,
  overrideServiceCharge?: number
): CalculatedSeatPrice {
  const sc = overrideServiceCharge !== undefined ? overrideServiceCharge : taxConfig.service_charge_amount;
  const cgstRate = applyGst ? (taxConfig.cgst_pct / 100) : 0;
  const sgstRate = applyGst ? (taxConfig.sgst_pct / 100) : 0;
  const totalGstRate = cgstRate + sgstRate;

  let baseNet = 0;
  let cgst = 0;
  let sgst = 0;
  let serviceCharge = sc;
  let grossTotal = 0;

  if (taxConfig.tax_calculation_method === 'INCLUSIVE') {
    // priceValue is the inclusive ticket rate (e.g. ₹150)
    const amountExcludingSC = Math.max(0, priceValue - serviceCharge);

    if (applyGst && totalGstRate > 0) {
      baseNet = amountExcludingSC / (1 + totalGstRate);
      cgst = baseNet * cgstRate;
      sgst = baseNet * sgstRate;
    } else {
      baseNet = amountExcludingSC;
      cgst = 0;
      sgst = 0;
    }

    grossTotal = priceValue;
  } else {
    // EXCLUSIVE: priceValue is the Net Base Price
    baseNet = priceValue;
    if (applyGst) {
      cgst = baseNet * cgstRate;
      sgst = baseNet * sgstRate;
    } else {
      cgst = 0;
      sgst = 0;
    }
    grossTotal = baseNet + cgst + sgst + serviceCharge;
  }

  // Apply rounding rules
  const round = (val: number) => {
    switch (taxConfig.rounding_rule) {
      case 'FLOOR':
        return Math.floor(val * 100) / 100;
      case 'CEILING':
        return Math.ceil(val * 100) / 100;
      case 'NORMAL':
      default:
        return Math.round(val * 100) / 100;
    }
  };

  return {
    baseNet: round(baseNet),
    cgst: round(cgst),
    sgst: round(sgst),
    serviceCharge: round(serviceCharge),
    grossTotal: round(grossTotal),
  };
}
