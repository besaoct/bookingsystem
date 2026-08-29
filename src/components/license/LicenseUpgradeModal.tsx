import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  Armchair,
  Layers,
  KeyRound,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { licenseService } from '@/services/license.service';
import logoSrc from '@/assets/logo.svg';

interface LicenseUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'screen' | 'seat';
  currentCount: number;
  maxLimit: number;
  attemptedCount?: number;
  onNavigateToSettings?: () => void;
}

export const LicenseUpgradeModal: React.FC<LicenseUpgradeModalProps> = ({
  isOpen,
  onClose,
  limitType,
  currentCount,
  maxLimit,
  attemptedCount,
  onNavigateToSettings,
}) => {
  const [machineId, setMachineId] = useState<string>('Detecting...');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      licenseService.getMachineId().then((id) => {
        setMachineId(id);
      });
    }
  }, [isOpen]);

  const handleCopyMachineId = () => {
    if (machineId && machineId !== 'Detecting...') {
      navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isScreen = limitType === 'screen';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden border-border shadow-2xl rounded-lg max-w-md gap-0 [&>button]:text-white/80 hover:[&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:top-3.5 [&>button]:right-3.5 [&>button]:z-10">
        <DialogTitle className="sr-only">License Limit Reached</DialogTitle>
        <div className="flex flex-col font-sans select-none">
        {/* Header matching License Activation Screen */}
        <div className="bg-primary text-primary-foreground p-5 text-center flex flex-col items-center justify-center relative">
          <div className="w-12 h-12 bg-card rounded-md shadow-md flex items-center justify-center p-1.5 mb-2.5">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-base font-bold tracking-wider uppercase text-white">
            License Limit Reached
          </h2>
          <p className="text-xs text-white/90 font-medium mt-0.5">
            {isScreen ? 'Screen & Auditorium Quota Exceeded' : 'Seating Capacity Quota Exceeded'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs bg-card">
          {/* Solid High-Visibility Alert Banner */}
          <div className="p-3 rounded-xs bg-destructive text-white flex items-start space-x-2.5 shadow-xs animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-white" />
            <div className="space-y-0.5">
              <p className="font-semibold text-xs">
                {isScreen
                  ? `Maximum Screen Limit (${maxLimit} Screen${maxLimit === 1 ? '' : 's'}) Reached`
                  : `Maximum Seat Capacity (${maxLimit} Seats) Exceeded`}
              </p>
              <p className="text-2xs text-white/90 leading-relaxed font-normal">
                {isScreen
                  ? `Your current software license allows a maximum of ${maxLimit} active auditorium screen(s). Adding another screen requires a license upgrade.`
                  : `Your current software license has a maximum quota of ${maxLimit} seats. Adding this layout would exceed your licensed seating limit.`}
              </p>
            </div>
          </div>

          {/* Limit Usage Metrics Card */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xs bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-medium uppercase text-muted-foreground block">
                {isScreen ? 'Currently Configured' : 'Current Configured Seats'}
              </span>
              <p className="text-xs font-bold text-foreground flex items-center">
                {isScreen ? (
                  <>
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    {currentCount} Screen{currentCount === 1 ? '' : 's'}
                  </>
                ) : (
                  <>
                    <Armchair className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    {currentCount} Seats
                  </>
                )}
              </p>
            </div>

            <div className="p-2.5 rounded-xs bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-medium uppercase text-muted-foreground block">
                Your Licensed Limit
              </span>
              <p className="text-xs font-bold text-primary flex items-center">
                {maxLimit} {isScreen ? 'Screen(s)' : 'Seats Max'}
              </p>
            </div>
          </div>

          {/* Licensor Contact & Machine Hardware ID */}
          <div className="p-3.5 rounded-xs bg-muted/30 border border-border space-y-2.5">
            <div className="flex items-center space-x-1.5 text-foreground font-semibold text-xs">
              <PhoneCall className="w-3.5 h-3.5 text-primary" />
              <span>How to Increase or Upgrade to Unlimited:</span>
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Please contact your software licensor or administrator to obtain an upgraded software license key with higher capacity or <strong className="text-foreground">Unlimited Screens &amp; Seats</strong>.
            </p>

            <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-3xs uppercase font-medium text-muted-foreground block">
                  Your Machine Hardware ID
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {machineId}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleCopyMachineId}
                className="shrink-0 font-medium cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-emerald-600" /> Copied ID
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1 text-primary" /> Copy Machine ID
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="font-medium cursor-pointer"
            >
              Close
            </Button>

            {onNavigateToSettings && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateToSettings();
                }}
                className="font-semibold bg-primary text-primary-foreground cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Renew / Update License
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 bg-muted/40 border-t border-border flex items-center justify-center text-[10px] text-muted-foreground font-normal">
          <span>ECDSA P-256 Quota Protection</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
};
