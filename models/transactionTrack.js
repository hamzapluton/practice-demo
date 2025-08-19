import mongoose from "mongoose";

const TransactionTrackSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  totalInvestedAmount: {
    type: Number,
    required: true,
  },
  dueAmount: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

const TransactionTrack = mongoose.model("transaction_track", TransactionTrackSchema);

export { TransactionTrack };
