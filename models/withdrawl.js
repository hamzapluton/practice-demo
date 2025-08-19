import mongoose from "mongoose";

const wihdrawlSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "owner_and_sons",
      // required : true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wallet_bank",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNo: {
      type: String,
      required: true,
    },
    rfcNo: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
    },
    type: {
      type: String,
      enum: ["investor", "ownerSon1", "ownerSon2", "ownerSon3"],
      default: "investor",
    },
    file: {
      type: String,
    },
    document: {
      type: String,
    },
    status: {
      type: String,
      enum: ["processing", "approved", "cancelled"],
      default: "processing",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isCancel: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const WithDrawl = mongoose.model("wihdrawl", wihdrawlSchema);

export default WithDrawl;
