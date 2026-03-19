# NVIDIA GTC Hackathon Implementation Plan

## Project
**Avatar Narrator for Video**

Build a web app that accepts a short video, analyzes it in timed segments, generates synchronized commentary with an NVIDIA Nemotron model, and presents the narration through an avatar layer such as NVIDIA ACE or Tokkio while the video plays.

The goal is not to build a generic chatbot. The goal is to demonstrate an agentic, multi-step workflow:

1. Ingest video
2. Extract context from the video over time
3. Use Nemotron to reason about what is happening and generate narration
4. Synchronize commentary with playback
5. Expose the pipeline so judges can see the system working

## Hackathon Fit

This concept aligns with the judging criteria if we make the following explicit in the implementation:

- **Use NVIDIA Nemotron** as the core reasoning and narration model
- **Use NVIDIA NIM endpoints** from `build.nvidia.com`
- **Show an agentic workflow**, not a single prompt-response interaction
- **Demonstrate multi-step execution** with visible trace output
- **Use a real avatar interface** for presentation if ACE or Tokkio is available

## Primary MVP

### What the MVP must do

- Upload a short video file
- Split the video into timestamped chunks
- Extract frames and optionally transcript/audio context per chunk
- Generate commentary for each chunk using Nemotron
- Play the video with synchronized avatar narration
- Show the step-by-step pipeline in the UI

### What the MVP does not need to do

- Real-time webcam or livestream processing
- Perfect low-latency speech overlap control
- Full conversational Q&A over the video
- High-polish design
- Multi-user support

## Product Behavior

The intended behavior is:

- A user uploads a video
- The system prepares a commentary timeline
- During playback, the avatar comments on what is happening at or near the current timestamp
- The commentary should feel like a narrator or host, not just a static summary shown after the video ends

## Recommended Technical Direction

### Core reasoning model

Use **`mistral-nemotron`** as the primary model for:

- scene interpretation from extracted context
- narration planning
- writing timestamped commentary lines
- deciding when to comment versus when to stay silent

Fallback:

- `nemotron-mini-4b-instruct` if speed, quota, or setup friction becomes an issue

### Avatar layer

Preferred:

- **NVIDIA ACE** or **Tokkio** if credentials and integration path are available

Fallback:

- simple web avatar panel with generated speech and animated speaker state

Important:

- the avatar layer is the presentation surface
- Nemotron remains the core reasoning requirement for prize alignment

### App shape

Fastest reliable implementation:

- **Frontend:** Next.js
- **Backend:** Next.js API routes or simple server actions
- **Media processing:** `ffmpeg`
- **Model calls:** direct HTTP calls to NVIDIA NIM endpoints
- **State streaming:** Server-Sent Events or polling for progress updates

This keeps the stack small and deployable.

## End-to-End Workflow

### Stage 1: Video ingestion

Input:

- user uploads a short video file, ideally under 60 to 120 seconds for the hackathon demo

Output:

- saved file
- metadata such as duration, resolution, and file type

### Stage 2: Segmenting

Split the video into fixed windows, for example:

- 3-second segments for action-heavy clips
- 5-second segments for general narration

Output per segment:

- `start_time`
- `end_time`
- one or more representative frames
- optional audio transcript for that time window

### Stage 3: Context extraction

For each segment, collect structured context:

- frame captions or visual descriptions
- OCR text if visible
- transcript snippet if audio is available
- rolling memory from prior segments

This stage can begin simple:

- extract key frames
- send image-derived descriptions or manual frame summaries into the narration prompt

If a dedicated vision path is not ready, the fallback is to use:

- extracted transcript
- scene timing
- lightweight metadata

and narrate from that.

### Stage 4: Nemotron narration planning

For each segment, call Nemotron with:

- current segment context
- prior segment memory
- desired narration style
- maximum length constraints
- optional hype or tone setting

Expected output should be structured JSON such as:

```json
{
  "segment_start": 12.0,
  "segment_end": 16.0,
  "should_speak": true,
  "commentary_text": "The player cuts across the field and lines up the final shot.",
  "tone": "energetic",
  "reason": "A meaningful event occurs in this segment."
}
```

We should require machine-readable output so playback sync remains reliable.

### Stage 5: Audio and avatar delivery

Convert approved commentary lines into speech and schedule them against timestamps.

Preferred:

- ACE or Tokkio speaks the line

Fallback:

- browser or API TTS with an avatar placeholder panel

Minimal sync logic:

- when playback crosses `segment_start`, trigger the associated narration
- skip or trim lines if playback is paused or scrubbed aggressively

### Stage 6: UI trace

Judges should be able to see:

- uploaded video
- current playback timestamp
- generated commentary timeline
- active avatar line
- execution log for each pipeline step

This is important for proving the project is agentic rather than a single hidden model call.

## Suggested Repository Structure

```text
app/
  page.tsx
  api/
    analyze/route.ts
    narrate/route.ts
    speak/route.ts
components/
  video-player.tsx
  avatar-panel.tsx
  timeline-panel.tsx
  execution-log.tsx
lib/
  nvidia.ts
  video.ts
  narration.ts
  types.ts
public/
tmp/
.env.example
README.md
IMPLEMENTATION_PLAN.md
```

## Major Components

### Frontend

- video upload control
- video player
- avatar display area
- commentary timeline
- execution log panel

### Backend services

- file intake and temporary storage
- video segmentation with `ffmpeg`
- frame extraction
- Nemotron request wrapper
- narration scheduler
- speech trigger endpoint

### Data model

Basic entities:

- `VideoJob`
- `VideoSegment`
- `NarrationLine`
- `ExecutionEvent`

Suggested TypeScript shape:

```ts
type VideoSegment = {
  id: string;
  startTime: number;
  endTime: number;
  framePaths: string[];
  transcriptText?: string;
  visualSummary?: string;
};

type NarrationLine = {
  id: string;
  startTime: number;
  endTime: number;
  shouldSpeak: boolean;
  text: string;
  tone: "neutral" | "hype" | "dramatic" | "educational";
  reason?: string;
};
```

## Implementation Phases

### Phase 0: Repo setup

- scaffold Next.js app
- add `.env.example`
- install `ffmpeg` dependency assumptions
- create a small upload and local processing loop

### Phase 1: Video pipeline

- upload video
- inspect metadata
- extract key frames every N seconds
- create timestamped segment records

Deliverable:

- user can upload a clip and see extracted timeline segments

### Phase 2: Nemotron integration

- wire NVIDIA API key
- add direct call wrapper for the selected Nemotron model
- generate commentary JSON for each segment
- store or return narration schedule

Deliverable:

- app can generate timestamped commentary from a sample video

### Phase 3: Playback sync

- play the video
- trigger commentary at the right timestamps
- render active line in UI

Deliverable:

- visible synchronized narration timeline

### Phase 4: Avatar integration

- connect ACE or Tokkio if access is available
- map scheduled narration to avatar speech
- show the avatar speaking during playback

Fallback deliverable:

- static avatar card plus TTS voice playback

### Phase 5: Demo hardening

- optimize prompts
- reduce latency
- tune comment density
- add visible execution log
- prepare one excellent sample clip

## Demo Strategy

For the live demo, optimize for one narrow but impressive flow:

- upload a short clip
- click analyze
- show the agent processing segments
- start playback
- the avatar narrates key events in sync
- show the execution trace and Nemotron usage clearly

Do not demo arbitrary edge cases unless the core path is stable.

## Prompting Strategy

Nemotron should not be asked to produce vague freeform text. Give it a strict role:

- You are a video narration planner.
- You receive timestamped context.
- You decide whether this segment deserves commentary.
- You produce short, spoken lines only when helpful.
- You must avoid repeating earlier lines.
- You must return strict JSON.

Prompt inputs per segment:

- current time window
- transcript snippet
- prior commentary memory
- desired narrator persona
- max words per line

This should reduce rambling and improve sync quality.

## Environment Variables

Minimum expected variables:

```bash
NVIDIA_API_KEY=
NVIDIA_MODEL_ID=mistral-nemotron
NEXT_PUBLIC_APP_NAME=Avatar Narrator
ACE_API_KEY=
TOKKIO_ENDPOINT=
TOKKIO_API_KEY=
```

If ACE and Tokkio are unavailable, those can remain unset and the app should use fallback mode.

## Risks and Mitigations

### Risk: ACE or Tokkio setup takes too long

Mitigation:

- ship a fallback avatar panel with TTS
- keep the architecture so ACE/Tokkio can be dropped in later

### Risk: video understanding is too weak

Mitigation:

- constrain the demo to short clips
- use transcript plus key frames
- choose video examples with clear visual events

### Risk: commentary timing feels delayed

Mitigation:

- precompute narration before playback begins
- do not attempt full streaming generation in the MVP

### Risk: model output is inconsistent

Mitigation:

- force strict JSON
- clamp line length
- cache generated commentary once approved

### Risk: too much scope for the hackathon

Mitigation:

- prioritize one excellent path:
  upload -> analyze -> narrate -> play with avatar

## Recommended MVP Scope Decision

For the hackathon, the best scoped version is:

- **Input:** uploaded short video
- **Reasoning model:** `mistral-nemotron`
- **Output:** timestamped narration schedule
- **Presentation:** avatar speaks while video plays
- **Judging support:** visible agent trace and Nemotron call evidence

Avoid these until after the MVP works:

- live stream commentary
- conversational follow-up Q&A
- multi-user sessions
- advanced editing controls

## Success Criteria

The project is successful if, during the demo:

- a user uploads a video
- the app visibly processes it in steps
- Nemotron generates commentary aligned to timestamps
- an avatar speaks those comments while the video plays
- the system clearly demonstrates multi-step reasoning and NVIDIA tool usage

## Immediate Next Build Tasks

1. Scaffold a Next.js app in this repo
2. Implement video upload and local temporary storage
3. Add `ffmpeg` frame extraction and segment generation
4. Add NVIDIA Nemotron API wrapper
5. Generate strict JSON narration schedule
6. Build playback timeline and commentary trigger logic
7. Integrate ACE or Tokkio if available, otherwise fallback to TTS
8. Add execution log panel for judging visibility

