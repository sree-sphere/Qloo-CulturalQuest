// // /src/app/api/chat/route.ts
// import { NextRequest } from 'next/server';

// export const runtime = 'edge';

// export async function POST(req: NextRequest) {
//   const { message } = await req.json();

//   const res = await fetch('https://api.openai.com/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       model: 'gpt-4o',
//       messages: [{ role: 'user', content: message }],
//       stream: true
//     })
//   });

//   return new Response(res.body, {
//     headers: {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive'
//     }
//   });
// }
