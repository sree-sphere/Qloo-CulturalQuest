export interface UserProfile {
  id: string;
  name: string;
  badges: string[];
  points: number;
}

export interface SpinResult {
  reward: number;
  totalPoints: number;
}
