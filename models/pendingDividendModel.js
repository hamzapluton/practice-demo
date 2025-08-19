import mongoose from "mongoose";

const pendingDividendSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    dividendValue: {
      type: mongoose.Schema.Types.Number,
      default: 0,
    },
    createdAt: {
      type: mongoose.Schema.Types.Date,
      default: Date.now,
      required: false,
    },
  },
  { timestamps: true }
);

const PendingDividend = mongoose.model(
  "pending_dividend",
  pendingDividendSchema
);

export default PendingDividend;
