import React, { useState, useEffect } from 'react';
import { Show, Movie, Screen } from '@/types';
import { showService, movieService, screenService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Plus, Trash2, Pencil, Clock } from 'lucide-react';
import { formatDateIndian } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

export const ShowTimingMasterPage: React.FC = () => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canCreate = isSystemAdmin || hasPermission('shows', 'can_create');
  const canUpdate = isSystemAdmin || hasPermission('shows', 'can_update');
  const canDelete = isSystemAdmin || hasPermission('shows', 'can_delete');

  const [shows, setShows] = useState<Show[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Partial<Show> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const sList = await showService.getShows({ activeOnly: true });
      const mList = await movieService.getMovies();
      const scList = await screenService.getScreens();

      setShows(sList);
      setMovies(mList);
      setScreens(scList);
    } catch (e) {
      console.error('Failed to fetch show timing data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = async () => {
    // Ensure movies and screens are loaded before opening modal
    let mList = movies;
    let scList = screens;
    if (mList.length === 0 || scList.length === 0) {
      try {
        const [m, sc] = await Promise.all([
          movieService.getMovies(),
          screenService.getScreens(),
        ]);
        mList = m;
        scList = sc;
        setMovies(m);
        setScreens(sc);
      } catch (e) {
        console.error('Failed to load reference data', e);
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    setEditingShow({
      show_name: 'Evening Show',
      start_time: '06:30 PM',
      show_date: today,
      duration_min: 150,
      movie_id: mList[0]?.id || 1,
      screen_id: scList[0]?.id || 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (show: Show) => {
    setEditingShow({ ...show });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingShow) return;

    if (!editingShow.show_name || !editingShow.start_time || !editingShow.movie_id || !editingShow.screen_id) {
      alert('Please fill all mandatory fields (Show Name, Start Time, Movie, Screen).');
      return;
    }

    await showService.saveShow(editingShow);
    setIsModalOpen(false);
    await fetchData();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate this show timing?')) {
      await showService.deleteShow(id);
      await fetchData();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Show Timings &amp; Schedules
          </span>
        </div>

        <div className="flex items-center space-x-2">

          {canCreate && (
            <Button variant="default" size="sm" onClick={handleOpenCreate} disabled={isLoading}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Schedule New Show
            </Button>
          )}
        </div>
      </div>

      {/* Shows Table */}
      <div className="flex-1 bg-card border border-border rounded-xs overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5">Show Name</th>
                <th className="px-3 py-2.5">Start Time</th>
                <th className="px-3 py-2.5">Movie Scheduled</th>
                <th className="px-3 py-2.5">Screen / Hall</th>
                <th className="px-3 py-2.5 text-center">Duration</th>
                <th className="px-3 py-2.5">Show Date</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                {(canUpdate || canDelete) && <th className="px-3 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-xs text-muted-foreground">
                    No shows scheduled. Click <strong>Schedule New Show</strong> to add one.
                  </td>
                </tr>
              )}
              {shows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-foreground">
                    {s.show_name}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-primary">{s.start_time}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {s.movie_name} {s.movie_type_name && `(${s.movie_type_name})`}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium">{s.screen_name}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-muted-foreground">{s.duration_min} min</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium">{s.show_date}</td>
                  <td className="px-3 py-2.5 text-center">
                    {s.is_active ? (
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-3 py-2.5 text-right space-x-1">
                      {canUpdate && (
                        <Button variant="outline" size="xs" onClick={() => handleOpenEdit(s)}>
                          <Pencil className="w-3 h-3 mr-0.5" /> Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(s.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingShow?.id ? 'Edit Show Timing' : 'Schedule New Show Timing'}
        description="Attach movie, screen, and showtime for ticketing box office"
        maxWidth="lg"
      >
        {editingShow && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Show Name *</label>
                <Input
                  value={editingShow.show_name || ''}
                  onChange={(e) => setEditingShow({ ...editingShow, show_name: e.target.value })}
                  placeholder="e.g. Morning, Matinee, Evening, Night"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Start Time *</label>
                <TimePicker
                  value={editingShow.start_time || '06:30 PM'}
                  onChange={(timeStr) => setEditingShow({ ...editingShow, start_time: timeStr })}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-foreground">Movie *</label>
                <Select
                  value={String(editingShow.movie_id || '')}
                  onValueChange={(val) => setEditingShow({ ...editingShow, movie_id: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select movie" />
                  </SelectTrigger>
                  <SelectContent>
                    {movies.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Screen / Audi *</label>
                <Select
                  value={String(editingShow.screen_id || '')}
                  onValueChange={(val) => setEditingShow({ ...editingShow, screen_id: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select screen" />
                  </SelectTrigger>
                  <SelectContent>
                    {screens.map((sc) => (
                      <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Show Date *</label>
                <DatePicker
                  value={editingShow.show_date || ''}
                  onChange={(dateStr) => setEditingShow({ ...editingShow, show_date: dateStr })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave} className="font-bold">
                Save Show Timing
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
