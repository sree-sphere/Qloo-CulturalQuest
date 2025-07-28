import express from 'express';
import { QlooService } from '../services/qlooService';
import { GamificationService } from '../services/gamificationService';
import { chatWithContext } from '../core/hyperLocalization';
import { logger } from '../utils/logger';

export const router = express.Router();
const qloo = new QlooService();
const gamify = new GamificationService();

// Create user
router.post('/users', (req, res) => {
  const { id, name } = req.body;
  const user = gamify.createUser(id, name);
  res.json(user);
});

// Get destination recommendations
router.get('/places', async (req, res) => {
  const { tags, entities, location, take } = req.query;
  const result = await qloo.getPlaces({
    tags: tags ? (tags as string).split(',') : undefined,
    entities: entities ? (entities as string).split(',') : undefined,
    locationQuery: location as string
  }, Number(take) || 5);
  res.json(result);
});

// Gamification endpoints
router.post('/users/:uid/badge/:badgeId', (req, res) => {
  const { uid, badgeId } = req.params;
  try {
    const user = gamify.awardBadge(uid, badgeId);
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.post('/users/:uid/spin', (req, res) => {
  const { uid } = req.params;
  try {
    const spin = gamify.spinWheel(uid);
    res.json(spin);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.get('/leaderboard', (req, res) => {
  res.json(gamify.getLeaderboard());
});

// Hyper-local chat
router.post('/chat', async (req, res) => {
  const { userId, message } = req.body;
  try {
    const answer = await chatWithContext(userId, message);
    res.json({ reply: answer });
  } catch (err) {
    logger.error(`Chat error: ${(err as Error).message}`);
    res.status(500).json({ error: 'LLM failed' });
  }
});
