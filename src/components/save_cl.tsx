// import React, { useState, useEffect, useRef } from 'react';

// import { Trophy, MapPin, Zap, Star, Gift, Compass, Calendar, Heart } from 'lucide-react';
// import Image from 'next/image';

// // Qloo & SDK imports
// import { Qloo } from '@devma/qloo';
// import { QlooCulturalGamification } from '../lib/qloo_gamification_sdk';

// // Initialize Qloo and gamification SDK
// const qloo = new Qloo({
//   apiKey: process.env.NEXT_PUBLIC_QLOO_API_KEY || ''  // 👈 must be accessible client-side
// });
// const gamification = new QlooCulturalGamification(qloo);

// // Mock user data with corrected location format
// const mockUser = {
//   userId: 'user123',
//   name: 'Priya Sharma',
//   location: {
//     current: 'Austin, TX',
//     coordinates: 'POINT(-97.7431 30.2672)'
//   },
//   demographics: {
//     age: '35_and_younger', // Changed from 29
//     gender: 'female',
//     ethnicity: 'Indian',
//     religion: 'Hindu',
//     maritalStatus: 'single'
//   },
//   preferences: {
//     cuisines: ['Indian', 'Thai', 'Italian'], // Example based on achievements
//     culturalInterests: ['heritage', 'festivals', 'cuisine'], // Example interests
//     travelStyle: 'authentic', // Example travel style
//     nostalgicPeriods: ['traditional'], // Example nostalgic period
//     isVegetarian: true
//   },
//   level: 7,
//   points: 6850,
//   badges: [
//     { id: 'diwali_explorer', name: 'Festival of Lights Explorer', icon: '🪔', category: 'festival' },
//     { id: 'flavor_nomad', name: 'Flavor Nomad', icon: '🍛', category: 'foodie' },
//     { id: 'heritage_guardian', name: 'Heritage Guardian', icon: '🏛️', category: 'heritage' }
//   ],
//   achievements: {
//     heritageVisits: 18,
//     festivalParticipation: 5,
//     cuisinesTried: ['Indian', 'Thai', 'Italian', 'Mexican', 'Japanese', 'Lebanese'],
//     culturesExplored: ['South Indian', 'North Indian', 'Thai', 'Mediterranean']
//   },
//   currentStreak: { type: 'cultural_exploration', count: 12 }
// };

// const calculateSimilarityScore = (entity1: any, entity2: any): number => {
//   let score = 0;
  
//   // Category similarity mapping
//   const categoryGroups = {
//     food: ['restaurant', 'delivery service', 'fast food', 'breakfast', 'sushi', 'asian', 'mexican', 'vietnamese', 'burrito', 'caterer', 'snack bar', 'bubble tea'],
//     retail: ['clothing store', 'organic food store'],
//     entertainment: ['tourist attraction', 'aquarium', 'childrens party', 'art gallery'],
//     services: ['barber shop', 'music instructor']
//   };
  
//   // Cuisine similarity mapping
//   const cuisineGroups = {
//     asian: ['sushi', 'asian', 'vietnamese', 'bubble tea'],
//     mexican: ['mexican', 'burrito'],
//     american: ['fast food', 'breakfast', 'steakburgers'],
//     specialty: ['bagels', 'frozen custard', 'pies']
//   };
  
//   const type1 = entity1.type.toLowerCase();
//   const type2 = entity2.type.toLowerCase();
  
//   // Exact type match (highest similarity)
//   if (type1 === type2) {
//     score += 50;
//   }
  
//   // Category group similarity
//   for (const [group, types] of Object.entries(categoryGroups)) {
//     const inGroup1 = types.some(t => type1.includes(t));
//     const inGroup2 = types.some(t => type2.includes(t));
//     if (inGroup1 && inGroup2) {
//       score += 30;
//       break;
//     }
//   }
  
//   // Cuisine similarity (for food items)
//   for (const [cuisine, types] of Object.entries(cuisineGroups)) {
//     const inCuisine1 = types.some(t => type1.includes(t));
//     const inCuisine2 = types.some(t => type2.includes(t));
//     if (inCuisine1 && inCuisine2) {
//       score += 25;
//       break;
//     }
//   }
  
//   // Name similarity (basic keyword matching)
//   const name1Words = entity1.name.toLowerCase().split(/\s+/);
//   const name2Words = entity2.name.toLowerCase().split(/\s+/);
//   const commonWords = name1Words.filter(word => 
//     name2Words.includes(word) && word.length > 3
//   );
//   score += commonWords.length * 10;
  
//   // Location proximity (if available)
//   if (entity1.distance && entity2.distance) {
//     const dist1 = parseFloat(entity1.distance);
//     const dist2 = parseFloat(entity2.distance);
//     if (!isNaN(dist1) && !isNaN(dist2)) {
//       const distanceDiff = Math.abs(dist1 - dist2);
//       if (distanceDiff < 1) score += 15; // Within 1 mile
//       else if (distanceDiff < 3) score += 10; // Within 3 miles
//     }
//   }
  
//   return score;
// };

// const reorderNostalgicRecommendations = (recommendations: any[], likedIds: Set<string>) => {
//   const likedEntities = recommendations.filter(r => likedIds.has(r.entityId));
  
//   if (likedEntities.length === 0) {
//     // No likes, return shuffled
//     return recommendations.sort(() => Math.random() - 0.5);
//   }
  
//   // Calculate similarity scores for all entities
//   const scored = recommendations.map(entity => {
//     let score = 0;
    
//     if (likedIds.has(entity.entityId)) {
//       score += 1000; // Liked entities get highest priority
//     } else {
//       // Calculate maximum similarity to any liked entity
//       const maxSimilarity = Math.max(
//         ...likedEntities.map(liked => calculateSimilarityScore(entity, liked))
//       );
//       score += maxSimilarity;
//     }
    
//     // Add small random factor to break ties
//     score += Math.random() * 5;
    
//     return { ...entity, _score: score };
//   });

//   // Sort by score descending
//   return scored
//     .sort((a, b) => b._score - a._score)
//     .map(({ _score, ...rest }) => rest);
// };

// const CACHE_KEY = 'nostalgic-recs';



// const CulturalGamificationApp = () => {
//   useEffect(() => {
//   gamification.registerUserProfile(mockUser);
//   const storedLikes = JSON.parse(localStorage.getItem('liked-entities') || '[]');
//   setLikedPlaces(new Set(storedLikes));
  
//   // Auto-load and reorder nostalgic recommendations on page reload
//   const cachedNostalgic = localStorage.getItem(CACHE_KEY);
//   if (cachedNostalgic) {
//     try {
//       const cached = JSON.parse(cachedNostalgic);
//       if (cached.length && cached[0]?.entityId) {
//         // Reorder based on current likes
//         const reordered = reorderNostalgicRecommendations(cached, new Set(storedLikes));
//         setRecommendations(reordered);
//         // Update cache with new order
//         localStorage.setItem(CACHE_KEY, JSON.stringify(reordered));
//       }
//     } catch (error) {
//       console.error('Error loading cached nostalgic recommendations:', error);
//       localStorage.removeItem(CACHE_KEY);
//     }
//   }
// }, []);
//   const [activeTab, setActiveTab] = useState('home');
//   const [userInput, setUserInput] = useState('');
//   // const [recommendations, setRecommendations] = useState([]);
//   const [showSpinWheel, setShowSpinWheel] = useState(false);
//   const [spinResult, setSpinResult] = useState(null);
//   const [isSpinning, setIsSpinning] = useState(false);
//   const [chatOutput, setChatOutput] = useState<string>('');
//   const [isStreaming, setIsStreaming] = useState<boolean>(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [formattedRecommendations, setRecommendations] = useState([]);

//   const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
//   const [selectedEntity, setSelectedEntity] = useState<any>(null);
//   const [showEntityDetails, setShowEntityDetails] = useState(false);
//   const [isReordering, setIsReordering] = useState(false);
//   const [heartAnimation, setHeartAnimation] = useState<string | null>(null);
//   const [entityDetails, setEntityDetails] = useState<any>(null);
//   const [showEntityModal, setShowEntityModal] = useState(false);
//   const CACHE_KEY = 'nostalgic-recs';

//   const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

//   const handleImageError = (entityId: string) => {
//     setImageErrors(prev => new Set([...prev, entityId]));
//   };

//   const handleHeartClick = async (entityId: string) => {
//   // Trigger heart animation
//   setHeartAnimation(entityId);
//   setTimeout(() => setHeartAnimation(null), 600);
  
//   setLikedPlaces(prev => {
//     const next = new Set(prev);
//     const wasLiked = next.has(entityId);
    
//     if (wasLiked) {
//       next.delete(entityId);
//     } else {
//       next.add(entityId);
//     }
    
//     localStorage.setItem('liked-entities', JSON.stringify(Array.from(next)));
    
//     // Trigger reordering animation for nostalgic recommendations
//     const cachedNostalgic = localStorage.getItem(CACHE_KEY);
//     if (cachedNostalgic && formattedRecommendations.length > 0) {
//       try {
//         const cached = JSON.parse(cachedNostalgic);
//         if (cached.length && cached[0]?.entityId) {
//           setIsReordering(true);
          
//           // Delay reordering for smooth animation
//           setTimeout(() => {
//             const reordered = reorderNostalgicRecommendations(cached, next);
//             setRecommendations(reordered);
//             localStorage.setItem(CACHE_KEY, JSON.stringify(reordered));
            
//             setTimeout(() => setIsReordering(false), 300);
//           }, 200);
//         }
//       } catch (error) {
//         console.error('Error reordering after like/unlike:', error);
//         setIsReordering(false);
//       }
//     }
    
//     return next;
//   });
// };

//   const handleLearnMore = async (entityId: string) => {
//   try {
//     // Find the full entity data from the original API response
//     // You'll need to store the full API response in state
//     const entity = formattedRecommendations.find(r => r.entityId === entityId);
//     if (entity) {
//       // For now, we'll use the formatted data, but ideally you'd store the full API response
//       setEntityDetails(entity);
//       setShowEntityModal(true);
//     }
//   } catch (error) {
//     console.error('Error loading entity details:', error);
//   }
// };
  
//   const quickPrompts = [
//       {
//         prompt: "I'm feeling nostalgic today",
//         icon:   "💭",
//         color:  "from-purple-500 to-pink-500",
//         mood:   'nostalgic',
//         intent: 'experience',
//         cacheKey: 'nostalgic-recs'
//       },
//       {
//         prompt: "Plan my weekend in Austin",
//         icon:   "📅",
//         color:  "from-blue-500 to-cyan-500",
//         mood:   'social',
//         intent: 'discover'
//       },
//       {
//         prompt: "I want to explore something completely new",
//         icon:   "🚀",
//         color:  "from-green-500 to-teal-500",
//         mood:   'adventurous',
//         intent: 'explore'
//       }
//     ];

//   const handleQuery = async (
//   query: string,
//   forcedMood?: 'nostalgic' | 'adventurous' | 'relaxed',
//   forcedIntent?: string
// ) => {
//     if (!query.trim()) {
//       console.log('No query entered');
//       return setRecommendations([]);
//     }
//     console.log('User query:', query);

//     const mood = forcedMood
//     ? forcedMood
//     : query.toLowerCase().includes('nostalgic')
//     ? 'nostalgic'
//     : query.toLowerCase().includes('adventurous')
//     ? 'adventurous'
//     : 'relaxed';
//     const intent = forcedIntent || 'discover';

//     const prompt = { mood, intent, context: query } as const;
//     console.log('API prompt:', prompt);

//     try {
//       setIsLoading(true);

//       if (!gamification.userProfiles.has(mockUser.userId)) {
//         await gamification.createUserProfile(mockUser);
//       }

//       const recPayload = await gamification.getContextualRecommendations(
//         mockUser.userId,
//         prompt,
//         mockUser.location.current
//       );
//       console.log('API response:', recPayload);

//       // Raw entity extraction
//       // Dynamically extract entities based on response structure / forcedIntent
//       const raw = recPayload as any;
//       let entities = [];

//       if (mood === 'adventurous' && raw.adventures?.results?.entities) {
//         entities = raw.adventures.results.entities;
//       } else if (Array.isArray(raw.entities)) {
//         entities = raw.entities;
//       } else if (raw.heritage || raw.cuisine) {
//         entities = [
//           ...(raw.heritage?.results?.entities || []),
//           ...(raw.cuisine?.results?.entities || []),
//         ];
//       }
//       // dedupe:
//       const uniqueEntities = Array.from(
//         new Map(entities.map(e => [e.entity_id, e])).values()
//       );
//       console.log('Extracted entities:', uniqueEntities);

//       // SPECIAL “nostalgic” branch: shuffle, cache, format & exit
//       if (mood === 'nostalgic') {
//   const likedIds = new Set(JSON.parse(localStorage.getItem('liked-entities') || '[]'));

//   // 1. Format all entities first
//   const formatted = uniqueEntities.map(entity => {
//     const city = entity.properties?.geocode?.city;
//     const categoryTag = entity.tags?.find(t => t.type.includes('category'))?.name;
//     const displayType = categoryTag || city || 'Unknown';
//     const rating = entity.properties?.business_rating || 0;
//     const fullStars = Math.floor(rating);
//     const halfStar = rating - fullStars >= 0.5;
//     const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '');
//     const imageUrl =
//       entity.images?.[0]?.url ||
//       entity.properties?.images?.[0]?.url ||
//       null;
//     const distanceMiles = entity.query?.distance
//       ? (entity.query.distance / 1609.34).toFixed(1) + ' mi'
//       : null;

//     return {
//       name:        entity.name,
//       entityId:    entity.entity_id,
//       type:        displayType,
//       ratingStars: stars,
//       image:       imageUrl,
//       emoji:       imageUrl ? null : '🌟',
//       description: entity.properties?.description,
//       address:     entity.properties?.address,
//       distance:    distanceMiles,
//       affinity:    entity.query?.affinity
//         ? Math.round(entity.query.affinity * 100) + '%'
//         : '—',
//     };
//   });

//   // 2. Use the helper function to reorder
//   const reordered = reorderNostalgicRecommendations(formatted, likedIds);
  
//   localStorage.setItem(CACHE_KEY, JSON.stringify(reordered));
//   setRecommendations(reordered);
//   return;
// }


      
//       // “Plan my weekend in Austin” chat branch
//       if (intent === 'discover' && mood === 'social') {
//           // 1) filter for weekend‑open & vegetarian
//           const weekendOpen = uniqueEntities.filter(e => {
//             const hrs = e.properties.hours || {};
//             return hrs.Saturday?.length && hrs.Sunday?.length;
//           });
//           const vegOnly = weekendOpen.filter(e =>
//             e.tags?.some(t => /vegetarian/i.test(t.name))
//           );
//           // 2) take top 3
//           const top3 = vegOnly.slice(0, 3);
//           // 3) serialize minimal fields
//           const summary = top3.map(e => `
//         - ${e.name}
//           • ${e.properties.address}
//           • Hours: Sat ${e.properties.hours.Saturday[0].opens.slice(11)}–${e.properties.hours.Saturday[0].closes.slice(11)}, 
//                   Sun ${e.properties.hours.Sunday[0].opens.slice(11)}–${e.properties.hours.Sunday[0].closes.slice(11)}
//           • ${e.properties.description}
//         `).join('\n');
//           // 4) invoke chat
//           await handleChat(`Plan my weekend in Austin. Here are some options:${summary}`);
//           return;  // short‑circuit out of card rendering
//       }
      
//       // Default “discover” / other moods → map & render cards
//       const formattedRecommendations = uniqueEntities.map(entity => {
//         // human‑readable “type”:
//         const city = entity.properties?.geocode?.city;
//         const categoryTag = entity.tags?.find(t => t.type.includes('category'))?.name;
//         const displayType = categoryTag || city || 'Unknown';

//         // star rating ★★★★½ from business_rating
//         const rating = entity.properties?.business_rating || 0;
//         const fullStars = Math.floor(rating);
//         const halfStar = rating - fullStars >= 0.5;
//         const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '');

//         // pick an image if available
//         const imageUrl =
//           entity.images?.[0]?.url ||
//           entity.properties?.images?.[0]?.url ||
//           entity.properties?.images?.find(img => img.type === "urn:image:place:unknown")?.url ||
//           null;

//         // distance in miles (if you want)
//         const distanceMiles = entity.query?.distance
//           ? (entity.query.distance / 1609.34).toFixed(1) + ' mi'
//           : null;

//         return {
//           name:        entity.name,
//           entityId:    entity.entity_id,
//           type:        displayType,
//           ratingStars: stars,
//           image:       imageUrl,
//           emoji:       imageUrl ? null : '🌟',
//           description: entity.properties?.description,
//           address:     entity.properties?.address,
//           distance:    distanceMiles,
//           affinity:    entity.query?.affinity
//       ? Math.round(entity.query.affinity * 100) + '%'
//       : '—',
//         };
//       });

//       console.log('Formatted recommendations:', formattedRecommendations);
//       setRecommendations(formattedRecommendations);
//     } catch (error) {
//       console.error('Error fetching recommendations:', error);
//       setError('Failed to fetch recommendations. Please try again later.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const loadNostalgic = () => {
//   try {
//     const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
//     if (cached.length && cached[0]?.entityId) {
//       const currentLikes = new Set(JSON.parse(localStorage.getItem('liked-entities') || '[]'));
//       const reordered = reorderNostalgicRecommendations(cached, currentLikes);
//       setRecommendations(reordered);
//       // Update cache with new order
//       localStorage.setItem(CACHE_KEY, JSON.stringify(reordered));
//     } else {
//       throw new Error("Invalid nostalgic cache");
//     }
//   } catch {
//     localStorage.removeItem(CACHE_KEY);
//     handleQuery("I'm feeling nostalgic today", 'nostalgic', 'experience');
//   }
// };

//   const handleChat = async (message: string) => {
//     setChatOutput('');
//     setIsStreaming(true);

//     // Cycle through videos (0 and 1)
//   const nextVideoIndex = Math.floor(Math.random() * 2); // Randomize between vid1.mp4 and vid2.mp4
//   setCurrentVideoIndex(nextVideoIndex);
  
//   // Start video when streaming begins
//   if (videoRef.current) {
//     videoRef.current.currentTime = 0;
//     videoRef.current.play();
//   }

//     const res = await fetch('/api/chat', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ message })
//     });
//     if (!res.ok) throw new Error('Chat API failed');

//     const reader = res.body!.getReader();
//     const decoder = new TextDecoder();
//     let done = false;
//     let buffer = '';

//     let partial = '';
//     while (!done) {
//       const { value, done: doneReading } = await reader.read();
//       done = doneReading;
//       const chunk = decoder.decode(value || new Uint8Array(), { stream: true });

//       partial += chunk;
//       const lines = partial.split('\n');
//       partial = lines.pop() || '';

//       for (const line of lines) {
//         if (!line.startsWith('data: ')) continue;
//         const json = line.slice('data: '.length);
//         if (json === '[DONE]') break;

//         try {
//           const parsed = JSON.parse(json);
//           const token = parsed.choices[0].delta?.content;
//           if (token) setChatOutput((prev) => prev + token);
//         } catch {
//           continue;
//         }
//       }
//     }

//     setIsStreaming(false);
//     // Pause video when streaming ends
//   if (videoRef.current) {
//     videoRef.current.pause();
//   }
//   };

//   const handleSpin = () => {
//     if (mockUser.points < 100) return;
    
//     setIsSpinning(true);
    
//     setTimeout(() => {
//       const rewards = [
//         { type: 'discount', value: '15% off', description: '15% off next booking' },
//         { type: 'points', value: '500', description: '500 culture points' },
//         { type: 'experience', value: 'guide', description: 'Free cultural guide' }
//       ];
//       const reward = rewards[Math.floor(Math.random() * rewards.length)];
//       setSpinResult(reward);
//       setIsSpinning(false);
//     }, 3000);
//   };

//   const getProgressPercentage = () => {
//     const nextLevelPoints = mockUser.level * 1000;
//     const currentLevelProgress = mockUser.points % 1000;
//     return (currentLevelProgress / 1000) * 100;
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900">
//       {/* Header */}
//       <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
//         <div className="max-w-6xl mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className="w-12 h-12 rounded-full overflow-hidden">
//                 <Image
//                   src="/qloo_assets/images/image.webp"
//                   alt="Avatar"
//                   width={48}
//                   height={48}
//                   className="object-cover w-12 h-12"
//                 />
//               </div>
//               <div>
//                 <h1 className="text-white text-xl font-bold">CulturalQuest</h1>
//                 <p className="text-purple-200 text-sm">Discover. Explore. Achieve.</p>
//               </div>
//             </div>
            
//             <div className="flex items-center space-x-6">
//               <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
//                 <Zap className="w-4 h-4 text-yellow-400" />
//                 <span className="text-white font-semibold">{mockUser.points.toLocaleString()}</span>
//               </div>
//               <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
//                 <Trophy className="w-4 h-4 text-gold-400" />
//                 <span className="text-white font-semibold">Level {mockUser.level}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Navigation */}
//       <div className="max-w-6xl mx-auto px-4 py-4">
//         <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
//           {[
//             { id: 'home', icon: Compass, label: 'Explore' },
//             { id: 'progress', icon: Trophy, label: 'Progress' },
//             { id: 'rewards', icon: Gift, label: 'Rewards' }
//           ].map(tab => (
//             <button
//               key={tab.id}
//               onClick={() => setActiveTab(tab.id)}
//               className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
//                 activeTab === tab.id 
//                   ? 'bg-white text-purple-900 shadow-lg' 
//                   : 'text-white hover:bg-white/10'
//               }`}
//             >
//               <tab.icon className="w-4 h-4" />
//               <span className="font-medium">{tab.label}</span>
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Main Content */}
//       {error && <p className="text-red-400">{error}</p>}
//       <div className="max-w-6xl mx-auto px-4 pb-8">
//         {/* Home Tab */}
//         {activeTab === 'home' && (
//           <div className="space-y-6">
//             {/* User Greeting & Context */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//               <div className="flex items-center space-x-4 mb-4">
//                 <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-2xl">
//                   👋
//                 </div>
//                 <div>
//                   <h2 className="text-2xl font-bold text-white">Welcome back, {mockUser.name}!</h2>
//                   <p className="text-purple-200">Ready for your next cultural adventure?</p>
//                   <div className="flex items-center space-x-4 mt-2">
//                     <div className="flex items-center space-x-1">
//                       <Heart className="w-4 h-4 text-red-400" />
//                       <span className="text-sm text-purple-200">{mockUser.currentStreak.count} day streak</span>
//                     </div>
//                     <div className="flex items-center space-x-1">
//                       <MapPin className="w-4 h-4 text-blue-400" />
//                       <span className="text-sm text-purple-200">Austin, TX</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="bg-white/10 rounded-full h-3 overflow-hidden">
//                 <div 
//                   className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
//                   style={{ width: `${getProgressPercentage()}%` }}
//                 />
//               </div>
//               <p className="text-sm text-purple-200 mt-2">
//                 {1000 - (mockUser.points % 1000)} points to level {mockUser.level + 1}
//               </p>
//             </div>

//             {/* AI Chat Interface */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//               <h3 className="text-xl font-bold text-white mb-4">What is on your mind today?</h3>
              
//               {/* Quick Prompt Suggestions */}
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                 {quickPrompts.map((s, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => {
//                       setUserInput(s.prompt);
//                       if (s.mood === 'nostalgic') loadNostalgic();
//                       else handleQuery(s.prompt, s.mood, s.intent);
//                     }}
//                     className={`bg-gradient-to-r ${s.color} rounded-2xl`}
//                   >
//                     <div className="text-2xl mb-2">{s.icon}</div>
//                     <p className="font-medium">{s.prompt}</p>
//                   </button>
//                 ))}
//               </div>

//               {/* Custom Input */}
//               <div className="flex space-x-2">
//                 <input
//                   type="text"
//                   value={userInput}
//                   onChange={(e) => setUserInput(e.target.value)}
//                   placeholder="Tell me how you're feeling or what you want to explore..."
//                   className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-purple-300 focus:outline-none focus:border-white/40"
//                 />
//                 <button
//                   onClick={() => handleQuery(userInput)}
//                   className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-4 rounded-2xl hover:scale-105 transition-transform duration-200 font-semibold"
//                 >
//                   Discover
//                 </button>
//                 <button
//                   onClick={() => handleChat(userInput)}
//                   className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-6 py-4 rounded-2xl hover:scale-105 transition-transform duration-200 font-semibold"
//                 >
//                   Chat
//                 </button>
//               </div>
//             </div>

//             {/* Chat Output */}
//             {/* Chat Output with Video */}
// {chatOutput && (
//   <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 overflow-hidden relative">
//     {/* Creative Video Placement - Floating circular avatar */}
//     <div className="absolute top-6 right-6 z-10">
//       <div className="relative">
//         {/* Animated border ring */}
//         <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 ${
//           isStreaming ? 'animate-spin' : ''
//         }`} style={{ padding: '3px' }}>
//           <div className="w-full h-full rounded-full bg-black"></div>
//         </div>
        
//         {/* Video container */}
//         <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/20">
//           <video
//             ref={videoRef}
//             className="w-full h-full object-cover scale-150 -translate-y-2"
//             muted
//             loop
//             playsInline
//           >
//             <source src={`/qloo_assets/videos/vid${currentVideoIndex + 1}.mp4`} type="video/mp4" />
//           </video>
          
//           {/* Overlay when not streaming */}
//           {!isStreaming && (
//             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
//               <div className="w-3 h-3 rounded-full bg-white opacity-60"></div>
//             </div>
//           )}
//         </div>
        
//         {/* Pulse effect when streaming */}
//         {isStreaming && (
//           <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-ping"></div>
//         )}
//       </div>
//     </div>

//     <div className="p-6 pr-28">
//       <h3 className="text-xl font-bold text-white mb-4 flex items-center">
//         💡 Sahayak Suggestions
//         {isStreaming && (
//           <div className="ml-3 flex space-x-1">
//             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
//             <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
//             <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
//           </div>
//         )}
//       </h3>
//       <div className="text-purple-100 whitespace-pre-line leading-relaxed font-mono">
//         {chatOutput}
//         {isStreaming && <span className="animate-pulse">|</span>}
//       </div>
//     </div>
//   </div>
// )}

//             {/* Recommendations */}
//             {formattedRecommendations.length > 0 ? (
//               <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//                 <h3 className="text-xl font-bold text-white mb-4">✨ Curated just for you</h3>
//                 <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 ${
//                     isReordering ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
//                   }`}>
//                     {formattedRecommendations.map((rec, i) => (
//                       rec.entityId ? (
//                         <div 
//                           key={`${rec.entityId}-${i}`} 
//                           className={`relative bg-white/10 rounded-2xl p-4 shadow-lg flex flex-col transition-all duration-500 ${
//                             isReordering ? 'transform translate-y-2' : 'transform translate-y-0'
//                           }`}
//                           style={{
//                             transitionDelay: `${i * 50}ms` // Staggered animation
//                           }}
//                         >
//                       {/* Image with Error Handling */}
// {rec.image && !imageErrors.has(rec.entityId) ? (
//   <Image
//     src={rec.image}
//     alt={rec.name}
//     width={400}
//     height={180}
//     className="w-full h-32 object-cover rounded-xl mb-3"
//     unoptimized
//     onError={() => handleImageError(rec.entityId)}
//   />
// ) : (
//   <Image
//     src="/qloo_assets/images/image.webp"
//     alt={rec.name}
//     width={400}
//     height={180}
//     className="w-full h-32 object-cover rounded-xl mb-3"
//   />
// )}


//                       {/* 2) Title + Type */}
//                       <h4 className="text-lg font-semibold">{rec.name}</h4>
//                       <p className="text-sm text-gray-300 mb-1">{rec.type}</p>

//                       {/* 3) Stars + Affinity */}
//                       <p className="text-sm mb-1">
//                         <span className="text-yellow-400">{rec.ratingStars}</span>
//                         {' '}· {rec.affinity} match
//                       </p>

//                       {/* 4) Optional distance or address */}
//                       {rec.distance && <p className="text-xs">{rec.distance}</p>}

//                       {/* 5) Description */}
//                       <p className="text-xs line-clamp-2 my-2">{rec.description}</p>

//                       {/* 6) Learn More */}
//                       <button
//           onClick={() => handleLearnMore(rec.entityId)}
//           className="mt-auto bg-gradient-to-r from-green-400 to-blue-500 py-2 rounded-xl text-sm hover:scale-105 transition-transform"
//         >
//           Learn More
//         </button>

//                       {/* 7) Like Button */}
//                       <button
//           className={`absolute top-3 right-3 p-1 rounded-full transition-all duration-300 transform ${
//             likedPlaces.has(rec.entityId) 
//               ? 'bg-red-500 scale-110' 
//               : 'bg-white/20 hover:bg-white/30'
//           } ${
//             heartAnimation === rec.entityId 
//               ? 'animate-pulse scale-125' 
//               : ''
//           }`}
//           onClick={() => handleHeartClick(rec.entityId)}
//         >
//           <Heart 
//             className={`w-5 h-5 transition-all duration-300 ${
//               likedPlaces.has(rec.entityId) 
//                 ? 'text-white fill-current' 
//                 : 'text-white'
//             } ${
//               heartAnimation === rec.entityId 
//                 ? 'animate-bounce' 
//                 : ''
//             }`} 
//           />
//         </button>
//       </div>
//     ) : null
//   ))}
//   {showEntityModal && entityDetails && (
//   <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//     <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//       <div className="p-6">
//         {/* Header */}
//         <div className="flex justify-between items-start mb-6">
//           <div>
//             <h2 className="text-2xl font-bold text-white mb-2">{entityDetails.name}</h2>
//             <p className="text-purple-200">{entityDetails.type}</p>
//           </div>
//           <button
//             onClick={() => setShowEntityModal(false)}
//             className="text-white hover:text-red-400 transition-colors"
//           >
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Image with Error Handling */}
// {entityDetails.image && !imageErrors.has(entityDetails.entityId) ? (
//   <div className="mb-6">
//     <Image
//       src={entityDetails.image}
//       alt={entityDetails.name}
//       width={600}
//       height={300}
//       className="w-full h-64 object-cover rounded-2xl"
//       unoptimized
//       onError={() => handleImageError(entityDetails.entityId)}
//     />
//   </div>
// ) : (
//   <div className="mb-6">
//     <Image
//       src="/qloo_assets/images/image.webp"
//       alt={entityDetails.name}
//       width={600}
//       height={300}
//       className="w-full h-64 object-cover rounded-2xl"
//     />
//   </div>
// )}

//         {/* Details Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//           {entityDetails.ratingStars && (
//             <div className="bg-white/10 rounded-2xl p-4">
//               <h3 className="text-white font-semibold mb-2">Rating</h3>
//               <p className="text-yellow-400 text-lg">{entityDetails.ratingStars}</p>
//             </div>
//           )}
          
//           {entityDetails.distance && (
//             <div className="bg-white/10 rounded-2xl p-4">
//               <h3 className="text-white font-semibold mb-2">Distance</h3>
//               <p className="text-purple-200">{entityDetails.distance}</p>
//             </div>
//           )}
          
//           {entityDetails.affinity && (
//             <div className="bg-white/10 rounded-2xl p-4">
//               <h3 className="text-white font-semibold mb-2">Match Score</h3>
//               <p className="text-green-400">{entityDetails.affinity}</p>
//             </div>
//           )}
          
//           {entityDetails.address && (
//             <div className="bg-white/10 rounded-2xl p-4">
//               <h3 className="text-white font-semibold mb-2">Address</h3>
//               <p className="text-purple-200 text-sm">{entityDetails.address}</p>
//             </div>
//           )}
//         </div>

//         {/* Description */}
//         {entityDetails.description && (
//           <div className="bg-white/10 rounded-2xl p-4 mb-6">
//             <h3 className="text-white font-semibold mb-2">Description</h3>
//             <p className="text-purple-200 leading-relaxed">{entityDetails.description}</p>
//           </div>
//         )}

//         {/* Action Buttons */}
//         <div className="flex space-x-4">
//           <button
//             onClick={() => handleHeartClick(entityDetails.entityId)}
//             className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
//               likedPlaces.has(entityDetails.entityId)
//                 ? 'bg-red-500 text-white'
//                 : 'bg-white/10 text-white hover:bg-white/20'
//             }`}
//           >
//             {likedPlaces.has(entityDetails.entityId) ? '❤️ Liked' : '🤍 Add to Favorites'}
//           </button>
          
//           <button
//             onClick={() => {
//               // Add gamification points for viewing details
//               console.log('Viewed entity details:', entityDetails.entityId);
//               setShowEntityModal(false);
//             }}
//             className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-2xl font-semibold hover:scale-105 transition-transform"
//           >
//             Visit Now
//           </button>
//         </div>
//       </div>
//     </div>
//   </div>
// )}
// </div>
//               </div>
//             ) 
//             : (
//               <p className="text-purple-200"></p>
//             )}
//           </div>
//         )}

//         {/* Progress Tab */}
//         {(activeTab === 'progress') && (
//           <div className="space-y-6">
//             {/* Badges Section */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//               <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
//                 <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
//                 Your Badges ({mockUser.badges.length})
//               </h3>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 {mockUser.badges.map((badge, idx) => (
//                   <div key={idx} className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-400/30 text-center">
//                     <div className="text-4xl mb-3">{badge.icon}</div>
//                     <h4 className="font-bold text-white mb-2">{badge.name}</h4>
//                     <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
//                       {badge.category}
//                     </span>
//                   </div>
//                 ))}
                
//                 <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl p-6 text-center">
//                   <div className="text-4xl mb-3 opacity-50">🔒</div>
//                   <h4 className="font-bold text-purple-200 mb-2">Cultural Bridge Builder</h4>
//                   <p className="text-sm text-purple-300">Visit 2 more heritage sites</p>
//                   <div className="mt-3 bg-white/10 rounded-full h-2">
//                     <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full" style={{width: '80%'}}></div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Achievement Stats */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//               {[
//                 { label: 'Heritage Sites', value: mockUser.achievements.heritageVisits, icon: '🏛️', color: 'from-blue-500 to-purple-500' },
//                 { label: 'Festivals Joined', value: mockUser.achievements.festivalParticipation, icon: '🎉', color: 'from-orange-500 to-red-500' },
//                 { label: 'Cuisines Tried', value: mockUser.achievements.cuisinesTried.length, icon: '🍛', color: 'from-green-500 to-teal-500' },
//                 { label: 'Cultures Explored', value: mockUser.achievements.culturesExplored.length, icon: '🌍', color: 'from-pink-500 to-purple-500' }
//               ].map((stat, idx) => (
//                 <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white`}>
//                   <div className="text-3xl mb-2">{stat.icon}</div>
//                   <div className="text-3xl font-bold mb-1">{stat.value}</div>
//                   <div className="text-sm opacity-90">{stat.label}</div>
//                 </div>
//               ))}
//             </div>

//             {/* Cultural Journey Map */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//               <h3 className="text-xl font-bold text-white mb-4">Your Cultural Journey</h3>
//               <div className="flex flex-wrap gap-2">
//                 {mockUser.achievements.culturesExplored.map((culture, idx) => (
//                   <span key={idx} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm">
//                     {culture}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Rewards Tab */}
//         {activeTab === 'rewards' && (
//           <div className="space-y-6">
//             {/* Spin Wheel Section */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
//               <h3 className="text-2xl font-bold text-white mb-4">🎰 Spin the Cultural Wheel!</h3>
//               <p className="text-purple-200 mb-6">Use 100 points for a chance to win amazing rewards</p>
              
//               <div className="relative mx-auto mb-6" style={{width: '200px', height: '200px'}}>
//                 <div className={`w-full h-full rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 ${isSpinning ? 'animate-spin' : ''}`}>
//                   <div className="absolute inset-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
//                     <div className="text-4xl">
//                       {isSpinning ? '🌀' : '🎁'}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
//                   <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
//                 </div>
//               </div>

//               <button
//                 onClick={() => {
//                   setShowSpinWheel(true);
//                   handleSpin();
//                 }}
//                 disabled={mockUser.points < 100 || isSpinning}
//                 className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
//                   mockUser.points >= 100 && !isSpinning
//                     ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:scale-105'
//                     : 'bg-gray-500 text-gray-300 cursor-not-allowed'
//                 }`}
//               >
//                 {isSpinning ? 'Spinning...' : `Spin (100 points)`}
//               </button>

//               {spinResult && (
//                 <div className="mt-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-4">
//                   <h4 className="text-white font-bold text-lg mb-2">🎉 Congratulations!</h4>
//                   <p className="text-white">{spinResult.description}</p>
//                 </div>
//               )}
//             </div>

//             {/* Available Rewards */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//               <h3 className="text-xl font-bold text-white mb-6">🎁 Available Rewards</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 {[
//                   { name: '10% Off Bookings', cost: 200, type: 'discount', icon: '💰' },
//                   { name: 'Free Cultural Guide', cost: 500, type: 'experience', icon: '👨‍🏫' },
//                   { name: 'Heritage Pass', cost: 750, type: 'access', icon: '🎫' },
//                   { name: 'Festival Priority Access', cost: 1000, type: 'vip', icon: '⭐' },
//                   { name: 'Culinary Experience', cost: 1200, type: 'experience', icon: '🍽️' },
//                   { name: 'Private Tour', cost: 2000, type: 'premium', icon: '🏰' }
//                 ].map((reward, idx) => (
//                   <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
//                     <div className="text-3xl mb-3 text-center">{reward.icon}</div>
//                     <h4 className="font-bold text-white mb-2 text-center">{reward.name}</h4>
//                     <div className="flex justify-between items-center">
//                       <span className="text-yellow-400 font-semibold">{reward.cost} pts</span>
//                       <button
//                         disabled={mockUser.points < reward.cost}
//                         className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
//                           mockUser.points >= reward.cost
//                             ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105'
//                             : 'bg-gray-500 text-gray-300 cursor-not-allowed'
//                         }`}
//                       >
//                         Redeem
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Leaderboard */}
//             <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
//               <h3 className="text-xl font-bold text-white mb-6">🏆 Cultural Explorers Leaderboard</h3>
//               <div className="space-y-3">
//                 {[
//                   { rank: 1, name: 'Arjun Patel', points: 12500, badge: '🥇' },
//                   { rank: 2, name: 'Maya Singh', points: 9800, badge: '🥈' },
//                   { rank: 3, name: 'Priya Sharma', points: 6850, badge: '🥉', isCurrentUser: true },
//                   { rank: 4, name: 'Ravi Kumar', points: 5200, badge: '4️⃣' },
//                   { rank: 5, name: 'Anya Gupta', points: 4900, badge: '5️⃣' }
//                 ].map((user, idx) => (
//                   <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${
//                     user.isCurrentUser ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30' : 'bg-white/5'
//                   }`}>
//                     <div className="flex items-center space-x-4">
//                       <span className="text-2xl">{user.badge}</span>
//                       <div>
//                         <p className={`font-semibold ${user.isCurrentUser ? 'text-yellow-300' : 'text-white'}`}>
//                           {user.name} {user.isCurrentUser && '(You)'}
//                         </p>
//                         <p className="text-purple-200 text-sm">Cultural Explorer</p>
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <p className="font-bold text-white">{user.points.toLocaleString()}</p>
//                       <p className="text-purple-200 text-sm">points</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CulturalGamificationApp;