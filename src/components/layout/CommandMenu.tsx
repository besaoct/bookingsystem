import React, { useEffect, useState } from 'react';
import {
  Ticket,
  FileSpreadsheet,
  Ban,
  LayoutDashboard,
  Film,
  CalendarDays,
  Armchair,
  IndianRupee,
  Percent,
  Layers,
  Users,
  Settings,
  Database,
  Search,
  Printer,
  Tag,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { NavPage } from '@/components/layout/Sidebar';
import { movieService, showService } from '@/services';
import { useAuthStore } from '@/store/useAuthStore';
import { Movie, Show } from '@/types';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: NavPage) => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<Show[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loadContext = async () => {
        try {
          const [m, s] = await Promise.all([
            movieService.getMovies(),
            showService.getShows({ activeOnly: true }),
          ]);
          setMovies(m.slice(0, 10));
          setShows(s.slice(0, 10));
        } catch (e) {
          console.error('Failed to load search context', e);
        }
      };
      loadContext();
    }
  }, [isOpen]);

  const handleSelect = (page: NavPage) => {
    onNavigate(page);
    onClose();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CommandInput placeholder="Type a command, search pages, movies, shows, or masters..." />
      <CommandList >
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Operations & Counter */}
        <CommandGroup heading="Operations & Counter" >
          {(isSystemAdmin || hasPermission('reports', 'can_read')) && (
            <CommandItem onSelect={() => handleSelect('dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4 text-primary transition-colors" />
              <span className="font-semibold">Dashboard</span>
            </CommandItem>
          )}
          {(isSystemAdmin || hasPermission('booking', 'can_read') || hasPermission('booking', 'can_create')) && (
            <CommandItem onSelect={() => handleSelect('pos')}>
              <Ticket className="mr-2 h-4 w-4 text-primary transition-colors" />
              <span className="font-semibold">POS Ticket Counter</span>
              <CommandShortcut>F2</CommandShortcut>
            </CommandItem>
          )}
          {(isSystemAdmin || hasPermission('reports', 'can_read')) && (
            <CommandItem onSelect={() => handleSelect('dcr')}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-success transition-colors" />
              <span className="font-semibold">Daily Collection Report (DCR)</span>
              <CommandShortcut>F3</CommandShortcut>
            </CommandItem>
          )}
          {(isSystemAdmin || hasPermission('cancellation', 'can_read') || hasPermission('cancellation', 'can_create')) && (
            <CommandItem onSelect={() => handleSelect('cancel')}>
              <Ban className="mr-2 h-4 w-4 text-destructive transition-colors" />
              <span className="font-semibold">Cancel / Void Tickets</span>
              <CommandShortcut>F4</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>

        {/* Master Configurations */}
        {(isSystemAdmin ||
          hasPermission('movies', 'can_read') ||
          hasPermission('shows', 'can_read') ||
          hasPermission('seat_layout', 'can_read') ||
          hasPermission('pricing', 'can_read') ||
          hasPermission('taxes', 'can_read') ||
          hasPermission('settings', 'can_read')) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Masters & Management">
              {(isSystemAdmin || hasPermission('settings', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_cinema')}>
                  <Film className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Cinema &amp; Hall Profile Master</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('movies', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_movies')}>
                  <Film className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Movie Catalogue Master</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('shows', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_shows')}>
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Show Timings &amp; Schedules</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('seat_layout', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_screens')}>
                  <Armchair className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Screen &amp; Seat Layouts</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('seat_layout', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_others')}>
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Seat Classes &amp; System Lookups</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('pricing', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_pricing')}>
                  <IndianRupee className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Ticket Class Pricing Master</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('taxes', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_taxes')}>
                  <Percent className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>GST &amp; Tax Configuration</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('movies', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('master_others')}>
                  <Layers className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Core Dropdowns &amp; Master Values</span>
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}

        {/* Active Movies */}
        {movies.length > 0 && (isSystemAdmin || hasPermission('booking', 'can_read') || hasPermission('booking', 'can_create')) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Running Movies">
              {movies.map((m) => {
                const meta = [m.language_name, m.movie_type_name].filter(Boolean).join(' • ');
                return (
                  <CommandItem
                    key={m.id}
                    onSelect={() => handleSelect('pos')}
                  >
                    <Film className="mr-2 h-3.5 w-3.5 text-primary transition-colors" />
                    <span className="font-medium">{m.name}</span>
                    {meta && <span className="ml-2 text-2xs opacity-75">({meta})</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* Administration */}
        {(isSystemAdmin || hasPermission('users', 'can_read') || hasPermission('settings', 'can_read')) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Administration & Tools">
              {(isSystemAdmin || hasPermission('users', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('users_permissions')}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Users &amp; Role Permissions Matrix</span>
                </CommandItem>
              )}
              {(isSystemAdmin || hasPermission('settings', 'can_read')) && (
                <CommandItem onSelect={() => handleSelect('system_settings')}>
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Printer &amp; Copy Configuration</span>
                </CommandItem>
              )}
              {isSystemAdmin && (
                <CommandItem onSelect={() => handleSelect('audit_backup')}>
                  <Database className="mr-2 h-4 w-4 text-muted-foreground transition-colors" />
                  <span>Audit Trail &amp; Database Backup</span>
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};
