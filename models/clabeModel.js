import mongoose from "mongoose";

const ClabeModelSchema = new mongoose.Schema({
   clabe:{
    type: String,
    required: true,
    unique:true
   },
   userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    unique:true
},
},{timestamps:{createdAt:true,updatedAt:true}});
  
  const Clabe = mongoose.model("Clabe", ClabeModelSchema)

export default Clabe;



