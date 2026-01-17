import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../utils/prisma.utils";
import { JwtPayload } from "../types/auth.types";

// Check environment variables at runtime
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined in .env");
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || "3600");

export class AuthUtils {
  // Hash a password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password with hash
  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(
    userId: number,
    role: string,
    landlordId?: number
  ): string {
    const payload = { userId, role, landlordId };

    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN,
    };

    return jwt.sign(payload, JWT_SECRET, options);
  }

  // Verify JWT token
  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklisted = await prisma.blacklistedToken.findUnique({
        where: { token },
      });

      if (!blacklisted) return false;

      if (new Date() > blacklisted.expiresAt) {
        await prisma.blacklistedToken.delete({ where: { id: blacklisted.id } });
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Add token to blacklist
  static async blacklistToken(token: string, userId: number): Promise<void> {
    const payload = this.verifyToken(token);
    if (!payload) return;

    const expiresAt = new Date(payload.exp * 1000);

    try {
      await prisma.blacklistedToken.create({
        data: { token, expiresAt, userId },
      });
    } catch (error) {
      console.warn(
        "BlacklistedToken model not available. Consider adding it for logout functionality."
      );
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    return authHeader.substring(7);
  }
}
