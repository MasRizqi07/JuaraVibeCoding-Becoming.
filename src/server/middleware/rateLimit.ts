import Redis from "ioredis";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { config } from "../config/index";
import { logEvent } from "../utils/logger";

let redisClient: Redis | null = null;
let isRedisConnected = false;

// Initialize Redis client lazily and register connection error events
try {
  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy(times) {
      // Return null to stop retrying after 1 additional attempt to prevent log spam
      if (times > 1) {
        return null;
      }
      return 1000; // Wait 1 second before retrying once
    }
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    logEvent({
      level: "info",
      message: `[Redis Rate Limiter] Client connected to Redis at ${config.redisUrl}`,
    });
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
    logEvent({
      level: "warn",
      message: `[Redis Rate Limiter] Redis connection error: ${err.message}. Falling back to in-memory rates.`,
    });
  });
} catch (err: any) {
  logEvent({
    level: "warn",
    message: `[Redis Rate Limiter] Redis initialization failed: ${err.message}. Inline fallback enabled.`,
  });
}

// In-Memory Rate Limiter Fallback for development/isolation environments
interface InMemoryRecord {
  count: number;
  resetTime: number;
}
const localLimitStore = new Map<string, InMemoryRecord>();

/**
 * Clean up expired local rate-limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of localLimitStore.entries()) {
    if (now > record.resetTime) {
      localLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Hourly clean

/**
 * Distributed / In-Memory robust Rate Limiter Middleware
 * Limit: 5 requests per hour per user based on verified Firebase UID.
 */
export async function userRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.decodedUser?.uid;
  if (!userId) {
    // Missing verified user state. This endpoint should have gone through auth first.
    return res.status(401).json({ error: "Unauthorized: Verified user trace is required for analytics rate-limiting" });
  }

  const limit = 5;
  const windowSeconds = 3600; // 1 hour
  const redisKey = `rate_limit:analyze:${userId}`;
  const now = Date.now();

  if (redisClient && isRedisConnected) {
    try {
      // Redis pipeline for atomic transaction increments & TTLs
      const pipeline = redisClient.multi();
      pipeline.incr(redisKey);
      pipeline.ttl(redisKey);
      
      const results = await pipeline.exec();
      if (results && results[0] && results[1]) {
        const count = results[0][1] as number;
        let ttl = results[1][1] as number;

        // If newly created, set expiry time
        if (ttl === -1) {
          await redisClient.expire(redisKey, windowSeconds);
          ttl = windowSeconds;
        }

        if (count > limit) {
          const retryAfter = ttl > 0 ? ttl : windowSeconds;
          res.setHeader("Retry-After", retryAfter.toString());
          logEvent({
            level: "warn",
            message: `[RateLimit Blocked] Redis blocked analyze call by user ${userId}. Count: ${count}`,
            userId,
            path: req.path,
          });
          return res.status(429).json({
            error: "Too many requests. Limit is 5 analysis requests per hour per user.",
            retryAfter,
          });
        }
      }
      return next();
    } catch (redisErr: any) {
      logEvent({
        level: "error",
        message: `Redis rate-limiter fault, using local fallback memory: ${redisErr.message}`,
        userId,
      });
    }
  }

  // Fallback map-based Rate Limiter (Seamless local runtime & recovery)
  const userRecord = localLimitStore.get(userId);
  if (!userRecord) {
    localLimitStore.set(userId, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return next();
  }

  if (now > userRecord.resetTime) {
    // Reset window
    userRecord.count = 1;
    userRecord.resetTime = now + windowSeconds * 1000;
    return next();
  }

  userRecord.count += 1;
  if (userRecord.count > limit) {
    const remainingMs = Math.max(0, userRecord.resetTime - now);
    const retryAfter = Math.ceil(remainingMs / 1000);
    res.setHeader("Retry-After", retryAfter.toString());
    
    logEvent({
      level: "warn",
      message: `[RateLimit Blocked] Inline fallback blocked analyze call by user ${userId}. Count: ${userRecord.count}`,
      userId,
      path: req.path,
    });
    
    return res.status(429).json({
      error: "Too many requests. Limit is 5 analysis requests per hour per user.",
      retryAfter,
    });
  }

  next();
}

export default userRateLimiter;
