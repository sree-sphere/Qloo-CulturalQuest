// Basic in-memory user profile for gamification
export interface UserProfile {
  id: string;
  name: string;
  badges: string[];       // badge ids awarded
  points: number;         // points toward leaderboard
}
