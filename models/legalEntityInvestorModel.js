import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const legalEntitySchema = new Schema({
        articlesIncorporation: {
            type: String,
            required: [true,'articlesIncorporation field is required'],
        },
        taxID: {
            type: String,
            required: [true,'taxID field is required'],
        },
        taxDomicile: {
            type: String,
            required: [true, 'taxDomicile field is required'],
        },
        powerOfAttorney: {
            type: String,
            required: [true, 'powerOfAttorney field is required'],
        },

        shareHolder: {
            type: String,
            required: [true,'shareHolder field is required'],
        },
        electronicSignature: {
            type: String,
            required: [true,'electronicSignature field is required'],
        },
        fundsLegalSource: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: [true,'userId field is required']
        }
    },
    {timestamps: {createdAt: true, updatedAt: true}}
);

const LegalEntityInvestorModel = mongoose.model('LegalEntity', legalEntitySchema);
export default LegalEntityInvestorModel;
