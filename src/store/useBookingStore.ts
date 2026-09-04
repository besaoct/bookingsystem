import { create } from 'zustand';
import {
  Movie,
  Screen,
  Show,
  SeatRow,
  Seat,
  SeatStatus,
  Booking,
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
import { getLocalDateString } from '@/lib/utils';

export interface EnrichedSeat extends Seat {
  row_name: string;
  row_order: number;
  class_name: string;
  class_color: string;
  base_price: number;
  service_charge: number;
  status: SeatStatus;
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
  setApplyGst: (apply: boolean) => void;
  toggleApplyGst: () => void;
  setSelectedPaymentModeId: (paymentModeId: number) => void;
  setPaymentModeId: (paymentModeId: number) => void;
  toggleSeatSelection: (seatId: number) => void;
  clearSeatSelection: () => void;

  fetchInitialData: () => Promise<void>;
  fetchShowsAndSeats: () => Promise<void>;
  confirmBooking: (bookedByUserId: number, taxConfig: TaxConfig) => Promise<Booking | null>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedDate: getLocalDateString(),
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
    const today = getLocalDateString();
    const validDate = date && date < today ? today : (date || today);
    const shows = get().shows;
    const movieId = get().selectedMovieId;
    const dateShows = shows.filter((s) => s.show_date === validDate);
    const matchMovie = movieId ? dateShows.find((s) => s.movie_id === movieId) : null;
    const targetShow = matchMovie || dateShows[0] || null;

    set({
      selectedDate: validDate,
      selectedShowId: targetShow ? targetShow.id : null,
      selectedMovieId: targetShow ? targetShow.movie_id : (dateShows.length > 0 ? dateShows[0].movie_id : null),
      selectedScreenId: targetShow ? targetShow.screen_id : (get().selectedScreenId || 1),
      selectedSeatIds: [],
    });
    get().fetchShowsAndSeats();
  },
  setDate: (date: string) => {
    get().setSelectedDate(date);
  },

  setSelectedMovieId: (movieId: number | null) => {
    const shows = get().shows;
    const date = get().selectedDate;
    const movieShowsOnDate = movieId ? shows.filter((s) => s.movie_id === movieId && s.show_date === date) : [];
    const targetShow = movieShowsOnDate[0] || null;

    set({
      selectedMovieId: movieId,
      selectedShowId: targetShow ? targetShow.id : null,
      selectedScreenId: targetShow ? targetShow.screen_id : get().selectedScreenId,
      selectedSeatIds: [],
    });
    get().fetchShowsAndSeats();
  },
  setMovieId: (movieId: number | null) => {
    get().setSelectedMovieId(movieId);
  },

  setSelectedScreenId: (screenId: number | null) => {
    const shows = get().shows;
    const date = get().selectedDate;
    const movieId = get().selectedMovieId;
    const screenShowsOnDate = screenId ? shows.filter((s) => s.screen_id === screenId && s.show_date === date) : [];
    const matchMovie = movieId ? screenShowsOnDate.find((s) => s.movie_id === movieId) : null;
    const targetShow = matchMovie || screenShowsOnDate[0] || null;

    set({
      selectedScreenId: screenId,
      selectedShowId: targetShow ? targetShow.id : null,
      selectedMovieId: targetShow ? targetShow.movie_id : get().selectedMovieId,
      selectedSeatIds: [],
    });
    get().fetchShowsAndSeats();
  },
  setScreenId: (screenId: number | null) => {
    get().setSelectedScreenId(screenId);
  },

  setSelectedShowId: (showId: number | null) => {
    const shows = get().shows;
    const show = shows.find((s) => s.id === showId);
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

  setApplyGst: (apply: boolean) => {
    set({ applyGst: apply });
  },
  toggleApplyGst: () => {
    set((state) => ({ applyGst: !state.applyGst }));
  },

  setSelectedPaymentModeId: (paymentModeId: number) => {
    set({ selectedPaymentModeId: paymentModeId });
  },
  setPaymentModeId: (paymentModeId: number) => {
    get().setSelectedPaymentModeId(paymentModeId);
  },

  toggleSeatSelection: (seatId: number) => {
    const { selectedSeatIds, seats } = get();
    const seat = seats.find((s) => s.id === seatId);

    if (!seat || seat.status === 'BOOKED' || seat.status === 'BLOCKED' || seat.status === 'AISLE') {
      return;
    }

    if (selectedSeatIds.includes(seatId)) {
      set({ selectedSeatIds: selectedSeatIds.filter((id) => id !== seatId) });
    } else {
      if (selectedSeatIds.length >= 10) {
        alert('Maximum 10 seats allowed per single counter transaction.');
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
      const shows = await showService.getShows({ activeOnly: true });

      const today = getLocalDateString();
      const todayShows = shows.filter((s) => s.show_date === today);
      const futureShows = shows.filter((s) => s.show_date >= today);
      const initialShow = todayShows[0] || futureShows[0] || null;
      const initialDate = initialShow ? initialShow.show_date : today;
      const initialMovieId = initialShow ? initialShow.movie_id : (movies[0]?.id || null);
      const initialScreenId = initialShow ? initialShow.screen_id : (screens[0]?.id || 1);

      set({
        screens,
        movies,
        shows,
        selectedDate: initialDate,
        selectedShowId: initialShow?.id || null,
        selectedMovieId: initialMovieId,
        selectedScreenId: initialScreenId,
      });

      await get().fetchShowsAndSeats();
    } catch (e) {
      console.error('Error fetching initial POS data:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchShowsAndSeats: async () => {
    const { selectedDate, selectedMovieId, selectedScreenId, selectedShowId } = get();

    try {
      const shows = await showService.getShows({ activeOnly: true });
      const showsOnDate = selectedDate ? shows.filter((s) => s.show_date === selectedDate) : shows;

      // Determine active show strictly within the selected date (if specified)
      let activeShow = showsOnDate.find((s) => s.id === selectedShowId);

      if (!activeShow && showsOnDate.length > 0) {
        if (selectedMovieId) {
          activeShow = showsOnDate.find((s) => s.movie_id === selectedMovieId);
        }
        if (!activeShow) {
          activeShow = showsOnDate[0];
        }
      }

      const activeShowId = activeShow ? activeShow.id : null;
      const effectiveScreenId = activeShow ? activeShow.screen_id : (selectedScreenId || 1);
      const effectiveMovieId = activeShow ? activeShow.movie_id : (showsOnDate.length > 0 ? showsOnDate[0].movie_id : null);

      // Fetch rows for this screen
      const rows = await screenService.getScreenSeatRows(effectiveScreenId);

      // Fetch base pricings & overrides
      const pricingList = await pricingService.getBasePricing();

      // Fetch booked seat ids for the active show
      let bookedSeatIds: number[] = [];
      if (activeShowId) {
        bookedSeatIds = await bookingService.getBookedSeatIdsForShow(activeShowId);
      }

      // Fetch all seats with class information
      const rawSeats = await screenService.getScreenSeats(effectiveScreenId);

      // Attach pricing & booked status to each seat
      const enrichedSeats: EnrichedSeat[] = rawSeats.map((seat: any) => {
        const isBooked = activeShowId ? bookedSeatIds.includes(seat.id) : false;

        const showPriceObj = activeShowId
          ? pricingList.find((p: any) => p.seat_class_id === seat.seat_class_id && p.show_id === activeShowId)
          : null;
        const basePriceObj = pricingList.find(
          (p: any) => p.seat_class_id === seat.seat_class_id && (p.show_id == null || p.show_id === 0)
        );
        const priceObj = showPriceObj || basePriceObj;

        const seatStatus: SeatStatus = isBooked
          ? 'BOOKED'
          : (seat.is_blocked ? 'BLOCKED' : (seat.is_aisle ? 'AISLE' : 'AVAILABLE'));

        return {
          ...seat,
          class_name: seat.class_name || seat.seat_class_name || '',
          class_color: seat.class_color || seat.seat_class_color || '#64748b',
          is_aisle: Boolean(seat.is_aisle),
          is_blocked: Boolean(seat.is_blocked),
          is_wheelchair: Boolean(seat.is_wheelchair),
          base_price: priceObj ? (priceObj.base_price ?? (priceObj as any).base_rate ?? 0) : 0,
          service_charge: priceObj?.service_charge ?? 0,
          status: seatStatus,
        };
      });

      set({
        shows,
        selectedShowId: activeShowId,
        selectedScreenId: effectiveScreenId,
        selectedMovieId: effectiveMovieId,
        rows,
        seats: enrichedSeats,
        pricingList: pricingList as any,
      });
    } catch (e) {
      console.error('Error fetching shows and seats:', e);
    }
  },

  confirmBooking: async (bookedByUserId: number, taxConfig: TaxConfig) => {
    const { selectedShowId, selectedSeatIds, seats, applyGst, selectedPaymentModeId, shows, movies, screens, selectedDate } = get();
    if (!selectedShowId || selectedSeatIds.length === 0) return null;

    set({ isBookingProcessing: true });

    try {
      const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
      const show = shows.find((s) => s.id === selectedShowId);
      const movie = show ? movies.find((m) => m.id === show.movie_id) : null;
      const screen = show ? screens.find((sc) => sc.id === show.screen_id) : null;
      const bookingShowDate = show?.show_date || selectedDate || getLocalDateString();

      const completeBooking = await bookingService.createBooking({
        showId: selectedShowId,
        showDate: bookingShowDate,
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
        showName: show?.show_name,
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
