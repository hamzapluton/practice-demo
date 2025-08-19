import mongoose from "mongoose";

const UserVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
    },
    resetId: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: 86400}
    },
},{timestamps:true});
  
  const UserVerification = mongoose.model("UserVerification", UserVerificationSchema)

  export { UserVerification}
  


