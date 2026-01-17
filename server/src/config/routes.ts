// src/routes/index.ts
import { Router } from "express";
import authRoutes from "../modules/auth/routes";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use("/auth", authRoutes);

export default router;
