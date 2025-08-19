import mongoose from "mongoose";
import { WALLET_TYPES } from "#constants/user";

const donationShareTransferSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: Object.values(WALLET_TYPES),
    default: WALLET_TYPES.reserve,
    lowercase: true
},
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'wallet_bank'
},
  share: {
    type: Number,
    require: true,
  },
  memo: {
    type: String,
     },
},{timestamps:true});

const DonationShareTransfer = mongoose.model("donation_share_transfer", donationShareTransferSchema);

export default DonationShareTransfer;
