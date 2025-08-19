import express from 'express';
import {
    createStore,
    enableStore,
    updateStore,
    getAllStore,
    disableStore,
    getStoreById,
    deleteStores,
    getAllActiveStore,
    processDynamicFields
} from "#controllers/storeController"
import {multerUpload,multerUploadDynamic} from "#utils/multer";
import authMiddleware from '#middlewares/auth.middleware';
import { admin } from '#middlewares/admin.middleware';

const storeRouter = express.Router();




storeRouter.route('/')
  .get(admin, getAllStore)
  .post(multerUploadDynamic,processDynamicFields, [admin, authMiddleware], createStore)
  .put(multerUploadDynamic,processDynamicFields, [admin, authMiddleware], updateStore);


   
    storeRouter.delete('/delete/:id',[admin,authMiddleware], deleteStores);
storeRouter.get('/all', getAllActiveStore);

storeRouter.get('/:id', getStoreById);

storeRouter.put('/enable/:id',[admin,authMiddleware], enableStore);
storeRouter.put('/disable/:id',[admin,authMiddleware], disableStore);

//storeRouter.get('/countTotalShares',[admin,authMiddleware], countTotalShares);
// storeRouter.get('/countAvailableShares',[admin,authMiddleware], countTotalAvailableShares);

export default storeRouter;
