import { dbService } from '@/db/sqlite-service';
import { Movie, Language, MovieType, Category, Distributor } from '@/types';
import { getLocalDateString } from '@/lib/utils';

export const movieService = {
  async getMovies(activeOnly = true): Promise<Movie[]> {
    await dbService.init();
    const sql = `
      SELECT m.*, 
             l.name as language_name, 
             mt.name as movie_type_name, 
             c.name as category_name, 
             d.name as distributor_name
      FROM movies m
      LEFT JOIN languages l ON m.language_id = l.id
      LEFT JOIN movie_types mt ON m.movie_type_id = mt.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN distributors d ON m.distributor_id = d.id
      ${activeOnly ? 'WHERE m.is_active = 1' : ''}
      ORDER BY m.name ASC
    `;
    return dbService.query<Movie>(sql);
  },

  async getMovieById(id: number): Promise<Movie | null> {
    await dbService.init();
    const sql = `
      SELECT m.*, 
             l.name as language_name, 
             mt.name as movie_type_name, 
             c.name as category_name, 
             d.name as distributor_name
      FROM movies m
      LEFT JOIN languages l ON m.language_id = l.id
      LEFT JOIN movie_types mt ON m.movie_type_id = mt.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN distributors d ON m.distributor_id = d.id
      WHERE m.id = ?
    `;
    return dbService.queryOne<Movie>(sql, [id]);
  },

  async saveMovie(movie: Partial<Movie>): Promise<void> {
    await dbService.init();
    const today = getLocalDateString();
    if (movie.id) {
      dbService.run(
        `UPDATE movies 
         SET name = ?, language_id = ?, movie_type_id = ?, category_id = ?, distributor_id = ?, 
             duration_min = ?, rating = ?, star_cast = ?, start_date = ?, end_date = ?,
             run = ?, week = ?, no_of_shows = ?, inr_tax_pct = ?, ms_tax_pct = ?,
             is_tax_free = ?, tax_loss_pct = ?, rebate_cgst = ?, rebate_sgst = ?, is_active = ? 
         WHERE id = ?`,
        [
          movie.name,
          movie.language_id,
          movie.movie_type_id || 1,
          movie.category_id || 1,
          movie.distributor_id,
          movie.duration_min || 120,
          movie.rating || '',
          movie.star_cast || '',
          movie.start_date || today,
          movie.end_date || '2099-12-31',
          movie.run || 1,
          movie.week || 1,
          movie.no_of_shows || 0,
          movie.inr_tax_pct || 0,
          movie.ms_tax_pct || 0,
          movie.is_tax_free ? 1 : 0,
          movie.tax_loss_pct || 0,
          movie.rebate_cgst ? 1 : 0,
          movie.rebate_sgst ? 1 : 0,
          movie.is_active ? 1 : 0,
          movie.id,
        ]
      );
    } else {
      dbService.run(
        `INSERT INTO movies (name, language_id, movie_type_id, category_id, distributor_id, duration_min, rating, star_cast, start_date, end_date, run, week, no_of_shows, inr_tax_pct, ms_tax_pct, is_tax_free, tax_loss_pct, rebate_cgst, rebate_sgst, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          movie.name,
          movie.language_id,
          movie.movie_type_id || 1,
          movie.category_id || 1,
          movie.distributor_id,
          movie.duration_min || 120,
          movie.rating || '',
          movie.star_cast || '',
          movie.start_date || today,
          movie.end_date || '2099-12-31',
          movie.run || 1,
          movie.week || 1,
          movie.no_of_shows || 0,
          movie.inr_tax_pct || 0,
          movie.ms_tax_pct || 0,
          movie.is_tax_free ? 1 : 0,
          movie.tax_loss_pct || 0,
          movie.rebate_cgst ? 1 : 0,
          movie.rebate_sgst ? 1 : 0,
        ]
      );
    }
  },

  async deleteMovie(id: number): Promise<void> {
    await dbService.init();
    dbService.run("UPDATE movies SET is_active = 0 WHERE id = ?", [id]);
  },

  // Lookup Masters
  async getLanguages(): Promise<Language[]> {
    await dbService.init();
    return dbService.query<Language>("SELECT * FROM languages WHERE is_active = 1 ORDER BY name ASC");
  },

  async getAllLanguages(): Promise<Language[]> {
    await dbService.init();
    return dbService.query<Language>("SELECT * FROM languages ORDER BY id ASC");
  },

  async saveLanguage(lang: Partial<Language>): Promise<void> {
    await dbService.init();
    if (lang.id) {
      dbService.run("UPDATE languages SET name = ?, is_active = ? WHERE id = ?", [lang.name, lang.is_active ? 1 : 0, lang.id]);
    } else {
      dbService.run("INSERT INTO languages (name, is_active) VALUES (?, 1)", [lang.name]);
    }
  },

  async getMovieTypes(): Promise<MovieType[]> {
    await dbService.init();
    return dbService.query<MovieType>("SELECT * FROM movie_types WHERE is_active = 1 ORDER BY name ASC");
  },

  async getAllMovieTypes(): Promise<MovieType[]> {
    await dbService.init();
    return dbService.query<MovieType>("SELECT * FROM movie_types ORDER BY id ASC");
  },

  async saveMovieType(mt: Partial<MovieType>): Promise<void> {
    await dbService.init();
    if (mt.id) {
      dbService.run("UPDATE movie_types SET name = ?, is_active = ? WHERE id = ?", [mt.name, mt.is_active ? 1 : 0, mt.id]);
    } else {
      dbService.run("INSERT INTO movie_types (name, is_active) VALUES (?, 1)", [mt.name]);
    }
  },

  async getCategories(): Promise<Category[]> {
    await dbService.init();
    return dbService.query<Category>("SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC");
  },

  async getAllCategories(): Promise<Category[]> {
    await dbService.init();
    return dbService.query<Category>("SELECT * FROM categories ORDER BY id ASC");
  },

  async saveCategory(cat: Partial<Category>): Promise<void> {
    await dbService.init();
    if (cat.id) {
      dbService.run("UPDATE categories SET name = ?, is_active = ? WHERE id = ?", [cat.name, cat.is_active ? 1 : 0, cat.id]);
    } else {
      dbService.run("INSERT INTO categories (name, is_active) VALUES (?, 1)", [cat.name]);
    }
  },

  async getDistributors(): Promise<Distributor[]> {
    await dbService.init();
    return dbService.query<Distributor>("SELECT * FROM distributors WHERE is_active = 1 ORDER BY name ASC");
  },

  async getAllDistributors(): Promise<Distributor[]> {
    await dbService.init();
    return dbService.query<Distributor>("SELECT * FROM distributors ORDER BY id ASC");
  },

  async saveDistributor(dist: Partial<Distributor>): Promise<void> {
    await dbService.init();
    if (dist.id) {
      dbService.run(
        "UPDATE distributors SET name = ?, contact_person = ?, phone = ?, is_active = ? WHERE id = ?",
        [dist.name, dist.contact_person || '', dist.phone || '', dist.is_active ? 1 : 0, dist.id]
      );
    } else {
      dbService.run(
        "INSERT INTO distributors (name, contact_person, phone, is_active) VALUES (?, ?, ?, 1)",
        [dist.name, dist.contact_person || '', dist.phone || '']
      );
    }
  },
};
