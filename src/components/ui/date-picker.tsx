import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
  value?: string | Date;
  onChange?: (dateString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  align?: 'start' | 'center' | 'end';
  dateFormat?: string; // e.g. "yyyy-MM-dd" or "dd MMM yyyy"
  clearable?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  disabled = false,
  minDate,
  maxDate,
  align = 'start',
  dateFormat = 'yyyy-MM-dd',
  clearable = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : undefined;
    }
    return isValid(value) ? value : undefined;
  }, [value]);

  const handleSelect = (date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    onChange?.(formatted);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  const displayString = parsedDate
    ? format(parsedDate, dateFormat === 'yyyy-MM-dd' ? 'dd MMM yyyy' : dateFormat)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-xs border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-left',
            !parsedDate && 'text-muted-foreground font-normal',
            className
          )}
        >
          <div className="flex items-center space-x-2 truncate">
            <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{displayString || placeholder}</span>
          </div>

          {clearable && parsedDate && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 ml-1"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xs border border-border/60 bg-popover shadow-dropdown dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)]" align={align}>
        <Calendar
          selected={parsedDate}
          onSelect={handleSelect}
          minDate={minDate}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
};
