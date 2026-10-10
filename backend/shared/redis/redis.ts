import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis_url= process.env.REDIS_URL
let redis: Redis | null = null;

if (!redis_url) {
    console.warn("REDIS_URL is not defined; Redis is disabled");
} else {
    redis = new Redis(redis_url, {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
    });

    redis.on("connect",()=>{
        console.log("redis connected")
    });

    redis.on("error",(error)=>{
        console.error("redis error", error.message)
    });
}

export const redisGet = async (key: string): Promise<string | null> => {
    if (!redis) return null;
    try {
        return await redis.get(key);
    } catch (error) {
        console.error("redis get failed", error);
        return null;
    }
};

export const redisSet = async (key: string, value: string, seconds: number): Promise<void> => {
    if (!redis) return;
    try {
        await redis.set(key, value, "EX", seconds);
    } catch (error) {
        console.error("redis set failed", error);
    }
};

export const redisDel = async (key: string): Promise<void> => {
    if (!redis) return;
    try {
        await redis.del(key);
    } catch (error) {
        console.error("redis del failed", error);
    }
};

export default redis;
