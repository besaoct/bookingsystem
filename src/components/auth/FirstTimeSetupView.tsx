import React, { useState, useEffect } from 'react';
import logoSrc from '@/assets/logo.svg';
import { userService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, UserCheck, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface FirstTimeSetupViewProps {
  onComplete: () => void;
}

export const FirstTimeSetupView: React.FC<FirstTimeSetupViewProps> = ({ onComplete }) => {
  // Admin Account State
  const [adminUsername, setAdminUsername] = useState('sysadmin');
  const [adminName, setAdminName] = useState('System Administrator');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Operator Account State
  const [operatorUsername, setOperatorUsername] = useState('operator');
  const [operatorName, setOperatorName] = useState('Box Office Operator');
  const [operatorPassword, setOperatorPassword] = useState('operator123');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-populate with existing names if available
    const loadDefaults = async () => {
      try {
        const info = await userService.getInitialAccountInfo();
        if (info.admin.username) setAdminUsername(info.admin.username);
        if (info.admin.name) setAdminName(info.admin.name);
        if (info.operator.username) setOperatorUsername(info.operator.username);
        if (info.operator.name) setOperatorName(info.operator.name);
      } catch (e) {
        console.error('Failed to load initial account info:', e);
      }
    };
    loadDefaults();
  }, []);

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminUsername.trim() || !adminName.trim()) {
      setError('Please provide a valid Admin username and name.');
      return;
    }

    if (!operatorUsername.trim() || !operatorName.trim()) {
      setError('Please provide a valid Operator username and name.');
      return;
    }

    setIsLoading(true);
    try {
      await userService.setupInitialAccounts(
        {
          username: adminUsername.trim(),
          name: adminName.trim(),
          password: adminPassword.trim() || 'admin123',
        },
        {
          username: operatorUsername.trim(),
          name: operatorName.trim(),
          password: operatorPassword.trim() || 'operator123',
        }
      );

      onComplete();
    } catch (err) {
      console.error('Failed to save initial setup:', err);
      setError('Failed to save account setup. Please check logs and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-muted/40 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-2xl bg-card rounded-xs border border-border overflow-hidden shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center border-b border-primary/20">
          <div className="w-14 h-14 mx-auto flex items-center justify-center mb-3">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold tracking-wider uppercase">
            Welcome to Booking System
          </h1>
          <p className="text-xs text-primary-foreground/90 font-medium mt-1">
            Initial Account Setup • Set your Administrator and Operator usernames
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAndContinue} className="p-6 space-y-6 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xs text-destructive text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Admin Account Card */}
            <div className="p-4 bg-muted/20 border border-border rounded-xs space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 pb-2 border-b border-border">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                    Administrator Account
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 font-normal">
                  Full control over masters, movies, pricing, reports, and system settings.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Admin Username
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="e.g. sysadmin"
                      className="pl-8 h-8 text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Full Name / Display Name
                  </label>
                  <Input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. System Administrator"
                    className="h-8 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password"
                      className="pl-8 h-8 text-xs font-medium"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Operator Account Card */}
            <div className="p-4 bg-muted/20 border border-border rounded-xs space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 pb-2 border-b border-border">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                    Box Office Operator
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 font-normal">
                  Fast counter POS ticketing, seat selection, and ticket cancellations.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Operator Username
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="text"
                      value={operatorUsername}
                      onChange={(e) => setOperatorUsername(e.target.value)}
                      placeholder="e.g. operator"
                      className="pl-8 h-8 text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Full Name / Display Name
                  </label>
                  <Input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="e.g. Box Office Operator"
                    className="h-8 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="password"
                      value={operatorPassword}
                      onChange={(e) => setOperatorPassword(e.target.value)}
                      placeholder="Password"
                      className="pl-8 h-8 text-xs font-medium"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 text-muted-foreground text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>You can modify users and add more operators later under Settings.</span>
            </div>

            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={isLoading}
              className="w-full sm:w-auto font-bold h-9 px-6 text-xs cursor-pointer shadow-xs"
            >
              <span>{isLoading ? 'Saving Configuration...' : 'Save & Continue'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
