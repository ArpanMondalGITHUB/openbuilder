import { END, START, StateGraph } from "@langchain/langgraph";
import { agentState } from "./state";
import { router } from "./router";
import { chatAgent } from "../agents/chat.agent";
import { searchAgent } from "../agents/search.agent";
import { codingAgent } from "../agents/coding.agent";
import { pdfAgent } from "../agents/pdf.agent";
import { pptAgent } from "../agents/ppt.agent";
import { imagGenAgent } from "../agents/imagegen.agent";

const workFlow = new StateGraph(agentState);

workFlow
  .addNode("router", router)
  .addNode("chat", chatAgent)
  .addNode("search", searchAgent)
  .addNode("coding", codingAgent)
  .addNode("pdf", pdfAgent)
  .addNode("ppt", pptAgent)
  .addNode("imageGen", imagGenAgent)
  .addEdge(START, "router")
  .addConditionalEdges("router", (state: any) => {
    const agent = String(state?.agent ?? "chat");

    switch (agent) {
      case "search":
        return "search";
      case "coding":
        return "coding";
      case "pdf":
        return "pdf";
      case "ppt":
        return "ppt";
      case "imageGen":
        return "imageGen";
      case "chat":
      default:
        return "chat";
    }
  }, {
    chat: "chat",
    search: "search",
    coding: "coding",
    pdf: "pdf",
    ppt: "ppt",
    imageGen: "imageGen",
  })
  .addEdge("chat", END)
  .addEdge("search", "chat")
  .addEdge("coding", END)
  .addEdge("pdf", END)
  .addEdge("ppt", END)
  .addEdge("imageGen", END);

export const graph = workFlow.compile();