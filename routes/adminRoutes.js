import express from "express";
import { multerUpload, multerUploadInvestor } from "#utils/multer";
import { admin } from "#middlewares/admin.middleware";

import {
  transferShares,
  createBlog,
  getOneBlog,
  deleteBlog,
  updateBlog,
  getAllBlog,
  getDividend,
  getAllTransfer,
  enableBlog,
  disableBlog,
  getAllActiveBlog,
  createNewsFeet,
  getAllNewsFeet,
  getOneBlogByID,
  userAllDetails,
  adminInvestUser,
  contactUs,
  getAnalytics,
  getAllUsers,
  resetPasswordEmail,
  verifyUser,
  checkAccountBalance,
  checkTransactions,
  checkOrder,
  checkOrders,
  getAdminProfile,
  sendPushNotification,
  getAdminNotificationHistory,
  updateOwnerProfileToken,
  getAdminNotification,
  getSharePriceHistory,
  adminNotificationSeen,
  getAllUserReferral,
  createAnnualProgress,
  getAllAnnualProgress,
  deleteAnnualProgress,
  sendAnnualProgressToInvestor,
  approvedDocumentInvestor,
  contactUsJTC,
  transferJtcToken,
  getAllTokenTransfer,
  createOffer,
  getAllOffer,
  updateOffer,
  disableOffer,
  enableOffer,
  getOneOfferByID,
  deleteOffer,
  getActiveBlog,
} from "#controllers/adminController";
import authMiddleware from "#middlewares/auth.middleware";
import { verifiedDocument } from "#controllers/documentController";

const adminRoutes = express.Router();

adminRoutes
  .route("/offers")
  .get(getAllOffer)
  .post([multerUpload.single("image")], createOffer);

adminRoutes.put("/offers/enable/:id", [admin, authMiddleware], enableOffer);

adminRoutes.delete("/offers/delete/:id", [admin, authMiddleware], deleteOffer);

adminRoutes.put("/offers/disable/:id", [admin, authMiddleware], disableOffer);

adminRoutes.get("/offers/:id", getOneOfferByID);
adminRoutes.put(
  "/offers/:id",
  [admin, authMiddleware, multerUpload.single("image")],
  updateOffer
);

adminRoutes
  .route("/transfer_jtctokens")
  .get([admin, authMiddleware], getAllTokenTransfer)
  .post([admin, authMiddleware], transferJtcToken);

adminRoutes.route("/allUser").get(getAllUsers);

// adminRoutes.post("/transfer_shares",[admin,authMiddleware], transferShares);

adminRoutes
  .route("/transfer_shares")
  .get([admin, authMiddleware], getAllTransfer)
  .post([admin, authMiddleware], transferShares);

adminRoutes.get("/dividend", [admin, authMiddleware], getDividend);

adminRoutes.get("/blogs/active", [admin, authMiddleware], getAllActiveBlog);

adminRoutes.get("/blogs/active/all", getActiveBlog);

adminRoutes.get("/one-blogs/:id", getOneBlogByID);

adminRoutes.get("/userAllDetails/:id", userAllDetails);

adminRoutes.post("/contactUs", contactUs);
adminRoutes.post("/contactUsJTC", contactUsJTC);

adminRoutes.put("/blogs/enable/:id", [admin, authMiddleware], enableBlog);

adminRoutes.put("/blogs/disable/:id", [admin, authMiddleware], disableBlog);

adminRoutes.post("/invest/:id", [admin, authMiddleware], adminInvestUser);

adminRoutes
  .route("/news")
  .get([admin, authMiddleware], getAllNewsFeet)
  .post(createNewsFeet);

adminRoutes
  .route("/blogs")
  .get(getAllBlog)
  .post(
    multerUpload.fields([
      {
        name: "image",
        maxCount: 1,
      },
      {
        name: "authorImage",
        maxCount: 1,
      },
    ]),
    [admin, authMiddleware],
    createBlog
  )
  .delete([admin, authMiddleware], deleteBlog);

adminRoutes
  .route("/blogs/:id")
  .get(getOneBlog)
  .put(
    multerUpload.fields([
      {
        name: "image",
        maxCount: 1,
      },
      {
        name: "authorImage",
        maxCount: 1,
      },
    ]),
    [admin, authMiddleware],
    updateBlog
  );

adminRoutes.get("/verify/:id", [admin, authMiddleware], verifyUser);

adminRoutes.get("/verified/:id", verifyUser);

adminRoutes.get("/analyticStore", [admin, authMiddleware], getAnalytics);

adminRoutes.post("/reset-email", [admin, authMiddleware], resetPasswordEmail);

adminRoutes.get("/accountBalacnce", checkAccountBalance);

adminRoutes.get("/transactions", checkTransactions);

adminRoutes.get("/checkOrder", checkOrder);

adminRoutes.get("/checkOrders", checkOrders);

adminRoutes.put(
  "/verifiedDocument/:id",
  [admin, authMiddleware],
  verifiedDocument
);

adminRoutes.get("/profile/:id", [admin, authMiddleware], getAdminProfile);

adminRoutes.post(
  "/notification-send",
  [admin, authMiddleware, multerUpload.single("image")],
  sendPushNotification
);

adminRoutes.get(
  "/admin-notification",
  [admin, authMiddleware],
  getAdminNotificationHistory
);

adminRoutes.put(
  "/profile/notification/:id",
  [admin, authMiddleware],
  updateOwnerProfileToken
);

adminRoutes.get(
  "/notification/:id",
  [admin, authMiddleware],
  getAdminNotification
);
adminRoutes.post(
  "/notification-seen/:id",
  [admin, authMiddleware],
  adminNotificationSeen
);

adminRoutes.get(
  "/share-price-history",
  [admin, authMiddleware],
  getSharePriceHistory
);

adminRoutes.get("/referral", [admin, authMiddleware], getAllUserReferral);

adminRoutes
  .route("/annual-progress")
  .get(getAllAnnualProgress)
  .post(
    multerUploadInvestor.single("file"),
    [admin, authMiddleware],
    createAnnualProgress
  );

adminRoutes.post(
  "/send-annual-progress",
  [admin, authMiddleware],
  sendAnnualProgressToInvestor
);

adminRoutes.delete(
  "/annual-progress/:id",
  [admin, authMiddleware],
  deleteAnnualProgress
);

adminRoutes.post(
  "/user-document-approved/:id",
  [admin, authMiddleware],
  approvedDocumentInvestor
);

export default adminRoutes;
