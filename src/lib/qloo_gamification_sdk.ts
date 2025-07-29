// @ts-nocheck
// Cultural Gamification & Hyper-localization SDK
// Built on top of Qloo TypeScript SDK

import { Qloo } from '@devma/qloo';
import axios from 'axios';
const qloo = new Qloo({
  apiKey: process.env.NEXT_PUBLIC_QLOO_API_KEY || ''
});
if (!process.env.NEXT_PUBLIC_QLOO_API_KEY) {
  console.warn('❗️Missing NEXT_PUBLIC_QLOO_API_KEY in environment');
}

const photoBadges: Badge[] = [
  {
    id: 'first_snap',
    name: 'First Snap',
    description: 'Upload your first location photo',
    icon: '📸',
    category: 'explorer',
    requirement: { type: 'photo_uploads', target: 1 }
  },
  {
    id: 'photo_explorer', 
    name: 'Photo Explorer',
    description: 'Upload photos at 5 different locations',
    icon: '🌟',
    category: 'explorer',
    requirement: { type: 'photo_uploads', target: 5 }
  },
  {
    id: 'heritage_photographer',
    name: 'Heritage Photographer', 
    description: 'Upload photos at 3 heritage sites',
    icon: '🏛️',
    category: 'heritage',
    requirement: { type: 'heritage_photos', target: 3 }
  },
  {
    id: 'foodie_snapper',
    name: 'Foodie Snapper',
    description: 'Upload photos at 7 restaurants',
    icon: '🍴',
    category: 'foodie', 
    requirement: { type: 'restaurant_photos', target: 7 }
  },
  {
    id: 'memory_keeper',
    name: 'Memory Keeper',
    description: 'Upload 15 location photos',
    icon: '📚',
    category: 'cultural',
    requirement: { type: 'photo_uploads', target: 15 }
  }
];

// Types and Interfaces
interface UserProfile {
  userId: string;
  preferences: {
    cuisines: string[];
    culturalInterests: string[];
    travelStyle: 'budget' | 'luxury' | 'authentic' | 'modern';
    nostalgicPeriods: string[]; // e.g., '90s', 'colonial', 'traditional'
  };
  demographics: {
    age: '35_and_younger' | '36_to_55' | '55_and_older';
    gender?: 'male' | 'female';
  };
  location: {
    current: string;
    coordinates?: string; // POINT(lng lat)
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'cultural' | 'explorer' | 'foodie' | 'festival' | 'heritage';
  requirement: {
    type: 'visit_count' | 'festival_participation' | 'cuisine_diversity' | 'heritage_sites';
    target: number;
    filter?: any;
  };
}

interface UserProgress {
  userId: string;
  badges: Badge[];
  points: number;
  level: number;
  streaks: {
    type: string;
    count: number;
    lastActivity: Date;
  }[];
  achievements: {
    heritageVisits: number;
    festivalParticipation: number;
    cuisinesTried: string[];
    culturesExplored: string[];
    photoUploads: {
      total: number;
      locations: string[]; // entityIds where photos were uploaded
      heritagePhotos: number;
      restaurantPhotos: number;
  };
};
}

interface SpinWheelReward {
  type: 'discount' | 'points' | 'badge' | 'experience';
  value: number | string;
  description: string;
  probability: number;
}

interface ContextualPrompt {
  mood: 'nostalgic' | 'adventurous' | 'relaxed' | 'social' | 'spiritual';
  intent: 'explore' | 'plan' | 'discover' | 'experience';
  context: string;
}

// Main Gamification Class
export class QlooCulturalGamification {
  private qloo: Qloo;
  // private userProfiles: Map<string, UserProfile> = new Map();
  private apiKey: string;
  private userProfiles = new Map<string, UserProfile>();
  private userProgress: Map<string, UserProgress> = new Map();

  // Predefined badges for cultural exploration
  private readonly badges: Badge[] = [
    {
      id: 'diwali_explorer',
      name: 'Festival of Lights Explorer',
      description: 'Visit 5 heritage sites during Diwali season',
      icon: '🪔',
      category: 'festival',
      requirement: { type: 'heritage_sites', target: 5 }
    },
    {
      id: 'cultural_bridge',
      name: 'Cultural Bridge Builder',
      description: 'Experience 10 different cultural cuisines',
      icon: '🌍',
      category: 'cultural',
      requirement: { type: 'cuisine_diversity', target: 10 }
    },
    {
      id: 'heritage_guardian',
      name: 'Heritage Guardian',
      description: 'Visit 20 UNESCO World Heritage sites',
      icon: '🏛️',
      category: 'heritage',
      requirement: { type: 'heritage_sites', target: 20 }
    },
    {
      id: 'flavor_nomad',
      name: 'Flavor Nomad',
      description: 'Try authentic dishes from 15 different regions',
      icon: '🍛',
      category: 'foodie',
      requirement: { type: 'cuisine_diversity', target: 15 }
    }
  ];

  // Spin wheel rewards configuration
  private readonly spinRewards: SpinWheelReward[] = [
    { type: 'discount', value: 10, description: '10% off next booking', probability: 0.3 },
    { type: 'discount', value: 25, description: '25% off heritage tours', probability: 0.15 },
    { type: 'points', value: 500, description: '500 culture points', probability: 0.25 },
    { type: 'points', value: 1000, description: '1000 culture points', probability: 0.1 },
    { type: 'experience', value: 'free_guide', description: 'Free cultural guide', probability: 0.15 },
    { type: 'badge', value: 'lucky_explorer', description: 'Lucky Explorer badge', probability: 0.05 }
  ];
  
  registerUserProfile(userProfile: UserProfile) {
    this.userProfiles.set(userProfile.userId, userProfile);
  }

  constructor(qloo: Qloo, apiKey: string) {
    this.qloo = qloo;
    this.apiKey = apiKey;
  }

  // User Profile Management
  async createUserProfile(profile: UserProfile): Promise<void> {
    this.badges = [...this.badges, ...photoBadges];
    this.userProfiles.set(profile.userId, profile);
    this.userProgress.set(profile.userId, {
      userId: profile.userId,
      badges: [],
      points: 0,
      level: 1,
      streaks: [],
      achievements: {
        heritageVisits: 0,
        festivalParticipation: 0,
        cuisinesTried: [],
        culturesExplored: [],
        photoUploads: {
          total: 0,
          locations: [],
          heritagePhotos: 0,
          restaurantPhotos: 0
        }
      }
    });
  }

  // Context-Aware Cultural Recommendations
  async getContextualRecommendations(userId: string, prompt: ContextualPrompt, location?: string) {
    const profile = this.userProfiles.get(userId);
    if (!profile) throw new Error('User profile not found');

    const baseSignals = await this.buildContextualSignals(profile, prompt);
    const filters = location ? this.buildContextualFilters(prompt, location) : {};

    // direct‐search override
   if (prompt.intent === 'search') {
       // raw HTTP fallback to Qloo /search endpoint
       const { data } = await axios.get(
         'https://hackathon.api.qloo.com/search',
         {
           params: { query: prompt.context, types: 'urn:entity:place' },
           headers: {
             accept: 'application/json',
             'x-api-key': this.apiKey
           }
         }
       );
       return {
         entities: data.results || [],
         mood: prompt.mood,
         explanation: `Search results for “${prompt.context}”`
       };
     }
    switch (prompt.mood) {
      case 'nostalgic':
        return await this.getNostalgicRecommendations(baseSignals, filters, profile);
      case 'adventurous':
        return await this.getAdventurousRecommendations(baseSignals, filters);
      case 'spiritual':
        return await this.getSpiritualRecommendations(baseSignals, filters);
      default:
        return await this.getGeneralRecommendations(baseSignals, filters);
    }
  }

  private async buildContextualSignals(profile: UserProfile, prompt: ContextualPrompt) {
    const signals: any = {
      signalDemographicsAge: profile?.demographics?.age ?? 30
    };

    if (profile?.demographics?.gender) {
      signals.signalDemographicsGender = profile.demographics.gender;
    }

    // Add cultural interest tags
    if (profile.preferences.culturalInterests.length > 0) {
      signals.signalInterestsTags = profile.preferences.culturalInterests.map(
        interest => `urn:tag:category:${interest}`
      );
    }

    return signals;
  }

  private buildContextualFilters(prompt: ContextualPrompt, location: string) {
    const filters: any = {
      filterLocationQuery: location,
      take: 15
    };

    // Add context-specific filters
    if (prompt.context.toLowerCase().includes('weekend')) {
      filters.filterHours = 'saturday';
    }

    if (prompt.context.toLowerCase().includes('budget')) {
      filters.filterPriceLevelMax = 2;
    }

    return filters;
  }

  private async getNostalgicRecommendations(signals: any, filters: any, profile: UserProfile) {
    const heritageResults = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      ...signals,
      signalInterestsTags: profile.preferences.culturalInterests.map(ci => `urn:tag:category:${ci}`),
      filterLocationQuery: profile.location.current,
      // take: 15,
      featureExplainability: true
    });

    const cuisineResults = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      ...signals,
      signalInterestsTags: profile.preferences.cuisines.map(c => `urn:tag:genre:restaurant:${c}`),
      filterLocationQuery: profile.location.current,
      // take: 15,
      featureExplainability: true
    });

    const heritageEntities = heritageResults.results?.entities || [];
    const cuisineEntities = cuisineResults.results?.entities || [];
    const entities = [...heritageEntities, ...cuisineEntities];

    return {
      entities,
      mood: 'nostalgic',
      explanation: 'Curated based on your nostalgic mood and cultural preferences'
    };
  }

  private async getAdventurousRecommendations(signals: any, filters: any) {
    // Focus on unique, off-the-beaten-path experiences
    const adventureResults = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      ...signals,
      signalInterestsTags: [
        'urn:tag:category:adventure',
        'urn:tag:category:unique',
        'urn:tag:category:local'
      ],
      ...filters,
      filterPopularityMax: 0.7, // Less mainstream options
      diversifyBy: 'properties.geocode.city',
      diversifyTake: 2
    });

    return {
      adventures: adventureResults,
      mood: 'adventurous',
      explanation: 'Unique experiences chosen to expand your horizons'
    };
  }

  private async getSpiritualRecommendations(signals: any, filters: any) {
    const spiritualResults = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      ...signals,
      signalInterestsTags: [
        'urn:tag:category:spiritual',
        'urn:tag:category:meditation',
        'urn:tag:category:temple',
        'urn:tag:category:peaceful'
      ],
      ...filters,
      filterTags: ['urn:tag:attribute:serene', 'urn:tag:attribute:sacred']
    });

    return {
      spiritual: spiritualResults,
      mood: 'spiritual',
      explanation: 'Peaceful and spiritually enriching places for reflection'
    };
  }

  private async getGeneralRecommendations(signals: any, filters: any) {
    const apiResponse = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      ...signals,
      ...filters,
      featureExplainability: true
    });

    const entities = apiResponse.results?.entities || [];
    return {
      entities,
      mood: 'relaxed',
      explanation: 'General recommendations based on your preferences'
    };
  }

  // Gamification Features
  async checkAndAwardBadges(userId: string, activityType: string, details: any): Promise<Badge[]> {
    const progress = this.userProgress.get(userId);
    if (!progress) return [];

    const newBadges: Badge[] = [];

    for (const badge of this.badges) {
      if (progress.badges.find(b => b.id === badge.id)) continue;

      if (this.checkBadgeRequirement(badge, progress, activityType, details)) {
        progress.badges.push(badge);
        progress.points += 1000; // Badge bonus
        newBadges.push(badge);
      }
    }

    this.updateUserLevel(progress);
    return newBadges;
  }

  private checkBadgeRequirement(badge: Badge, progress: UserProgress, activityType: string, details: any): boolean {
    switch (badge.requirement.type) {
      case 'heritage_sites':
        return progress.achievements.heritageVisits >= badge.requirement.target;
      case 'cuisine_diversity':
        return progress.achievements.cuisinesTried.length >= badge.requirement.target;
      case 'festival_participation':
        return progress.achievements.festivalParticipation >= badge.requirement.target;
      case 'photo_uploads':
        return progress.achievements.photoUploads.total >= badge.requirement.target;
      case 'heritage_photos':
        return progress.achievements.photoUploads.heritagePhotos >= badge.requirement.target;
      case 'restaurant_photos':
        return progress.achievements.photoUploads.restaurantPhotos >= badge.requirement.target;
        default:
        return false;
    }
  }

  async updatePhotoProgress(userId: string, entityId: string, entityType: string): Promise<Badge[]> {
    const progress = this.userProgress.get(userId);
    if (!progress) return [];

    // Update photo statistics
    if (!progress.achievements.photoUploads.locations.includes(entityId)) {
      progress.achievements.photoUploads.total++;
      progress.achievements.photoUploads.locations.push(entityId);

      // Categorize photo type
      if (entityType.toLowerCase().includes('heritage') || entityType.toLowerCase().includes('temple') || entityType.toLowerCase().includes('museum')) {
        progress.achievements.photoUploads.heritagePhotos++;
      }
      if (entityType.toLowerCase().includes('restaurant') || entityType.toLowerCase().includes('food')) {
        progress.achievements.photoUploads.restaurantPhotos++;
      }

      // Award points for photo upload
      progress.points += 100;
    }

    // Check for new photo badges
    return await this.checkAndAwardBadges(userId, 'photo_upload', { entityId, entityType });
  }

  async spinWheel(userId: string): Promise<SpinWheelReward | null> {
    const progress = this.userProgress.get(userId);
    if (!progress || progress.points < 100) return null; // Minimum points required

    // Deduct spin cost
    progress.points -= 100;

    // Random selection based on probability
    const random = Math.random();
    let accumulated = 0;

    for (const reward of this.spinRewards) {
      accumulated += reward.probability;
      if (random <= accumulated) {
        await this.applyReward(userId, reward);
        return reward;
      }
    }

    return null;
  }

  private async applyReward(userId: string, reward: SpinWheelReward): Promise<void> {
    const progress = this.userProgress.get(userId);
    if (!progress) return;

    switch (reward.type) {
      case 'points':
        progress.points += Number(reward.value);
        break;
      case 'badge':
        const specialBadge: Badge = {
          id: String(reward.value),
          name: reward.description,
          description: 'Earned from spin wheel',
          icon: '🎰',
          category: 'cultural',
          requirement: { type: 'visit_count', target: 0 }
        };
        progress.badges.push(specialBadge);
        break;
    }
  }

  // Progress Tracking
  async updateProgress(userId: string, activity: {
    type: 'visit' | 'cuisine' | 'festival' | 'booking';
    data: any;
  }): Promise<void> {
    const progress = this.userProgress.get(userId);
    if (!progress) return;

    switch (activity.type) {
      case 'visit':
        if (activity.data.isHeritage) progress.achievements.heritageVisits++;
        break;
      case 'cuisine':
        if (!progress.achievements.cuisinesTried.includes(activity.data.cuisine)) {
          progress.achievements.cuisinesTried.push(activity.data.cuisine);
        }
        break;
      case 'festival':
        progress.achievements.festivalParticipation++;
        break;
    }

    progress.points += this.calculateActivityPoints(activity);
    this.updateUserLevel(progress);
  }

  private calculateActivityPoints(activity: { type: string; data: any }): number {
    const pointsMap: Record<string, number> = {
      'visit': 50,
      'cuisine': 30,
      'festival': 100,
      'booking': 75
    };
    return pointsMap[activity.type] || 10;
  }

  private updateUserLevel(progress: UserProgress): void {
    const newLevel = Math.floor(progress.points / 1000) + 1;
    if (newLevel > progress.level) {
      progress.level = newLevel;
      progress.points += 500; // Level up bonus
    }
  }

  // Hyper-localization Features
  async getHyperLocalRecommendations(userId: string, query: string, coordinates?: string) {
    const profile = this.userProfiles.get(userId);
    if (!profile) throw new Error('User profile not found');

    const location = coordinates || profile.location.coordinates || profile.location.current;

    // Weekend planning
    const locLower = profile.location.current.toLowerCase();
    if (query.toLowerCase().includes('weekend') && query.toLowerCase().includes(locLower)) {
      return await this.getWeekendPlan(profile.location.current, profile);
     }

    // Exploration requests
    if (query.toLowerCase().includes('completely new')) {
      return await this.getComfortZoneExpansion(profile, location);
    }

    // General hyper-local
    return await this.getLocationBasedRecommendations(profile, location, query);
  }

  private async getWeekendPlan(city: string, profile: UserProfile) {
    const dayPlans = [];

    // Saturday - Cultural immersion
    const saturdayPlan = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      signalInterestsTags: profile.preferences.culturalInterests.map(i => `urn:tag:category:${i}`),
      signalDemographicsAge: profile.demographics.age,
      filterLocationQuery: city,
      filterHours: 'saturday',
      diversifyBy: 'properties.subtype',
      diversifyTake: 3,
      take: 9
    });

    // Sunday - Relaxed exploration
    const sundayPlan = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      signalInterestsTags: [
        'urn:tag:category:peaceful',
        'urn:tag:category:nature',
        'urn:tag:category:brunch'
      ],
      signalDemographicsAge: profile.demographics.age,
      filterLocationQuery: city,
      filterHours: 'sunday',
      diversifyBy: 'properties.subtype',
      diversifyTake: 2,
      take: 6
    });

    return {
      weekend_plan: {
        saturday: saturdayPlan,
        sunday: sundayPlan,
        total_recommendations: 15
      },
      personalization_note: `Tailored based on your cultural interests and ${profile.location.current}’s unique vibe`
    };
  }

  private async getComfortZoneExpansion(profile: UserProfile, location: string) {
    // Find recommendations that are different but aligned with deeper preferences
    const expansionResults = await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      signalDemographicsAge: profile.demographics.age,
      filterLocationQuery: location,
      filterPopularityMin: 0.3,
      filterPopularityMax: 0.8, // Avoid too mainstream or too obscure
      diversifyBy: 'properties.primary_category',
      diversifyTake: 1, // Force diversity
      take: 12,
      featureExplainability: true
    });

    return {
      expansion_recommendations: expansionResults,
      explanation: 'Carefully chosen to stretch your boundaries while respecting your core preferences',
      comfort_zone_note: 'These experiences are new but aligned with your deeper taste profile'
    };
  }

  private async getLocationBasedRecommendations(profile: UserProfile, location: string, query: string) {
    return await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      signalInterestsTags: profile.preferences.culturalInterests.map(i => `urn:tag:category:${i}`),
      signalDemographicsAge: profile.demographics.age,
      filterLocationQuery: location,
      filterLocationRadius: 2000, // 2km radius for hyper-local
      featureExplainability: true,
      take: 10
    });
  }

  // Utility Methods
  getUserProgress(userId: string): UserProgress | undefined {
    return this.userProgress.get(userId);
  }

  async getLeaderboard(category: 'points' | 'badges' | 'heritage' = 'points'): Promise<any[]> {
    const users = Array.from(this.userProgress.values());
    
    switch (category) {
      case 'points':
        return users.sort((a, b) => b.points - a.points).slice(0, 10);
      case 'badges':
        return users.sort((a, b) => b.badges.length - a.badges.length).slice(0, 10);
      case 'heritage':
        return users.sort((a, b) => b.achievements.heritageVisits - a.achievements.heritageVisits).slice(0, 10);
      default:
        return users.slice(0, 10);
    }
  }

  // Festival-specific recommendations
  async getFestivalRecommendations(festival: string, location: string, profile: UserProfile) {
    const festivalTags = this.getFestivalTags(festival);
    
    return await this.qloo.insights.getInsights({
      filterType: 'urn:entity:place',
      signalInterestsTags: festivalTags,
      signalDemographicsAge: profile.demographics.age,
      filterLocationQuery: location,
      filterTags: [`urn:tag:event:${festival.toLowerCase()}`],
      diversifyBy: 'properties.subtype',
      diversifyTake: 2,
      take: 12,
      featureExplainability: true
    });
  }

  private getFestivalTags(festival: string): string[] {
    const festivalTagMap: Record<string, string[]> = {
      'diwali': ['urn:tag:category:temple', 'urn:tag:category:sweets', 'urn:tag:category:lights'],
      'dussehra': ['urn:tag:category:cultural', 'urn:tag:category:parade', 'urn:tag:category:traditional'],
      'holi': ['urn:tag:category:colorful', 'urn:tag:category:celebration', 'urn:tag:category:community'],
      'christmas': ['urn:tag:category:festive', 'urn:tag:category:lights', 'urn:tag:category:market'],
      'eid': ['urn:tag:category:mosque', 'urn:tag:category:feast', 'urn:tag:category:community']
    };
    
    return festivalTagMap[festival.toLowerCase()] || ['urn:tag:category:festival'];
  }
  /** Stream ChatGPT tokens back via callback */
  async streamChat(
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
      onToken: (token: string) => void
    ) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        stream: true
      })
    });
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buf = '';

    while (!done) {
      const { value, done: rDone } = await reader.read();
      done = rDone;
      buf = decoder.decode(value || new Uint8Array(), { stream: true });
      buf.split('\n').forEach((line) => {
        if (!line.startsWith('data: ')) return;
        const data = line.replace(/^data: /, '');
        if (data === '[DONE]') return;
        const parsed = JSON.parse(data);
        const token = parsed.choices[0].delta?.content;
        if (token) onToken(token);
      });
    }
  }
}

export class CulturalApp {
  private gamification: QlooCulturalGamification;

  constructor(qloo: Qloo, apiKey: string) {
    this.gamification = new QlooCulturalGamification(qloo, apiKey);
  }

  async initializeUser(profile: UserProfile) {
    await this.gamification.createUserProfile(profile);
  }

  async handleUserQuery(userId: string, query: string) {
    if (query.toLowerCase().includes('nostalgic')) {
      return await this.gamification.getContextualRecommendations(userId, {
        mood: 'nostalgic',
        intent: 'experience',
        context: query
      });
    }

    if (query.toLowerCase().includes('weekend')) {
      return await this.gamification.getHyperLocalRecommendations(userId, query);
    }

    if (query.toLowerCase().includes('completely new')) {
      return await this.gamification.getContextualRecommendations(userId, {
        mood: 'adventurous',
        intent: 'explore',
        context: query
      });
    }

    return await this.gamification.getHyperLocalRecommendations(userId, query);
  }

  async processActivity(userId: string, activity: any) {
    // Update progress
    await this.gamification.updateProgress(userId, activity);

    // Check for new badges
    const newBadges = await this.gamification.checkAndAwardBadges(userId, activity.type, activity.data);

    if (newBadges.length > 0) {
      console.log(`🎉 New badges earned: ${newBadges.map(b => b.name).join(', ')}`);
    }

    return { newBadges, progress: this.gamification.getUserProgress(userId) };
  }
}