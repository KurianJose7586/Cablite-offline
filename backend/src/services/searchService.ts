import axios from 'axios';
import { logger } from '../utils/logger';

export interface SearchResult {
    name: string;
    lat: number;
    lng: number;
}

export class SearchService {
    private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

    /**
     * Search for a location using OpenStreetMap Nominatim API
     */
    async search(query: string): Promise<SearchResult | null> {
        try {
            logger.info('Performing deep search', { query });

            const response = await axios.get(this.NOMINATIM_URL, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'CabLite-Backend/1.0'
                }
            });

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    name: result.display_name,
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                };
            }

            return null;
        } catch (error: any) {
            logger.error('Deep search failed', { query, error: error.message });
            return null;
        }
    }
}

export const searchService = new SearchService();
