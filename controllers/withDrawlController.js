import asyncHandler from "express-async-handler";
import Wallet from "#models/walletModel";
import WithDrawl from "#models/withdrawl";
import WithDrawlAdmin from "#models/withdrawlAdmin";
import ownerModel from "#models/ownerModel";
import withDrawReceipt from "#utils/withDrawReceipt";

import { PATH, TESTPATH } from "#constants/user";
import User from "#models/userModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import { firebaseAdminNotification } from "#utils/firebaseAdminNotification";

/**
 @desc     create Withdawl
 @route    get /api/withdawl
 @access   Private
 */

const createWithdrawl = asyncHandler(async (req, res) => {
  if (req.body.type === "investor") {
    const userFind = await User.findById(req.body.userId);

    if (!userFind)
      return res.status(200).json({
        status: false,
        message: "User record not found",
      });

    // if (userFind?.isKYCCompleted !== "completed") {
    //   return res.status(200).json({
    //     status: false,
    //     message:
    //       "Your status of withdrawl is pending , Plz submit all the required documents and KYC",
    //   });
    // }

    const userWallet = await Wallet.findById(req.body.walletId);

    if (!userWallet)
      return res.status(200).json({
        status: false,
        message: "Wallet record not found",
      });

    if (req.body.amount < 0)
      return res.status(200).json({
        status: false,
        message: "Request withdrawl amount must be greater than 500",
      });
    if ((userWallet?.dividend || 0) < req.body.amount) {
      return res
        .status(200)
        .json({ status: false, message: "You do not have sufficient dividends to withdraw" });
    } else {
      let updateWallet;
      if (req.body.type === "investor") {
        const amount = Number(req.body.amount);

        updateWallet = await Wallet.findOneAndUpdate(
          { userId: req.body.userId, _id: req.body.walletId },
          { $inc: {dividend: -amount } },
          { new: true }
        );
        const withDrawlCreated = await new WithDrawl({
          ...req.body,
          document: req.file ? req.file.path : null, // Save the file path in the database
        }).save();
        if (withDrawlCreated) {
          const notification = {
            title: `Your withdrawal request has been sent successfully`,
            body: `Dear Java Times Cafe Investor, your withdrawal request of ${req.body.amount} Mexican Pesos has been sent successfully. Please wait for approval. We will notify you when approved!`,
          };

          await firebaseNotification(
            notification,
            [userFind],
            "news",
            "Selected-Users",
            "system",
            "users"
          );

          await firebaseAdminNotification(
            {
              title: "New withdrawal request has arrived",
              body: `A new withdrawal request with an amount of ${req.body.amount} Mexican Pesos has been submitted by user ${userFind?.name} and requires the attention of the admin team. Please review it as soon as possible.`,
            },
            "news",
            "Selected-Users",
            "system",
            "admin"
          );

          return res.status(201).json({
            status: true,
            message: "Withdrawl Request Sent Successfully",
            wallet: updateWallet,
          });
        }
      }
    }
  } else {
    await Wallet.findOneAndUpdate(
      { type: req.body.type, _id: req.body.walletId },
      { $inc: { dividend: -req.body.amount } },
      { new: true }
    );
    const withDrawlCreated = await new WithDrawl(req.body).save();
    if (withDrawlCreated) {
      const admin = await ownerModel
        .findOne({ type: req.body.type })
        .populate("wallet");
      if (admin) {
        return res.status(201).json({
          status: true,
          message: "Withdrawl Request Sent Successfully",
          wallet: admin,
        });
      }
    }
  }
});

/**
 @desc     create Withdawl Admin
 @route    get /api/withdawl-admin
 @access   Private
 */

const createWithdrawlAdmin = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ type: req.body.type });

  if (!wallet)
    return res.status(200).json({
      status: false,
      message: "Wallet record not found",
    });

  if (req.body.amount <= 0)
    return res.status(200).json({
      status: false,
      message: "Request withdrawl amount must be greater than 0",
    });

  if ((wallet?.dividend || 0) < req.body.amount) {
    return res
      .status(200)
      .json({ status: false, message: "You do not have sufficient dividends to withdraw" });
  }

  const updateWallet = await Wallet.findOneAndUpdate(
    { type: req.body.type },
    { $inc: { dividend: -req.body.amount } },
    { new: true }
  );
  const withDrawlCreated = await new WithDrawlAdmin(req.body).save();
  if (withDrawlCreated) {
    const user = await ownerModel
      .findOne({ type: "owner" })
      .populate("wallet reserveWallet newWallet");

    const notification = {
      title: `Dear Java Times Cafe founder (Antonio Leite), you have successfully withdrawal ${req.body.amount} Mexican Pesos`,
      body: `Congratulations, your request for withdrawing ${req.body.amount} Mexican Pesos has been processed successfully.`,
    };

    await firebaseAdminNotification(
      notification,
      "news",
      "Selected-Users",
      "system",
      "admin"
    );

    return res.status(201).json({
      status: true,
      message: "Withdrawl Request Admin Created Successfully",
      wallet: user,
    });
  }
});

/**
 @desc     Get User WithDrawl
 @route    GET /api/user/withdrawl
 @access   Private
 */
const getAdminWithDrawl = asyncHandler(async (req, res) => {
  const withDrawl = await WithDrawlAdmin.find();

  withDrawl.length === 0
    ? res.status(200).send({
        status: false,
        message: "Withdrawl does not exist",
        withDrawl: [],
      })
    : res.status(200).send({ status: true, withDrawl });
});

/**
 @desc     Get All WithDrawl
 @route    GET /api/withdrawl
 @access   Private
 */
const getAllWithDrawl = asyncHandler(async (req, res) => {
  const withDrawl = await WithDrawl.find().populate("userId adminId");
  withDrawl.length === 0
    ? res.status(200).send({
        status: false,
        message: "Withdrawl does not exist",
        withDrawl: [],
      })
    : res.status(200).send({ status: true, withDrawl });
});

/**
 @desc     Get User WithDrawl
 @route    GET /api/user/withdrawl
 @access   Private
 */
const getUserWithDrawl = asyncHandler(async (req, res) => {
  const withDrawl = await WithDrawl.find({ userId: req.params.id });

  withDrawl.length === 0
    ? res.status(200).send({
        status: false,
        message: "Withdrawl does not exist",
        withDrawl: [],
      })
    : res.status(200).send({ status: true, withDrawl });
});

/**
 @desc     Cancel With Drawl
 @route    PUT /api/withdrawl/cancel/:id
 @access   Private
 */
const cancelWithdrawl = asyncHandler(async (req, res) => {
  const getWithDrawl = await WithDrawl.findOne({
    _id: req.params.id,
  });

  if (getWithDrawl?.isCancel) {
    return res?.status(200).send({
      status: true,
      message: `Withdrawl request cancelled already`,
    });
  }

  if (getWithDrawl?.status === "approved") {
    return res?.status(200).send({
      status: true,
      message: `Withdrawl request approved already`,
    });
  }

  const withDrawl = await WithDrawl.findByIdAndUpdate(
    req.params.id,
    {
      isCancel: true,
      status: "cancelled",
    },
    { new: true }
  );

  if (withDrawl) {
    if (withDrawl?.type === "investor") {
      const updateWallet = await Wallet.findByIdAndUpdate(
        { _id: withDrawl?.walletId },
        { $inc: { dividend: withDrawl?.amount } },
        { new: true }
      );

      const notification = {
        title: `Your withdrawal request of ${withDrawl?.amount} Mexican Pesos to JTC has been cancelled successfully`,
        body: `Dear Java Times Cafe Investor, your withdrawal request has been cancelled successfully!`,
      };

      const userFind = await User.findOne({ wallet: withDrawl?.walletId });

      await firebaseNotification(
        notification,
        [userFind],
        "news",
        "Selected-Users",
        "system",
        "users"
      );

      return res?.status(200).send({
        status: true,
        message: `Withdrawl request cancelled successfully`,
        wallet: updateWallet,
      });
    } else {
      await Wallet.findByIdAndUpdate(
        { _id: withDrawl?.walletId },
        { $inc: { dividend: withDrawl?.amount } },
        { new: true }
      );
      const admin = await ownerModel
        .findOne({ type: withDrawl?.type })
        .populate("wallet");

      return res?.status(200).send({
        status: true,
        message: `Withdrawl request cancelled successfully`,
        wallet: admin,
      });
    }
  } else {
    res?.status(200).send({
      status: false,
      message: `Withdrawl request not found`,
    });
  }
});

/**
 @desc     Cancel With Drawl
 @route    PUT /api/withdrawl/cancel/:id
 @access   Private
 */
const approveWithdrawl = asyncHandler(async (req, res) => {
  const getWithDrawl = await WithDrawl.findOne({
    _id: req.body.withDrawId,
  });

  if (getWithDrawl?.isCancel) {
    return res?.status(200).send({
      status: true,
      message: `Withdrawl request cancelled by user`,
    });
  }
  const user = await User.findOne({ _id: getWithDrawl?.userId });
  console.log(getWithDrawl);

  if (!user) {
    return res?.status(404).send({
      status: false,
      message: `User record not found`,
    });
  }
  const path = await withDrawReceipt(getWithDrawl, user);

  if (path) {
    const cleanedPath = path.replace("./", "");
    const withDrawl = await WithDrawl.findByIdAndUpdate(
      req.body.withDrawId,
      {
        status: "approved",
        transactionId: req.body.transactionId,
        file: `${PATH}${cleanedPath}`,
      },
      { new: true }
    );

    if (withDrawl) {
      const notification = {
        title: `Your withdrawal request of ${withDrawl?.amount} Mexican Pesos to JTC has been approved successfully`,
        body: `Dear Java Times Cafe Investor, your withdrawal request has been approved successfully!`,
      };

      const userFind = await User.findOne({ wallet: withDrawl?.walletId });

      await firebaseNotification(
        notification,
        [userFind],
        "news",
        "Selected-Users",
        "system",
        "users"
      );

      return res?.status(200).send({
        status: true,
        message: `Withdrawl request approved successfully`,
      });
    } else {
      res?.status(200).send({
        status: false,
        message: `Withdrawl record not found`,
      });
    }
  } else {
    res?.status(200).send({
      status: false,
      message: `Something error while approving withDrawl`,
    });
  }
});

export {
  createWithdrawl,
  getAllWithDrawl,
  getUserWithDrawl,
  cancelWithdrawl,
  approveWithdrawl,
  createWithdrawlAdmin,
  getAdminWithDrawl,
};
