import { NextRequest } from 'next/server';
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
        sendLog(`Agent [VideoAnalyzer]: Encoding raw video directly for multi-modal analysis...`);

        // 1. Convert File to Base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Video = buffer.toString('base64');
        const videoType = file.type || "video/mp4";
        const dataUri = `data:${videoType};base64,${base64Video}`;

        sendLog("Agent [Nemotron Nano]: Calling Multi-modal Endpoint with full video context (/no_think)...");

        // 2. Nemotron Nano Vision Processing (Full Video)
        const vilaResponse = await vilaClient.chat.completions.create({
          model: VILA_MODEL, 
          messages: [
            {
              role: "system",
              content: "/no_think", // Videos only support /no_think
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Describe what is happening in this esports gameplay video in vivid detail. Note the action, the environment, and the stakes." },
                {
                  type: "video_url",
                  video_url: {
                    url: dataUri,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
          temperature: 1,
          top_p: 1,
        });

        const sceneDescription = vilaResponse.choices[0]?.message?.content || "No description generated.";
        sendLog(`Agent [Nemotron Nano]: Scene context generated: "${sceneDescription.substring(0, 80).replace(/\n/g, ' ')}..."`);
        
        // 3. Nemotron Script Writer
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
