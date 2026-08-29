import React, { useState, useEffect } from 'react';
import { Screen, SeatRow, Seat, SeatClass } from '@/types';
import { screenService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Armchair, Plus, Trash2, ZoomIn, ZoomOut, RotateCcw, Tag } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { NavPage } from '@/components/layout/Sidebar';
import { licenseService } from '@/services/license.service';
import { LicenseUpgradeModal } from '@/components/license/LicenseUpgradeModal';

interface SeatDialogState {
  seat: any;
  isOpen: boolean;
}

export const ScreenSeatLayoutMasterPage: React.FC<{ onNavigate?: (page: NavPage) => void }> = ({ onNavigate }) => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canRead = isSystemAdmin || hasPermission('seat_layout', 'can_read');
  const canCreate = isSystemAdmin || hasPermission('seat_layout', 'can_create');
  const canUpdate = isSystemAdmin || hasPermission('seat_layout', 'can_update');
  const canDelete = isSystemAdmin || hasPermission('seat_layout', 'can_delete');

  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<number>(1);
  const [seatClasses, setSeatClasses] = useState<SeatClass[]>([]);
  const [rows, setRows] = useState<SeatRow[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState<number>(1.0);

  // Upgrade Modal State
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    limitType: 'screen' | 'seat';
    currentCount: number;
    maxLimit: number;
  }>({
    isOpen: false,
    limitType: 'seat',
    currentCount: 0,
    maxLimit: 0,
  });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(1.8, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.65, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  // Add Screen / Row Modal
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [newRowName, setNewRowName] = useState('');
  const [newRowSeatsCount, setNewRowSeatsCount] = useState(10);
  const [newRowClassId, setNewRowClassId] = useState<number>(1);

  // Seat Context Dialog (click-triggered, no hover z-index issues)
  const [seatDialog, setSeatDialog] = useState<SeatDialogState>({ seat: null, isOpen: false });

  const openSeatDialog = (seat: any) => setSeatDialog({ seat, isOpen: true });
  const closeSeatDialog = () => setSeatDialog({ seat: null, isOpen: false });

  const fetchLayout = async () => {
    setIsLoading(true);
    try {
      const screenList = await screenService.getScreens();
      setScreens(screenList);

      const activeScreen = screenList.find((s) => s.id === selectedScreenId) || screenList[0];
      if (activeScreen) {
        setSelectedScreenId(activeScreen.id);
      }

      const classesList = await screenService.getSeatClasses();
      setSeatClasses(classesList);
      if (classesList.length > 0 && !newRowClassId) {
        setNewRowClassId(classesList[0].id);
      }

      if (activeScreen) {
        const rowsList = await screenService.getScreenSeatRows(activeScreen.id);
        setRows(rowsList);

        const seatsList = await screenService.getScreenSeats(activeScreen.id);
        setSeats(seatsList);
      }
    } catch (e) {
      console.error('Failed to fetch screen layout:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayout();
  }, [selectedScreenId]);

  const handleAddRow = async () => {
    if (!newRowName) {
      alert('Please provide a Row Name (e.g. A, B, C)');
      return;
    }

    const seatCheck = await licenseService.validateAddSeats(newRowSeatsCount);
    if (!seatCheck.allowed && seatCheck.maxSeats !== null) {
      setIsAddRowOpen(false);
      setUpgradeModal({
        isOpen: true,
        limitType: 'seat',
        currentCount: seatCheck.currentSeats,
        maxLimit: seatCheck.maxSeats,
      });
      return;
    }

    await screenService.addRowToScreen(selectedScreenId, newRowName, newRowSeatsCount, newRowClassId);
    setIsAddRowOpen(false);
    setNewRowName('');
    await fetchLayout();
  };

  const handleDeleteRow = async (rowId: number) => {
    if (confirm('Are you sure you want to delete this row and all its seats?')) {
      await screenService.deleteRow(rowId, selectedScreenId);
      await fetchLayout();
    }
  };

  const handleUpdateRowClass = async (rowId: number, classId: number) => {
    await screenService.updateRowSeatClass(rowId, classId);
    await fetchLayout();
  };

  const handleUpdateSeatClass = async (seatId: number, classId: number) => {
    await screenService.updateSeatClass(seatId, classId);
    await fetchLayout();
  };

  const handleToggleSeatAisle = async (seatId: number, currentAisle: boolean) => {
    await screenService.toggleSeatAisle(seatId, currentAisle);
    await fetchLayout();
  };

  const handleToggleSeatBlocked = async (seatId: number, currentBlocked: boolean) => {
    if (currentBlocked) {
      // Unblocking will add 1 active seat, check limit
      const seatCheck = await licenseService.validateAddSeats(1);
      if (!seatCheck.allowed && seatCheck.maxSeats !== null) {
        setUpgradeModal({
          isOpen: true,
          limitType: 'seat',
          currentCount: seatCheck.currentSeats,
          maxLimit: seatCheck.maxSeats,
        });
        return;
      }
    }
    await screenService.toggleSeatBlocked(seatId, currentBlocked);
    await fetchLayout();
  };

  const handleToggleSeatWheelchair = async (seatId: number, currentWheelchair: boolean) => {
    await screenService.toggleSeatWheelchair(seatId, currentWheelchair);
    await fetchLayout();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Filter Bar */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Armchair className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Screen Layout Builder
            </span>
          </div>

          <div className="pl-3 border-l border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-52">
                  <Select
                    value={String(selectedScreenId)}
                    onValueChange={(val) => setSelectedScreenId(Number(val))}
                  >
                    <SelectTrigger className="h-8 text-xs font-normal min-w-0 truncate">
                      <div className="flex items-center space-x-1.5 min-w-0 truncate">
                        <Armchair className="w-3.5 h-3.5 text-primary shrink-0" />
                        <SelectValue placeholder="Select auditorium" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {screens.map((sc) => (
                        <SelectItem key={sc.id} value={String(sc.id)}>
                          <div className="flex items-center space-x-1.5 min-w-0 truncate">
                            <span className="font-normal truncate">{sc.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">({sc.capacity} Seats)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>Select Auditorium / Screen Layout</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-muted/60 p-0.5 rounded-xs border border-border mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.65}
                  className="h-7 w-7 p-0 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Zoom Out ({(zoom * 100).toFixed(0)}%)</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 text-[11px] font-mono font-bold text-foreground hover:bg-background rounded-xs cursor-pointer"
                >
                  {Math.round(zoom * 100)}%
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Reset to 100%</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleZoomIn}
                  disabled={zoom >= 1.8}
                  className="h-7 w-7 p-0 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Zoom In ({(zoom * 100).toFixed(0)}%)</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleResetZoom}
                  disabled={zoom === 1.0}
                  className="h-7 w-7 p-0 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Reset Zoom</span>
              </TooltipContent>
            </Tooltip>
          </div>

          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('master_others')}
              className="cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 mr-1 text-primary" />
              Manage Seat Classes
            </Button>
          )}


          {canCreate && (
            <Button variant="default" size="sm" onClick={() => setIsAddRowOpen(true)} className="cursor-pointer font-bold">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Row to Screen
            </Button>
          )}
        </div>
      </div>

      {/* Main Layout Editor */}
      <div className="flex-1 bg-card border border-border rounded-xs p-4 overflow-y-auto flex flex-col space-y-4 shadow-xs">
        {/* Classes Legend Bar */}
        <div className="flex items-center justify-between p-2.5 bg-muted/30 border border-border rounded-xs text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {seatClasses.map((sc) => (
              <div key={sc.id} className="flex items-center space-x-1.5 bg-card px-2 py-0.5 rounded-xs border border-border">
                <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: sc.color }} />
                <span className="font-bold text-foreground text-[11px]">{sc.name}</span>
              </div>
            ))}
          </div>
          <span className="text-muted-foreground text-xs">
            Total Rows: <strong className="text-foreground">{rows.length}</strong> | Total Capacity: <strong className="text-foreground">{seats.length}</strong> Seats
          </span>
        </div>

        {/* Rows & Interactive Scalable Seat Tiles */}
        <div
          className="space-y-3 transition-transform duration-100 ease-out origin-top pb-8"
          style={{ transform: `scale(${zoom})` }}
        >
          {rows.map((row) => {
            const rowSeats = seats.filter((s) => s.row_id === row.id);
            const firstSeatClassId = rowSeats[0]?.seat_class_id || 1;

            return (
              <div
                key={row.id}
                className="p-3 border border-border rounded-xs bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/50 transition-colors shadow-2xs"
              >
                {/* Row Label & Class Selector */}
                <div className="flex items-center space-x-2.5 shrink-0">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-xs font-black text-xs flex items-center justify-center shadow-xs">
                    {row.row_name}
                  </div>
                  
                  {/* Dynamic Row Seat Class Dropdown */}
                  {canUpdate ? (
                    <Select
                      value={String(firstSeatClassId)}
                      onValueChange={(val) => handleUpdateRowClass(row.id, Number(val))}
                    >
                      <SelectTrigger className="h-7 text-[11px] font-bold w-fit min-w-28 shrink-0 bg-card">
                        <SelectValue placeholder="Row Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {seatClasses.map((sc) => (
                          <SelectItem key={sc.id} value={String(sc.id)}>
                            <div className="flex items-center space-x-1.5">
                              <span className="min-w-2.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.color }} />
                              <span>{sc.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs font-bold text-foreground">
                      {rowSeats[0]?.seat_class_name || 'Class'}
                    </span>
                  )}
                </div>

                {/* Seats Array in Row */}
                <div className="flex-1 flex flex-wrap items-center gap-1.5">
                  {rowSeats.map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => openSeatDialog(seat)}
                      className={`w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-xs text-xs font-bold border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                        seat.is_blocked
                          ? 'bg-muted border-border text-muted-foreground opacity-40 line-through'
                          : 'bg-card hover:scale-110 border-input text-foreground hover:border-primary hover:text-primary'
                      }`}
                      style={{
                        borderTopColor: seat.seat_class_color || seat.class_color || '#3b82f6',
                        borderTopWidth: '4px',
                      }}
                      title={`Click to configure Seat ${seat.row_name}-${seat.seat_number}`}
                    >
                      {seat.seat_number}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center space-x-1">
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2.5 cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Context Dialog (click-triggered) */}
      <Modal
        isOpen={seatDialog.isOpen}
        onClose={closeSeatDialog}
        title={seatDialog.seat ? `Seat ${seatDialog.seat.row_name}-${seatDialog.seat.seat_number}` : ''}
        description={seatDialog.seat ? `Class: ${seatDialog.seat.seat_class_name || 'N/A'} · ${seatDialog.seat.is_blocked ? 'BLOCKED' : 'Available'}` : ''}
        maxWidth="sm"
      >
        {seatDialog.seat && (
          <div className="space-y-4 text-xs">
            {/* Change Seat Class */}
            {canUpdate && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Change Seat Class</span>
                <div className="flex flex-wrap gap-1.5">
                  {seatClasses.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={async () => {
                        await handleUpdateSeatClass(seatDialog.seat.id, sc.id);
                        closeSeatDialog();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-bold border transition-colors cursor-pointer ${
                        seatDialog.seat.seat_class_id === sc.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground hover:bg-accent border-border'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: sc.color }} />
                      {sc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Aisle & Block toggles */}
            {canUpdate && (
              <div className="flex gap-2 pt-1 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await handleToggleSeatAisle(seatDialog.seat.id, Boolean(seatDialog.seat.is_aisle));
                    closeSeatDialog();
                  }}
                  className="flex-1 font-bold text-xs cursor-pointer"
                >
                  {seatDialog.seat.is_aisle ? 'Remove Aisle Gap' : 'Add Aisle Gap'}
                </Button>
                <Button
                  variant={seatDialog.seat.is_blocked ? 'default' : 'destructive'}
                  size="sm"
                  onClick={async () => {
                    await handleToggleSeatBlocked(seatDialog.seat.id, Boolean(seatDialog.seat.is_blocked));
                    closeSeatDialog();
                  }}
                  className="flex-1 font-bold text-xs cursor-pointer"
                >
                  {seatDialog.seat.is_blocked ? 'Unblock Seat' : 'Block Seat'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Row Modal */}
      <Modal
        isOpen={isAddRowOpen}
        onClose={() => setIsAddRowOpen(false)}
        title="Add New Row to Screen Layout"
        description="Creates a physical row of seats attached to the selected screen"
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Row Alphabet / Code *</label>
            <Input
              value={newRowName}
              onChange={(e) => setNewRowName(e.target.value)}
              placeholder="e.g. A, B, K, AA"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Number of Seats *</label>
            <Input
              type="number"
              value={newRowSeatsCount}
              onChange={(e) => setNewRowSeatsCount(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Seat Class Category *</label>
            <Select
              value={String(newRowClassId)}
              onValueChange={(val) => setNewRowClassId(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select seat class" />
              </SelectTrigger>
              <SelectContent>
                {seatClasses.map((sc) => (
                  <SelectItem key={sc.id} value={String(sc.id)}>
                    {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddRowOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleAddRow} className="font-bold">
              Add Row &amp; Seats
            </Button>
          </div>
        </div>
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
