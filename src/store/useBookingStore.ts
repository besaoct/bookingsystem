import { create } from 'zustand';
import {
  Movie,
  Screen,
  Show,
  SeatRow,
  Seat,
  Booking,
  BookingSeat,
  Ticket,
  TaxConfig,
  Pricing,
} from '@/types';
import {
  movieService,
  screenService,
  showService,
  pricingService,
  bookingService,
} from '@/services';

export interface EnrichedSeat extends Seat {
  row_name: string;
  row_order: number;
  class_name: string;
  class_color: string;
  is_booked: boolean;
  base_price: number;
  service_charge: number;
  status: 'AVAILABLE' | 'SELECTED' | 'BOOKED' | 'BLOCKED' | 'AISLE';
}

interface BookingState {
  // Selection State
  selectedDate: string;
  selectedMovieId: number | null;
  selectedScreenId: number | null;
  selectedShowId: number | null;
  selectedSeatIds: number[];
  applyGst: boolean;
  selectedPaymentModeId: number;

  // Data State
  movies: Movie[];
  screens: Screen[];
  shows: Show[];
  rows: SeatRow[];
  seats: EnrichedSeat[];
  pricingList: Pricing[];
  lastBooking: Booking | null;

  // UI / Async State
  isLoading: boolean;
  isBookingProcessing: boolean;

  // Actions
  setSelectedDate: (date: string) => void;
  setDate: (date: string) => void;
  setSelectedMovieId: (movieId: number | null) => void;
  setMovieId: (movieId: number | null) => void;
  setSelectedScreenId: (screenId: number | null) => void;
  setScreenId: (screenId: number | null) => void;
  setSelectedShowId: (showId: number | null) => void;
  setShowId: (showId: number | null) => void;
  toggleSeatSelection: (seatId: number) => void;
  setApplyGst: (apply: boolean) => void;
  toggleApplyGst: () => void;
  setSelectedPaymentModeId: (modeId: number) => void;
  setPaymentModeId: (modeId: number) => void;
  clearSeatSelection: () => void;

  fetchInitialData: () => Promise<void>;
  fetchShowsAndSeats: () => Promise<void>;
  confirmBooking: (bookedByUserId: number, taxConfig: TaxConfig) => Promise<Booking | null>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedDate: new Date().toISOString().slice(0, 10),
  selectedMovieId: null,
  selectedScreenId: null,
  selectedShowId: null,
  selectedSeatIds: [],
  applyGst: true,
  selectedPaymentModeId: 1, // Default Cash

  movies: [],
  screens: [],
  shows: [],
  rows: [],
  seats: [],
  pricingList: [],
  lastBooking: null,

  isLoading: false,
  isBookingProcessing: false,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date, selectedSeatIds: [] });
    get().fetchShowsAndSeats();
  },
  setDate: (date: string) => {
    get().setSelectedDate(date);
  },

  setSelectedMovieId: (movieId: number | null) => {
    set({ selectedMovieId: movieId, selectedSeatIds: [] });
    get().fetchShowsAndSeats();
  },
  setMovieId: (movieId: number | null) => {
    get().setSelectedMovieId(movieId);
  },

  setSelectedScreenId: (screenId: number | null) => {
    set({ selectedScreenId: screenId, selectedSeatIds: [] });
    get().fetchShowsAndSeats();
  },
  setScreenId: (screenId: number | null) => {
    get().setSelectedScreenId(screenId);
  },

  setSelectedShowId: (showId: number | null) => {
    const show = get().shows.find((s) => s.id === showId);
    set({
      selectedShowId: showId,
      selectedMovieId: show ? show.movie_id : get().selectedMovieId,
      selectedScreenId: show ? show.screen_id : get().selectedScreenId,
      selectedSeatIds: [],
    });
    get().fetchShowsAndSeats();
  },
  setShowId: (showId: number | null) => {
    get().setSelectedShowId(showId);
  },

  setApplyGst: (apply: boolean) => set({ applyGst: apply }),
  toggleApplyGst: () => set((state) => ({ applyGst: !state.applyGst })),

  setSelectedPaymentModeId: (modeId: number) => set({ selectedPaymentModeId: modeId }),
  setPaymentModeId: (modeId: number) => set({ selectedPaymentModeId: modeId }),

  toggleSeatSelection: (seatId: number) => {
    const { seats, selectedSeatIds } = get();
    const seat = seats.find((s) => s.id === seatId);
    if (!seat || seat.is_booked || seat.is_blocked || seat.is_aisle) {
      return;
    }

    if (selectedSeatIds.includes(seatId)) {
      set({ selectedSeatIds: selectedSeatIds.filter((id) => id !== seatId) });
    } else {
      if (selectedSeatIds.length >= 10) {
        alert('Maximum 10 seats allowed per booking transaction.');
        return;
      }
      set({ selectedSeatIds: [...selectedSeatIds, seatId] });
    }
  },

  clearSeatSelection: () => {
    set({ selectedSeatIds: [] });
  },

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const screens = await screenService.getScreens();
      const movies = await movieService.getMovies();

      const activeMovie = movies[0];
      const initialMovieId = activeMovie ? activeMovie.id : null;

      set({
        screens,
        movies,
        selectedMovieId: initialMovieId,
        selectedScreenId: screens[0]?.id || 1,
      });

      await get().fetchShowsAndSeats();
    } catch (e) {
      console.error('Error fetching initial POS data:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchShowsAndSeats: async () => {
    const { selectedDate, selectedMovieId, selectedScreenId } = get();

    try {
      const shows = await showService.getShows({ activeOnly: true });

      // Determine active show
      let activeShowId = get().selectedShowId;
      if (activeShowId && !shows.some((s) => s.id === activeShowId)) {
        activeShowId = null;
      }

      if (!activeShowId) {
        const candidateShows = selectedScreenId
          ? shows.filter((s) => s.screen_id === selectedScreenId)
          : shows;

        if (selectedMovieId) {
          const matchingShow = candidateShows.find((s) => s.movie_id === selectedMovieId);
          activeShowId = matchingShow ? matchingShow.id : (candidateShows[0]?.id || null);
        } else {
          activeShowId = candidateShows[0]?.id || null;
        }
      }

      const activeShow = shows.find((s) => s.id === activeShowId);
      const screenIdToUse = selectedScreenId || (activeShow ? activeShow.screen_id : 1);

      // Fetch rows for this screen
      const rows = await screenService.getScreenSeatRows(screenIdToUse);

      // Fetch base pricings & overrides
      const pricingList = await pricingService.getBasePricing();

      // Fetch booked seat ids for the active show
      let bookedSeatIds: number[] = [];
      if (activeShowId) {
        bookedSeatIds = await bookingService.getBookedSeatIdsForShow(activeShowId);
      }

      // Fetch all seats with class information
      const rawSeats = await screenService.getScreenSeats(screenIdToUse);

      // Attach pricing & booked status to each seat
      const enrichedSeats: EnrichedSeat[] = rawSeats.map((seat: any) => {
        const isBooked = bookedSeatIds.includes(seat.id);

        // Find show-specific price override first, then fall back to base class price
        const showPriceObj = activeShowId
          ? pricingList.find((p: any) => p.seat_class_id === seat.seat_class_id && p.show_id === activeShowId)
          : null;
        const basePriceObj = pricingList.find(
          (p: any) => p.seat_class_id === seat.seat_class_id && (p.show_id == null || p.show_id === 0)
        );
        const priceObj = showPriceObj || basePriceObj;

        return {
          ...seat,
          // getScreenSeats joins return 'seat_class_name' & 'seat_class_color' — map to class_name / class_color
          class_name: seat.class_name || seat.seat_class_name || 'Unknown',
          class_color: seat.class_color || seat.seat_class_color || '#64748b',
          is_aisle: Boolean(seat.is_aisle),
          is_blocked: Boolean(seat.is_blocked),
          is_wheelchair: Boolean(seat.is_wheelchair),
          is_booked: isBooked,
          base_price: priceObj ? (priceObj.base_price ?? (priceObj as any).base_rate ?? 150) : 150,
          service_charge: priceObj?.service_charge || 12,
          status: isBooked ? 'BOOKED' : (seat.is_blocked ? 'BLOCKED' : (seat.is_aisle ? 'AISLE' : 'AVAILABLE')),
        };
      });

      set({
        shows,
        selectedShowId: activeShowId,
        selectedScreenId: screenIdToUse,
        selectedMovieId: activeShow ? activeShow.movie_id : (selectedMovieId || (shows[0]?.movie_id || null)),
        rows,
        seats: enrichedSeats,
        pricingList: pricingList as any,
      });
    } catch (e) {
      console.error('Error fetching shows and seats:', e);
    }
  },

  confirmBooking: async (bookedByUserId: number, taxConfig: TaxConfig) => {
    const { selectedShowId, selectedSeatIds, seats, applyGst, selectedPaymentModeId, shows, movies, screens } = get();
    if (!selectedShowId || selectedSeatIds.length === 0) return null;

    set({ isBookingProcessing: true });

    try {
      const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
      const show = shows.find((s) => s.id === selectedShowId);
      const movie = show ? movies.find((m) => m.id === show.movie_id) : null;
      const screen = show ? screens.find((sc) => sc.id === show.screen_id) : null;

      const completeBooking = await bookingService.createBooking({
        showId: selectedShowId,
        showDate: get().selectedDate || show?.show_date || new Date().toISOString().slice(0, 10),
        selectedSeats: selectedSeats.map((s) => ({
          id: s.id,
          row_name: s.row_name,
          seat_number: s.seat_number,
          seat_class_id: s.seat_class_id,
          class_name: s.class_name,
          base_price: s.base_price,
          service_charge: s.service_charge,
        })),
        applyGst,
        paymentModeId: selectedPaymentModeId,
        bookedByUserId,
        taxConfig,
        movieName: movie?.name,
        movieTypeName: movie?.movie_type_name,
        screenName: screen?.name,
        startTime: show?.start_time,
      });

      // Refresh seat layout and clear selection
      await get().fetchShowsAndSeats();
      set({
        selectedSeatIds: [],
        isBookingProcessing: false,
        lastBooking: completeBooking,
      });

      return completeBooking;
    } catch (e) {
      console.error('Error creating booking:', e);
      set({ isBookingProcessing: false });
      return null;
    }
  },
}));
