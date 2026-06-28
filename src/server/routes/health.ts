import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import Redis from "ioredis";
import { config } from "../config/index";

const router = Router();

// Cache variables or checks
let redisTestClient: Redis | null = null;
try {
  redisTestClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    retryStrategy: () => null // Try once and stop retrying to avoid spam
  });
  redisTestClient.on("error", () => {
    // Fail silently on test client
  });
} catch (e) {
  // Silent catch
}

/**
 * GETL /health - Simple liveness check
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

/**
 * GET /ready - Deep readiness check verifying dependencies
 */
router.get("/ready", async (req: Request, res: Response) => {
  let redisReady = false;
  let firebaseReady = false;

  // Verify Redis
  if (redisTestClient) {
    try {
      const ping = await redisTestClient.ping();
      redisReady = ping === "PONG";
    } catch {
      redisReady = false;
    }
  }

  // Verify Firebase Admin
  try {
    const apps = admin.apps;
    firebaseReady = apps.length > 0;
  } catch {
    firebaseReady = false;
  }

  const isReady = firebaseReady; // Redis is highly encouraged but optional fallback structure exists

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    services: {
      firebaseAdmin: firebaseReady,
      redisCache: redisReady
    }
  });
});

/**
 * GET /metrics - Performance indices & server indicators
 */
router.get("/metrics", (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();

  res.json({
    uptime_seconds: uptime,
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    node_version: process.version,
    pid: process.pid
  });
});

export default router;
