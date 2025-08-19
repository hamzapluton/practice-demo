import mongoose from 'mongoose';

const adminProfitSchema = new mongoose.Schema({
        adminTransactionId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin_transaction',
            required: true,
        },
        type: {
            type: String,
            enum: ['owner', 'ownerSon1','ownerSon2','ownerSon3', 'investor'],
            required: true,
        },
        profitAmount:{
            type: Number,
            default:0
        },
        totalProfitAmount:{
            type: Number,
            default:0
        },
        loss:{
            type: Number,
            default:0
        },
        
    },{timestamps:true}
);

const AdminProfit = mongoose.model('admin_profit', adminProfitSchema);

export default AdminProfit;
