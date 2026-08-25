import React, { useState, useEffect } from 'react';
import {
  Search,
  HelpCircle,
  LogOut,
  Clock,
  User,
  Settings,
  Building2,
  Database,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Modal } from '@/components/ui/modal';
import { CommandMenu } from '@/components/layout/CommandMenu';
import { NavPage } from '@/components/layout/Sidebar';

interface HeaderProps {
  onNavigate?: (page: NavPage) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, logout, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canReadSettings = isSystemAdmin || hasPermission('settings', 'can_read');
  const canReadUsers = isSystemAdmin || hasPermission('users', 'can_read');
  const canReadCinema = isSystemAdmin || hasPermission('settings', 'can_read');
  const canReadAudit = isSystemAdmin;

  const [timeStr, setTimeStr] = useState<string>('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global Ctrl+K / Cmd+K / F1 listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const roleLabel =
    user?.role === 'SYSTEM_ADMIN' ? 'System Admin' : 'Operator';

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur px-3 md:px-5 print:hidden">
        {/* Search Bar / Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          className="hidden max-w-sm flex-1 md:flex items-center justify-between gap-2 h-8 w-full rounded-xs border border-input bg-background pl-2.5 pr-2 text-xs text-muted-foreground transition-colors hover:border-ring focus:border-ring text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Search commands, movies, shows, settings...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-xs border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground shrink-0">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* Keyboard Shortcuts Key */}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setIsHelpOpen(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted gap-1 text-xs"
          title="Keyboard Shortcuts (F1)"
        >
          <HelpCircle className="size-3.5" />
          <span>Keys</span>
        </Button>

        {/* Live Clock Badge */}
        <div className="hidden md:flex items-center gap-1.5 h-7 px-2.5 bg-muted/60 border border-border rounded-xs text-muted-foreground">
          <Clock className="size-3 text-primary" />
          <span className="text-xs font-semibold tabular-nums">{timeStr}</span>
        </div>

        {/* User Avatar Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xs px-1.5 py-1 transition-colors hover:bg-muted cursor-pointer"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                  {userInitials}
                </span>
                <span className="hidden text-left leading-tight lg:block">
                  <span className="block max-w-30 truncate text-xs font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="block max-w-30 truncate text-[10px] text-muted-foreground">
                    {roleLabel}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {roleLabel}
                </div>
              </DropdownMenuLabel>

              {(canReadSettings || canReadUsers || canReadCinema || canReadAudit) && (
                <DropdownMenuSeparator />
              )}

              {onNavigate && canReadCinema && (
                <DropdownMenuItem
                  onClick={() => onNavigate('master_cinema')}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Building2 className="size-3.5" />
                  <span>Cinema Profile</span>
                </DropdownMenuItem>
              )}

              {onNavigate && canReadSettings && (
                <DropdownMenuItem
                  onClick={() => onNavigate('system_settings')}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Settings className="size-3.5" />
                  <span>Printer &amp; System Settings</span>
                </DropdownMenuItem>
              )}

              {onNavigate && canReadUsers && (
                <DropdownMenuItem
                  onClick={() => onNavigate('users_permissions')}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <User className="size-3.5" />
                  <span>Users &amp; Permissions</span>
                </DropdownMenuItem>
              )}

              {onNavigate && canReadAudit && (
                <DropdownMenuItem
                  onClick={() => onNavigate('audit_backup')}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Database className="size-3.5" />
                  <span>Audit Log &amp; Backup</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Command Search Palette Dialog */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Keyboard Shortcuts"
        description="Fast shortcuts for high-speed counter ticketing"
        maxWidth="md"
      >
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 border border-border rounded-xs bg-muted/40 flex items-center justify-between">
              <span className="text-foreground font-medium">POS Ticket Counter</span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded-xs text-xs font-bold text-primary">F2</kbd>
            </div>
            <div className="p-2 border border-border rounded-xs bg-muted/40 flex items-center justify-between">
              <span className="text-foreground font-medium">Daily Collection Report</span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded-xs text-xs font-bold text-primary">F3</kbd>
            </div>
            <div className="p-2 border border-border rounded-xs bg-muted/40 flex items-center justify-between">
              <span className="text-foreground font-medium">Cancel Ticket Flow</span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded-xs text-xs font-bold text-primary">F4</kbd>
            </div>
            <div className="p-2 border border-border rounded-xs bg-muted/40 flex items-center justify-between">
              <span className="text-foreground font-medium">Confirm &amp; Print Tickets</span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded-xs text-xs font-bold text-success">F9 / Enter</kbd>
            </div>
            <div className="p-2 border border-border rounded-xs bg-muted/40 flex items-center justify-between">
              <span className="text-foreground font-medium">Toggle GST On/Off</span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded-xs text-xs font-bold text-muted-foreground">Alt + G</kbd>
            </div>
            <div className="p-2 border border-border rounded-xs bg-muted/40 flex items-center justify-between">
              <span className="text-foreground font-medium">Quick Command Search</span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded-xs text-xs font-bold text-muted-foreground">⌘K / Ctrl+K</kbd>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
