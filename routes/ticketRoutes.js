import { create, getAll, getById, updateById, deleteById } from "#controllers/ticketController";
import authMiddleware from "#middlewares/auth.middleware";
import { validateRequest } from "#middlewares/validateRequest";
import { multerUploadSingleImage } from "#utils/multer";
import { ticketSchema, updateTicketSchema } from "#utils/schemas/index";
import express from "express";

const router = express.Router();

// Apply authMiddleware globally to all routes
router.use(authMiddleware);

// Define routes
router.route("/")
    .post(multerUploadSingleImage.single("attachment"), validateRequest(ticketSchema, true), create);

router.route("/all")
    .get(getAll);

router.route("/:id")
    .get(getById)
    .put(validateRequest(updateTicketSchema, false), updateById)
    .delete(deleteById);

export default router;
