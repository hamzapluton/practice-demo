import asyncHandler from "express-async-handler";
import Rider from "#models/riderModel";
import isValidObjectId from "#utils/isValidObjectId";
import User from "#models/userModel";
import Wallet from "#models/walletModel";
import _ from "loadsh";
import Clabe from "#models/clabeModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import bcrypt from "bcryptjs";

/*
@desc     Get Wallet
@route    Get /api/ecomemrce/wallet/:id
@access   Private
*/
const getWallet = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }

  const wallet = await Wallet.findById(id).select("digitalMoney jtcToken _id");
  if (!wallet)
    return res
      .status(404)
      .send({ status: false, message: "Id does not exists" });

  res.status(200).send({ status: true, wallet });
});


/*
@desc     Update Wallet
@route    Get /api/ecomemrce/update/:id
@access   Private
*/
const updateWallet = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid param id");
  }

  const allowedFields = ["digitalMoney", "jtcToken"];
  const updates = {};
  
  // Check if the request body contains only allowed fields
  Object.keys(req.body).forEach((field) => {
    if (allowedFields.includes(field)) {
      // Check if the value is not negative
      if (req.body[field] >= 0) {
        updates[field] = req.body[field];
      } else {
        res.status(400);
        throw new Error(`${field} cannot be updated with a negative value`);
      }
    } else {
      res.status(400);
      throw new Error(`${field} is not an allowed field`);
    }
  });

  const wallet = await Wallet.findByIdAndUpdate(
    { _id: id, type: "investor" },
    updates,
    { new: true }
  ).select("digitalMoney jtcToken _id");

  if (!wallet) {
    return res.status(404).send({ status: false, message: "Id does not exist" });
  }

  res.status(200).send({
    status: true,
    message: "User wallet updated successfully",
    wallet,
  });
});


/*
@desc     Get User
@route    Get /api/ecomemrce/users/:id
@access   Private
*/
const getOneUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isValidObjectId(id)) {
    res.status(430);
    throw new Error("invalid param id");
  }
  const rider = await Rider.findById(id);
  if (!rider)
    return res
      .status(404)
      .send({ status: false, message: "Id does not exists" });

  res.status(200).send({ status: true, rider });
});



/*
@desc     Create a New User
@route    POST /api/ecomemrce/users
@access   Pubic
*/
const registerEcommerceUser = asyncHandler(async (req, res) => {
  try {
    const image = req?.file?.filename;

    console.log(req.body,"REQUEST")
    if (req.uploadError) {
      res.status(400);
      throw new Error(req.uploadError);
    }

    if (image) req.body.image = image;

    const userExists = await User.findOne({ email: req.body.email });

    if (userExists) {
      await handleExistingUser(res, userExists);
    } else {
      const user = await createUser(req.body);
      await handleNewUser(res, user);
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Something error while creating user" });
  }
});

const handleExistingUser = async (res, userExists) => {
  const wallet = await Wallet.findOne({ userId: userExists?._id.toString() });

  if (wallet) {
    return res.status(201).send({
      status: true,
      message: "Successfully User Verified and Wallet Created",
      walletId: wallet._id,
    });
  }

  const clabeAccount = await assignClabeAccount(userExists?._id);
  const walletCreated = await createWallet(userExists?._id);

  await updateUserWithWalletAndClabe(userExists?._id, walletCreated?._id, clabeAccount?.clabe);

  res.status(201).send({
    status: true,
    message: "Successfully User Verified and Wallet Created",
    walletId: walletCreated?._id,
  });
};

const handleNewUser = async (res, user) => {
  const clabeAccount = await assignClabeAccount(user?._id);
  const walletCreated = await createWallet(user?._id);

  await updateUserWithWalletAndClabe(user?._id, walletCreated?._id, clabeAccount?.clabe);

 // Send welcome notification
 await sendNotification(
  user,
  "Welcome to Java Times Caffe",
  "¡Bienvenidos a Java Times Caffe! We are thrilled to have you as part of our Java Times Caffe family, your ultimate destination for everything coffee. ☕\nAt Java Times Caffe, we're not just about coffee; we're about creating a community of coffee enthusiasts who share a passion for the perfect brew!"
);


  res.status(201).send({
    status: true,
    message: "Successfully User Verified and Wallet Created",
    walletId: walletCreated?._id,
  });
};
const assignClabeAccount = async (userId) => {
  return await Clabe.findOneAndUpdate({ userId: { $exists: false } }, { userId }, { new: true });
};

const createWallet = async (userId) => {
  return await new Wallet({
    userId,
    type: "investor",
    amount: 0,
    shares: 0,
    dividend: 0,
    balance: 0,
    digitalMoney: 0,
    jtcToken: 0,
  }).save();
};

const updateUserWithWalletAndClabe = async (userId, walletId, clabe) => {
  await User.findByIdAndUpdate(userId, {
    $set: { wallet: walletId, clabe, isVerified: true },
  });
};

const createUser = async (userData) => {
  const user = await new User(userData).save();
  await User.findOneAndUpdate({ email: user.email }, { $set: { isVerified: true } }, { new: true });
  return JSON.parse(JSON.stringify(user));
};


// Assume you have a function for sending notifications
const sendNotification = async (user, title, body) => {
  const notification = {
    title,
    body,
  };

  // Additional logic for sending notifications using firebaseNotification function
  await firebaseNotification(
    notification,
    [user],
    "news",
    "Selected-Users",
    "system",
    "users"
  );
};





//@desc  update Password
//@route  /ecomemrce/update
//@request Put Request
//@acess  public

const changePassword = asyncHandler(async (req, res) => {
  let userFind = await User.findOne({ email: req.body?.email });
console.log(userFind,"userFind")
console.log(req.body,"req.body")
  if (!userFind) {
    return res
      .status(200)
      .json({ status: false, message: "Email does not exists!" });
  }
 
  let salt, hashpassword, update;

  salt = bcrypt.genSalt(10);
  hashpassword = await bcrypt.hash(req.body.password, parseInt(salt));
console.log(hashpassword,'hashpassword');
  update = await User.findOneAndUpdate(
    { email: req.body.email },
    { password: hashpassword },
    { new: true }
  );

  console.log(update,"update")
  const notification = {
    title: "Password updated successfully",
    body: `Your password has been updated successfully.`
  }

  await firebaseNotification(
    notification,
    [update],
    "news",
    "Selected-Users",
    "system",
    "users"
  )

  return res
    .status(200)
    .json({ status: true, message: "Password updated successfully" });
});
export { registerEcommerceUser, getWallet, getOneUser, updateWallet ,changePassword};
