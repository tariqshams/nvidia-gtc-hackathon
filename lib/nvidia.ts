import OpenAI from 'openai';

// Orchestrator Nemotron Client (Reasoning)
export const nemotronClient = new OpenAI({
  apiKey: process.env.NVIDIA_NEMOTRON_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const NEMOTRON_MODEL = process.env.NVIDIA_NEMOTRON_MODEL_ID || "nvidia/nemotron-3-super-120b-a12b";
export const NEMOTRON_PARAMS = {
  temperature: 1,
  top_p: 0.95,
  max_tokens: 16384,
  reasoning_budget: 16384,
  chat_template_kwargs: { "enable_thinking": true }
};

// VILA Client (Vision/Language)
export const vilaClient = new OpenAI({
  apiKey: process.env.NVIDIA_VILA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const VILA_MODEL = process.env.NVIDIA_VILA_MODEL_ID || "nvidia/vila";
