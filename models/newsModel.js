import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  email: {
    type: String,
    required : true,
  },
  },{timestamps:true});

const News = mongoose.model('new', newsSchema);

export default News;
