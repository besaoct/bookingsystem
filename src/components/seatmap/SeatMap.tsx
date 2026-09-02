import React, { useState, useRef, useEffect } from 'react';
import { EnrichedSeat } from '@/store/useBookingStore';
import { SeatRow, SeatClass } from '@/types';
import { cn } from '@/lib/utils';
import { Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SeatMapProps {
  rows: SeatRow[];
  seats: EnrichedSeat[];
  seatClasses: SeatClass[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  rows,
  seats,
  seatClasses,
  selectedSeatIds,
  onToggleSeat,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [contentSize, setContentSize] = useState({ width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  // Measure viewport and content dimensions
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSizes = () => {
      if (viewport) {
        setViewportSize({
          width: viewport.clientWidth,
          height: viewport.clientHeight,
        });
      }
      if (contentRef.current) {
        setContentSize({
          width: contentRef.current.scrollWidth || contentRef.current.offsetWidth || 600,
          height: contentRef.current.scrollHeight || contentRef.current.offsetHeight || 400,
        });
      }
    };

    updateSizes();

    const ro = new ResizeObserver(updateSizes);
    ro.observe(viewport);
    if (contentRef.current) {
      ro.observe(contentRef.current);
    }

    return () => ro.disconnect();
  }, [rows, seats]);

  // Trackpad pinch-to-zoom & wheel handling
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.006;
        setZoom((prev) => {
          const next = Math.max(0.5, Math.min(2.5, Math.round((prev + zoomDelta) * 100) / 100));
          return next;
        });
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Mouse hold-to-drag panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!viewportRef.current) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !viewportRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    viewportRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    viewportRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Group seats by row_id
  const seatsByRow = React.useMemo(() => {
    const map = new Map<number, EnrichedSeat[]>();
    for (const seat of seats) {
      if (!map.has(seat.row_id)) {
        map.set(seat.row_id, []);
      }
      map.get(seat.row_id)!.push(seat);
    }
    // Sort seats in each row by seat_number
    map.forEach((rowSeats) => {
      rowSeats.sort((a, b) => a.seat_number - b.seat_number);
    });
    return map;
  }, [seats]);

  const scaledWidth = contentSize.width * zoom;
  const scaledHeight = contentSize.height * zoom;
  const leftMargin = viewportSize.width > scaledWidth + 64 ? (viewportSize.width - scaledWidth) / 2 : 32;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xs p-3 overflow-hidden select-none shadow-xs">
      {/* Legend & Zoom Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 mb-2 text-xs shrink-0">
        {/* Dynamic Seat Classes */}
        <div className="flex items-center space-x-3">
          <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">CLASSES:</span>
          {seatClasses.map((sc) => (
            <div key={sc.id} className="flex items-center space-x-1.5">
              <span
                className="w-3.5 h-3.5 rounded-xs border border-border inline-block shadow-2xs"
                style={{ backgroundColor: sc.color }}
              />
              <span className="font-semibold text-foreground text-xs">{sc.name}</span>
            </div>
          ))}
        </div>

        {/* Status Legend + Zoom Controls */}
        <div className="flex items-center space-x-4">
          {/* Status legend */}
          <div className="hidden lg:flex items-center space-x-3 text-xs font-medium">
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-background border border-input inline-block shadow-2xs" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-primary border border-primary inline-block shadow-2xs" />
              <span className="font-bold text-primary">Selected</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-destructive border border-destructive inline-block shadow-2xs" />
              <span className="text-destructive font-semibold">Booked</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-muted border border-border inline-block shadow-2xs" />
              <span className="text-muted-foreground">Blocked</span>
            </div>
          </div>

          {/* Zoom In / Zoom Out Controls */}
          <div className="flex items-center space-x-1 bg-muted/60 p-0.5 rounded-xs border border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="h-6 w-6 p-0 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
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
                  className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-foreground hover:bg-background rounded-xs cursor-pointer"
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
                  disabled={zoom >= 2.5}
                  className="h-6 w-6 p-0 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
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
                  className="h-6 w-6 p-0 hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Reset Zoom</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Bordered Seat Container with Hold-to-Drag and Center Alignment */}
      <div className="flex-1 flex flex-col border border-border rounded-xs bg-muted/10 overflow-hidden min-h-0">
        {/* Dynamic Scalable Seat Grid Viewport */}
        <div
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={cn(
            'flex-1 overflow-auto w-full h-full min-h-0 select-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
        >
          <div
            style={{
              width: `${Math.max(viewportSize.width, scaledWidth + leftMargin + 48)}px`,
              minWidth: '100%',
              minHeight: '100%',
              paddingTop: '28px',
              paddingBottom: `${Math.max(64, scaledHeight - contentSize.height + 64)}px`,
              paddingLeft: `${leftMargin}px`,
              paddingRight: '48px',
            }}
          >
            <div
              ref={contentRef}
              className="w-fit flex flex-col space-y-2.5 transition-transform duration-100 ease-out origin-top-left pb-4"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
            {rows.map((row) => {
              const rowSeats = seatsByRow.get(row.id) || [];
              if (rowSeats.length === 0) return null;

              const rowClass = rowSeats[0]?.class_name || 'Standard';

              return (
                <div key={row.id} className="flex items-center space-x-2.5 shrink-0">
                  {/* Left Row Label */}
                  <div className="w-7 text-center font-black text-xs text-foreground bg-muted/50 rounded-xs py-1 border border-border/50">
                    {row.row_name}
                  </div>

                  {/* Seats in Row */}
                  <div className="flex items-center space-x-1.5">
                    {rowSeats.map((seat) => {
                      const isSelected = selectedSeatIds.includes(seat.id);
                      const isBooked = seat.status === 'BOOKED';
                      const isBlocked = seat.status === 'BLOCKED' || Boolean(seat.is_blocked);
                      const isAisle = seat.status === 'AISLE' || Boolean(seat.is_aisle);

                      return (
                        <React.Fragment key={seat.id}>
                          <button
                            type="button"
                            disabled={isBooked || isBlocked}
                            onClick={() => onToggleSeat(seat.id)}
                            title={`Seat: ${seat.row_name}-${seat.seat_number} | Class: ${seat.class_name} | Rate: ₹${seat.base_price}`}
                            className={cn(
                              'w-8 h-8 rounded-xs text-xs font-bold transition-all flex items-center justify-center relative border select-none group cursor-pointer shadow-xs',
                              isBooked &&
                                'bg-destructive border-destructive text-destructive-foreground cursor-not-allowed opacity-90 font-extrabold',
                              isBlocked &&
                                'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50',
                              !isBooked &&
                                !isBlocked &&
                                isSelected &&
                                'bg-primary border-primary text-primary-foreground font-black z-10 shadow-xs hover:bg-primary/90 hover:text-primary-foreground',
                              !isBooked &&
                                !isBlocked &&
                                !isSelected &&
                                'bg-card hover:border-primary hover:text-primary text-foreground border-input hover:scale-105'
                            )}
                            style={
                              !isBooked && !isBlocked && !isSelected
                                ? { borderTopColor: seat.class_color, borderTopWidth: '3px' }
                                : {}
                            }
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 stroke-3" />
                            ) : (
                              seat.seat_number
                            )}
                          </button>

                          {/* Render Aisle Gap if flagged */}
                          {isAisle && <div className="w-4" />}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Right Row Label & Class */}
                  <div className="w-24 flex items-center space-x-1.5 text-left">
                    <span className="font-black text-xs text-foreground w-5 text-center">
                      {row.row_name}
                    </span>
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold truncate max-w-17.5">
                      {rowClass}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
