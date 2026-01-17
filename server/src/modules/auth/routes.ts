import { Router } from "express";
import { AuthController } from "./controller";
import { validate } from "../../middleware/validation.middleware";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { registerSchema, loginSchema } from "../../validation/auth.validation";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), AuthController.register);

router.post(
  "/login",
  validate(loginSchema),
  AuthController.login
);

// Protected routes
router.post("/logout", authenticate, AuthController.logout);

router.get("/me", authenticate, AuthController.getProfile);

// Additional role-based routes (optional)
router.get(
  "/users",
  authenticate,
  authorize("LANDLORD"),
  AuthController.getUsersByRole
);

export default router;
