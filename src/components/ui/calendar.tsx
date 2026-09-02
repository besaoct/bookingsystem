import * as React from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
  setYear,
  setMonth,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CalendarProps {
  selected?: Date | string;
  onSelect?: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  className,
  minDate,
  maxDate,
}) => {
  const selectedDate = React.useMemo(() => {
    if (!selected) return undefined;
    if (typeof selected === 'string') {
      const parsed = parseISO(selected);
      return isValid(parsed) ? parsed : undefined;
    }
    return isValid(selected) ? selected : undefined;
  }, [selected]);

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    return selectedDate || new Date();
  });

  // Sync current month view when selectedDate changes
  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear - 10; y <= currentYear + 15; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const startOfMin = minDate ? startOfDay(minDate) : undefined;
  const endOfMax = maxDate ? endOfDay(maxDate) : undefined;

  return (
    <div className={cn('p-3 bg-popover text-popover-foreground rounded-xs select-none w-64', className)}>
      {/* Header Month / Year controls */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
        <div className="flex items-center space-x-1.5">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) => setCurrentMonth(setMonth(currentMonth, Number(e.target.value)))}
            className="h-7 px-2 text-xs font-semibold border border-input bg-background text-foreground rounded-xs hover:bg-muted/30 focus:border-primary focus:outline-none cursor-pointer"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={currentMonth.getFullYear()}
            onChange={(e) => setCurrentMonth(setYear(currentMonth, Number(e.target.value)))}
            className="h-7 px-2 text-xs font-semibold border border-input bg-background text-foreground rounded-xs hover:bg-muted/30 focus:border-primary focus:outline-none cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-0.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={prevMonth}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={nextMonth}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Week days label */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDayLabels.map((day) => (
          <div key={day} className="text-[11px] font-semibold text-muted-foreground py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);

          const dayStart = startOfDay(day);
          const isBeforeMin = startOfMin ? dayStart < startOfMin : false;
          const isAfterMax = endOfMax ? dayStart > endOfMax : false;
          const isDisabled = isBeforeMin || isAfterMax;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                'h-7 w-full rounded-xs text-xs font-medium flex items-center justify-center transition-colors cursor-pointer select-none',
                !isCurrentMonth && 'text-muted-foreground/30',
                isCurrentMonth && !isSelected && !isDisabled && 'text-foreground hover:bg-accent hover:text-accent-foreground',
                isTodayDate && !isSelected && !isDisabled && 'border border-primary/60 font-bold text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground',
                isSelected && 'bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground',
                isDisabled && 'opacity-25 cursor-not-allowed pointer-events-none'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Today Quick Select Footer */}
      <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-between">
        <button
          type="button"
          disabled={startOfMin ? startOfDay(new Date()) < startOfMin : false}
          onClick={() => {
            const today = new Date();
            setCurrentMonth(today);
            onSelect?.(today);
          }}
          className="text-[11px] font-semibold text-primary hover:underline hover:text-primary/80 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
        >
          Select Today ({format(new Date(), 'dd MMM')})
        </button>
      </div>
    </div>
  );
};
