import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { text, rate, pitch } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    const id = randomUUID();
    const tmpDir = os.tmpdir();
    const aiffPath = join(tmpDir, `tts-${id}.aiff`);
    const wavPath = join(tmpDir, `tts-${id}.wav`);

    // macOS `say` command — generates AIFF audio from text
    // Rate: words per minute (default ~175, range 1-500)
    const sayRate = rate && rate > 1 ? Math.round(175 * rate) : 175;
    
    // Escape the text for shell safety
    const escapedText = text.replace(/'/g, "'\\''");

    await execAsync(
      `say -o '${aiffPath}' -r ${sayRate} '${escapedText}'`
    );

    // Convert AIFF to WAV using afconvert (built-in macOS tool)
    await execAsync(
      `afconvert -f WAVE -d LEI16@22050 '${aiffPath}' '${wavPath}'`
    );

    // Read the WAV file
    const audioBuffer = await readFile(wavPath);

    // Clean up temp files
    await unlink(aiffPath).catch(() => {});
    await unlink(wavPath).catch(() => {});

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json(
      { error: 'TTS generation failed', details: error.message },
      { status: 500 }
    );
  }
}
