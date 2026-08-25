import { dbService } from '@/db/sqlite-service';
import { User, RolePermission, UserRole } from '@/types';

export const ALL_SYSTEM_MODULES: Array<{ id: string; name: string; desc: string }> = [
  { id: 'booking', name: 'POS Ticket Counter', desc: 'Sell tickets, select seats, issue printed passes' },
  { id: 'cancellation', name: 'Ticket Cancellation', desc: 'Cancel confirmed tickets and release seats' },
  { id: 'reports', name: 'Daily Collection (DCR)', desc: 'View box office revenue & collection reports' },
  { id: 'movies', name: 'Movie Catalog', desc: 'Manage films, languages, genres, runtimes' },
  { id: 'shows', name: 'Show Timings', desc: 'Configure daily show schedule & screen allocation' },
  { id: 'seat_layout', name: 'Screens & Seat Layouts', desc: 'View and adjust screen auditorium seat rows' },
  { id: 'pricing', name: 'Ticket Pricing', desc: 'Set class rates & show price overrides' },
  { id: 'taxes', name: 'Tax & GST Setup', desc: 'Configure GST percentages & calculation rules' },
  { id: 'settings', name: 'Printer & System Settings', desc: 'Thermal printer name, dimensions, ticket copies' },
  { id: 'users', name: 'User Management', desc: 'Create operator accounts and grant permissions' },
];

export const userService = {
  async authenticate(username: string, passwordHash: string): Promise<User | null> {
    await dbService.init();
    const cleanUsername = username.trim();
    const cleanPassword = passwordHash.trim();

    if (!cleanUsername || !cleanPassword) return null;

    return dbService.queryOne<User>(
      "SELECT id, username, name, role, is_active, created_at FROM users WHERE LOWER(TRIM(username)) = LOWER(?) AND password_hash = ? AND is_active = 1",
      [cleanUsername, cleanPassword]
    );
  },

  async getUserById(id: number): Promise<User | null> {
    await dbService.init();
    return dbService.queryOne<User>(
      "SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ? AND is_active = 1",
      [id]
    );
  },

  async getUsers(): Promise<User[]> {
    await dbService.init();
    return dbService.query<User>("SELECT id, username, name, role, is_active, created_at FROM users ORDER BY id ASC");
  },

  async saveUser(user: Partial<User> & { password?: string }): Promise<void> {
    await dbService.init();
    if (user.id) {
      if (user.password && user.password.trim()) {
        dbService.run(
          "UPDATE users SET username = ?, password_hash = ?, name = ?, role = ?, is_active = ? WHERE id = ?",
          [user.username, user.password.trim(), user.name, user.role, user.is_active ? 1 : 0, user.id]
        );
      } else {
        dbService.run(
          "UPDATE users SET username = ?, name = ?, role = ?, is_active = ? WHERE id = ?",
          [user.username, user.name, user.role, user.is_active ? 1 : 0, user.id]
        );
      }
    } else {
      dbService.run(
        "INSERT INTO users (username, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?)",
        [user.username, user.password || 'password123', user.name, user.role || 'OPERATOR', user.is_active ? 1 : 0]
      );
    }
  },

  async deleteUser(id: number): Promise<void> {
    await dbService.init();
    dbService.run("DELETE FROM users WHERE id = ?", [id]);
  },

  async getRolePermissions(role?: UserRole): Promise<RolePermission[]> {
    await dbService.init();
    if (role) {
      return dbService.query<RolePermission>(
        "SELECT * FROM role_permissions WHERE role = ?",
        [role]
      );
    }
    return dbService.query<RolePermission>("SELECT * FROM role_permissions");
  },

  async updateRolePermission(id: number, field: string, value: boolean): Promise<void> {
    await dbService.init();
    const safeField = ['can_create', 'can_read', 'can_update', 'can_delete'].includes(field) ? field : 'can_read';
    dbService.run(`UPDATE role_permissions SET ${safeField} = ? WHERE id = ?`, [value ? 1 : 0, id]);
  },

  async ensureModulePermissions(): Promise<void> {
    await dbService.init();
    for (const mod of ALL_SYSTEM_MODULES) {
      const opCount = dbService.queryOne<{ count: number }>(
        "SELECT count(*) as count FROM role_permissions WHERE role = 'OPERATOR' AND module = ?",
        [mod.id]
      )?.count || 0;

      if (opCount === 0) {
        const canCreate = ['booking', 'cancellation'].includes(mod.id) ? 1 : 0;
        const canRead = ['booking', 'cancellation'].includes(mod.id) ? 1 : 0;
        const canUpdate = mod.id === 'booking' ? 1 : 0;
        dbService.run(
          "INSERT OR IGNORE INTO role_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES ('OPERATOR', ?, ?, ?, ?, 0)",
          [mod.id, canCreate, canRead, canUpdate]
        );
      }

      const sysCount = dbService.queryOne<{ count: number }>(
        "SELECT count(*) as count FROM role_permissions WHERE role = 'SYSTEM_ADMIN' AND module = ?",
        [mod.id]
      )?.count || 0;

      if (sysCount === 0) {
        dbService.run(
          "INSERT OR IGNORE INTO role_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES ('SYSTEM_ADMIN', ?, 1, 1, 1, 1)",
          [mod.id]
        );
      }
    }
  },
};
