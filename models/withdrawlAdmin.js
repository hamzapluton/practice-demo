import mongoose from 'mongoose';

const wihdrawlAdminSchema = new mongoose.Schema({
  type:{
    type: String,
    required : true,
  },
  amount: {
    type: Number,
    required : true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
},{timestamps:true});

const WithDrawlAdmin = mongoose.model('wihdrawladmin', wihdrawlAdminSchema);

export default WithDrawlAdmin;
