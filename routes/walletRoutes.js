import express from 'express';
import { getWallet, walletCreate } from '#controllers/walletController';
import authMiddleware from '#middlewares/auth.middleware';

const walletRouter = express.Router();

walletRouter.use(
  express.urlencoded({
    extended: false,
  })
);


walletRouter.route('/').post(walletCreate)
walletRouter.route("/:id").get(authMiddleware,getWallet);

export default walletRouter;
