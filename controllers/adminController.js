import asyncHandler from "express-async-handler";
import Investor from "#models/investorUserModel";
import Transaction from "#models/transactionModel";
import Wallet from "#models/walletModel";
import Blog from "#models/blogModel";
import ownerModel from "#models/ownerModel";
import Store from "#models/storeModel";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import Dividend from "#models/dividendModel";
import User from "#models/userModel";
import DonationShareTransfer from "#models/shareTransferModel";
import isValidObjectId from "#utils/isValidObjectId";
import News from "#models/newsModel";
import { WALLET_TYPES } from "#constants/wallet";
import {
  PATH,
  TESTPATH,
  LOCALPATH,
  JTC_THRESHOLD,
  JTC_PERCENTAGE,
} from "#constants/user";
import KYC from "#models/kycModel";
import { performLogic, performAdminLogic } from "#controllers/investController";

import Document from "#models/documentModel";
import { contactUsEmail, contactUsWallet } from "#utils/email";
import { sendResetPasswordEmail } from "#utils/email";
import { UserVerification } from "#models/userVerification";
import rp from "request-promise";
import { AccountBalanceCryptoHandler } from "#cryptoHandlers/accountCryptoHandler";
import { TransactionsCryptoHandler } from "#cryptoHandlers/transactionsCryptoHandler";
import { OrderCryptoHandler } from "#cryptoHandlers/orderCryptoHandler";
import { OrdersCryptoHandler } from "#cryptoHandlers/ordersCryptoHandler";
import { sockets } from "../server.js";
import Clabe from "#models/clabeModel";
import addSharesToPdf from "#utils/addSharesToPdf";
import updateSharesToPdf from "#utils/updateSharesToPdf";
import AdminTransaction from "#models/adminTransactionModel";
import AdminProfit from "#models/adminProfitModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import { sendNotificationEmail } from "#utils/email";
import Notification from "#models/notificationModel";
import AdminNotification from "#models/adminNotificationModel";
import { firebaseAdminNotification } from "#utils/firebaseAdminNotification";
import Referral from "#models/referralModel";
import AnnualProgress from "#models/annualProgressModel";
import SharePrice from "#models/sharePriceModel";
import { TransactionTrack } from "#models/transactionTrack";
import ShareJTCTokenTransfer from "#models/shareJTCTokenModel";
import { removeHTMLTags } from "#utils/removeHTMLTags";
import Offers from "#models/offerModel";

/**
 @desc     count Data
 @route    get /api/admin/count
 @access   Public
 */
const countRecord = asyncHandler(async (req, res) => {
  const totalInvestor = await Investor.countDocuments();

  // const totalStoreFundedAmount = await Transaction.find({ $group: { _id : null, sum : { $sum: "$amountInvested" } } });

  const totalStoreFundedAmount = await Transaction.aggregate([
    {
      $group: {
        _id: null,
        TotalAmount: {
          $sum: "$amountInvested",
        },
      },
    },
  ]);
  res.status(200).json({ totalInvestor, totalStoreFundedAmount });
});

/**
 @desc     Generate Dividend
 @route    get /api/invest/generate_dividend
 @access   Private
 */
const generateDividend = asyncHandler(async (req, res) => {
  const dividend = req?.body?.dividend;

  console.log(dividend, "dividend");
  const result = await Wallet.aggregate([
    {
      $group: {
        _id: "",
        totalPurchasedShares: {
          $sum: "$shares",
        },
      },
    },
  ]);

  console.log(result, "RESULT");

  const perShareDividend = dividend / result[0]?.totalPurchasedShares;

  console.log(perShareDividend, "perShareDividend");

  const wallets = await Wallet.find({ type: { $ne: "reserve" } });

  const totalInvestor = await User.find({ isInvestor: true }).countDocuments();

  await Promise.all(
    wallets.map(async (wallet) => {
      const { _id, shares } = wallet;
      const dividend = perShareDividend * shares;
      return await Wallet.findByIdAndUpdate(
        _id,
        { $inc: { balance: dividend, dividend: dividend } },
        { new: true }
      );
    })
  );
  await new Dividend({ ...req.body, totalUser: totalInvestor }).save();
  return res.status(200).send("Your dividend has been sent successfully");
});

const transferShares = asyncHandler(async (req, res) => {
  const { type, share, walletId, id, totalShares } = req?.body;

  const isValidID = mongoose.Types.ObjectId.isValid(walletId);

  const isValidStoreID = mongoose.Types.ObjectId.isValid(id);

  /*blocks runs if params id is not valid */
  if (!isValidID) {
    res.status(400);
    throw new Error("Invalid Wallet Id");
  }
  if (!isValidStoreID) {
    res.status(400);
    throw new Error("Invalid Store Id");
  }
  const store = await Store.findById(id);
  if (!store) {
    return res.status(404).send(`Store not found`);
  }
  const user = await Wallet.findById(walletId);
  if (!user) {
    return res.status(404).send(`Wallet not found`);
  }

  let sharePrice = await SharePrice.findOne({ active: true, isDeleted: false });
  if (!sharePrice) {
    sharePrice = await new SharePrice({
      sharePrice: 20,
      targetAchieved: 0,
      nextTargetAchieved: 3000000,
    }).save();
  }

  const balanceMinusShares = share * sharePrice?.sharePrice;
  console.log(balanceMinusShares);
  console.log(share);

  if (type === "reserve") {
    const reserveWallet = await Wallet.findOne(
      { type: "reserve" },
      { shares: 1 }
    );
    if (share >= reserveWallet?.shares)
      return res
        .status(400)
        .send(
          `Transfer shares failed you have only ${reserveWallet?.shares} remaining`
        );
    await Wallet.findByIdAndUpdate(walletId, {
      $inc: { shares: share, amount: balanceMinusShares },
    }); // Adding Shares  and balance into user wallet
    await new Transaction({
      storeId: id,
      userId: user?.userId,
      purchasedShare: share,
      sharePrice: sharePrice?.sharePrice,
      type: "donation",
      amountInvested: sharePrice?.sharePrice * share,
    }).save();

    //Update Traget Achieved
    await SharePrice.findOneAndUpdate(
      { _id: sharePrice?._id },
      { $inc: { targetAchieved: share } }
    );

    const storeTotalShare = totalShares - share;

    // await Store.updateOne({ _id: id }, { totalShares: storeTotalShare });

    await Wallet.findOneAndUpdate(
      { type: "reserve" },
      {
        $inc: {
          shares: -share,
          balance: -balanceMinusShares,
        },
      }
    ); // Subtracting shares from admin Reserve Wallet

    await new DonationShareTransfer(req.body).save();
  } else if (type === "normal") {
    const normalWallet = await Wallet.findOne({ type: "owner" }, { shares: 1 });

    if (share >= normalWallet?.shares)
      return res
        .status(400)
        .send(
          `Transfer shares failed you have only ${normalWallet?.shares} remaining`
        );
    await Wallet.findByIdAndUpdate(walletId, {
      $inc: { shares: share, amount: balanceMinusShares },
    }); // Adding Shares and balance into user wallet
    await new Transaction({
      storeId: id,
      userId: user?.userId,
      purchasedShare: share,
      sharePrice: sharePrice?.sharePrice,
      type: "donation",
      amountInvested: sharePrice?.sharePrice * share,
    }).save();

    //Update Traget Achieved
    await SharePrice.findOneAndUpdate(
      { _id: sharePrice?._id },
      { $inc: { targetAchieved: share } }
    );

    const storeTotalShare = totalShares - share;

    // await Store.updateOne({ _id: id }, { totalShares: storeTotalShare });

    await Wallet.findOneAndUpdate(
      { type: "owner" },
      { $inc: { shares: -share, balance: -balanceMinusShares } }
    ); // Subtracting shares from admin Reserve Wallet

    await new DonationShareTransfer(req.body).save();
  } else {
    return res.status(400).send("Invalid Wallet Type");
  }

  const admin = await ownerModel
    .findOne({ type: "owner" })
    .populate("wallet reserveWallet newWallet");

  const updateUser = await User.findByIdAndUpdate(
    user?.userId,
    { isInvestor: true },
    { new: true }
  );

  sockets.sendVerificationSuccess(updateUser);

  const notification = {
    title:
      "Special Gift: Free Shares from Java Times Caffe Founder, Antonio Leite!",
    body: `Dear Java Times Caffe Investor ${updateUser?.name}, we are excited to inform you that Antonio Leite, the founder of Java Times Caffe, has generously awarded you with ${share} free shares for your investment in ${store?.title_en} store. Should you have any inquiries, please do not hesitate to contact us at +52(871) 1161608.`,
  };

  await firebaseNotification(
    notification,
    [updateUser],
    "news",
    "Selected-Users",
    "system",
    "users"
  );

  return res.status(200).send({
    status: true,
    message: "Shares have been successfully transferred.",
    admin,
  });
});

/**
 @desc     Get All Transfer
 @route    GET /api/blog
 @access   Public
 */
const getAllTransfer = asyncHandler(async (req, res) => {
  const transfer = await DonationShareTransfer.find({}).populate({
    path: "walletId",
    populate: {
      path: "userId",
      model: "user", // Replace 'User' with the actual model name for the user
    },
  });
  transfer.length === 0
    ? res.status(200).send({
        status: false,
        message: "Transfer Share does not exist",
        transfer: [],
      })
    : res.status(200).send({ status: true, transfer });
});

/**
 @desc     create blog
 @route    get /api/admin/blog
 @access   Private
 */

const createBlog = asyncHandler(async (req, res) => {
  if (req.uploadError) {
    res.status(400);
    throw new Error(req.uploadError);
  }

  let image = req.files?.image?.[0];
  let authorImage = req.files?.authorImage?.[0];

  if (!authorImage?.filename) {
    return res
      .status(200)
      .json({ status: false, message: "Please Select the Author Image" });
  }

  if (!image?.filename) {
    return res
      .status(200)
      .json({ status: false, message: "Please Select the Blog Image" });
  }

  req.body.image = image ? `${PATH}upload/${image?.filename}` : "";

  req.body.authorImage = authorImage
    ? `${PATH}upload/${authorImage?.filename}`
    : "";

  function slugify(string) {
    return string
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }
  req.body.slug = slugify(req.body.title);
  const blogCreated = await new Blog(req.body).save();

  let users = await User.findOne({
    email: "arish@yopmail.com",
    isDeleted: false,
  });

  const notification = {
    title: `New Blog is Out Now (${blogCreated?.title})`,
    body: `Dear Java Times Caffe Users, a new blog is out now. ${LOCALPATH}/blog/${blogCreated?.slug}`,
  };

  await firebaseNotification(
    notification,
    [users],
    "news",
    "Selected-Users",
    "system",
    "users"
  );
  return res
    .status(201)
    .json({ status: true, message: "Blog Created Successfully" });
});

/**
 @desc     Get All Blog
 @route    GET /api/admin/blogs/active
 @access   Public
 */
const getAllBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.find({ active: false }).sort({ createdAt: -1 });

  blog.length === 0
    ? res
        .status(200)
        .send({ status: false, message: "Blog does not exist", blog: [] })
    : res.status(200).send({ status: true, blog });
});

/**
 @desc     Get All Blog
 @route    GET /api/admin/blogs/active
 @access   Public
 */
 const getActiveBlog = async (req, res) => {
  try {
    const blog = await Blog.find({ active: true }).sort({ createdAt: -1 });

    if (!blog || blog.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "No active blogs found" });
    }

    return res.status(200).json({ status: true, blog });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Server error", error: error.message });
  }
};

/**
 @desc     Get All Active Blog
 @route    GET /api/admin/blogs/active
 @access   Public
 */
const getAllActiveBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.find({});

  blog.length === 0
    ? res
        .status(200)
        .send({ status: false, message: "Blog does not exist", blog: [] })
    : res.status(200).send({ status: true, blog });
});

/**
 @desc     Update blog
 @route    PUT /api/admin/blog/:id
 @access   Private
 */
const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isValidID = mongoose.Types.ObjectId.isValid(id);

  /*blocks runs if params id is not valid */
  if (!isValidID) {
    res.status(422);
    throw new Error("invalid param id");
  }

  const blog = await Blog.findById(id);

  let image = req.files?.image?.[0];
  let authorImage = req.files?.authorImage?.[0];

  req.body.image = image ? `${PATH}upload/${image?.filename}` : blog?.image;

  req.body.authorImage = authorImage
    ? `${PATH}upload/${authorImage?.filename}`
    : blog?.authorImage;

  function slugify(string) {
    return string
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }
  req.body.slug = slugify(req.body.title);
  const updatedBlog = await Blog.findByIdAndUpdate(id, req.body, { new: true });
  if (updatedBlog)
    return res
      .status(200)
      .json({ status: true, message: "Blog updated successfully" });

  res
    .status(404)
    .send({ status: false, message: "Blog with this id does not exists" });
});

/**
 @desc     Delete Multiple blog with id
 @route    DELETE /api/admin/blog
 @access   Private
 */
const deleteBlog = asyncHandler(async (req, res) => {
  const ids = req?.body;
  const deletedBlogs = await Blog.deleteMany({ _id: { $in: ids } });

  if (deletedBlogs.deletedCount === 0)
    return res
      ?.status(200)
      .send({ status: false, message: "nothing to delete" });

  res?.status(200).send({
    status: true,
    message: `${deletedBlogs?.deletedCount} blogs delete successfully`,
  });
});

/**
 @desc     Disable Blog
 @route    PUT /api/admin/blog/disable/id
 @access   Private
 */
const disableBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }

  const blog = await Blog.findByIdAndUpdate(
    id,
    { active: false },
    { new: true }
  );

  if (blog)
    return res
      .status(200)
      .json({ status: true, message: "Blog has been Disabled." });

  return res
    .status(404)
    .send({ status: false, message: `No blog found with id: ${id}` });
});

/**
@desc     Enable Blog
@route    PUT /api/admin/blog/enable/id
@access   Private
*/
const enableBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }

  const blog = await Blog.findByIdAndUpdate(
    id,
    { active: true },
    { new: true }
  );

  if (blog)
    return res
      .status(200)
      .json({ status: true, message: "Blog has been enabled." });

  return res
    .status(404)
    .send({ status: false, message: `No blog found with id: ${id}` });
});

/*
@desc     Get One Blog By ID
@route    GET /api/admin/one-blog/:id
@access   Public
*/
const getOneBlogByID = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);

  if (blog) {
    res.status(200).json({
      status: true,
      blog,
    });
  } else {
    res
      .status(404)
      .json({ status: true, message: "No blog exists with this Id" });
  }
});

/*
@desc     Get One Blog 
@route    GET /api/blog/:id
@access   Public
*/
const getOneBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findOne({ slug: id });

  if (blog) {
    res.status(200).json({
      status: true,
      blog,
    });
  } else {
    res
      .status(404)
      .json({ status: true, message: "No blog exists with this Id" });
  }
});
/**
 @desc     Get All Annual Progress
 @route    GET /api/admin/annual-progress
 @access   Private
 */
const getAllAnnualProgress = asyncHandler(async (req, res) => {
  const annualProgress = await AnnualProgress.find({ isDeleted: false });

  annualProgress.length === 0
    ? res.status(200).send({
        status: false,
        message: "Annual Progress does not exist",
        annualProgress: [],
      })
    : res.status(200).send({ status: true, annualProgress });
});

/**
 @desc     create Annual Progress
 @route    POST /api/admin/annual-progress
 @access   Private
 */

const createAnnualProgress = asyncHandler(async (req, res) => {
  if (req.uploadError) {
    res.status(400);
    throw new Error(req.uploadError);
  }

  let file = req.file;

  if (!file?.filename) {
    return res.status(200).json({
      status: false,
      message: "Please select the annual progress report file",
    });
  }

  req.body.file = file ? `${PATH}upload/${file?.filename}` : "";

  await new AnnualProgress(req.body).save();

  return res.status(201).json({
    status: true,
    message: "Annual Progress Report Created Successfully",
  });
});

/**
 @desc     Delete Annual progress
 @route    DELETE /api/admin/annual-progress
 @access   Private
 */
const deleteAnnualProgress = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const deletedAnnual = await AnnualProgress.findOneAndUpdate(
    { _id: id },
    { isDeleted: true }
  );

  res?.status(200).send({
    status: true,
    message: `Annual Progress Report delete successfully`,
  });
});

/**
 @desc     create Annual Progress
 @route    POST /api/admin/send-annual-progress
 @access   Private
 */

const sendAnnualProgressToInvestor = asyncHandler(async (req, res) => {
  let users = await User.find({ isDeleted: false, isInvestor: true });

  const notification = {
    title: `Annual Progress Report is Out Now`,
    body: `Dear Java Times Caffe Investors, a annual progress report is out now. ${LOCALPATH}/user/wallet`,
  };

  await firebaseNotification(
    notification,
    users,
    "news",
    "Investors",
    "system",
    "users"
  );
  return res.status(201).json({
    status: true,
    message: "Annual Progress Report Send Successfully",
  });
});

const getDividend = asyncHandler(async (req, res) => {
  let dividend = await Dividend.find();

  if (!dividend.length > 0)
    return res
      .status(200)
      .json({ status: false, message: "Dividend does not exist" });

  res.status(200).json({
    status: true,
    dividend: dividend,
  });
});

/**
 @desc     create News
 @route    get /api/admin/news
 @access   Private
 */

const createNewsFeet = asyncHandler(async (req, res) => {
  const news = await News.findOne({ email: req.body.email });
  if (news)
    return res
      .status(201)
      .json({ status: true, message: "Thank you for subscribing" });

  const newsCreated = await new News(req.body).save();

  if (newsCreated) {
    return res
      .status(201)
      .json({ status: true, message: "Thank you for subscribing" });
  }
});

/**
 @desc     Get All NewsFeet
 @route    GET /api/admin/news
 @access   Private
 */
const getAllNewsFeet = asyncHandler(async (req, res) => {
  const news = await News.find().select("email");

  news.length === 0
    ? res
        .status(200)
        .send({ status: false, message: "News Feet does not exist", news: [] })
    : res.status(200).send({ status: true, news });
});

/**
 @desc     User Details
 @route    get /api/admin/userDetails
 @access   Private
 */
const userAllDetails = asyncHandler(async (req, res) => {
  const type = req.query.type;
  const { id } = req.params;

  const isValidID = mongoose.Types.ObjectId.isValid(id);
  /*blocks runs if params id is not valid */
  if (!isValidID) {
    res.status(422);
    throw new Error("invalid param id");
  }
  let user;
  if (type === "user_details") {
    user = await User.findById(id);
  } else if (type === "kyc_details") {
    user = await KYC.findOne({ userId: id });
  } else if (type === "investor_details") {
    user = await Investor.findOne({ userId: id });
  } else if (type === "wallet_details") {
    user = await Wallet.findOne({ userId: id });

    const transaction = await Transaction.find({ userId: id });

    const totalFractionalAmountInvested = transaction.reduce((sum, item) => {
      if (!Number.isInteger(item.purchasedShare)) {
        const fractionalPart =
          item.purchasedShare - Math.floor(item.purchasedShare);
        return sum + fractionalPart;
      } else {
        return sum;
      }
    }, 0);

    user["fractionalMoney"] = totalFractionalAmountInvested;
    if (user) {
      user = user.toObject(); // Convert Mongoose document to plain JavaScript object
      user.fractionalMoney = totalFractionalAmountInvested;
    }
  }

  if (user) {
    res.status(200).json({
      status: true,
      user,
    });
  } else {
    res.status(404).json({ status: true, message: "No Record Exists" });
  }
});

/**
 @desc     admin Invest User
 @route    get /api/admin/admin-invest
 @access   Private
 */

const adminInvestUser = asyncHandler(async (req, res) => {
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
      message: "User not found",
    });

  const sharePurchasedByInvestor = shareAmount;

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
        "User wallet does not exists , Plz verfy the user before investment",
    });

  // if (TOTAL_SHARES - sharePurchasedByInvestor < 0)
  //  {

  //   console.log(TOTAL_SHARES - sharePurchasedByInvestor , "sharePurchasedByInvestor NEW")
  //   return res.status(400).json({
  //     status: false,
  //     message: `you cannot purchase ${shareAmount}, total available shares are: ${TOTAL_SHARES}`,
  //   });
  //  }

  const investmentAmountInvestor =
    req.body.shareAmount * sharePrice?.sharePrice;

  // const totalInvestmentShares = investmentAmountInvestor / sharePrice?.sharePrice;

  // const investorPurchasedShares = (70 / 100) * totalInvestmentShares;

  // const InvestorAmount = investorPurchasedShares * sharePrice?.sharePrice;

  // const transaction = await Transaction.find({});

  // const totalSumOfAmountWithUserWalletUserWalletTransaction  = await Transaction.aggregate([
  //   {
  //     $group: {
  //       _id: null,
  //       TotalAmount: {
  //         $sum: "$amountInvested",
  //       },
  //     },
  //   },
  // ]);

  // const totalSumOfAmountAggregate = await Transaction.aggregate([
  //   {
  //     $match: {
  //       type: { $ne: "user-wallet" }
  //     }
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       TotalAmount: {
  //         $sum: "$amountInvested"
  //       }
  //     }
  //   }
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
  //   totalSumOfAmountWithUserWalletUserWalletTransaction?.[0].TotalAmount + investmentAmountInvestor;
  // } else {
  //   totalSumOfAmountWithUserWallet = totalSumOfAmountWithUserWallet + investmentAmountInvestor;
  // }

  // if(totalSumOfAmountWithUserWallet >= sharePrice?.nextTargetAchieved)
  //   {
  //     await SharePrice.findOneAndUpdate({_id:sharePrice?._id},{targetAchieved:totalSumOfAmountWithUserWallet , active:false});
  //     await new SharePrice({sharePrice:sharePrice?.sharePrice + 5 , targetAchieved:totalSumOfAmountWithUserWallet , nextTargetAchieved: sharePrice?.nextTargetAchieved + 3000000}).save();
  //   }else{
  //     await SharePrice.findOneAndUpdate({_id:sharePrice?._id},{targetAchieved:totalSumOfAmountWithUserWallet});
  //   }

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

  // const transactionUser = await new Transaction({
  //   storeId: id,
  //   userId: userId,
  //   purchasedShare: investorPurchasedShares,
  //   sharePrice: sharePrice?.sharePrice,
  //   type: "wallet",
  //   amountInvested: investmentAmountInvestor,
  // });

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

  async function allocateSharesToStores(
    userId,
    totalSharesNeeded,
    isOffer = false
  ) {
    let sharesToAllocate = totalSharesNeeded;

    console.log(sharesToAllocate, "sharesToAllocatesharesToAllocate");
    let currentStore = await Store.findOne({ _id: id, isDeleted: false });

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
    const investmentAmount = shares * sharePrice?.sharePrice;
    console.log(shares, "SHARES PURCHASED");
    if (shares > 0) {
      let sharesInvestor = (70 / 100) * shares;
      const investorPurchasedShares =
        DivideIntegarAndDecimalNumber(sharesInvestor);
      console.log(investorPurchasedShares, "investmentAmountinvestmentAmount");

      // Investor TRANSACTION

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
      const transactionUser = await Transaction.create({
        storeId: store?._id,
        userId: userId,
        purchasedShare: sharesInvestor,
        sharePrice: sharePrice?.sharePrice,
        type: "wallet",
        amountInvested: investmentAmount,
      });

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
                  balance:
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
                balance: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );
          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  balance:
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
                balance: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );

          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  balance:
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
                balance: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );
          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  balance:
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
                balance: item.getActualShares * sharePrice?.sharePrice,
              },
            }
          );
          if (!Number.isInteger(item.getNewWalletShares)) {
            await Wallet.updateOne(
              { type: WALLET_TYPES.NEW_OWNER },
              {
                $inc: {
                  shares: item.getNewWalletShares,
                  balance:
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
          storeId: id,
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

      await Wallet.findOneAndUpdate(
        { userId: userId },
        {
          $inc: {
            shares: amountShares?.getActualShares,
            amount: amountShares?.getActualShares * sharePrice?.sharePrice,
          },
        },
        { new: true }
      );

      const updateUser = await User.findByIdAndUpdate(
        userId,
        { isInvestor: true },
        { new: true }
      );

      await reward_JTC_TOKEN(userId, investmentAmount);

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

  // for (const share of adminShares) {
  //   const adminTransaction = new AdminTransaction({
  //     storeId: id,
  //     type: share.type,
  //     userTransactionId: transactionUser?._id,
  //     purchasedShare: share.getActualShares,
  //     sharePrice: sharePrice?.sharePrice,
  //     amountInvested: share.getActualShares * sharePrice?.sharePrice,
  //   });

  //   await adminTransaction.save();
  // }

  // shares.map(async (item) => {
  //   if (item.type === "investor") {
  //     transactionUser.purchasedShare = item.getActualShares;
  //     await transactionUser.save();

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

  //     const kyc = await KYC.findOne({ userId: userId });
  //     const transactionFind = await Transaction.find({
  //       isDeleted: false,
  //       userId: userFind?._id,
  //     });

  //     const amountInvested = transactionFind.reduce(
  //       (acc, obj) => (acc += obj.amountInvested),
  //       0
  //     );
  //     console.log(amountInvested, "amountInvested");
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
  //             balance: investorPurchasedShares * sharePrice?.sharePrice - item.getActualShares * sharePrice?.sharePrice,
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
  //             balance: ownerShares * sharePrice?.sharePrice - item.getActualShares * sharePrice?.sharePrice,
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
  //             balance: ownerSon1Shares * sharePrice?.sharePrice - item.getActualShares * sharePrice?.sharePrice,
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
  //             balance: ownerSon2Shares * sharePrice?.sharePrice - item.getActualShares * sharePrice?.sharePrice,
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
  //             balance: ownerSon3Shares * sharePrice?.sharePrice - item.getActualShares * sharePrice?.sharePrice,
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

  // const store = await Store.findOneAndUpdate(
  //   { _id: id },
  //   { totalShares: storeTotalShare },
  //   { new: true }
  // );

  //Refer User

  const updateUser = await User.findByIdAndUpdate(
    userId,
    { isInvestor: true },
    { new: true }
  );

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

      if (refer) {
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
      }
    } else {
      console.log("NOT found any valid referral");
    }
  } else {
    console.log("NOT found referral");
  }

  // await reward_JTC_TOKEN(userId, investmentAmountInvestor);

  // const notification = {
  //   title: "Congratulations on Your Investment in Java Times Caffe Store!",
  //   body: `Dear ${updateUser?.name}, Congratulations! Your investment in Java Times Caffe Store has been successfully processed. You've purchased ${transactionUser?.purchasedShare} shares in the store ${store?.title_en}, and we appreciate your commitment to our endeavor. If you have any questions or need further assistance, please feel free to contact us at +52(871) 1161608. We're here to help!, Thank you for choosing Java Times Caffe!`,
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
  //     body: `${updateUser?.name} has made a new investment by purchasing ${transactionUser?.purchasedShare} shares in ${store?.title_en}.`,
  //   },
  //   "news",
  //   "Selected-Users",
  //   "system",
  //   "admin"
  // );

  // let transactionOfferFind = await Transaction.findOne({type: "offer", userId:userId});

  // if(!transactionOfferFind){
  //   console.log("Not found offer");
  //   let OfferFind = await Offers.findOne({type: "signup", isActive: true});
  //   console.log("OfferFind", OfferFind);

  //   if (OfferFind) {
  //     if (investmentAmountInvestor >= OfferFind?.targetMinimumAmount && investmentAmountInvestor <= OfferFind?.targetMaximumAmount) {
  //       console.log("investmentAmountInvestor", investmentAmountInvestor);
  //       console.log("OfferFind?.targetAmount", OfferFind?.targetAmount);
  //       console.log("Found Target Offer");

  //       const shares = Math.floor(sharePurchasedByInvestor);
  //       console.log("Total Shares Purchased by Investor:", shares);

  //       const investor70Shares = Math.floor((70 / 100) * shares);
  //       console.log("Investor 70% Shares:", investor70Shares);

  //       const rewardPercentage = OfferFind?.rewardPercentage;
  //       let investorRewardedShares = (rewardPercentage / 100) * investor70Shares;
  //       console.log("Investor Rewarded Shares (before rounding):", investorRewardedShares);

  //       investorRewardedShares = Math.round(investorRewardedShares);

  //       console.log("Investor Rewarded Shares (after rounding):", investorRewardedShares);

  //       if (investorRewardedShares > 0) {

  //         console.log("Value is greater than 0", investorRewardedShares);
  //         const allocationSuccess = await allocateSharesToStores(userId, investorRewardedShares,true);

  //         if (allocationSuccess) {
  //           console.log(`Successfully allocated ${investorRewardedShares} rewarded shares to the user.`);
  //         } else {
  //           console.log(`Not enough shares available in stores to allocate ${investorRewardedShares} shares.`);
  //         }
  //       } else {
  //         console.log("Value is less than 0", investorRewardedShares);
  //       }

  //     } else {
  //       console.log("Not Found Target Offer");
  //     }
  //   } else {
  //     console.log("Not found any offer");
  //   }

  // }else{
  //   console.log("Found offer");
  // }

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

  calculateOfferShares(userId, sharePurchasedByInvestor);

  const user = await ownerModel
    .findOne({ type: "owner" })
    .populate("wallet reserveWallet newWallet");

  res?.status(201).send({
    status: true,
    user,
    message: "Successfully Invested",
  });
});

//@desc  Contact Us
//@route  /admin/contact
//@request Post Request
//@acess  public

const contactUs = asyncHandler(async (req, res) => {
  contactUsEmail(req.body);

  return res
    .status(200)
    .json({ status: true, message: "We will contact you soon" });
});

//@desc  Contact Us
//@route  /admin/contactWallet
//@request Post Request
//@acess  public

const contactUsJTC = asyncHandler(async (req, res) => {
  contactUsWallet(req.body);

  return res
    .status(200)
    .json({ status: true, message: "We will contact you soon" });
});

/**
 @desc     Aaalytics Data
 @route    get /api/users/analyticStore
 @access   Public
 */

const getAnalytics = asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear();

  const firstDay = new Date("2023-01-01T00:00:00.000Z");
  //const firstDay = new Date(2023, 0, 1);

  const lastDay = new Date(currentYear, 11, 31);

  const recentUser = await Transaction.find({
    purchasedAt: { $gte: firstDay, $lte: lastDay },
  });
  recentUser.filter((data, item) => {});

  const FIRST_MONTH = 1;
  const LAST_MONTH = 12;
  const MONTHS_ARRAY = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const recent = await Transaction.aggregate([
    {
      $match: {
        purchasedAt: { $gte: firstDay, $lte: lastDay },
      },
    },
    {
      $group: {
        _id: { year_month: { $substrCP: ["$purchasedAt", 0, 7] } },
        count: { $sum: "$amountInvested" },
        //count: { $sum: 1}
      },
    },
    {
      $sort: { "_id.year_month": 1 },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        month_year: {
          $concat: [
            {
              $arrayElemAt: [
                MONTHS_ARRAY,
                {
                  $subtract: [
                    { $toInt: { $substrCP: ["$_id.year_month", 5, 2] } },
                    1,
                  ],
                },
              ],
            },
            "-",
            { $substrCP: ["$_id.year_month", 0, 4] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        data: { $push: { k: "$month_year", v: "$count" } },
      },
    },
    {
      $addFields: {
        start_year: { $substrCP: [firstDay, 0, 4] },
        end_year: { $substrCP: [lastDay, 0, 4] },
        months1: {
          $range: [
            { $toInt: { $substrCP: [firstDay, 5, 2] } },
            { $add: [LAST_MONTH, 1] },
          ],
        },
        months2: {
          $range: [
            FIRST_MONTH,
            { $add: [{ $toInt: { $substrCP: [lastDay, 5, 2] } }, 1] },
          ],
        },
      },
    },
    {
      $addFields: {
        template_data: {
          $concatArrays: [
            {
              $map: {
                input: "$months1",
                as: "m1",
                in: {
                  count: 0,
                  month_year: {
                    $concat: [
                      {
                        $arrayElemAt: [
                          MONTHS_ARRAY,
                          { $subtract: ["$$m1", 1] },
                        ],
                      },
                      "-",
                      "$start_year",
                    ],
                  },
                },
              },
            },
            {
              $map: {
                input: "$months2",
                as: "m2",
                in: {
                  count: 0,
                  month_year: {
                    $concat: [
                      {
                        $arrayElemAt: [
                          MONTHS_ARRAY,
                          { $subtract: ["$$m2", 1] },
                        ],
                      },
                      "-",
                      "$end_year",
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      $addFields: {
        data: {
          $map: {
            input: "$template_data",
            as: "t",
            in: {
              k: "$$t.month_year",
              v: {
                $reduce: {
                  input: "$data",
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: ["$$t.month_year", "$$this.k"] },
                      { $add: ["$$this.v", "$$value"] },
                      { $add: [0, "$$value"] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        data: { $arrayToObject: "$data" },
        _id: 0,
      },
    },
  ]);

  // let yearly_data = Object.values(recent?.[0]?.data);

  // let sum = yearly_data?.reduce((acc, el) => (acc += el));

  // const final = yearly_data?.map((el) => {
  //   let res = (el * 100) / sum;
  //   res = Math.round(res);
  //   return res;
  // });
  const users = await User.find({ isDeleted: false }).countDocuments();
  const stores = await Store.find({ isDeleted: false }).countDocuments();

  let data = { users, stores };
  // return res.status(200).json({ status: true, yearly_data: final, data });

  return res.status(200).json({ status: true, data });
});

/*
@desc     Get all users
@route    GET /api/user
@access   Private
*/
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: false }).sort({ _id: -1 });
  res.status(200).json({ status: true, users: users });
});

/*
@desc     Get all users
@route    GET /api/user
@access   Private
*/
const resetPasswordEmail = asyncHandler(async (req, res) => {
  let mailObj = {
    template: "/template",
  };

  let uniqueString = otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: true,
    specialChars: false,
  });
  await UserVerification.findOneAndDelete({ email: req.body.email });

  let verification = new UserVerification({
    email: req.body.email,
    resetId: uniqueString,
  });
  verification = await verification.save();

  await sendResetPasswordEmail(
    req.body.email,
    req.body.fullName,
    mailObj,
    verification?._id,
    uniqueString
  );

  return res
    .status(200)
    .json({ status: true, message: "Reset Password Email Sent Successfully" });
});

const verifyUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isValidID = mongoose.Types.ObjectId.isValid(id);

  if (!isValidID) {
    res.status(430);
    throw new Error("Id not valid");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isVerified: true } },
    { new: true }
  );

  const wallet = await Wallet.findOne({ userId: id });

  if (!wallet) {
    const unassignedClabeAccount = await Clabe.findOne({
      userId: { $exists: false },
    });

    if (unassignedClabeAccount) {
      const clabeAccount = await Clabe.findByIdAndUpdate(
        unassignedClabeAccount._id,
        { userId: user?._id },
        { new: true }
      );

      const walletCreated = await new Wallet({
        userId: user?._id,
        type: "investor",
        amount: 0,
        shares: 0,
        dividend: 0,
        balance: 0,
      }).save();

      let updatedUser = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            wallet: walletCreated?._id,
            clabe: clabeAccount?.clabe,
            isVerified: true,
          },
        },
        { new: true }
      );

      sockets.sendVerificationSuccess(updatedUser);

      return res.status(201).json({
        status: true,
        message: "User verified, wallet and Clabe account assigned !",
        walletId: walletCreated?._id,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "User verified, but not available Clabe account to assigned !",
      });
    }
  } else {
    return res
      .status(200)
      .json({ status: false, message: "User Already Verified" });
  }
});

const checkAccountBalance = asyncHandler(async (req, res) => {
  let data = {
    cuentaOrdenante: "646180352800000009",
    empresa: "STARTUP",
    firma: "",
  };
  let crypto = new AccountBalanceCryptoHandler(data);

  data["firma"] = crypto.getSign();

  const response = await rp({
    url: "https://prod.stpmex.com:7002/efws/API/consultaSaldoCuenta",
    method: "POST",
    json: true,
    body: data,
  });

  console.log("checkAccountBalance");
  console.log(data);
  console.log(response);
  return res.send(response);
});

const checkTransactions = asyncHandler(async (req, res) => {
  let data = {
    empresa: "STARTUP",
    firma: "",
    fechaOperacion: req.query.date,
    page: 0,
    tipoOrden: "R",
  };
  let crypto = new TransactionsCryptoHandler(data);

  data["firma"] = crypto.getSign();

  console.log("checkTransactions");
  console.log(data);
  const response = await rp({
    url: "https://prod.stpmex.com:7002/efws/API/V2/conciliacion",
    method: "POST",
    json: true,
    body: data,
  });

  console.log(response);

  return res.send(response);
});

const checkOrder = asyncHandler(async (req, res) => {
  try {
    console.log("item in check orders", req.item);

    console.log("fetch operation in orders", req?.fechaOperacion);
    let data = {
      claveRastreo: req?.item?.claveRastreo,
      empresa: "STARTUP",
      fechaOperacion: req?.fechaOperacion,
      firma: "",
      tipoOrden: "R",
    };

    let crypto = new OrderCryptoHandler(data);

    data["firma"] = crypto.getSign();

    const response = await rp({
      url: "https://prod.stpmex.com:7002/efws/API/consultaOrden",
      method: "POST",
      json: true,
      body: data,
    });

    console.log("fetch operation success", response);
    return true;
  } catch (error) {
    return false;
  }
});
const checkOrders = asyncHandler(async (req, res) => {
  let data = {
    claveRastreo: "W1397800050926686208,456322",
    empresa: "STARTUP",
    firma: "",
    tipoOrden: "R",
  };
  let crypto = new OrdersCryptoHandler(data);

  data["firma"] = crypto.getSign();

  const response = await rp({
    url: "https://prod.stpmex.com:7002/efws/API/consultaOrdenes",
    method: "POST",
    json: true,
    body: data,
  });

  console.log("checkOrders");
  console.log(data);
  console.log(response);
  return res.send(response);
});

/*
@desc     Get admin profile
@route    GET /api/admin/profile/:id
@access   Private
*/
const getAdminProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isValidID = mongoose.Types.ObjectId.isValid(id);

  /*blocks runs if params id is not valid */
  if (!isValidID) {
    res.status(422);
    throw new Error("invalid param id");
  }

  const admin = await ownerModel
    .findById(id)
    .populate("wallet reserveWallet newWallet");

  if (admin) {
    return res.status(200).send({
      status: true,
      admin,
    });
  } else {
    return res
      .status(404)
      .send({ status: true, message: "No Admin Exists with this Id" });
  }
});

/*
@desc     POST Notification Send
@route    GET /api/admin/notification-send
@access   Private
*/
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendPushNotification = asyncHandler(async (req, res) => {
  const image = req?.file?.filename;
  req.body.image = image ? `${PATH}upload/${image}` : false;

  const notification = req.body.image
    ? {
        title: req.body.title,
        body: req.body.body,
        image: req.body.image,
      }
    : {
        title: req.body.title,
        body: req.body.body,
      };

  let users;
  if (req.body.target === "All-Users") {
    users = await User.find({ isDeleted: false });
  } else if (req.body.target === "Investors") {
    users = await User.find({ isDeleted: false, isInvestor: true });
  } else if (req.body.target === "Non-Investors") {
    users = await User.find({ isDeleted: false, isInvestor: false });
  } else if (req.body.target === "Selected-Users") {
    users = await User.find({
      _id: { $in: req.body.userIds },
      isDeleted: false,
    });
  } else {
    return res
      .status(400)
      .send({ status: false, message: "Invalid target type" });
  }

  if (users?.length > 0) {
    if (req.body.target === "All-Users") {
      const batchSize = 100;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        await firebaseNotification(
          notification,
          batch,
          req.body.type,
          req.body.target,
          req.body.from,
          req.body.to
        );

        // Delay of 5 seconds after each batch, except the last
        if (i + batchSize < users.length) {
          await delay(5000); // 5 seconds
        }
      }
    } else {
      // For other target types, send all at once
      await firebaseNotification(
        notification,
        users,
        req.body.type,
        req.body.target,
        req.body.from,
        req.body.to
      );
    }

    await new AdminNotification({
      type: req.body.type,
      target: req.body.target,
      notification,
      userIds: req.body.userIds || [],
    }).save();

    return res
      .status(200)
      .send({ status: true, message: "Notification sent successfully" });
  } else {
    return res.status(400).send({
      status: false,
      message: "Something went wrong while sending notifications",
    });
  }
});


const getAdminNotificationHistory = asyncHandler(async (req, res) => {
  const notifications = await AdminNotification.find({}).sort({
    createdAt: -1,
  });

  if (notifications?.length > 0) {
    return res.status(200).json({ status: true, notifications });
  } else {
    return res.status(200).json({ status: true, notifications: [] });
  }
});

const getSharePriceHistory = asyncHandler(async (req, res) => {
  const shares = await SharePrice.find({ isDeleted: false }).sort({
    createdAt: -1,
  });

  if (shares?.length > 0) {
    return res.status(200).json({ status: true, sharePrice: shares });
  } else {
    return res.status(200).json({ status: true, sharePrice: [] });
  }
});

const updateOwnerProfileToken = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ownerFind = await ownerModel.findById(id);

  req.body.not_token =
    req.body.not_token && req.body.not_token != ""
      ? req.body.not_token
      : ownerFind?.not_token;

  const admin = await ownerModel
    .findByIdAndUpdate(id, { not_token: req.body.not_token }, { new: true })
    .populate("wallet reserveWallet newWallet");

  if (admin) {
    res.status(200).json({
      status: true,
      admin: admin,
    });
  }
});

const getAdminNotification = asyncHandler(async (req, res) => {
  const admin = await ownerModel.findOne({ _id: req.params.id });
  if (!admin) {
    return res
      .status(200)
      .json({ status: false, message: "Admin not exists!" });
  }

  const notifications = await Notification.find({
    adminId: req.params.id,
  }).sort({ createdAt: -1 });
  const unSeenNotifications = await Notification.find({
    adminId: req.params.id,
    isSeen: false,
  }).countDocuments();

  if (notifications?.length > 0) {
    return res
      .status(200)
      .json({ status: true, notifications, unSeenNotifications });
  } else {
    return res
      .status(200)
      .json({ status: true, notifications: [], unSeenNotifications: 0 });
  }
});

const adminNotificationSeen = asyncHandler(async (req, res) => {
  const admin = await ownerModel.findOne({ _id: req.params.id });
  if (!admin) {
    return res
      .status(200)
      .json({ status: false, message: "Admin not exists!" });
  }

  const notifications = await Notification.updateMany(
    { adminId: req.params.id, isSeen: false },
    { isSeen: true }
  );
  if (notifications) {
    return res
      .status(200)
      .json({ status: true, message: "Notification seen sucessfully" });
  } else {
    return res.status(404).json({ status: false, message: "Nothing to seen" });
  }
});

const getAllUserReferral = asyncHandler(async (req, res) => {
  const referralFind = await Referral.find({}).populate(
    "from_referral_userId to_referral_userId"
  );

  referralFind?.length === 0
    ? res.status(200).send({
        status: false,
        message: "Referral does not exist",
        referral: [],
      })
    : res.status(200).send({ status: true, referral: referralFind });
});

/*
@desc     Approved Document Investor
@route    POST /api/admin/user-document-approved/:id
@access   Private
*/

const approvedDocumentInvestor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isValidID = mongoose.Types.ObjectId.isValid(id);

  if (!isValidID) {
    res.status(422);
    throw new Error("invalid param id");
  }
  let userData;
  const userFind = await User.findById(id);
  const documentContract = await Document.findOne({
    userId: id,
    type: "contract",
    status: "approved",
  });

  if (documentContract) {
    userData = await User.findByIdAndUpdate(
      id,
      { isAdminApproved: true, profileCompleted: 99.99 },
      { new: true }
    );
  } else {
    userData = await User.findByIdAndUpdate(
      id,
      { isAdminApproved: true, profileCompleted: 85.70571428571429 },
      { new: true }
    );
  }
  sockets.sendVerificationSuccess(userData);

  if (userData)
    res
      .status(200)
      .json({ status: true, message: "User documents has been approved" });
  else {
    res.status(404).json({ status: true, message: "user does not exist" });
  }
});

const reward_JTC_TOKEN = async (userId, newInvestment) => {
  let user = await User.findById(userId);

  let transactionTrack = await TransactionTrack.findOne({ userId: userId });

  if (!transactionTrack) {
    transactionTrack = new TransactionTrack({
      userId: userId,
      totalInvestedAmount: 0,
      dueAmount: 0,
    });
  }

  let totalInvestment = transactionTrack.dueAmount + newInvestment;
  let fullChunks = 0;
  let remainingAmount = totalInvestment;

  while (remainingAmount >= JTC_THRESHOLD) {
    fullChunks += 1;
    remainingAmount -= JTC_THRESHOLD;
  }

  // Update the total invested amount in the transaction track
  transactionTrack.totalInvestedAmount += newInvestment;

  if (fullChunks > 0) {
    let jtcPoints = fullChunks * JTC_THRESHOLD * JTC_PERCENTAGE;
    // Add JTC points to the user's wallet
    await addJtcPointsToWallet(userId, jtcPoints);
  }

  // Update the due amount in the transaction track
  transactionTrack.dueAmount = remainingAmount;

  await transactionTrack.save();

  console.log(
    `User ${user?.name} invested ${newInvestment} pesos. JTC points awarded: ${
      fullChunks * JTC_THRESHOLD * JTC_PERCENTAGE
    }. Remaining due amount: ${remainingAmount} pesos.`
  );
  if (fullChunks * JTC_THRESHOLD * JTC_PERCENTAGE > 0) {
    const notification = {
      title: "You've Been Rewarded with JTC Tokens!",
      body: `Dear ${
        user?.name
      }, congratulations! Your investment in Java Times Caffe Store has been successfully processed. You have received JTC points worth ${
        fullChunks * JTC_THRESHOLD * JTC_PERCENTAGE
      } as a reward.`,
    };

    await firebaseNotification(
      notification,
      [user],
      "news",
      "Selected-Users",
      "system",
      "users"
    );
  }
};

const addJtcPointsToWallet = async (userId, jtcPoints) => {
  // Fetch the user's wallet and update the jtcToken field
  let wallet = await Wallet.findOne({ userId: userId });
  if (wallet) {
    wallet.jtcToken += jtcPoints;
    await wallet.save();
  } else {
    console.error(`Wallet not found for user ${userId}`);
  }
};

/**
 @desc     POST transferJtcToken
 @route    POST /api/transfer_jtctokens
 @access   Public
 */
const transferJtcToken = asyncHandler(async (req, res) => {
  const { walletId, tokens, memo } = req?.body;

  console.log(walletId, tokens, memo, "walletId, tokens, memo");

  const isValidID = mongoose.Types.ObjectId.isValid(walletId);

  /*blocks runs if params id is not valid */
  if (!isValidID) {
    res.status(400);
    throw new Error("Invalid Wallet Id");
  }

  const user = await Wallet.findById(walletId).populate("userId");
  if (!user) {
    return res.status(404).send(`Wallet not found`);
  }

  await Wallet.findByIdAndUpdate(walletId, {
    $inc: { jtcToken: tokens },
  });

  await new ShareJTCTokenTransfer(req.body).save();
  console.log("object", user);
  sockets.sendVerificationSuccess(user?.userId);

  const notification = {
    title:
      "Special Gift: Free JTC Token from Java Times Caffe Founder, Antonio Leite!",
    body: `Dear Java Times Caffe User ${user?.userId?.name}, we are excited to inform you that Antonio Leite, the founder of Java Times Caffe, has generously awarded you with ${tokens} free jtc tokens. Should you have any inquiries, please do not hesitate to contact us at +52(871) 1161608.`,
  };

  await firebaseNotification(
    notification,
    [user?.userId],
    "news",
    "Selected-Users",
    "system",
    "users"
  );

  return res.status(200).send({
    status: true,
    message: "Tokens have been successfully transferred.",
  });
});

/**
 @desc     Get All Transfer
 @route    GET /api/transfer_jtctokens
 @access   Public
 */
const getAllTokenTransfer = asyncHandler(async (req, res) => {
  const transfer = await ShareJTCTokenTransfer.find({}).populate({
    path: "walletId",
    populate: {
      path: "userId",
      model: "user", // Replace 'User' with the actual model name for the user
    },
  });
  transfer.length === 0
    ? res.status(200).send({
        status: false,
        message: "Transfer Share does not exist",
        transfer: [],
      })
    : res.status(200).send({ status: true, transfer });
});

/**
 @desc     create offers
 @route    get /api/admin/offer
 @access   Private
 */

const createOffer = asyncHandler(async (req, res) => {
  const offer = await Offers.findOne({ type: req.body.type, isDeleted: false });
  if (offer)
    return res
      .status(400)
      .json({ status: true, message: "Offer already created for this type" });

  const offersCreated = await new Offers(req.body).save();

  if (offersCreated) {
    return res
      .status(201)
      .json({ status: true, message: "Offer created successfully" });
  }
});

/**
 @desc     Get All Offer
 @route    GET /api/admin/offer
 @access   Private
 */
const getAllOffer = asyncHandler(async (req, res) => {
  const offers = await Offers.find({ isDeleted: false });

  offers.length === 0
    ? res
        .status(200)
        .send({ status: false, message: "Offer does not exist", offers: [] })
    : res.status(200).send({ status: true, offers });
});

/**
 @desc     Update offer
 @route    PUT /api/admin/offer/:id
 @access   Private
 */
const updateOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isValidID = mongoose.Types.ObjectId.isValid(id);

  /* Block runs if params id is not valid */
  if (!isValidID) {
    res.status(422);
    throw new Error("Invalid param ID");
  }

  const offer = await Offers.findById(id);
  if (!offer) {
    res.status(404);
    throw new Error("Offer not found");
  }
  const updatedOffer = await Offers.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (updatedOffer)
    return res
      .status(200)
      .json({ status: true, message: "Offer updated successfully" });

  res
    .status(404)
    .send({ status: false, message: "Offer with this ID does not exist" });
});

/**
 @desc     Delete multiple offers by ID
 @route    DELETE /api/admin/offer
 @access   Private
 */
const deleteOffer = asyncHandler(async (req, res) => {
  const ids = req?.params.id;
  const deletedOffers = await Offers.findOneAndUpdate(
    { _id: { $in: ids } },
    { isDeleted: true }
  );

  res?.status(200).send({
    status: true,
    deletedOffers,
    message: `Offers deleted successfully`,
  });
});

/**
 @desc     Disable offer
 @route    PUT /api/admin/offer/disable/:id
 @access   Private
 */
const disableOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(430);
    throw new Error("Invalid param ID");
  }

  const offer = await Offers.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (offer)
    return res
      .status(200)
      .json({ status: true, message: "Offer has been disabled." });

  return res
    .status(404)
    .send({ status: false, message: `No offer found with ID: ${id}` });
});

/**
 @desc     Enable offer
 @route    PUT /api/admin/offer/enable/:id
 @access   Private
 */
const enableOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(430);
    throw new Error("Invalid param ID");
  }

  const offer = await Offers.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  );

  if (offer)
    return res
      .status(200)
      .json({ status: true, message: "Offer has been enabled." });

  return res
    .status(404)
    .send({ status: false, message: `No offer found with ID: ${id}` });
});

/**
 @desc     Get one offer by ID
 @route    GET /api/admin/offer/:id
 @access   Public
 */
const getOneOfferByID = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const offer = await Offers.findById(id);

  if (offer) {
    res.status(200).json({
      status: true,
      offer,
    });
  } else {
    res
      .status(404)
      .json({ status: false, message: "No offer exists with this ID" });
  }
});

export {
  getActiveBlog,
  deleteOffer,
  updateOffer,
  disableOffer,
  enableOffer,
  getOneOfferByID,
  createOffer,
  getAllOffer,
  transferJtcToken,
  getAllTokenTransfer,
  reward_JTC_TOKEN,
  approvedDocumentInvestor,
  getAllUserReferral,
  adminNotificationSeen,
  getAdminNotification,
  updateOwnerProfileToken,
  getAdminNotificationHistory,
  getAdminProfile,
  getAllUsers,
  createNewsFeet,
  getAllNewsFeet,
  countRecord,
  generateDividend,
  transferShares,
  createBlog,
  updateBlog,
  getAllBlog,
  deleteBlog,
  getOneBlog,
  getDividend,
  getAllTransfer,
  disableBlog,
  enableBlog,
  getAllActiveBlog,
  getOneBlogByID,
  userAllDetails,
  contactUs,
  getAnalytics,
  resetPasswordEmail,
  verifyUser,
  checkAccountBalance,
  checkTransactions,
  checkOrder,
  checkOrders,
  adminInvestUser,
  sendPushNotification,
  getAllAnnualProgress,
  createAnnualProgress,
  deleteAnnualProgress,
  sendAnnualProgressToInvestor,
  getSharePriceHistory,
  contactUsJTC,
};
