import Joi from "joi";

// Joi schema for comments
const commentSchema = Joi.object({
  from: Joi.string().valid("user", "admin").required().lowercase().messages({
    "any.only": "Comment 'from' must be either 'user' or 'admin'.",
    "string.base": "'from' should be a type of text.",
    "any.required": "Role is required.",
  }),
  message: Joi.string().required().messages({
    "string.base": "'message' should be a type of text.",
    "any.required": "Message is required.",
  }),
});

// Main Joi schema for Ticket
export const ticketSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.pattern.base": "'userId' must be a valid MongoDB ObjectId.",
    "string.empty": "'userId' cannot be empty.",
    "any.required": "'userId' is required.",
  }),
  subject: Joi.string().required().messages({
    "string.empty": "'subject' cannot be empty.",
    "any.required": "'subject' is required.",
  }),
  priority: Joi.string()
    .valid("low", "medium", "high")
    .default("low")
    .empty("")
    .lowercase()
    .messages({
      "any.only": "'priority' must be one of low, medium or high.",
    }),
  attachment: Joi.string().optional(),
  category: Joi.string()
    .valid("general", "account", "transactional")
    .default("general")
    .empty("")
    .lowercase()
    .messages({
      "any.only":
        "'category' must be one of general, account or transactional.",
    }),
  description: Joi.string()
    .replace(/\n/g, " ") // Replace "\n" with a space
    .allow("")
    .optional(),
  status: Joi.string()
    .valid("open", "in process", "closed")
    .default("open")
    .empty("")
    .lowercase()
    .messages({
      "any.only": "'status' must be one of ['open', 'in process', 'closed'].",
    }),
  comments: Joi.array().items(commentSchema).optional(),
});

export const updateTicketSchema = Joi.object({
  userId: Joi.string().optional().messages({
    "string.pattern.base": "'userId' must be a valid MongoDB ObjectId.",
    "string.empty": "'userId' cannot be empty.",
    "any.required": "'userId' is required.",
  }),
  subject: Joi.string().optional().messages({
    "string.empty": "'subject' cannot be empty.",
  }),
  priority: Joi.string()
    .valid("low", "medium", "high")
    .default("low")
    .empty("")
    .lowercase()
    .optional()
    .messages({
      "any.only": "'priority' must be one of low, medium or high.",
    }),
  attachment: Joi.string().optional(),
  category: Joi.string()
    .valid("general", "account", "transactional")
    .default("general")
    .empty("")
    .lowercase()
    .optional()
    .messages({
      "any.only":
        "'category' must be one of general, account or transactional.",
    }),
  description: Joi.string()
    .replace(/\n/g, " ") // Replace "\n" with a space
    .allow("")
    .optional(),
  status: Joi.string()
    .valid("open", "in process", "closed")
    .default("open")
    .empty("")
    .lowercase()
    .optional()
    .messages({
      "any.only": "'status' must be one of ['open', 'in process', 'closed'].",
    }),
  comment: Joi.string().trim().optional().not("").messages({
    "string.base": "'comment' should be a type of text.",
    "string.empty": "'comment' cannot be an empty string.",
  }),
});
