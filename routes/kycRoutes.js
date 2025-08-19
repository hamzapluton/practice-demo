import express from "express";
import { admin } from "#middlewares/admin.middleware";
import {
  createKYC,
  updateKYCPDF,
  getUserKYC,
  createKYCtest,
  createnewKYCtest,
  deleteDuplicateKYC,
  deleteFirstKYCRecord,
  getAllKYCFiles,
  updateUsersWithKYC
  
} from "#controllers/kycController";
import authMiddleware from "#middlewares/auth.middleware";
import { multerUploadInvestor,multerUpload} from "#utils/multer";




const kycRoutes = express.Router();

kycRoutes.route('/create')
    .post(multerUploadInvestor.single('file'),createKYC)
    
kycRoutes.route('/updateUsersWithKYC')
.get(updateUsersWithKYC)

        kycRoutes.route('/test-pdf')
    .post(multerUploadInvestor.single('file'),createKYCtest)

        kycRoutes.route('/new-test-pdf')
    .post(multerUploadInvestor.single('file'),createnewKYCtest)

    kycRoutes.route('/delete-all-old-kycs')
.post(deleteDuplicateKYC)

    kycRoutes.route('/delete-first-kycs')
.post(deleteFirstKYCRecord)

kycRoutes.route('/:id')
.get(authMiddleware,getUserKYC)

kycRoutes.route('/getfiles')
.get(getAllKYCFiles)




kycRoutes.route('/sign-contract/:id')
    .put(multerUpload.single('image'),authMiddleware,updateKYCPDF)
    

export default kycRoutes;
