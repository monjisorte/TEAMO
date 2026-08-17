import type { Express, Request, Response, NextFunction } from "express";

// Replit Auth setup (simplified version for this application)
export async function setupAuth(app: Express): Promise<void> {
  // For now, we'll use a simple middleware that allows all requests
  // In production, this should be replaced with proper Replit Auth
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // For now, we'll allow all requests and set a dummy user
  // In production, this should check actual authentication
  req.user = {
    claims: {
      sub: "user-1", // dummy user ID
    },
  };
  next();
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        claims?: {
          sub?: string;
        };
      };
    }
  }
}
