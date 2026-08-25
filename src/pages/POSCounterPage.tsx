import React, { useState, useEffect, useMemo } from 'react';
import { useBookingStore, EnrichedSeat } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SeatMap } from '@/components/seatmap/SeatMap';
import { TicketPreviewModal } from '@/components/ticket/TicketPreviewModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { calculateSeatTaxes, CalculatedSeatPrice } from '@/lib/tax-calculator';
import {
  Film,
  Clock,
  Calendar,
  Printer,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Armchair,
} from 'lucide-react';
import { Movie, Show, Screen, PaymentMode } from '@/types';

export const POSCounterPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const canCreateBooking = user?.role === 'SYSTEM_ADMIN' || hasPermission('booking', 'can_create');
  const { cinema, ticketCopies, taxConfig, paymentModes, systemSettings, fetchSettings } = useSettingsStore();

  const {
    selectedDate,
    selectedScreenId,
    selectedMovieId,
    selectedShowId,
    selectedSeatIds,
    selectedPaymentModeId,
    applyGst,
    movies,
    shows,
    screens,
    rows,
    seats,
    isLoading,
    isBookingProcessing,
    lastBooking,
    setDate,
    setScreenId,
    setMovieId,
    setShowId,
    setPaymentModeId,
    toggleSeatSelection,
    clearSeatSelection,
    toggleApplyGst,
    fetchInitialData,
    confirmBooking,
  } = useBookingStore();

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
    fetchSettings();
  }, []);

  const selectedMovie = movies.find((m: Movie) => m.id === selectedMovieId);
  const selectedShow = shows.find((s: Show) => s.id === selectedShowId);
  const selectedScreen = screens.find((s: Screen) => s.id === selectedScreenId) || screens.find((s: Screen) => s.id === selectedShow?.screen_id);

  const currentShows = useMemo(() => {
    let list = shows.filter((s: Show) => {
      const matchMovie = selectedMovieId ? s.movie_id === selectedMovieId : true;
      const matchScreen = selectedScreenId ? s.screen_id === selectedScreenId : true;
      return matchMovie && matchScreen;
    });
    if (list.length === 0 && selectedMovieId) {
      list = shows.filter((s: Show) => s.movie_id === selectedMovieId);
    }
    if (list.length === 0 && selectedScreenId) {
      list = shows.filter((s: Show) => s.screen_id === selectedScreenId);
    }
    return list.length > 0 ? list : shows;
  }, [shows, selectedMovieId, selectedScreenId]);

  const selectedSeatsList = useMemo(() => {
    return seats.filter((s: EnrichedSeat) => selectedSeatIds.includes(s.id));
  }, [seats, selectedSeatIds]);

  const liveCalculation = useMemo(() => {
    if (!taxConfig) {
      return {
        items: [] as { seat: EnrichedSeat; calc: CalculatedSeatPrice }[],
        net: 0,
        cgst: 0,
        sgst: 0,
        sc: 0,
        gross: 0,
      };
    }

    let net = 0;
    let cgst = 0;
    let sgst = 0;
    let sc = 0;
    let gross = 0;

    const items = selectedSeatsList.map((seat: EnrichedSeat) => {
      const calc = calculateSeatTaxes(seat.base_price, taxConfig, applyGst, seat.service_charge);
      net += calc.baseNet;
      cgst += calc.cgst;
      sgst += calc.sgst;
      sc += calc.serviceCharge;
      gross += calc.grossTotal;
      return { seat, calc };
    });

    return { items, net, cgst, sgst, sc, gross };
  }, [selectedSeatsList, taxConfig, applyGst]);

  const handleConfirmBooking = async () => {
    if (!user) {
      alert('Please log in as an operator to issue tickets.');
      return;
    }

    if (selectedSeatIds.length === 0) {
      alert('Please select at least 1 seat.');
      return;
    }

    if (!taxConfig) {
      alert('Tax configuration is missing.');
      return;
    }

    setErrorMessage(null);
    const booking = await confirmBooking(user.id, taxConfig);
    if (booking) {
      setIsTicketModalOpen(true);
    } else {
      setErrorMessage('Failed to issue tickets. Selected seats may have been booked.');
    }
  };

  // Keyboard Shortcuts: F9 to Print, Esc to Clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleConfirmBooking();
      } else if (e.key === 'Escape') {
        clearSeatSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSeatIds, user, taxConfig, applyGst]);

  // Distinct seat classes present
  const seatClasses = useMemo(() => {
    const classMap = new Map<number, { id: number; name: string; color: string }>();
    seats.forEach((s: EnrichedSeat) => {
      if (s.seat_class_id && !classMap.has(s.seat_class_id)) {
        classMap.set(s.seat_class_id, {
          id: s.seat_class_id,
          name: s.class_name || 'Class',
          color: s.class_color || '#3b82f6',
        });
      }
    });
    return Array.from(classMap.values()) as any;
  }, [seats]);

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 gap-2.5 bg-muted/40 select-none">
      {/* Top Bar: Date, Screen / Audi, Movie, Show Selection Bar */}
      <div className="bg-card border border-border rounded-xs p-2.5 flex flex-wrap items-center gap-2.5 shrink-0 shadow-xs">
        {/* Date Selector with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="shrink-0">
              <DatePicker
                value={selectedDate}
                onChange={setDate}
                className="w-36 h-8"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Show / Booking Date</span>
          </TooltipContent>
        </Tooltip>

        {/* Screen / Auditorium Select Dropdown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 min-w-[170px] max-w-[210px]">
              <Select
                value={String(selectedScreenId || '')}
                onValueChange={(val) => setScreenId(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs font-normal min-w-0 truncate">
                  <div className="flex items-center space-x-1.5 min-w-0 truncate">
                    <Armchair className="w-3.5 h-3.5 text-primary shrink-0" />
                    <SelectValue placeholder="Select Auditorium" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {screens.map((sc: Screen) => (
                    <SelectItem key={sc.id} value={String(sc.id)}>
                      <div className="flex items-center justify-between w-full space-x-2 min-w-0 truncate">
                        <span className="font-normal truncate">{sc.name}</span>
                        <span className="text-[10px] text-muted-foreground group-hover:text-inherit group-focus:text-inherit group-data-[highlighted]:text-inherit shrink-0">
                          ({sc.capacity} seats)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Select Auditorium / Screen</span>
          </TooltipContent>
        </Tooltip>

        {/* Movie Select Dropdown with Internal Icon and Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 min-w-[220px] max-w-sm">
              <Select
                value={String(selectedMovieId || '')}
                onValueChange={(val) => setMovieId(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs font-normal min-w-0 truncate">
                  <div className="flex items-center space-x-1.5 min-w-0 truncate">
                    <Film className="w-3.5 h-3.5 text-primary shrink-0" />
                    <SelectValue placeholder="Select Movie" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {movies.map((m: Movie) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      <div className="flex items-center justify-between w-full space-x-2 min-w-0 truncate">
                        <span className="font-normal truncate">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground group-hover:text-inherit group-focus:text-inherit group-data-[highlighted]:text-inherit shrink-0">
                          ({m.language_name || 'Hindi'} • {m.movie_type_name || '2D'})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Select Scheduled Movie</span>
          </TooltipContent>
        </Tooltip>

        {/* Show Timing Select Dropdown with Internal Icon and Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 min-w-[190px] max-w-xs">
              <Select
                value={String(selectedShowId || '')}
                onValueChange={(val) => setShowId(Number(val))}
                disabled={currentShows.length === 0}
              >
                <SelectTrigger className="h-8 text-xs font-normal min-w-0 truncate">
                  <div className="flex items-center space-x-1.5 min-w-0 truncate">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <SelectValue placeholder={currentShows.length === 0 ? "No active shows" : "Select Show Time"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {currentShows.map((s: Show) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <div className="flex items-center space-x-1.5 min-w-0 truncate">
                        <span className="font-normal truncate">{s.show_name}</span>
                        <span className="text-xs text-muted-foreground group-hover:text-inherit group-focus:text-inherit group-data-[highlighted]:text-inherit shrink-0">
                          ({s.start_time})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Select Show Timing</span>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main Counter Workspace: Left Seat Map (65%) + Right Billing Panel (35%) */}
      <div className="flex-1 flex gap-2.5 overflow-hidden min-h-0">
        {/* Left: Dynamic Seat Map Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs font-medium bg-card border border-border rounded-xs shadow-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" />
              Loading Screen Layout &amp; Seats...
            </div>
          ) : (
            <SeatMap
              rows={rows}
              seats={seats}
              seatClasses={seatClasses}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={toggleSeatSelection}
            />
          )}
        </div>

        {/* Right: Fast Box Office Billing & Print Desk */}
        <div className="w-80 flex flex-col bg-card border border-border rounded-xs shrink-0 overflow-hidden shadow-xs">
          {/* Header */}
          <div className="px-3 py-2.5 bg-primary text-primary-foreground flex items-center justify-between border-b border-primary/20">
            <div className="flex items-center space-x-1.5">
              <Printer className="w-4 h-4 text-primary-foreground" />
              <span className="font-bold text-xs tracking-wider uppercase">BOX OFFICE BILLING</span>
            </div>
            <span className="bg-white text-slate-950 font-extrabold text-xs px-2.5 py-0.5 rounded-xs shadow-xs tracking-wider border border-white/80">
              {selectedSeatsList.length} SEAT{selectedSeatsList.length !== 1 ? 'S' : ''}
            </span>
          </div>

          <div className="p-3 flex-1 flex flex-col justify-between overflow-y-auto space-y-3">
            {/* Show Info Brief */}
            <div className="bg-muted/40 p-2.5 rounded-xs border border-border text-xs space-y-1">
              <div className="flex justify-between font-bold text-foreground items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate max-w-[160px] cursor-help">
                      {selectedMovie?.name || 'No movie selected'}
                    </span>
                  </TooltipTrigger>
                  {selectedMovie && (
                    <TooltipContent side="top">
                      <span>{selectedMovie.name} ({selectedMovie.language_name || 'Hindi'} • {selectedMovie.movie_type_name || '2D'})</span>
                    </TooltipContent>
                  )}
                </Tooltip>
                <span className="shrink-0 font-semibold">{selectedShow?.show_name || 'Show'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-semibold items-center text-[11px]">
                <span className="truncate max-w-[140px]">{selectedScreen?.name || 'Audi 1'}</span>
                <span className="shrink-0">{selectedShow?.start_time || '--:--'}</span>
              </div>
            </div>

            {/* Selected Seats Itemized List */}
            <div className="flex-1 min-h-[100px] border border-border rounded-xs bg-muted/20 p-2.5 overflow-y-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span>SEATS ALLOCATED</span>
                  <span className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-xs">
                    {selectedSeatsList.length}
                  </span>
                </span>
                {selectedSeatsList.length > 0 && (
                  <button
                    onClick={clearSeatSelection}
                    className="text-destructive hover:bg-destructive/10 px-1.5 py-0.5 rounded-xs flex items-center text-xs cursor-pointer font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-0.5" /> Clear
                  </button>
                )}
              </div>

              {selectedSeatsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center py-6">
                  <span className="text-xs font-medium">Click on seats from the map to add them to counter order</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {liveCalculation.items.map(({ seat, calc }) => (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between bg-card px-2.5 py-1.5 rounded-xs border border-border text-xs shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold px-2 py-0.5 rounded-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs tracking-wide">
                          {seat.row_name}-{seat.seat_number}
                        </span>
                        <span className="text-muted-foreground font-semibold text-[11px]">
                          {seat.class_name || seat.seat_class_name
                            ? `(${seat.class_name || seat.seat_class_name})`
                            : ''}
                        </span>
                      </div>
                      <span className="font-bold text-foreground">₹{calc.grossTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Pricing Breakdown */}
            <div className="bg-muted/40 border border-border rounded-xs p-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>ADM (Base Net):</span>
                <span className="font-semibold text-foreground">₹{liveCalculation.net.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Service Charge (S.CH):</span>
                <span className="font-semibold text-foreground">₹{liveCalculation.sc.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-border">
                <div className="flex items-center space-x-1.5">
                  <span className="text-muted-foreground">GST ({taxConfig?.cgst_pct || 9}% + {taxConfig?.sgst_pct || 9}%):</span>
                  <button
                    type="button"
                    onClick={toggleApplyGst}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-xs transition-colors border cursor-pointer ${
                      applyGst
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {applyGst ? 'GST ON' : 'GST OFF'}
                  </button>
                </div>
                <span className="font-semibold text-foreground">
                  ₹{(liveCalculation.cgst + liveCalculation.sgst).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 mt-1 bg-primary text-primary-foreground rounded-xs font-bold shadow-xs">
                <span className="text-xs uppercase tracking-wider text-white/90">TOTAL GROSS:</span>
                <span className="text-base font-black text-white">
                  ₹{liveCalculation.gross.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                PAYMENT MODE
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {paymentModes.map((pm: PaymentMode) => {
                  const isSelected = selectedPaymentModeId === pm.id;
                  return (
                    <Tooltip key={pm.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setPaymentModeId(pm.id)}
                          className={cn(
                            'h-8 px-2 py-1 rounded-xs text-xs font-semibold transition-all border flex items-center justify-center text-center cursor-pointer select-none',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground'
                              : 'bg-background text-foreground border-input hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <span className="truncate">{pm.name}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>{pm.name}</span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Error notice if any */}
            {errorMessage && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-xs text-destructive text-xs flex items-center space-x-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Issue & Print Tickets Button */}
            <Button
              variant="default"
              size="lg"
              disabled={!canCreateBooking || selectedSeatIds.length === 0 || isBookingProcessing}
              onClick={handleConfirmBooking}
              className="w-full font-bold h-9 text-xs tracking-wider"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              {!canCreateBooking
                ? 'BOOKING RESTRICTED'
                : isBookingProcessing
                ? 'PROCESSING...'
                : 'CONFIRM & PRINT (F9)'}
            </Button>
          </div>
        </div>
      </div>

      {/* Ticket Preview & Print Modal */}
      <TicketPreviewModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        booking={lastBooking}
        cinema={cinema}
        copyConfigs={ticketCopies}
        taxConfig={taxConfig}
        systemSettings={systemSettings}
      />
    </div>
  );
};
