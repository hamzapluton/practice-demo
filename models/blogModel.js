import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required : true,
  },
  slug: {
    type: String,
    required : true,
  },
  description : {
    type: String,
    required : true,
  },
  image : {
    type: String
  },
  authorImage : {
    type: String
  },
  author : {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  active: {
    type: Boolean,
    default: false,
}
},{timestamps:true});

const Blog = mongoose.model('blog', blogSchema);

export default Blog;
