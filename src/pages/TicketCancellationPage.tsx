import React, { useState, useEffect } from 'react';
import { Booking, BookingSeat, CancellationReason } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { bookingService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Ban, Search, RefreshCw, Ticket, CheckCircle } from 'lucide-react';

export const TicketCancellationPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const canCancel = user?.role === 'SYSTEM_ADMIN' || hasPermission('cancellation', 'can_create') || hasPermission('cancellation', 'can_delete');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cancellation Modal
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState<number>(1);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const bList = await bookingService.getBookings({
        date: selectedDate,
        searchQuery: searchQuery.trim(),
      });
      const reasons = await bookingService.getCancellationReasons();

      setBookings(bList);
      setCancellationReasons(reasons);
      if (reasons.length > 0) {
        setSelectedReasonId(reasons[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch bookings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking || !user) return;

    setIsCancelling(true);
    try {
      const reasonObj = cancellationReasons.find((r) => r.id === selectedReasonId);
      await bookingService.cancelBooking(
        cancelModalBooking.id,
        selectedReasonId,
        user.id,
        reasonObj?.reason || 'Counter cancellation'
      );

      setSuccessMsg(`Booking #${cancelModalBooking.booking_no} successfully cancelled and seats released.`);
      setCancelModalBooking(null);
      await fetchBookings();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Error cancelling booking:', e);
      alert('Failed to cancel ticket. Please check error logs.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Search & Filter Bar */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center space-x-3 flex-1 max-w-2xl">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="shrink-0">
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  className="w-36 h-8"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>Filter Bookings by Date</span>
            </TooltipContent>
          </Tooltip>

          <div className="flex-1 flex items-center space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Ticket No, Phone, Movie..."
              className="h-8 text-xs flex-1"
            />
            <Button type="submit" variant="default" size="sm">
              <Search className="w-3.5 h-3.5 mr-1" />
              Search
            </Button>
          </div>
        </form>

        <Button variant="outline" size="sm" onClick={fetchBookings} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-3 bg-success/15 border border-success/30 rounded-xs text-success text-xs font-semibold flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-success shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-success hover:opacity-80 text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Bookings List Table */}
      <div className="flex-1 bg-card border border-border rounded-xs overflow-hidden flex flex-col shadow-xs">
        <div className="px-3 py-2.5 bg-muted/40 border-b border-border text-xs font-semibold uppercase text-muted-foreground flex justify-between">
          <span>ISSUED TICKETS &amp; BOOKINGS ({bookings.length})</span>
          <span className="text-[11px] normal-case text-muted-foreground">Click Cancel to invalidate ticket and immediately free up seats</span>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs py-12">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" />
              Loading Bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs py-12">
              <Ticket className="w-8 h-8 mb-2 text-muted-foreground/40" />
              <span>No bookings found for the selected date or search filter.</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5">Booking No</th>
                  <th className="px-3 py-2.5">Movie &amp; Show</th>
                  <th className="px-3 py-2.5">Screen</th>
                  <th className="px-3 py-2.5">Seats Booked</th>
                  <th className="px-3 py-2.5 text-right">Gross Total</th>
                  <th className="px-3 py-2.5">Payment</th>
                  <th className="px-3 py-2.5">Booked By</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => {
                  const seatsList = b.seats?.map((s: any) => `${s.row_name}-${s.seat_number}`).join(', ') || '--';
                  const isCancelled = b.status === 'CANCELLED';

                  return (
                    <tr key={b.id} className={isCancelled ? 'bg-destructive/10 text-muted-foreground' : 'hover:bg-muted/30 transition-colors'}>
                      <td className="px-3 py-2.5 font-bold text-foreground">
                        {b.booking_no}
                      </td>
                      <td className="px-3 py-2.5 font-semibold">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-foreground truncate max-w-50 cursor-help">
                              {b.movie_name} {b.movie_type_name && `(${b.movie_type_name})`}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span>{b.movie_name} {b.movie_type_name && `(${b.movie_type_name})`}</span>
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          {b.show_name} • {b.start_time}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-medium">{b.screen_name || 'Audi 1'}</td>
                      <td className="px-3 py-2.5 font-bold text-primary">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate max-w-37.5 cursor-help">
                              {seatsList}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span>Seats: {seatsList}</span>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground">
                        ₹{b.total_gross.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {b.payment_mode_name || 'CASH'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-medium">{b.booked_by_name || 'Counter'}</td>
                      <td className="px-3 py-2.5 text-center">
                        {isCancelled ? (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            CANCELLED
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] font-bold">
                            ACTIVE
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {canCancel && !isCancelled && (
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => setCancelModalBooking(b)}
                            className="font-bold"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Cancel Ticket
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancelModalBooking)}
        onClose={() => setCancelModalBooking(null)}
        title="Confirm Ticket Cancellation & Seat Release"
        description="This action will void physical ticket barcode/numbers and make seats available immediately"
        maxWidth="md"
      >
        {cancelModalBooking && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xs space-y-1.5">
              <div className="flex justify-between font-bold text-destructive">
                <span>Booking Ref: {cancelModalBooking.booking_no}</span>
                <span>Gross: ₹{cancelModalBooking.total_gross.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Seats: <strong className="text-foreground">{cancelModalBooking.seats?.map((s: any) => `${s.row_name}-${s.seat_number}`).join(', ')}</strong> ({cancelModalBooking.movie_name})
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Select Reason for Cancellation:</label>
              <Select
                value={String(selectedReasonId)}
                onValueChange={(val) => setSelectedReasonId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cancellation reason" />
                </SelectTrigger>
                <SelectContent>
                  {cancellationReasons.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCancelModalBooking(null)}>
                Dismiss
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="font-bold"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Void & Release Seats'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
