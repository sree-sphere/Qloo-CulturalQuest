import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY missing in .env');

const openai = new OpenAI({ apiKey });

/**
 * sends a chat message to the llm with travel context and hyper-localization prompts.
 * @param userId user ID (pending context integration).
 * @param message user’s raw chat message.
 */
export async function chatWithContext(userId: string, message: string): Promise<string> {
  const systemPrompt = `
You are a personalized travel assistant. You know the user's taste profile from Qloo, and you should:
- if they say "nostalgic", recommend heritage/retro spots.
- if they mention a city, surface that locale’s hidden gems.
- Otherwise, suggest culturally relevant travel experiences.
All responses should be friendly and actionable.
  `.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: message }
    ]
  });

  return response.choices[0].message?.content ?? 'Sorry, I had trouble generating a reply.';
}
