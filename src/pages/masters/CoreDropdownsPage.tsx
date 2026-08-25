import React, { useState, useEffect } from 'react';
import { Distributor, Language, MovieType, MovieCategory, SeatClass, CancellationReason } from '@/types';
import { movieService, screenService, bookingService, settingsService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Layers, Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';

type DropdownTab = 'distributors' | 'languages' | 'types' | 'categories' | 'classes' | 'reasons';

export const CoreDropdownsPage: React.FC = () => {
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

  // Edit Seat Class Modal
  const [editingSeatClass, setEditingSeatClass] = useState<SeatClass | null>(null);
  const [editScName, setEditScName] = useState('');
  const [editScColor, setEditScColor] = useState('#3b82f6');
  const [editScOrder, setEditScOrder] = useState(1);

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
      await movieService.saveDistributor({ name: newItemName, contact_person: newItemExtra || 'Manager' });
    } else if (activeTab === 'languages') {
      await movieService.saveLanguage({ name: newItemName });
    } else if (activeTab === 'types') {
      await movieService.saveMovieType({ name: newItemName });
    } else if (activeTab === 'categories') {
      await movieService.saveCategory({ name: newItemName });
    } else if (activeTab === 'classes') {
      await screenService.saveSeatClass({ name: newItemName, display_order: seatClasses.length + 1, color: newItemExtra || '#3b82f6' });
    } else if (activeTab === 'reasons') {
      await bookingService.saveCancellationReason(newItemName);
    }

    setNewItemName('');
    setNewItemExtra('');
    setIsAddOpen(false);
    await fetchData();
  };

  const handleDeleteItem = async (table: string, id: number) => {
    if (window.confirm('Delete this dropdown option?')) {
      await settingsService.softDeleteLookup(table, id);
      await fetchData();
    }
  };

  const openEditSeatClass = (sc: SeatClass) => {
    setEditingSeatClass(sc);
    setEditScName(sc.name);
    setEditScColor(sc.color || '#3b82f6');
    setEditScOrder(sc.display_order || 1);
  };

  const handleSaveSeatClass = async () => {
    if (!editingSeatClass || !editScName.trim()) return;
    await screenService.saveSeatClass({
      id: editingSeatClass.id,
      name: editScName.trim(),
      color: editScColor,
      display_order: editScOrder,
      is_active: editingSeatClass.is_active,
    });
    setEditingSeatClass(null);
    await fetchData();
  };

  const tabs = [
    { id: 'distributors', label: 'Distributors' },
    { id: 'languages', label: 'Languages' },
    { id: 'types', label: 'Movie Types (2D/3D)' },
    { id: 'categories', label: 'Censor Categories' },
    { id: 'classes', label: 'Seat Classes' },
    { id: 'reasons', label: 'Cancel Reasons' },
  ];

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

        <Button variant="default" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add To Active Category
        </Button>
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
          {activeTab === 'distributors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {distributors.map((d) => (
                <div key={d.id} className="p-3 border border-border rounded-xs bg-muted/20 flex justify-between items-center hover:bg-muted/40 transition-colors">
                  <div>
                    <div className="font-semibold text-xs text-foreground">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">Contact: {d.contact_person || 'Manager'} • {d.phone || '--'}</div>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => handleDeleteItem('distributors', d.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'languages' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {languages.map((l) => (
                <div key={l.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <span>{l.name}</span>
                  <Button variant="ghost" size="xs" onClick={() => handleDeleteItem('languages', l.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'types' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {movieTypes.map((mt) => (
                <div key={mt.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <Badge variant="blue" className="text-xs">{mt.name}</Badge>
                  <Button variant="ghost" size="xs" onClick={() => handleDeleteItem('movie_types', mt.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categories.map((c) => (
                <div key={c.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <span>{c.name} Censor</span>
                  <Button variant="ghost" size="xs" onClick={() => handleDeleteItem('categories', c.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {seatClasses.map((sc) => (
                <div key={sc.id} className="p-3 border border-border rounded-xs bg-muted/20 flex justify-between items-center hover:bg-muted/40 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-5 h-5 rounded-xs border border-border shadow-xs shrink-0"
                      style={{ backgroundColor: sc.color }}
                    />
                    <div>
                      <div className="font-semibold text-xs text-foreground">{sc.name}</div>
                      <div className="text-[10px] text-muted-foreground">Order #{sc.display_order}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost" size="xs"
                      onClick={() => openEditSeatClass(sc)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="xs"
                      onClick={() => handleDeleteItem('seat_classes', sc.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reasons' && (
            <div className="space-y-2">
              {reasons.map((r) => (
                <div key={r.id} className="p-2.5 border border-border rounded-xs bg-muted/20 flex justify-between items-center text-xs hover:bg-muted/40 transition-colors">
                  <span className="font-semibold text-foreground">{r.reason}</span>
                  <Button variant="ghost" size="xs" onClick={() => handleDeleteItem('cancellation_reasons', r.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Contact Person / Phone</label>
              <Input
                value={newItemExtra}
                onChange={(e) => setNewItemExtra(e.target.value)}
                placeholder="e.g. Sales Rep / 9876543210"
              />
            </div>
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
                  value={newItemExtra}
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

      {/* Edit Seat Class Modal */}
      <Modal
        isOpen={!!editingSeatClass}
        onClose={() => setEditingSeatClass(null)}
        title="Edit Seat Class"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Class Name *</label>
            <Input
              value={editScName}
              onChange={(e) => setEditScName(e.target.value)}
              placeholder="e.g. Gold Plus"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Display Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={editScColor}
                onChange={(e) => setEditScColor(e.target.value)}
                className="w-10 h-8 rounded-xs border border-border cursor-pointer p-0.5"
              />
              <Input
                value={editScColor}
                onChange={(e) => setEditScColor(e.target.value)}
                placeholder="#3b82f6"
                className="font-mono text-xs"
              />
              <span
                className="w-8 h-8 rounded-xs border border-border shrink-0"
                style={{ backgroundColor: editScColor }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Display Order</label>
            <Input
              type="number"
              value={editScOrder}
              onChange={(e) => setEditScOrder(Number(e.target.value))}
              min={1} max={20}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditingSeatClass(null)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveSeatClass} className="font-bold">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
