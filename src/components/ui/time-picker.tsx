import * as React from 'react';
import { Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface TimePickerProps {
  value?: string; // e.g. "06:30 PM" or "11:00 AM" or "18:30"
  onChange?: (timeString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
}

const CINEMA_PRESETS = [
  '10:00 AM',
  '11:30 AM',
  '01:15 PM',
  '02:30 PM',
  '03:45 PM',
  '06:00 PM',
  '06:30 PM',
  '07:15 PM',
  '09:30 PM',
  '10:15 PM',
];

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function parseTimeString(timeStr?: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!timeStr) {
    return { hour: '06', minute: '30', period: 'PM' };
  }

  const str = timeStr.trim().toUpperCase();

  // Format: "06:30 PM" or "6:30 PM"
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2].padStart(2, '0');
    let p: 'AM' | 'PM' = (ampmMatch[3] as 'AM' | 'PM') || 'PM';

    // If 24-hour time like 18:30 was provided
    if (!ampmMatch[3]) {
      if (h >= 12) {
        p = 'PM';
        if (h > 12) h -= 12;
      } else {
        p = 'AM';
        if (h === 0) h = 12;
      }
    }

    if (h === 0) h = 12;
    if (h > 12) h = 12;

    return {
      hour: String(h).padStart(2, '0'),
      minute: m,
      period: p,
    };
  }

  return { hour: '06', minute: '30', period: 'PM' };
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select showtime',
  className,
  disabled = false,
  align = 'start',
}) => {
  const [open, setOpen] = React.useState(false);
  const parsed = React.useMemo(() => parseTimeString(value), [value]);

  const [selectedHour, setSelectedHour] = React.useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = React.useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = React.useState(parsed.period);

  React.useEffect(() => {
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  }, [parsed.hour, parsed.minute, parsed.period]);

  const updateTime = (h: string, m: string, p: 'AM' | 'PM') => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    const formatted = `${h}:${m} ${p}`;
    onChange?.(formatted);
  };

  const handlePresetSelect = (preset: string) => {
    const p = parseTimeString(preset);
    updateTime(p.hour, p.minute, p.period);
    setOpen(false);
  };

  const displayString = value || (selectedHour ? `${selectedHour}:${selectedMinute} ${selectedPeriod}` : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-xs border border-input bg-background px-2.5 py-1 text-xs font-normal text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none  disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-left',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center space-x-2 truncate">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{displayString || placeholder}</span>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-76 p-3 rounded-xs border border-border/70 bg-popover text-popover-foreground shadow-dropdown"
        align={align}
      >
        <div className="space-y-3">
          {/* Header Preview & AM/PM Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-sm font-medium text-foreground">
                {selectedHour}:{selectedMinute}
              </span>
              <span className="text-xs font-medium text-primary">{selectedPeriod}</span>
            </div>

            <div className="flex rounded-xs border border-border overflow-hidden p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => updateTime(selectedHour, selectedMinute, 'AM')}
                className={cn(
                  'px-2.5 py-0.5 text-xs font-medium rounded-xs transition-colors cursor-pointer',
                  selectedPeriod === 'AM'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(selectedHour, selectedMinute, 'PM')}
                className={cn(
                  'px-2.5 py-0.5 text-xs font-medium rounded-xs transition-colors cursor-pointer',
                  selectedPeriod === 'PM'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick Presets for Theaters (Clean 2-column or 3-column pill layout) */}
          <div className="space-y-1.5">
            <div className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
              Popular Showtimes
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {CINEMA_PRESETS.map((preset) => {
                const isSelected = value === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-xs border transition-colors text-center whitespace-nowrap cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:bg-muted/60 text-foreground'
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector Columns */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
            {/* Hours Column */}
            <div className="space-y-1">
              <div className="text-2xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                Hour
              </div>
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-1 bg-muted/20 border border-border rounded-xs">
                {HOURS.map((h) => {
                  const isActive = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, selectedMinute, selectedPeriod)}
                      className={cn(
                        'py-1 text-xs font-medium rounded-xs text-center transition-colors cursor-pointer',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="space-y-1">
              <div className="text-2xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                Minute
              </div>
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-1 bg-muted/20 border border-border rounded-xs">
                {MINUTES.map((m) => {
                  const isActive = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(selectedHour, m, selectedPeriod)}
                      className={cn(
                        'py-1 text-xs font-medium rounded-xs text-center transition-colors cursor-pointer',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-end pt-1">
            <Button
              variant="default"
              size="xs"
              onClick={() => {
                updateTime(selectedHour, selectedMinute, selectedPeriod);
                setOpen(false);
              }}
              className="font-medium bg-primary text-primary-foreground"
            >
              <Check className="w-3 h-3 mr-1" /> Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
