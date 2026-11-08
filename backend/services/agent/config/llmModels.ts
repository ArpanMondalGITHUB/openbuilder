import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";

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

const openrouter = new ChatOpenRouter({
  model:"cohere/north-mini-code:free",
  temperature: 0,
})

export const getmodel = (agent: string) => {
  switch (agent) {
    case "chat":
      return geminiFlash;

    case "search":
      return geminiFlash;

    case "coding":
      return openrouter;

    case "pdf":
      return geminiPro;

    case "imageGen":
      return geminiPro;

    case "ppt":
      return geminiPro;

    default:
      return geminiFlash;
  }
};