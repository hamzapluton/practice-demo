import express from "express";

import { admin } from '#middlewares/admin.middleware';
import {
  createWithdrawl,
  getAllWithDrawl,
  getUserWithDrawl,
  cancelWithdrawl,
  approveWithdrawl,
  createWithdrawlAdmin,
  getAdminWithDrawl
} from "#controllers/withDrawlController";
import authMiddleware from "#middlewares/auth.middleware";
import { multerUpload } from "#utils/multer";

const withDrawlRoutes = express.Router();

withDrawlRoutes.post("/withdrawl", authMiddleware, multerUpload.single("document"), createWithdrawl);

withDrawlRoutes.post("/withdrawl-admin",[admin,authMiddleware],createWithdrawlAdmin);

withDrawlRoutes.get("/withdrawl",[admin,authMiddleware], getAllWithDrawl);

withDrawlRoutes.get("/withdrawl-admin",[admin,authMiddleware], getAdminWithDrawl);

withDrawlRoutes.put("/withdrawl/cancel/:id",authMiddleware, cancelWithdrawl);

withDrawlRoutes.get("/withdrawl/user/:id",authMiddleware, getUserWithDrawl);

withDrawlRoutes.put("/withdrawl/approve",[admin,authMiddleware], approveWithdrawl);

export default withDrawlRoutes;
