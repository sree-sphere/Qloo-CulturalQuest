import React, { useState } from 'react';
import { chat } from '../api/chatApi';

export function ChatBox({ userId }: { userId: string }) {
  const [msg, setMsg] = useState('');
  const [reply, setReply] = useState<string | null>(null);

  async function send() {
    const r = await chat(userId, msg);
    setReply(r);
  }

  return (
    <div>
      <h3>Travel Chat</h3>
      <textarea
        rows={2}
        value={msg}
        onChange={e => setMsg(e.target.value)}
      />
      <br />
      <button onClick={send}>Send</button>
      {reply && (
        <div style={{ marginTop: '1em', whiteSpace: 'pre-wrap' }}>
          <strong>Assistant:</strong> {reply}
        </div>
      )}
    </div>
  );
}