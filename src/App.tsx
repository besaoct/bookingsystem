import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Header } from '@/components/layout/Header';
import { Sidebar, NavPage } from '@/components/layout/Sidebar';
import { LoginView } from '@/components/auth/LoginModal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

// Pages
import { POSCounterPage } from '@/pages/POSCounterPage';
import { DCRReportPage } from '@/pages/DCRReportPage';
import { TicketCancellationPage } from '@/pages/TicketCancellationPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CinemaMasterPage } from '@/pages/masters/CinemaMasterPage';
import { MovieMasterPage } from '@/pages/masters/MovieMasterPage';
import { ShowTimingMasterPage } from '@/pages/masters/ShowTimingMasterPage';
import { ScreenSeatLayoutMasterPage } from '@/pages/masters/ScreenSeatLayoutMasterPage';
import { SeatClassesMasterPage } from '@/pages/masters/SeatClassesMasterPage';
import { PricingMasterPage } from '@/pages/masters/PricingMasterPage';
import { TaxGstConfigPage } from '@/pages/masters/TaxGstConfigPage';
import { CoreDropdownsPage } from '@/pages/masters/CoreDropdownsPage';
import { UsersPermissionsPage } from '@/pages/UsersPermissionsPage';
import { SystemSettingsPage } from '@/pages/SystemSettingsPage';
import { AuditBackupPage } from '@/pages/AuditBackupPage';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading, loadInitialAuth, hasPermission } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadInitialAuth();
    fetchSettings();
  }, []);

  // Set appropriate default page on login/session load
  useEffect(() => {
    if (user) {
      if (user.role === 'OPERATOR') {
        setActivePage('pos');
      } else if (user.role === 'SYSTEM_ADMIN' || hasPermission('reports', 'can_read')) {
        setActivePage('dashboard');
      } else if (hasPermission('booking', 'can_read') || hasPermission('booking', 'can_create')) {
        setActivePage('pos');
      }
    }
  }, [user?.id, user?.role]);

  // Global Function Keys
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        if (user?.role === 'SYSTEM_ADMIN' || hasPermission('booking', 'can_read') || hasPermission('booking', 'can_create')) {
          e.preventDefault();
          setActivePage('pos');
        }
      } else if (e.key === 'F3') {
        if (user?.role === 'SYSTEM_ADMIN' || hasPermission('reports', 'can_read')) {
          e.preventDefault();
          setActivePage('dcr');
        }
      } else if (e.key === 'F4') {
        if (user?.role === 'SYSTEM_ADMIN' || hasPermission('cancellation', 'can_read') || hasPermission('cancellation', 'can_create')) {
          e.preventDefault();
          setActivePage('cancel');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [user, hasPermission]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-shell text-shell-foreground flex flex-col items-center justify-center space-y-3 font-sans">
        <RefreshCw className="size-8 animate-spin text-shell-active" />
        <div className="text-sm font-extrabold uppercase tracking-widest text-shell-foreground">
          Booking System
        </div>
        <div className="text-xs text-shell-muted font-medium">Initialising...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <TooltipProvider delayDuration={150}>
      {/* ── ReqruitBook layout: sidebar sticky h-screen on left, header+content on right ── */}
      <div className="flex h-screen w-screen bg-background text-foreground font-sans overflow-hidden">

        {/* ── Left: Sticky sidebar rail (matches ReqruitBook: sticky top-0 h-screen self-start) ── */}
        <div className="sticky top-0 z-20 hidden h-screen shrink-0 self-start md:flex">
          <Sidebar
            activePage={activePage}
            onSelectPage={setActivePage}
            collapsed={collapsed}
          />
          {/* ReqruitBook-exact collapse toggle: absolute -right-2.5 top-13 */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-2.5 top-13 z-20 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:text-primary hover:border-primary shadow-xs cursor-pointer"
          >
            <ChevronLeft
              className={cn('size-3 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>

        {/* ── Right: Header + main content (matches ReqruitBook: flex min-w-0 flex-1 flex-col) ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onNavigate={setActivePage} />

          <main className="flex-1 overflow-hidden bg-muted/40">
            {activePage === 'pos' && (
              <PermissionGuard module="booking" action="can_read" onNavigate={setActivePage}>
                <POSCounterPage />
              </PermissionGuard>
            )}
            {activePage === 'dcr' && (
              <PermissionGuard module="reports" action="can_read" onNavigate={setActivePage}>
                <DCRReportPage />
              </PermissionGuard>
            )}
            {activePage === 'cancel' && (
              <PermissionGuard module="cancellation" action="can_read" onNavigate={setActivePage}>
                <TicketCancellationPage />
              </PermissionGuard>
            )}
            {activePage === 'dashboard' && (
              <PermissionGuard module="reports" action="can_read" onNavigate={setActivePage}>
                <DashboardPage onNavigate={setActivePage} />
              </PermissionGuard>
            )}
            {activePage === 'master_cinema' && (
              <PermissionGuard module="settings" action="can_read" onNavigate={setActivePage}>
                <CinemaMasterPage />
              </PermissionGuard>
            )}
            {activePage === 'master_movies' && (
              <PermissionGuard module="movies" action="can_read" onNavigate={setActivePage}>
                <MovieMasterPage />
              </PermissionGuard>
            )}
            {activePage === 'master_shows' && (
              <PermissionGuard module="shows" action="can_read" onNavigate={setActivePage}>
                <ShowTimingMasterPage />
              </PermissionGuard>
            )}
            {activePage === 'master_screens' && (
              <PermissionGuard module="seat_layout" action="can_read" onNavigate={setActivePage}>
                <ScreenSeatLayoutMasterPage onNavigate={setActivePage} />
              </PermissionGuard>
            )}

            {activePage === 'master_pricing' && (
              <PermissionGuard module="pricing" action="can_read" onNavigate={setActivePage}>
                <PricingMasterPage />
              </PermissionGuard>
            )}
            {activePage === 'master_taxes' && (
              <PermissionGuard module="taxes" action="can_read" onNavigate={setActivePage}>
                <TaxGstConfigPage />
              </PermissionGuard>
            )}
            {activePage === 'master_others' && (
              <PermissionGuard module="movies" action="can_read" onNavigate={setActivePage}>
                <CoreDropdownsPage />
              </PermissionGuard>
            )}
            {activePage === 'users_permissions' && (
              <PermissionGuard module="users" action="can_read" onNavigate={setActivePage}>
                <UsersPermissionsPage />
              </PermissionGuard>
            )}
            {activePage === 'system_settings' && (
              <PermissionGuard module="settings" action="can_read" onNavigate={setActivePage}>
                <SystemSettingsPage />
              </PermissionGuard>
            )}
            {activePage === 'audit_backup' && (
              <PermissionGuard adminOnly onNavigate={setActivePage}>
                <AuditBackupPage />
              </PermissionGuard>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};
export default App;
