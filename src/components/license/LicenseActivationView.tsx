import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  FileUp,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  FileCode,
  FileCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { licenseService } from '@/services/license.service';
import { LicenseVerificationResult } from '@/lib/license-crypto';
import logoSrc from '@/assets/logo.svg';

interface LicenseActivationViewProps {
  onActivated: (result: LicenseVerificationResult) => void;
  initialError?: string | null;
}

export const LicenseActivationView: React.FC<LicenseActivationViewProps> = ({
  onActivated,
  initialError,
}) => {
  const [machineId, setMachineId] = useState<string>('Detecting...');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawKeyInput, setRawKeyInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [successInfo, setSuccessInfo] = useState<LicenseVerificationResult | null>(null);

  useEffect(() => {
    licenseService.getMachineId().then((id) => {
      setMachineId(id);
    });
  }, []);

  const handleCopyMachineId = () => {
    if (machineId && machineId !== 'Detecting...') {
      navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const processActivation = async (licenseContent: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const result = await licenseService.activateLicense(licenseContent);
      if (result.isValid) {
        setSuccessInfo(result);
        setTimeout(() => {
          onActivated(result);
        }, 1200);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      console.error('Activation failed:', err);
      setErrorMessage(err?.message || 'Failed to process license file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNativeFileOpen = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const content = await licenseService.openLicenseFileDialog();
      if (content) {
        await processActivation(content);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to open file dialog.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        await processActivation(content);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected file.');
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKeyInput.trim()) {
      setErrorMessage('Please paste your license key or text.');
      return;
    }
    await processActivation(rawKeyInput);
  };

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center p-4 font-sans select-none overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at top, hsl(217 88% 25%), hsl(222 47% 11%))',
      }}
    >
      <div className="w-full max-w-xl bg-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header Banner */}
        <div className="p-5 bg-primary text-primary-foreground border-b border-primary/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={logoSrc}
              alt="Booking System Logo"
              className="w-10 h-10 rounded-md shrink-0"
            />
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white">
                Booking System
              </h1>
              <p className="text-2xs text-white/80 font-normal">
                Software License &amp; Machine Activation
              </p>
            </div>
          </div>

          <Lock className="w-4 h-4 text-white/80 shrink-0" />
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Machine ID Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your Computer's Hardware Machine ID
              </label>
              <span className="text-3xs text-muted-foreground">Permanent Host Fingerprint</span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-muted/70 border border-border rounded-xs px-3 py-2 font-mono text-xs font-bold text-primary tracking-wider select-all truncate">
                {machineId}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyMachineId}
                className="shrink-0 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    Copy ID
                  </>
                )}
              </Button>
            </div>
            <p className="text-3xs text-muted-foreground">
              Send this <strong>Machine ID</strong> to your software licensor to obtain your digital software license (<code>.lic</code> file).
            </p>
          </div>

          {/* Success Feedback */}
          {successInfo && successInfo.payload && (
            <div className="p-3.5 rounded-xs bg-emerald-600 border border-emerald-700 text-white space-y-1 animate-in fade-in shadow-xs">
              <div className="flex items-center space-x-2 font-semibold text-xs text-white">
                <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                <span>Software License Verified Successfully!</span>
              </div>
              <p className="text-2xs text-white/90 pl-6">
                Licensed to <strong className="text-white font-bold">{successInfo.payload.clientName}</strong> ({successInfo.payload.licenseType.toUpperCase()} License). Unlocking full suite...
              </p>
            </div>
          )}

          {/* Error Feedback */}
          {errorMessage && !successInfo && (
            <div className="p-3.5 rounded-xs bg-destructive border border-destructive text-destructive-foreground space-y-1 animate-in fade-in shadow-xs">
              <div className="flex items-center space-x-2 font-semibold text-xs text-white">
                <ShieldAlert className="w-4 h-4 text-white shrink-0" />
                <span>Activation Error</span>
              </div>
              <p className="text-2xs pl-6 leading-relaxed text-white/90 font-normal">{errorMessage}</p>
            </div>
          )}

          {/* Activation Methods Tab Navigation */}
          {!successInfo && (
            <div className="space-y-3 pt-1">
              <div className="inline-flex rounded-xs bg-muted/60  border border-border w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 h-7 px-3 text-xs rounded-l-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5 mr-1" />
                  <span>Load License File (.lic)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 h-7 px-3 text-xs rounded-r-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                    activeTab === 'paste'
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1" />
                  <span>Paste License Key</span>
                </button>
              </div>

              {/* Method A: File Upload */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={handleNativeFileOpen}
                    className="border-2 border-dashed border-border hover:border-primary/70 bg-muted/20 hover:bg-muted/40 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-foreground">
                        Click to select your <code className="text-primary font-mono">.lic</code> license file
                      </p>
                      <p className="text-3xs text-muted-foreground">
                        Supports digital license files received from your software licensor
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={isLoading}
                      className="mt-2 font-semibold bg-primary text-primary-foreground pointer-events-none"
                    >
                      <FileUp className="w-3.5 h-3.5 mr-1.5" />
                      {isLoading ? 'Verifying License...' : 'Browse License File'}
                    </Button>
                  </div>

                  {/* Fallback browser input */}
                  <div className="flex items-center justify-between text-3xs text-muted-foreground pt-1">
                    <span>Alternative file picker:</span>
                    <label className="text-primary hover:underline cursor-pointer font-medium">
                      Select local file
                      <input
                        type="file"
                        accept=".lic,.json,.txt"
                        onChange={handleBrowserFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Method B: Paste Key */}
              {activeTab === 'paste' && (
                <form onSubmit={handlePasteSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs  font-medium text-muted-foreground">
                      Paste Activation Key / Raw License Data
                    </label>
                    <Textarea
                      rows={4}
                    
                      value={rawKeyInput}
                      onChange={(e) => setRawKeyInput(e.target.value)}
                      placeholder="Paste your base64 activation key or JSON license string here..."
                      className="text-xs mt-2 placeholder:font-normal max-h-64"
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={isLoading || !rawKeyInput.trim()}
                    className="w-full font-bold bg-primary text-primary-foreground"
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                    {isLoading ? 'Verifying Signature...' : 'Activate Software License'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-muted/40 border-t border-border/70 flex items-center justify-between text-[10px] text-muted-foreground/80 font-normal">
          <span>100% Offline Digital Cryptographic Verification</span>
          <span>ECDSA P-256 Signature</span>
        </div>
      </div>
    </div>
  );
};
