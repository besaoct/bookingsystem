import React, { useState, useEffect } from 'react';
import { SeatClass } from '@/types';
import { screenService } from '@/services';
import { NavPage } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Armchair, Plus, Edit, Trash2, Tag, CheckCircle, Palette, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface SeatClassesMasterPageProps {
  onNavigate?: (page: NavPage) => void;
}

const PRESET_COLORS = [
  { name: 'Gold Plus', hex: '#f59e0b' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Platinum', hex: '#64748b' },
  { name: 'Silver', hex: '#94a3b8' },
  { name: 'Recliner (Purple)', hex: '#8b5cf6' },
  { name: 'Balcony (Cyan)', hex: '#06b6d4' },
  { name: 'VIP Box (Rose)', hex: '#f43f5e' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Classic Blue', hex: '#3b82f6' },
];

export const SeatClassesMasterPage: React.FC<SeatClassesMasterPageProps> = ({ onNavigate }) => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canCreate = isSystemAdmin || hasPermission('seat_layout', 'can_create');
  const canUpdate = isSystemAdmin || hasPermission('seat_layout', 'can_update');
  const canDelete = isSystemAdmin || hasPermission('seat_layout', 'can_delete');

  const [classes, setClasses] = useState<SeatClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<SeatClass> | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const data = await screenService.getSeatClasses(false);
      setClasses(data);
    } catch (e) {
      console.error('Failed to load seat classes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenCreate = () => {
    setEditingClass({
      name: '',
      color: '#f59e0b',
      display_order: classes.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sc: SeatClass) => {
    setEditingClass({ ...sc });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass?.name) {
      alert('Please enter a Class Name.');
      return;
    }

    await screenService.saveSeatClass(editingClass);
    setIsModalOpen(false);
    setEditingClass(null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    await fetchClasses();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate/delete this Seat Class?')) {
      await screenService.deleteSeatClass(id);
      await fetchClasses();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Seat Classes Master
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="text-success text-xs font-bold flex items-center mr-2">
              <CheckCircle className="w-4 h-4 mr-1" /> Saved Successfully
            </span>
          )}

          <Button variant="outline" size="sm" onClick={fetchClasses} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canCreate && (
            <Button variant="default" size="sm" onClick={handleOpenCreate} className="font-bold cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Seat Class
            </Button>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-2xs font-bold text-muted-foreground uppercase">Total Classes</div>
              <div className="text-lg font-black text-foreground">{classes.length}</div>
            </div>
            <div className="p-2 bg-primary/10 rounded-xs text-primary">
              <Tag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onNavigate?.('master_screens')}
          className="bg-card border-border shadow-xs hover:border-primary/50 cursor-pointer transition-colors"
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-2xs font-bold text-muted-foreground uppercase">Screen Layouts</div>
              <div className="text-xs font-bold text-primary flex items-center mt-1">
                Open Screen Builder <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
            <div className="p-2 bg-muted rounded-xs text-foreground">
              <Armchair className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onNavigate?.('master_pricing')}
          className="bg-card border-border shadow-xs hover:border-primary/50 cursor-pointer transition-colors"
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-2xs font-bold text-muted-foreground uppercase">Pricing Configuration</div>
              <div className="text-xs font-bold text-primary flex items-center mt-1">
                Configure Pricing Rates <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
            <div className="p-2 bg-muted rounded-xs text-foreground">
              <Palette className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seat Classes Table */}
      <Card className="bg-card border-border shadow-xs flex-1 flex flex-col overflow-hidden">
        <CardHeader className="p-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground">
            Auditorium Seat Tiers &amp; Layout Badges
          </CardTitle>
          <Badge variant="outline" className="text-xs font-semibold">
            {classes.filter((c) => c.is_active).length} Active Tiers
          </Badge>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow className="border-b border-border">
                <TableHead className="pl-4 text-[11px] font-semibold uppercase text-muted-foreground">Order</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Class Name</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Map Color</TableHead>
                <TableHead className="text-center text-[11px] font-semibold uppercase text-muted-foreground">Status</TableHead>
                {(canUpdate || canDelete) && (
                  <TableHead className="text-right pr-4 text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((sc) => (
                <TableRow key={sc.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-4 font-bold text-muted-foreground text-xs">
                    #{sc.display_order}
                  </TableCell>
                  <TableCell className="font-extrabold text-foreground text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-2xs border border-black/20"
                        style={{ backgroundColor: sc.color }}
                      />
                      <span>{sc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1.5 font-mono text-2xs font-semibold text-muted-foreground">
                      <span
                        className="px-2 py-0.5 rounded-xs text-white text-[10px] font-bold shadow-2xs"
                        style={{ backgroundColor: sc.color }}
                      >
                        {sc.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {sc.is_active ? (
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell className="text-right pr-4 space-x-1">
                      {canUpdate && (
                        <Button variant="outline" size="xs" onClick={() => handleOpenEdit(sc)}>
                          <Edit className="w-3 h-3 mr-0.5" /> Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(sc.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClass(null);
        }}
        title={editingClass?.id ? 'Edit Seat Class' : 'Add New Seat Class'}
        description="Configure class name, display order, and visual color for seat maps"
        maxWidth="md"
      >
        {editingClass && (
          <form onSubmit={handleSave} className="space-y-4 text-xs pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Seat Class Name *</label>
              <Input
                value={editingClass.name || ''}
                onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                placeholder="e.g. Gold Plus, Platinum, Recliner"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Color Palette / Map Swatch *</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingClass.color || '#f59e0b'}
                  onChange={(e) => setEditingClass({ ...editingClass, color: e.target.value })}
                  className="w-10 h-8 p-0.5 rounded-xs border border-border cursor-pointer bg-card"
                />
                <Input
                  value={editingClass.color || '#f59e0b'}
                  onChange={(e) => setEditingClass({ ...editingClass, color: e.target.value })}
                  placeholder="#f59e0b"
                  className="font-mono"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_COLORS.map((p) => (
                  <button
                    type="button"
                    key={p.hex}
                    onClick={() => setEditingClass({ ...editingClass, color: p.hex })}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[10px] font-semibold border border-border hover:border-primary transition-colors cursor-pointer bg-card"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.hex }} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Display Order</label>
                <Input
                  type="number"
                  value={editingClass.display_order || 1}
                  onChange={(e) => setEditingClass({ ...editingClass, display_order: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="classActive"
                  checked={Boolean(editingClass.is_active ?? true)}
                  onChange={(e) => setEditingClass({ ...editingClass, is_active: e.target.checked })}
                  className="rounded-xs text-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="classActive" className="text-xs font-bold text-foreground cursor-pointer">
                  Active for Layouts
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClass(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" className="font-bold bg-primary text-primary-foreground">
                Save Seat Class
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
