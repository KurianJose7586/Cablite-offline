import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export interface POI {
    id: number;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    rank: number;
    distance?: number;
}

interface SearchState {
    isInitializing: boolean;
    availableShards: string[];
    searchResults: POI[];
    searchQuery: string;
    
    initialize: () => Promise<void>;
    search: (query: string, userLat?: number, userLng?: number) => Promise<void>;
    downloadShard: (cityName: string) => Promise<void>;
    setQuery: (query: string) => void;
}

const DB_NAME = 'vital_tier.db';

export const useSearchStore = create<SearchState>((set, get) => ({
    isInitializing: false,
    availableShards: [],
    searchResults: [],
    searchQuery: '',

    initialize: async () => {
        set({ isInitializing: true });
        try {
            const dbDir = `${FileSystem.documentDirectory}SQLite/`;
            const dbPath = `${dbDir}${DB_NAME}`;

            const dirInfo = await FileSystem.getInfoAsync(dbDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
            }

            // For now, check if the DB exists, if not, we'll create a mock one for testing
            // In a real app, this would be downloaded from a CDN
            const fileInfo = await FileSystem.getInfoAsync(dbPath);
            if (!fileInfo.exists) {
                console.log('Creating initial mock vital database...');
                const db = await SQLite.openDatabaseAsync(DB_NAME);
                
                await db.execAsync(`
                    PRAGMA journal_mode = WAL;
                    CREATE TABLE IF NOT EXISTS pois (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        category TEXT,
                        latitude REAL NOT NULL,
                        longitude REAL NOT NULL,
                        rank INTEGER DEFAULT 0
                    );
                    CREATE VIRTUAL TABLE IF NOT EXISTS pois_fts USING fts5(
                        name,
                        content='pois',
                        content_rowid='id'
                    );
                `);

                // Insert some mock Vital Tier data (Delhi example)
                await db.runAsync('INSERT INTO pois (name, category, latitude, longitude, rank) VALUES (?, ?, ?, ?, ?)', 
                    ['Indira Gandhi International Airport', 'airport', 28.5562, 77.1000, 100]);
                await db.runAsync('INSERT INTO pois (name, category, latitude, longitude, rank) VALUES (?, ?, ?, ?, ?)', 
                    ['AIIMS Hospital', 'hospital', 28.5672, 77.2100, 95]);
                await db.runAsync('INSERT INTO pois (name, category, latitude, longitude, rank) VALUES (?, ?, ?, ?, ?)', 
                    ['New Delhi Railway Station', 'transport', 28.6417, 77.2219, 90]);
                await db.runAsync('INSERT INTO pois (name, category, latitude, longitude, rank) VALUES (?, ?, ?, ?, ?)', 
                    ['DLF Promenade Mall', 'shopping', 28.5441, 77.1557, 80]);
                await db.runAsync('INSERT INTO pois (name, category, latitude, longitude, rank) VALUES (?, ?, ?, ?, ?)', 
                    ['Safdarjung Hospital', 'hospital', 28.5672, 77.2084, 85]);

                // Update FTS index
                await db.execAsync(`
                    INSERT INTO pois_fts(rowid, name) SELECT id, name FROM pois;
                `);
            }
            
            set({ availableShards: [DB_NAME] });
        } catch (error) {
            console.error('Failed to initialize search store:', error);
        } finally {
            set({ isInitializing: false });
        }
    },

    setQuery: (query) => set({ searchQuery: query }),

    search: async (query, userLat, userLng) => {
        if (!query || query.length < 2) {
            set({ searchResults: [] });
            return;
        }

        try {
            const db = await SQLite.openDatabaseAsync(DB_NAME);
            
            // Search using FTS5 for speed and fuzzy-like matching
            const results = await db.getAllAsync<any>(`
                SELECT p.* 
                FROM pois p
                JOIN pois_fts f ON p.id = f.rowid
                WHERE f.name MATCH ?
                ORDER BY p.rank DESC
                LIMIT 10
            `, [`${query}*`]);

            const formattedResults: POI[] = results.map(row => ({
                id: row.id,
                name: row.name,
                category: row.category,
                latitude: row.latitude,
                longitude: row.longitude,
                rank: row.rank
            }));

            // Simple distance sorting if user location is available
            if (userLat && userLng) {
                formattedResults.forEach(poi => {
                    const d = Math.sqrt(
                        Math.pow(poi.latitude - userLat, 2) + 
                        Math.pow(poi.longitude - userLng, 2)
                    );
                    poi.distance = d;
                });
                formattedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            }

            set({ searchResults: formattedResults });
        } catch (error) {
            console.error('Search failed:', error);
        }
    },

    downloadShard: async (cityName) => {
        // Placeholder for CDN download logic
        console.log(`Downloading shard for ${cityName}...`);
    }
}));
