import asyncHandler from "express-async-handler";
import Rider from "#models/riderModel";
import isValidObjectId from '#utils/isValidObjectId';
import User from "#models/userModel";
import Wallet from "#models/walletModel";
import _ from "loadsh";
import { PATH, POSPATH } from "#constants/user";
import Clabe from "#models/clabeModel";
import otpGenerator from "otp-generator";
import { riderEmail } from "#utils/email";
import rp from "request-promise";

import Job from "#models/jobModel";

const registerRider = asyncHandler(async (req, res) => {
  const riderFind = await Rider.findOne({ email: req.body.email })
  if (riderFind) return res.status(200).send({ status: true, message: 'Your application already received.' })

  let resume = req.files?.resume?.[0];
  let coverLetter = req.files?.coverLetter?.[0];

  if (!resume?.filename) {
    return res
      .status(200)
      .json({ status: false, message: "Please Select the Resume" });
  }

  if (!coverLetter?.filename) {
    return res
      .status(200)
      .json({ status: false, message: "Please Select the Cover Letter" });
  }

  req.body.coverLetter = coverLetter ? `${PATH}upload/${coverLetter?.filename}` : "";

  req.body.resume = resume
    ? `${PATH}upload/${resume?.filename}`
    : "";


  const rider = new Rider(req.body);
  const savedRider = await rider.save();
  if (savedRider) {
    res.status(201).send({ status: true, message: 'Your application has been successfully submitted.' })
  }
});


const getAllRider = asyncHandler(async (req, res) => {

  const rider = await Rider.find({ isDeleted: false });
  if (rider.length > 0) {
    return res.status(200).send({ status: true, rider })
  }
  else {
    return res.status(404).send({ status: false, message: 'Rider does not exists' })

  }
});

const verifyRider = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }

  const riderFind = await Rider.findById(id);

  if (!riderFind) return res.status(404).send({ status: false, message: 'Rider does not exists' })

  const userFind = await User.findOne({ email: riderFind?.email });
  const unassignedClabeAccount = await Clabe.findOne({
    userId: { $exists: false },
  });

  let user;
  let wallet;
  let rider;
  let clabeAccount;
  let PasswordGenerate;
  if (userFind) {
    user = await User.findOne({ email: riderFind?.email })
    wallet = await Wallet.findOne({ userId: userFind?._id })
    rider = await Rider.findOneAndUpdate({ email: riderFind?.email }, { isVerified: true, wallet: wallet?._id, userId: userFind?._id }, { new: true });
  }
  else {

    PasswordGenerate = otpGenerator.generate(10, {
      digits: true,
      upperCaseAlphabets: true,
      lowerCaseAlphabets: true,
      specialChars: false,
    });
    console.log(PasswordGenerate, "PasswordGenerate")

    user = new User({ email: riderFind?.email, phone: riderFind?.phone });
    user.password = PasswordGenerate
    user.nickName = riderFind?.lastName
    user.name = riderFind?.firstName + riderFind?.lastName
    user.isVerified = true


    if (unassignedClabeAccount) {
      clabeAccount = await Clabe.findByIdAndUpdate(
        unassignedClabeAccount?._id,
        { userId: user?._id },
        { new: true }
      );
    }


    wallet = await new Wallet({
      userId: user?._id,
      type: "investor",
      amount: 0,
      shares: 0,
      dividend: 0,
      balance: 0,
    }).save();


    user.wallet = wallet?._id
    user.clabe = clabeAccount?.clabe
    await user.save();

    rider = await Rider.findOneAndUpdate({ email: riderFind?.email }, { isVerified: true, wallet: wallet?._id, userId: user?._id }, { new: true });

    const data = {
      first_name: riderFind?.firstName,
      last_name: riderFind?.lastName,
      email: riderFind?.email,
      password: PasswordGenerate,
      phone: riderFind?.phone,
      image: '',
      user_fundraiser_id: user?._id,
      wallet_id: wallet?._id,
      rider_type: riderFind?.postingApplying
    }
console.log(data,"datadatadata")
    let response = await rp({
      url: `${POSPATH}api/rider/register`,
      method: "POST",
      json: true,
      body: data,
      rejectUnauthorized: false,
    });
console.log(response,"responseresponse");

    riderEmail(riderFind?.email, PasswordGenerate, user?.name);

  }

  if (rider) {

    return res.status(200).send({ status: true, message: "Rider verified and created wallet", data: { rider, user, wallet } })
  }
  else {
    return res.status(400).send({ status: false, message: 'Something Error' })
  }
});

const getWallet = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }

  const rider = await Wallet.findById(id).select('balance userId')
  if (!rider) return res.status(404).send({ status: false, message: 'Id does not exists' })

  res.status(200).send({ status: true, rider })
});


const updateWallet = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }

  const rider = await Wallet.findByIdAndUpdate({_id : id , type:'investor'},{balance : req.body.balance , dividend:req.body.balance})
  if (!rider) return res.status(404).send({ status: false, message: 'Id does not exists' })

  res.status(200).send({ status: true, message : 'Rider wallet updated successfully'})
});

const updateLockAmountWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lockedAmount, type } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ status: false, message: "Invalid parameter id" });
    return;
  }

  let amount = Number(lockedAmount) || 0;

  const rider = await Wallet.findById(id);
  if (!rider) {
    return res.status(404).json({ status: false, message: "Rider wallet does not exist" });
  }

  let totalLockedAmount = rider?.lockedAmount ?? 0;

  if (type === "decrement") {
    totalLockedAmount += amount;
  } 
  else if (type == "increment") {
 if(totalLockedAmount != 0)
 {
   totalLockedAmount -= amount;
 }
  }
  else if(type == "removed")
{
  if(totalLockedAmount != 0)
    {
      totalLockedAmount -= amount;
    }
} 

// else {
  //   return res.status(400).json({ status: false, message: "Invalid update type" });
  // }
  console.log(totalLockedAmount,"totalLockedAmounttotalLockedAmount")
  console.log(amount,"amountamountamount")
  let updatedRider;
  if(type == "removed")
  {
    console.log("CALL REMOVED")
     updatedRider = await Wallet.findByIdAndUpdate(
      id,
      {
         lockedAmount: totalLockedAmount,
      },
      { new: true }
    );
  
  }else{
    
    console.log("CALL ADD")
     updatedRider = await Wallet.findByIdAndUpdate(
      id,
      {
        $inc: { balance: type === "decrement" ? -amount : amount, dividend: type === "decrement" ? -amount : amount },
        lockedAmount: totalLockedAmount,
      },
      { new: true }
    );
  }
 

  
console.log(updatedRider,"updatedRiderupdatedRider")
  if (!updatedRider) {
    return res.status(404).json({ status: false, message: "Rider wallet not found after update" });
  }

  return res.status(200).json({ status: true, message: "Rider wallet updated successfully" });
});



const getOneRider = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }
  const rider = await Rider.findById(id)
  if (!rider) return res.status(404).send({ status: false, message: 'Id does not exists' })

  res.status(200).send({ status: true, rider })
});

/**
 @desc     Delete Rider
 @route    DELETE /api/rider
 @access   Private
 */
const deleteRider = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const deletedRider = await Rider.findByIdAndUpdate(id, { isDeleted: true });

  if (deletedRider)
    return res?.status(200).send({ status: true, message: `Rider has been deleted` })
})




/**
 @desc     Create Job 
 @route    POST /api/rider/job
 @access   Private
 */
const createJob = asyncHandler(async (req, res) => {
  const job = new Job(req.body);
  const savedJob = await job.save();
  if (savedJob) {
    res.status(201).send({ status: true, message: "Job Created Successfully" });
  } else {
    res.status(400).send({ status: false, message: "Something error" });

  }
});

/**
@desc     Get All Job 
@route    Get /api/rider/alljob
@access   Private
*/
const getAllActiveJob = asyncHandler(async (req, res) => {
  const job = await Job.find();
  if (job.length > 0) {
    return res.status(200).send({ status: true, job });
  } else {
    return res
      .status(404)
      .send({ status: false, message: "Job does not exists" });
  }
});

/**
@desc     Get All Job active
@route    Get /api/rider/job
@access   Private
*/
const getAllJob = asyncHandler(async (req, res) => {
  const job = await Job.find({ isDeleted: false });
  if (job.length > 0) {
    return res.status(200).send({ status: true, job });
  } else {
    return res
      .status(404)
      .send({ status: false, message: "Job does not exists" });
  }
});

/**
@desc     Delete Job with id
@route    DELETE /api/rider/job
@access   Private
*/
const deleteJob = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const deletedJob = await Job.findByIdAndUpdate(id, { isDeleted: true });

  if (deletedJob)
    return res
      ?.status(200)
      .send({ status: true, message: `Job has been deleted` });
});


/**
@desc     UPDATE Job with id
@route    DELETE /api/rider/job
@access   Private
*/
const updateJob = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const jobFind = await Job.findById(id);


  if (!jobFind) return res.status(404).send({ status: false, message: 'Job does not exists' })

  const updateJob = await Job.findByIdAndUpdate(id, req.body);

  if (updateJob)
    return res
      ?.status(200)
      .send({ status: true, message: `Job has been updated` });
  else {
    return res
      ?.status(400)
      .send({ status: false, message: `Something Error` });
  }


}
);


/**
@desc      Enabled Disable Job
@route    PUT /api/rider/job/status/id
@access   Private
*/
const enableDisableJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }
  const jobFind = await Job.findById(id);

  if (jobFind) {
    if (jobFind.active === false) {

      await Job.findByIdAndUpdate(id, { active: jobFind.active = true }, { new: true });
      return res.status(200).json({ status: true, message: "Job has been disabled." });
    }
    else if (jobFind.active === true) {
      await Job.findByIdAndUpdate(id, { active: jobFind.active = false }, { new: true });
      return res.status(200).json({ status: true, message: "Job has been enabled." });
    }
  }
  else {
    return res.status(404).json({ status: false, message: `No Job found with id: ${id}` });
  }

});


/**
@desc      Get One Job
@route    GET /api/rider/job/id
@access   Private
*/
const getOneJob = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }
  const job = await Job.findById(id)
  if (!job) return res.status(404).send({ status: false, message: 'Id does not exists' })

  res.status(200).send({ status: true, job })
});


export {
  getOneJob,
  createJob,
  getAllJob,
  deleteJob,
  updateJob,
  getAllActiveJob, registerRider, getAllRider, verifyRider, getWallet, getOneRider, deleteRider,
  enableDisableJob,
  updateWallet,
  updateLockAmountWallet
}