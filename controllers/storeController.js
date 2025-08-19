import Store from "#models/storeModel";

import asyncHandler from 'express-async-handler';
import isValidObjectId from "#utils/isValidObjectId";
import { PATH,TESTPATH } from "#constants/user";
import Transaction from "#models/transactionModel";
import _ from "lodash";
import { firebaseNotification } from "#utils/firebaseNotification";
import AdminTransaction from "#models/adminTransactionModel";
import User from "#models/userModel";
/**
 @desc     Create new Store
 @route    POST /api/store
 @access   Private
 */
 const createStore = asyncHandler(async (req, res) => {
    if (req.uploadError) {
      res.status(400);
      throw new Error(req.uploadError);
    }
  
    const image = req?.files?.[0]?.filename;
    req.body.image = image ? `${PATH}upload/${image}` : "";
  
    const filesData = req.body.files.map((file, index) => {
      const fileField = req.files.find(f => f.fieldname === `files.${index}.file`);
      return {
        ...file,
        file: fileField ? `${PATH}upload/${fileField.filename}` : ""
      };
    });
  
    const pitchesData = req.body.pitches.map((pitch, index) => {
      const pitchImageField = req.files.find(f => f.fieldname ===  `pitches.${index}.pitchImage`);
      return {
        ...pitch,
        pitchImage: pitchImageField ? `${PATH}upload/${pitchImageField.filename}` : ""
      };
    });
  
    req.body.files = filesData;
    req.body.pitches = pitchesData;
  
    const storeCreated = await new Store(req.body).save();
    if (storeCreated) {
      const users = await User.find({ isDeleted: false });
      const notification = {
        title: `Exciting News: A New Store by Java Times Cafe`,
        body: `We're thrilled to announce that Java Times Cafe has just opened a new store and it's now open for investment. You're invited to invest with Java Times Cafe to unlock rewards and profit opportunities.`
      }
  
      await firebaseNotification(
        notification,
        [users],
        "news",
        "All-Users",
        "system",
        "users"
      );
      return res.status(201).json({ status: true, message: 'Store Created Successfully' });
    } else {
      return res.status(400).json({ status: false, message: 'Something went wrong while creating the store' });
    }
  });


  const processDynamicFields = asyncHandler(async (req, res, next) => {
    req.body.files = [];
    req.body.pitches = [];
  
    req.files.forEach(file => {
      const match = file.fieldname.match(/files\.(\d+)\.file/);
      if (match) {
        const index = match[1];
        if (!req.body.files[index]) {
          req.body.files[index] = { type: 'image', file: `${PATH}upload/${file.filename}` };
        }
      }
  
      const pitchMatch = file.fieldname.match(/pitches\.(\d+)\.pitchImage/);
      if (pitchMatch) {
        const index = pitchMatch[1];
        if (!req.body.pitches[index]) {
          req.body.pitches[index] = { pitchImage: `${PATH}upload/${file.filename}` };
        }
      }
    });
  
    req.body.files = req.body.files.filter(Boolean);
    req.body.pitches = req.body.pitches.filter(Boolean);
  
    next();
  });

/**
 @desc     Get All stores
 @route    GET /api/store
 @access   Private
 */
const getAllStore = asyncHandler(async (req, res) => {
    const stores = await Store.find({isDeleted:false});

    stores.length === 0
        ? res.status(200).send({status: false, message: 'Stores does not exist', stores: []})
        : res.status(200).send({status: true, stores: stores, total: stores.length});
})

/**
 @desc     Get All Active stores
 @route    GET /api/stores/all
 @access   Private
 */
const getAllActiveStore = asyncHandler(async (req, res) => {
    const stores = await Store.find({isDeleted:false});
    stores.length === 0
        ? res.status(200).send({status: false, message: 'Stores does not exist', stores: []})
        : res.status(200).send({status: true, stores: stores, total: stores.length});
});

// /**
//  @desc     Update store
//  @route    PUT /api/store
//  @access   Private
//  */
// const updateStore = asyncHandler(async (req, res) => {
//     if (req.uploadError) {
//         res.status(400)
//         throw new Error(req.uploadError);
//     }
//     const {_id: id} = req.body;

    
//     const store = await Store.findById(id);

//     const image = req?.file?.filename;
//     req.body.image = image ? `${PATH}upload/${image}` : store?.image;      


//     if (!id)
//         return res.status(402).send({status: false, message: 'store id field is required'})

//     const updatedStore = await Store.findByIdAndUpdate(id, req.body, {new: true});
//     if (updatedStore)
//         return res.status(200).json({status: true, message: 'Store has been update'});

//     res.status(404).send({status: false, message: 'store with this id does not exists'})
// });



/**
 @desc     Update store
 @route    PUT /api/store
 @access   Private
 */
 const updateStore = asyncHandler(async (req, res) => {
    if (req.uploadError) {
        res.status(400);
        throw new Error(req.uploadError);
    }

    const { _id: id } = req.body;

    if (!id)
        return res.status(402).send({ status: false, message: 'Store ID field is required' });

    const store = await Store.findById(id);
    if (!store)
        return res.status(404).send({ status: false, message: 'Store with this ID does not exist' });

    // Update the image field if a new image is uploaded
    if (req?.files?.length) {
        const image = req.files[0]?.filename;
        req.body.image = image ? `${PATH}upload/${image}` : store.image;
    }

    // Initialize files and pitches updates
    const updatedFiles = store.files;
    const updatedPitches = store.pitches;

    // Update the files field if new files are uploaded
    // if (req?.files) {
        store.files.forEach((file, index) => {
            const fileField = req.files[index] || null;
            if (fileField) {
                updatedFiles[index].file = fileField ? `${PATH}upload/${fileField.filename}` : file?.file;
            }
        });

        let pitchesData = store.pitches;
if (req?.files) {
    pitchesData = pitchesData.map((pitch, index) => {
        const pitchImageField = req.files[`pitches.${index}.pitchImage`] ? req.files[`pitches.${index}.pitchImage`][0] : null;
        const pitchTitleEnglish = req.body[`pitches.${index}.pitchTitleEnglish`] ?? pitch.pitchTitleEnglish;
        const pitchTitleSpanish = req.body[`pitches.${index}.pitchTitleSpanish`] ?? pitch.pitchTitleSpanish;
        const pitchDescriptionEnglish = req.body[`pitches.${index}.pitchDescriptionEnglish`] ?? pitch.pitchDescriptionEnglish;
        const pitchDescriptionSpanish = req.body[`pitches.${index}.pitchDescriptionSpanish`] ?? pitch.pitchDescriptionSpanish;

        const updatedPitch = {
            pitchImage: pitchImageField ? `${PATH}upload/${pitchImageField.filename}` : pitch.pitchImage,
            pitchTitleEnglish,
            pitchTitleSpanish,
            pitchDescriptionEnglish,
            pitchDescriptionSpanish,
        };

        return updatedPitch;
    });
}


    console.log(pitchesData,"pitchesDatapitchesDatapitchesData")
      req.body.pitches = pitchesData
    
    const updatedFields = {
      image: req.body.image,
      files: updatedFiles,
      pitches: req.body.pitches,
      ..._.pick(req.body, [
          "description_en",
          "title_en",
          "title_sp",
          "description_en",
          "description_sp",
          "location.state",
          "location.city",
          "location.address",
          "location.postalCode",
          "totalShares",
      ]),
  };
    const updatedStore = await Store.findByIdAndUpdate(id, updatedFields, { new: true });
    if (updatedStore) {
        return res.status(200).json({ status: true, message: 'Store has been updated successfully' });
    }

    res.status(400).send({ status: false, message: 'Something went wrong while updating the store' });
});




/**
 @desc     Get Store by id
 @route    GET /api/store/id
 @access   Private
 */
const getStoreById = asyncHandler(async (req, res) => {
    const {id} = req.params;
    if (!isValidObjectId(id)) {
        res.status(430);
        throw new Error('invalid param id');
    }

    const store = await Store.findById(id);

if(!store){
 return res.status(200).send({status: false, message: 'Store does not exist'});
}

const transactionFind = await Transaction.find({
  isDeleted: false,
  storeId: store?._id,
  type: { $ne: "user-wallet" }
});

const amountTotalInvested = transactionFind.reduce(
  (acc, obj) => (acc += obj.amountInvested),
  0
);

const uniqueUserIds = [...new Set(transactionFind?.map(transaction => transaction?.userId))];

const totalCount = uniqueUserIds?.length || 0;

    if (store)
        return res.status(200).send({status: true, store: {...store.toObject(),amountTotalInvested:amountTotalInvested,totalInvestor:totalCount}});

});

/**
 @desc     Disable Store
 @route    PUT /api/store/disable/id
 @access   Private
 */
const disableStore = asyncHandler(async (req, res) => {
    const {id} = req.params;

    if (!isValidObjectId(id)) {
        res.status(430);
        throw new Error('invalid param id');
    }

    const store = await Store.findByIdAndUpdate(id, {active: false}, {new: true});
    const now = new Date(); // Get the current date and time in the user's local timezone

    // Set the timezone offset for Mexico City (Central Standard Time, CST)
    const mexicoCityOffset = -6 * 60; // CST is UTC-6


    // Calculate the next day at 1:00 AM in Mexico City time
    const nextDay1AM = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 - mexicoCityOffset * 60 * 1000);

    // Format the result as a string
    const formattedTime =
      nextDay1AM.toISOString().slice(0, 10) + ' ' + nextDay1AM.toTimeString().slice(0, 5);

      console.log(formattedTime)

    await Transaction.updateMany({storeId:store?._id},{isProfitStart : true , isProfitStartDate : formattedTime })

    
    await AdminTransaction.updateMany({storeId:store?._id},{isProfitStart : true , isProfitStartDate : formattedTime })

    

    if (store)
        return res.status(200).json({status: true, message: "Store funded active sucessfully."});

    return res.status(404).send({status: false, message: `No store found with id: ${id}`});
});

/**
 @desc     Enable Store
 @route    PUT /api/store/enable/id
 @access   Private
 */
const enableStore = asyncHandler(async (req, res) => {
    const {id} = req.params;

    if (!isValidObjectId(id)) {
        res.status(430);
        throw new Error('invalid param id');
    }

    const store = await Store.findByIdAndUpdate(id, {active: true}, {new: true});

    // await Transaction.updateMany({storeId:store?._id},{isProfitStart : false, isProfitStartDate : null })
    // await AdminTransaction.updateMany({storeId:store?._id},{isProfitStart : false , isProfitStartDate : null })


    if (store)
        return res.status(200).json({status: true, message: "Store funded un-active sucessfully."});

    return res.status(404).send({status: false, message: `No store found with id: ${id}`});
});

/**
 @desc     Delete Multiple stores with id
 @route    DELETE /api/store
 @access   Private
 */
const deleteStores = asyncHandler(async (req, res) => {
    const id = req.params.id;

    const deletedStores = await Store.findByIdAndUpdate(id ,{isDeleted:true});

    if (deletedStores)
        return res?.status(200).send({status: true, message: `Store has been deleted`})
})


export {
    createStore,
    processDynamicFields,
    getAllStore,
    updateStore,
    enableStore,
    getStoreById,
    disableStore,
    deleteStores,
    getAllActiveStore
};
