import mongoose from "mongoose";

const JobModelSchema = new mongoose.Schema({
   title:{
    type: String,
   },
    location: {
        type: String,
    },
    department:{
        type: String,     
    },
    description:{
        type: String,     
    },
    active:{
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
},{timestamps:{createdAt:true,updatedAt:true}});
  
  const Job = mongoose.model("Job", JobModelSchema)

export default Job;



