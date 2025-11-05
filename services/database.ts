import * as SQLite from 'expo-sqlite';

// Mở database
const db = SQLite.openDatabaseSync('travelApp.db');

// Interface cho cache metadata
export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// Khởi tạo database schema
export const initDatabase = async () => {
  try {
    // Tạo bảng tours cache
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tours_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 300000
      );
    `);

    // Tạo bảng bookings cache
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookings_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 60000
      );
    `);

    // Tạo bảng notifications cache
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 30000
      );
    `);

    // Tạo bảng generic cache cho các queries khác
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS generic_cache (
        cache_key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 300000
      );
    `);

    // Tạo index để query nhanh hơn
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_tours_timestamp ON tours_cache(timestamp);
      CREATE INDEX IF NOT EXISTS idx_bookings_timestamp ON bookings_cache(timestamp);
      CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications_cache(timestamp);
      CREATE INDEX IF NOT EXISTS idx_generic_timestamp ON generic_cache(timestamp);
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Helper functions cho CRUD operations
export const CacheDB = {
  // Lưu dữ liệu vào cache
  async set(
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
    key: string,
    data: any,
    ttl: number = 300000 // Default 5 phút
  ): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      const timestamp = Date.now();

      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (${table === 'generic_cache' ? 'cache_key' : 'id'}, data, timestamp, ttl) VALUES (?, ?, ?, ?)`,
        [key, jsonData, timestamp, ttl]
      );
    } catch (error) {
      console.error(`Error setting cache in ${table}:`, error);
      throw error;
    }
  },

  async get<T>(
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
    key: string
  ): Promise<{ data: T; isStale: boolean } | null> {
    try {
      const keyColumn = table === 'generic_cache' ? 'cache_key' : 'id';
      const result = await db.getFirstAsync<{ data: string; timestamp: number; ttl: number }>(
        `SELECT data, timestamp, ttl FROM ${table} WHERE ${keyColumn} = ?`,
        [key]
      );

      if (!result) {
        return null;
      }

      const now = Date.now();
      const age = now - result.timestamp;
      const isStale = age > result.ttl;

      return {
        data: JSON.parse(result.data) as T,
        isStale,
      };
    } catch (error) {
      console.error(`Error getting cache from ${table}:`, error);
      return null;
    }
  },

  // Xóa một item khỏi cache
  async delete(
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
    key: string
  ): Promise<void> {
    try {
      const keyColumn = table === 'generic_cache' ? 'cache_key' : 'id';
      await db.runAsync(`DELETE FROM ${table} WHERE ${keyColumn} = ?`, [key]);
    } catch (error) {
      console.error(`Error deleting cache from ${table}:`, error);
    }
  },

  // Xóa tất cả dữ liệu stale trong một bảng
  async clearStale(
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache'
  ): Promise<void> {
    try {
      const now = Date.now();
      await db.runAsync(`DELETE FROM ${table} WHERE (${now} - timestamp) > ttl * 2`);
    } catch (error) {
      console.error(`Error clearing stale cache from ${table}:`, error);
    }
  },

  // Xóa toàn bộ cache trong một bảng
  async clear(
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache'
  ): Promise<void> {
    try {
      await db.runAsync(`DELETE FROM ${table}`);
    } catch (error) {
      console.error(`Error clearing cache from ${table}:`, error);
    }
  },

  // Xóa toàn bộ database (sử dụng khi logout hoặc reset app)
  async clearAll(): Promise<void> {
    try {
      await db.runAsync('DELETE FROM tours_cache');
      await db.runAsync('DELETE FROM bookings_cache');
      await db.runAsync('DELETE FROM notifications_cache');
      await db.runAsync('DELETE FROM generic_cache');
      console.log('✅ All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  },
};

export default db;
