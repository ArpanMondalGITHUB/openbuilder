// Graph runs in progress, keyed `${userId}:${requestId}` so a user can only cancel their own.
// In-process only: with several agent replicas, broadcast cancels over Redis pub/sub instead.
export const inflight = new Map<string, AbortController>()

export const inflightKey = (userId: string, requestId: string) => `${userId}:${requestId}`
