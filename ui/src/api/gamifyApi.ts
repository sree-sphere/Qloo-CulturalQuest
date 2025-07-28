import axios from 'axios';
import { UserProfile, SpinResult } from '../models/user';

const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000/api';

export async function createUser(id: string, name: string): Promise<UserProfile> {
  const resp = await axios.post<UserProfile>(`${BASE}/users`, { id, name });
  return resp.data;
}

export async function awardBadge(userId: string, badgeId: string): Promise<UserProfile> {
  const resp = await axios.post<UserProfile>(`${BASE}/users/${userId}/badge/${badgeId}`);
  return resp.data;
}

export async function spinWheel(userId: string): Promise<SpinResult> {
  const resp = await axios.post<SpinResult>(`${BASE}/users/${userId}/spin`);
  return resp.data;
}

export async function getLeaderboard(): Promise<UserProfile[]> {
  const resp = await axios.get<UserProfile[]>(`${BASE}/leaderboard`);
  return resp.data;
}
