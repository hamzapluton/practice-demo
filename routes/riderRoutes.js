import express from 'express';
import {
    registerRider,
    getAllRider,
    verifyRider,
    getWallet,
    getOneRider,
    deleteRider,
    getOneJob,
  getAllActiveJob,
  getAllJob,
  createJob,
  deleteJob,
  updateJob,
  enableDisableJob,
  updateWallet,
  updateLockAmountWallet
} from '#controllers/riderController';

import {multerUploadInvestor} from "#utils/multer";

const riderRouter = express.Router();

riderRouter.post("/",multerUploadInvestor.fields([
    {
      name: "resume",
      maxCount: 1,
    },
    {
      name: "coverLetter",
      maxCount: 1,
    },
]),
registerRider
)



//Jobs 


riderRouter.get("/alljob", getAllJob);
  
riderRouter.get("/job", getAllActiveJob);


riderRouter.get("/job/:id", getOneJob);


riderRouter.post("/job", createJob);

riderRouter.route("/job/:id").delete(deleteJob)

riderRouter.route("/job/:id").put(updateJob)

riderRouter.put("/job/status/:id", enableDisableJob);

riderRouter.get('/',getAllRider)

riderRouter.delete('/:id',deleteRider)


riderRouter.get('/verify/:id',verifyRider)


riderRouter.get('/:id',getOneRider)


riderRouter.get('/wallet/:id',getWallet)

riderRouter.put('/wallet/update/:id',updateWallet)

riderRouter.put('/wallet-lock-amount/update/:id',updateLockAmountWallet)



export default riderRouter;
