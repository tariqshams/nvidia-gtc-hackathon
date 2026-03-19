import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs';
import { nemotronClient, NEMOTRON_MODEL, vilaClient, VILA_MODEL } from '@/lib/nvidia';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      };

      try {
        const ffmpegPath = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
        const ffprobePath = join(
          process.cwd(),
          'node_modules',
          'ffprobe-static',
          'bin',
          os.platform(),
          os.arch(),
          os.platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe'
        );

        if (fs.existsSync(ffmpegPath)) {
          ffmpeg.setFfmpegPath(ffmpegPath);
        } else {
          sendLog(`Error: ffmpeg-static binary not found at ${ffmpegPath}`);
          controller.close();
          return;
        }

        if (fs.existsSync(ffprobePath)) {
          ffmpeg.setFfprobePath(ffprobePath);
        } else {
          sendLog(`Error: ffprobe-static binary not found at ${ffprobePath}`);
          controller.close();
          return;
        }

        sendLog("Agent [Orchestrator]: Analyzing request pipeline...");

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const excitement = formData.get('excitement') as string;

        if (!file) {
          sendLog("Error: No file uploaded");
          controller.close();
          return;
        }

        sendLog(`Agent [Orchestrator]: Received video segment (${file.size} bytes). Target Excitement: ${excitement}/10`);

        // 1. Save file locally
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempDir = os.tmpdir();
        const videoPath = join(tempDir, `input-${Date.now()}.mp4`);
        const framePath = join(tempDir, `frame-${Date.now()}.jpg`);
        
        await writeFile(videoPath, buffer);
        sendLog(`Agent [VideoAnalyzer]: Video saved locally, extracting keyframe context...`);

        // 2. Extract a frame
        await new Promise<void>((resolve, reject) => {
          ffmpeg(videoPath)
            .screenshots({
              timestamps: ['50%'],
              filename: framePath.split('/').pop(),
              folder: tempDir,
              size: '1280x720' // scale down to save token bandwidth
            })
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
        });

        sendLog("Agent [VideoAnalyzer]: Keyframe extracted successfully. Calling VILA Multi-modal Endpoint...");

        // 3. VILA Vision Processing
        const frameData = fs.readFileSync(framePath);
        const base64Frame = frameData.toString('base64');
        const dataUri = `data:image/jpeg;base64,${base64Frame}`;

        const vilaResponse = await vilaClient.chat.completions.create({
          model: VILA_MODEL,
          messages: [
            {
              role: "system",
              content: "/think",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Describe what is happening in this esports gameplay frame in vivid detail. Note the action, the environment, and the stakes." },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUri,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        const sceneDescription = vilaResponse.choices[0]?.message?.content || "No description generated.";
        sendLog(`Agent [VILA]: Scene context generated: "${sceneDescription.substring(0, 80)}..."`);
        
        // 4. Nemotron Script Writer
        sendLog(`Agent [ScriptWriter]: Invoking Nemotron 120B with context and Excitement=${excitement}...`);
        
        const scriptPrompt = `
You are an expert esports hyped caster generating a live narration script for an exciting clip.
Here is the scene description from our vision agent: ${sceneDescription}

The user requested an excitement level of ${excitement} out of 10. (1 = very calm golf announcer, 10 = screaming over-the-top stadium hype caster).

Generate a 2-3 sentence narration script for this moment. 
Return ONLY the text of the script. No XML, no markdown formatting, no prefix.
        `;

        const nemotronResponse = await nemotronClient.chat.completions.create({
          model: NEMOTRON_MODEL,
          messages: [{ role: "user", content: scriptPrompt }],
          temperature: 0.8,
          max_tokens: 1000,
        });

        const scriptText = nemotronResponse.choices[0]?.message?.content?.trim() || "No script generated.";
        sendLog(`Agent [ScriptWriter]: ${scriptText}`);
        
        // 5. Cleanup and finish
        try {
          fs.unlinkSync(videoPath);
          fs.unlinkSync(framePath);
        } catch (e: any) {
          // ignore cleanup errors
        }

        sendLog(`Agent [Orchestrator]: Pipeline complete. Narration ready for TTS playback.`);
        
        // Output audio hook if requested for the client to read
        sendLog(`|TTS_READY|${scriptText}`);

        controller.close();
      } catch (err: any) {
        sendLog(`Error: ${err.message}`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
