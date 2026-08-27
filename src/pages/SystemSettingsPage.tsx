import React, { useState, useEffect } from 'react';
import { auditService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings,
  Database,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Check,
  Copy,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { licenseService } from '@/services/license.service';
import { LicenseVerificationResult } from '@/lib/license-crypto';

export const SystemSettingsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canUpdate = isSystemAdmin || hasPermission('settings', 'can_update');

  // License state
  const [licenseInfo, setLicenseInfo] = useState<LicenseVerificationResult | null>(null);
  const [machineId, setMachineId] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState<string | null>(null);

  // Re-seed & Full Reset states
  const [isReseeding, setIsReseeding] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isFullResetting, setIsFullResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const mId = await licenseService.getMachineId();
      setMachineId(mId);
      const lic = await licenseService.checkLicenseStatus();
      setLicenseInfo(lic);
    } catch (err) {
      console.error('Failed to load license info:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyMachineId = () => {
    if (machineId) {
      navigator.clipboard.writeText(machineId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleRenewLicense = async () => {
    try {
      const content = await licenseService.openLicenseFileDialog();
      if (content) {
        const res = await licenseService.activateLicense(content);
        if (res.isValid) {
          setLicenseInfo(res);
          setLicenseMsg('License updated successfully!');
          setTimeout(() => setLicenseMsg(null), 3000);
        } else {
          alert(`License Error: ${res.message}`);
        }
      }
    } catch (err: any) {
      alert(`Failed to load license: ${err?.message}`);
    }
  };

  const handleResetSeed = async () => {
    if (
      !window.confirm(
        '⚠️ ARE YOU SURE YOU WANT TO RE-SEED THE DATABASE?\n\n' +
        'This will reset SQLite data to original defaults:\n' +
        '• Screen 1 with exact 10 Seats (Row A: 1-3, Row B: 1-3, Row C: 1-4)\n' +
        '• Distributors (GOENKA ENTERPRISES, Sony, YRF, etc.)\n' +
        '• Movie Catalog, Schedule & Pricing\n' +
        '• Default System Admin & Operator accounts\n\n' +
        'Click OK to proceed.'
      )
    ) {
      return;
    }

    setIsReseeding(true);
    try {
      await auditService.resetDatabaseToSeed();
      setStatusMessage('Database reseeded successfully with 10-seat layout and default masters!');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error('Failed to reseed database:', e);
      alert('Error: Failed to reseed database.');
      setIsReseeding(false);
    }
  };

  const handleExecuteFullSystemReset = async () => {
    if (confirmKeyword.trim().toUpperCase() !== 'RESET') {
      return;
    }

    setIsFullResetting(true);
    try {
      await auditService.fullSystemReset();
      setStatusMessage('System reset completed. Redirecting to First-Time Initial Setup...');
      setIsResetModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error('Failed to execute full system reset:', e);
      alert('Error: Failed to reset system.');
      setIsFullResetting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 bg-muted/40 select-none font-sans">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            System Settings &amp; Administration
          </span>
        </div>

        {statusMessage && (
          <span className="text-success text-xs font-medium flex items-center bg-success/10 px-2.5 py-1 rounded-xs border border-success/20 animate-pulse">
            <ShieldCheck className="w-4 h-4 mr-1 text-success" /> {statusMessage}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Software License & Hardware Activation */}
        <Card className="lg:col-span-2 bg-card border-border shadow-xs">
          <CardHeader className="p-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              <span>
                {licenseService.isLicenseDisabled()
                  ? 'Mac App Store Edition License'
                  : 'Software License & Hardware Activation'}
              </span>
            </CardTitle>
            {licenseInfo?.isValid ? (
              <Badge variant="blue" className="text-[10px] font-medium uppercase px-2 py-0.5">
                <ShieldCheck className="w-3 h-3 mr-1" />
                {licenseService.isLicenseDisabled() ? 'App Store Active' : 'Active Software License'}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] font-medium uppercase px-2 py-0.5">
                Unlicensed / Expired
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {licenseMsg && (
              <div className="p-2 rounded-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-2xs font-medium flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{licenseMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xs bg-muted/40 border border-border space-y-1">
                <span className="text-3xs font-medium uppercase text-muted-foreground">Licensed Client</span>
                <p className="font-semibold text-foreground truncate">
                  {licenseService.isLicenseDisabled()
                    ? 'Apple App Store User'
                    : licenseInfo?.payload?.clientName || 'Unregistered'}
                </p>
                <p className="text-3xs text-muted-foreground">
                  {licenseService.isLicenseDisabled()
                    ? 'Official App Store Purchase'
                    : licenseInfo?.payload?.licensee || 'Direct Client'}
                </p>
              </div>

              <div className="p-3 rounded-xs bg-muted/40 border border-border space-y-1">
                <span className="text-3xs font-medium uppercase text-muted-foreground">License Tier</span>
                <p className="font-semibold text-primary uppercase">
                  {licenseService.isLicenseDisabled() ? 'App Store Lifetime' : `${licenseInfo?.payload?.licenseType || 'Standard'} License`}
                </p>
                <p className="text-3xs text-muted-foreground">Full Installation &amp; Unlimited Screens</p>
              </div>

              <div className="p-3 rounded-xs bg-muted/40 border border-border space-y-1">
                <span className="text-3xs font-medium uppercase text-muted-foreground">Validity &amp; Expiry</span>
                <p className="font-semibold text-foreground">
                  {licenseService.isLicenseDisabled()
                    ? 'Lifetime (Never Expires)'
                    : licenseInfo?.payload?.expiresAt
                    ? `${licenseInfo.payload.expiresAt.slice(0, 10)} (${
                        licenseInfo.daysRemaining === 0
                          ? 'Expiring today'
                          : licenseInfo.daysRemaining === 1
                          ? '1 day remaining'
                          : `${licenseInfo.daysRemaining} days remaining`
                      })`
                    : 'Lifetime (Never Expires)'}
                </p>
                <p className="text-3xs text-muted-foreground">
                  {licenseService.isLicenseDisabled()
                    ? 'Managed by Apple Store'
                    : `Issued: ${licenseInfo?.payload?.issuedAt?.slice(0, 10) || 'N/A'}`}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border">
              <div className="space-y-1">
                <span className="text-3xs font-medium uppercase text-muted-foreground">Host Machine Hardware ID</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-medium text-foreground bg-muted px-2 py-1 rounded-xs border border-border">
                    {machineId || 'Detecting...'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleCopyMachineId}
                    className="cursor-pointer font-medium"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" /> Copy ID
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {canUpdate && !licenseService.isLicenseDisabled() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRenewLicense}
                  className="shrink-0 font-medium cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Update / Renew License (.lic)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Database Re-Seed (10 Seats Layout & Default Masters) */}
        {isSystemAdmin && (
          <Card className="lg:col-span-2 border-amber-500/30 bg-card shadow-xs">
            <CardHeader className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Database Factory Re-Seed</span>
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                10 Seats &amp; Demo Masters
              </Badge>
            </CardHeader>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-xl text-muted-foreground text-2xs leading-relaxed">
                <p className="font-semibold text-foreground">
                  Reset local SQLite database to original fresh seed state:
                </p>
                <p>
                  Includes 10-seat layout (A: 1-3, B: 1-3, C: 1-4), GOENKA ENTERPRISES &amp; distributors, movie catalog, schedule, dynamic pricing, and standard operator/admin accounts.
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleResetSeed}
                disabled={isReseeding}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium shrink-0 cursor-pointer shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isReseeding ? 'animate-spin' : ''}`} />
                {isReseeding ? 'Reseeding Database...' : 'Run Database Re-Seed'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 3: Full System Factory Reset (Clean DB & Reset Credentials) */}
        {isSystemAdmin && (
          <Card className="lg:col-span-2 border-destructive/40 bg-card shadow-xs">
            <CardHeader className="p-3 bg-destructive/10 border-b border-destructive/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-destructive flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <span>Full System Reset (Clean DB &amp; Credentials)</span>
              </CardTitle>
              <Badge variant="destructive" className="text-[9px] font-medium uppercase px-1.5 py-0.2">
                Factory Wipe
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Totally cleans the database, erases all transaction logs and custom system credentials, and redirects to the <strong>First-Time Initial Setup</strong> wizard.
              </p>
              <ul className="text-2xs text-muted-foreground list-disc list-inside space-y-1 bg-destructive/5 p-2.5 rounded-xs border border-destructive/20">
                <li>Cleans all bookings, tickets &amp; revenue reports</li>
                <li>Wipes audit trail &amp; custom masters</li>
                <li>Clears Admin &amp; Operator login credentials</li>
                <li>Returns to First-Time Account Setup</li>
              </ul>
              <div className="flex justify-end pt-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setConfirmKeyword('');
                    setIsResetModalOpen(true);
                  }}
                  disabled={isFullResetting}
                  className="font-medium cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Full System Reset...
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full System Reset Confirmation Dialog */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="max-w-md p-6 font-sans">
          <DialogHeader>
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-destructive">
                Confirm Full System Reset
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              This action is <strong className="text-foreground font-semibold">permanent and cannot be undone</strong>. All existing data in the local database will be completely wiped:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xs p-3 space-y-1 text-2xs text-destructive">
              <p className="font-medium">• All bookings, tickets, and cancellation records will be deleted.</p>
              <p className="font-medium">• All audit logs and master configurations will be reset.</p>
              <p className="font-medium">• All user credentials will be cleared.</p>
              <p className="font-medium">• The application will navigate to First-Time Initial Setup.</p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                Type <span className="font-mono text-destructive font-semibold">RESET</span> to confirm:
              </label>
              <Input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="RESET"
                className="font-mono text-center text-sm font-semibold tracking-widest text-destructive uppercase placeholder:text-muted-foreground/40"
                disabled={isFullResetting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isFullResetting}
              className="cursor-pointer font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleExecuteFullSystemReset}
              disabled={confirmKeyword.trim().toUpperCase() !== 'RESET' || isFullResetting}
              className="font-medium cursor-pointer"
            >
              <Trash2 className={`w-3.5 h-3.5 mr-1.5 ${isFullResetting ? 'animate-spin' : ''}`} />
              {isFullResetting ? 'Resetting System...' : 'Wipe & Reset Everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
