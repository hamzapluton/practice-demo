import mongoose from 'mongoose';

const walletBankSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required : true,
  },
  type: {
    type: String,
    enum: ['owner', 'ownerSon1' ,'ownerSon2','ownerSon3', 'investor', "reserve","owner-new"], //Reserve Wallet is for admin to transfer to user
    required : true,
  },
  amount: {
    type: Number,
    required : true,
  },
  shares: {
    type: Number,
    required : true,
  },
  dividend: {
    type: Number,
    required : true,
  },
  lockedAmount: {
    type: Number,
    default : 0
  },
  balance: {
    type: Number,
    required : true,
  },
  jtcToken : {
    type: Number,
    default:0
  },

  digitalMoney : {
    type: Number,
    default:0
  },
  
},{timestamps:true});

const Wallet = mongoose.model('wallet_bank', walletBankSchema);

export default Wallet;
