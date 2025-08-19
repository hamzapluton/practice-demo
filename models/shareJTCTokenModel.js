import mongoose from "mongoose";
import { WALLET_TYPES } from "#constants/user";

const donationJtcTokenTransferSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'wallet_bank'
  },
  tokens: {
    type: Number,
    require: true,
  },
  memo: {
    type: String,
     },
},{timestamps:true});

const ShareJTCTokenTransfer = mongoose.model("jtctoken_transfer", donationJtcTokenTransferSchema);

export default ShareJTCTokenTransfer;