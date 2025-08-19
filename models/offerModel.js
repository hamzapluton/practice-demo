import mongoose from "mongoose";

const OfferModelSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['signup'],
      required: true,
    },
    targetShares: {
      type: Number,
      required: true,
    },
    rewardPercentage: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const Offers = mongoose.model("offer", OfferModelSchema);

export default Offers;
