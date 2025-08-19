import express from "express";
import {
   ChangeState,
  SendAbono,
  PaymentCheckout,
  CreateRequestOrder,
  getAllOrder,
  calculateRemainingShares,
  investUserWallet,
  manualInvestment
} from "#controllers/investController";

import { generateDividend } from "#controllers/adminController";
import authMiddleware from "#middlewares/auth.middleware";

const investRouter = express.Router();


investRouter
  .route("/wallet/:id")
  .post(authMiddleware, PaymentCheckout);

//CambioEstado Live
investRouter.route("/change-state").post(ChangeState);

//CambioEstado Local
investRouter.route("/checkout/:id").post(ChangeState);

//SendAbono Live
investRouter.route("/send-abono").post(SendAbono);

//Testing register Order
investRouter.route("/register").post(PaymentCheckout);


//Order Created request
investRouter.route("/order").post(CreateRequestOrder).get(getAllOrder);

//total remaining shares
investRouter.route("/remian-shares").get(calculateRemainingShares);


//Invest via wallet
investRouter.route("/wallet_invest/:id").post(investUserWallet);

//manual investment
investRouter.route("/manual-invest").post(manualInvestment);


//SendAbono Local
investRouter.route("/refund").post(SendAbono);

investRouter.post("/generate_dividend", authMiddleware, generateDividend);

export default investRouter;
