import React, { useState, useEffect } from 'react';
import { Distributor, Language, MovieType, MovieCategory, SeatClass, CancellationReason } from '@/types';
import { movieService, screenService, bookingService, settingsService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Layers, Plus, Trash2, Pencil, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

type DropdownTab = 'distributors' | 'languages' | 'types' | 'categories' | 'classes' | 'reasons';

export const CoreDropdownsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canRead = isSystemAdmin || hasPermission('master_others', 'can_read');
  const canCreate = isSystemAdmin || hasPermission('master_others', 'can_create');
  const canUpdate = isSystemAdmin || hasPermission('master_others', 'can_update');
  const canDelete = isSystemAdmin || hasPermission('master_others', 'can_delete');

  const [activeTab, setActiveTab] = useState<DropdownTab>('distributors');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [movieTypes, setMovieTypes] = useState<MovieType[]>([]);
  const [categories, setCategories] = useState<MovieCategory[]>([]);
  const [seatClasses, setSeatClasses] = useState<SeatClass[]>([]);
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add Item Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemExtra, setNewItemExtra] = useState('');
  const [newItemPhone, setNewItemPhone] = useState('');

  // Generic Edit Modal
  const [editingItem, setEditingItem] = useState<{
    id: number;
    type: DropdownTab;
    name: string;
    extra?: string;
    phone?: string;
    order?: number;
    color?: string;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dList, lList, mtList, cList, scList, rList] = await Promise.all([
        movieService.getDistributors(),
        movieService.getLanguages(),
        movieService.getMovieTypes(),
        movieService.getCategories(),
        screenService.getSeatClasses(),
        bookingService.getCancellationReasons(),
      ]);

      setDistributors(dList);
      setLanguages(lList);
      setMovieTypes(mtList);
      setCategories(cList as any);
      setSeatClasses(scList);
      setReasons(rList);
    } catch (e) {
      console.error('Failed to fetch dropdown lookups:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    if (activeTab === 'distributors') {
      await movieService.saveDistributor({
        name: newItemName.trim(),
        contact_person: newItemExtra.trim() || 'Manager',
        phone: newItemPhone.trim() || '',
      });
    } else if (activeTab === 'languages') {
      await movieService.saveLanguage({ name: newItemName.trim() });
    } else if (activeTab === 'types') {
      await movieService.saveMovieType({ name: newItemName.trim() });
    } else if (activeTab === 'categories') {
      await movieService.saveCategory({ name: newItemName.trim() });
    } else if (activeTab === 'classes') {
      await screenService.saveSeatClass({
        name: newItemName.trim(),
        display_order: seatClasses.length + 1,
        color: newItemExtra || '#3b82f6',
      });
    } else if (activeTab === 'reasons') {
      await bookingService.saveCancellationReason(newItemName.trim());
    }

    setNewItemName('');
    setNewItemExtra('');
    setNewItemPhone('');
    setIsAddOpen(false);
    await fetchData();
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.name.trim()) return;

    const { id, type, name, extra, phone, order, color } = editingItem;

    if (type === 'distributors') {
      await movieService.saveDistributor({
        id,
        name: name.trim(),
        contact_person: extra?.trim() || 'Manager',
        phone: phone?.trim() || '',
      });
    } else if (type === 'languages') {
      await movieService.saveLanguage({ id, name: name.trim() });
    } else if (type === 'types') {
      await movieService.saveMovieType({ id, name: name.trim() });
    } else if (type === 'categories') {
      await movieService.saveCategory({ id, name: name.trim() });
    } else if (type === 'classes') {
      await screenService.saveSeatClass({
        id,
        name: name.trim(),
        color: color || '#3b82f6',
        display_order: order || 1,
      });
    } else if (type === 'reasons') {
      await bookingService.saveCancellationReason({ id, reason: name.trim() });
    }

    setEditingItem(null);
    await fetchData();
  };

  const handleDeleteItem = async (table: string, id: number) => {
    if (window.confirm('Delete this dropdown option?')) {
      await settingsService.softDeleteLookup(table, id);
      await fetchData();
    }
  };

  const tabs = [
    { id: 'distributors', label: 'Distributors' },
    { id: 'languages', label: 'Languages' },
    { id: 'types', label: 'Movie Types (2D/3D)' },
    { id: 'categories', label: 'Censor Categories' },
    { id: 'classes', label: 'Seat Classes' },
    { id: 'reasons', label: 'Cancel Reasons' },
  ];

  if (!canRead) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-muted/40">
        <div className="p-4 bg-card border border-border rounded-xs max-w-md space-y-3 shadow-xs">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <h2 className="text-sm font-bold text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground">
            You do not have permission to view System Lookups &amp; Core Dropdowns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            System Lookups &amp; Core Values
          </span>
        </div>

        <div className="flex items-center space-x-2">

          {canCreate && (
            <Button variant="default" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add To Active Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-1 border border-border bg-card p-1.5 rounded-xs shadow-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-xs font-bold hover:bg-primary/90 hover:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-card border border-border rounded-xs overflow-hidden flex flex-col p-4 shadow-xs">
        <div className="flex-1 overflow-auto">
          {/* Distributors Tab */}
          {activeTab === 'distributors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {distributors.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No distributors found. Click <strong>Add To Active Category</strong> to create one.
                </div>
              )}
              {distributors.map((d) => (
                <div key={d.id} className="p-3 border border-border rounded-xs bg-muted/20 flex justify-between items-center hover:bg-muted/40 transition-colors">
                  <div>
                    <div className="font-semibold text-xs text-foreground">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Contact: {d.contact_person || 'Manager'} {d.phone ? `• ${d.phone}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setEditingItem({
                            id: d.id,
                            type: 'distributors',
                            name: d.name,
                            extra: d.contact_person,
                            phone: d.phone,
                          })
                        }
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteItem('distributors', d.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Languages Tab */}
          {activeTab === 'languages' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {languages.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No languages configured. Click <strong>Add To Active Category</strong>.
                </div>
              )}
              {languages.map((l) => (
                <div key={l.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <span>{l.name}</span>
                  <div className="flex items-center space-x-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingItem({ id: l.id, type: 'languages', name: l.name })}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteItem('languages', l.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Movie Types Tab */}
          {activeTab === 'types' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {movieTypes.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No movie types configured.
                </div>
              )}
              {movieTypes.map((mt) => (
                <div key={mt.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <Badge variant="blue" className="text-xs">{mt.name}</Badge>
                  <div className="flex items-center space-x-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingItem({ id: mt.id, type: 'types', name: mt.name })}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteItem('movie_types', mt.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categories.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No censor categories found.
                </div>
              )}
              {categories.map((c) => (
                <div key={c.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <span>{c.name}</span>
                  <div className="flex items-center space-x-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingItem({ id: c.id, type: 'categories', name: c.name })}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteItem('categories', c.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Seat Classes Tab */}
          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {seatClasses.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No seat classes configured.
                </div>
              )}
              {seatClasses.map((sc) => (
                <div key={sc.id} className="p-3 border border-border rounded-xs bg-muted/20 flex justify-between items-center hover:bg-muted/40 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-5 h-5 rounded-xs border border-border shadow-xs shrink-0"
                      style={{ backgroundColor: sc.color }}
                    />
                    <div>
                      <div className="font-semibold text-xs text-foreground">{sc.name}</div>
                      <div className="text-[10px] text-muted-foreground">Order #{sc.display_order} • Hex: {sc.color}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setEditingItem({
                            id: sc.id,
                            type: 'classes',
                            name: sc.name,
                            color: sc.color || '#3b82f6',
                            order: sc.display_order || 1,
                          })
                        }
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteItem('seat_classes', sc.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cancellation Reasons Tab */}
          {activeTab === 'reasons' && (
            <div className="space-y-2">
              {reasons.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No cancellation reasons configured.
                </div>
              )}
              {reasons.map((r) => (
                <div key={r.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs hover:bg-muted/40 transition-colors">
                  <span className="font-semibold text-foreground">{r.reason}</span>
                  <div className="flex items-center space-x-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setEditingItem({
                            id: r.id,
                            type: 'reasons',
                            name: r.reason,
                          })
                        }
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteItem('cancellation_reasons', r.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={`Add Entry to ${tabs.find((t) => t.id === activeTab)?.label}`}
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Name / Title *</label>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter name"
              autoFocus
            />
          </div>

          {activeTab === 'distributors' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Contact Person</label>
                <Input
                  value={newItemExtra}
                  onChange={(e) => setNewItemExtra(e.target.value)}
                  placeholder="e.g. Sales Manager"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  value={newItemPhone}
                  onChange={(e) => setNewItemPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Class Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={newItemExtra || '#3b82f6'}
                  onChange={(e) => setNewItemExtra(e.target.value)}
                  className="w-10 h-8 rounded-xs border border-border cursor-pointer p-0.5"
                />
                <Input
                  value={newItemExtra || '#3b82f6'}
                  onChange={(e) => setNewItemExtra(e.target.value)}
                  placeholder="#3b82f6"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleAddItem} className="font-bold">
              Add Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generic Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`Edit ${editingItem ? tabs.find((t) => t.id === editingItem.type)?.label : 'Entry'}`}
        maxWidth="sm"
      >
        {editingItem && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Name / Title *</label>
              <Input
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="Enter title"
                autoFocus
              />
            </div>

            {editingItem.type === 'distributors' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Contact Person</label>
                  <Input
                    value={editingItem.extra || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, extra: e.target.value })}
                    placeholder="Contact person"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    value={editingItem.phone || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </>
            )}

            {editingItem.type === 'classes' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Display Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={editingItem.color || '#3b82f6'}
                      onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                      className="w-10 h-8 rounded-xs border border-border cursor-pointer p-0.5"
                    />
                    <Input
                      value={editingItem.color || '#3b82f6'}
                      onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                      placeholder="#3b82f6"
                      className="font-mono text-xs"
                    />
                    <span
                      className="w-8 h-8 rounded-xs border border-border shrink-0"
                      style={{ backgroundColor: editingItem.color || '#3b82f6' }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={editingItem.order || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, order: Number(e.target.value) })}
                    min={1}
                    max={20}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSaveEdit} className="font-bold">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
