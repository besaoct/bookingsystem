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
import { Building2, Save, Plus, Edit, Armchair, MapPin, FileText, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const CinemaMasterPage: React.FC = () => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');
  const canCreateScreen = isSystemAdmin || hasPermission('seat_layout', 'can_create');
  const canUpdateScreen = isSystemAdmin || hasPermission('seat_layout', 'can_update');

  const { cinema, fetchSettings, updateCinema } = useSettingsStore();
  const [formData, setFormData] = useState<Partial<Cinema>>({});
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Screen Sub-Master state
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Partial<Screen> | null>(null);

  const fetchScreens = async () => {
    const scList = await screenService.getScreens();
    setScreens(scList);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchSettings();
      const directCinema = await settingsService.getCinema();
      if (directCinema) {
        setFormData(directCinema);
      }
      await fetchScreens();
    };
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

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header Card */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Cinema &amp; Hall Profile
          </span>
        </div>

        {isSaved && (
          <span className="text-success text-xs font-bold flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" /> Profile Saved Successfully
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Core Cinema & Location Details */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="flex items-center space-x-1.5 text-xs text-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Cinema Hall &amp; Location Details</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Primary identification printed on tickets and statutory collection reports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Cinema / Theatre Name *</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Grand Multiplex"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Location &amp; Full Address *</label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 123 Cinema Boulevard, City, State - Pin Code"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">GSTIN (Mandatory) *</label>
                <Input
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="e.g. 18ABCDE1234F1Z5"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">CIN / Registration No</label>
                <Input
                  value={formData.cin || ''}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  placeholder="e.g. U92100AS2018PTC018500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Contact Numbers / Helpdesk</label>
              <Input
                value={formData.contact_numbers || ''}
                onChange={(e) => setFormData({ ...formData, contact_numbers: e.target.value })}
                placeholder="e.g. 03752-245678 / +91 9876543210"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Thermal Ticket Slip Headers & Footers */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border">
            <CardTitle className="flex items-center space-x-1.5 text-xs text-foreground">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Thermal Receipt Slip Customization</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Configure top title and bottom terms for thermal printing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Receipt Header Text (Top of Ticket)
              </label>
              <Input
                value={formData.header_text || ''}
                onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                placeholder="e.g. Welcome to Grand Multiplex"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Receipt Footer Greeting &amp; Disclaimer
              </label>
              <textarea
                rows={4}
                value={formData.footer_text || ''}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                className="w-full p-2 text-xs border border-input rounded-xs bg-background focus:outline-none font-medium"
                placeholder="e.g. Thank you for your visit! Please retain this ticket till the end of the show."
              />
            </div>

            <div className="p-2.5 bg-muted/30 rounded-xs border border-border text-xs space-y-1">
              <span className="font-semibold text-foreground">Thermal Output Preview:</span>
              <div className="bg-card p-2 border border-border rounded-xs text-xs">
                <div className="font-bold text-foreground truncate">
                  {formData.header_text || formData.name || 'CINEMA HEADER'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {formData.address || 'Location Address'} | GSTIN: {formData.gstin || '18AJVPD0031E3Z1'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button for Cinema Profile */}
        {canUpdate && (
          <div className="lg:col-span-2 flex justify-end">
            <Button type="submit" variant="default" size="default" className="font-bold px-6">
              <Save className="w-4 h-4 mr-1.5" />
              Save Cinema Profile
            </Button>
          </div>
        )}
      </form>

      {/* Screen / Auditoriums Configuration Section */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="p-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-1.5 text-xs text-foreground">
              <Armchair className="w-3.5 h-3.5 text-primary" />
              <span>Cinema Screens &amp; Auditoriums</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Manage cinema hall screens, seating capacities, and active status
            </CardDescription>
          </div>

          {canCreateScreen && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setEditingScreen({ name: `Screen ${screens.length + 1}`, capacity: 140, is_active: true });
                setIsScreenModalOpen(true);
              }}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Screen
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
                {canUpdateScreen && <TableHead className="text-right pr-3 text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>}
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
                  {canUpdateScreen && (
                    <TableCell className="text-right pr-3">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setEditingScreen(screen);
                          setIsScreenModalOpen(true);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-0.5" /> Edit Screen
                      </Button>
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
