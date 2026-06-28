import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { config } from "../config/index";
import { logEvent } from "../utils/logger";

export interface AuthenticatedRequest extends Request {
  decodedUser?: {
    uid: string;
    email?: string;
  };
}

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: config.firebaseProjectId,
    });
    logEvent({
      level: "info",
      message: `[Firebase Admin] Initialized app for project: ${config.firebaseProjectId}`,
    });
  } catch (error: any) {
    logEvent({
      level: "warn",
      message: `[Firebase Admin Warning] Failed to initialize Firebase Admin app: ${error.message}`,
    });
  }
}

/**
 * Authentication middleware that verifies Firebase ID Token from Authorization header.
 * Attaches decodedUser {uid, email} to standard Request under strict mode.
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1]?.trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }
  
  if (!token) {
    logEvent({
      level: "warn",
      message: "Authentication failed: Missing token in header and query string",
      path: req.path,
    });
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  try {
    // In local development or staging, if the Admin auth verification throws because of network isolation,
    // we can check if it is a local developer test mode, but the rule requires strict verification.
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.decodedUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    
    logEvent({
      level: "info",
      message: `Successfully authenticated user with UID: ${decodedToken.uid}`,
      userId: decodedToken.uid,
      path: req.path,
    });
    
    next();
  } catch (error: any) {
    logEvent({
      level: "error",
      message: `Token verification failed: ${error.message}`,
      path: req.path,
      meta: { error },
    });
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}
export default authMiddleware;
