import mongoose from 'mongoose';

const annualProgressModel = new mongoose.Schema({
  title: {
    type: String,
    required : true,
  },
  file : {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
}
},{timestamps:true});

const AnnualProgress = mongoose.model('annual-progress', annualProgressModel);

export default AnnualProgress;
