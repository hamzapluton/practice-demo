import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Investor from "#models/investorUserModel";
import Transaction from "#models/transactionModel";
import User from "#models/userModel";
import LegalForm from "#models/legalEntityInvestorModel";
import ownerModel from "#models/ownerModel";
import Store from "#models/storeModel";
import Document from "#models/documentModel";
import otpGenerator from "otp-generator";
import { loginValidation, otpValidation } from "#validation/usersValidation";
import generateToken from "#utils/generateToken";
import OwnerUsers from "#data/userData";
import Wallet from "#models/walletModel";
import ownersWallets from "#data/userWallet";
import rp from "request-promise";
import { TOTAL_PRICE_PER_SHARE, TOTAL_SHARES } from "#constants/wallet";
import { LOCALPATH, TESTPATH, POSPATH } from "#constants/user";
import { UserVerification } from "#models/userVerification";
import { forgetEmail, otpEmail } from "#utils/email";
import { sockets } from "../server.js";
import Clabe from "#models/clabeModel";
import Profit from "#models/profitModel";
import Notification from "#models/notificationModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import { generateUniqueReferralId } from "#utils/generateUniqueReferralId";
import Referral from "#models/referralModel";
import SharePrice from "#models/sharePriceModel";
import { giveDividendManually } from "#utils/dividendManager";

/*
@desc     Create a New User
@route    POST /api/users
@access   Pubic
*/
const registerUser = asyncHandler(async (req, res) => {
  const image = req?.file?.filename;
  if (req.uploadError) {
    res.status(400);
    throw new Error(req.uploadError);
  }
  if (image) req["body"]["image"] = image;

  const userExists = await User.exists({ email: req.body.email });

  if (userExists) {
    res.status(404);
    throw new Error("This email address already in use");
  }

  req.body.category ||= "investor";

  const salt = await bcrypt.genSalt(10);
  req.body.password = await bcrypt.hash(req.body.password, salt);

  // return res.status(400).json({
  //       data: req.body.password,
  //     });
  const user = await new User(req.body).save();
  user.referralId = user._id;
  await user.save()

  if (user) {
    if (req.query.referralId && req.query.referralId !== "") {
      const referralFind = await User.findOne({
        referralId: req.query.referralId,
      });
      if (referralFind) {
        console.log("CALL", req.query.referralId);
        await new Referral({
          from_referral_userId: referralFind?._id,
          to_referral_userId: user?._id,
        }).save();
      }
    }
    await UserVerification.deleteMany({ email: req.body.email });

    let OTP = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    let verification = await new UserVerification({
      email: req.body.email,
      resetId: OTP,
    }).save();

    otpEmail(verification?.email, OTP);

    const data = {
      first_name: req.body.name,
      last_name: req.body.nickName,
      email: req.body.email,
      password: req.body.password,
      phone_no: req.body.phone,
      otp: OTP,
    };

    let response = await rp({
      url: `${POSPATH}api/register-fundraiser`,
      method: "POST",
      json: true,
      body: data,
      rejectUnauthorized: false,
    });

    console.log(response, "responseresponse");

    return res.status(200).json({
      status: true,
      message: "We have sent you an OTP via email for verification.!",
    });
  } else {
    return res.status(400).json({
      status: false,
      message: "Something error when creating user!",
    });
  }

  // const userData = JSON.parse(JSON.stringify(newUser));

  // const { _id, password: _password, ...restUserData } = userData;

  // const token = generateToken(_id);

  // return res
  //   .cookie("x-auth-token", token, {
  //     httpOnly: true,
  //     maxAge: 365 * 24 * 60 * 60 * 1000,
  //   }) // maxAge expire after 1 hour
  //   .header("x-auth-token", token)
  //   .header("access-control-expose-headers", "x-auth-token")
  //   .status(201)
  //   .send({
  //     status: true,
  //     message: "Successfully User Registered",
  //     user: { id: _id, ...restUserData },
  //   });
});

/*
@desc     Auth user & get token
@route    POST /api/users/login
@access   Pubic
*/
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req?.body;
  const { errors, hasErrors } = loginValidation(req.body);
  if (hasErrors) {
    res?.status(400);
    throw new Error(errors);
  }

  const user = await User.findOne({ email }).select('+password');
  if (user?.isDeleted) {
    return res.status(403).send({
      status: false,
      message: "Your account has been suspended",
    });
  }

  const userData = JSON.parse(JSON.stringify(user));

  if (!user) {
    res.status(404);
    throw new Error(`invalid email or password`);
  }

  console.log('Login attempt for:', email);
  console.log('Input password:', password);
  console.log('Stored hash:', user.password);

  const isMatched = await bcrypt.compare(String(password), user.password);

  console.log('Password match result:', isMatched);
  if (!isMatched) {
    res.status(404);
    throw new Error("invalid password");
  }

  if (user?.isVerified === false) {
    await UserVerification.deleteMany({ email: email });

    let OTP = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    let verification = await new UserVerification({
      email: req.body.email,
      resetId: OTP,
    }).save();

    otpEmail(verification?.email, OTP);

    return res.status(200).json({
      status: true,
      message: "We have sent you an OTP via email for verification.!",
    });
  }

  const { _id, password: _password, ...restUserData } = userData;
  const token = generateToken(_id);

  const userAnalytics = await Document.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(_id),
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const user_analytics = {
    approved: 0,
    pending: 0,
    rejected: 0,
  };

  userAnalytics.forEach((item) => {
    if (item._id === "approved") {
      user_analytics.approved = item.count;
    } else if (item._id === "pending") {
      user_analytics.pending = item.count;
    } else if (item._id === "rejected") {
      user_analytics.rejected = item.count;
    }
  });

  return res
    .cookie("x-auth-token", token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    }) // maxAge expire after 1 hour
    .header("x-auth-token", token)
    .header("access-control-expose-headers", "x-auth-token")
    .status(200)
    .send({
      status: true,
      message: "Successfully User Logged-in",
      user: { id: _id, ...restUserData },
      user_analytics,
      token,
    });
});

//@desc  User otp verify
//@route  /user/verify
//@request post Request
//@acess  public

const otpVerify = asyncHandler(async (req, res) => {
  const { errors, hasErrors } = otpValidation(req.body);
  if (hasErrors) {
    res?.status(400);
    throw new Error(errors);
  }

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res
      .status(404)
      .send({ status: false, message: "Email does not exists" });
  }

  const otpFind = await UserVerification.findOne({ email: req.body.email });

  if (!otpFind)
    return res
      .status(404)
      .send({ status: false, message: "You use an expired OTP!" });

  if (otpFind?.resetId === req.body.otp) {
    const wallet = await Wallet.findOne({ userId: user?._id });

    if (!wallet) {
      const unassignedClabeAccount = await Clabe.findOne({
        userId: { $exists: false },
      });

      if (unassignedClabeAccount) {
        const clabeAccount = await Clabe.findByIdAndUpdate(
          unassignedClabeAccount?._id,
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
          user?._id,
          {
            $set: {
              wallet: walletCreated?._id,
              clabe: clabeAccount?.clabe,
              isVerified: true,
            },
          },
          { new: true }
        );

        // sockets.sendVerificationSuccess(updatedUser);

        const data = {
          email: req.body.email,
          otp: req.body.otp,
          walletId: walletCreated?._id,
        };

        let response = await rp({
          url: `${POSPATH}api/verify-user-fundraiser`,
          method: "POST",
          json: true,
          body: data,
          rejectUnauthorized: false,
        });
      }

      await UserVerification.deleteMany({ email: req.body.email });

      const userFindAndUpdate = await User.findOneAndUpdate(
        { email: user?.email },
        { $set: { isVerified: true } },
        { new: true }
      );

      const userData = JSON.parse(JSON.stringify(userFindAndUpdate));

      const { _id, password: _password, ...restUserData } = userData;

      const token = generateToken(_id);

      const notification = {
        title: "Welcome to Java Times Caffe",
        body: `¡Bienvenidos a Java Times Caffe! We are thrilled to have you as part of our Java Times Caffe family, your ultimate destination for everything coffee. ☕ 
        At Java Times Caffe, we're not just about coffee; we're about creating a community of coffee enthusiasts who share a passion for the perfect brew!
        `,
      };

      await firebaseNotification(
        notification,
        [user],
        "news",
        "Selected-Users",
        "system",
        "users"
      );

      return res
        .cookie("x-auth-token", token, {
          httpOnly: true,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        }) // maxAge expire after 1 hour
        .header("x-auth-token", token)
        .header("access-control-expose-headers", "x-auth-token")
        .status(200)
        .send({
          status: true,
          message: "Successfully User Verified and Wallet Created",
          user: { id: _id, ...restUserData },
          token,
        });
    } else {
      return res
        .status(404)
        .send({ status: false, message: "Something Error" });
    }
  } else {
    return res.status(404).send({ status: false, message: "Otp was wrong!" });
  }
});

/*
@desc     Get user profile
@route    GET /api/users/profile
@access   Private
*/
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isValidID = mongoose.Types.ObjectId.isValid(id);

  /*blocks runs if params id is not valid */
  if (!isValidID) {
    res.status(422);
    throw new Error("invalid param id");
  }

  const user = await User.findById(id);

  if (user) {
    return res.status(200).send({
      status: true,
      user,
    });
  } else {
    return res
      .status(404)
      .send({ status: true, message: "No User Exists with this Id" });
  }
});

/*
@desc     Update user profile
@route    PUT /api/users/profile/:id
@access   Private
*/
const updateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // const {firstName, lastName} = req.body;

  // if (!firstName && !lastName) {
  //     res.status(400).json('There are nothing to update');
  // }
  if (req.uploadError) {
    res.status(400);
    throw new Error(req.uploadError);
  }

  const userFind = await User.findById(id);

  const image = req?.file?.filename;
  req.body.image = image ? `${image}` : userFind?.image;

  req.body.not_token =
    req.body.not_token && req.body.not_token != ""
      ? req.body.not_token
      : userFind?.not_token;

  const user = await User.findByIdAndUpdate(id, req.body, { new: true });

  const notification = {
    title: "Profile updated successfully",
    body: `Your profile has been updated successfully`,
  };

  await firebaseNotification(
    notification,
    [user],
    "news",
    "Selected-Users",
    "system",
    "users"
  );

  if (user) {
    res.status(200).json({
      status: true,
      message: "User Profile has been update",
      user: user,
    });
  }
});

const updateUserProfileToken = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userFind = await User.findById(id);

  req.body.not_token =
    req.body.not_token && req.body.not_token != ""
      ? req.body.not_token
      : userFind?.not_token;

  req.body.not_token_mobile =
    req.body.not_token_mobile && req.body.not_token_mobile != ""
      ? req.body.not_token_mobile
      : userFind?.not_token_mobile;

  const user = await User.findByIdAndUpdate(
    id,
    {
      not_token: req.body.not_token,
      not_token_mobile: req.body.not_token_mobile,
    },
    { new: true }
  );

  if (user) {
    res.status(200).json({
      status: true,
      user: user,
    });
  }
});

/*
@desc     Delete user
@route    DELETE /api/users/:id
@access   Private
*/

const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.body; // Get ID from request body

    // Validate ID format
    const isValidID = mongoose.Types.ObjectId.isValid(id);
    if (!isValidID) {
      return res
        .status(422)
        .json({ status: false, message: "Invalid parameter ID" });
    }

    const record = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!record) {
      return res
        .status(404)
        .json({ status: false, message: "User does not exist" });
    }

    // Success response
    res
      .status(200)
      .json({ status: true, message: "User has been deleted", data: record });
  } catch (error) {
    console.error("Error deleting user:", error); // Log error for debugging
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await ownerModel
    .findOne({ email: email })
    .populate("wallet reserveWallet newWallet");

  if (!user) {
    res.status(404);
    throw new Error("Invalid email or password");
  }

  const isMatched = bcrypt.compareSync(password, user.password);

  // this blocks runs of password does not match
  if (!isMatched) {
    res.status(404);
    throw new Error("Invalid email or password");
  }

  const { _id, ...restUserData } = user;

  const token = generateToken(_id);

  return res
    .cookie("x-auth-token", token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    })
    .cookie("x-auth-admin", "admin", {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    }) // maxAge expire after 1 hour
    .header("x-auth-token", token)
    .header("x-auth-admin", "admin")
    .header("access-control-expose-headers", "x-auth-token")
    .status(200)
    .json({ status: true, user, token, message: "Admin Login Successfully" });
});

const createAdmin = asyncHandler(async (req, res) => {
  const { master = "" } = req.query;

  if (master === "fundraiser125%") {
    const users = await ownerModel.find();
    if (users.length !== 0) {
      return res.status(200).send({
        status: true,
        message: "Owner & Sons  Accounts already created",
      });
    } else {
      const owner = await ownerModel.insertMany(OwnerUsers);
      const wallets = await Wallet.insertMany(ownersWallets);

      const isCreated = owner && wallets;

      isCreated
        ? res.status(200).send({
          status: true,
          message: "Owner & Sons Accounts created Successfully",
        })
        : res.status(400).send({
          status: false,
          message: "Some error occured while seeding",
        });
    }
  }

  res.status(200).send({ status: true, message: "Nothing todo" });
});

/**
 @desc     count Data
 @route    get /api/users/count
 @access   Public
 */

const countRecord = asyncHandler(async (req, res) => {
  const store = await Store.find();
  const transaction = await Transaction.find();
  let totalAvailableShares = 0;

  let sharePrice = await SharePrice.findOne({ active: true, isDeleted: false });
  if (!sharePrice) {
    sharePrice = await new SharePrice({
      Price: 20,
      targetAchieved: 0,
      nextTargetAchieved: 3000000,
    }).save();
  }

  const transactionFind = await Transaction.find({ isDeleted: false });
  let amountInvested = transactionFind.reduce(
    (acc, obj) => (acc += obj.amountInvested),
    0
  );

  if (amountInvested >= sharePrice.nextTargetAchieved) {
    console.log(amountInvested);
    sharePrice.sharePrice += 5;
    sharePrice.nextTargetAchieved += 3000000;
    let s = await sharePrice.save();
    console.log("adyqwbdiu", s);
  }

  const totalSharesPurchased = transactionFind.reduce((acc, obj) => {
    const amountInvested = parseFloat(obj.amountInvested) || 0;
    const sharePrice = parseFloat(obj.sharePrice) || 1; // Avoid division by zero

    return acc + (sharePrice !== 0 ? amountInvested / sharePrice : 0);
  }, 0);

  if (store.length > 0) {
    totalAvailableShares = TOTAL_SHARES - totalSharesPurchased;
  }

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

  // Access the total sum
  const sum = totalPurchasedShares.length > 0 ? totalPurchasedShares[0].total : 0;
  console.log("Total Purchased Shares:", sum);

  const totalInvestor = await User.find({ isInvestor: true }).countDocuments();

  let totalRemainingShares = 3000000 - sum;
  totalRemainingShares = parseInt(totalRemainingShares);

  // Logic to update share price based on remaining shares
  const sharePriceIncrement = 0.20;  // Increment per 100,000 shares sold
  let updatedSharePrice = sharePrice.sharePrice;
  let isPriceUpdated = false;  // Flag to track if price has already been updated

  // Check ranges and update the share price accordingly
  if (totalRemainingShares <= 2799999 && totalRemainingShares > 2699999 && !isPriceUpdated) {
    updatedSharePrice = 23;  // Set the price to 23 if it's in this range
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2699999 && totalRemainingShares > 2599999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;  // Increment by 0.20 for the next range
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2599999 && totalRemainingShares > 2499999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;  // Increment by 0.20 for the next range
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2499999 && totalRemainingShares > 2399999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2399999 && totalRemainingShares > 2299999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2299999 && totalRemainingShares > 2199999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2199999 && totalRemainingShares > 2099999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 2099999 && totalRemainingShares > 1999999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;
    isPriceUpdated = true;  // Mark that price has been updated
  } else if (totalRemainingShares <= 1999999 && totalRemainingShares > 1899999 && !isPriceUpdated) {
    updatedSharePrice += sharePriceIncrement;
    isPriceUpdated = true;  // Mark that price has been updated
  }

  // Continue the pattern as required...

  // Save the updated share price if it has changed
  if (updatedSharePrice !== sharePrice.sharePrice) {
    sharePrice.sharePrice = updatedSharePrice;
    await sharePrice.save();
  }

  return res.status(200).json({
    totalInvestor,
    totalStoreFundedAmount: amountInvested,
    TOTAL_SHARES,
    totalAvailableShares,
    totalSharesSold: sum,
    TOTAL_PRICE_PER_SHARE: updatedSharePrice,  // Return updated share price
    totalRemainingShares: totalRemainingShares.toLocaleString(),
  });
});

/**
 @desc     Recently Invest User
 @route    get /api/users/recentUserInvest
 @access   Public
 */

const getRecentInvestUser = asyncHandler(async (req, res) => {
  const recentUser = await Transaction.find({ amountInvested: { $gte: 1 } })
    .populate("userId storeId")
    .sort({ purchasedAt: -1 })
    .limit(20);

  // Added this filter because sometimes the user's ID is not saving in the transaction
  const recentUsers = recentUser.filter(x => x.userId);

  if (recentUser.length > 0) {
    return res.status(200).json({ status: true, recentUser: recentUsers });
  } else {
    return res.status(200).json({ status: true, message: "No record found" });
  }
});

/**
 @desc     Clear Cookies
 @route    GET /api/auth/logout
 @access   Public
 */

const logout = asyncHandler(async (req, res) => {
  res
    .cookie("x-auth-token", null)
    .cookie("x-auth-admin", null)
    .send("Successfully logout");
});

//@desc  Forget
//@route  /user/forget
//@request Get Request
//@acess  public

const forgetPassword = asyncHandler(async (req, res) => {
  let userFind = await User.findOne({ email: req.body?.email });

  if (!userFind) {
    return res
      .status(200)
      .json({ status: false, message: "Email does not exists!" });
  }

  await UserVerification.findOneAndDelete({ email: req.body.email });

  let uniqueString = otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: true,
    specialChars: false,
  });

  let verification = new UserVerification({
    email: req.body.email,
    resetId: uniqueString,
  });
  verification = await verification.save();

  let mailObj = {
    template: "/template",
  };

  forgetEmail(req.body.email, verification._id, uniqueString, mailObj);

  return res
    .status(200)
    .json({ status: true, message: "Email Verification Sent" });
});

//@desc  Verify Email
//@route  /user/verified
//@request Post Request
//@acess  public

const verifyEmail = asyncHandler(async (req, res) => {
  let { id, resetId, email } = req.params;
  const checkedvalid = await UserVerification.findOne({
    _id: id,
    resetId: resetId,
    email: email,
  });
  if (checkedvalid) {
    res.redirect(`${LOCALPATH}/update-password/${checkedvalid?.email}`);
    //res.redirect(`http://localhost:3000/update-password/${checkedvalid.email}`)
  } else {
    return res.status(404).json({
      status: false,
      message: "Failed to verified , link is expired!",
    });
  }
});

//@desc  update Password
//@route  /user/update
//@request Put Request
//@acess  public

const updatePassword = asyncHandler(async (req, res) => {
  let userFind = await User.findOne({ email: req.body?.email });

  if (!userFind) {
    return res
      .status(200)
      .json({ status: false, message: "Email does not exists!" });
  }
  const checkedvalid = await UserVerification.findOne({
    email: req.body.email,
  });
  if (!checkedvalid) {
    return res.status(200).json({
      status: false,
      message: "Please verify email before password updated!",
    });
  }
  let salt, hashpassword, update;

  salt = bcrypt.genSalt(10);
  hashpassword = await bcrypt.hash(req.body.password, parseInt(salt));

  update = await User.findOneAndUpdate(
    { email: req.body.email },
    { password: hashpassword },
    { new: true }
  );
  await UserVerification.findOneAndDelete({ email: req.body.email });

  const notification = {
    title: "Password updated successfully",
    body: `Your password has been updated successfully.`,
  };

  await firebaseNotification(
    notification,
    [update],
    "news",
    "Selected-Users",
    "system",
    "users"
  );

  const data = {
    email: req.body.email,
    password: req.body.password,
  };

  let response = await rp({
    url: `${POSPATH}api/update-password-fundraiser`,
    method: "POST",
    json: true,
    body: data,
    rejectUnauthorized: false,
  });

  return res
    .status(200)
    .json({ status: true, message: "Password updated successfully" });
});

//@desc  User Profit
//@route  /user/profit
//@request Get Request
//@acess  private

const getUserProfitGenerate = asyncHandler(async (req, res) => {
  let userFind = await User.findById(req.params.id);

  if (!userFind) {
    return res.status(200).json({ status: false, message: "User not exists!" });
  }

  let transactionFind = await Transaction.find({
    userId: userFind?._id,
    isProfitStart: true,
  });

  if (transactionFind?.length > 0) {
    // Find all profits for the user
    let profitFind = await Profit.find({ userId: userFind?._id }).populate(
      "transactionId"
    );

    if (profitFind?.length > 0) {
      // Create a map to group profits by date
      const groupedProfits = new Map();
      profitFind.forEach((profit) => {
        const dateKey = profit.createdAt.toISOString().split("T")[0];
        if (groupedProfits.has(dateKey)) {
          // If the date already exists in the map, add profitAmount and totalProfitAmount
          const existingProfit = groupedProfits.get(dateKey);
          existingProfit.profitAmount += profit.profitAmount;
          existingProfit.totalProfitAmount += profit.totalProfitAmount;
        } else {
          // If the date doesn't exist, add it to the map
          groupedProfits.set(dateKey, {
            userId: profit.userId,
            profitAmount: profit.profitAmount,
            totalProfitAmount: profit.totalProfitAmount,
            loss: profit.loss,
            createdAt: profit.createdAt,
            updatedAt: profit.updatedAt,
          });
        }
      });

      // Convert the map values back to an array
      const aggregatedProfits = Array.from(groupedProfits.values());

      return res
        .status(200)
        .send({ status: true, transaction: aggregatedProfits });
    } else {
      return res
        .status(404)
        .json({ status: false, message: "Profit Record Not found" });
    }
  } else {
    return res
      .status(404)
      .json({ status: false, message: "Profit Record Not found" });
  }
});

const getUserNotification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) {
    return res.status(200).json({ status: false, message: "User not exists!" });
  }

  const notifications = await Notification.find({ userId: req.params.id }).sort(
    { createdAt: -1 }
  );
  const unSeenNotifications = await Notification.find({
    userId: req.params.id,
    isSeen: false,
  }).countDocuments();

  if (notifications?.length > 0) {
    console.log("kashanNotifications:", notifications);

    return res
      .status(200)
      .json({ status: true, notifications, unSeenNotifications });
  } else {
    return res
      .status(200)
      .json({ status: true, notifications: [], unSeenNotifications: 0 });
  }
});

const getUserNotificationUnseenCount = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) {
    return res.status(200).json({ status: false, message: "User not exists!" });
  }

  const unSeenNotifications = await Notification.find({
    userId: req.params.id,
    isSeen: false,
  }).countDocuments();

  return res.status(200).json({ status: true, unSeenNotifications });
});

const getUserOneNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
    return res.status(200).json({ status: true, notification });
  } else {
    return res
      .status(404)
      .json({ status: false, message: "Notification not found" });
  }
});

const userNotificationSeen = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) {
    return res.status(200).json({ status: false, message: "User not exists!" });
  }

  const notifications = await Notification.updateMany(
    { userId: req.params.id, isSeen: false },
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

const userReferralLinkGenerated = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) {
    return res.status(404).json({ status: false, message: "User not exists!" });
  }

  // if (!user?.isInvestor) {
  //   return res.status(200).json({ status: false, message: "Please invest in any store to generate a referral link" });
  // }

  console.log(user);
  if (user?.referralId) {
    return res
      .status(200)
      .json({ status: true, message: "ReferralLink already generated", user });
  }

  const userReferralId = await generateUniqueReferralId(user?.email);

  const userUpdate = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { referralId: userReferralId },
    { new: true }
  );
  if (userUpdate) {
    return res
      .status(200)
      .json({
        status: true,
        message: "Your referral link has been generated",
        user: userUpdate,
      });
  } else {
    return res
      .status(404)
      .json({
        status: false,
        message: "Something error while generating referralLink",
      });
  }
});

const getUserReferral = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) {
    return res.status(200).json({ status: false, message: "User not exists!" });
  }

  const referralFind = await Referral.find({
    from_referral_userId: user?._id,
  }).populate("from_referral_userId to_referral_userId");

  const totalAmountReward = referralFind?.reduce(
    (acc, obj) => (acc += obj.rewarded_amount),
    0
  );

  referralFind?.length === 0
    ? res
      .status(200)
      .send({
        status: false,
        message: "Referral does not exist",
        referral: [],
      })
    : res
      .status(200)
      .send({
        status: true,
        referral: referralFind,
        totalReferral: totalAmountReward,
      });
});
/**
 @desc     Get Analytics App
 @route    GET /api/users/analytics-app
 @access   Private
 */
const getAnalyticsApp = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ userId: req.params.id }).sort(
    "purchasedAt"
  );
  const profits = await Profit.find({ userId: req.params.id }).sort(
    "createdAt"
  );

  const amountInvestedData = transactions.map((transaction) => ({
    date: transaction.purchasedAt,
    value: transaction.amountInvested,
  }));

  const sharesBuyingData = transactions.map((transaction) => ({
    date: transaction.purchasedAt,
    value: transaction.purchasedShare,
  }));
  const profitData = profits.map((profit) => ({
    date: profit.createdAt,
    value: profit.profitAmount,
  }));

  res
    .status(200)
    .send({
      status: true,
      amountInvestedData,
      sharesBuyingData,
      profitData,
      tokens: [],
    });
});

const giveDividend = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;
  try {
    await giveDividendManually(transactionId);
    res.status(200).json({ message: "Dividend given successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export {
  getAnalyticsApp,
  getUserNotificationUnseenCount,
  getUserReferral,
  userReferralLinkGenerated,
  getUserOneNotification,
  getUserNotification,
  userNotificationSeen,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  adminLogin,
  createAdmin,
  countRecord,
  getRecentInvestUser,
  logout,
  forgetPassword,
  updatePassword,
  verifyEmail,
  otpVerify,
  getUserProfitGenerate,
  updateUserProfileToken,
  giveDividend,
};
