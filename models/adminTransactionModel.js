import mongoose from 'mongoose';

const adminTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['owner', 'ownerSon1','ownerSon2','ownerSon3', 'investor'],
        required: true,
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stores',
        required: true,
    },
        userTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'transaction',
            required: true,
        },
        purchasedShare: {
            type: Number,
            required: true,
        },
        sharePrice: {
            type: Number,
            required: true,
        },
        amountInvested: {
            type: Number,
            required: true,
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

const AdminTransaction = mongoose.model('admin_transaction', adminTransactionSchema);

export default AdminTransaction;
