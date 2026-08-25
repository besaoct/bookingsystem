import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Header } from '@/components/layout/Header';
import { Sidebar, NavPage } from '@/components/layout/Sidebar';
import { TitleBar } from '@/components/layout/TitleBar';
import { LoginView } from '@/components/auth/LoginModal';
import { FirstTimeSetupView } from '@/components/auth/FirstTimeSetupView';
import { userService } from '@/services';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logo.svg';
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
  const [isSetupDone, setIsSetupDone] = useState<boolean | null>(null);
  const [forceSetupScreen, setForceSetupScreen] = useState(false);

  useEffect(() => {
    loadInitialAuth();
    fetchSettings();
    userService.isInitialSetupCompleted().then((completed) => {
      setIsSetupDone(completed);
    });
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

  if (isLoading || isSetupDone === null) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center font-sans" style={{ background: 'hsl(217 88% 46%)' }}>
        <TitleBar />
        <div className="flex flex-col items-center gap-3">
          <img src={logoSrc} alt="Booking System" className="w-14 h-14 rounded-xl shadow-lg" />
          <span className="text-white text-base font-bold tracking-widest uppercase" style={{ letterSpacing: '0.18em' }}>Booking System</span>
        </div>
      </div>
    );
  }

  // First-time user setup screen
  if (isSetupDone === false || forceSetupScreen) {
    return (
      <>
        <TitleBar />
        <FirstTimeSetupView
          onComplete={() => {
            setIsSetupDone(true);
            setForceSetupScreen(false);
          }}
        />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <TitleBar />
        <LoginView />
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <TitleBar />
      {/* ── Shell layout ── */}
      <div className="flex w-screen bg-background text-foreground font-sans overflow-hidden print:overflow-visible" style={{ height: 'calc(100vh - var(--titlebar-h))' }}>

        {/* ── Left: Sticky sidebar rail ── */}
        <div className="sticky top-0 z-20 hidden h-full shrink-0 self-start md:flex print:hidden">
          <Sidebar
            activePage={activePage}
            onSelectPage={setActivePage}
            collapsed={collapsed}
          />
          {/* collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-2.5 top-13 z-20 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:text-primary hover:border-primary shadow-xs cursor-pointer print:hidden"
          >
            <ChevronLeft
              className={cn('size-3 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>

          {/* ── Right: Header + main content ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible print:w-full">
          <Header onNavigate={setActivePage} />

          <main className="flex-1 relative overflow-y-auto bg-muted/40 print:overflow-visible">
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
              <PermissionGuard module="master_others" action="can_read" onNavigate={setActivePage}>
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
