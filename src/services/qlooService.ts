import { Qloo } from '@devma/qloo';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.QLOO_API_KEY;
if (!apiKey) throw new Error('QLOO_API_KEY must be set in .env');

export class QlooService {
  private client: Qloo;

  constructor() {
    this.client = new Qloo({ apiKey });
  }

  /**
   * Search for entity IDs by an array of names
   * @param names  Array of entity names to search
   * @param type   one of the SDK’s URN literals (Eg: 'urn:entity:place')
   */
  async searchEntities(names: string[], type: string) {
    logger.info(`Searching entities: ${names.join(', ')} as ${type}`);
    return this.client.insights.getInsights({ 
      // cast `type` string in order to satisfy the SDK filterType
      filterType: type as any,
      signalInterestsEntities: names,
      take: names.length
    });
  }

  /**
   * personalized destination recommendations.
   * @param signals       Signals containing optional tags, entities, and/or a location query
   * @param take          Number of results to return
   */
  async getDestinations(
    signals: { tags?: string[]; entities?: string[]; locationQuery?: string },
    take = 5
  ) {
    logger.info(`Fetching ${take} destinations for signals: ${JSON.stringify(signals)}`);
    return this.client.insights.getInsights({
      // direct literal cast
      filterType: 'urn:entity:destination' as any,
      signalInterestsTags: signals.tags,
      signalInterestsEntities: signals.entities,
      filterLocationQuery: signals.locationQuery,
      take
    });
  }
    async getPlaces(
    signals: { tags?: string[]; entities?: string[]; locationQuery?: string },
    take = 5
    ) {
    logger.info(`Fetching ${take} places for signals: ${JSON.stringify(signals)}`);
    return this.client.insights.getInsights({
        filterType: 'urn:entity:place' as any, // after testing
        signalInterestsTags: signals.tags,
        signalInterestsEntities: signals.entities,
        filterLocationQuery: signals.locationQuery,
        take
    });
    }
}