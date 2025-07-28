import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || ''
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('Converting text to speech:', text.substring(0, 50) + '...');

    // Use more optimal settings for web playback
    const audioResponse = await elevenlabs.textToSpeech.convert('gs0tAILXbY5DNrJrsM6F', {
      text: text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128', // Good balance of quality and size
      voiceSettings: {
        stability: 0.75,
        similarityBoost: 0.75,
        style: 0.5,
        useSpeakerBoost: true
      }
    });

    // Handle different response types with better error handling
    let audioBuffer: ArrayBuffer;
    
    try {
      if (audioResponse instanceof ReadableStream) {
        const reader = audioResponse.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        audioBuffer = result.buffer;
      } else if (audioResponse instanceof ArrayBuffer) {
        audioBuffer = audioResponse;
      } else {
        // Handle other response types
        const arrayBuffer = await (audioResponse as any).arrayBuffer();
        audioBuffer = arrayBuffer;
      }

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        throw new Error('Empty audio buffer received');
      }

      console.log(`TTS successful: ${audioBuffer.byteLength} bytes generated`);

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache', // Prevent caching issues
        },
      });

    } catch (bufferError) {
      console.error('Audio buffer processing error:', bufferError);
      throw new Error('Failed to process audio response');
    }

  } catch (error) {
    console.error('TTS Error:', error);
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to generate audio',
      details: errorMessage 
    }, { status: 500 });
  }
}