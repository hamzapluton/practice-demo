import bcrypt from "bcryptjs";
import mongoose from 'mongoose';
import {USERS_TYPES} from "#constants/user";

const userSchema = new mongoose.Schema({
        type: {
            type: String,
            enum: Object.values(USERS_TYPES),
            default: USERS_TYPES.normal,
            lowercase: true
        },
        clabe:{
            type: String,
        },
        name: {type: String, required: [true, 'name field is required']},
        nickName: {type: String,required: [true, 'nickName field is required']},
        phone: {type: String, required: [true, 'phone field is required']},
        email: {
            type: String, required: [true, 'email field is required'], unique: true,
            match: [
                /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                'please enter a valid email address',
            ],
        },
        image: {
            type: String,
        },
        password: {type: String, required: [true, 'password field is required']},
        wallet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'wallet_bank'
        },
        not_token:{
            type: String,
        },
        not_token_mobile:{
            type: String,
        },
        profileCompleted: {
            type: Number,
            default:0
        },

        isVerified: {
            type: Boolean,
            default: false
        },
        isRequested: {
            type: Boolean,
            default: false
        },
        isInvestor: {
            type: Boolean,
            default: false
        },
        isKYCCompleted: {
            type: String,
            enum : ['pending','progress','completed','signatureVerified'],
            default: 'pending'
        },
        category: {
            type: String,
            enum : ['investor','jtc_employee','friend'],
            default: 'investor'
        },
        referralId: {
            type: String,
            unique: true,
            default:null
          },
        isAdminApproved: {
            type: Boolean,
            default: false
        },
        deviceType: {
            type: String,
            default: "Web"
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {timestamps: {createdAt: true, updatedAt: true}}
);

// userSchema.pre('save', async function (next) {
//     if (!this.isModified())
//         return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
// });
userSchema.pre(/^find/, function (next) {
    // `this` refers to the current query
    this.where({ isDeleted: false });
    next();
});
const User = mongoose.model('user', userSchema);

export default User;
