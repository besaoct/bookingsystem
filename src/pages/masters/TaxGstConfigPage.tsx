import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TaxConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent, CheckCircle, Save, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const TaxGstConfigPage: React.FC = () => {
  const { hasPermission, user } = useAuthStore();
  const canUpdate = user?.role === 'SYSTEM_ADMIN' || hasPermission('taxes', 'can_update');
  const { taxConfig, updateTaxConfig, fetchSettings } = useSettingsStore();
  const [formData, setFormData] = useState<Partial<TaxConfig>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchSettings();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (taxConfig) {
      setFormData({ ...taxConfig });
    }
  }, [taxConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    await updateTaxConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Percent className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Tax &amp; GST Configuration
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="text-success text-xs font-bold flex items-center mr-2">
              <CheckCircle className="w-4 h-4 mr-1" /> Settings Saved Successfully
            </span>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tax Rates Card */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground">
              GST Tax Rates &amp; Calculation Model
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">CGST Rate (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.cgst_pct ?? 9.0}
                  onChange={(e) => setFormData({ ...formData, cgst_pct: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">SGST Rate (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.sgst_pct ?? 9.0}
                  onChange={(e) => setFormData({ ...formData, sgst_pct: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Tax Calculation Method
              </label>
              <Select
                value={formData.tax_calculation_method || 'INCLUSIVE'}
                onValueChange={(val) => setFormData({ ...formData, tax_calculation_method: val as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calculation method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCLUSIVE">Inclusive (Ticket Rate Includes Taxes &amp; Service Charge)</SelectItem>
                  <SelectItem value="EXCLUSIVE">Exclusive (Taxes &amp; S.CH Added on Top of Base Price)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Rounding Rule</label>
              <Select
                value={formData.rounding_rule || 'NORMAL'}
                onValueChange={(val) => setFormData({ ...formData, rounding_rule: val as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rounding rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal Rounding (Math.round to nearest 0.01)</SelectItem>
                  <SelectItem value="FLOOR">Floor (Round down)</SelectItem>
                  <SelectItem value="CEILING">Ceiling (Round up)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Service Charge & Policy Card */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground">
              Service Charge &amp; Counter Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Default Service Charge (S.CH ₹)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.service_charge_amount ?? 12.0}
                onChange={(e) => setFormData({ ...formData, service_charge_amount: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-border">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.apply_gst_default)}
                  onChange={(e) => setFormData({ ...formData, apply_gst_default: e.target.checked })}
                  className="rounded-xs text-primary h-4 w-4"
                />
                <span className="text-xs font-medium text-foreground">
                  Apply GST by default on box office counter bookings
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.gst_on_service_charge)}
                  onChange={(e) => setFormData({ ...formData, gst_on_service_charge: e.target.checked })}
                  className="rounded-xs text-primary h-4 w-4"
                />
                <span className="text-xs font-medium text-foreground">
                  Apply GST on Service Charge (S.CH) component
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        {canUpdate && (
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="default" size="default" className="font-bold px-6">
              <Save className="w-4 h-4 mr-1.5" />
              Save Tax Configuration
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
