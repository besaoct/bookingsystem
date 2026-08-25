import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { reportService } from '@/services';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Film,
  Ticket,
  Percent,
  Ban,
  Clock,
  IndianRupee,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface DashboardStats {
  todayGross: number;
  todayNet: number;
  todayGst: number;
  ticketsSold: number;
  ticketsCancelled: number;
  occupancyPct: number;
  activeShows: any[];
  recentBookings: any[];
}

export const DashboardPage: React.FC<{ onNavigate?: (page: any) => void }> = ({ onNavigate }) => {
  const { cinema, fetchSettings } = useSettingsStore();
  const [stats, setStats] = useState<DashboardStats>({
    todayGross: 0,
    todayNet: 0,
    todayGst: 0,
    ticketsSold: 0,
    ticketsCancelled: 0,
    occupancyPct: 0,
    activeShows: [],
    recentBookings: [],
  });
  const fetchDashboardData = async () => {
    try {
      const data = await reportService.getDashboardStats();
      setStats({
        todayGross: data.grossRevenue,
        todayNet: data.netRevenue,
        todayGst: data.gstAmount,
        ticketsSold: data.ticketsSold,
        ticketsCancelled: data.ticketsCancelled,
        occupancyPct: data.occupancyPct,
        activeShows: data.activeShows,
        recentBookings: data.recentBookings,
      });
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchDashboardData();

    // Background auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const todayDisplay = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none">
      {/* Top Banner */}
      <div className="bg-primary text-primary-foreground rounded-xs p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold uppercase tracking-wider text-white">
              {cinema?.name || 'Grand Multiplex'}
            </h1>
          </div>
          <div className="text-xs text-primary-foreground/90 font-medium mt-1">
            {todayDisplay} | GSTIN: {cinema?.gstin || '18AJVPD0031E3Z1'}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigate && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => onNavigate('dcr')}
                className="border border-white/40 bg-white/10 hover:bg-white hover:text-primary text-white font-bold transition-all shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                Daily Collection
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => onNavigate('pos')}
                className="bg-white text-primary hover:bg-white/90 hover:text-primary font-bold shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                POS Counter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary bg-card shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today's Gross Receipts
            </span>
            <IndianRupee className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold text-foreground">
              ₹{stats.todayGross.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex justify-between font-medium">
              <span>Net: ₹{stats.todayNet.toFixed(2)}</span>
              <span>GST: ₹{stats.todayGst.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success bg-card shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tickets Issued
            </span>
            <Ticket className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold text-success">
              {stats.ticketsSold}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              Active guest admissions confirmed
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning bg-card shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Occupancy Rate
            </span>
            <Percent className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold text-warning">
              {stats.occupancyPct}%
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-warning h-full transition-all duration-500"
                style={{ width: `${stats.occupancyPct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive bg-card shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cancelled Bookings
            </span>
            <Ban className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold text-destructive">
              {stats.ticketsCancelled}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              Voided &amp; seats released
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Active Shows Grid + Recent Bookings Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Left: Active Today Shows */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xs p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground">
              <Film className="w-4 h-4 text-primary" />
              <span className="uppercase tracking-wider">TODAY'S SHOW TIMINGS &amp; OCCUPANCY</span>
            </div>
            <span className="text-xs text-muted-foreground">Live seat bookings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
            {stats.activeShows.map((show: any) => (
              <div
                key={show.id}
                className="p-3 bg-muted/20 border border-border rounded-xs flex flex-col justify-between space-y-2.5 hover:border-primary/60 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-bold text-foreground truncate max-w-45 cursor-help">
                          {show.movie_name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>{show.movie_name}</span>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="blue" className="text-[10px] px-1.5 py-0.5">
                      {show.movie_type_name || '2D'}
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-primary mt-1">
                    {show.show_name} • {show.start_time}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-muted-foreground">
                  <span>{show.screen_name}</span>
                  <span className="font-bold text-success">{show.sold_seats} Seats Booked</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Bookings Feed */}
        <div className="bg-card border border-border rounded-xs p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span className="uppercase tracking-wider">RECENT COUNTER SALES</span>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 text-xs">
            {stats.recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-medium">No bookings yet today.</div>
            ) : (
              stats.recentBookings.map((b: any) => (
                <div
                  key={b.id}
                  className="p-2.5 bg-muted/20 border border-border rounded-xs flex items-center justify-between hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-foreground text-xs">{b.booking_no}</div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-[11px] text-muted-foreground truncate max-w-35 cursor-help">
                          {b.movie_name} ({b.show_name})
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <span>{b.movie_name} • {b.show_name}</span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground text-xs">
                      ₹{Number(b.total_gross).toFixed(2)}
                    </div>
                    <Badge variant={b.status === 'CANCELLED' ? 'destructive' : 'outline'} className="text-[10px]">
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
