import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
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

            // Check if DB exists
            let fileInfo = await FileSystem.getInfoAsync(dbPath);
            let shouldCopy = !fileInfo.exists;

            if (fileInfo.exists) {
                // If it exists, let's check if it's actually populated
                try {
                    const db = await SQLite.openDatabaseAsync(DB_NAME);
                    const countRow = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM pois');
                    if (!countRow || countRow.count === 0) {
                        console.log('Database found but empty. Forcing re-copy...');
                        shouldCopy = true;
                        await db.closeAsync();
                    }
                } catch (e) {
                    console.log('Database corrupted or missing tables. Forcing re-copy...');
                    shouldCopy = true;
                }
            }

            if (shouldCopy) {
                console.log('Copying real-world database from assets...');
                const asset = Asset.fromModule(require('../assets/vital_tier.db'));
                await asset.downloadAsync();
                
                if (asset.localUri) {
                    // Delete old file if it exists to be safe
                    if (fileInfo.exists) {
                        await FileSystem.deleteAsync(dbPath, { idempotent: true });
                    }
                    await FileSystem.copyAsync({
                        from: asset.localUri,
                        to: dbPath
                    });
                } else {
                    throw new Error('Could not get local URI for database asset');
                }
            }

            console.log('Opening real-world search database...');
            const db = await SQLite.openDatabaseAsync(DB_NAME);
            
            // Just ensure WAL mode for performance
            await db.execAsync('PRAGMA journal_mode = WAL;');
            
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
            // Split query into words and add wildcard to each
            const formattedQuery = query.trim().split(/\s+/).map(word => `${word}*`).join(' ');

            const results = await db.getAllAsync<any>(`
                SELECT p.* 
                FROM pois p
                JOIN pois_fts f ON p.id = f.rowid
                WHERE f.name MATCH ?
                ORDER BY p.rank DESC
                LIMIT 10
            `, [formattedQuery]);

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
