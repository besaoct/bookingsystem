import React, { useState, useEffect } from 'react';
import { PricingRule, SeatClass, Show } from '@/types';
import { pricingService, screenService, showService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IndianRupee, Plus, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const PricingMasterPage: React.FC = () => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canCreate = isSystemAdmin || hasPermission('pricing', 'can_create');
  const canUpdate = isSystemAdmin || hasPermission('pricing', 'can_update');
  const canDelete = isSystemAdmin || hasPermission('pricing', 'can_delete');

  const [pricingList, setPricingList] = useState<PricingRule[]>([]);
  const [seatClasses, setSeatClasses] = useState<SeatClass[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<Partial<PricingRule> | null>(null);

  const fetchPricing = async () => {
    setIsLoading(true);
    try {
      const pList = await pricingService.getBasePricing();
      const scList = await screenService.getSeatClasses();
      const sList = await showService.getShows({ activeOnly: true });

      setPricingList(pList as any);
      setSeatClasses(scList);
      setShows(sList);
    } catch (e) {
      console.error('Failed to fetch pricing data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleOpenCreate = async () => {
    // Ensure seat classes are loaded before opening modal
    let classes = seatClasses;
    if (classes.length === 0) {
      try {
        classes = await screenService.getSeatClasses();
        setSeatClasses(classes);
      } catch (e) {
        console.error('Failed to load seat classes', e);
      }
    }
    setEditingPricing({
      seat_class_id: classes[0]?.id || 1,
      show_id: undefined,
      base_price: 150,
      service_charge: 12,
      cgst_pct: 9,
      sgst_pct: 9,
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: '2099-12-31',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: PricingRule) => {
    setEditingPricing({ ...rule });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingPricing) return;

    if (!editingPricing.seat_class_id || editingPricing.base_price === undefined) {
      alert('Please fill mandatory fields (Seat Class, Base Price).');
      return;
    }

    const pricingPayload = {
      id: editingPricing.id,
      seat_class_id: editingPricing.seat_class_id,
      base_price: Number(editingPricing.base_price),
      service_charge: Number(editingPricing.service_charge ?? 12),
      cgst_pct: Number(editingPricing.cgst_pct ?? 9),
      sgst_pct: Number(editingPricing.sgst_pct ?? 9),
      effective_from: editingPricing.effective_from || new Date().toISOString().slice(0, 10),
      effective_to: editingPricing.effective_to || '2099-12-31',
    };

    if (editingPricing.show_id) {
      await pricingService.saveShowPriceOverride({
        ...pricingPayload,
        show_id: editingPricing.show_id,
        custom_base_rate: pricingPayload.base_price,
      });
    } else {
      await pricingService.saveClassPricing({
        ...pricingPayload,
        base_rate: pricingPayload.base_price,
      });
    }

    setIsModalOpen(false);
    setEditingPricing(null);
    await fetchPricing();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this pricing rule?')) {
      await pricingService.deletePricing(id);
      await fetchPricing();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <IndianRupee className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Ticket Pricing &amp; Rates
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchPricing} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canCreate && (
            <Button variant="default" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Pricing Rule
            </Button>
          )}
        </div>
      </div>

      {/* Pricing Table */}
      <div className="flex-1 bg-card border border-border rounded-xs overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5">Seat Class</th>
                <th className="px-3 py-2.5">Show Timing</th>
                <th className="px-3 py-2.5 text-right">Base / Gross Rate</th>
                <th className="px-3 py-2.5 text-right">Service Charge (S.CH)</th>
                <th className="px-3 py-2.5 text-right">CGST %</th>
                <th className="px-3 py-2.5 text-right">SGST %</th>
                <th className="px-3 py-2.5">Effective Period</th>
                {(canUpdate || canDelete) && <th className="px-3 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pricingList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-xs text-muted-foreground">
                    No pricing rules configured. Click <strong>Add Pricing Rule</strong> to get started.
                  </td>
                </tr>
              )}
              {pricingList.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-foreground">
                    {p.seat_class_name}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium">
                    {p.show_name ? `${p.show_name} (${p.start_time})` : 'All Shows Default'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-primary">
                    ₹{p.base_price.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground font-medium">
                    ₹{p.service_charge.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-muted-foreground">{p.cgst_pct}%</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-muted-foreground">{p.sgst_pct}%</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium">
                    {p.effective_from} to {p.effective_to}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-3 py-2.5 text-right space-x-1">
                      {canUpdate && (
                        <Button variant="outline" size="xs" onClick={() => handleOpenEdit(p)}>
                          <Edit className="w-3 h-3 mr-0.5" /> Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(p.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPricing?.id ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
        description="Configure base ticket prices, service charges, and GST rates"
        maxWidth="md"
      >
        {editingPricing && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Seat Class *</label>
                <Select
                  value={String(editingPricing.seat_class_id || '')}
                  onValueChange={(val) => setEditingPricing({ ...editingPricing, seat_class_id: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select seat class" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatClasses.map((sc) => (
                      <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Show (Optional)</label>
                <Select
                  value={editingPricing.show_id ? String(editingPricing.show_id) : 'ALL'}
                  onValueChange={(val) => setEditingPricing({ ...editingPricing, show_id: val === 'ALL' ? undefined : Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Shows Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Shows Default</SelectItem>
                    {shows.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.show_name} ({s.start_time})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Ticket Price Rate (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingPricing.base_price || 150}
                  onChange={(e) => setEditingPricing({ ...editingPricing, base_price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Service Charge (S.CH ₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingPricing.service_charge || 12}
                  onChange={(e) => setEditingPricing({ ...editingPricing, service_charge: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">CGST %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingPricing.cgst_pct || 9}
                  onChange={(e) => setEditingPricing({ ...editingPricing, cgst_pct: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">SGST %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingPricing.sgst_pct || 9}
                  onChange={(e) => setEditingPricing({ ...editingPricing, sgst_pct: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave} className="font-bold">
                Save Rate Rule
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
