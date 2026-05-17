import axios from 'axios';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * CabLite OSM Extraction Script
 * This script fetches high-impact POIs from OpenStreetMap (Overpass API)
 * and generates a SQLite database (shard) for offline search.
 */

// Configuration for the extraction (Expanded: Greater Delhi NCR)
const CONFIG = {
    cityName: 'Delhi-NCR',
    bbox: '28.20,76.70,28.95,77.60', // South, West, North, East (Noida, Gurgaon, Faridabad, Ghaziabad)
    outputFile: path.join(__dirname, '../../vital_tier.db'),
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Overpass Query for "Vital Tier" POIs - Greatly Expanded
const QUERY = `
[out:json][timeout:180];
(
  // Cities & Major Suburbs (Fallback)
  node["place"~"city|suburb|town"](${CONFIG.bbox});

  // Airports
  node["aeroway"="aerodrome"](${CONFIG.bbox});
  way["aeroway"="aerodrome"](${CONFIG.bbox});
  
  // Hospitals & Clinics
  node["amenity"="hospital"](${CONFIG.bbox});
  way["amenity"="hospital"](${CONFIG.bbox});
  node["amenity"="clinic"](${CONFIG.bbox});
  
  // Major Transit (Metro, Railway, Bus Hubs)
  node["railway"~"station|halt"](${CONFIG.bbox});
  node["public_transport"="station"](${CONFIG.bbox});
  node["amenity"="bus_station"](${CONFIG.bbox});
  
  // Tourism & Landmarks (Monuments, Museums, Attractions)
  node["tourism"~"attraction|museum|viewpoint|monument|artwork"](${CONFIG.bbox});
  way["tourism"~"attraction|museum|viewpoint|monument|artwork"](${CONFIG.bbox});
  node["historic"~"monument|memorial|castle|fort"](${CONFIG.bbox});
  
  // Business, Shopping & Offices
  node["shop"="mall"](${CONFIG.bbox});
  way["shop"="mall"](${CONFIG.bbox});
  node["office"~"government|company|it"](${CONFIG.bbox});
  way["office"~"government|company|it"](${CONFIG.bbox});
  node["amenity"="university"](${CONFIG.bbox});
  way["amenity"="university"](${CONFIG.bbox});
  node["amenity"="college"](${CONFIG.bbox});
  
  // Religious Sites (Often major landmarks)
  node["amenity"="place_of_worship"](${CONFIG.bbox});
  way["amenity"="place_of_worship"](${CONFIG.bbox});
);
out center;
`;

async function extract() {
    console.log(`🚀 Starting OSM extraction for ${CONFIG.cityName}...`);

    try {
        // 1. Fetch data from OSM
        console.log('📡 Querying Overpass API (this may take 1-3 minutes)...');
        
        // Use URLSearchParams to ensure proper form encoding
        const params = new URLSearchParams();
        params.append('data', QUERY);

        const response = await axios.post(OVERPASS_URL, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'CabLite-OSM-Extractor/1.0'
            }
        });
        const elements = response.data.elements;

        if (!elements || elements.length === 0) {
            console.error('❌ No data found for the given bounding box.');
            return;
        }

        console.log(`✅ Found ${elements.length} raw OSM elements.`);

        // 2. Prepare SQLite database
        if (fs.existsSync(CONFIG.outputFile)) {
            fs.unlinkSync(CONFIG.outputFile);
        }

        const db = new Database(CONFIG.outputFile);
        db.pragma('journal_mode = WAL');

        // Create tables (Matches Frontend Schema)
        db.exec(`
            CREATE TABLE pois (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                rank INTEGER DEFAULT 0
            );
            CREATE VIRTUAL TABLE pois_fts USING fts5(
                name,
                content='pois',
                content_rowid='id'
            );
        `);

        const insertStmt = db.prepare(`
            INSERT INTO pois (name, category, latitude, longitude, rank) 
            VALUES (?, ?, ?, ?, ?)
        `);

        // 3. Process and Insert Data
        console.log('💾 Writing to SQLite database...');
        
        let count = 0;
        const insertMany = db.transaction((items: any[]) => {
            for (const item of items) {
                const name = item.tags.name || item.tags['name:en'] || item.tags['alt_name'] || 'Unknown POI';
                if (name === 'Unknown POI') continue;

                // Determine rank based on category and importance
                let rank = 30; // Default base rank
                let category = 'poi';

                const tags = item.tags;

                if (tags.place === 'city') { rank = 100; category = 'city'; }
                else if (tags.aeroway === 'aerodrome') { rank = 95; category = 'airport'; }
                else if (tags.railway === 'station' || tags.public_transport === 'station') { rank = 90; category = 'transport'; }
                else if (tags.place === 'suburb') { rank = 85; category = 'suburb'; }
                else if (tags.amenity === 'hospital') { rank = 80; category = 'hospital'; }
                else if (tags.historic || tags.tourism === 'attraction') { rank = 75; category = 'landmark'; }
                else if (tags.shop === 'mall') { rank = 70; category = 'shopping'; }
                else if (tags.amenity === 'university') { rank = 65; category = 'education'; }
                else if (tags.amenity === 'place_of_worship') { rank = 60; category = 'religion'; }
                else if (tags.office) { rank = 50; category = 'office'; }

                const lat = item.lat || item.center?.lat;
                const lon = item.lon || item.center?.lon;

                if (lat && lon) {
                    insertStmt.run(name, category, lat, lon, rank);
                    count++;
                }
            }
        });

        insertMany(elements);

        // 4. Build FTS Index
        console.log('🔍 Building search index...');
        db.exec(`INSERT INTO pois_fts(rowid, name) SELECT id, name FROM pois;`);

        db.close();
        console.log(`\n✨ Success! Generated expanded shard at: ${CONFIG.outputFile}`);
        console.log(`📊 Total POIs imported: ${count}`);

    } catch (error: any) {
        console.error('❌ Extraction failed:', error.message);
    }
}

extract();
