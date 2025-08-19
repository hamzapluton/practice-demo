import mongoose from "mongoose";
import { DocumentType } from "#constants/user";

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    type: {
        type: String,
        enum: DocumentType
    },
    document: {
        type: String,
    },
    status: {
        type: String,
        enum: ["approved", "rejected", "pending"],
        default:"pending"
    }
}, { timestamps: true });

const Document = mongoose.model('document', documentSchema)

export default Document
