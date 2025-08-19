import express from 'express';
import {
    adminLogin,
    loginUser,
    createAdmin,
    deleteUser,
    getUserProfile,
    registerUser,
    updateUserProfile,
    countRecord,
    getRecentInvestUser,
    logout,
    getUserProfitGenerate,
    forgetPassword,
    verifyEmail,
    updatePassword,
    otpVerify,
    getUserNotification,
    userNotificationSeen,
    getUserOneNotification,
    updateUserProfileToken,
    userReferralLinkGenerated,
    getUserReferral,
    getUserNotificationUnseenCount,
    getAnalyticsApp,
    giveDividend,
    
} from '#controllers/userController';



import { admin } from '#middlewares/admin.middleware';
import authMiddleware from "#middlewares/auth.middleware";
import {multerUpload,multerUploadInvestor} from "#utils/multer";
import { uploadDocument,getUploadDocument } from '#controllers/documentController';
import { otpVerifyApp , forgetPasswordApp , updatePasswordApp ,otpResendApp} from '#controllers/authController';

const userRouter = express.Router();

userRouter
    .route('/')
    .post(
        multerUpload.single('image'),
        registerUser
    )

userRouter.post('/login', loginUser);

userRouter.get('/logout', logout);
userRouter.post('/delete', deleteUser);


userRouter.route('/admin-login').post(adminLogin);


userRouter.route('/profile/:id')
    .get(authMiddleware,getUserProfile)
    .put(multerUpload.single('image'),authMiddleware,updateUserProfile);
userRouter.post('/login', loginUser);
userRouter.get('/createAdmin', createAdmin);

userRouter.get('/countData', countRecord);

userRouter.get('/recentUserInvest', getRecentInvestUser);


//Forget Password
userRouter.post("/forget", forgetPassword);

//Verifed Email and Password Updated
userRouter.get("/verifed/",verifyEmail);

//Verify Email
userRouter.get("/verify/:id/:resetId/:email",verifyEmail);

//Password Updated
userRouter.post("/update",updatePassword);


userRouter.post("/change-password",updatePassword);

//OTP Verify 
userRouter.post("/auth-verify",otpVerify);




userRouter.post("/verify-otp-app",otpVerifyApp);

//Password Updated
userRouter.post("/update-password-app",updatePasswordApp);


userRouter.post("/forget-password-app",forgetPasswordApp);

userRouter.post("/otp-resend-app",otpResendApp);



//Document APIS

//Upload document 
userRouter.post("/documentUpload/:id",[authMiddleware ,multerUploadInvestor.single('document')],uploadDocument);


//Get User Document 
userRouter.get("/documentUpload/:id",getUploadDocument);

//Get User Document 
userRouter.get("/profit/:id",authMiddleware,getUserProfitGenerate);


//Notification Seen
userRouter.post("/notification-seen/:id",authMiddleware,userNotificationSeen);


//Get User Notification
userRouter.get("/notification/:id",authMiddleware,getUserNotification);


//Get User One Notification Details
userRouter.get("/notification/details/:id",authMiddleware,getUserOneNotification);

//Update Profile notification token
userRouter.put("/profile/notification/:id",authMiddleware,updateUserProfileToken);



//Create referral 
userRouter.post("/referral/:id",[authMiddleware],userReferralLinkGenerated);


//Get User referral
userRouter.get("/referral/:id",authMiddleware,getUserReferral);

//Get User Notification
userRouter.get("/notification-unseen-count/:id",authMiddleware,getUserNotificationUnseenCount);



//Get User Analytics App
userRouter.get('/analytics-app/:id', getAnalyticsApp);

userRouter.post('/give-dividend', giveDividend);


export default userRouter;
