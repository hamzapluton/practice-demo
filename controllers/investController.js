import mongoose from "mongoose";
import _ from "loadsh";
import asyncHandler from "express-async-handler";
import User from "#models/userModel";
import Store from "#models/storeModel";
import OwnerUsers from "#data/userData";
import Wallet from "#models/walletModel";
import userWallet from "#data/userWallet";
import ownerModel from "#models/ownerModel";
import { WALLET_TYPES } from "#constants/wallet";
import Transaction from "#models/transactionModel";
import rp from "request-promise";
import otpGenerator from "otp-generator";
import PaymentModel from "#models/paymentModel";
import stpPaymentModel from "#models/stpTransaction";
import { PaymentCryptoHandler } from "#cryptoHandlers/cryptoHandler";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import Order from "#models/orderModel";
import Clabe from "#models/clabeModel";
import Abono from "#models/abonoModel";
import KYC from "#models/kycModel";
import addSharesToPdf from "#utils/addSharesToPdf";
import updateSharesToPdf from "#utils/updateSharesToPdf";
import { PATH, TESTPATH } from "#constants/user";
import AdminTransaction from "#models/adminTransactionModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import { firebaseAdminNotification } from "#utils/firebaseAdminNotification";
import Referral from "#models/referralModel";
import SharePrice from "#models/sharePriceModel";
import { reward_JTC_TOKEN } from "#controllers/adminController";
import { removeHTMLTags } from "#utils/removeHTMLTags";
import Offers from "#models/offerModel";
import { ReferralAward } from "../Functions/ReferralAward.js";
import { ManualReferralAward } from "../Functions/ManualReferralAward.js";
import PendingDividend from "#models/pendingDividendModel";
import { dividend_cron } from "#utils/dividend-cron";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PaymentCheckout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, shareAmount, sharePerPrice, totalShares, type } = req.body;

  if (!id || !userId || !shareAmount)
    return res.status(400).send({
      status: false,
      message: "invalid inputs fields i.e id, userId and shareAmount",
    });

  let TOTAL_SHARES = totalShares;
  let SHARE_PER_PRICE = 20;

  if (type === "wallet") {
    const userWallet = await Wallet.findOne({ userId: userId });

    if ((userWallet?.dividend || 0) - shareAmount * SHARE_PER_PRICE < 0)
      return res
        .status(200)
        .json({ status: false, message: "You do not have sufficient dividends to invest" });

    return res.status(400).send({
      status: false,
      message: "Soon to be integrated via wallet dividends investment",
    });
  } else if (req.body.type === "card") {
    let uniqueString = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: true,
      specialChars: false,
    });

    let orderPaymentWs = {
      claveRastreo: uniqueString,
      conceptoPago: "JTC INVESTMENT",
      cuentaOrdenante: "646180352800000009", //	The payer's account
      cuentaBeneficiario: req.body.accountNo, //	The beneficiary's account
      empresa: "STARTUP",
      institucionContraparte: "90646",
      institucionOperante: "90646",
      monto: "0.10", //amount
      nombreBeneficiario: "Antonio", //	Beneficiary Name.
      nombreOrdenante: req.body.name, //Applicant Name.
      referenciaNumerica: req.body.referenceNo, //Reference number
      rfcCurpBeneficiario: "ND",
      rfcCurpOrdenante: "ND",
      tipoCuentaBeneficiario: "40",
      tipoCuentaOrdenante: "40", //Account Type
      tipoPago: "1",
      firma: "",
    };

    let crypto = new PaymentCryptoHandler(orderPaymentWs);

    orderPaymentWs["firma"] = crypto.getSign();

    const response = await rp({
      url: "https://prod.stpmex.com:7002/speiws/rest/ordenPago/registra",
      method: "PUT",
      json: true,
      body: orderPaymentWs,
      rejectUnauthorized: false,
    });
    console.log(orderPaymentWs);
    console.log(response);

    if (response?.resultado?.descripcionError) {
      return res.status(400).json({
        status: false,
        message: response?.resultado?.descripcionError,
      });
    } else {
      res.status(200).send({ status: true, message: "Successfully Invested" });
    }
  } else {
    return res.status(400).send({
      status: false,
      message: "invalid payment transaction type",
    });
  }
});

/**
 @desc     Payment Change State API
 @route    post /api/invest/change-state
 @access   Private
 */
const ChangeState = asyncHandler(async (req, res) => {
  new stpPaymentModel(req.body).save();
  return res.status(200).send({ message: "recieved" });
});

/**
@desc     Payment Send Abono API
 @route    post /api/invest/send-abono
 @access   Private
 */
const SendAbono = asyncHandler(async (req, res) => {
  await new Abono(req.body).save();
  const validUserAccount = await User.findOne({
    clabe: req.body.cuentaBeneficiario,
  });
  if (validUserAccount) {
    let orderFind = await Order.findOne({
      status: "pending",
      clabe: req.body.cuentaBeneficiario,
    });

    let sharePrice = await SharePrice.findOne({
      active: true,
      isDeleted: false,
    });
    if (!sharePrice) {
      sharePrice = await new SharePrice({
        sharePrice: 20,
        targetAchieved: 0,
        nextTargetAchieved: 3000000,
      }).save();
    }

    if (orderFind) {
      await Order.findOneAndUpdate(
        { status: "pending", clabe: req.body.cuentaBeneficiario },
        {
          status: "processing",
          amountInvested: req.body.monto,
          purchasedShare: req.body.monto / sharePrice?.sharePrice,
          claveRastreo: req.body.claveRastreo,
        }
      );
    } else {
      const store = await Store.findOne({
        active: true,
        isDeleted: false,
      })
        .sort({ totalShares: -1 })
        .exec();
      if (store) {
        await new Order({
          clabe: validUserAccount?.clabe,
          userId: validUserAccount?._id,
          storeId: store?._id,
          amountInvested: req.body.monto,
          purchasedShare: req.body.monto / sharePrice?.sharePrice,
          status: "processing",
          claveRastreo: req.body.claveRastreo,
        }).save();
      } else {
        console.log("Not found any store");
      }
    }
  } else {
    console.log("not valid user");
  }

  res.status(200).send({ mensaje: "confirmar" });
});

/**
@desc     Investment Order Created
 @route    post /api/invest/order
 @access   Private
 */
const CreateRequestOrder = asyncHandler(async (req, res) => {
  const { amountInvested } = req.body;
  const store = await Store.findById(req.body.storeId);
  const user = await User.findById(req.body.userId);

  if (!store)
    return res
      .status(404)
      .send({ status: false, message: "Store record not found" });
  if (!user)
    return res
      .status(404)
      .send({ status: false, message: "User record not found" });

  // if (store?.totalShares - req.body.purchasedShare < 0)
  //   return res.status(400).json({
  //     status: false,
  //     message: `you cannot purchased ${req.body.purchasedShare} shares, total available shares are: ${store?.totalShares}`,
  //   });

  // if (store?.totalShares === 0)
  //   return res
  //     .status(400)
  //     .json({ status: false, message: "All Shares are purchased" });

  // Added Reward Functionality
  ReferralAward(user, store, amountInvested);

  // Create Order Functionality
  const findOrder = await Order.findOne({
    status: "pending",
    clabe: req.body.clabe,
  });
  let order;

  if (findOrder) {
    order = await Order.findOneAndUpdate(
      { status: "pending", clabe: req.body.clabe },
      _.pick(req.body, [
        "userId",
        "storeId",
        "purchasedShare",
        "amountInvested",
        "clabe",
      ])
    );
  } else {
    order = await new Order(
      _.pick(req.body, [
        "userId",
        "storeId",
        "purchasedShare",
        "amountInvested",
        "clabe",
      ])
    ).save();
  }

  if (order) {
    // Logic to calculate total shares purchased
    const transactionFind = await Transaction.find({
      isDeleted: false,
      userId: user?._id,
    });
    const totalSharesPurchased = transactionFind.reduce((acc, obj) => {
      const amountInvested = parseFloat(obj.amountInvested) || 0;
      const sharePrice = parseFloat(obj.sharePrice) || 1; // Avoid division by zero
      return acc + (sharePrice !== 0 ? amountInvested / sharePrice : 0);
    }, 0);

    let totalRemainingShares = 3000000 - totalSharesPurchased;
    totalRemainingShares = parseInt(totalRemainingShares);

    // Logic to update share price based on remaining shares
    const sharePriceIncrement = 0.2; // Increment per 100,000 shares sold
    let updatedSharePrice = store.sharePrice; // Assuming store holds the current share price

    // Check ranges and update the share price accordingly
    if (totalRemainingShares <= 2799999 && totalRemainingShares > 2699999) {
      updatedSharePrice = 23; // If remaining shares are between 2,799,999 and 2,699,999, set share price to 23
    } else if (
      totalRemainingShares <= 2699999 &&
      totalRemainingShares > 2599999
    ) {
      updatedSharePrice = 23 + sharePriceIncrement;
    } else if (
      totalRemainingShares <= 2599999 &&
      totalRemainingShares > 2499999
    ) {
      updatedSharePrice = 23 + 2 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 2499999 &&
      totalRemainingShares > 2399999
    ) {
      updatedSharePrice = 23 + 3 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 2399999 &&
      totalRemainingShares > 2299999
    ) {
      updatedSharePrice = 23 + 4 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 2299999 &&
      totalRemainingShares > 2199999
    ) {
      updatedSharePrice = 23 + 5 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 2199999 &&
      totalRemainingShares > 2099999
    ) {
      updatedSharePrice = 23 + 6 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 2099999 &&
      totalRemainingShares > 1999999
    ) {
      updatedSharePrice = 23 + 7 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 1999999 &&
      totalRemainingShares > 1899999
    ) {
      updatedSharePrice = 23 + 8 * sharePriceIncrement;
    } else if (
      totalRemainingShares <= 1899999 &&
      totalRemainingShares > 1799999
    ) {
      updatedSharePrice = 23 + 9 * sharePriceIncrement;
    }

    // Continue the pattern as required...

    // Save the updated share price if it has changed
    if (updatedSharePrice !== store.sharePrice) {
      store.sharePrice = updatedSharePrice;
      await store.save();
    }

    const remainingShares = await calculateRemainingShares();
    const kyc = await KYC.findOne({ userId: user?._id });
    const pdfPath = await updateSharesToPdf(
      {
        amount: amountInvested,
        shares: amountInvested / 20, // Adjust denominator if share price changes dynamically
        amountInvested,
        totalTransactions: transactionFind?.length || "0",
      },
      kyc,
      user
    );

    if (pdfPath) {
      const cleanedPath = pdfPath.replace("./", "");
      const fullPdfPath = `${PATH}${cleanedPath}`; // Ensure PATH is defined

      await KYC.create({
        userId: user?._id,
        file_before_signature: fullPdfPath,
        file: fullPdfPath,
        // Add other required fields based on KYC schema
      });
      return res.status(200).send({
        status: true,
        message: "Order Created Successfully",
        totalRemainingShares: remainingShares.toLocaleString(),
      });
    } else {
      return res
        .status(500)
        .send({ status: false, message: "PDF generation failed" });
    }
  } else {
    return res
      .status(400)
      .send({ status: false, message: "Something went wrong" });
  }
});

const calculateRemainingShares = asyncHandler(async (req, res) => {
  console.log("Calculating Remaining Shares");
  const TOTAL_SHARES = 3000000;

  const totalPurchasedShares = await Transaction.aggregate([
    {
      $match: { isDeleted: false }, // Filter documents where isDeleted is false
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$purchasedShare" }, // Calculate the total sum of purchasedShare
      },
    },
    {
      $project: { _id: 0, total: 1 }, // Only return the total field
    },
  ]);

  const sum =
    totalPurchasedShares.length > 0 ? totalPurchasedShares[0].total : 0;
  console.log("Total Purchased Shares:", sum);

  let totalRemainingShares = TOTAL_SHARES - sum;
  totalRemainingShares = parseInt(totalRemainingShares);

  // Ensure that totalRemainingShares is returned properly
  return totalRemainingShares;
});

const getAllOrder = asyncHandler(async (req, res) => {
  const order = await Order.find({});
  if (order.length > 0) {
    return res.status(200).send({ status: true, order });
  } else {
    return res
      .status(404)
      .send({ status: true, message: "Order record not exists" });
  }
});

//Shares Distribution

const shareDistributed = asyncHandler(async (req, res) => {
  const { userId, storeId, amountInvested, clabe, item_order } = req;

  let sharePrice = await SharePrice.findOne({ active: true, isDeleted: false });
  if (!sharePrice) {
    sharePrice = await new SharePrice({
      sharePrice: 20,
      targetAchieved: 0,
      nextTargetAchieved: 3000000,
    }).save();
  }

  var shareAmount = amountInvested / sharePrice?.sharePrice;

  const userWallet = await Wallet.findOne({ userId: userId });
  const user = await User.findById(userId);
  if (!user) {
    return false;
    // return res
    //   .status(404)
    //   .send({ status: false, message: "User record not found" });
  }

  const userFind = await User.findById(userId);
  const store = await Store.findById(storeId);

  if (!store) {
    return false;
    // return res
    //   .status(404)
    //   .send({ status: false, message: "Store record not found" });
  }

  // let TOTAL_SHARES = store?.totalShares;
  // let SHARE_PER_PRICE = 20;

  if (!userWallet) {
    return false;
    // return res
    //   .status(400)
    //   .send({ status: false, message: "User dose not exists" });
  }

  const investmentAmountInvestor = amountInvested;

  const totalInvestmentShares =
    investmentAmountInvestor / sharePrice?.sharePrice;

  // const investorPurchasedShares = (70 / 100) * totalInvestmentShares;

  // const InvestorAmount = investorPurchasedShares * sharePrice?.sharePrice;

  // const transaction = await Transaction.find();

  // const totalSumOfAmountWithUserWalletUserWalletTransaction =
  //   await Transaction.aggregate([
  //     {
  //       $group: {
  //         _id: null,
  //         TotalAmount: {
  //           $sum: "$amountInvested",
  //         },
  //       },
  //     },
  //   ]);

  // const totalSumOfAmountAggregate = await Transaction.aggregate([
  //   {
  //     $match: {
  //       type: { $ne: "user-wallet" },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       TotalAmount: {
  //         $sum: "$amountInvested",
  //       },
  //     },
  //   },
  // ]);

  // let totalSumOfAmount = 0;

  // if (transaction.length > 0) {
  //   totalSumOfAmount =
  //     totalSumOfAmountAggregate?.[0].TotalAmount + investmentAmountInvestor;
  // } else {
  //   totalSumOfAmount = totalSumOfAmount + investmentAmountInvestor;
  // }

  // let totalSumOfAmountWithUserWallet = 0;

  // if (transaction?.length > 0) {
  //   totalSumOfAmountWithUserWallet =
  //     totalSumOfAmountWithUserWalletUserWalletTransaction?.[0].TotalAmount +
  //     investmentAmountInvestor;
  // } else {
  //   totalSumOfAmountWithUserWallet =
  //     totalSumOfAmountWithUserWallet + investmentAmountInvestor;
  // }

  // if (totalSumOfAmountWithUserWallet >= sharePrice?.nextTargetAchieved) {
  //   await SharePrice.findOneAndUpdate(
  //     { _id: sharePrice?._id },
  //     { targetAchieved: totalSumOfAmountWithUserWallet, active: false }
  //   );
  //   await new SharePrice({
  //     sharePrice: sharePrice?.sharePrice + 5,
  //     targetAchieved: totalSumOfAmountWithUserWallet,
  //     nextTargetAchieved: sharePrice?.nextTargetAchieved + 3000000,
  //   }).save();
  // } else {
  //   await SharePrice.findOneAndUpdate(
  //     { _id: sharePrice?._id },
  //     { targetAchieved: totalSumOfAmountWithUserWallet }
  //   );
  // }

  // const ownerAmount = (27 / 100) * totalSumOfAmount;

  // const ownerSon1Amount = (1 / 100) * totalSumOfAmount;
  // const ownerSon2Amount = (1 / 100) * totalSumOfAmount;
  // const ownerSon3Amount = (1 / 100) * totalSumOfAmount;

  // const ownerShares = ownerAmount / sharePrice?.sharePrice;
  // const ownerSon1Shares = ownerSon1Amount / sharePrice?.sharePrice;
  // const ownerSon2Shares = ownerSon2Amount / sharePrice?.sharePrice;
  // const ownerSon3Shares = ownerSon3Amount / sharePrice?.sharePrice;

  function DivideIntegarAndDecimalNumber(data) {
    if (typeof data === "number") {
      // Logic For Number
      return performLogic(data);
    } else if (Array.isArray(data)) {
      // Logic for Object or Array
      const result = data.map((data, index) => performLogic(data, index));
      return result;
    }
  }

  function DivideIntegarAndDecimalNumberAdmin(data) {
    if (typeof data === "number") {
      // Logic For Number
      return performAdminLogic(data);
    } else if (Array.isArray(data)) {
      // Logic for Object or Array
      const result = data.map((data, index) => performAdminLogic(data, index));
      return result;
    }
  }

  async function allocateSharesToStores(
    userId,
    totalSharesNeeded,
    isOffer = false
  ) {
    let sharesToAllocate = totalSharesNeeded;

    console.log(sharesToAllocate, "sharesToAllocatesharesToAllocate");
    let currentStore = await Store.findOne({ _id: storeId, isDeleted: false });

    while (sharesToAllocate > 0 && currentStore) {
      const availableShares = currentStore.totalShares;

      if (sharesToAllocate <= availableShares) {
        console.log("CALL 1st");
        if (isOffer) {
          allocateOffersSharesToStore(userId, currentStore, sharesToAllocate);
        } else {
          await allocateSharesToStore(userId, currentStore, sharesToAllocate);
        }
        sharesToAllocate = 0;
      } else {
        console.log("CALL end");
        if (isOffer) {
          allocateOffersSharesToStore(userId, currentStore, availableShares);
        } else {
          await allocateSharesToStore(userId, currentStore, availableShares);
        }
        sharesToAllocate -= availableShares;
        currentStore = await findNextStoreWithShares(currentStore);
      }
    }

    return sharesToAllocate === 0;
  }

  async function allocateSharesToStore(userId, store, shares) {
    console.log(shares, "SHARES PURCHASED");
    if (shares > 0) {
      let sharesInvestor = (70 / 100) * shares;
      const investmentAmount = shares * sharePrice?.sharePrice;
      const investorPurchasedShares =
        DivideIntegarAndDecimalNumber(sharesInvestor);
      console.log(investmentAmount, "investmentAmountinvestmentAmount");

      // TOTAL INVESTED SUM AMOUNT

      const transaction = await Transaction.find({});

      const totalSumOfAmountAggregate = await Transaction.aggregate([
        {
          $match: {
            type: { $ne: "user-wallet" },
          },
        },
        {
          $group: {
            _id: null,
            TotalAmount: {
              $sum: "$amountInvested",
            },
          },
        },
      ]);

      let totalSumOfAmount = 0;

      if (transaction?.length > 0) {
        totalSumOfAmount =
          totalSumOfAmountAggregate?.[0]?.TotalAmount + investmentAmount;
      } else {
        totalSumOfAmount = totalSumOfAmount + investmentAmount;
      }
      console.log(totalSumOfAmount, "totalSumOfAmounttotalSumOfAmount");
      // SET INVESTOR AND ADMIN SHARES

      const ownerAmount = (27 / 100) * totalSumOfAmount;

      const ownerSon1Amount = (1 / 100) * totalSumOfAmount;
      const ownerSon2Amount = (1 / 100) * totalSumOfAmount;
      const ownerSon3Amount = (1 / 100) * totalSumOfAmount;

      const ownerShares = ownerAmount / sharePrice?.sharePrice;
      const ownerSon1Shares = ownerSon1Amount / sharePrice?.sharePrice;
      const ownerSon2Shares = ownerSon2Amount / sharePrice?.sharePrice;
      const ownerSon3Shares = ownerSon3Amount / sharePrice?.sharePrice;

      const sharesTransform = DivideIntegarAndDecimalNumber([
        sharesInvestor,
        ownerShares,
        ownerSon1Shares,
        ownerSon2Shares,
        ownerSon3Shares,
      ]);

      // Investor TRANSACTION

      let order = await Order.findOne({
        _id: item_order?._id,
        storeId: storeId,
        userId: userId,
        clabe: clabe,
        status: "execution-start",
      });

      const transactionUser = await Transaction.create({
        storeId: store?._id,
        userId: userId,
        purchasedShare: sharesInvestor,
        sharePrice: sharePrice?.sharePrice,
        transactionId: order?.claveRastreo,
        type: "card",
        amountInvested: investmentAmount,
      });

      console.log(sharesTransform, "sharesTransform");
      sharesTransform.map(async (item) => {
        if (item.type === "investor") {
          // transactionUser.purchasedShare = item.getActualShares;
          // await transactionUser.save();

          const investorWallet = await Wallet.findOneAndUpdate(
            { userId: userId },
            {
              $inc: {
                shares: item.getActualShares,
                amount: item.getActualShares * sharePrice?.sharePrice,
              },
            },
            { new: true }
          );

          const kyc = await KYC.findOne({ userId: userId });
          const transactionFind = await Transaction.find({
            isDeleted: false,
            userId: userFind?._id,
          });

          const amountInvested = transactionFind.reduce(
            (acc, obj) => (acc += obj.amountInvested),
            0
          );
          console.log(amountInvested, "amountInvested");
          if (kyc) {
            const path = await updateSharesToPdf(
              {
                amount: investorWallet?.amount,
                shares: investorWallet?.shares,
                amountInvested: amountInvested,
                totalTransactions: transactionFind?.length || "0",
              },
              kyc,
              userFind
            );
            if (path) {
              console.log(path, "pdfPath");
              const cleanedPath = path.replace("./", "");
              console.log(userId);
              console.log(`${PATH}${cleanedPath}`);
              await KYC.findByIdAndUpdate(kyc?._id, {
                file_before_signature: `${PATH}${cleanedPath}`,
                file: `${PATH}${cleanedPath}`,
              });
            }
          } else {
            console.log(userFind, "userFind");
            let kycCreated = new KYC({ userId: userFind?._id });
            const path = await updateSharesToPdf(
              {
                amount: investorWallet?.amount,
                shares: investorWallet?.shares,
                amountInvested: amountInvested,
                totalTransactions: transactionFind?.length || "0",
              },
              kycCreated,
              userFind
            );
            if (path) {
              console.log(path, "pdfPath");
              const cleanedPath = path.replace("./", "");
              console.log(userId);
              console.log(`${PATH}${cleanedPath}`);
              kycCreated.file = `${PATH}${cleanedPath}`;
              kycCreated.file_before_signature = `${PATH}${cleanedPath}`;
              kycCreated.save();
            }
          }

          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  dividend:
                    investorPurchasedShares?.getActualShares *
                      sharePrice?.sharePrice -
                    item.getActualShares * sharePrice?.sharePrice,
                },
              }
            );
          } else {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: { shares: item.getNewWalletShares },
              }
            );
          }
        } else if (item.type === "owner") {
          await Wallet.updateOne(
            { type: WALLET_TYPES.OWNER },
            {
              $set: {
                shares: item.getActualShares,
                dividend: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );
          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  dividend:
                    ownerShares * sharePrice?.sharePrice -
                    item.getActualShares * sharePrice?.sharePrice,
                },
              }
            );
          } else {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: { shares: item.getNewWalletShares },
              }
            );
          }
        } else if (item.type === "son1") {
          await Wallet.updateOne(
            { type: WALLET_TYPES.SON1 },
            {
              $set: {
                shares: item.getActualShares,
                dividend: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );

          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  dividend:
                    ownerSon1Shares * sharePrice?.sharePrice -
                    item.getActualShares * sharePrice?.sharePrice,
                },
              }
            );
          } else {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: { shares: item.getNewWalletShares },
              }
            );
          }
        } else if (item.type === "son2") {
          await Wallet.updateOne(
            { type: WALLET_TYPES.SON2 },
            {
              $set: {
                shares: item.getActualShares,
                dividend: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );
          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  dividend:
                    ownerSon2Shares * sharePrice?.sharePrice -
                    item.getActualShares * sharePrice?.sharePrice,
                },
              }
            );
          } else {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: { shares: item.getNewWalletShares },
              }
            );
          }
        } else if (item.type === "son3") {
          await Wallet.updateOne(
            { type: WALLET_TYPES.SON3 },
            {
              $set: {
                shares: item.getActualShares,
                dividend: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );
          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  dividend:
                    ownerSon3Shares * sharePrice?.sharePrice -
                    item.getActualShares * sharePrice?.sharePrice,
                },
              }
            );
          } else {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: { shares: item.getNewWalletShares },
              }
            );
          }
        }

        return item;
      });

      // Admin Transactions
      const ownerGetAmount = (27 / 100) * investmentAmount;
      const ownerSon1GetAmount = (1 / 100) * investmentAmount;
      const ownerSon2GetAmount = (1 / 100) * investmentAmount;
      const ownerSon3GetAmount = (1 / 100) * investmentAmount;

      const ownerGetShares = ownerGetAmount / sharePrice?.sharePrice;
      const ownerSon1GetShares = ownerSon1GetAmount / sharePrice?.sharePrice;
      const ownerSon2GetShares = ownerSon2GetAmount / sharePrice?.sharePrice;
      const ownerSon3GetShares = ownerSon3GetAmount / sharePrice?.sharePrice;

      const adminShares = DivideIntegarAndDecimalNumberAdmin([
        ownerGetShares,
        ownerSon1GetShares,
        ownerSon2GetShares,
        ownerSon3GetShares,
      ]);

      for (const share of adminShares) {
        const adminTransaction = new AdminTransaction({
          storeId: store?._id,
          type: share.type,
          userTransactionId: transactionUser?._id,
          purchasedShare: share.getActualShares,
          sharePrice: sharePrice?.sharePrice,
          amountInvested: share.getActualShares * sharePrice?.sharePrice,
        });

        await adminTransaction.save();
      }

      //Update Store Shares
      await Store.findByIdAndUpdate(
        store?._id,
        {
          $inc: {
            totalShares: -shares,
          },
        },
        { new: true }
      );

      //Maintain Investor JTC Reward

      const totalSumOfAmountWithUserWalletUserWalletTransaction =
        await Transaction.aggregate([
          {
            $group: {
              _id: null,
              TotalAmount: {
                $sum: "$amountInvested",
              },
            },
          },
        ]);

      let totalSumOfAmountWithUserWallet = 0;

      if (transaction?.length > 0) {
        totalSumOfAmountWithUserWallet =
          totalSumOfAmountWithUserWalletUserWalletTransaction?.[0].TotalAmount +
          investmentAmount;
      } else {
        totalSumOfAmountWithUserWallet =
          totalSumOfAmountWithUserWallet + investmentAmount;
      }

      if (
        totalSumOfAmountWithUserWallet / sharePrice?.sharePrice >=
        Number(sharePrice?.nextTargetAchieved)
      ) {
        await SharePrice.findOneAndUpdate(
          { _id: sharePrice?._id },
          {
            targetAchieved:
              totalSumOfAmountWithUserWallet / sharePrice?.sharePrice,
            active: false,
          }
        );
        await new SharePrice({
          sharePrice: sharePrice?.sharePrice + 5,
          targetAchieved:
            totalSumOfAmountWithUserWallet / sharePrice?.sharePrice,
          nextTargetAchieved: Number(sharePrice?.nextTargetAchieved) + 3000000,
        }).save();
      } else {
        await SharePrice.findOneAndUpdate(
          { _id: sharePrice?._id },
          {
            targetAchieved:
              totalSumOfAmountWithUserWallet / sharePrice?.sharePrice,
          }
        );
      }

      //Send Notification
      const updateUser = await User.findByIdAndUpdate(
        userId,
        { isInvestor: true },
        { new: true }
      );

      const notification = {
        title: "Congratulations on Your Investment in Java Times Caffe Store!",
        body: `Dear ${
          updateUser?.name
        }, Congratulations! Your investment in Java Times Caffe Store has been successfully processed. You've purchased ${
          transactionUser?.purchasedShare
        } shares in the store ${removeHTMLTags(
          store?.title_en
        )}, and we appreciate your commitment to our endeavor. If you have any questions or need further assistance, please feel free to contact us at +52(871) 1161608. We're here to help!, Thank you for choosing Java Times Caffe!`,
      };

      await firebaseNotification(
        notification,
        [updateUser],
        "news",
        "Selected-Users",
        "system",
        "users"
      );

      await firebaseAdminNotification(
        {
          title: `A new investment successfully processed for ${updateUser?.name}`,
          body: `${updateUser?.name} has made a new investment by purchasing ${
            transactionUser?.purchasedShare
          } shares in ${removeHTMLTags(store?.title_en)}.`,
        },
        "news",
        "Selected-Users",
        "system",
        "admin"
      );

      await reward_JTC_TOKEN(userId, investmentAmount);
    }
  }

  async function allocateOffersSharesToStore(userId, store, shares) {
    const investmentAmount = shares * sharePrice?.sharePrice;
    console.log(shares, "SHARES PURCHASED");
    if (shares > 0) {
      const amountShares = DivideIntegarAndDecimalNumber(Number(shares));
      console.log(amountShares, "investmentAmountinvestmentAmount");

      if (!Number.isInteger(amountShares?.getNewWalletShares)) {
        await Wallet.updateOne(
          { type: WALLET_TYPES.NEW_OWNER },
          {
            $inc: {
              shares: amountShares?.getNewWalletShares,
            },
          }
        );
      }

      const transactionUser = await Transaction.create({
        storeId: store?._id,
        userId: userId,
        purchasedShare: shares,
        sharePrice: sharePrice?.sharePrice,
        type: "offer",
        amountInvested: investmentAmount,
      });

      const investorWallet = await Wallet.findOneAndUpdate(
        { userId: userId },
        {
          $inc: {
            shares: amountShares?.getActualShares,
            amount: amountShares?.getActualShares * sharePrice?.sharePrice,
          },
        },
        { new: true }
      );

      const kyc = await KYC.findOne({ userId: userId });
      const transactionFind = await Transaction.find({
        isDeleted: false,
        userId: userFind?._id,
      });

      const amountInvested = transactionFind.reduce(
        (acc, obj) => (acc += obj.amountInvested),
        0
      );
      console.log(amountInvested, "amountInvested");
      if (kyc) {
        const path = await updateSharesToPdf(
          {
            amount: investorWallet?.amount,
            shares: investorWallet?.shares,
            amountInvested: amountInvested,
            totalTransactions: transactionFind?.length || "0",
          },
          kyc,
          userFind
        );
        if (path) {
          console.log(path, "pdfPath");
          const cleanedPath = path.replace("./", "");
          console.log(userId);
          console.log(`${PATH}${cleanedPath}`);
          await KYC.findByIdAndUpdate(kyc?._id, {
            file_before_signature: `${PATH}${cleanedPath}`,
            file: `${PATH}${cleanedPath}`,
          });
        }
      } else {
        console.log(userFind, "userFind");
        let kycCreated = new KYC({ userId: userFind?._id });
        const path = await updateSharesToPdf(
          {
            amount: investorWallet?.amount,
            shares: investorWallet?.shares,
            amountInvested: amountInvested,
            totalTransactions: transactionFind?.length || "0",
          },
          kycCreated,
          userFind
        );
        if (path) {
          console.log(path, "pdfPath");
          const cleanedPath = path.replace("./", "");
          console.log(userId);
          console.log(`${PATH}${cleanedPath}`);
          kycCreated.file = `${PATH}${cleanedPath}`;
          kycCreated.file_before_signature = `${PATH}${cleanedPath}`;
          kycCreated.save();
        }
      }

      const updateUser = await User.findByIdAndUpdate(
        userId,
        { isInvestor: true },
        { new: true }
      );

      const notification = {
        title: "🎉 You've Earned a Special Reward from Java Times Caffe!",
        body: `Hey ${
          updateUser?.name
        }, Exciting news! You've just been rewarded with ${
          transactionUser?.purchasedShare
        } shares in ${removeHTMLTags(
          store?.title_en
        )} as part of our special offer. We're excited to have you on this journey with us! If you need any help or have questions, give us a call at +52(871) 1161608. Thanks for choosing Java Times Caffe!`,
      };

      await firebaseNotification(
        notification,
        [updateUser],
        "news",
        "Selected-Users",
        "system",
        "users"
      );

      await firebaseAdminNotification(
        {
          title: `New Reward Issued for ${updateUser?.name}!`,
          body: `${updateUser?.name} has just been rewarded ${
            transactionUser?.purchasedShare
          } shares in ${removeHTMLTags(
            store?.title_en
          )} as part of their investment offer.`,
        },
        "news",
        "Selected-Users",
        "system",
        "admin"
      );
    }
  }

  const allocationSuccess = await allocateSharesToStores(userId, shareAmount);
  async function findNextStoreWithShares(currentStore) {
    return await Store.findOne({
      _id: { $ne: currentStore?._id },
      totalShares: { $gt: 0 },
      isDeleted: false,
    }).sort({ createdAt: 1 });
  }

  if (!allocationSuccess) {
    await Order.findOneAndUpdate(
      { storeId: storeId, userId: userId, clabe: clabe, status: "processing" },
      {
        status: "failed",
        storeId: storeId,
        userId: userId,
        purchasedShare: (70 / 100) * totalInvestmentShares,
        amountInvested: amountInvested,
      },
      { new: true }
    );

    console.log("Not enough shares available in all stores");

    return false;
    // return res.status(400).json({
    //   status: false,
    //   message: "Not enough shares available in all stores",
    // });
  }

  // const amountInvestorInvested = DivideIntegarAndDecimalNumber(InvestorAmount);

  //Update New Wallet Owner
  // await Wallet.findOneAndUpdate(
  //   { type: WALLET_TYPES.NEW_OWNER },
  //   {
  //     $inc: { balance: amountInvestorInvested?.getNewWalletShares },
  //   },
  //   { new: true }
  // );

  // const shares = DivideIntegarAndDecimalNumber([
  //   investorPurchasedShares,
  //   ownerShares,
  //   ownerSon1Shares,
  //   ownerSon2Shares,
  //   ownerSon3Shares,
  // ]);

  // console.log(shares, "SHARES");

  // const transactionUser = await new Transaction({
  //   storeId: storeId,
  //   userId: userId,
  //   purchasedShare: investorPurchasedShares,
  //   sharePrice: sharePrice?.sharePrice,
  //   amountInvested: investmentAmountInvestor,
  //   transactionId: order?.claveRastreo,
  //   type: "card",
  // }).save();

  // const ownerGetAmount = (27 / 100) * investmentAmountInvestor;

  // const ownerSon1GetAmount = (1 / 100) * investmentAmountInvestor;
  // const ownerSon2GetAmount = (1 / 100) * investmentAmountInvestor;
  // const ownerSon3GetAmount = (1 / 100) * investmentAmountInvestor;

  // const ownerGetShares = ownerGetAmount / sharePrice?.sharePrice;
  // const ownerSon1GetShares = ownerSon1GetAmount / sharePrice?.sharePrice;
  // const ownerSon2GetShares = ownerSon2GetAmount / sharePrice?.sharePrice;
  // const ownerSon3GetShares = ownerSon3GetAmount / sharePrice?.sharePrice;

  // const adminShares = DivideIntegarAndDecimalNumberAdmin([
  //   ownerGetShares,
  //   ownerSon1GetShares,
  //   ownerSon2GetShares,
  //   ownerSon3GetShares,
  // ]);

  // console.log(adminShares);
  // for (const share of adminShares) {
  //   const adminTransaction = new AdminTransaction({
  //     storeId: storeId,
  //     type: share?.type,
  //     userTransactionId: transactionUser?._id,
  //     purchasedShare: share.getActualShares,
  //     sharePrice: sharePrice?.sharePrice,
  //     amountInvested: share.getActualShares * sharePrice?.sharePrice,
  //   });

  //   await adminTransaction.save();
  // }

  // shares.map(async (item) => {
  //   if (item.type === "investor") {
  //     const wallet = await Wallet.findOne({ userId: userId });
  //     const investorWallet = await Wallet.findOneAndUpdate(
  //       { userId: userId },
  //       {
  //         $inc: {
  //           shares: item.getActualShares,
  //           amount: item.getActualShares * sharePrice?.sharePrice,
  //         },
  //       },
  //       { new: true }
  //     );

  //     const transactionFind = await Transaction.find({
  //       userId: userFind?._id,
  //       isDeleted: false,
  //     });
  //     const amountInvested = transactionFind.reduce(
  //       (acc, obj) => (acc += obj.amountInvested),
  //       0
  //     );
  //     console.log(amountInvested, "amountInvested");
  //     const kyc = await KYC.findOne({ userId: userId });
  //     if (kyc) {
  //       const path = await updateSharesToPdf(
  //         {
  //           amount: investorWallet?.amount,
  //           shares: investorWallet?.shares,
  //           amountInvested: amountInvested,
  //         },
  //         kyc,
  //         userFind
  //       );
  //       if (path) {
  //         console.log(path, "pdfPath");
  //         const cleanedPath = path.replace("./", "");
  //         console.log(userId);
  //         console.log(`${PATH}${cleanedPath}`);
  //         await KYC.findByIdAndUpdate(kyc?._id, {
  //           file_before_signature: `${PATH}${cleanedPath}`,
  //           file: `${PATH}${cleanedPath}`,
  //         });
  //       }
  //     } else {
  //       console.log(userFind, "userFind");
  //       let kycCreated = new KYC({ userId: userFind?._id });
  //       const path = await updateSharesToPdf(
  //         {
  //           amount: investorWallet?.amount,
  //           shares: investorWallet?.shares,
  //           amountInvested: amountInvested,
  //         },
  //         kycCreated,
  //         userFind
  //       );
  //       if (path) {
  //         console.log(path, "pdfPath");
  //         const cleanedPath = path.replace("./", "");
  //         console.log(userId);
  //         console.log(`${PATH}${cleanedPath}`);
  //         kycCreated.file = `${PATH}${cleanedPath}`;
  //         kycCreated.file_before_signature = `${PATH}${cleanedPath}`;
  //         kycCreated.save();
  //       }
  //     }

  //     if (!Number.isInteger(item.getNewWalletShares)) {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: {
  //             shares: item.getNewWalletShares,
  //             balance:
  //               investorPurchasedShares * sharePrice?.sharePrice -
  //               item.getActualShares * sharePrice?.sharePrice,
  //           },
  //         }
  //       );
  //     } else {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: { shares: item.getNewWalletShares },
  //         }
  //       );
  //     }
  //   } else if (item.type === "owner") {
  //     const ownerWallet = await Wallet.updateOne(
  //       { type: WALLET_TYPES.OWNER },
  //       {
  //         $set: {
  //           shares: item.getActualShares,
  //           balance: item.getActualShares * sharePrice?.sharePrice,
  //         },
  //       }
  //     );
  //     if (!Number.isInteger(item.getNewWalletShares)) {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: {
  //             shares: item.getNewWalletShares,
  //             balance:
  //               ownerShares * sharePrice?.sharePrice -
  //               item.getActualShares * sharePrice?.sharePrice,
  //           },
  //         }
  //       );
  //     } else {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: { shares: item.getNewWalletShares },
  //         }
  //       );
  //     }
  //   } else if (item.type === "son1") {
  //     const ownerSON1Wallet = await Wallet.updateOne(
  //       { type: WALLET_TYPES.SON1 },
  //       {
  //         $set: {
  //           shares: item.getActualShares,
  //           balance: item.getActualShares * sharePrice?.sharePrice,
  //         },
  //       }
  //     );

  //     if (!Number.isInteger(item.getNewWalletShares)) {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: {
  //             shares: item.getNewWalletShares,
  //             balance:
  //               ownerSon1Shares * sharePrice?.sharePrice -
  //               item.getActualShares * sharePrice?.sharePrice,
  //           },
  //         }
  //       );
  //     } else {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: { shares: item.getNewWalletShares },
  //         }
  //       );
  //     }
  //   } else if (item.type === "son2") {
  //     const ownerSON2Wallet = await Wallet.updateOne(
  //       { type: WALLET_TYPES.SON2 },
  //       {
  //         $set: {
  //           shares: item.getActualShares,
  //           balance: item.getActualShares * sharePrice?.sharePrice,
  //         },
  //       }
  //     );
  //     if (!Number.isInteger(item.getNewWalletShares)) {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: {
  //             shares: item.getNewWalletShares,
  //             balance:
  //               ownerSon2Shares * sharePrice?.sharePrice -
  //               item.getActualShares * sharePrice?.sharePrice,
  //           },
  //         }
  //       );
  //     } else {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: { shares: item.getNewWalletShares },
  //         }
  //       );
  //     }
  //   } else if (item.type === "son3") {
  //     const ownerSON3Wallet = await Wallet.updateOne(
  //       { type: WALLET_TYPES.SON3 },
  //       {
  //         $set: {
  //           shares: item.getActualShares,
  //           balance: item.getActualShares * sharePrice?.sharePrice,
  //         },
  //       }
  //     );
  //     if (!Number.isInteger(item.getNewWalletShares)) {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: {
  //             shares: item.getNewWalletShares,
  //             balance:
  //               ownerSon3Shares * sharePrice?.sharePrice -
  //               item.getActualShares * sharePrice?.sharePrice,
  //           },
  //         }
  //       );
  //     } else {
  //       const ownerNewWallet = await Wallet.updateOne(
  //         { type: WALLET_TYPES.NEW_OWNER },
  //         {
  //           $inc: { shares: item.getNewWalletShares },
  //         }
  //       );
  //     }
  //   }

  //   return item;
  // });

  // const storeTotalShare = TOTAL_SHARES - shareAmount;

  // const storeFind = await Store.findOneAndUpdate(
  //   { _id: storeId },
  //   { totalShares: storeTotalShare },
  //   { new: true }
  // );

  //Refer User

  const updateUser = await User.findByIdAndUpdate(userId, { isInvestor: true });
  const referralFind = await Referral.findOne({
    to_referral_userId: updateUser?._id,
  });
  console.log(referralFind, "referralFind");
  if (referralFind?.status !== "investor") {
    const transactionFind = await Transaction.find({
      isDeleted: false,
      userId: updateUser?._id,
    });
    const amountUserInvested = transactionFind.reduce(
      (acc, obj) => (acc += obj.amountInvested),
      0
    );

    if (amountUserInvested < 5000) {
      await Referral.findOneAndUpdate(
        { to_referral_userId: updateUser?._id },
        {
          status: "below-minimum-investment",
          referral_level: 2,
          invested_amount: amountUserInvested,
          rewarded_amount: 0,
        }
      );
    } else if (
      amountUserInvested >= 5000 &&
      updateUser?.isKYCCompleted !== "completed"
    ) {
      await Referral.findOneAndUpdate(
        { to_referral_userId: updateUser?._id },
        {
          status: "kyc-not-completed",
          referral_level: 3,
          invested_amount: amountUserInvested,
          rewarded_amount: 0,
        }
      );
    } else if (
      amountUserInvested >= 5000 &&
      updateUser?.isKYCCompleted === "completed"
    ) {
      let reward = Math.floor(amountUserInvested * 0.005);
      const refer = await Referral.findOneAndUpdate(
        { to_referral_userId: updateUser?._id },
        {
          status: "investor",
          referral_level: 4,
          invested_amount: amountUserInvested,
          rewarded_amount: reward,
        },
        { new: true }
      );

      // Update refer Wallet
      await Wallet.findOneAndUpdate(
        { userId: refer?.from_referral_userId },
        {
          $inc: { shares: reward, amount: reward * sharePrice?.sharePrice },
        }
      );

      // Minus admin new Wallet shares
      await Wallet.findOneAndUpdate(
        { type: "owner-new" },
        {
          $inc: { shares: -reward },
        }
      );

      await new Transaction({
        storeId: storeId,
        userId: refer?.from_referral_userId,
        purchasedShare: reward,
        sharePrice: sharePrice?.sharePrice,
        type: "refer",
        amountInvested: sharePrice?.sharePrice * reward,
      }).save();

      //Update Referral User to investor
      await User.findByIdAndUpdate(
        refer?.from_referral_userId,
        { isInvestor: true },
        { new: true }
      );
    } else {
      console.log("NOT found any valid referral");
    }
  } else {
    console.log("NOT found referral");
  }

  // await reward_JTC_TOKEN(userId, investmentAmountInvestor);

  // const notification = {
  //   title: "Congratulations on Your Investment in Java Times Caffe Store!",
  //   body: `Dear ${updateUser?.name}, Congratulations! Your investment in Java Times Caffe Store has been successfully processed. You've purchased ${transactionUser?.purchasedShare} shares in the store ${removeHTMLTags(storeFind?.title_en)}, and we appreciate your commitment to our endeavor. If you have any questions or need further assistance, please feel free to contact us at +52(871) 1161608. We're here to help!, Thank you for choosing Java Times Caffe!`,
  // };

  // await firebaseNotification(
  //   notification,
  //   [updateUser],
  //   "news",
  //   "Selected-Users",
  //   "system",
  //   "users"
  // );

  // await firebaseAdminNotification(
  //   {
  //     title: `A new investment successfully processed for ${updateUser?.name}`,
  //     body: `${updateUser?.name} has made a new investment by purchasing ${transactionUser?.purchasedShare} shares in  ${removeHTMLTags(storeFind?.title_en)}.`,
  //   },
  //   "news",
  //   "Selected-Users",
  //   "system",
  //   "admin"
  // );

  // await Order.findOneAndUpdate(
  //   { storeId: storeId, userId: userId, clabe: clabe, status: "processing" },
  //   {
  //     storeId: storeId,
  //     userId: userId,
  //     purchasedShare: (70 / 100) * totalInvestmentShares,
  //     amountInvested: amountInvested,
  //   },
  //   { new: true }
  // );

  // Offer Find

  const calculateOfferShares = async (
    userId,
    sharePurchasedByInvestorValue
  ) => {
    try {
      // Proceed to find active offer
      let OfferFind = await Offers.findOne({ type: "signup", isActive: true });
      console.log("OfferFind", OfferFind);
      if (OfferFind) {
        let userWallet = await Wallet.findOne({ userId: userId });
        const shares = Math.floor(sharePurchasedByInvestorValue);
        console.log("Total Shares Purchased by Investor:", shares);
        const investmentShares = Math.floor((70 / 100) * shares);
        let totalWalletShares = userWallet?.shares - investmentShares;
        if (totalWalletShares >= OfferFind?.targetShares) {
          console.log(
            `User has ${OfferFind?.targetShares} or more shares. No rewards available.`
          );
        } else {
          // Calculate how many shares we can reward within the 250 share limit
          let remainingSharesTo250 = 0;

          if (totalWalletShares + investmentShares > OfferFind?.targetShares) {
            remainingSharesTo250 = OfferFind?.targetShares - totalWalletShares;
            console.log("CALL IF COND");
          } else {
            remainingSharesTo250 = investmentShares;
            console.log("CALL ELSE COND");
          }

          console.log(remainingSharesTo250, "remainingSharesTo250");
          if (remainingSharesTo250 > 0) {
            const rewardPercentage = OfferFind.rewardPercentage;
            let rewardedShares =
              (rewardPercentage / 100) * remainingSharesTo250;
            console.log(
              "Investor Rewarded Shares (before rounding):",
              rewardedShares
            );

            rewardedShares = Math.round(rewardedShares);
            console.log(
              "Investor Rewarded Shares (after rounding):",
              rewardedShares
            );
            if (rewardedShares > 0) {
              console.log(`Allocating ${rewardedShares} shares as a reward.`);

              const allocationSuccess = await allocateSharesToStores(
                userId,
                rewardedShares,
                true
              );
              if (allocationSuccess) {
                console.log(
                  `Successfully allocated ${rewardedShares} rewarded shares to the user.`
                );
              } else {
                console.log(
                  `Not enough shares available in stores to allocate ${rewardedShares} shares.`
                );
              }
            } else {
              console.log("No eligible shares for reward in this transaction.");
            }
          } else {
            console.log("No remaining shares to reward for this transaction.");
          }
        }
      } else {
        console.log("No active offer found.");
      }
    } catch (error) {
      console.error("Error calculating offer shares:", error);
    }
  };
  calculateOfferShares(userId, shareAmount);

  console.log("Sucessfully Invested");
  return true;
});

/**
 @desc     Invest User Wallet
 @route    get /api/user/user-invest
 @access   Private
 */

const investUserWallet = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { id, shareAmount, totalShares } = req.body;

  let sharePrice = await SharePrice.findOne({ active: true, isDeleted: false });
  if (!sharePrice) {
    sharePrice = await new SharePrice({
      sharePrice: 20,
      targetAchieved: 0,
      nextTargetAchieved: 3000000,
    }).save();
  }

  const userFind = await User.findById(userId);

  if (!userFind)
    return res.status(400).send({
      status: false,
      message: "User does not exists",
    });

  const sharePurchasedByInvestor = shareAmount / sharePrice.sharePrice; // No of Shares user want to purchase

  if (sharePurchasedByInvestor < 5) {
    return res.status(400).send({
      status: false,
      message: "Minimum purchase requirement: 5 shares",
    });
  }

  if (!id || !userId || !shareAmount)
    return res.status(400).send({
      status: false,
      message: "invalid inputs fields i.e id, userId and shareAmount",
    });

  const userWallet = await Wallet.findOne({ userId: userId });
  if (!userWallet)
    return res.status(400).send({
      status: false,
      message:
        "User wallet does not exists, Please verify your account before investment",
    });

  let store = await Store.findOne({ _id: id, isDeleted: false });
  if (!store)
    return res.status(400).send({
      status: false,
      message: "Store not found",
    });

  if (
    !(userWallet?.dividend >= sharePurchasedByInvestor * sharePrice?.sharePrice)
  ) {
    return res.status(400).send({
      status: false,
      message: " You have insufficient dividends right now",
    });
  }

  const investmentAmountInvestor =
    sharePurchasedByInvestor * sharePrice?.sharePrice;
  console.log(investmentAmountInvestor, "investmentAmountInvestor");

  const transaction = await Transaction.find({});
  const totalSumOfAmountAggregate = await Transaction.aggregate([
    {
      $group: {
        _id: null,
        TotalAmount: {
          $sum: "$amountInvested",
        },
      },
    },
  ]);
  let totalSumOfAmount = 0;

  if (transaction.length > 0) {
    totalSumOfAmount =
      totalSumOfAmountAggregate?.[0].TotalAmount + investmentAmountInvestor;
  } else {
    totalSumOfAmount = totalSumOfAmount + investmentAmountInvestor;
  }

  if (
    totalSumOfAmount / sharePrice?.sharePrice >=
    Number(sharePrice?.nextTargetAchieved)
  ) {
    await SharePrice.findOneAndUpdate(
      { _id: sharePrice?._id },
      {
        targetAchieved: totalSumOfAmount / sharePrice?.sharePrice,
        active: false,
      }
    );
    await new SharePrice({
      sharePrice: sharePrice?.sharePrice + 5,
      targetAchieved: totalSumOfAmount / sharePrice?.sharePrice,
      nextTargetAchieved: Number(sharePrice?.nextTargetAchieved) + 3000000,
    }).save();
  } else {
    await SharePrice.findOneAndUpdate(
      { _id: sharePrice?._id },
      { targetAchieved: totalSumOfAmount / sharePrice?.sharePrice }
    );
  }

  function DivideIntegarAndDecimalNumber(data) {
    if (typeof data === "number") {
      // Logic For Number
      return performLogic(data);
    } else if (Array.isArray(data)) {
      // Logic for Object or Array
      const result = data.map((data, index) => performLogic(data, index));
      return result;
    }
  }

  //Distributiion Shares
  async function allocateSharesToStores(userId, totalSharesNeeded) {
    let sharesToAllocate = totalSharesNeeded;

    console.log(sharesToAllocate, "sharesToAllocatesharesToAllocate");
    let currentStore = await Store.findOne({ _id: id, isDeleted: false });

    while (sharesToAllocate > 0 && currentStore) {
      const availableShares = currentStore.totalShares;

      if (sharesToAllocate <= availableShares) {
        await allocateSharesToStore(userId, currentStore, sharesToAllocate);
        sharesToAllocate = 0;
      } else {
        await allocateSharesToStore(userId, currentStore, availableShares);
        sharesToAllocate -= availableShares;
        currentStore = await findNextStoreWithShares(currentStore);
      }
    }

    return sharesToAllocate === 0;
  }

  async function allocateSharesToStore(userId, store, shares) {
    const investmentAmount = shares * sharePrice?.sharePrice;
    console.log(shares, "SHARES PURCHASED");
    if (shares > 0) {
      const amountShares = DivideIntegarAndDecimalNumber(Number(shares));
      console.log(amountShares, "investmentAmountinvestmentAmount");

      if (!Number.isInteger(amountShares?.getNewWalletShares)) {
        await Wallet.updateOne(
          { type: WALLET_TYPES.NEW_OWNER },
          {
            $inc: {
              shares: amountShares?.getNewWalletShares,
            },
          }
        );
      }

      let transactionUser;

      transactionUser = await Transaction.create({
        storeId: store?._id,
        userId: userId,
        purchasedShare: shares,
        sharePrice: sharePrice?.sharePrice,
        type: "user-wallet",
        amountInvested: investmentAmount,
      });

      const investorWallet = await Wallet.findOneAndUpdate(
        { userId: userId },
        {
          $inc: {
            shares: amountShares?.getActualShares,
            amount: amountShares?.getActualShares * sharePrice?.sharePrice,
          },
        },
        { new: true }
      );

      const kyc = await KYC.findOne({ userId: userId });
      const transactionFind = await Transaction.find({
        isDeleted: false,
        userId: userFind?._id,
      });

      const amountInvested = transactionFind.reduce(
        (acc, obj) => (acc += obj.amountInvested),
        0
      );
      console.log(amountInvested, "amountInvested");
      if (kyc) {
        const path = await updateSharesToPdf(
          {
            amount: shareAmount,
            shares: shareAmount / 20,
            amountInvested: shareAmount,
            totalTransactions: transactionFind?.length || "0",
          },
          kyc,
          userFind
        );
        if (path) {
          console.log(path, "pdfPath");
          const cleanedPath = path.replace("./", "");
          console.log(userId);
          console.log(`${PATH}${cleanedPath}`);
          // await KYC.findByIdAndUpdate(kyc?._id, {
          //   file_before_signature: `${PATH}${cleanedPath}`,
          //   file: `${PATH}${cleanedPath}`,
          // });
          await KYC.create({
            userId: userId,
            file_before_signature: `${PATH}${cleanedPath}`,
            file: `${PATH}${cleanedPath}`,

            // Add any other required fields that are mandatory in your KYC schema
          });
        }
      } else {
        console.log(userFind, "userFind");
        let kycCreated = new KYC({ userId: userFind?._id });
        const path = await updateSharesToPdf(
          {
            amount: investorWallet?.amount,
            shares: investorWallet?.shares,
            amountInvested: amountInvested,
            totalTransactions: transactionFind?.length || "0",
          },
          kycCreated,
          userFind
        );
        if (path) {
          console.log(path, "pdfPath");
          const cleanedPath = path.replace("./", "");
          console.log(userId);
          console.log(`${PATH}${cleanedPath}`);
          kycCreated.file = `${PATH}${cleanedPath}`;
          kycCreated.file_before_signature = `${PATH}${cleanedPath}`;
          kycCreated.save();
        }
      }

      const updateUser = await User.findByIdAndUpdate(
        userId,
        { isInvestor: true },
        { new: true }
      );

      await reward_JTC_TOKEN(userId, investmentAmount);

      // const notification = {
      //   title: "Congratulations on Your Investment in Java Times Caffe Store!",
      //   body: `Dear ${
      //     updateUser?.name
      //   }, Congratulations! Your investment in Java Times Caffe Store has been successfully processed. You've purchased ${
      //     transactionUser?.purchasedShare
      //   } shares in the store ${removeHTMLTags(
      //     store?.title_en
      //   )}, and we appreciate your commitment to our endeavor. If you have any questions or need further assistance, please feel free to contact us at +52(871) 1161608. We're here to help!, Thank you for choosing Java Times Caffe!`,
      // };

      // await firebaseNotification(
      //   notification,
      //   [updateUser],
      //   "news",
      //   "Selected-Users",
      //   "system",
      //   "users"
      // );

      // await firebaseAdminNotification(
      //   {
      //     title: `A new investment successfully processed for ${updateUser?.name}`,
      //     body: `${updateUser?.name} has made a new investment by purchasing ${
      //       transactionUser?.purchasedShare
      //     } shares in ${removeHTMLTags(store?.title_en)}.`,
      //   },
      //   "news",
      //   "Selected-Users",
      //   "system",
      //   "admin"
      // );
    }
  }

  const allocationSuccess = await allocateSharesToStores(
    userId,
    sharePurchasedByInvestor
  );
  async function findNextStoreWithShares(currentStore) {
    return await Store.findOne({
      _id: { $ne: currentStore?._id },
      totalShares: { $gt: 0 },
      isDeleted: false,
    }).sort({ createdAt: 1 });
  }
  if (!allocationSuccess) {
    return res.status(400).json({
      status: false,
      message: "Not enough shares available in all stores",
    });
  }

  await PendingDividend.create({
    userId: userId,
    dividendValue: investmentAmountInvestor,
    createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await Wallet.findOneAndUpdate(
    { userId: userId },
    {
      $inc: {
        dividend: -investmentAmountInvestor,
      },
    },
    { new: true }
  );

  // Referral Formulation
  const updateUser = await User.findByIdAndUpdate(
    userId,
    { isInvestor: true },
    { new: true }
  );

  const referralFind = await Referral.findOne({
    to_referral_userId: updateUser?._id,
  });

  if (referralFind?.status !== "investor") {
    const transactionFind = await Transaction.find({
      isDeleted: false,
      userId: updateUser?._id,
    });
    const amountUserInvested = transactionFind.reduce(
      (acc, obj) => (acc += obj.amountInvested),
      0
    );

    if (amountUserInvested < 5000) {
      await Referral.findOneAndUpdate(
        { to_referral_userId: updateUser?._id },
        {
          status: "below-minimum-investment",
          referral_level: 2,
          invested_amount: amountUserInvested,
          rewarded_amount: 0,
        }
      );
    } else if (
      amountUserInvested >= 5000 &&
      updateUser?.isKYCCompleted !== "completed"
    ) {
      await Referral.findOneAndUpdate(
        { to_referral_userId: updateUser?._id },
        {
          status: "kyc-not-completed",
          referral_level: 3,
          invested_amount: amountUserInvested,
          rewarded_amount: 0,
        }
      );
    } else if (
      amountUserInvested >= 5000 &&
      updateUser?.isKYCCompleted === "completed"
    ) {
      let reward = Math.floor(amountUserInvested * 0.005);
      const refer = await Referral.findOneAndUpdate(
        { to_referral_userId: updateUser?._id },
        {
          status: "investor",
          referral_level: 4,
          invested_amount: amountUserInvested,
          rewarded_amount: reward,
        },
        { new: true }
      );

      // Update refer Wallet
      await Wallet.findOneAndUpdate(
        { userId: refer?.from_referral_userId },
        {
          $inc: { shares: reward, amount: reward * sharePrice?.sharePrice },
        }
      );

      // Minus admin new Wallet shares
      await Wallet.findOneAndUpdate(
        { type: "owner-new" },
        {
          $inc: { shares: -reward },
        }
      );

      await new Transaction({
        storeId: id,
        userId: refer?.from_referral_userId,
        purchasedShare: reward,
        sharePrice: sharePrice?.sharePrice,
        type: "refer",
        amountInvested: sharePrice?.sharePrice * reward,
      }).save();

      //Update User to investor
      await User.findByIdAndUpdate(
        refer?.from_referral_userId,
        { isInvestor: true },
        { new: true }
      );
    } else {
      console.log("NOT found any valid referral");
    }
  } else {
    console.log("NOT found referral");
  }

  return res.status(200).send({
    status: true,
    message: "Successfully Invested!",
  });
});
const manualInvestment = asyncHandler(async (req, res) => {
  const { investorWalletId, amount, totalShares, commission, storeId } =
    req.body;

  // Validate required fields
  if (!investorWalletId || !amount || !totalShares) {
    return res.status(400).send({
      status: false,
      message: "Investor Wallet ID, amount, totalShares are required.",
    });
  }

  // Define store variable outside of block to avoid ReferenceError
  let store = null;

  // Fetch store details
  if (storeId) {
    store = await Store.findOne({ _id: storeId });
    if (!store) {
      return res.status(404).send({
        status: false,
        message: "Store not found.",
      });
    }
    if (store?.active == false) {
      return res.status(404).send({
        status: false,
        message: "The funding of this store is completed.",
      });
    }
  }

  // Fetch wallet details
  const wallet = await Wallet.findOne({ _id: investorWalletId });
  if (!wallet) {
    return res.status(404).send({
      status: false,
      message: "Wallet not found with the given Wallet ID.",
    });
  }

  const user = await User.findOne({ _id: wallet.userId });
  if (!user) {
    return res.status(404).send({
      status: false,
      message: "User not found with the given User ID.",
    });
  }

  // Update wallet details
  wallet.amount = (wallet.amount || 0) + parseFloat(amount);
  wallet.shares = (wallet.shares || 0) + parseFloat(totalShares);

  await wallet.save();

  // Check if commission data is provided and call ManualReferralAward
  if (commission) {
    const commissionPercentage = commission;
    const amountInvested = parseFloat(amount);
  //  return res.status(200).send({
  //   status: true,
  //   message: "testingj",
  //   updatedWallet: wallet,
  // });
    await ManualReferralAward(
      user,
      store,
      amountInvested,
      commissionPercentage
    );
  }

  // Respond with success
  return res.status(200).send({
    status: true,
    message: "Manual investment successful.",
    updatedWallet: wallet,
  });
});

export {
  investUserWallet,
  ChangeState,
  SendAbono,
  PaymentCheckout,
  CreateRequestOrder,
  calculateRemainingShares,
  getAllOrder,
  shareDistributed,
  manualInvestment,
};

export function performLogic(number, index) {
  let getActualShares = number,
    getNewWalletShares = 0,
    type = "";

  if (index === 0) {
    type = "investor";
  } else if (index === 1) {
    type = "owner";
  } else if (index === 2) {
    type = "son1";
  } else if (index === 3) {
    type = "son2";
  } else if (index === 4) {
    type = "son3";
  }

  if (!Number.isInteger(number)) {
    getActualShares = number.toString().split(".")[0];
    getNewWalletShares = number.toString().split(".")[1];
    getActualShares = Number(getActualShares);
    getNewWalletShares = `0.${getNewWalletShares}`;
    getNewWalletShares = Number(getNewWalletShares);
  }
  return { getActualShares, getNewWalletShares, type };
}

export function performAdminLogic(number, index) {
  let getActualShares = number,
    getNewWalletShares = 0,
    type = "";

  if (index === 0) {
    type = WALLET_TYPES.OWNER;
  } else if (index === 1) {
    type = WALLET_TYPES.SON1;
  } else if (index === 2) {
    type = WALLET_TYPES.SON2;
  } else if (index === 3) {
    type = WALLET_TYPES.SON3;
  }

  if (!Number.isInteger(number)) {
    getActualShares = number.toString().split(".")[0];
    getNewWalletShares = number.toString().split(".")[1];
    getActualShares = Number(getActualShares);
    getNewWalletShares = `0.${getNewWalletShares}`;
    getNewWalletShares = Number(getNewWalletShares);
  }
  return { getActualShares, getNewWalletShares, type };
}
