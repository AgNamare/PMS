// types/auth.types.ts
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string; // Required in your schema
  phone?: string;
  password: string;
  role: "LANDLORD" | "AGENT" | "TENANT";
  landlordId?: number; // Optional for tenants/agents
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      role: string;
      landlordId?: number;
    };
  };
}

export interface JwtPayload {
  userId: number;
  role: string;
  landlordId?: number;
  iat: number;
  exp: number;
}

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  landlordId?: number;
  createdAt: Date;
  updatedAt: Date;
}
