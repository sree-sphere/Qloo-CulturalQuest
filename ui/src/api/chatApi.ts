import axios from 'axios';

const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000/api';

export async function chat(userId: string, message: string): Promise<string> {
  const resp = await axios.post<{ reply: string }>(`${BASE}/chat`, { userId, message });
  return resp.data.reply;
}
