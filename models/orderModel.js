import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
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
        purchasedShare: {
            type: Number,
            required: true,
        },
        amountInvested: {
            type: Number,
            required: true,
        },
        clabe: {
            type: String,
            required: true,
        },
        claveRastreo: {
            type: String,
            minlength: 8
          },
        status:{
            type: String,
            enum: ["pending","processing","success","failed","execution-start"],
            default:"pending"
        }
    },
  { timestamps: true }
);

const Order = mongoose.model('order', orderSchema);

export default Order;
