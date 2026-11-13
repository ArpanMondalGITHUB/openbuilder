import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { ChatTurn } from "../models/agent.zod_models";

export const toMessages = (history: ChatTurn[]) =>
    history.map((turn) => (turn.role === "user" ? new HumanMessage(turn.content) : new AIMessage(turn.content)));
