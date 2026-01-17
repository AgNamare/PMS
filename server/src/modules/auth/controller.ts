// controllers/auth.controller.ts
import { Request, Response } from "express";
import { UserRole } from "../../generated/prisma/enums";
import { AuthUtils } from "../../utils/auth.utils";
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserProfile,
} from "../../types/auth.types";
import prisma from "../../utils/prisma.utils";


export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        role,
        landlordId,
      }: RegisterRequest = req.body;

      // Check if email already exists (email is unique in your schema)
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Validate landlord exists if landlordId is provided
      if (landlordId) {
        const landlord = await prisma.user.findUnique({
          where: { id: landlordId, role: "LANDLORD" },
        });

        if (!landlord) {
          return res.status(400).json({
            success: false,
            message: "Invalid landlord ID or landlord not found",
          });
        }
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone || null,
          password: hashedPassword,
          role: role as UserRole,
          landlordId: landlordId || null,
        },
      });

      // Generate JWT
      const token = AuthUtils.generateToken(
        user.id,
        user.role,
        user.landlordId || undefined
      );

      // Prepare response
      const response: AuthResponse = {
        success: true,
        message: "Registration successful",
        data: {
          accessToken: token,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || undefined,
            role: user.role,
            landlordId: user.landlordId || undefined,
          },
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error("Registration error:", error);

      // Handle Prisma unique constraint errors
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { identifier, password }: LoginRequest = req.body;

      // Find user by email (phone is optional in your schema)
      let user = await prisma.user.findUnique({
        where: { email: identifier },
      });

      // Also check by phone if not found by email
      if (!user && identifier.includes("+")) {
        const userByPhone = await prisma.user.findFirst({
          where: { phone: identifier },
        });

        if (userByPhone) {
          user = userByPhone;
        }
      }

      // Generic error message for security
      const genericError = {
        success: false,
        message: "Invalid credentials",
      };

      if (!user) {
        return res.status(401).json(genericError);
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Verify password
      const isValidPassword = await AuthUtils.comparePassword(
        password,
        user.password
      );

      if (!isValidPassword) {
        return res.status(401).json(genericError);
      }

      // Generate JWT
      const token = AuthUtils.generateToken(
        user.id,
        user.role,
        user.landlordId || undefined
      );

      const response: AuthResponse = {
        success: true,
        message: "Login successful",
        data: {
          accessToken: token,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || undefined,
            role: user.role,
            landlordId: user.landlordId || undefined,
          },
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);

      if (token && req.user) {
        await AuthUtils.blacklistToken(token, req.user.userId);
      }

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          landlordId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const profile: UserProfile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || undefined,
        role: user.role,
        isActive: user.isActive,
        landlordId: user.landlordId || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Optional: Additional endpoint for role-based user listing
  static async getUsersByRole(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { role } = req.query;

      // Only landlords can list their agents/tenants
      if (req.user.role !== "LANDLORD") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can list users",
        });
      }

      const users = await prisma.user.findMany({
        where: {
          role: role as UserRole,
          landlordId: req.user.userId, // Only show users under this landlord
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
