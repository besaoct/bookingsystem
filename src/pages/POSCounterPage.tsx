import React, { useState, useEffect, useMemo } from 'react';
import { useBookingStore, EnrichedSeat } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SeatMap } from '@/components/seatmap/SeatMap';
import { TicketPreviewModal } from '@/components/ticket/TicketPreviewModal';
import { Button } from '@/components/ui/button';
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
    if (!shows || shows.length === 0) return [];

    return shows.filter((s: Show) => {
      const matchDate = selectedDate ? s.show_date === selectedDate : true;
      const matchMovie = selectedMovieId ? s.movie_id === selectedMovieId : true;
      const matchScreen = selectedScreenId ? s.screen_id === selectedScreenId : true;
      return matchDate && matchMovie && (selectedScreenId ? matchScreen : true);
    });
  }, [shows, selectedDate, selectedMovieId, selectedScreenId]);

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
    <div className="flex flex-col absolute inset-0 overflow-hidden p-3 gap-2.5 bg-muted/40 select-none">
      {/* Top Bar: Date, Screen / Audi, Movie, Show Selection Bar */}
      <div className="bg-card border border-border rounded-xs p-2.5 flex flex-wrap items-center gap-2.5 shrink-0 shadow-xs">
        {/* Date Selector with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="shrink-0">
              <DatePicker
                value={selectedDate}
                onChange={setDate}
                minDate={new Date()}
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
            <div className="flex-1 min-w-42.5 max-w-52.5">
              <Select
                value={String(selectedScreenId || '')}
                onValueChange={(val) => setScreenId(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs font-normal min-w-0 overflow-hidden">
                  <div className="flex items-center space-x-1.5 min-w-0 truncate w-full">
                    <Armchair className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate min-w-0 flex-1 text-left">
                      <SelectValue placeholder="Select Auditorium" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {screens.map((sc: Screen) => (
                    <SelectItem key={sc.id} value={String(sc.id)}>
                      <div className="flex items-center justify-between w-full space-x-2 min-w-0 truncate">
                        <span className="font-normal truncate">{sc.name}</span>
                        <span className="text-[10px] text-muted-foreground group-data-highlighted:text-accent-foreground/80 group-hover:text-accent-foreground/80 group-focus:text-accent-foreground/80 shrink-0">
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
            <div className="flex-1 min-w-55 max-w-sm">
              <Select
                value={String(selectedMovieId || '')}
                onValueChange={(val) => setMovieId(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs font-normal min-w-0 overflow-hidden">
                  <div className="flex items-center space-x-1.5 min-w-0 truncate w-full">
                    <Film className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate min-w-0 flex-1 text-left">
                      <SelectValue placeholder="Select Movie" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {movies.map((m: Movie) => {
                    const meta = [m.language_name, m.movie_type_name].filter(Boolean).join(' • ');
                    const showsOnDateCount = shows.filter((s: Show) => s.movie_id === m.id && s.show_date === selectedDate).length;
                    return (
                      <SelectItem key={m.id} value={String(m.id)}>
                        <div className="flex items-center justify-between w-full space-x-2 min-w-0 truncate">
                          <span className="font-normal truncate">{m.name}</span>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {meta && (
                              <span className="text-[10px] text-muted-foreground group-data-highlighted:text-accent-foreground/80 group-hover:text-accent-foreground/80 group-focus:text-accent-foreground/80 truncate max-w-28">
                                ({meta})
                              </span>
                            )}
                            {showsOnDateCount > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-xs transition-colors bg-primary/15 text-primary group-data-highlighted:bg-accent-foreground/20 group-data-highlighted:text-accent-foreground group-hover:bg-accent-foreground/20 group-hover:text-accent-foreground group-focus:bg-accent-foreground/20 group-focus:text-accent-foreground shrink-0">
                                {showsOnDateCount} {showsOnDateCount === 1 ? 'show' : 'shows'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground group-data-highlighted:text-accent-foreground/70 group-hover:text-accent-foreground/70 group-focus:text-accent-foreground/70 shrink-0">
                                (No shows)
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
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
            <div className="flex-1 min-w-47.5 max-w-xs">
              <Select
                value={String(selectedShowId || '')}
                onValueChange={(val) => setShowId(Number(val))}
                disabled={currentShows.length === 0}
              >
                <SelectTrigger className="h-8 text-xs font-normal min-w-0 overflow-hidden">
                  <div className="flex items-center space-x-1.5 min-w-0 truncate w-full">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate min-w-0 flex-1 text-left">
                      <SelectValue placeholder={currentShows.length === 0 ? "No active shows" : "Select Show Time"} />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {currentShows.map((s: Show) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <div className="flex items-center space-x-1.5 min-w-0 truncate">
                        <span className="font-normal truncate">{s.show_name}</span>
                        <span className="text-xs text-muted-foreground group-data-highlighted:text-accent-foreground/80 group-hover:text-accent-foreground/80 group-focus:text-accent-foreground/80 shrink-0">
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
          ) : currentShows.length === 0 || !selectedShowId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs font-medium bg-card border border-border rounded-xs shadow-xs p-6 space-y-2 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground/60 mb-1" />
              <div className="text-sm font-bold text-foreground">No Shows Scheduled on {selectedDate}</div>
              <p className="max-w-md text-xs text-muted-foreground">
                There are no active show schedules matching your selection for this date. Please select another date from the quick pills or schedule a show in Show Timing Master.
              </p>
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
                    <span className="truncate max-w-40 cursor-help">
                      {selectedMovie?.name || 'No movie selected'}
                    </span>
                  </TooltipTrigger>
                  {selectedMovie && (
                    <TooltipContent side="top">
                      <span>{selectedMovie.name} {[selectedMovie.language_name, selectedMovie.movie_type_name].filter(Boolean).length > 0 ? `(${[selectedMovie.language_name, selectedMovie.movie_type_name].filter(Boolean).join(' • ')})` : ''}</span>
                    </TooltipContent>
                  )}
                </Tooltip>
                <span className="shrink-0 font-semibold">{selectedShow?.show_name || ''}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-semibold items-center text-[11px]">
                <span className="truncate max-w-35">{selectedScreen?.name || ''}</span>
                <span className="shrink-0">{selectedShow?.start_time || ''}</span>
              </div>
            </div>

            {/* Selected Seats Itemized List */}
            <div className="flex-1 min-h-25 border border-border rounded-xs bg-muted/20 p-2.5 overflow-y-auto">
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
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-xs transition-all border cursor-pointer ${
                      applyGst
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700'
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
                            'h-8 px-2 py-1 rounded-xs text-xs transition-all border flex items-center justify-center text-center cursor-pointer select-none',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs hover:bg-primary/90'
                              : 'bg-card text-muted-foreground font-semibold border-border hover:bg-muted hover:text-foreground'
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
        onBookingConfirmed={() => {
          setIsTicketModalOpen(false);
          clearSeatSelection();
        }}
        booking={lastBooking}
        cinema={cinema}
        copyConfigs={ticketCopies}
        taxConfig={taxConfig}
        systemSettings={systemSettings}
      />
    </div>
  );
};
