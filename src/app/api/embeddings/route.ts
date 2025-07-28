// src/app/api/embeddings/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { text } = await req.json();
  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    const embedding = response.data[0].embedding;
    return NextResponse.json({ embedding });
  } catch (err: any) {
    console.error('[EMBEDDING_ERROR]', err);
    return NextResponse.json({ error: 'Failed to get embedding' }, { status: 500 });
  }
}
