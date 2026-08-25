import React, { useState } from 'react';
import logoSrc from '@/assets/logo.svg';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuthStore();
  const [username, setUsername] = useState('sysadmin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('An error occurred while logging in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(u, p);
      if (!success) {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err) {
      console.error('Quick login error:', err);
      setError('An error occurred during quick login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = (newVal: string) => {
    setUsername(newVal);
    const lower = newVal.trim().toLowerCase();
    if (lower === 'operator' && (password === 'admin123' || !password)) {
      setPassword('operator123');
    } else if (lower === 'sysadmin' && (password === 'operator123' || !password)) {
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-muted/40 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm bg-card rounded-xs border border-border overflow-hidden shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-5 text-center border-b border-primary/20">
          <div className="w-12 h-12 rounded-xs mx-auto flex items-center justify-center mb-2.5 shadow-sm overflow-hidden">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-base font-bold tracking-wider uppercase">
            Booking System
          </h1>
          <p className="text-xs text-primary-foreground/80 font-medium mt-0.5">
            Box Office Counter POS
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xs text-destructive text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Operator Username
            </label>
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
              <Input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="sysadmin / operator"
                className="pl-8 h-9 text-xs"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="default"
            size="default"
            disabled={isLoading}
            className="w-full font-bold h-9 text-xs"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            {isLoading ? 'Authenticating...' : 'Sign In to Box Office'}
          </Button>

          {/* Quick Switch Demo Buttons */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase text-center">
              Quick Switch Demo Roles
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('sysadmin', 'admin123')}
                className="p-2 border border-border rounded-xs bg-muted/30 hover:bg-muted text-xs text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-foreground">sysadmin</div>
                <div className="text-[10px] text-muted-foreground">Super Administrator</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operator', 'operator123')}
                className="p-2 border border-border rounded-xs bg-muted/30 hover:bg-muted text-xs text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-foreground">operator</div>
                <div className="text-[10px] text-muted-foreground">Box Office Operator</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
