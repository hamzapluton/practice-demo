import express from 'express';
import {
  registerEcommerceUser,
  getWallet,
  getOneUser,
  updateWallet,
  changePassword
} from '#controllers/ecommerceController';

import {multerUpload} from "#utils/multer";

const ecommerceRouter = express.Router();

ecommerceRouter.post("/users",multerUpload.single('image'),registerEcommerceUser)

ecommerceRouter.get('/wallet/:id',getWallet)

ecommerceRouter.put('/wallet/update/:id',updateWallet)

ecommerceRouter.post('/change-password',changePassword)




export default ecommerceRouter;
