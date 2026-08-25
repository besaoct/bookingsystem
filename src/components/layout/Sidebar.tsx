import React, { useState } from 'react';
import {
  LayoutDashboard,
  Ticket,
  FileSpreadsheet,
  Ban,
  Film,
  CalendarDays,
  Armchair,
  IndianRupee,
  Percent,
  Layers,
  Users,
  Settings,
  Database,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type NavPage =
  | 'pos'
  | 'dcr'
  | 'cancel'
  | 'dashboard'
  | 'master_cinema'
  | 'master_movies'
  | 'master_shows'
  | 'master_screens'
  | 'master_pricing'
  | 'master_taxes'
  | 'master_others'
  | 'users_permissions'
  | 'system_settings'
  | 'audit_backup';

interface NavChildItem {
  id: NavPage;
  label: string;
  badge?: string;
  allowed: boolean;
}

interface NavItemDef {
  id?: NavPage;
  label: string;
  icon: React.ElementType;
  badge?: string;
  allowed: boolean;
  children?: NavChildItem[];
}

interface SidebarProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  collapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  collapsed,
}) => {
  const { user, hasPermission } = useAuthStore();
  const { cinema } = useSettingsStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  const navigation: NavItemDef[] = [
    {
      id: 'dashboard' as NavPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: isSystemAdmin || hasPermission('reports', 'can_read'),
    },
    {
      id: 'pos' as NavPage,
      label: 'POS Ticket Counter',
      icon: Ticket,
      badge: 'F2',
      allowed:
        hasPermission('booking', 'can_create') ||
        hasPermission('booking', 'can_read'),
    },
    {
      id: 'dcr' as NavPage,
      label: 'Daily Collection (DCR)',
      icon: FileSpreadsheet,
      badge: 'F3',
      allowed: hasPermission('reports', 'can_read'),
    },
    {
      id: 'cancel' as NavPage,
      label: 'Ticket Cancellation',
      icon: Ban,
      badge: 'F4',
      allowed:
        hasPermission('cancellation', 'can_create') ||
        hasPermission('cancellation', 'can_read'),
    },
    {
      label: 'Configurations',
      icon: Layers,
      allowed: true,
      children: [
        {
          id: 'master_cinema' as NavPage,
          label: 'Cinema Profile',
          allowed: isSystemAdmin || hasPermission('settings', 'can_read'),
        },
        {
          id: 'master_movies' as NavPage,
          label: 'Movie Catalog',
          allowed: hasPermission('movies', 'can_read'),
        },
        {
          id: 'master_shows' as NavPage,
          label: 'Show Timings',
          allowed: hasPermission('shows', 'can_read'),
        },
        {
          id: 'master_screens' as NavPage,
          label: 'Screens & Layouts',
          allowed: hasPermission('seat_layout', 'can_read'),
        },
        {
          id: 'master_pricing' as NavPage,
          label: 'Ticket Pricing',
          allowed: hasPermission('pricing', 'can_read'),
        },
        {
          id: 'master_taxes' as NavPage,
          label: 'Tax & GST Setup',
          allowed: hasPermission('taxes', 'can_read'),
        },
        {
          id: 'master_others' as NavPage,
          label: 'System Lookups',
          allowed: isSystemAdmin || hasPermission('movies', 'can_read'),
        },
      ].filter((c) => c.allowed),
    },
    {
      label: 'Administration',
      icon: Settings,
      allowed: true,
      children: [
        {
          id: 'users_permissions' as NavPage,
          label: 'Users & Permissions',
          allowed: isSystemAdmin || hasPermission('users', 'can_read'),
        },
        {
          id: 'system_settings' as NavPage,
          label: 'Printer & Ticket Copies',
          allowed: isSystemAdmin || hasPermission('settings', 'can_read'),
        },
        {
          id: 'audit_backup' as NavPage,
          label: 'Audit Log & Backup',
          allowed: isSystemAdmin,
        },
      ].filter((c) => c.allowed),
    },
  ].filter((item) => {
    if (item.children) return item.children.length > 0;
    return item.allowed;
  });

  return (
    <TooltipProvider delayDuration={50}>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r border-shell-border bg-shell text-shell-foreground transition-[width] duration-200 select-none shadow-xs',
          collapsed ? 'w-15' : 'w-62'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-shell-border px-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xs bg-white text-primary font-bold shadow-xs">
            <Ticket className="size-4.5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold leading-tight text-white">
                Booking System
              </div>
              <div className="truncate text-[11px] font-medium leading-tight text-white/80">
                Box Office POS
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tree */}
        <nav className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-thin">
          {navigation.map((item, idx) => (
            <NavItem
              key={item.label + idx}
              item={item}
              collapsed={collapsed}
              activePage={activePage}
              onSelectPage={onSelectPage}
            />
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
};

function NavItem({
  item,
  collapsed,
  activePage,
  onSelectPage,
}: {
  item: NavItemDef;
  collapsed: boolean;
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
}) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isDirectActive = item.id === activePage;
  const isChildActive = item.children?.some((c) => c.id === activePage);
  const active = isDirectActive || Boolean(isChildActive);

  const [open, setOpen] = useState(Boolean(isChildActive));

  // Auto-expand if a child becomes active
  React.useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [isChildActive]);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              if (item.id) onSelectPage(item.id);
              else if (item.children?.[0]?.id) onSelectPage(item.children[0].id);
            }}
            aria-label={item.label}
            className={cn(
              'flex h-9 w-full items-center justify-center rounded-xs transition-colors cursor-pointer',
              active
                ? 'bg-white text-primary font-bold shadow-xs'
                : 'text-white/80 hover:bg-white/15 hover:text-white'
            )}
          >
            <Icon className="size-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="z-50 shadow-md p-1 min-w-[11rem] pointer-events-auto bg-popover text-popover-foreground border border-border rounded-xs"
        >
          {/* Main Item Link / Title */}
          {item.id ? (
            <button
              type="button"
              onClick={() => onSelectPage(item.id!)}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-2 py-1 text-xs font-medium rounded-xs transition-colors text-left cursor-pointer',
                active
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="rounded-xs bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.2 text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ) : (
            <div className="px-2 py-1 text-xs font-bold text-foreground/70 uppercase tracking-wider">
              {item.label}
            </div>
          )}

          {/* Sublinks */}
          {hasChildren && item.children && (
            <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-border/60">
              {item.children.map((child) => {
                const childIsActive = activePage === child.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectPage(child.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-2 py-1 text-[11px] rounded-xs transition-colors text-left cursor-pointer',
                      childIsActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <span className="truncate">{child.label}</span>
                    {child.badge && (
                      <span className="text-[10px] font-semibold text-primary">
                        {child.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      {hasChildren ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-sm font-medium transition-colors cursor-pointer',
            active
              ? 'bg-white/20 text-white font-semibold'
              : 'text-white/85 hover:bg-white/15 hover:text-white'
          )}
          aria-expanded={open}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded-xs bg-white/25 px-1.5 text-[10px] font-bold leading-4 text-white mr-1">
              {item.badge}
            </span>
          )}
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 opacity-80" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 opacity-80" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => item.id && onSelectPage(item.id)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-sm font-medium transition-colors text-left cursor-pointer',
            active
              ? 'bg-white text-primary font-bold shadow-xs'
              : 'text-white/85 hover:bg-white/15 hover:text-white'
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                'rounded-xs px-1.5 text-[10px] font-bold leading-4',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'bg-white/20 text-white'
              )}
            >
              {item.badge}
            </span>
          )}
        </button>
      )}

      {hasChildren && open && item.children && (
        <div className="relative ml-[19px] mt-0.5 space-y-px">
          {/* Vertical rail connecting child links to parent */}
          <span className="absolute bottom-2 left-0 top-0 w-px bg-white/30" />
          {item.children.map((child) => {
            const childIsActive = activePage === child.id;
            return (
              <div key={child.id} className="relative pl-[14px]">
                <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-white/30" />
                <button
                  type="button"
                  onClick={() => onSelectPage(child.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xs px-2.5 py-1.5 text-[13px] transition-colors text-left cursor-pointer',
                    childIsActive
                      ? 'bg-white text-primary font-bold shadow-xs'
                      : 'text-white/80 hover:bg-white/15 hover:text-white'
                  )}
                >
                  <span className="truncate">{child.label}</span>
                  {child.badge && (
                    <span className={cn(
                      'ml-1 rounded-xs px-1 text-[9px] font-bold',
                      childIsActive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-white/20 text-white'
                    )}>
                      {child.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
