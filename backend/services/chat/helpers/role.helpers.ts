import { timingSafeEqual } from "crypto";
import { ApiError } from "../middlewares/chat.middlewares";

// Who is writing this message?
//  - no x-internal-key            → the user (came through the gateway)
//  - correct x-internal-key       → the agent service saving its reply
//  - any other key                → misconfiguration or forgery: reject, never save it as either role
export const messageRoleFrom = (internalKey: string | undefined, expectedKey: string): "user" | "assistant" => {
    if (internalKey === undefined || internalKey === "") return "user";
    const a = Buffer.from(internalKey);
    const b = Buffer.from(expectedKey);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new ApiError(401, "Invalid internal key");
    }
    return "assistant";
};
