import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    target:{
      type : String,
      enum : ['All-Users', 'Investors','Non-Investors', 'Selected-Users']  
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'owner_and_sons',
    }, 
    from: {
        type: String,
        enum : ['system' , 'admin'],  
      default:"system"
    },
    to: {
        type: String,
        enum : ['users' , 'admin'],  
        default:"users"
    },
    type: {
        type: String,
    },
    token: {
        type: String
    },
    notification: {
        title: {
            type: String
        },
        body: {
            type: String
        },
    },
    image:{
        type:String,
    },
    isSeen:{
        type : Boolean,
        default : false
    }

}, { timestamps: true });

const Notification = mongoose.model("notification", notificationSchema);

export default Notification;
