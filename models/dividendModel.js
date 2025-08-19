import mongoose from "mongoose";

const dividendSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  dividend: {
    type: Number,
    required: true,
  },
  totalUser: {
    type: Number,
    required: true,
  },
},{timestamps:true});

const Dividend = mongoose.model("dividend", dividendSchema);

export default Dividend;
