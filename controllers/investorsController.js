import _ from "loadsh";
import isEmpty from "is-empty";
import asyncHandler from "express-async-handler";

import User from "#models/userModel";
import {USERS_TYPES} from "#constants/user";
import Investor from "#models/investorUserModel";
import {registerValidation} from "#validation/usersValidation";
import LegalEntityInvestorModel from "#models/legalEntityInvestorModel";

const investorRegistration = asyncHandler(async (req, res) => {
    if (isEmpty(req.body))
        throw new Error("Input Fields are required");
    //This IF Blocks Run if no files is uploaded from frontend
    if (req?.uploadError) {
        throw new Error(req.uploadError);
    }
    if (Object.keys(req.files).length === 0) {
        const {errors, hasErrors} = registerValidation(req.body);

        if (hasErrors) {
            res.status(400);
            throw new Error(errors);
        }

        let investor = new Investor(
            _.pick(
                req.body,
                ['firstName', 'middleName','lastName', 'passport', 'passportExpireDate', 'bankAccount', 'fundsLegalSource', 'RFC', 'CURP', 'userId']
            ));

        investor = await investor.save();

        if (investor) {
            const user = await User.findByIdAndUpdate(req.body.userId, {isInvestor : true})
            if (user)
                return res?.status(201).json({status: true, message: 'Successffully submit withdrawl form.'});
            return res?.status(400).json({status: true, message: 'some error has occurred'});
        }

        return res?.status(400).json({status: true, message: 'some error has occurred'});
    }


    const {RFC, CURP, fundsLegalSource} = req.files;

    req.body.RFC = RFC ? RFC[0]['filename'] : req.body.RFC;
    req.body.CURP = CURP ? CURP[0]['filename'] : req.body.CURP;
    req.body.fundsLegalSource = fundsLegalSource ? fundsLegalSource[0]['filename'] : 'fundsLegalSource'
    const {errors, hasErrors} = registerValidation(req.body);

    //This Blocks runs if validation fails
    if (hasErrors) {
        res.status(400);
        throw new Error(errors);
    }

    let investor = new Investor(
        _.pick(
            req.body,
            ['firstName', 'middleName','lastName','fatherName', 'motherName', 'passport', 'passportExpireDate', 'bankAccount', 'fundsLegalSource', 'RFC', 'CURP', 'userId']
        ));

    investor = await investor.save();

    if (investor) {
        const user = await User.findByIdAndUpdate(req.body.userId, {type: USERS_TYPES.investor , isRequested : true})
        if (user)
            return res?.status(201).json({status: true, message: 'Successffully submit withdrawl form'});
        return res?.status(400).json({status: true, message: 'some error has occurred'});
    }

    return res?.status(400).json({status: true, message: 'some error has occurred'});
});

const legalInvestorRegistration = asyncHandler(async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0)
        throw new Error("Please upload required images");
    //This IF Blocks Run if no files is uploaded from frontend
    if (req?.uploadError) {
        throw new Error(req.uploadError);
    }

    const {
        articlesIncorporation,
        taxID,
        taxDomicile,
        powerOfAttorney,
        shareHolder,
        electronicSignature,
        fundsLegalSource
    } = req.files;

    req.body.articlesIncorporation = articlesIncorporation ? articlesIncorporation[0]['filename'] : ''
    req.body.taxID = taxID ? taxID[0]['filename'] : '';
    req.body.taxDomicile = taxDomicile ? taxDomicile[0]['filename'] : '';
    req.body.shareHolder = shareHolder ? shareHolder[0]['filename'] : '';
    req.body.powerOfAttorney = powerOfAttorney ? powerOfAttorney[0]['filename'] : '';
    req.body.fundsLegalSource = fundsLegalSource ? fundsLegalSource[0]['filename'] : '';
    req.body.electronicSignature = electronicSignature ? electronicSignature[0]['filename'] : '';

    let legalInvestor = new LegalEntityInvestorModel(
        _.pick(
            req.body,
            ['articlesIncorporation', 'taxID', 'taxDomicile', 'shareHolder', 'electronicSignature','powerOfAttorney', 'fundsLegalSource', 'userId']
        )
    )

    legalInvestor = await legalInvestor.save();

    if (legalInvestor) {
        const user = await User.findByIdAndUpdate(req.body.userId, {type: USERS_TYPES.legalEntity , isRequested : true})
        if (user)
            return res?.status(201).json({status: true, message: 'User becomes Legal investors'});
        return res?.status(400).json({status: true, message: 'some error has occurred'});
    }
    return res?.status(400).json({status: true, message: 'some error has occurred'});



})

export {investorRegistration, legalInvestorRegistration}
