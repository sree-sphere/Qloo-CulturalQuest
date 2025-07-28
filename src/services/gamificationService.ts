import { UserProfile } from '../models/user';
import { Badge } from '../models/badge';

// in-memory stores for demo
const users: Record<string, UserProfile> = {};
const badges: Record<string, Badge> = {
  'heritage-festival': {
    id: 'heritage-festival',
    name: 'Festival Explorer',
    description: 'Visited a heritage site during a cultural festival',
    criteria: 'Heritage + Festival'
  }
};

// leaderboard sorted by points
export class GamificationService {
  awardBadge(userId: string, badgeId: string) {
    const user = users[userId];
    if (!user) throw new Error('User not found');
    if (!user.badges.includes(badgeId)) {
      user.badges.push(badgeId);
      user.points += 50; // arbitrary points
    }
    return user;
  }

  spinWheel(userId: string) {
    const user = users[userId];
    if (!user) throw new Error('User not found');
    // simple random reward
    const reward = Math.random() < 0.5 ? 10 : 20;
    user.points += reward;
    return { reward, totalPoints: user.points };
  }

  getLeaderboard() {
    return Object.values(users)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }

  createUser(id: string, name: string) {
    users[id] = { id, name, badges: [], points: 0 };
    return users[id];
  }
}
