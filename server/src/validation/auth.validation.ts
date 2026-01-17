// validation/auth.validation.ts
import Joi from "joi";

export const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters",
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Phone must be a valid international number",
    }),
  password: Joi.string()
    .min(8)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
      )
    )
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
  role: Joi.string().valid("LANDLORD", "AGENT", "TENANT").required().messages({
    "any.only": "Role must be one of: LANDLORD, AGENT, TENANT",
    "string.empty": "Role is required",
  }),
  landlordId: Joi.number().integer().positive().optional().messages({
    "number.base": "Landlord ID must be a number",
  }),
}).custom((value, helpers) => {
  // If user is AGENT or TENANT, landlordId might be required
  // You can add specific business logic here
  if (
    (value.role === "AGENT" || value.role === "TENANT") &&
    !value.landlordId
  ) {
    // Warn but don't fail - landlordId might be assigned later
    console.warn("Agent/Tenant registered without landlordId");
  }
  return value;
});

export const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    "string.empty": "Email or phone is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});
