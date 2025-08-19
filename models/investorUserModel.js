import mongoose from "mongoose";


const investorUserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'firstName field is required']
    },
    middleName: {
        type: String,
        required: [true, 'middleName field is required']
    },
    lastName: {
        type: String,
        required: [true, 'lastName field is required']
    },
    passport: {
        type: String,
        required: [true, 'passport field is required'],
    },
    passportExpireDate: {
        type: Date,
        required: [true, 'passportExpireDate field is required']
    },
    bankAccount: {
        type: String,
        required: [true, 'type field is required']
    },
    fundsLegalSource: String,
    RFC: {
        type: String, required: [true, 'RFC field is required']
    },
    CURP: {
        type: String, required: [true, 'CURP field is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: [true,'userId field is required']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
},{timestamps:true});

const Investor = mongoose.model('Investor', investorUserSchema);
export default Investor
