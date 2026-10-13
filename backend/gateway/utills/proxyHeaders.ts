export const forwardUserHeaders = (proxyReqOpts: any, srcReq: any) => {
    const user = (srcReq as any).user
    if (user) {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.id
        proxyReqOpts.headers["x-user-jti"] = srcReq.user.jti
    }
    const forwardedFor = srcReq.headers["x-forwarded-for"]
    const chain = Array.isArray(forwardedFor) ? forwardedFor.join(", ") : forwardedFor
    proxyReqOpts.headers["x-forwarded-for"] = [chain, srcReq.socket.remoteAddress].filter(Boolean).join(", ")
    return proxyReqOpts
}