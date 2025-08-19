import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import KYC from "#models/kycModel";
import User from '#models/userModel';
import Wallet from '#models/walletModel';
import isValidObjectId from "#utils/isValidObjectId";

const walletCreate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if(!isValidObjectId(id)){
    res.status(400);
    throw new Error('invalid user id');
  }


  const user = await User.findById(id);

  user.isVerified = true;
  await user.save();
  const walletData = await Wallet.create({
    userId: user.id,
    type: 'investor',
    shareValue: 0,
    shareAmount: 0,
    totalValueShare: 0,
    project: 0,
    dividendTotal: 0,
  });

  return res
      .status(200)
      .json({ status: true, message: 'Wallet has been successfully created.' });
});

//@desc     wallet Getting
//@route    get /api/wallet/:id
//@access   Private
const getWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error('Invalid param id');
  }

  const wallet = await Wallet.findOne({ userId: id });

  // Check if user has completed KYC
  const kycRecord = await KYC.findOne({ userId: id });
  const is_kyc = !!kycRecord;

  if (!wallet) {
    return res.status(200).json({
      status: false,
      message: 'Wallet does not exist',
      wallet: {
        is_kyc, // Still returning is_kyc inside wallet even if wallet doesn't exist
      },
    });
  }

  const walletWithKYC = {
    ...wallet.toObject(),
    is_kyc,
  };

  res.status(200).json({
    status: true,
    wallet: walletWithKYC,
  });
});


export { walletCreate, getWallet };
