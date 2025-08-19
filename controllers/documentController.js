import asyncHandler from "express-async-handler";
import User from "#models/userModel";
import Document from "#models/documentModel";
import {
  DocumentType,
  PATH,
  TESTPATH,
  DOCADMINPATHLOCAL,
  DOCADMINPATHLIVE,
  DOCUSERPATHLOCAL,
  DOCUSERPATHLIVE,
} from "#constants/user";
import { sockets } from "../server.js";
import KYC from "#models/kycModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import { firebaseAdminNotification } from "#utils/firebaseAdminNotification";
import Referral from "#models/referralModel";
import Transaction from "#models/transactionModel";
import Wallet from "#models/walletModel";
import SharePrice from "#models/sharePriceModel";

/**
 @desc     uploadDocument
 @route    get /api/user/documentUpload
 @access   Private
 */

const uploadDocument = asyncHandler(async (req, res) => {
  if (req.uploadError) {
    res.status(400);
    throw new Error(req.uploadError);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res
      .status(404)
      .send({ status: false, message: "User record not found" });
  }

  const documenExists = await Document.findOne({
    userId: req.params?.id,
    type: req.body?.type,
    status: "pending",
  });
  if (documenExists?.document) {
    return res.status(400).send({
      status: false,
      message: "The status of document verification is pending",
    });
  }

  if (DocumentType?.includes(req.body?.type)) {
    let image = req.file?.filename;
    console.log(image);
    if (image) {
      req.body.document = image ? `${PATH}upload/${image}` : "";

      let document;
      const uploadFind = await Document.findOne({
        userId: req.params?.id,
        type: req.body?.type,
        status: "rejected",
      });
      if (uploadFind) {
        document = await Document.findOneAndUpdate(
          { userId: req.params?.id, type: req.body?.type },
          { document: req.body?.document, status: "pending" },
          { new: true }
        );
      } else {
        document = await new Document({
          userId: req.params?.id,
          type: req.body?.type,
          document: req.body?.document,
        }).save();
      }

      if (document) {
        const notification = {
          title: `Document ${req.body?.type} Review in Progress`,
          body: `Your document ${req.body?.type} is currently under review. We will inform you shortly. Thank you for your patience.`,
        };

        await firebaseNotification(
          notification,
          [user],
          "news",
          "Selected-Users",
          "system",
          "users"
        );
        await firebaseAdminNotification(
          {
            title: "New Document Uploaded for Review",
            body: `A new document, "${req.body?.type}," has been uploaded by user ${user?.name} and requires the admin team's attention. Please review it as soon as possible. ${DOCADMINPATHLIVE}${user?._id}`,
          },
          "news",
          "Selected-Users",
          "system",
          "admin"
        );

        return res.status(200).send({
          status: true,
          message: "Document uploaded successfully",
          document,
        });
      }
    } else {
      return res
        .status(400)
        .send({ status: false, message: "Plz upload document" });
    }
  } else {
    return res
      .status(400)
      .send({ status: false, message: "Invalid document type" });
  }
});

const getUploadDocument = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res
      .status(404)
      .send({ status: false, message: "User record not found" });
  }
  const documents = await Document.find({ userId: req.params?.id });

  const pending = await Document.find({
    userId: req.params?.id,
    status: "pending",
  }).countDocuments();

  const approved = await Document.find({
    userId: req.params?.id,
    status: "approved",
  }).countDocuments();

  const rejected = await Document.find({
    userId: req.params?.id,
    status: "rejected",
  }).countDocuments();

  documents?.length === 0
    ? res.status(200).send({
        status: true,
        message: "Document does not exist",
        documents: [],
        analytics: { approved, pending, rejected },
      })
    : res.status(200).send({
        status: true,
        documents,
        analytics: { approved, pending, rejected },
      });
});

const verifiedDocument = asyncHandler(async (req, res) => {
  const documents = await Document.findById(req.params.id);
  const userKyc = await KYC.findOne({ userId: documents?.userId });

  if (!documents) {
    return res
      .status(404)
      .send({ status: false, message: "Document record not found" });
  }

  if (documents?.status === "approved") {
    return res
      .status(200)
      .send({ status: false, message: "Document already verified" });
  }
  let sharePrice = await SharePrice.findOne({ active: true, isDeleted: false });
  if (!sharePrice) {
    sharePrice = await new SharePrice({
      sharePrice: 20,
      targetAchieved: 0,
      nextTargetAchieved: 3000000,
    }).save();
  }

  let updatedDocument;
  if (
    (documents?.status === "pending" || documents?.status === "rejected") &&
    req.query.type
  ) {
    if (req.query.type === "approved") {
      updatedDocument = await Document.findByIdAndUpdate(
        req.params.id,
        { status: "approved" },
        { new: true }
      );
      const userData = await User.findByIdAndUpdate(
        documents?.userId,
        { $inc: { profileCompleted: 14.28428571428571 } },
        { new: true }
      );
      sockets.sendVerificationSuccess(userData);
      const userDocument = await Document.find({
        userId: documents?.userId,
        status: "approved",
      }).countDocuments();

      if (userDocument === 9) {
        const updateUser = await User.findByIdAndUpdate(
          documents?.userId,
          { isKYCCompleted: "completed" },
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
                $inc: {
                  shares: reward,
                  amount: reward * sharePrice?.sharePrice,
                },
              }
            );

            // Minus admin new Wallet shares
            await Wallet.findOneAndUpdate(
              { type: "owner-new" },
              {
                $inc: { shares: -reward },
              }
            );

            const lastTransactionFind = await Transaction.findOne({
              userId: referralFind?.to_referral_userId,
            }).sort({ createdAt: -1 });

            if (lastTransactionFind) {
              await new Transaction({
                storeId: lastTransactionFind?.storeId,
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
              console.log("Transaction not find");
            }
          }
        }
      }

      if (updatedDocument) {
        const user = await User.findOne({
          _id: documents?.userId,
          isDeleted: false,
        });

        const notification = {
          title: `Document ${documents?.type} is approved`,
          body: `Your document ${documents?.type} has been approved. Thank you for your patience.`,
        };

        await firebaseNotification(
          notification,
          [user],
          "news",
          "Selected-Users",
          "system",
          "users"
        );
        return res.status(200).send({
          status: true,
          message: "Document verified successfully",
          document: updatedDocument,
        });
      }
    } else if (req.query.type === "rejected") {
      updatedDocument = await Document.findByIdAndUpdate(
        req.params.id,
        { status: "rejected" },
        { new: true }
      );
      if (documents?.type == "contract") {
        await User.findByIdAndUpdate(
          documents?.userId,
          { isKYCCompleted: "progress" },
          { new: true }
        );

        await KYC.findOneAndUpdate(
          { userId: documents?.userId },
          { isContractSign: false, file: userKyc?.file_before_signature }
        );
      }

      if (updatedDocument) {
        if (documents?.type == "contract") {
          const user = await User.findOne({
            _id: documents?.userId,
            isDeleted: false,
          });

          const notification = {
            title: `Document ${documents?.type} has been rejected`,
            body: `Your ${documents?.type} document has been rejected. Please re-sign the electronic contract with a valid signature. Thank you for your patience.`,
          };

          await firebaseNotification(
            notification,
            [user],
            "news",
            "Selected-Users",
            "system",
            "users"
          );
        } else {
          const user = await User.findOne({
            _id: documents?.userId,
            isDeleted: false,
          });

          const notification = {
            title: `Document ${documents?.type} has been rejected`,
            body: `Your document ${documents?.type} has been rejected. Please upload it again. ${DOCUSERPATHLIVE} Thank you for your patience.`,
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

        return res.status(200).send({
          status: true,
          message: "Document rejected successfully",
          document: updatedDocument,
        });
      }
    } else {
      return res
        .status(404)
        .send({ status: false, message: "Invalid request type" });
    }
  } else {
    return res
      .status(400)
      .send({ status: false, message: "Invalid format of request" });
  }
});

export { uploadDocument, getUploadDocument, verifiedDocument };
