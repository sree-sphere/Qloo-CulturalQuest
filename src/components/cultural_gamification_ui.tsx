// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';

import { Trophy, MapPin, Zap, Gift, Compass, Heart } from 'lucide-react';
import Image from 'next/image';

// Qloo & SDK imports
import { Qloo } from '@devma/qloo';
import { QlooCulturalGamification, CulturalApp } from '../lib/qloo_gamification_sdk';

// Qloo and gamification SDK
const qloo = new Qloo({apiKey: process.env.NEXT_PUBLIC_QLOO_API_KEY || ''});
const gamification = new QlooCulturalGamification(qloo, process.env.NEXT_PUBLIC_QLOO_API_KEY || '');
const app = new CulturalApp(qloo, process.env.NEXT_PUBLIC_QLOO_API_KEY || '');

// Initial mock user data
const mockUser = {
  userId: 'user123',
  name: 'Priya Sharma',
  location: {
    current: 'Austin, TX',
    coordinates: 'POINT(-97.7431 30.2672)'
  },
  demographics: {
    age: '35_and_younger',
    gender: 'female',
    ethnicity: 'Indian',
    religion: 'Hindu',
    maritalStatus: 'single'
  },
  preferences: {
    cuisines: ['Indian', 'Thai', 'Italian'], // Example based on achievements
    culturalInterests: ['heritage', 'festivals', 'cuisine'], // Example interests
    travelStyle: 'authentic', // Example travel style
    nostalgicPeriods: ['traditional'], // Example nostalgic period
    isVegetarian: true
  },
  level: 7,
  points: 6850,
  badges: [
    { id: 'diwali_explorer', name: 'Festival of Lights Explorer', icon: '🪔', category: 'festival' },
    { id: 'flavor_nomad', name: 'Flavor Nomad', icon: '🍛', category: 'foodie' },
    { id: 'heritage_guardian', name: 'Heritage Guardian', icon: '🏛️', category: 'heritage' }
  ],
  achievements: {
    heritageVisits: 18,
    festivalParticipation: 5,
    cuisinesTried: ['Indian', 'Thai', 'Italian', 'Mexican', 'Japanese', 'Lebanese'],
    culturesExplored: ['South Indian', 'North Indian', 'Thai', 'Mediterranean']
  },
  currentStreak: { type: 'cultural_exploration', count: 12 }
};

const calculateSimilarityScore = (entity1: any, entity2: any): number => {
  let score = 0;
  
  // Category similarity mapping
  const categoryGroups = {
    food: ['restaurant', 'delivery service', 'fast food', 'breakfast', 'sushi', 'asian', 'mexican', 'vietnamese', 'burrito', 'caterer', 'snack bar', 'bubble tea'],
    retail: ['clothing store', 'organic food store'],
    entertainment: ['tourist attraction', 'aquarium', 'childrens party', 'art gallery'],
    services: ['barber shop', 'music instructor']
  };
  
  // Cuisine similarity mapping
  const cuisineGroups = {
    asian: ['sushi', 'asian', 'vietnamese', 'bubble tea'],
    mexican: ['mexican', 'burrito'],
    american: ['fast food', 'breakfast', 'steakburgers'],
    specialty: ['bagels', 'frozen custard', 'pies']
  };
  
  const type1 = entity1.type.toLowerCase();
  const type2 = entity2.type.toLowerCase();
  
  // Exact type match (highest similarity)
  if (type1 === type2) {
    score += 50;
  }
  
  // Category group similarity
  for (const [group, types] of Object.entries(categoryGroups)) {
    const inGroup1 = types.some(t => type1.includes(t));
    const inGroup2 = types.some(t => type2.includes(t));
    if (inGroup1 && inGroup2) {
      score += 30;
      break;
    }
  }
  
  // Cuisine similarity (for food items)
  for (const [cuisine, types] of Object.entries(cuisineGroups)) {
    const inCuisine1 = types.some(t => type1.includes(t));
    const inCuisine2 = types.some(t => type2.includes(t));
    if (inCuisine1 && inCuisine2) {
      score += 25;
      break;
    }
  }
  
  // Name similarity (basic keyword matching)
  const name1Words = entity1.name.toLowerCase().split(/\s+/);
  const name2Words = entity2.name.toLowerCase().split(/\s+/);
  const commonWords = name1Words.filter(word => 
    name2Words.includes(word) && word.length > 3
  );
  score += commonWords.length * 10;
  
  // Location proximity (if available)
  if (entity1.distance && entity2.distance) {
    const dist1 = parseFloat(entity1.distance);
    const dist2 = parseFloat(entity2.distance);
    if (!isNaN(dist1) && !isNaN(dist2)) {
      const distanceDiff = Math.abs(dist1 - dist2);
      if (distanceDiff < 1) score += 15; // Within 1 mile
      else if (distanceDiff < 3) score += 10; // Within 3 miles
    }
  }
  
  return score;
};

const reorderNostalgicRecommendations = (
  recommendations: any[],
  likedIds: Set<string>,
  userAffinityVector: Record<string, number>
) => {
  const likedEntities = recommendations.filter(r => likedIds.has(r.entityId));
  const others = recommendations.filter(r => !likedIds.has(r.entityId));

  // Sort non-liked by similarity
  const scored = others.map(entity => {
    const maxSimilarity = likedEntities.length > 0
      ? Math.max(...likedEntities.map(liked => calculateSimilarityScore(entity, liked)))
      : 0;

    return { ...entity, _score: maxSimilarity + Math.random() * 5 };
  }).sort((a, b) => b._score - a._score);

  // Combine liked + top N others, capped at 15
  const combined = [...likedEntities, ...scored].slice(0, 15);

  return combined.map(({ _score, ...rest }) => rest);
};

const checkImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    
    // Check if it's actually an image and not the oops.png redirect
    if (!response.ok || !contentType?.startsWith('image/')) {
      return false;
    }
    
    // Additional check for the oops.png redirect
    if (response.url.includes('oops.png') || url.includes('oops.png')) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function for time formatting
const formatTime = (timeStr: string) => {
  if (!timeStr) return 'N/A';
  const time = timeStr.substring(1); // Remove 'T'
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const CulturalGamificationApp = () => {
  useEffect(() => {
  const storedLikes = JSON.parse(localStorage.getItem('liked-entities') || '[]');
  setLikedPlaces(new Set(storedLikes));
  
  // Auto-load and reorder nostalgic recommendations on page reload
  const cachedNostalgic = localStorage.getItem(CACHE_KEY);
  if (cachedNostalgic) {
    try {
      const cached = JSON.parse(cachedNostalgic);
      if (cached.length && cached[0]?.entityId) {
        // Reorder based on current likes
        const reordered = reorderNostalgicRecommendations(cached, new Set(storedLikes), userAffinityVector);
        // Update cache with new order
        localStorage.setItem(CACHE_KEY, JSON.stringify(reordered));
        console.log('Reordered recommendations:', reordered);
      }
    } catch (error) {
      console.error('Error loading cached nostalgic recommendations:', error);
      localStorage.removeItem(CACHE_KEY);
    }
  }
}, []);
  const [activeTab, setActiveTab] = useState('home');
  const [userInput, setUserInput] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('qloo-user-profile');
    return saved
      ? { ...mockUser, ...JSON.parse(saved) }
      : mockUser;
  }
  return mockUser;
});
useEffect(() => {
    if (userProfile) {
      app.initializeUser(userProfile);
    }
  }, [userProfile]);

  const [profileForm, setProfileForm] = useState({
  name: mockUser.name,
  demographics: { age: mockUser.demographics.age, gender: mockUser.demographics.gender, ethnicity: mockUser.demographics.ethnicity, religion: mockUser.demographics.religion, maritalStatus: mockUser.demographics.maritalStatus },
  location: { current: mockUser.location.current },
  preferences: {
    cuisines: mockUser.preferences.cuisines,
    culturalInterests: mockUser.preferences.culturalInterests,
    travelStyle: mockUser.preferences.travelStyle,
    nostalgicPeriods: mockUser.preferences.nostalgicPeriods
  }
});

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'success' | 'rejected'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [chatOutput, setChatOutput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedRecommendations, setFormattedRecommendations] = useState<any[]>([]);
  const [formattedRecommendations, setRecommendations] = useState([]);
  const [currentMode, setCurrentMode] = useState<'nostalgic' | 'adventurous' | 'social' | null>(null);

  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isReordering, setIsReordering] = useState(false);
  const [isDiversifying, setIsDiversifying] = useState(false);
  const diversificationEnabled = true;
  const [results, setResults] = useState<any[]>([]);
  const [heartAnimation, setHeartAnimation] = useState<string | null>(null);
  const [entityDetails, setEntityDetails] = useState<any>(null);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const CACHE_KEY = 'recs-nostalgic';

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);

  // Buffer for accumulating text chunks
  const [textBuffer, setTextBuffer] = useState('');
  const [lastProcessedLength, setLastProcessedLength] = useState(0);

  const [redeemAnimations, setRedeemAnimations] = useState<{[key: string]: boolean}>({});
  const [quickPromptLoading, setQuickPromptLoading] = useState<string | null>(null);
  const [userAffinityVector, setUserAffinityVector] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-affinity', JSON.stringify(userAffinityVector));
    }
  }, [userAffinityVector]);

  const [userPoints, setUserPoints] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('user-points');
      return cached ? JSON.parse(cached) : mockUser.points;
    }
    return mockUser.points;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-points', JSON.stringify(userPoints));
    }
  }, [userPoints]);
  const [userLevel, setUserLevel] = useState(mockUser.level);
  const [showAltSubtitle, setShowAltSubtitle] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAltSubtitle(prev => !prev);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const subtitles = [
    `Level ${userLevel} Cultural Explorer • ${userProfile.currentStreak.count} day streak`,
    "Ready for your next cultural adventure?"
  ];
  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % subtitles.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [userLevel, userProfile.currentStreak.count]);


  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  // Load conversation history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('conversation-history');
    if (savedHistory) {
      setConversationHistory(JSON.parse(savedHistory));
    }
  }, []);
  useEffect(() => {
    const newLevel = Math.floor(userPoints / 1000) + 1;
    setUserLevel(newLevel);
  }, [userPoints]);

  const getUserGreeting = (userProfile: typeof mockUser, userLevel: number) => {
    const timeOfDay = new Date().getHours();
    const greeting =
      timeOfDay < 12 ? 'Good morning' :
      timeOfDay < 18 ? 'Good afternoon' :
      'Good evening';

    const culturalGreetings: Record<string, string> = {
      'Hispanic': timeOfDay < 12 ? 'Buenos días' : timeOfDay < 18 ? 'Buenas tardes' : 'Buenas noches',
      'Chinese': timeOfDay < 12 ? '早上好' : timeOfDay < 18 ? '下午好' : '晚上好',
      'Japanese': timeOfDay < 12 ? 'おはようございます' : timeOfDay < 18 ? 'こんにちは' : 'こんばんは',
      'Korean': timeOfDay < 12 ? '좋은 아침입니다' : timeOfDay < 18 ? '좋은 점심입니다' : '좋은 저녁입니다',
      'Indian': timeOfDay < 12 ? 'सुप्रभात' : timeOfDay < 18 ? 'नमस्ते' : 'शुभ रात्रि',
      'Spanish': timeOfDay < 12 ? 'Buenos días' : timeOfDay < 18 ? 'Buenas tardes' : 'Buenas noches',
      'French': timeOfDay < 12 ? 'Bonjour' : timeOfDay < 18 ? 'Bon après-midi' : 'Bonsoir',
      'English': timeOfDay < 12 ? 'Good morning' : timeOfDay < 18 ? 'Good afternoon' : 'Good evening',
      'default': greeting
    };

    const ethnicity = userProfile?.demographics?.ethnicity;
    const culturalGreeting = culturalGreetings[ethnicity] || culturalGreetings.default;

    return {
      greeting: culturalGreeting
    };
  };

  const {greeting} = getUserGreeting(userProfile, userLevel);

  const handleImageError = (entityId: string) => {
    setImageErrors(prev => new Set([...prev, entityId]));
  };

  // Update affinity when user interacts
  const updateUserAffinity = (entityId, interaction) => {
    const entity = formattedRecommendations.find(r => r.entityId === entityId);
    if (!entity) return;
    
    // Extract features from entity
    const features = {
      cuisine: entity.type.toLowerCase(),
      priceRange: entity.priceRange || 'medium',
      rating: parseFloat(entity.ratingStars.length),
      distance: parseFloat(entity.distance) || 5
    };
    
    // Update affinity vector with learning rate
    const learningRate = interaction === 'like' ? 0.1 : -0.05;
    
    setUserAffinityVector(prev => {
      const updated = { ...prev };
      Object.entries(features).forEach(([key, value]) => {
        if (typeof value === 'string') {
          updated[`${key}_${value}`] = (updated[`${key}_${value}`] || 0) + learningRate;
        } else {
          updated[key] = (updated[key] || 0) + learningRate * value;
        }
      });
      
      localStorage.setItem('user-affinity', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLearnMore = async (entityId: string) => {
    try {
      const fullApiData = JSON.parse(localStorage.getItem('full-api-responses') || '[]');
      console.log('Entity ID:', entityId, 'Full API Data:', fullApiData); // Debug
      const entity = fullApiData.find(e => e.entity_id === entityId);
      if (!entity) {
        setError('Entity details not found. Try refreshing recommendations.');
        return;
      }
      const enhancedDetails = {
        ...entity,
        formattedHours: entity.properties?.hours ? Object.entries(entity.properties.hours).map(([day, times]) => ({
          day,
          times: times.map(t => `${formatTime(t.opens)} - ${formatTime(t.closes)}`).join(', ')
        })) : [],
        amenities: entity.tags?.filter(t => t.type.includes('amenity')).map(t => t.name) || [],
        offerings: entity.tags?.filter(t => t.type.includes('offerings')).map(t => t.name) || [],
        specialtyDishes: entity.properties?.specialty_dishes?.map(d => d.name) || [],
        priceRange: entity.properties?.price_range ? 
          `$${entity.properties.price_range.from}-${entity.properties.price_range.to}` : null
      };
      setEntityDetails(enhancedDetails);
      setShowEntityModal(true);
      console.log('Modal opened:', enhancedDetails, showEntityModal); // Debug
    } catch (error) {
      console.error('Error loading entity details:', error);
      setError('Failed to load details. Please try again.');
    }
  };

  // Distance calculation function (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Handle image upload and GPS validation
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('validating');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-gps', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok && result.latitude && result.longitude) {
        // Calculate distance from entity location
        const distance = calculateDistance(
          entityDetails.location.lat,
          entityDetails.location.lon,
          result.latitude,
          result.longitude
        );
        
        if (distance <= 20) {
          // Image is within 20km - accept it
          const imageUrl = URL.createObjectURL(file);
          setUploadedImage(imageUrl);
          setUploadStatus('success');
          
          // Store in cache with entity ID
          const cacheKey = `uploaded-image-${entityDetails.entityId}`;
          localStorage.setItem(cacheKey, imageUrl);
          
          setTimeout(() => setUploadStatus('idle'), 2000);
        } else {
          // Image is too far - reject it
          setUploadStatus('rejected');
          setTimeout(() => {
            setUploadStatus('idle');
            setUploadedImage(null);
          }, 3000);
        }
      } else {
        // No GPS data found
        setUploadStatus('rejected');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('rejected');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  // File input handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Check for cached image on component mount
  useEffect(() => {
    if (!entityDetails?.entityId) return;
    const cacheKey = `uploaded-image-${entityDetails.entityId}`;
    const cachedImage = localStorage.getItem(cacheKey);
    if (cachedImage) {
      setUploadedImage(cachedImage);
    }
  }, [entityDetails?.entityId]);
  
  const quickPrompts = [
      {
        prompt: "I'm feeling nostalgic today",
        icon:   "💭",
        color:  "from-purple-500 to-pink-500",
        mood:   'nostalgic',
        intent: 'experience',
        cacheKey: 'nostalgic-recs'
      },
      {
        prompt: (profile: typeof userProfile) => `Plan my weekend in ${userProfile.location.current || 'your area'}`,
        icon:   "📅",
        color:  "from-blue-500 to-cyan-500",
        mood:   'social',
        intent: 'discover'
      },
      {
        prompt: "I want to explore something completely new",
        icon:   "🚀",
        color:  "from-green-500 to-teal-500",
        mood:   'adventurous',
        intent: 'explore'
      }
    ];

  const handleHeartClick = async (entityId: string) => {
  setHeartAnimation(entityId);
  setTimeout(() => setHeartAnimation(null), 600);

  const wasLiked = likedPlaces.has(entityId);
  if (!wasLiked) {
    const newPoints = userPoints + 50;
    setUserPoints(newPoints);
    localStorage.setItem('user-points', JSON.stringify(newPoints));
  }

  updateUserAffinity(entityId, wasLiked ? 'unlike' : 'like');

  setLikedPlaces(prev => {
    const next = new Set(prev);
    const wasLiked = next.has(entityId);

    if (wasLiked) {
      next.delete(entityId);
    } else {
      next.add(entityId);
    }

    localStorage.setItem('liked-entities', JSON.stringify(Array.from(next)));

    // Generic reordering logic for any mode (if cache exists)
    const contextCacheKey = `recs-${currentMode}`;
    const cachedContext = localStorage.getItem(contextCacheKey);
    if (cachedContext) {
      try {
        const cached = JSON.parse(cachedContext);
        if (cached.length && cached[0]?.entityId) {
          setIsReordering(true);
          setTimeout(() => {
            const updatedInteractions = collectInteractionHistory();
            const reordered = reorderNostalgicRecommendations(cached, next, userAffinityVector, updatedInteractions);
            setRecommendations(reordered);
            localStorage.setItem(contextCacheKey, JSON.stringify(reordered));
            setTimeout(() => setIsReordering(false), 300);
          }, 200);
        }
      } catch (error) {
        console.error('Error reordering after like/unlike:', error);
        setIsReordering(false);
      }
    }

    return next;
  });
};

  const collectInteractionHistory = (): Array<{entity: any, liked: boolean, timestamp?: string}> => {
    const interactions = [];
    
    // Get liked entities from localStorage
    const likedIds = new Set(JSON.parse(localStorage.getItem('liked-entities') || '[]'));
    
    // Get full API responses (contains entity details)
    const fullApiData = JSON.parse(localStorage.getItem('full-api-responses') || '[]');
    
    // Get user affinity vector for additional context
    const affinityData = JSON.parse(localStorage.getItem('user-affinity') || '{}');
    
    // Create interactions from liked entities
    fullApiData.forEach(entity => {
      if (entity.entity_id) {
        interactions.push({
          entity: entity,
          liked: likedIds.has(entity.entity_id),
          timestamp: new Date().toISOString(),
          affinity: affinityData[entity.entity_id] || 0
        });
      }
    });
    
    // Add conversation-based implicit interactions
    const conversationHistory = JSON.parse(localStorage.getItem('conversation-history') || '[]');
    const mentionedEntities = extractEntitiesFromConversation(conversationHistory);
    
    mentionedEntities.forEach(entityName => {
      // Find matching entity in API data
      const matchedEntity = fullApiData.find(e => 
        e.name.toLowerCase().includes(entityName.toLowerCase())
      );
      if (matchedEntity && !interactions.find(i => i.entity.entity_id === matchedEntity.entity_id)) {
        interactions.push({
          entity: matchedEntity,
          liked: true, // Assume mentioned entities are liked
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return interactions;
  };

  // to extract entity names from conversation
  const extractEntitiesFromConversation = (history: Array<{role: string, content: string}>): string[] => {
    const entityNames = [];
    const userMessages = history.filter(h => h.role === 'user');
    
    userMessages.forEach(msg => {
      const words = msg.content.split(' ');
      words.forEach(word => {
        if (word.length > 3 && /^[A-Z]/.test(word)) {
          entityNames.push(word);
        }
      });
    });
    
    return [...new Set(entityNames)]; // Remove duplicates
  };

  const diversifyRecommendations = async (entities: any[], userPrefs: string[]) => {
    try {
      setIsDiversifying(true);
      console.log('Diversifying recommendations with interaction history...');
      
      // Collect interaction history
      const interactions = collectInteractionHistory();
      console.log('Collected interactions:', interactions.length);
      
      const response = await fetch('/api/diversify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entities: entities,
          userPreferences: userPrefs,
          interactions: interactions, // ADD THIS LINE
          options: {
            nTotal: 8,
            nHighAffinity: 3,
            lambdaParam: 0.7
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Diversification failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Diversification result:', result);

      if (result.success) {
        return result.data.diversified_recommendations;
      } else {
        throw new Error(result.error || 'Unknown diversification error');
      }
    } catch (error) {
      console.error('Diversification error:', error);
      return entities;
    } finally {
      setIsDiversifying(false);
    }
  };

  const formatResults = (entities: any[]) => {
    return entities.map(entity => {
      const city = entity.properties?.geocode?.city;
      const categoryTag = entity.tags?.find(t => t.type.includes('category'))?.name;
      const displayType = categoryTag || city || 'Unknown';

      const rating = entity.properties?.business_rating || 0;
      const fullStars = Math.floor(rating);
      const halfStar = rating - fullStars >= 0.5;
      const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '');

      const imageUrl =
        entity.images?.[0]?.url ||
        entity.properties?.images?.[0]?.url ||
        entity.properties?.images?.find(img => img.type === "urn:image:place:unknown")?.url ||
        null;

      const distanceMiles = entity.query?.distance
        ? (entity.query.distance / 1609.34).toFixed(1) + ' mi'
        : null;

      return {
        name:        entity.name,
        entityId:    entity.entity_id,
        type:        displayType,
        ratingStars: stars,
        image:       imageUrl,
        emoji:       imageUrl ? null : '🌟',
        description: entity.properties?.description,
        address:     entity.properties?.address,
        distance:    distanceMiles,
        affinity:    entity.query?.affinity
          ? Math.round(entity.query.affinity * 100) + '%'
          : '—',
      };
    });
  };
  
  const handleQuery = async (
  query: string,
  forcedMood?: 'nostalgic' | 'adventurous' | 'relaxed',
  forcedIntent?: string,
  skipLocationFilter: boolean = false
) => {
    if (!query.trim()) {
      console.log('No query entered');
      return setRecommendations([]);
    }
    console.log('User query:', query);

    const mood = forcedMood
    ? forcedMood
    : query.toLowerCase().includes('nostalgic')
    ? 'nostalgic'
    : query.toLowerCase().includes('adventurous')
    ? 'adventurous'
    : 'relaxed';
    const intent = forcedIntent || 'search';
    setCurrentMode(mood);

    const prompt = { mood, intent, context: query } as const;
    console.log('API prompt:', prompt);

    try {
      setIsLoading(true);

      if (!gamification.userProfiles.has(userProfile.userId)) {
        await gamification.createUserProfile(mockUser);
      }

      const locationArg = skipLocationFilter ? undefined : userProfile.location.current;
      const recPayload = await gamification.getContextualRecommendations(
        userProfile.userId,
        prompt,
        locationArg
      );
      console.log('API response:', recPayload);
      localStorage.setItem('full-api-responses', JSON.stringify(recPayload.entities || []));
      
      // Raw entity extraction
      // Dynamically extract entities based on response structure / forcedIntent
      const raw = recPayload as any;
      let entities = [];

      if (mood === 'adventurous' && raw.adventures?.results?.entities) {
        entities = raw.adventures.results.entities;
      } else if (Array.isArray(raw.entities)) {
        entities = raw.entities;
      } else if (raw.heritage || raw.cuisine) {
        entities = [
          ...(raw.heritage?.results?.entities || []),
          ...(raw.cuisine?.results?.entities || []),
        ];
      }
      // dedupe:
      const uniqueEntities = Array.from(
        new Map(entities.map(e => [e.entity_id, e])).values()
      );
      console.log('Extracted entities:', uniqueEntities);
      const userPrefs = [
          ...(userProfile.preferences?.cuisines || []),
          ...(userProfile.preferences?.culturalInterests || []),
          query
        ];
      // Diversification
      setResults(uniqueEntities); // render immediately
      setFormattedRecommendations(formatResults(uniqueEntities));
      if (diversificationEnabled && uniqueEntities.length > 0) {
  console.log('Starting background diversification...');
  diversifyRecommendations(uniqueEntities, userPrefs)
    .then((diversified) => {
      console.log('Updated results with diversification.');
      setResults(diversified);
      setFormattedRecommendations(formatResults(diversified)); // Replace UI view
    })
    .catch(() => {
      console.warn('Diversification failed, retaining original results.');
    });
}

      // SPECIAL “nostalgic” branch: shuffle, cache, format & exit
      if (mood === 'nostalgic') {
  const likedIds = new Set(JSON.parse(localStorage.getItem('liked-entities') || '[]'));

  // 1. Format all entities first
  const formatted = uniqueEntities.map(entity => {
    const city = entity.properties?.geocode?.city;
    const categoryTag = entity.tags?.find(t => t.type.includes('category'))?.name;
    const displayType = categoryTag || city || 'Unknown';
    const rating = entity.properties?.business_rating || 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '');
    const imageUrl =
      entity.images?.[0]?.url ||
      entity.properties?.images?.[0]?.url ||
      null;
    const distanceMiles = entity.query?.distance
      ? (entity.query.distance / 1609.34).toFixed(1) + ' mi'
      : null;

    return {
      name:        entity.name,
      entityId:    entity.entity_id,
      type:        displayType,
      ratingStars: stars,
      image:       imageUrl,
      emoji:       imageUrl ? null : '🌟',
      description: entity.properties?.description,
      address:     entity.properties?.address,
      distance:    distanceMiles,
      affinity:    entity.query?.affinity
        ? Math.round(entity.query.affinity * 100) + '%'
        : '—',
    };
  });

  // 2. Use the helper function to reorder
  const reordered = reorderNostalgicRecommendations(formatted, likedIds, userAffinityVector);
  
  const contextCacheKey = `recs-${mood}`;
  localStorage.setItem(contextCacheKey, JSON.stringify(formatted));
  setRecommendations(reordered);
  return;
}
      
      // “Plan my weekend in ___ chat branch
      if (intent === 'discover' && mood === 'social') {
        // 1) filter for weekend‑open & vegetarian
        const weekendOpen = uniqueEntities.filter(e => {
          const hrs = e.properties?.hours || {};
          const saturdayOpen = hrs.Saturday && hrs.Saturday.length > 0;
          const sundayOpen = hrs.Sunday && hrs.Sunday.length > 0;
          return saturdayOpen && sundayOpen;
        });
        
        const vegOnly = weekendOpen.filter(e =>
          e.tags?.some(t => /vegetarian|vegan/i.test(t.name)) ||
          e.properties?.description?.toLowerCase().includes('vegetarian')
        );
        
        // 2) take top 3
        const top3 = vegOnly.slice(0, 3);
        
        // 3) Format hours properly
        const summary = top3.map(e => {
          const satHours = e.properties.hours?.Saturday?.[0];
          const sunHours = e.properties.hours?.Sunday?.[0];
    
        return `
        - ${e.name}
          • ${e.properties?.address || 'Address not available'}
          • Hours: Sat ${formatTime(satHours?.opens)}–${formatTime(satHours?.closes)}, Sun ${formatTime(sunHours?.opens)}–${formatTime(sunHours?.closes)}
          • ${e.properties?.description || 'No description available'}
        `;
          }).join('\n');
          
          // 4) invoke chat
          await handleChat(`Plan my weekend in ${userProfile.location.current}. Here are some vegetarian-friendly options that are open on weekends:${summary}`);
          return;
        }
      
      // Default “discover” / other moods → map & render cards
      const formattedRecommendations = uniqueEntities.map(entity => {
        // human‑readable “type”:
        const city = entity.properties?.geocode?.city;
        const categoryTag = entity.tags?.find(t => t.type.includes('category'))?.name;
        const displayType = categoryTag || city || 'Unknown';

        // star rating ★★★★½ from business_rating
        const rating = entity.properties?.business_rating || 0;
        const fullStars = Math.floor(rating);
        const halfStar = rating - fullStars >= 0.5;
        const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '');

        // pick an image if available
        const imageUrl =
          entity.images?.[0]?.url ||
          entity.properties?.images?.[0]?.url ||
          entity.properties?.images?.find(img => img.type === "urn:image:place:unknown")?.url ||
          null;

        // distance in miles
        const distanceMiles = entity.query?.distance
          ? (entity.query.distance / 1609.34).toFixed(1) + ' mi'
          : null;

        return {
          name:        entity.name,
          entityId:    entity.entity_id,
          type:        displayType,
          ratingStars: stars,
          image:       imageUrl,
          emoji:       imageUrl ? null : '🌟',
          description: entity.properties?.description,
          address:     entity.properties?.address,
          distance:    distanceMiles,
          affinity:    entity.query?.affinity
      ? Math.round(entity.query.affinity * 100) + '%'
      : '—',
        };
      });

      console.log('Formatted recommendations:', formattedRecommendations);
      setRecommendations(formattedRecommendations);
      const contextCacheKey = `recs-${mood}`;
      localStorage.setItem(contextCacheKey, JSON.stringify(formattedRecommendations));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError('Failed to fetch recommendations. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNostalgic = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    if (cached.length && cached[0]?.entityId) {
      const currentLikes = new Set(JSON.parse(localStorage.getItem('liked-entities') || '[]'));
      const reordered = reorderNostalgicRecommendations(cached, currentLikes, userAffinityVector);
      setRecommendations(reordered);
      // Update cache with new order
      localStorage.setItem(CACHE_KEY, JSON.stringify(reordered));
    } else {
      throw new Error("Invalid nostalgic cache");
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
    handleQuery("I'm feeling nostalgic today", 'nostalgic', 'experience');
  }
};

const playTextToSpeech = async (text: string) => {
  try {
    setIsPlayingAudio(true);
    setShowPhoto(true);
    
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.removeEventListener('ended', handleAudioEnd);
      currentAudio.removeEventListener('error', handleAudioError);
    }

    console.log('Starting TTS for:', text.substring(0, 50) + '...');

    // Call our server-side TTS API
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.status}`);
    }

    console.log('TTS API response received');

    // Get the audio blob from the response
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('Audio URL created:', audioUrl);
    
    const audio = new Audio(audioUrl);
    
    // Set volume and preload
    audio.volume = 1.0;
    audio.preload = 'auto';
    
    setCurrentAudio(audio);

    // Define event handlers to avoid multiple bindings
    const handleAudioEnd = () => {
      console.log('Audio playback ended');
      setIsPlayingAudio(false);
      
      // Show photo and stop video after audio ends
      setTimeout(() => {
        setShowPhoto(true);
        if (videoRef.current && !isStreaming) {
          videoRef.current.pause();
          setIsVideoPlaying(false);
        }
      }, 2000);
      
      URL.revokeObjectURL(audioUrl);
      setCurrentAudio(null);
    };

    const handleAudioError = (e: any) => {
      console.error('Audio error:', e);
      setIsPlayingAudio(false);
      if (videoRef.current) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
      URL.revokeObjectURL(audioUrl);
      setCurrentAudio(null);
    };

    // Add event listeners with proper cleanup
    audio.addEventListener('loadstart', () => console.log('Audio loading started'));
    audio.addEventListener('canplay', () => console.log('Audio can start playing'));
    audio.addEventListener('playing', () => {
      console.log('Audio is playing');
      setShowPhoto(false); // Hide photo, show video
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(console.log);
      }
    });
    audio.addEventListener('error', handleAudioError, { once: true });
    audio.addEventListener('ended', handleAudioEnd, { once: true });

    // Load the audio and wait for it to be ready
    audio.load();
    
    // Wait for audio to be ready to play
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio load timeout'));
      }, 6000);

      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout);
        resolve(true);
      }, { once: true });

      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Audio load failed'));
      }, { once: true });
    });
    
    // Play audio
    await audio.play();
    console.log('Audio playbook started');

  } catch (error) {
    console.error('Error playing TTS:', error);
    setIsPlayingAudio(false);
    setShowPhoto(true); // Show photo on error
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  }
};

// Fixed video event handlers
const handleVideoLoadedData = () => {
  const video = videoRef.current;
  if (video) {
    video.playbackRate = 0.9;
    video.currentTime = 0;
    video.volume = 0.3;
    video.muted = false;
    
    // Don't auto-start video, wait for audio
    if (isPlayingAudio) {
      setShowPhoto(false); // Hide photo when starting video
      setIsVideoPlaying(true);
      playVideoSafely();
    }
  }
};

const playVideoSafely = async () => {
  const video = videoRef.current;
  if (!video) return;

  try {
    if (video.paused && !showPhoto) {
      await video.play();
      console.log('Video playing successfully');
      setIsVideoPlaying(true);
    }
  } catch (error) {
    console.warn('Video play failed, will retry...', error);
    setTimeout(() => {
      if (video && (isStreaming || isPlayingAudio) && video.paused && !showPhoto) {
        playVideoSafely();
      }
    }, 200);
  }
};

const handleVideoEnded = () => {
  const video = videoRef.current;
  if (video && (isStreaming || isPlayingAudio) && !showPhoto) {
    video.currentTime = 0;
    playVideoSafely();
  } else if (!isPlayingAudio && !isStreaming) {
    setShowPhoto(true); // Show photo when video stops
    setIsVideoPlaying(false);
  }
};

const handleVideoError = (error: any) => {
  console.log('Video error:', error);
  const video = videoRef.current;
  
  if (video && (isStreaming || isPlayingAudio)) {
    // Try to recover from error
    setTimeout(() => {
      video.load();
      setTimeout(() => {
        if (isStreaming || isPlayingAudio) {
          playVideoSafely();
        }
      }, 200);
    }, 500);
  } else {
    setIsVideoPlaying(false);
  }
};

  // Update the handleChat function with better context:
const handleChat = async (message: string) => {
  setChatOutput('');
  setIsStreaming(true);
  setTextBuffer('');
  setLastProcessedLength(0);
  setShowPhoto(true);

  // Add to conversation history
  const newHistory = [...conversationHistory, { role: 'user', content: message }];
  setConversationHistory(newHistory);
  localStorage.setItem('conversation-history', JSON.stringify(newHistory));

  // Cycle through videos
  const nextVideoIndex = Math.floor(Math.random() * 2);
  setCurrentVideoIndex(nextVideoIndex);
  
  // Start video when streaming begins
  if (videoRef.current) {
    const video = videoRef.current;
    video.currentTime = 0;
    setIsVideoPlaying(true);
  }

  // Enhanced context with full API response data
  let contextMessage = message;
  let apiContext = '';

  if (formattedRecommendations.length > 0) {
    const fullApiData = JSON.parse(localStorage.getItem('full-api-responses') || '[]');

    apiContext = fullApiData.map(entity => {
      const lines = [
        `Entity: ${entity.name} (${entity.entity_id})`,
        entity.properties?.description && `- Description: ${entity.properties.description}`,
        entity.properties?.address && `- Address: ${entity.properties.address}`,
        entity.properties?.business_rating && `- Rating: ${entity.properties.business_rating}`,
        entity.properties?.phone && `- Phone: ${entity.properties.phone}`,
        entity.properties?.website && `- Website: ${entity.properties.website}`,
        entity.properties?.menu_url && `- Menu: ${entity.properties.menu_url}`,
        entity.properties?.hours && Object.keys(entity.properties.hours).length > 0 &&
          `- Hours: ${JSON.stringify(entity.properties.hours)}`,
        entity.properties?.specialty_dishes?.length > 0 &&
          `- Specialty Dishes: ${entity.properties.specialty_dishes.map(d => d.name).join(', ')}`,
        entity.properties?.price_range?.from && entity.properties?.price_range?.to &&
          `- Price Range: $${entity.properties.price_range.from}-${entity.properties.price_range.to} ${entity.properties.price_range.currency || ''}`,
        entity.properties?.good_for?.length > 0 &&
          `- Good For: ${entity.properties.good_for.map(g => g.name).join(', ')}`,
        entity.tags?.filter(t => t.type.includes('amenity')).length > 0 &&
          `- Amenities: ${entity.tags.filter(t => t.type.includes('amenity')).map(t => t.name).join(', ')}`,
        entity.tags?.filter(t => t.type.includes('offerings')).length > 0 &&
          `- Offerings: ${entity.tags.filter(t => t.type.includes('offerings')).map(t => t.name).join(', ')}`,
      ];

      // Remove falsy/null/undefined lines
      return lines.filter(Boolean).join('\n');
    }).join('\n\n');
  }

  const userContext = `
User Profile: ${userProfile.name}
- Age: ${userProfile.demographics.age}
- Gender: ${userProfile.demographics.gender}
- Ethnicity: ${userProfile.demographics.ethnicity}
- Vegetarian: ${userProfile.preferences.isVegetarian}
- Preferred Cuisines: ${userProfile.preferences.cuisines.join(', ')}
- Cultural Interests: ${userProfile.preferences.culturalInterests.join(', ')}
- Travel Style: ${userProfile.preferences.travelStyle}
- Current Streak: ${userProfile.currentStreak.count} days of ${userProfile.currentStreak.type}
`;

  contextMessage = `You are Sahayak, a friendly cultural guide for new migrants to ${userProfile?.location?.current || 'their city'}. 
${userContext}

User Query: ${message}

Previous Conversation (last 4 exchanges):
${conversationHistory.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n')}

Current Recommendations Context:
${apiContext}

Current day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

Instructions:
- Reference previous conversation naturally
- Reference user's cultural background (${userProfile.demographics.ethnicity}) and preferences naturally
- Use specific details from the API data when discussing places
- Include hours, menu items, prices, and amenities when relevant
- Be conversational and helpful
- Acknowledge their ${userProfile.currentStreak.count}-day exploration streak
- Use their travel style (${userProfile.preferences.travelStyle}) to tailor recommendations
- If asked about specific dishes, use the specialty_dishes data
- If asked about timing, reference the hours data
- Keep responses concise but informative (under 200 words for TTS)`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: contextMessage })
  });
  
  if (!res.ok) throw new Error('Chat API failed');

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let responseContent = '';
  let ttsStarted = false;
  let partial = '';
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunk = decoder.decode(value || new Uint8Array(), { stream: true });

    partial += chunk;
    const lines = partial.split('\n');
    partial = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice('data: '.length);
      if (json === '[DONE]') {
        done = true;
        break;
      }

      try {
        const parsed = JSON.parse(json);
        const token = parsed.choices[0].delta?.content;
        if (token) {
          responseContent += token;
          setChatOutput((prev) => prev + token);
        }
      } catch {
        // malformed line, skip
      }
    }
  }

  // streaming is done
  setIsStreaming(false);

  // play the full text
  playTextToSpeech(responseContent);

  // Add assistant response to history
  const finalHistory = [...newHistory, { role: 'assistant', content: responseContent }];
  setConversationHistory(finalHistory);
  localStorage.setItem('conversation-history', JSON.stringify(finalHistory));
  
  // If no TTS and no audio, stop video after streaming ends
  if (!ttsStarted && !isPlayingAudio) {
      setTimeout(() => {
        if (videoRef.current && !isPlayingAudio) {
          videoRef.current.pause();
          setIsVideoPlaying(false);
        }
      }, 1000);
    }
  };

  // Add cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.removeEventListener('ended', () => {});
        currentAudio.removeEventListener('error', () => {});
        URL.revokeObjectURL(currentAudio.src);
      }
      
      // Cleanup video on unmount
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [currentAudio]);

  const handleSpin = () => {
    if (userPoints < 100) return;
    
    setIsSpinning(true);
    
    // Deduct points immediately
    const newPoints = userPoints - 100;
    setUserPoints(newPoints);
    
    setTimeout(() => {
      const rewards = [
        { type: 'discount', value: '15% off', description: '15% off next booking', points: 0 },
        { type: 'points', value: '500', description: '500 culture points', points: 500 },
        { type: 'experience', value: 'guide', description: 'Free cultural guide', points: 0 }
      ];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      
      // Add bonus points if reward is points
      if (reward.points > 0) {
        setUserPoints(prev => prev + reward.points);
      }
      
      setSpinResult(reward);
      setIsSpinning(false);
    }, 4000);
  };

  const getProgressPercentage = () => {
    const nextLevelPoints = userProfile.level * 1000;
    const currentLevelProgress = userPoints % 1000;
  return (currentLevelProgress / 1000) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900">
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowProfileModal(false)}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={e => {
              e.preventDefault();
              localStorage.setItem('qloo-user-profile', JSON.stringify(profileForm));
              const updated = {
                ...userProfile,
                ...profileForm,
                location: { ...userProfile.location, current: profileForm.location.current },
                preferences: { ...userProfile.preferences, ...profileForm.preferences }
              };
              gamification.registerUserProfile(updated);
              setUserProfile(prev => ({ ...prev, ...profileForm }));
              setShowProfileModal(false);
            }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-lg space-y-6 transform scale-95 opacity-0 animate-modal-in"
          >
            <h2 className="text-2xl font-bold">Edit Your Profile</h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <select
                  value={profileForm.demographics.age}
                  onChange={e => setProfileForm(f => ({
                    ...f,
                    demographics: { ...f.demographics, age: e.target.value }
                  }))}
                  className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="35_and_younger">35 and younger</option>
                  <option value="36_to_55">36 to 55</option>
                  <option value="55_and_older">55 and older</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  value={profileForm.demographics.gender}
                  onChange={e => setProfileForm(f => ({
                    ...f,
                    demographics: { ...f.demographics, gender: e.target.value }
                  }))}
                  className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            {/* Ethnicity / Cultural Background */}
            <div>
              <label className="block text-sm font-medium mb-1">Cultural Background</label>
              <select
                value={profileForm.demographics.ethnicity}
                onChange={e =>
                  setProfileForm(f => ({
                    ...f,
                    demographics: { ...f.demographics, ethnicity: e.target.value }
                  }))
                }
                className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Select one...</option>
                <option value="Hispanic">Hispanic / Latino</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Indian">Indian</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="English">English</option>
                <option value="Other">Other / Prefer not to say</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-1">Current Location</label>
              <input
                type="text"
                value={profileForm.location.current}
                onChange={e => setProfileForm(f => ({
                  ...f,
                  location: { current: e.target.value }
                }))}
                className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
                placeholder="e.g. Austin, TX"
              />
            </div>

            {/* Multi‑select tags: cuisines, culturalInterests, nostalgicPeriods */}
            {[
              { key: 'cuisines', label: 'Favorite Cuisines' },
              { key: 'culturalInterests', label: 'Cultural Interests' },
              { key: 'nostalgicPeriods', label: 'Nostalgic Periods' }
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="text"
                  value={(profileForm.preferences as any)[key].join(', ')}
                  onChange={e => {
                    const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setProfileForm(f => ({
                      ...f,
                      preferences: { ...f.preferences, [key]: arr }
                    }));
                  }}
                  className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
                  placeholder={`e.g. Indian, Thai, Italian`}
                />
                <p className="text-xs text-gray-500 mt-1">Comma‑separated</p>
              </div>
            ))}

            {/* Travel Style */}
            <div>
              <label className="block text-sm font-medium mb-1">Travel Style</label>
              <select
                value={profileForm.preferences.travelStyle}
                onChange={e => setProfileForm(f => ({
                  ...f,
                  preferences: { ...f.preferences, travelStyle: e.target.value }
                }))}
                className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300"
              >
                <option value="budget">Budget</option>
                <option value="luxury">Luxury</option>
                <option value="authentic">Authentic</option>
                <option value="modern">Modern</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-teal-600 text-white hover:bg-indigo-700 transition"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <Image
                  src="/qloo_assets/images/image.webp"
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="object-cover w-18 h-18"
                />
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">CulturalQuest</h1>
                <p className="text-purple-200 text-sm">Discover. Explore. Achieve.</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold">{userPoints.toLocaleString()}</span>
              </div>
                            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold">Level {userLevel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
          {[
            { id: 'home', icon: Compass, label: 'Explore' },
            { id: 'progress', icon: Trophy, label: 'Progress' },
            { id: 'rewards', icon: Gift, label: 'Rewards' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-white text-purple-900 shadow-lg' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {error && <p className="text-red-400">{error}</p>}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* User Greeting & Context */}
            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <button
                onClick={() => setShowProfileModal(true)}
                className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-sm transition transform hover:scale-105">
                ✏️ Edit Profile
              </button>
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-2xl">
                  👋
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{greeting}, {userProfile.name}!</h2>
                  <div className="relative min-h-[1.5em] py-1 max-w-full">
                    <div className="transition-all duration-700 ease-in-out animate-fade-slide absolute inset-0">
                      <p className="text-purple-200 whitespace-nowrap overflow-visible text-ellipsis">
                        {subtitles[subtitleIndex]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-purple-200">{userProfile.currentStreak.count} day streak</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-purple-200">{userProfile.location.current}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-sm text-purple-200 mt-2">
              {(userLevel * 1000 - userPoints).toLocaleString()} points to level {userLevel + 1}
              </p>
            </div>

            {/* AI Chat Interface */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">What is on your mind today?</h3>
              <div className="flex items-center space-x-2 mb-4">
                {isDiversifying && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-xs">Diversifying...</span>
                  </div>
                )}
              </div>
              {/* Quick Prompt Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {quickPrompts.map((s, idx) => {
                    const resolvedPrompt = typeof s.prompt === 'function' ? s.prompt(userProfile) : s.prompt;
                    const isLoading = quickPromptLoading === resolvedPrompt;

                    return (
                      <button
                        key={idx}
                        onClick={async () => {
                          setQuickPromptLoading(resolvedPrompt);
                          setUserInput(resolvedPrompt);

                          try {
                            if (s.mood === 'nostalgic') {
                              await loadNostalgic();
                            } else {
                              await handleQuery(resolvedPrompt, s.mood, s.intent);
                            }
                          } finally {
                            setQuickPromptLoading(null);
                          }
                        }}
                        disabled={isLoading}
                        className={`
                          w-full bg-gradient-to-r ${s.color}
                          rounded-2xl px-6 py-6 text-white hover:scale-105 transition-all duration-200
                          flex flex-col items-center justify-center
                          min-h-[140px] text-center
                          ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="text-2xl mb-2">{s.icon}</div>
                        <p className="font-medium text-base md:text-lg leading-snug">{resolvedPrompt}</p>
                      </button>
                    );
                  })}
                </div>

              {/* Custom Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Tell me how you're feeling or what you want to explore..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-purple-300 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={() => {
                    setIsLoading(true);
                    handleQuery(userInput, undefined, undefined, true).finally(() => setIsLoading(false));
                  }}
                  disabled={isLoading}
                  className="relative bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-4 rounded-2xl hover:scale-105 transition-transform duration-200 font-semibold disabled:opacity-75"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                    </div>
                  ) : (
                    'Discover'
                  )}
                </button>
                
                <button
                  onClick={() => handleChat(userInput)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-6 py-4 rounded-2xl hover:scale-105 transition-transform duration-200 font-semibold"
                >
                  Chat
                </button>
              </div>
            </div>

            {/* Chat Output with Video */}
            {chatOutput && (
              <div className="relative w-full h-screen overflow-hidden rounded-3xl">
                {/* Background Video/Photo Layer */}
            <div className="absolute inset-0 z-0">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full max-w-none">
                    {/* Photo Layer */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${
                      showPhoto ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <Image
                        src="/qloo_assets/images/reading.png"
                        alt="Assistant Avatar"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>

                    {/* Video Layer */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${
                      showPhoto ? 'opacity-0' : 'opacity-100'
                    }`}>
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover scale-100 -translate-x-[-15%]"
                        muted={false}
                        autoPlay={false}
                        loop={false}
                        playsInline
                        onLoadedData={handleVideoLoadedData}
                        onEnded={handleVideoEnded}
                        onError={handleVideoError}
                        onPause={() => {
                          if ((isStreaming || isPlayingAudio) && videoRef.current && !showPhoto) {
                            setTimeout(() => playVideoSafely(), 100);
                          }
                        }}
                      >
                        <source src={`/qloo_assets/videos/vid${currentVideoIndex + 1}.mp4`} type="video/mp4" />
                      </video>
                    </div>

                    {/* Subtle overlay to boost contrast */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30 z-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 z-10"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Panel on Left */}
            <div className="relative z-10 h-full flex">
              <div className="w-2/5 max-w-lg h-full flex flex-col">
                <div className="flex-1 backdrop-blur-xl bg-black/30 border-r border-white/10">
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white">Sahayak</h2>
                    <p className="text-white/60 text-sm mt-1">Your personalized cultural assistant</p>
                    
                    {/* Audio Status Indicator */}
                    {isPlayingAudio && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-xs">Speaking...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto max-h-[80vh] min-h-0">
                    <div className="space-y-4">
                      <div className="flex space-x-3">
                        <div className="flex-1">
                          <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                            <pre className="text-white whitespace-pre-wrap break-words font-mono leading-relaxed">
                              {chatOutput}
                              {isStreaming && <span className="animate-pulse text-purple-400">▋</span>}
                            </pre>
                          </div>
                          <div className="text-xs text-white/40 mt-2 flex items-center space-x-2">
                            <span>Just now</span>
                            {isStreaming && (
                              <>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                  <span>Thinking</span>
                                  <span className="flex space-x-1">
                                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
                                    <div className="w-1 h-1 bg-pink-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                                  </span>
                                </span>
                              </>
                            )}
                            {isPlayingAudio && (
                              <>
                                <span>•</span>
                                <span className="flex items-center space-x-1 text-green-400">
                                  <span>Speaking</span>
                                  <div className="flex space-x-1">
                                    <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                                    <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce delay-150"></div>
                                  </div>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Ambient Glow Effects */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
        )}

            {/* Recommendations */}
            {formattedRecommendations.length > 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">✨ Curated just for you</h3>
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 ${
                    isReordering ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                  }`}>
                    {formattedRecommendations.map((rec, i) => (
                      rec.entityId ? (
                        <div 
                          key={`${rec.entityId}-${i}`} 
                          className={`relative bg-white/10 rounded-2xl p-4 shadow-lg flex flex-col transition-all duration-500 ${
                            isReordering ? 'transform translate-y-2' : 'transform translate-y-0'
                          }`}
                          style={{
                            transitionDelay: `${i * 50}ms` // Staggered animation
                          }}
                        >
                      {/* Image with Error Handling */}
                    {rec.image && !imageErrors.has(rec.entityId) ? (
                      <Image
                        src={rec.image}
                        alt={rec.name}
                        width={400}
                        height={180}
                        className="w-full h-32 object-cover rounded-xl mb-3"
                        unoptimized
                        onError={async () => {
                          // Double-check the URL before marking as error
                          const isValid = await checkImageUrl(rec.image);
                          if (!isValid) {
                            handleImageError(rec.entityId);
                          }
                        }}
                        onLoad={async (e) => {
                          // Check if the loaded image is actually the oops.png
                          const img = e.target as HTMLImageElement;
                          if (img.src.includes('oops.png') || img.naturalWidth === 1 || img.naturalHeight === 1) {
                            handleImageError(rec.entityId);
                          }
                        }}
                      />
                    ) : (
                      <Image
                        src="/qloo_assets/images/image.webp"
                        alt={rec.name}
                        width={400}
                        height={180}
                        className="w-full h-32 object-cover rounded-xl mb-3"
                      />
                    )}

                      {/* 2) Title + Type */}
                      <h4 className="text-lg font-semibold">{rec.name}</h4>
                      <p className="text-sm text-gray-300 mb-1">{rec.type}</p>

                      {/* 3) Stars + Affinity */}
                      <p className="text-sm mb-1">
                        <span className="text-yellow-400">{rec.ratingStars}</span>
                        {' '}· {rec.affinity} match
                      </p>

                      {/* 4) Optional distance or address */}
                      {rec.distance && <p className="text-xs">{rec.distance}</p>}

                      {/* 5) Description */}
                      <p className="text-xs line-clamp-2 my-2">{rec.description}</p>

                      {/* 6) Learn More */}
                      <button
                        onClick={() => handleLearnMore(rec.entityId)}
                        className="mt-auto bg-gradient-to-r from-green-400 to-blue-500 py-2 rounded-xl text-sm hover:scale-105 transition-transform"
                      >
                        Learn More
                      </button>

                      {/* 7) Like Button */}
                      <button
                      className={`absolute top-3 right-3 p-1 rounded-full transition-all duration-300 transform ${
                        likedPlaces.has(rec.entityId) 
                          ? 'bg-red-500 scale-110' 
                          : 'bg-white/20 hover:bg-white/30'
                      } ${
                        heartAnimation === rec.entityId 
                          ? 'animate-pulse scale-125' 
                          : ''
                      }`}
                      onClick={() => handleHeartClick(rec.entityId)}
                    >
                      <Heart 
                        className={`w-5 h-5 transition-all duration-300 ${
                          likedPlaces.has(rec.entityId) 
                            ? 'text-white fill-current' 
                            : 'text-white'
                        } ${
                          heartAnimation === rec.entityId 
                            ? 'animate-bounce' 
                            : ''
                        }`} 
                      />
                    </button>
                  </div>
                ) : null
              ))}
              {showEntityModal && entityDetails && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
              <div className="flex justify-center min-h-screen p-6 pt-120">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-4xl w-full">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{entityDetails.name}</h2>
                      </div>
                      <button
                        onClick={() => setShowEntityModal(false)}
                        className="text-white hover:text-red-400 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

        {/* Image with Error Handling */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Original Image */}
          <div className="flex-1">
            {entityDetails.image && !imageErrors.has(entityDetails.entityId) ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
                <Image
                  src={entityDetails.image}
                  alt={entityDetails.name}
                  fill
                  className="object-contain"
                  unoptimized
                  onError={() => handleImageError(entityDetails.entityId)}
                />
              </div>
            ) : (
              <div>
                <Image
                  src="/qloo_assets/images/image_expanded.jpg"
                  alt={entityDetails.name}
                  width={600}
                  height={300}
                  className="w-full h-64 object-cover rounded-2xl"
                />
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="flex-1">
            <div className="relative">
              {/* Upload Area */}
              <div className={`
                relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-300
                ${uploadStatus === 'validating' ? 'border-yellow-400 bg-yellow-400/10' : ''}
                ${uploadStatus === 'success' ? 'border-green-400 bg-green-400/10' : ''}
                ${uploadStatus === 'rejected' ? 'border-red-400 bg-red-400/10' : 'border-purple-400/50 bg-white/5'}
              `}>
                {uploadedImage ? (
                  <Image
                    src={uploadedImage}
                    alt="Uploaded image"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="mb-4">
                      <svg className="w-12 h-12 text-purple-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-2">Add Your Photo</h3>
                    <p className="text-purple-200 text-sm mb-4">Share a photo taken at this location</p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
                      >
                        Upload Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Animations */}
              {uploadStatus === 'validating' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                  <div className="flex items-center gap-3 text-yellow-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent"></div>
                    <span>Validating location...</span>
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                  <div className="flex items-center gap-3 text-green-400 animate-pulse">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Photo accepted!</span>
                  </div>
                </div>
              )}

              {uploadStatus === 'rejected' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                  <div className="flex flex-col items-center gap-2 text-red-400 animate-bounce">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-center">Photo too far from location</span>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
            </div>

            {/* Upload Info */}
            <div className="mt-3 text-xs text-purple-300 text-center">
              Photos must be taken within 20km of this location
            </div>
          </div>
        </div>

        {/* Enhanced Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Hours */}
          {entityDetails.formattedHours?.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-2">Hours</h3>
              <div className="space-y-1">
                {entityDetails.formattedHours.map(hour => (
                  <div key={hour.day} className="flex justify-between text-sm">
                    <span className="text-purple-200">{hour.day}:</span>
                    <span className="text-white">{hour.times}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          {entityDetails.priceRange && (
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-2">Price Range</h3>
              <p className="text-green-400 text-lg">{entityDetails.priceRange}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-2">Contact</h3>
            {entityDetails.properties?.phone && (
              <p className="text-purple-200 text-sm mb-1">{entityDetails.properties.phone}</p>
            )}
          </div>

          {/* Menu Link */}
          {entityDetails.properties?.menu_url && (
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-2">Menu</h3>
              <a href={entityDetails.properties.menu_url} target="_blank" rel="noopener noreferrer"
                 className="text-green-400 hover:text-green-300 text-sm">
                View Menu
              </a>
            </div>
          )}
        </div>

        {/* Specialty Dishes */}
        {entityDetails.specialtyDishes?.length > 0 && (
          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-2">Specialty Dishes</h3>
            <div className="flex flex-wrap gap-2">
              {entityDetails.specialtyDishes.map((dish, idx) => (
                <span key={idx} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs">
                  {dish}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Amenities & Offerings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {entityDetails.amenities?.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-1">
                {entityDetails.amenities.map((amenity, idx) => (
                  <span key={idx} className="bg-blue-500/20 text-blue-200 px-2 py-1 rounded text-xs">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {entityDetails.offerings?.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-2">Offerings</h3>
              <div className="flex flex-wrap gap-1">
                {entityDetails.offerings.map((offering, idx) => (
                  <span key={idx} className="bg-green-500/20 text-green-200 px-2 py-1 rounded text-xs">
                    {offering}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {entityDetails.description && (
          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-2">Description</h3>
            <p className="text-purple-200 leading-relaxed">{entityDetails.description}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => handleHeartClick(entityDetails.entityId)}
            className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
              likedPlaces.has(entityDetails.entityId)
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {likedPlaces.has(entityDetails.entityId) ? '❤️ Liked' : '🤍 Add to Favorites'}
          </button>
          
          <button
            onClick={() => {
              if (entityDetails.properties?.website) {
                window.open(entityDetails.properties.website, '_blank');
              }
              console.log('Viewed entity details:', entityDetails.entityId);
              setShowEntityModal(false);
            }}
            disabled={!entityDetails.properties?.website}
            className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
              entityDetails.properties?.website
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Visit Now
          </button>

                  </div>
                </div>
              </div>
            </div>
            </div>
          )}
          </div>
          </div>
            ) 
            : (
              <p className="text-purple-200"></p>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {(activeTab === 'progress') && (
          <div className="space-y-6">
            {/* Badges Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                Your Badges ({mockUser.badges.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockUser.badges.map((badge, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-400/30 text-center">
                    <div className="text-4xl mb-3">{badge.icon}</div>
                    <h4 className="font-bold text-white mb-2">{badge.name}</h4>
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                      {badge.category}
                    </span>
                  </div>
                ))}
                
                <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-3 opacity-50">🔒</div>
                  <h4 className="font-bold text-purple-200 mb-2">Cultural Bridge Builder</h4>
                  <p className="text-sm text-purple-300">Visit 2 more heritage sites</p>
                  <div className="mt-3 bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full" style={{width: '80%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Heritage Sites', value: mockUser.achievements.heritageVisits, icon: '🏛️', color: 'from-blue-500 to-purple-500' },
                { label: 'Festivals Joined', value: mockUser.achievements.festivalParticipation, icon: '🎉', color: 'from-orange-500 to-red-500' },
                { label: 'Cuisines Tried', value: mockUser.achievements.cuisinesTried.length, icon: '🍛', color: 'from-green-500 to-teal-500' },
                { label: 'Cultures Explored', value: mockUser.achievements.culturesExplored.length, icon: '🌍', color: 'from-pink-500 to-purple-500' }
              ].map((stat, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white`}>
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm opacity-90">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Cultural Journey Map */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Your Cultural Journey</h3>
              <div className="flex flex-wrap gap-2">
                {mockUser.achievements.culturesExplored.map((culture, idx) => (
                  <span key={idx} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm">
                    {culture}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Spin Wheel + Floating Image Section */}
            <div className="relative">
              {/* Floating Character Image (bottom-right) */}
              <Image
                src="/qloo_assets/images/prize.png"
                alt="Prize character"
                className="hidden lg:block absolute bottom-0 right-0 w-80 object-contain z-10 pointer-events-none"
              />

              {/* Spin Wheel Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center relative z-0">
                <h3 className="text-2xl font-bold text-white mb-4">🎰 Spin the Cultural Wheel!</h3>
                <p className="text-purple-200 mb-6">Use 100 points for a chance to win amazing rewards</p>

                <div className="relative mx-auto mb-6" style={{ width: '200px', height: '200px' }}>
                  <div className={`w-full h-full rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 ${isSpinning ? 'animate-spin' : ''}`}>
                    <div className="absolute inset-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <div className="text-4xl">
                        {isSpinning ? '🌀' : '🎁'}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowSpinWheel(true);
                    handleSpin();
                  }}
                  disabled={mockUser.points < 100 || isSpinning}
                  className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
                    mockUser.points >= 100 && !isSpinning
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:scale-105'
                      : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isSpinning ? 'Spinning...' : `Spin (100 points)`}
                </button>

                {spinResult && (
                  <div className="mt-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-4">
                    <h4 className="text-white font-bold text-lg mb-2">🎉 Congratulations!</h4>
                    <p className="text-white">{spinResult.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Available Rewards */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-6">🎁 Available Rewards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: '10% Off Bookings', cost: 200, type: 'discount', icon: '💰' },
                  { name: 'Free Cultural Guide', cost: 500, type: 'experience', icon: '👨‍🏫' },
                  { name: 'Heritage Pass', cost: 750, type: 'access', icon: '🎫' },
                  { name: 'Festival Priority Access', cost: 1000, type: 'vip', icon: '⭐' },
                  { name: 'Culinary Experience', cost: 1200, type: 'experience', icon: '🍽️' },
                  { name: 'Private Tour', cost: 2000, type: 'premium', icon: '🏰' }
                ].map((reward, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="text-3xl mb-3 text-center">{reward.icon}</div>
                    <h4 className="font-bold text-white mb-2 text-center">{reward.name}</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-400 font-semibold">{reward.cost} pts</span>
                      <button
                        disabled={userPoints < reward.cost || redeemAnimations[reward.name]}
                        onClick={() => {
                          if (userPoints >= reward.cost) {
                            setRedeemAnimations(prev => ({ ...prev, [reward.name]: true }));
                            setUserPoints(prev => prev - reward.cost);
                            
                            setTimeout(() => {
                              setRedeemAnimations(prev => ({ ...prev, [reward.name]: false }));
                            }, 1000); // Longer animation
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-500 ease-in-out transform ${
                          userPoints >= reward.cost
                            ? redeemAnimations[reward.name]
                              ? 'bg-gradient-to-r from-green-400 to-teal-500 text-white scale-110 shadow-lg animate-bounce' 
                              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 hover:shadow-md'
                            : 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className={`flex items-center justify-center ${redeemAnimations[reward.name] ? 'animate-pulse' : ''}`}>
                          {redeemAnimations[reward.name] ? (
                            <>
                              <span className="mr-1">✨</span>
                              Redeemed!
                              <span className="ml-1">✨</span>
                            </>
                          ) : (
                            'Redeem'
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-6">🏆 Cultural Explorers Leaderboard</h3>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Arjun Patel', points: 12500, badge: '🥇' },
                  { rank: 2, name: 'Maya Singh', points: 9800, badge: '🥈' },
                  { rank: 3, name: 'Priya Sharma', points: userPoints, badge: '🥉', isCurrentUser: true },
                  { rank: 4, name: 'Ravi Kumar', points: 5200, badge: '4️⃣' },
                  { rank: 5, name: 'Anya Gupta', points: 4900, badge: '5️⃣' }
                ].sort((a, b) => b.points - a.points).map((user, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${
                    user.isCurrentUser ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30' : 'bg-white/5'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{user.badge}</span>
                      <div>
                        <p className={`font-semibold ${user.isCurrentUser ? 'text-yellow-300' : 'text-white'}`}>
                          {user.name} {user.isCurrentUser && '(You)'}
                        </p>
                        <p className="text-purple-200 text-sm">Cultural Explorer</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{user.points.toLocaleString()}</p>
                      <p className="text-purple-200 text-sm">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CulturalGamificationApp;