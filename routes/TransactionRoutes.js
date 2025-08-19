import express from "express";
import {getTransactions,getAdminTransactions} from "#controllers/transactionContoller";

import { admin } from '#middlewares/admin.middleware';
import authMiddleware from "#middlewares/auth.middleware";

const transactionRoutes = express.Router();

transactionRoutes.route('/').get([admin,authMiddleware],getTransactions).get(getAdminTransactions)


transactionRoutes.route('/admin').get([admin,authMiddleware],getAdminTransactions)

export default transactionRoutes;
