import { create } from 'zustand';
import { User, RolePermission } from '@/types';
import { userService, auditService } from '@/services';

interface AuthState {
  user: User | null;
  permissions: RolePermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, passwordHash: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: string, action: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => boolean;
  loadInitialAuth: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,

  loadInitialAuth: async () => {
    try {
      const savedUserId = localStorage.getItem('booking_system_user_id');
      if (savedUserId) {
        const user = await userService.getUserById(Number(savedUserId));
        if (user) {
          await userService.ensureModulePermissions();
          const permissions = await userService.getRolePermissions(user.role);
          set({ user, permissions, isAuthenticated: true, isLoading: false });
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load initial auth:', e);
    }
    set({ user: null, permissions: [], isAuthenticated: false, isLoading: false });
  },

  login: async (username: string, passwordHash: string) => {
    try {
      const user = await userService.authenticate(username, passwordHash);
      if (!user) return false;

      let permissions = await userService.getRolePermissions(user.role);
      if (permissions.length === 0) {
        await userService.ensureModulePermissions();
        permissions = await userService.getRolePermissions(user.role);
      }

      localStorage.setItem('booking_system_user_id', String(user.id));
      set({ user, permissions, isAuthenticated: true });

      await auditService.log(
        user.id,
        user.username,
        'LOGIN',
        'auth',
        'User logged in from counter workstation'
      );

      return true;
    } catch (err) {
      console.error('Fatal error during login:', err);
      return false;
    }
  },

  logout: () => {
    const currentUser = get().user;
    if (currentUser) {
      auditService.log(currentUser.id, currentUser.username, 'LOGOUT', 'auth', 'User logged out');
    }
    localStorage.removeItem('booking_system_user_id');
    set({ user: null, permissions: [], isAuthenticated: false });
  },

  hasPermission: (module: string, action: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
    const { user, permissions } = get();
    if (!user) return false;
    if (user.role === 'SYSTEM_ADMIN') return true;

    const modPerm = permissions.find((p) => p.module === module);
    if (!modPerm) return false;
    return Boolean(modPerm[action]);
  },

  refreshPermissions: async () => {
    const { user } = get();
    if (!user) return;
    const permissions = await userService.getRolePermissions(user.role);
    set({ permissions });
  },
}));

