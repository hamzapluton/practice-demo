import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'stores',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        amount: {
            type: String,
            required: true,
        },
        accountNo :{
            type:String,
            required: true,
        },
        referenceNo :{
            type:String,
            required: true,
        },
        transactionId :{
            type:Number,
            required: true,
        },
        uniqueId :{
            type:String,
            required: true,
        },
        name:{
            type:String,
            required: true,
        },
        purchasedAt: {
            type: Date,
            default: Date.now,
        }
    },{timestamps:true}
);

const PaymentModel = mongoose.model('payment', paymentSchema);

export default PaymentModel;
