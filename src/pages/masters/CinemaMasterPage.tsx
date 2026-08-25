import React, { useState, useEffect } from 'react';
import { Cinema, Screen } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { settingsService, screenService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Building2, Save, Plus, Edit, Trash2, Armchair, MapPin, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const CinemaMasterPage: React.FC = () => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');
  const canCreateScreen = isSystemAdmin || hasPermission('seat_layout', 'can_create');
  const canUpdateScreen = isSystemAdmin || hasPermission('seat_layout', 'can_update');
  const canDeleteScreen = isSystemAdmin || hasPermission('seat_layout', 'can_delete');

  const { cinema, fetchSettings, updateCinema } = useSettingsStore();
  const [formData, setFormData] = useState<Partial<Cinema>>({});
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Screen Sub-Master state
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Partial<Screen> | null>(null);

  const fetchScreens = async () => {
    const scList = await screenService.getScreens();
    setScreens(scList);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchSettings();
      const directCinema = await settingsService.getCinema();
      if (directCinema) {
        setFormData(directCinema);
      }
      await fetchScreens();
    } catch (e) {
      console.error('Failed to load cinema data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (cinema && cinema.name) {
      setFormData(cinema);
    }
  }, [cinema]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.gstin) {
      alert('Cinema Name, Address, and GSTIN are required fields.');
      return;
    }

    await updateCinema(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSaveScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScreen?.name) return;

    await screenService.saveScreen(editingScreen);
    setIsScreenModalOpen(false);
    setEditingScreen(null);
    await fetchScreens();
  };

  const handleDeleteScreen = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate/delete this Screen?')) {
      await screenService.deleteScreen(id);
      await fetchScreens();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none">
      {/* Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Cinema / Theatre Profile Master
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="text-success text-xs font-bold flex items-center mr-2">
              <CheckCircle className="w-4 h-4 mr-1" /> Profile Saved Successfully
            </span>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cinema Settings Form */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Legal &amp; Business Information
              </CardTitle>
              <CardDescription className="text-2xs text-muted-foreground">
                Required for tax invoices, GST returns, and thermal ticket printing headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSave} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Cinema / Theatre Name *</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Grand Multiplex Cinemas"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Complete Address *</label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street, City, State - PIN"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">GSTIN (15 Digits) *</label>
                    <Input
                      value={formData.gstin || ''}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="18AJVPD0031E3Z1"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">CIN (Corporate ID)</label>
                    <Input
                      value={formData.cin || ''}
                      onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                      placeholder="U92100AS2018PTC018500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Contact Numbers</label>
                  <Input
                    value={formData.contact_numbers || ''}
                    onChange={(e) => setFormData({ ...formData, contact_numbers: e.target.value })}
                    placeholder="03752-245678 / +91 9876543210"
                  />
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Thermal Ticket Header Text</label>
                    <Input
                      value={formData.header_text || ''}
                      onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                      placeholder="Printed at top of thermal ticket"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Thermal Ticket Footer Notice</label>
                    <Input
                      value={formData.footer_text || ''}
                      onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                      placeholder="e.g. Retain ticket till show ends."
                    />
                  </div>
                </div>

                {canUpdate && (
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" variant="default" size="sm" className="font-bold">
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Save Cinema Profile
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Info Column */}
        <div className="space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Live Ticket Header Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-2">
              <div className="border border-dashed border-border p-3 rounded-xs bg-muted/10 text-center font-mono space-y-1 select-text">
                <div className="font-black text-xs uppercase">{formData.header_text || formData.name || 'CINEMA NAME'}</div>
                <div className="text-2xs text-muted-foreground">{formData.address || 'Cinema Address, City'}</div>
                <div className="text-2xs font-semibold">GSTIN: {formData.gstin || '18AJVPD0031E3Z1'}</div>
                <div className="border-t border-border pt-1 text-2xs text-muted-foreground">
                  {formData.footer_text || 'Thank you for visiting!'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Screens / Auditoriums Management */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="p-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center">
              <Armchair className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Auditoriums &amp; Screens ({screens.length})
            </CardTitle>
            <CardDescription className="text-2xs text-muted-foreground">
              Define the physical auditoriums and seating capacities for your cinema.
            </CardDescription>
          </div>

          {canCreateScreen && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingScreen({ name: `Screen ${screens.length + 1}`, capacity: 140, is_active: true });
                setIsScreenModalOpen(true);
              }}
              className="font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Screen
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="border-b border-border">
                <TableHead className="pl-3 text-[11px] font-semibold uppercase text-muted-foreground">Screen / Hall Name</TableHead>
                <TableHead className="text-center text-[11px] font-semibold uppercase text-muted-foreground">Total Capacity</TableHead>
                <TableHead className="text-center text-[11px] font-semibold uppercase text-muted-foreground">Status</TableHead>
                {(canUpdateScreen || canDeleteScreen) && <TableHead className="text-right pr-3 text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {screens.map((screen: Screen) => (
                <TableRow key={screen.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-3 font-semibold text-foreground">
                    {screen.name}
                  </TableCell>
                  <TableCell className="text-center font-medium text-foreground">
                    {screen.capacity} Seats
                  </TableCell>
                  <TableCell className="text-center">
                    {screen.is_active ? (
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </TableCell>
                  {(canUpdateScreen || canDeleteScreen) && (
                    <TableCell className="text-right pr-3 space-x-1">
                      {canUpdateScreen && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setEditingScreen(screen);
                            setIsScreenModalOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-0.5" /> Edit
                        </Button>
                      )}
                      {canDeleteScreen && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteScreen(screen.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Screen Add/Edit Modal */}
      <Modal
        isOpen={isScreenModalOpen}
        onClose={() => {
          setIsScreenModalOpen(false);
          setEditingScreen(null);
        }}
        title={editingScreen?.id ? 'Edit Auditorium Screen' : 'Add New Auditorium Screen'}
        description="Configure screen name and total seating capacity"
      >
        <form onSubmit={handleSaveScreen} className="space-y-3 text-xs pt-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Screen / Audi Name *</label>
            <Input
              value={editingScreen?.name || ''}
              onChange={(e) => setEditingScreen({ ...editingScreen, name: e.target.value })}
              placeholder="e.g. Screen 1 (Audi 1)"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Total Seating Capacity</label>
            <Input
              type="number"
              value={editingScreen?.capacity || 140}
              onChange={(e) => setEditingScreen({ ...editingScreen, capacity: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="screenActive"
              checked={Boolean(editingScreen?.is_active ?? true)}
              onChange={(e) => setEditingScreen({ ...editingScreen, is_active: e.target.checked })}
              className="rounded-xs text-primary h-4 w-4"
            />
            <label htmlFor="screenActive" className="text-xs font-medium text-foreground cursor-pointer">
              Active for Ticketing &amp; Shows
            </label>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsScreenModalOpen(false);
                setEditingScreen(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" className="font-bold">
              Save Screen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
