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
import { Building2, Save, Plus, Pencil, Trash2, Armchair, FileText, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { licenseService } from '@/services/license.service';
import { LicenseUpgradeModal } from '@/components/license/LicenseUpgradeModal';

export const CinemaMasterPage: React.FC<{ onNavigate?: (page: any) => void }> = ({ onNavigate }) => {
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

  // Upgrade Modal State
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    limitType: 'screen' | 'seat';
    currentCount: number;
    maxLimit: number;
  }>({
    isOpen: false,
    limitType: 'screen',
    currentCount: 0,
    maxLimit: 0,
  });

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
    await updateCinema(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleOpenAddScreen = async () => {
    const check = await licenseService.validateAddScreen();
    if (!check.allowed && check.maxScreens !== null) {
      setUpgradeModal({
        isOpen: true,
        limitType: 'screen',
        currentCount: check.currentScreens,
        maxLimit: check.maxScreens,
      });
      return;
    }
    setEditingScreen({ name: '', capacity: 140, is_active: true });
    setIsScreenModalOpen(true);
  };

  const handleSaveScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScreen?.name) return;

    if (!editingScreen.id) {
      const check = await licenseService.validateAddScreen();
      if (!check.allowed && check.maxScreens !== null) {
        setIsScreenModalOpen(false);
        setUpgradeModal({
          isOpen: true,
          limitType: 'screen',
          currentCount: check.currentScreens,
          maxLimit: check.maxScreens,
        });
        return;
      }
    }

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
            <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-xs flex items-center space-x-1.5 shadow-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 mr-1 shrink-0 text-white" />
              <span>Cinema Profile Saved Successfully</span>
            </span>
          )}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">GST SAC Code</label>
                    <Input
                      value={formData.sac_code ?? '999615'}
                      onChange={(e) => setFormData({ ...formData, sac_code: e.target.value })}
                      placeholder="e.g. 999615"
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

                  {/* GSTIN on Ticket Toggle */}
                  <div className="space-y-1 pt-1 border-t border-border/60">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showGstinOnTicketToggle"
                        checked={Boolean(formData.show_gstin_on_ticket)}
                        onChange={(e) => setFormData({ ...formData, show_gstin_on_ticket: e.target.checked })}
                        className="rounded-xs text-primary h-4 w-4 cursor-pointer align-middle"
                        disabled={!canUpdate}
                      />
                      <label htmlFor="showGstinOnTicketToggle" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        Show GSTIN on Printed Tickets
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      By default, GSTIN is hidden on ticket slips. Check this box if your cinema requires GSTIN printed on customer and office slips.
                    </p>
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

        {/* Right Info Column: Live Thermal Ticket Preview */}
        <div className="space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Live Ticket Header &amp; Slip Preview
              </CardTitle>
              <CardDescription className="text-2xs text-muted-foreground">
                Real-time thermal print representation based on current cinema profile
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 text-xs flex flex-col items-center bg-slate-100 dark:bg-slate-900/50">
              <div
                className="bg-white text-black shadow-sm select-text w-full max-w-85"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '8px',
                  lineHeight: 1.15,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  background: '#fff',
                  color: '#000',
                  border: '1.5px solid #000',
                  borderRadius: '2px',
                  padding: '6px 8px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header Top: Copy Code Badge + Cinema Name + Quantity Circle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '2px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', border: '1.5px solid #000', fontWeight: 900, fontSize: '9px', borderRadius: '2px', flexShrink: 0 }}>
                      C
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '9.5px', letterSpacing: '0.2px', textTransform: 'uppercase', lineHeight: 1.1, wordBreak: 'break-word' }}>
                      {formData.header_text || formData.name || 'NAKSHATRA CINEMAS - LAKHIMPUR'}
                    </span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', border: '1.5px solid #000', borderRadius: '50%', fontWeight: 800, fontSize: '9px', flexShrink: 0, marginLeft: '4px' }}>
                    2
                  </div>
                </div>

                {/* Movie Title Line */}
                <div style={{ fontWeight: 700, fontSize: '9.5px', textTransform: 'uppercase', margin: '1px 0', lineHeight: 1.15, minHeight: '1.15em', wordBreak: 'break-word' }}>
                  AVATAR : FIRE AND ASH 3D
                </div>

                {/* Middle 3-Column Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.15fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0', fontSize: '7.5px' }}>
                  {/* Column 1: Financial & Tax Breakup */}
                  <div style={{ borderRight: '1px solid #000', paddingRight: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '7px', lineHeight: 1.05 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ADM</span><span style={{ fontWeight: 700 }}>160.00</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>3D</span><span style={{ fontWeight: 700 }}>80.00</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST</span><span style={{ fontWeight: 700 }}>21.60</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST</span><span style={{ fontWeight: 700 }}>21.60</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>S.CH</span><span style={{ fontWeight: 700 }}>24.00</span></div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '10px', marginTop: '1px', borderTop: '0.5px solid #000', whiteSpace: 'nowrap' }}>
                      Total: 307.20
                    </div>
                  </div>

                  {/* Column 2: Date, Showtime & SAC Code */}
                  <div style={{ borderRight: '1px solid #000', padding: '0 4px', lineHeight: 1.15, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '9px', lineHeight: 1.12, wordBreak: 'break-word' }}>Tue, 25-08-2026</div>
                      <div style={{ marginTop: '1px', lineHeight: 1.15, wordBreak: 'break-word' }}>
                        <span style={{ fontWeight: 600, fontSize: '7px', textTransform: 'capitalize' }}>Evening, </span>
                        <span style={{ fontWeight: 800, fontSize: '9.5px', whiteSpace: 'nowrap' }}>06:30 PM</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '7px', marginTop: '1px', whiteSpace: 'nowrap' }}>SAC {formData.sac_code || '999615'}</div>
                  </div>

                  {/* Column 3: Auditorium, Seat Numbers & Class */}
                  <div style={{ paddingLeft: '4px', lineHeight: 1.15, textAlign: 'left', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '9.5px', textTransform: 'uppercase', lineHeight: 1.12, wordBreak: 'break-word' }}>{screens[0]?.name?.toUpperCase() || 'NAKSHATRA'}</div>
                      <div style={{ fontWeight: 800, fontSize: '8.5px', letterSpacing: '0.2px', wordBreak: 'break-word' }}>A-1, A-2</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '8.5px', textTransform: 'uppercase', margin: '1px 0', lineHeight: 1.12, wordBreak: 'break-word' }}>BOX</div>
                  </div>
                </div>

                {/* Footer Section: Tax IDs & Audit Tracking */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6.5px', lineHeight: 1.08, paddingTop: '1px', fontWeight: 600 }}>
                  <div style={{ maxWidth: '50%', lineHeight: 1.1, wordBreak: 'break-all' }}>
                    {formData.show_gstin_on_ticket && formData.gstin ? <div>GSTIN: {formData.gstin}</div> : null}
                    {formData.cin ? <div>CIN: {formData.cin}</div> : null}
                  </div>
                  <div style={{ textAlign: 'right', lineHeight: 1.1, wordBreak: 'break-word' }}>
                    <div>Ticket No: 009571&nbsp;&nbsp;L.No. Txn: A000001-71W</div>
                    <div>INV No. : NC/00000001&nbsp;&nbsp;25-Aug-26 06:30:15 PM</div>
                  </div>
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
              onClick={handleOpenAddScreen}
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
                          <Pencil className="w-3 h-3 mr-0.5" /> Edit
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
              placeholder="e.g. Nakshatra"
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

      {/* License Upgrade Dialog */}
      <LicenseUpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
        limitType={upgradeModal.limitType}
        currentCount={upgradeModal.currentCount}
        maxLimit={upgradeModal.maxLimit}
        onNavigateToSettings={onNavigate ? () => onNavigate('system_settings') : undefined}
      />
    </div>
  );
};
