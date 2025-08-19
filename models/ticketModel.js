import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'user'
    },
    subject: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      set: (value) => (value === "" ? "low" : value.toLowerCase()), // Set empty strings to "low"
    },
    attachment: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      enum: ["general", "account", "transactional"],
      default: "general",
      set: (value) => (value === "" ? "general" : value.toLowerCase()), // Set empty strings to "low"
    },
    description: {
      type: String,
      set: (value) => value.replace(/\n/g, " "), // Replaces all "\n" with a space
    },
    status: {
      type: String,
      enum: ["open", "in process", "closed"],
      default: "open",
      set: (value) => (value === "" ? "open" : value.toLowerCase()), // Set empty strings to "low"
    },
    comments: {
      type: [
        {
          from: {
            type: String,
            required: [true, "Role is required"],
            enum: ["user", "admin"],
          },
          message: {
            type: String,
            required: [true, "Message is required"],
          },
          fromId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'owner_and_sons'
          }
        },
      ],
    },
  },
  { timestamps: true }
);

const ticketModel = mongoose.model("ticket", ticketSchema);

export default ticketModel;
