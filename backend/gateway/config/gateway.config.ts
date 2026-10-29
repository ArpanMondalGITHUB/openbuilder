const required = (name: string): string => {
    const v = process.env[name]
    if (!v) throw new Error(`Missing required env var: ${name}`)
    return v
}

export const config = {
    port: Number(process.env.PORT ?? 8000),
    jwtSecret: required("JWT_SECRET"),
    authServiceUrl: required("AUTH_SERVICE"),
    chatServiceUrl: required("CHAT_SERVICE"),
    agentServiceUrl: required("AGENT_SERVICE"),
}