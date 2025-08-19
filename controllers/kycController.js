import asyncHandler from "express-async-handler";
import Blog from "#models/blogModel";
import mongoose from "mongoose";
import User from "#models/userModel";
import { PATH, USERS_TYPES, TESTPATH, DOCADMINPATHLIVE } from "#constants/user";
import KYC from "#models/kycModel";
import fs from "fs";
import addSignatureToPdf from "#utils/addSignatureToPdf";
import addDetailsToPdf from "#utils/addDetailsToPdf";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import updateSharesToPdf from "#utils/updateSharesToPdf";
import Document from "#models/documentModel";
import Transaction from "#models/transactionModel";
import Wallet from "#models/walletModel";
import { firebaseAdminNotification } from "#utils/firebaseAdminNotification";
import { firebaseNotification } from "#utils/firebaseNotification";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPLOAD_PATH = join(__dirname, "../", "./upload");
///

/**
 @desc     create kyc
 @route    get /api/admin/kyc
 @access   Private
 */

const createKYC = asyncHandler(async (req, res) => {
  const user = await User.findById({ _id: req.body.userId });
  const userKyc = await KYC.findOne({ userId: req.body.userId });

  const userWallet = await Wallet.findOne({ userId: req.body.userId });

  if (!user) {
    return res
      .status(404)
      .send({ status: false, message: "User record not found" });
  }

  if (!req.body.isCertificate && !req.body.isAcceptTerms) {
    return res.status(400).json({
      status: false,
      message: "Accept terms and condition field is required",
    });
  }

  const transactionFind = await Transaction.find({
    userId: user?._id,
    isDeleted: false,
  });
  const amountInvested = transactionFind.reduce(
    (acc, obj) => (acc += obj.amountInvested),
    0
  );
  const path = await updateSharesToPdf(
    {
      amount: userWallet?.amount,
      shares: userWallet?.shares,
      amountInvested: amountInvested,
      totalTransactions: transactionFind?.length || "0",
    },
    req.body,
    user
  );

  if (path) {
    let kycCreated;

    if (userKyc) {
      const cleanedPath = path.replace("./", "");
      kycCreated = await KYC.findByIdAndUpdate(
        userKyc?._id,
        {
          file_before_signature: `${PATH}${cleanedPath}`,
          file: `${PATH}${cleanedPath}`,
        },
        { new: true }
      );
    } else {
      const cleanedPath = path.replace("./", "");
      kycCreated = await new KYC(req.body);
      kycCreated.file = `${PATH}${cleanedPath}`;
      kycCreated.file_before_signature = `${PATH}${cleanedPath}`;
      kycCreated.save();
    }

    if (kycCreated) {
      const userData = await User.findByIdAndUpdate(
        { _id: req.body.userId },
        { isKYCCompleted: "completed" },
        { new: true }
      );

      return res.status(201).json({
        status: true,
        message: "KYC completed successfully",
        kycCreated,
        user: userData,
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "Error while Sign the electronic contract",
      });
    }
  } else {
    return res.status(400).json({
      status: false,
      message: "Error while Sign the electronic contract",
    });
  }
});

const createKYCtest = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.body.id);

    if (!user) {
      return res.status(404).send({ status: false, message: "User not found" });
    }

    const userWallet = await Wallet.findOne({ userId: user._id });
    if (!userWallet) {
      console.log(`Wallet not found for user: ${user.email}`);
      return res
        .status(400)
        .json({ status: false, message: "Wallet not found" });
    }

    const transactionFind = await Transaction.find({
      userId: user._id,
      isDeleted: false,
    });

    const amountInvested = transactionFind.reduce(
      (acc, obj) => acc + obj.amountInvested,
      0
    );

    const seventyPercent = (amountInvested * 70) / 100;
    const thirtyPercent = (amountInvested * 30) / 100;

    const kyc = await KYC.findOne({ userId: user._id });

    let path;
    try {
      path = await updateSharesToPdf(
        {
          amount: userWallet?.amount,
          shares: userWallet?.shares,
          amountInvested,
          seventyPercent,
          thirtyPercent,
          totalTransactions: transactionFind.length || 0,
        },
        kyc,
        user
      );
    } catch (error) {
      console.error(
        "Error in updateSharesToPdf for user",
        user.email,
        error.message
      );
      return res
        .status(400)
        .json({ status: false, message: "PDF generation failed" });
    }

    if (!path) {
      console.error(
        `Error while signing the electronic contract for user: ${user.email}`
      );
      return res.status(400).json({ status: false, message: "Signing failed" });
    }

    const cleanedPath = path.replace("./", "");

    try {
      const kycCreated = new KYC({
        ...req.body,
        userId: user._id,
        file: `${PATH}${cleanedPath}`,
        file_before_signature: `${PATH}${cleanedPath}`,
      });

      await kycCreated.save();

      await User.findByIdAndUpdate(
        user._id,
        { isKYCCompleted: "completed" },
        { new: true }
      );

      console.log(`KYC completed successfully for user: ${user.email}`);
    } catch (error) {
      console.error(
        "Error while saving KYC or updating user:",
        user.email,
        error.message
      );
      return res
        .status(500)
        .json({ status: false, message: "Error saving KYC" });
    }

    return res.status(200).json({
      status: true,
      message: "KYC processing completed for the user",
    });
  } catch (error) {
    console.error("Unexpected error in createKYCtest:", error.message);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
const createnewKYCtest = asyncHandler(async (req, res) => {
  try {
    // Step 1: Fetch all non-deleted transactions
    const transactions = await Transaction.find({ isDeleted: false });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ status: false, message: 'No transactions found' });
    }

    for (const txn of transactions) {
      const user = await User.findById(txn.userId);
      if (!user) {
        console.log(`User not found for transaction: ${txn._id}`);
        continue;
      }

      try {
        // Generate the PDF
        const path = await updateSharesToPdfForCron(
          {
            shares: txn?.purchasedShare,
            amountInvested: txn?.amountInvested,
          },
          await KYC.findOne({ userId: user._id }),
          user,
          txn?.createdAt 
        );

        if (!path) {
          console.log(`PDF generation failed for user ${user.email}, txn ${txn._id}`);
          continue;
        }

        const cleanedPath = path.replace('./', '');

        try {
          // Save KYC document and update user
       const kycCreated = new KYC({
        ...req.body,
        userId: user._id,
        file: `${PATH}${cleanedPath}`,
        file_before_signature: `${PATH}${cleanedPath}`,
          transactionId: txn?._id,
      });

          await kycCreated.save();

          await User.findByIdAndUpdate(
            user._id,
            { isKYCCompleted: 'completed' },
            { new: true }
          );

          console.log(`KYC saved successfully for user: ${user.email}, txn: ${txn._id}`);
        } catch (error) {
          console.error(
            `Error while saving KYC or updating user for txn ${txn._id}:`,
            user.email,
            error.message
          );
          continue; // Skip to next transaction
        }
      } catch (error) {
        console.error(`Error in updateSharesToPdf for txn ${txn._id}:`, error.message);
        continue;
      }
    }

    return res.status(200).json({
      status: true,
      message: 'KYC processing completed for all transactions',
    });
  } catch (error) {
    console.error('Unexpected error in createnewKYCtest:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

const deleteDuplicateKYC = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({}, '_id'); // Get all user IDs

    for (const user of users) {
      // Get all KYC records for a user, oldest first
      const kycs = await KYC.find({ userId: user._id }).sort({ createdAt: 1 });

      if (kycs.length > 1) {
        // Keep the oldest one, delete the rest
        const duplicateKycIds = kycs.slice(1).map(k => k._id);
        await KYC.deleteMany({ _id: { $in: duplicateKycIds } });
      }
    }

    return res.status(200).json({
      status: true,
      message: "Duplicate KYC records deleted successfully. Oldest record retained for each user.",
    });
  } catch (error) {
    console.error("Error deleting duplicate KYC records:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting KYC records.",
      error: error.message,
    });
  }
});
const deleteFirstKYCRecord = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({}, '_id'); // Get all user IDs

    for (const user of users) {
      // Get all KYC records for a user, oldest first
      const kycs = await KYC.find({ userId: user._id }).sort({ createdAt: 1 });

      if (kycs.length > 1) {
        // Delete only the first (oldest) record
        const oldestKycId = kycs[0]._id;
        await KYC.deleteOne({ _id: oldestKycId });
      }
    }

    return res.status(200).json({
      status: true,
      message: "Oldest KYC record deleted successfully for users with multiple entries.",
    });
  } catch (error) {
    console.error("Error deleting oldest KYC records:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting the oldest KYC record.",
      error: error.message,
    });
  }
});




const updateKYCPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById({ _id: id });
  const userKyc = await KYC.findOne({ userId: id }).populate("userId");

  if (userKyc?.isContractSign) {
    return res
      .status(200)
      .send({
        status: false,
        message: "Already sign the electronic signature",
      });
  }

  if (req.body.image == "null") {
    return res
      .status(400)
      .send({
        status: false,
        message: "Plz capture or generate a signature first!",
      });
  }
  // to declare some path to store your converted image
  var matches = req.body.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),
    response = {};

  response.type = matches[1];
  response.data = new Buffer.from(matches[2], "base64");
  let decodedImg = response;
  let imageBuffer = decodedImg.data;

  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 1000);
  const imageName = `image-${timestamp}-${randomValue}.png`;

  fs.writeFileSync("./upload/" + imageName, imageBuffer, "utf8");

  if (!user) {
    return res
      .status(404)
      .send({ status: false, message: "User record not found" });
  }

  if (userKyc) {
    if (!imageName) {
      return res
        .status(200)
        .json({
          status: false,
          message: "Please sign the electronic signature first",
        });
    }

    const pdfPath = await addSignatureToPdf(imageName, userKyc);

    console.log(pdfPath);
    if (pdfPath) {
      console.log(pdfPath, "pdfPath");
      const cleanedPath = pdfPath.replace("./", "");
      let kycData = await KYC.findOneAndUpdate(
        { userId: id },
        {
          isContractSign: true,
          file_before_signature: `${PATH}${cleanedPath}`,
          signature: `${PATH}upload/${imageName}`,
        },
        { new: true }
      );
      const userData = await User.findByIdAndUpdate(
        id,
        { isKYCCompleted: "completed" },
        { new: true }
      );

      const documentContract = await Document.findOne({
        userId: id,
        type: "contract",
      });

      if (documentContract) {
        await Document.findOneAndUpdate(
          { userId: id, type: "contract" },
          { document: userKyc?.file, status: "pending" }
        );
      } else {
        await new Document({
          userId: id,
          type: "contract",
          document: userKyc?.file,
        }).save();
      }

      const notification = {
        title: `Document signature Review in Progress`,
        body: `Dear Investor ${userData?.name}, Your document signature is currently under review. We will inform you shortly. Thank you for your patience.`,
      };

      await firebaseNotification(
        notification,
        [userData],
        "news",
        "Selected-Users",
        "system",
        "users"
      );

      await firebaseAdminNotification(
        {
          title: "New Document Uploaded for Review",
          body: `A new document, "contract signature," has been uploaded by user ${userData?.name} and requires the admin team's attention. Please review it as soon as possible. ${DOCADMINPATHLIVE}${userData?._id}`,
        },
        "news",
        "Selected-Users",
        "system",
        "admin"
      );

      return res.status(201).json({
        status: true,
        message:
          "Successfully sign the electronic signature investor contract.",
        user: userData,
        kyc: kycData,
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "Error while Sign the electronic contract",
      });
    }
  } else {
    return res.status(404).json({
      status: false,
      message: "KYC not found",
    });
  }
});

/*
@desc     Get One Blog By ID
@route    GET /api/admin/one-blog/:id
@access   Public
*/
const getUserKYC = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const kyc = await KYC.find({ userId: id }).sort({ createdAt: -1 });

  if (kyc.length > 0) {
    return res.status(200).json({
      status: true,
      kyc,
    });
  } else {
    return res.status(404).json({
      status: false,
      message: "No KYC records found for this user ID",
    });
  }
});

const getAllKYCFiles = asyncHandler(async (req, res) => {
  const kycFiles = await KYC.find({}, "file");
  //  return kycFiles;
  if (kycFiles.length > 0) {
    return res.status(200).json({
      status: true,
      files: kycFiles,
    });
  } else {
    return res.status(404).json({
      status: false,
      message: "No KYC records found",
    });
  }
});
const updateUsersWithKYC = asyncHandler(async (req, res) => {
  try {

    console.log('kaashaaan');
    // Step 1: Get all user IDs
    const users = await User.find({}, '_id');
    const userIds = users.map(user => user._id);

    // Step 2: Find user IDs that exist in KYC collection
    const kycs = await KYC.find({ userId: { $in: userIds } }, 'userId');
    const kycUserIds = kycs.map(kyc => kyc.userId);

    // Step 3: Update those users
    const result = await User.updateMany(
      { _id: { $in: kycUserIds } },
      { $set: { isKYCCompleted: 'completed' } }
    );

    return res.status(200).json({
      status: true,
      message: "Users with KYC updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating users with KYC:", error);
    return res.status(500).json({
      status: false,
      message: "Server error while updating KYC status",
    });
  }
});


export { createKYC, updateKYCPDF, getUserKYC, createKYCtest,createnewKYCtest,deleteDuplicateKYC,deleteFirstKYCRecord, getAllKYCFiles,updateUsersWithKYC };
