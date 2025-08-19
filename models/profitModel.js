import mongoose from 'mongoose';

const profitSchema = new mongoose.Schema({
        transactionId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'transaction',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
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

const Profit = mongoose.model('profit', profitSchema);

export default Profit;
