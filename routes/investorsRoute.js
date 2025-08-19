import express from 'express'
import {investorRegistration, legalInvestorRegistration} from "#controllers/investorsController";
import {multerUploadInvestor} from "#utils/multer";
import authMiddleware from '#middlewares/auth.middleware';

const investorRoutes = express.Router();

investorRoutes.post('/investor',
multerUploadInvestor.fields([
        {name: 'RFC'},
        {name: 'CURP'},
        {name: 'fundsLegalSource'},
    ]),authMiddleware, investorRegistration);

investorRoutes.post('/legal_investor',
multerUploadInvestor.fields([
        {name: 'articlesIncorporation'},
        {name: 'taxID'},
        {name: 'taxDomicile'},
        {name: 'powerOfAttorney'},
        {name: 'shareHolder'},
        {name: 'electronicSignature'},
        {name: 'fundsLegalSource'},
    ]),authMiddleware,
    legalInvestorRegistration)
export default investorRoutes
