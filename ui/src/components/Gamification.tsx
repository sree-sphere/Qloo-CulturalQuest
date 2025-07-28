import React, { useState, useEffect } from 'react';
import { createUser, awardBadge, spinWheel, getLeaderboard } from '../api/gamifyApi';
import { UserProfile } from '../models/user';

export function Gamification() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);

  // On mount, demo user "user1"
  useEffect(() => {
    createUser('user1', 'Alice').then(u => setUser(u));
    refreshBoard();
  }, []);

  function refreshBoard() {
    getLeaderboard().then(setLeaderboard);
  }

  async function handleBadge() {
    if (!user) return;
    const u = await awardBadge(user.id, 'heritage-festival');
    setUser(u);
    refreshBoard();
  }

  async function handleSpin() {
    if (!user) return;
    const res = await spinWheel(user.id);
    alert(`You got ${res.reward} points! Total: ${res.totalPoints}`);
    refreshBoard();
  }

  return (
    <div>
      <h3>Gamification</h3>
      {user && (
        <div>
          <p>{user.name}: {user.points} pts</p>
          <button onClick={handleBadge}>Award Festival Badge</button>
          <button onClick={handleSpin}>Spin the Wheel</button>
        </div>
      )}

      <h4>Leaderboard</h4>
      <ol>
        {leaderboard.map(u => (
          <li key={u.id}>{u.name} – {u.points} pts</li>
        ))}
      </ol>
    </div>
  );
}
