/*****  Packages  *****/
import Joi from "joi";
import bcrypt from "bcryptjs";
import _ from "lodash";
import otpGenerator from "otp-generator";
import generateToken from "#utils/generateToken";
/*****  Modules  *****/

import { UserVerification } from "#models/userVerification";


import asyncHandler from "express-async-handler";
import { otpEmail } from "#utils/email";

import User from "#models/userModel";

const validate = (req) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().min(8).max(255).required(),
  });

  return schema.validate(req);
};

/**
 @desc     Authenticate User Registered
 @route    POST /api/auth/register
 @access   Public
 */


const createUser = asyncHandler(async (req, res) => {


  let user = await User.findOne({ email: req.body.email });
  if (user)
  {
    return res.status(400).send({status:false,message:"Email already exists."});  
  }
  else{
     await new User(req.body).save();
  }
  

  await UserVerification.deleteMany({ email: req.body.email });

  
  let OTP = otpGenerator.generate(4, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  let verification = await new UserVerification({
    email: req.body.email,
    resetId: OTP,
  }).save();

  otpEmail(verification?.email, OTP);

  return res.status(200).json({
    status: true,
    message: "We have sent you an OTP via email for verification.!",
  });
});


/**
 @desc     Authenticate User Login
 @route    POST /api/auth
 @access   Public
 */


const loginUser = asyncHandler(async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    return res
      .status(400)
      .send({ status: false, message: error?.details[0]?.message });
  }

  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send({status:false,message:"Invalid email or password."});

  const validPassword = await bcrypt.compareSync(req.body.password, user?.password);
  if (!validPassword) return res.status(404).send({status:false,message:"Invalid email or password."});


  if (user?.isVerified === false)
  {
    await UserVerification.deleteMany({email:req.body.email});

    let OTP = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
  
    let verification = await new UserVerification({
      email: req.body.email,
      resetId: OTP,
    }).save();
  
    
    otpEmail(verification?.email, OTP);
  
    return res.status(404).json({
      status: true,
      message: "We have sent you an OTP via email for verification.!",
    }); 
  }

  let updatedUser = await User.findOne({email:req.body.email});
  const token = generateToken(updatedUser?._id);

  return res
    .cookie("x-auth-token", token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    }) // maxAge expire after 1 hour
    .header("x-auth-token", token)
    .header("access-control-expose-headers", "x-auth-token")
    .status(200)
    .send({
      status: true,
      message: "User login successfully",
      user: updatedUser,
    });

});


//@desc  User resend otp
//@route  /auth/resend-otp-app
//@request post Request
//@acess  public


const otpResendApp = asyncHandler(async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send({status:false,message:"Email does not exists."});  
  

  await UserVerification.deleteMany({ email: req.body.email });

  
  let OTP = otpGenerator.generate(4, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  let verification = await new UserVerification({
    email: req.body.email,
    resetId: OTP,
  }).save()

  otpEmail(verification?.email, OTP);

  return res.status(200).json({
    status: true,
    message: "Otp resend successfully",
  });
});



//@desc  User forget password
//@route  /auth/forget
//@request post Request
//@acess  public


const forgetPasswordApp = asyncHandler(async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send({status:false,message:"Email does not exists."});  
  

  await UserVerification.deleteMany({ email: req.body.email });

  
  let OTP = otpGenerator.generate(4, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  let verification = await new UserVerification({
    email: req.body.email,
    resetId: OTP,
  }).save()

  otpEmail(verification?.email, OTP);

  return res.status(200).json({
    status: true,
    message: "We have sent you an OTP via email for verification.!",
  });
});



//@desc  User Update password
//@route  /auth/update-password
//@request put Request
//@acess  public


const updatePasswordApp = asyncHandler(async (req, res) => {
  console.log(req.body)

  const { error } = validate(req.body);
  if (error) {
    return res
      .status(400)
      .send({ status: false, message: error?.details[0]?.message });
  }

  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send({status:false,message:"Email does not exists."});  
 
  const salt = await bcrypt.genSalt(10);
  let password = await bcrypt.hash(req.body.password,salt);

  await User.findOneAndUpdate({email:req.body.email},{password:password});

  return res.status(200).json({
    status: true,
    message: "Password reset successfully!",
  });
});



//@desc  User otp verify
//@route  /auth/verify
//@request post Request
//@acess  public


const otpVerifyApp = asyncHandler(async (req, res) => {

  const emailValid = await User.findOne({ email: req.body.email });
  if (!emailValid) {
    return res
      .status(404)
      .send({ status: false, message: "Email does not exists" });
  }  
  
  const otpFind = await UserVerification.findOne({ email: req.body.email });

  if (!otpFind)
    return res
      .status(404)
      .send({ status: false, message: "You use an expired OTP!" });

   if (otpFind?.resetId == req.body.otp) {
    await UserVerification.deleteMany({email:req.body.email});

    return res
      .status(200)
      .send({
        status: true,
        message: "User Verified successfully",
      });
  } else {
    return res.status(404).send({ status: false, message: "Otp was wrong!" });
  }
});


/**
 @desc     Clear Cookies
 @route    GET /api/auth/logout
 @access   Public
 */

const logout = asyncHandler(async (req, res) => {
  res.cookie("x-auth-token", null).send("Successfully logout");
});

export { createUser,loginUser, otpVerifyApp, logout ,forgetPasswordApp,updatePasswordApp,otpResendApp};