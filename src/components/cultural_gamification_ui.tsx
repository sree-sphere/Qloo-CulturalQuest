import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Zap, Star, Gift, Compass, Calendar, Heart } from 'lucide-react';

// Mock data for demonstration
const mockUser = {
  userId: 'user123',
  name: 'Priya Sharma',
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

const mockRecommendations = {
  nostalgic: [
    { name: 'Meenakshi Temple', type: 'Heritage Site', mood: 'Traditional', image: '🏛️' },
    { name: 'Tanjore Palace', type: 'Historical', mood: 'Royal', image: '👑' },
    { name: 'Chettinad Restaurant', type: 'Authentic Cuisine', mood: 'Traditional', image: '🍛' }
  ],
  weekend: [
    { name: 'South by Southwest Museum', type: 'Cultural', mood: 'Vibrant', image: '🎵' },
    { name: 'Lady Bird Lake Trail', type: 'Nature', mood: 'Peaceful', image: '🌊' },
    { name: 'Franklin Barbecue', type: 'Local Cuisine', mood: 'Authentic', image: '🍖' }
  ],
  adventurous: [
    { name: 'Graffiti Park', type: 'Art Experience', mood: 'Creative', image: '🎨' },
    { name: 'Ethiopian Restaurant', type: 'New Cuisine', mood: 'Adventurous', image: '🍽️' },
    { name: 'Kayak Tour', type: 'Activity', mood: 'Active', image: '🛶' }
  ]
};

const CulturalGamificationApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [userInput, setUserInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleQuery = (query) => {
    let recs = [];
    if (query.toLowerCase().includes('nostalgic')) {
      recs = mockRecommendations.nostalgic;
    } else if (query.toLowerCase().includes('weekend')) {
      recs = mockRecommendations.weekend;
    } else if (query.toLowerCase().includes('new') || query.toLowerCase().includes('adventurous')) {
      recs = mockRecommendations.adventurous;
    } else {
      recs = mockRecommendations.nostalgic;
    }
    setRecommendations(recs);
  };

  const handleSpin = () => {
    if (mockUser.points < 100) return;
    
    setIsSpinning(true);
    
    setTimeout(() => {
      const rewards = [
        { type: 'discount', value: '15% off', description: '15% off next booking' },
        { type: 'points', value: '500', description: '500 culture points' },
        { type: 'experience', value: 'guide', description: 'Free cultural guide' }
      ];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      setSpinResult(reward);
      setIsSpinning(false);
    }, 3000);
  };

  const getProgressPercentage = () => {
    const nextLevelPoints = mockUser.level * 1000;
    const currentLevelProgress = mockUser.points % 1000;
    return (currentLevelProgress / 1000) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                🌟
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">CulturalQuest</h1>
                <p className="text-purple-200 text-sm">Discover. Explore. Achieve.</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold">{mockUser.points.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Trophy className="w-4 h-4 text-gold-400" />
                <span className="text-white font-semibold">Level {mockUser.level}</span>
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
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Home Tab - AI Chat Interface */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* User Greeting & Context */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-2xl">
                  👋
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Welcome back, {mockUser.name}!</h2>
                  <p className="text-purple-200">Ready for your next cultural adventure?</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-purple-200">{mockUser.currentStreak.count} day streak</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-purple-200">Austin, TX</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level Progress Bar */}
              <div className="bg-white/10 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-sm text-purple-200 mt-2">
                {1000 - (mockUser.points % 1000)} points to level {mockUser.level + 1}
              </p>
            </div>

            {/* AI Chat Interface */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">What's on your mind today?</h3>
              
              {/* Quick Prompt Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { prompt: "I'm feeling nostalgic today", icon: "💭", color: "from-purple-500 to-pink-500" },
                  { prompt: "Plan my weekend in Austin", icon: "📅", color: "from-blue-500 to-cyan-500" },
                  { prompt: "I want to explore something completely new", icon: "🚀", color: "from-green-500 to-teal-500" }
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUserInput(suggestion.prompt);
                      handleQuery(suggestion.prompt);
                    }}
                    className={`bg-gradient-to-r ${suggestion.color} rounded-2xl p-4 text-white hover:scale-105 transition-transform duration-200 text-left`}
                  >
                    <div className="text-2xl mb-2">{suggestion.icon}</div>
                    <p className="font-medium">{suggestion.prompt}</p>
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Tell me how you're feeling or what you want to explore..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-purple-300 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={() => handleQuery(userInput)}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-2xl hover:scale-105 transition-transform duration-200 font-semibold"
                >
                  Discover
                </button>
              </div>
            </div>

            {/* AI Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">✨ Curated just for you</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition-colors border border-white/10">
                      <div className="text-3xl mb-3">{rec.image}</div>
                      <h4 className="font-bold text-white mb-2">{rec.name}</h4>
                      <p className="text-purple-200 text-sm mb-2">{rec.type}</p>
                      <div className="flex items-center space-x-2">
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-medium">
                          {rec.mood}
                        </span>
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <button className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-xl text-sm hover:scale-105 transition-transform">
                        Learn More
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
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
                
                {/* Next Badge to Unlock */}
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
            {/* Spin Wheel Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">🎰 Spin the Cultural Wheel!</h3>
              <p className="text-purple-200 mb-6">Use 100 points for a chance to win amazing rewards</p>
              
              {/* Spin Wheel Visual */}
              <div className="relative mx-auto mb-6" style={{width: '200px', height: '200px'}}>
                <div className={`w-full h-full rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 ${isSpinning ? 'animate-spin' : ''}`}>
                  <div className="absolute inset-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <div className="text-4xl">
                      {isSpinning ? '🌀' : '🎁'}
                    </div>
                  </div>
                </div>
                {/* Pointer */}
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
                        disabled={mockUser.points < reward.cost}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          mockUser.points >= reward.cost
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105'
                            : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        Redeem
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
                  { rank: 3, name: 'Priya Sharma', points: 6850, badge: '🥉', isCurrentUser: true },
                  { rank: 4, name: 'Ravi Kumar', points: 5200, badge: '4️⃣' },
                  { rank: 5, name: 'Anya Gupta', points: 4900, badge: '5️⃣' }
                ].map((user, idx) => (
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