import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatBedrockConverse } from "@langchain/aws";
import { config } from "./agent.config";
import {ChatGoogleGenerativeAI} from '@langchain/google-genai';

const openrouter = new ChatOpenRouter({
  model:"cohere/north-mini-code:free",
  temperature: 0,
})

const geminiFlash = new ChatGoogleGenerativeAI({
  model: "gemini-3.8-flash",
  temperature: 0,
  maxRetries: 2,
  streaming:true
});

const geminiPro = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  maxRetries: 2,
  streaming:true
});


const { region, accessKeyId, secretAccessKey } = config.bedrock;

// Bedrock wants the model ID, not the display name ("DeepSeek V3.2" -> "deepseek.v3.2").
// It's on-demand in the region itself (no us./global. inference profile) and caps output at 8K tokens.
const deepseek = new ChatBedrockConverse({
  model: "deepseek.v3.2",
  region,
  temperature: 0,
  maxTokens: 8192,
  maxRetries: 2,
  // explicit keys only if set; otherwise the SDK picks up AWS_BEARER_TOKEN_BEDROCK / the default chain
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
});


export const getmodel = (agent: string) => {
  switch (agent) {
    case "router":
      return openrouter;

    case "chat":
      return openrouter;

    case "search":
      return openrouter;

    case "coding":
      return openrouter;

    case "pdf":
      return openrouter;

    case "imageGen":
      return openrouter;

    case "ppt":
      return openrouter;

    default:
      return geminiFlash;
  }
};