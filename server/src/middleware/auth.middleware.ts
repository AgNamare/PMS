// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AuthUtils } from "../utils/auth.utils";
import prisma from "../utils/prisma.utils";

interface ResourceParams {
  id: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await AuthUtils.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated.",
      });
    }

    const payload = AuthUtils.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, role: true, landlordId: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated or does not exist.",
      });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions",
      });
    }

    next();
  };
};

// Special middleware for landlord-specific resources
export const authorizeLandlordResource = async (
  req: Request<ResourceParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // If user is a landlord, they can access their own resources
    if (req.user.role === "LANDLORD") {
      // Check if the resource belongs to this landlord
      const resourceId = parseInt(req.params.id);
      const resource = await prisma.property.findUnique({
        where: { id: resourceId },
        select: { landlordId: true },
      });

      if (!resource || resource.landlordId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only access your own resources",
        });
      }
    }

    // If user is an agent/tenant, check if they're under the correct landlord
    else if (req.user.role === "AGENT" || req.user.role === "TENANT") {
      // Agents and tenants can only access resources they're assigned to
      // This would require additional checks based on your business logic
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access restricted",
      });
    }

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization error",
    });
  }
};
