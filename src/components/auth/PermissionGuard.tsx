import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { NavPage } from '@/components/layout/Sidebar';

interface PermissionGuardProps {
  module?: string;
  action?: 'can_create' | 'can_read' | 'can_update' | 'can_delete';
  adminOnly?: boolean;
  onNavigate?: (page: NavPage) => void;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action = 'can_read',
  adminOnly = false,
  onNavigate,
  children,
}) => {
  const { user, hasPermission } = useAuthStore();

  if (!user) return null;

  if (user.role === 'SYSTEM_ADMIN') {
    return <>{children}</>;
  }

  if (adminOnly) {
    return <AccessDeniedScreen onNavigate={onNavigate} reason="This section is restricted to System Administrators only." />;
  }

  if (module && !hasPermission(module, action)) {
    return (
      <AccessDeniedScreen
        onNavigate={onNavigate}
        reason={`You do not have permission to view the ${module.toUpperCase()} module.`}
      />
    );
  }

  return <>{children}</>;
};

const AccessDeniedScreen: React.FC<{
  reason: string;
  onNavigate?: (page: NavPage) => void;
}> = ({ reason, onNavigate }) => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center text-center p-8 bg-card border border-border rounded-lg shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">Access Restricted</h2>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          {reason}
        </p>
        <div className="flex gap-2">
          {onNavigate && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate('pos')}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              Go to POS Counter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
