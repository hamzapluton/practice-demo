import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { USERS_TYPES } from "#constants/user";

const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
     transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
      required: false,
    },
    // rfcNo: { type: String, required: [true, "rfcNo field is required"] },
   
    rfcNo: { type: String},
   
    // name:{ type: String, required: [true, "name field is required"] },
    name:{ type: String},
    
    address: { type: String },
    
    // address: { type: String, required: [true, "address field is required"] },
    file_before_signature: {
      type: String,
    },
    file: {
      type: String,
    },
    signature: {
      type: String,
    },

    // isCertificate:{type:Boolean,required: [true, "Accept certificate policy condition Check field is required"] },
    // isAcceptTerms:{type:Boolean,required: [true, "Accept terms and conditions check field is required"] },
 
    isCertificate:{type:Boolean,default:true},
    isAcceptTerms:{type:Boolean,default:true },
 
 
    isContractSign:{type:Boolean, default: false}},
  
    { timestamps: { createdAt: true, updatedAt: true } }
);

const KYC = mongoose.model("kyc", kycSchema);

export default KYC;
