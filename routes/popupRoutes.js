import express from "express";
import {
  createPopup,
  getAllPopups,
  getPopupById,
  updatePopup,
  deletePopup,
  getSpecificType,
  PopupTypes,
  popupStatusChange,
} from "#controllers/popupController";
const popupRouter = express.Router();

//CambioEstado LiveE
popupRouter.route("/create-popup").post(createPopup);

//CambioEstado Local
popupRouter.route("/get-all-popup").get(getAllPopups);

//specific popup

popupRouter.route("/get-sepcific-type/:type").get(getSpecificType);

//SendAbono Live
popupRouter.route("/get/:id").get(getPopupById);
popupRouter.route("/update-popup").post(updatePopup);
popupRouter.route("/delete-popup/:id").delete(deletePopup);
popupRouter.route("/popup-types").get(PopupTypes);
popupRouter.route("/change-status/:id").put(popupStatusChange);

export default popupRouter;
