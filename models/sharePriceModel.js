import mongoose from "mongoose";

const sharePriceModelSchema = new mongoose.Schema({
    sharePrice: {
    type: Number,
    },
    targetAchieved:{
        type: Number,
    },
    nextTargetAchieved:{
        type: Number,
    },
    active:{
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
}, { timestamps:{createdAt:true,updatedAt:true }});
  
  const SharePrice = mongoose.model("SharePrice", sharePriceModelSchema)

export default SharePrice;



