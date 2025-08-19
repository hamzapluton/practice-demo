import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema({
    target:{
      type : String,
      enum : ['All-Users', 'Investors','Non-Investors', 'Selected-Users']  
    },
    userIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }],
    type: {
        type: String,
    },
    notification: {
        title: {
            type: String
        },
        body: {
            type: String
        },
        image:{
            type:String,
        }
    },
    
}, { timestamps: true });

const AdminNotification = mongoose.model("admin_notification", adminNotificationSchema);

export default AdminNotification;
