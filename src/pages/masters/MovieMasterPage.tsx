import React, { useState, useEffect } from 'react';
import { Movie, Distributor, Language, MovieType, MovieCategory } from '@/types';
import { movieService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Film, Plus, Trash2, Pencil } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { getLocalDateString } from '@/lib/utils';

export const MovieMasterPage: React.FC = () => {
  const { hasPermission, user } = useAuthStore();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canCreate = isSystemAdmin || hasPermission('movies', 'can_create');
  const canUpdate = isSystemAdmin || hasPermission('movies', 'can_update');
  const canDelete = isSystemAdmin || hasPermission('movies', 'can_delete');

  const [movies, setMovies] = useState<Movie[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [movieTypes, setMovieTypes] = useState<MovieType[]>([]);
  const [categories, setCategories] = useState<MovieCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Partial<Movie> | null>(null);

  // Quick-Add Sub-Modal State
  const [quickAddType, setQuickAddType] = useState<'distributor' | 'language' | 'movie_type' | 'category' | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddContact, setQuickAddContact] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [quickAddError, setQuickAddError] = useState('');
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const mList = await movieService.getMovies();
      const dList = await movieService.getDistributors();
      const lList = await movieService.getLanguages();
      const mtList = await movieService.getMovieTypes();
      const cList = await movieService.getCategories();

      setMovies(mList);
      setDistributors(dList);
      setLanguages(lList);
      setMovieTypes(mtList);
      setCategories(cList as any);
    } catch (e) {
      console.error('Failed to fetch movies data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    const today = getLocalDateString();
    setEditingMovie({
      name: '',
      distributor_id: distributors[0]?.id || 1,
      language_id: languages[0]?.id || 1,
      movie_type_id: movieTypes[0]?.id || 1,
      category_id: categories[0]?.id || 1,
      duration_min: 145,
      rating: '4.5',
      star_cast: '',
      start_date: today,
      end_date: '2099-12-31',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (movie: Movie) => {
    setEditingMovie({ ...movie });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingMovie) return;

    if (!editingMovie.name || !editingMovie.distributor_id || !editingMovie.language_id) {
      alert('Please fill mandatory fields (Movie Title, Distributor, Language).');
      return;
    }

    await movieService.saveMovie(editingMovie);
    setIsModalOpen(false);
    setEditingMovie(null);
    await fetchData();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate/delete this movie?')) {
      await movieService.deleteMovie(id);
      await fetchData();
    }
  };

  // Quick-Add Handlers
  const handleOpenQuickAdd = (type: 'distributor' | 'language' | 'movie_type' | 'category') => {
    setQuickAddType(type);
    setQuickAddName('');
    setQuickAddContact('');
    setQuickAddPhone('');
    setQuickAddError('');
  };

  const handleCloseQuickAdd = () => {
    setQuickAddType(null);
    setQuickAddName('');
    setQuickAddContact('');
    setQuickAddPhone('');
    setQuickAddError('');
  };

  const handleSaveQuickAdd = async () => {
    const cleanName = quickAddName.trim();
    if (!cleanName) {
      setQuickAddError('Name is required.');
      return;
    }

    setIsSubmittingQuickAdd(true);
    setQuickAddError('');
    try {
      if (quickAddType === 'distributor') {
        await movieService.saveDistributor({
          name: cleanName,
          contact_person: quickAddContact.trim() || undefined,
          phone: quickAddPhone.trim() || undefined,
          is_active: true,
        });
        const dList = await movieService.getDistributors();
        setDistributors(dList);
        const created = dList.find((d) => d.name.toLowerCase() === cleanName.toLowerCase());
        if (created) {
          setEditingMovie((prev) => (prev ? { ...prev, distributor_id: created.id } : prev));
        }
      } else if (quickAddType === 'language') {
        await movieService.saveLanguage({
          name: cleanName,
          is_active: true,
        });
        const lList = await movieService.getLanguages();
        setLanguages(lList);
        const created = lList.find((l) => l.name.toLowerCase() === cleanName.toLowerCase());
        if (created) {
          setEditingMovie((prev) => (prev ? { ...prev, language_id: created.id } : prev));
        }
      } else if (quickAddType === 'movie_type') {
        await movieService.saveMovieType({
          name: cleanName,
          is_active: true,
        });
        const mtList = await movieService.getMovieTypes();
        setMovieTypes(mtList);
        const created = mtList.find((mt) => mt.name.toLowerCase() === cleanName.toLowerCase());
        if (created) {
          setEditingMovie((prev) => (prev ? { ...prev, movie_type_id: created.id } : prev));
        }
      } else if (quickAddType === 'category') {
        await movieService.saveCategory({
          name: cleanName,
          is_active: true,
        });
        const cList = await movieService.getCategories();
        setCategories(cList as any);
        const created = cList.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
        if (created) {
          setEditingMovie((prev) => (prev ? { ...prev, category_id: created.id } : prev));
        }
      }
      handleCloseQuickAdd();
    } catch (err: any) {
      console.error('Failed to quick add lookup item:', err);
      setQuickAddError(err?.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4 bg-muted/40 select-none">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-xs p-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2">
          <Film className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Movie Catalog &amp; Management
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {canCreate && (
            <Button variant="default" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Movie
            </Button>
          )}
        </div>
      </div>

      {/* Movies Table */}
      <div className="flex-1 bg-card border border-border rounded-xs overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5">Movie Title</th>
                <th className="px-3 py-2.5">Distributor</th>
                <th className="px-3 py-2.5">Language</th>
                <th className="px-3 py-2.5">Format</th>
                <th className="px-3 py-2.5">Censor Rating</th>
                <th className="px-3 py-2.5 text-center">Duration</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                {(canUpdate || canDelete) && <th className="px-3 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movies.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-foreground">
                    <div className="flex items-center space-x-2">
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium">{m.distributor_name || '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium">{m.language_name || '—'}</td>
                  <td className="px-3 py-2.5">
                    {m.movie_type_name ? (
                      <Badge variant="blue" className="text-[10px]">
                        {m.movie_type_name}
                      </Badge>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-foreground">{m.category_name || '—'}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground font-medium">{m.duration_min} min</td>
                  <td className="px-3 py-2.5 text-center">
                    {m.is_active ? (
                      <Badge variant="success" className="text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-3 py-2.5 text-right space-x-1">
                      {canUpdate && (
                        <Button variant="outline" size="xs" onClick={() => handleOpenEdit(m)}>
                          <Pencil className="w-3 h-3 mr-0.5" /> Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(m.id)}
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

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMovie?.id ? 'Edit Movie' : 'Add New Movie'}
        description="Configure movie titles, formats, distributors, schedules and tax configurations"
        maxWidth="3xl"
      >
        {editingMovie && (
          <div className="space-y-4 text-xs">
            {/* Top Section */}
            <div className="space-y-3 bg-muted/30 p-3 rounded-xs border border-border">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Movie Title *</label>
                <Input
                  value={editingMovie.name || ''}
                  onChange={(e) => setEditingMovie({ ...editingMovie, name: e.target.value })}
                  placeholder="e.g. Spider-Man : Brand New Day 3D"
                  className="font-medium"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Distributor *</label>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickAdd('distributor')}
                    className="text-2xs text-primary hover:underline font-bold flex items-center cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-0.5" /> Add New
                  </button>
                </div>
                <Select
                  value={String(editingMovie.distributor_id || '')}
                  onValueChange={(val) => setEditingMovie({ ...editingMovie, distributor_id: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">Start Date *</label>
                  <DatePicker
                    value={editingMovie.start_date || ''}
                    onChange={(dateStr) => setEditingMovie({ ...editingMovie, start_date: dateStr })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">Run</label>
                  <Input
                    type="number"
                    value={editingMovie.run || 1}
                    onChange={(e) => setEditingMovie({ ...editingMovie, run: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">End Date *</label>
                  <DatePicker
                    value={editingMovie.end_date || ''}
                    onChange={(dateStr) => setEditingMovie({ ...editingMovie, end_date: dateStr })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">Week</label>
                  <Input
                    type="number"
                    value={editingMovie.week || 1}
                    onChange={(e) => setEditingMovie({ ...editingMovie, week: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Middle Details Box */}
            <div className="space-y-3 bg-muted/30 p-3 rounded-xs border border-border">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Star Cast</label>
                <Input
                  value={editingMovie.star_cast || ''}
                  onChange={(e) => setEditingMovie({ ...editingMovie, star_cast: e.target.value })}
                  placeholder="e.g. Tom Holland, Zendaya"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">Rating / Censor</label>
                  <Input
                    value={editingMovie.rating || ''}
                    onChange={(e) => setEditingMovie({ ...editingMovie, rating: e.target.value })}
                    placeholder="e.g. UA or 4.8/5"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-2xs font-bold text-muted-foreground uppercase">Movie Type *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd('movie_type')}
                      className="text-3xs text-primary hover:underline font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" /> Add
                    </button>
                  </div>
                  <Select
                    value={String(editingMovie.movie_type_id || '')}
                    onValueChange={(val) => setEditingMovie({ ...editingMovie, movie_type_id: Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {movieTypes.map((mt) => (
                        <SelectItem key={mt.id} value={String(mt.id)}>{mt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-2xs font-bold text-muted-foreground uppercase">Language *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd('language')}
                      className="text-3xs text-primary hover:underline font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" /> Add
                    </button>
                  </div>
                  <Select
                    value={String(editingMovie.language_id || '')}
                    onValueChange={(val) => setEditingMovie({ ...editingMovie, language_id: Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">Length in min *</label>
                  <Input
                    type="number"
                    value={editingMovie.duration_min || 120}
                    onChange={(e) => setEditingMovie({ ...editingMovie, duration_min: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-2xs font-bold text-muted-foreground uppercase">Category *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd('category')}
                      className="text-3xs text-primary hover:underline font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" /> Add
                    </button>
                  </div>
                  <Select
                    value={String(editingMovie.category_id || '')}
                    onValueChange={(val) => setEditingMovie({ ...editingMovie, category_id: Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">No of Shows</label>
                  <Input
                    type="number"
                    value={editingMovie.no_of_shows || 0}
                    onChange={(e) => setEditingMovie({ ...editingMovie, no_of_shows: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Dynamic Tax Configuration Section */}
            <div className="space-y-3 bg-muted/40 p-3 rounded-xs border border-border">
              <div className="font-bold text-xs text-foreground uppercase tracking-wider">
                Dynamic Tax & Surcharge Rules
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">I.N.R. Tax %</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingMovie.inr_tax_pct || 0}
                    onChange={(e) => setEditingMovie({ ...editingMovie, inr_tax_pct: Number(e.target.value) })}
                    placeholder="00.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">M.S. Tax %</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingMovie.ms_tax_pct || 0}
                    onChange={(e) => setEditingMovie({ ...editingMovie, ms_tax_pct: Number(e.target.value) })}
                    placeholder="00.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground uppercase">Tax Loss %</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingMovie.tax_loss_pct || 0}
                    onChange={(e) => setEditingMovie({ ...editingMovie, tax_loss_pct: Number(e.target.value) })}
                    placeholder="00.00"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingMovie.is_tax_free)}
                    onChange={(e) => setEditingMovie({ ...editingMovie, is_tax_free: e.target.checked })}
                    className="rounded-xs text-primary"
                  />
                  <span>Tax Free</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingMovie.rebate_cgst)}
                    onChange={(e) => setEditingMovie({ ...editingMovie, rebate_cgst: e.target.checked })}
                    className="rounded-xs text-primary"
                  />
                  <span>Rebate CGST</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingMovie.rebate_sgst)}
                    onChange={(e) => setEditingMovie({ ...editingMovie, rebate_sgst: e.target.checked })}
                    className="rounded-xs text-primary"
                  />
                  <span>Rebate SGST</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave} className="font-bold bg-primary text-primary-foreground">
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick-Add Sub-Modal */}
      <Modal
        isOpen={Boolean(quickAddType)}
        onClose={handleCloseQuickAdd}
        title={
          quickAddType === 'distributor'
            ? 'Add New Distributor'
            : quickAddType === 'language'
            ? 'Add New Language'
            : quickAddType === 'movie_type'
            ? 'Add New Movie Format / Type'
            : quickAddType === 'category'
            ? 'Add New Censor Rating / Category'
            : 'Add Master Item'
        }
        description={
          quickAddType === 'distributor'
            ? 'Add a film distributor or production agency'
            : quickAddType === 'language'
            ? 'Add a language for audio tracks / subtitles'
            : quickAddType === 'movie_type'
            ? 'Add presentation format (e.g. 2D, 3D, IMAX, 4DX)'
            : 'Add censor classification (e.g. U, UA, A, S)'
        }
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          {quickAddError && (
            <div className="p-2.5 rounded-xs bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
              {quickAddError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {quickAddType === 'distributor'
                ? 'Distributor Name *'
                : quickAddType === 'language'
                ? 'Language Name *'
                : quickAddType === 'movie_type'
                ? 'Format / Type Name (e.g. IMAX 3D) *'
                : 'Rating / Category Name (e.g. UA 16+) *'}
            </label>
            <Input
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              placeholder={
                quickAddType === 'distributor'
                  ? 'e.g. Warner Bros Pictures, Yash Raj Films'
                  : quickAddType === 'language'
                  ? 'e.g. Hindi, English, Tamil, Telugu'
                  : quickAddType === 'movie_type'
                  ? 'e.g. 2D, 3D, IMAX 3D, 4DX'
                  : 'e.g. U, UA 13+, A'
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveQuickAdd();
                }
              }}
            />
          </div>

          {quickAddType === 'distributor' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Contact Person (Optional)</label>
                <Input
                  value={quickAddContact}
                  onChange={(e) => setQuickAddContact(e.target.value)}
                  placeholder="e.g. Regional Manager / Booking Agent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Phone / Mobile (Optional)</label>
                <Input
                  value={quickAddPhone}
                  onChange={(e) => setQuickAddPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseQuickAdd}
              disabled={isSubmittingQuickAdd}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveQuickAdd}
              disabled={isSubmittingQuickAdd}
              className="font-bold bg-primary text-primary-foreground"
            >
              {isSubmittingQuickAdd ? 'Saving...' : 'Add & Select'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default MovieMasterPage;
