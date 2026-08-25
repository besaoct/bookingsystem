import React, { useState, useEffect } from 'react';
import logoSrc from '@/assets/logo.svg';
import { useAuthStore } from '@/store/useAuthStore';
import { userService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface UserCredential {
  id: number;
  username: string;
  name: string;
  role: string;
  password_hash: string;
  is_active: number;
}

export const LoginView: React.FC = () => {
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Secret credentials modal state (Cmd+F+P)
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});

  const loadCredentials = async () => {
    try {
      const data = await userService.getLoginCredentialsSummary();
      setCredentials(data);
    } catch (e) {
      console.error('Failed to load login credentials summary:', e);
    }
  };

  useEffect(() => {
    const keysDown = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.key.toLowerCase());

      const isCmdOrCtrl = e.metaKey || e.ctrlKey || keysDown.has('meta') || keysDown.has('control');
      const hasF = keysDown.has('f');
      const hasP = keysDown.has('p');

      // Trigger on Cmd + F + P or Ctrl + F + P
      if (isCmdOrCtrl && hasF && hasP) {
        e.preventDefault();
        loadCredentials();
        setShowSecretModal(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const success = await login(username.trim(), password);
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

  const togglePasswordVisibility = (id: number) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen w-screen bg-muted/40 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm bg-card rounded-xs border border-border overflow-hidden shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-5 text-center border-b border-primary/20">
          <div className="w-12 h-12 mx-auto flex items-center justify-center mb-2.5">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
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
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
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
            className="w-full font-bold h-9 text-xs cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            {isLoading ? 'Authenticating...' : 'Sign In to Box Office'}
          </Button>
        </form>
      </div>

      {/* Secret Credentials Modal (Cmd+F+P / Ctrl+F+P) */}
      <Modal
        isOpen={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        title="System Credentials"
        description="Active box office accounts retrieved from local system database"
        maxWidth="lg"
      >
        <div className="space-y-3 py-1 text-xs">
          <div className="space-y-2">
            {credentials.map((cred) => {
              const isAdmin = cred.role === 'SYSTEM_ADMIN';
              const isPasswordVisible = Boolean(revealedPasswords[cred.id]);

              return (
                <div
                  key={cred.id}
                  className="p-3 bg-muted/20 hover:bg-muted/40 border border-border rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="shrink-0">
                      {isAdmin ? (
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-xs truncate">
                        {cred.name || cred.username}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <Badge
                          variant={isAdmin ? 'default' : 'outline'}
                          className="text-[9px] px-1.5 py-0 uppercase font-semibold shrink-0"
                        >
                          {isAdmin ? 'Admin' : 'Operator'}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          username: <strong className="text-foreground">{cred.username}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                    <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-xs tracking-wider text-xs border border-border/60">
                      {isPasswordVisible ? cred.password_hash : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(cred.id)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-xs hover:bg-muted"
                      title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-border">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => setShowSecretModal(false)}
              className="h-7 text-xs font-semibold px-4 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


