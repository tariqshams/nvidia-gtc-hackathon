# NVIDIA GTC Vibe Hack - AI Agent Development Guidelines

**Context:** We are competing in a 2-hour hackathon where the goal is to build an advanced Agentic AI application. Simple chatbots are not enough; the system must demonstrate autonomous reasoning, multi-step execution, and tool use.

## 💡 Project Vision: Esports "Hype Caster" Agent
**Core Concept:** A React-based web application where a user provides a video clip of an esports game (like Rocket League). The system analyzes the gameplay sequence, generates a dynamic script describing the events, and produces a narrated audio track.

**Key Features & Priority Constraints:**
- **React Frontend:** An extremely simple, minimal UI focused exclusively on core functionality. Do not waste time on complex UI components.
- **Excitement Slider:** A simple React slider input allowing the user to dynamically adjust the "hype" or excitement level of the generated script and narration.
- **Deep Agent Orchestration (The Focus):** The backend must orchestrate a clear, multi-step pipeline:
  1. **Vision/Context Extraction:** Analyzes the game video/frames to extract what is physically happening.
  2. **Narrative/Script Agent (Nemotron):** Uses NVIDIA endpoints (`build.nvidia.com/models?q=nemotron&pageSize=96`) to ingest the raw game data alongside the user's "excitement level", reasoning through the narrative pacing to write a compelling script.
  3. **TTS/Audio Agent:** Synthesizes the script into an energetic voiceover.

## 🚨 MANDATORY CONSTRAINTS 🚨
1. **Use NVIDIA Nemotron:** You MUST integrate NVIDIA Nemotron family models (e.g., `nvidia-nemotron-nano-9b-v2`, `Nemotron-super-120b-a12b`, `llama-3_3-nemotron-super-49b-v1_5`).
2. **Use NVIDIA NIM Endpoints:** API calls must route through `build.nvidia.com/models`. 
3. **Agentic, Not Chatbot:** The application MUST NOT be a simple prompt-response chatbot. It requires a workflow (tool calling, RAG, multi-agent, or ReAct).
4. **Time is Critical:** We have less than 2 hours. Prioritize MVP (Minimum Viable Product) functionality over minor UI polish. 

## 🧠 Architectural Priorities
- **Expose the Engine:** The UI MUST show the "thinking" process of the agent. Judges want to see step-by-step reasoning, tool invocations, and plan iterations visually in the application.
- **Focus on the Workflow:** Spend 80% of development effort on the orchestration (LangGraph, tool integration, multi-step reasoning) and 20% on the UI.
- **Reliability over Scope:** A scoped agent that reliably calls 2 tools and successfully completes its targeted workflow will score higher than an ambitious, failing 5-agent orchestrator.

## 🛠️ Recommended Stack
- **Framework:** LangGraph / LangChain / CrewAI for orchestration.
- **Frontend/Backend:** Next.js (Vercel) for rapid full-stack deployment, or Python FastAPI + Streamlit/Gradio if purely backend-focused.
- **Tools:** `Tavily` for fast web search capabilities. Using simple, reliable external APIs is highly encouraged.

## 🎯 Our Project Archetype: Multi-Agent Pipeline
Our project falls under the **Multi-Agent Teams** category. We will set up distinct worker agents that pass state sequentially:
`VideoAnalyzer Agent` → `Nemotron ScriptWriter Agent` (with Excitement parameter) → `AudioGenerator Agent`.

## 🤖 Directives for the AI Assistant / Coding Agent
As the AI pair programming in this hackathon, adhere strictly to the following:
- **Speed & Completeness:** Provide full, working code blocks. Avoid partial snippets with missing imports or placeholders (e.g., `// add logic here`).
- **Fail-Fast:** If a specific tool, dependency, or API is taking too long to configure, suggest an immediate, simpler pivot.
- **Scaffolding:** Emphasize rapid setup scripts and straightforward structure. 
- **Environment Mastery:** Ensure all code relies on `.env` variables (like `NVIDIA_API_KEY`). Remind the human developer to set them.
- **Logging is UI:** Ensure your backend design naturally emits events/logs for state changes, tool calls, and LLM "thoughts". The frontend MUST be able to easily stream and display these to satisfy the judges' rubric.

## 🏆 Judging Criteria to Optimize For
1. **Creativity:** Originality in addressing a challenge (Esports Caster AI is entirely unique and fits well!).
2. **Functionality:** It *must* work live and be stable.
3. **Scope of Completion:** Seamless and well-structured, polished implementation.
4. **Use of NVIDIA Nemotron Models:** Extensively utilizing and highlighting Nemotron's specialized function-calling and deep reasoning capabilities to dynamically alter the script based on a sliding parameter.

*Remember: Commit early, test often. It's about ideas deployed fast.*
