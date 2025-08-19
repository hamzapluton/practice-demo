import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'stores',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: false,
        },
        purchasedShare: {
            type: Number,
            required: false,
        },
        sharePrice: {
            type: Number,
            required: false,
        },
        amountInvested: {
            type: Number,
            required: true,
        },
        uniqueId:{
            type:String
        },
        type:{
            type:String,
            enum:["wallet","card","donation","refer","user-wallet","offer"],
           default: "wallet"
        },
        transactionId:{
            type: String
        },
        purchasedAt: {
            type: Date,
            default: Date.now,
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        isProfitStart: {
            type: Boolean,
            default: true
        },
        isProfitStartDate: {
            type: Date,
            default: Date.now,
        },
    },{timestamps:true}
);

const Transaction = mongoose.model('transaction', transactionSchema);

export default Transaction;
