import React, { useState, useEffect } from 'react';
import { User, RolePermission } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { userService, auditService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Plus,
  Check,
  CheckCheck,
  XCircle,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

const MODULES = [
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

export const UsersPermissionsPage: React.FC = () => {
  const { user: currentUser, refreshPermissions } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<'OPERATOR' | 'SYSTEM_ADMIN'>('OPERATOR');
  const [isSaved, setIsSaved] = useState(false);

  // Add User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'OPERATOR' | 'SYSTEM_ADMIN'>('OPERATOR');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'OPERATOR' | 'SYSTEM_ADMIN'>('OPERATOR');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      await userService.ensureModulePermissions();
      const uList = await userService.getUsers();
      const pList = await userService.getRolePermissions();
      setUsers(uList);
      setPermissions(pList);
      await refreshPermissions();
    } catch (e) {
      console.error('Failed to fetch users and permissions:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePermission = async (id: number, field: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
    const perm = permissions.find((p) => p.id === id);
    if (!perm) return;

    const newVal = !perm[field];
    await userService.updateRolePermission(id, field, newVal);

    const updated = permissions.map((p) => (p.id === id ? { ...p, [field]: newVal } : p));
    setPermissions(updated);
    await refreshPermissions();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleModuleAll = async (permId: number) => {
    const perm = permissions.find((p) => p.id === permId);
    if (!perm) return;

    const allEnabled = perm.can_create && perm.can_read && perm.can_update && perm.can_delete;
    const targetState = !allEnabled;

    await userService.updateRolePermission(permId, 'can_create', targetState);
    await userService.updateRolePermission(permId, 'can_read', targetState);
    await userService.updateRolePermission(permId, 'can_update', targetState);
    await userService.updateRolePermission(permId, 'can_delete', targetState);

    const updated = permissions.map((p) =>
      p.id === permId
        ? { ...p, can_create: targetState, can_read: targetState, can_update: targetState, can_delete: targetState }
        : p
    );
    setPermissions(updated);
    await refreshPermissions();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleApplyPreset = async (preset: 'standard' | 'all' | 'readonly' | 'none') => {
    if (selectedRole === 'SYSTEM_ADMIN') return;

    for (const mod of MODULES) {
      let c = false, r = false, u = false, d = false;
      if (preset === 'all') {
        c = true; r = true; u = true; d = true;
      } else if (preset === 'readonly') {
        r = true;
      } else if (preset === 'standard') {
        if (mod.id === 'booking') { c = true; r = true; u = true; d = false; }
        else if (mod.id === 'cancellation') { c = true; r = true; u = false; d = false; }
        else if (mod.id === 'reports') { c = false; r = true; u = false; d = false; }
        else if (['movies', 'shows', 'seat_layout', 'pricing'].includes(mod.id)) { c = false; r = true; u = false; d = false; }
      }

      const perm = permissions.find((p) => p.role === 'OPERATOR' && p.module === mod.id);
      if (perm) {
        await userService.updateRolePermission(perm.id, 'can_create', c);
        await userService.updateRolePermission(perm.id, 'can_read', r);
        await userService.updateRolePermission(perm.id, 'can_update', u);
        await userService.updateRolePermission(perm.id, 'can_delete', d);
      }
    }

    const pList = await userService.getRolePermissions();
    setPermissions(pList);
    await refreshPermissions();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddUser = async () => {
    setAddError(null);
    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanPass = newPassword.trim();
    const cleanName = newName.trim() || cleanUsername;

    if (!cleanUsername) {
      setAddError('Username is required.');
      return;
    }
    if (!cleanPass) {
      setAddError('Password is required.');
      return;
    }

    const existingUsers = await userService.getUsers();
    if (existingUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
      setAddError(`Username "@${cleanUsername}" already exists. Please choose a different username.`);
      return;
    }

    await userService.saveUser({
      username: cleanUsername,
      password: cleanPass,
      name: cleanName,
      role: newRole,
      is_active: true,
    });

    await auditService.log(
      currentUser?.id || 1,
      currentUser?.username || 'sysadmin',
      'CREATE_USER',
      'users',
      `Created user @${cleanUsername} with role ${newRole}`
    );

    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setIsAddUserOpen(false);
    await fetchData();
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditName(u.name);
    setEditPassword('');
    setEditRole(u.role);
    setEditIsActive(Boolean(u.is_active));
    setEditError(null);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setEditError(null);

    const cleanUsername = editUsername.trim().toLowerCase();
    const cleanName = editName.trim() || cleanUsername;

    if (!cleanUsername) {
      setEditError('Username cannot be empty.');
      return;
    }

    const allUsers = await userService.getUsers();
    const collision = allUsers.find((u) => u.username.toLowerCase() === cleanUsername && u.id !== editingUser.id);
    if (collision) {
      setEditError(`Username "@${cleanUsername}" is already taken by another account.`);
      return;
    }

    await userService.saveUser({
      id: editingUser.id,
      username: cleanUsername,
      name: cleanName,
      role: editRole,
      password: editPassword.trim() || undefined,
      is_active: editIsActive,
    });

    await auditService.log(
      currentUser?.id || 1,
      currentUser?.username || 'sysadmin',
      'UPDATE_USER',
      'users',
      `Updated profile for user ID ${editingUser.id} (@${cleanUsername})`
    );

    if (currentUser?.id === editingUser.id) {
      useAuthStore.setState({
        user: {
          ...currentUser,
          username: cleanUsername,
          name: cleanName,
          role: editRole,
          is_active: editIsActive,
        },
      });
    }

    setEditingUser(null);
    await fetchData();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleUserActive = async (u: User) => {
    if (u.id === 1 || u.username === 'sysadmin') return;
    await userService.saveUser({
      ...u,
      is_active: !u.is_active,
    });
    await fetchData();
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === 1 || u.username === 'sysadmin') return;
    if (!confirm(`Delete user account "@${u.username}" (${u.name})?`)) return;
    await userService.deleteUser(u.id);
    await fetchData();
  };

  const roleFilteredPermissions = permissions.filter((p) => p.role === selectedRole);

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            User Roles &amp; Granular Permissions
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="text-success text-xs font-bold flex items-center mr-2 animate-in fade-in">
              <Check className="w-3.5 h-3.5 mr-1" /> Updated Successfully
            </span>
          )}
          <Button variant="default" size="sm" onClick={() => { setAddError(null); setIsAddUserOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add User Account
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Left Column: User Accounts List */}
        <div className="bg-card border border-border rounded-xs p-4 flex flex-col shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              User Accounts ({users.length})
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 text-xs pr-1">
            {users.map((u) => {
              const isRootAdmin = u.id === 1 && u.username === 'sysadmin';
              return (
                <div
                  key={u.id}
                  className="p-3 bg-muted/20 border border-border rounded-xs flex flex-col gap-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground flex items-center space-x-2">
                        <span>{u.name}</span>
                        <Badge
                          variant={u.role === 'SYSTEM_ADMIN' ? 'gold' : 'outline'}
                          className="text-[10px]"
                        >
                          {u.role === 'SYSTEM_ADMIN' ? 'System Admin' : 'Operator'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">@{u.username}</div>
                    </div>

                    <div>
                      {u.is_active ? (
                        <span className="text-success font-bold text-xs flex items-center">
                          <Check className="w-3 h-3 mr-0.5" /> Active
                        </span>
                      ) : (
                        <span className="text-destructive font-bold text-xs">Disabled</span>
                      )}
                    </div>
                  </div>

                  {/* Account Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="text-primary hover:underline font-medium cursor-pointer flex items-center space-x-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Credentials &amp; Password</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {!isRootAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center"
                            title={u.is_active ? 'Disable account' : 'Enable account'}
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5 text-success" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permission Matrix */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xs p-4 flex flex-col shadow-xs overflow-hidden">
          {/* Role Tabs & Preset Buttons Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border mb-3 shrink-0">
            <div className="inline-flex items-center rounded-xs bg-muted/40 overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setSelectedRole('OPERATOR')}
                className={`h-7 px-3 text-xs border border-r-0 font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                  selectedRole === 'OPERATOR'
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs border-primary hover:bg-primary/90 hover:text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border'
                }`}
              >
                Operator
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('SYSTEM_ADMIN')}
                className={`h-7 px-3 text-xs border border-l-0 font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                  selectedRole === 'SYSTEM_ADMIN'
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs border-primary hover:bg-primary/90 hover:text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border'
                }`}
              >
                System Admin
              </button>
            </div>

            {/* Presets Bar for Operator */}
            {selectedRole === 'OPERATOR' && (
              <div className="flex items-center space-x-1.5 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('standard')}
                  className="h-7 text-[11px] px-2"
                >
                  <SlidersHorizontal className="w-3 h-3 mr-1 text-primary" /> POS Standard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('all')}
                  className="h-7 text-[11px] px-2"
                >
                  <CheckCheck className="w-3 h-3 mr-1 text-success" /> Grant All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('readonly')}
                  className="h-7 text-[11px] px-2"
                >
                  Read Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('none')}
                  className="h-7 text-[11px] px-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="w-3 h-3 mr-1" /> Revoke
                </Button>
              </div>
            )}
          </div>

          {/* Permissions Table */}
          <div className="flex-1 overflow-auto border border-border rounded-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5">Capability / Module</th>
                  <th className="px-3 py-2.5 text-center">Create</th>
                  <th className="px-3 py-2.5 text-center">Read</th>
                  <th className="px-3 py-2.5 text-center">Update</th>
                  <th className="px-3 py-2.5 text-center">Delete</th>
                  {selectedRole === 'OPERATOR' && (
                    <th className="px-3 py-2.5 text-center w-16">Quick</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MODULES.map((mod) => {
                  const perm = roleFilteredPermissions.find((p) => p.module === mod.id);
                  const isSysAdmin = selectedRole === 'SYSTEM_ADMIN';
                  const canCreate = isSysAdmin ? true : Boolean(perm?.can_create);
                  const canRead = isSysAdmin ? true : Boolean(perm?.can_read);
                  const canUpdate = isSysAdmin ? true : Boolean(perm?.can_update);
                  const canDelete = isSysAdmin ? true : Boolean(perm?.can_delete);

                  return (
                    <tr key={mod.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-foreground">{mod.name}</div>
                        <div className="text-[11px] text-muted-foreground">{mod.desc}</div>
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={isSysAdmin}
                          checked={canCreate}
                          onChange={() => perm && handleTogglePermission(perm.id, 'can_create')}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer accent-primary disabled:opacity-75"
                        />
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={isSysAdmin}
                          checked={canRead}
                          onChange={() => perm && handleTogglePermission(perm.id, 'can_read')}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer accent-primary disabled:opacity-75"
                        />
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={isSysAdmin}
                          checked={canUpdate}
                          onChange={() => perm && handleTogglePermission(perm.id, 'can_update')}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer accent-primary disabled:opacity-75"
                        />
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={isSysAdmin}
                          checked={canDelete}
                          onChange={() => perm && handleTogglePermission(perm.id, 'can_delete')}
                          className="rounded-xs text-primary h-4 w-4 cursor-pointer accent-primary disabled:opacity-75"
                        />
                      </td>

                      {selectedRole === 'OPERATOR' && (
                        <td className="px-3 py-2.5 text-center">
                          {perm && (
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAll(perm.id)}
                              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                              title="Toggle all for this module"
                            >
                              Toggle
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Create New User Account"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          {addError && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xs text-destructive text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Username *</label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. counter_operator"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Full Name *</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Password *</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter account password"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Role *</label>
            <Select
              value={newRole}
              onValueChange={(val) => setNewRole(val as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATOR">Operator</SelectItem>
                <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleAddUser} className="font-bold">
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal (Super Admin Full Read/Write Credentials) */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={`Edit Account Credentials`}
        description={editingUser ? `Manage username, name, password, and role for @${editingUser.username}` : ''}
        maxWidth="sm"
      >
        {editingUser && (
          <div className="space-y-3 text-xs">
            {editError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xs text-destructive text-xs flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Username *</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>New Password</span>
                <span className="text-[10px] text-muted-foreground font-normal">Leave blank to keep existing</span>
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (optional)"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Role</label>
                <Select
                  value={editRole}
                  onValueChange={(val) => setEditRole(val as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATOR">Operator</SelectItem>
                    <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <Select
                  value={editIsActive ? 'active' : 'disabled'}
                  onValueChange={(val) => setEditIsActive(val === 'active')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSaveEditUser} className="font-bold">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
