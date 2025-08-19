import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  from_referral_userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required : true,
  },
  to_referral_userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required : true,
  },
  invested_amount: {
    type: Number,
    default:0
  },
  rewarded_amount: {
    type: Number,
    default:0
  },
  referral_level: {
    type: Number,
    default:1
  },
  status:{
    type: String,
    enum : ['sign-up','below-minimum-investment','kyc-not-completed',,'investor'],
    default: 'sign-up'
  } 
},{timestamps:true});

const Referral = mongoose.model('referral', referralSchema);

export default Referral;
