import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ownerSchema = new Schema(
    {
        firstName: {
            type: String,
            required: [true, 'please provide first name '],
        },
        lastName: {
            type: String,
            required: [true, 'please provide your LastName'],
        },
        type: {
            type: String,
            enum: ['owner', 'ownerSon1','ownerSon2','ownerSon3', 'investor'],
            required: true,
        },
        email: {
            type: String, required: true, unique: true,
            match: [
                /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                'please enter a valid email address',
            ],
        },
        password: {type: String, required: [true, 'password field is required']},
        wallet: {
            type: Schema.Types.ObjectId,
            ref: 'wallet_bank'
        },
        reserveWallet: {
            type: Schema.Types.ObjectId,
            ref: 'wallet_bank'
        },
        newWallet: {
            type: Schema.Types.ObjectId,
            ref: 'wallet_bank'
        },
        not_token:{
            type: String,
        },
    },
    {
        timestamps: {createdAt: true, updatedAt: true},
    }
);
const ownerModel = mongoose.model('owner_and_sons', ownerSchema);

export default ownerModel;
