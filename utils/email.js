import nodemailer from "nodemailer";
import { LOCALPATH, PATH, TESTPATH , user , pass } from "#constants/user";
import ejs from "ejs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SOURCE_PATH = join(__dirname, "./", "template/html.ejs");

const forgetEmail = async (email, verificationId, uniqueString, obj) => {
  const data = {
    url:
      `${PATH}` +
      "api/users/verify/" +
      verificationId +
      "/" +
      uniqueString +
      "/" +
      email,
  };

  const htmlText = await ejs.renderFile(
    `${__dirname}${obj.template}/forgetPassword.ejs`,
    data
  );

  const mailOptions = {
    from: user,
    to: email,
    subject: "Verify email address to forget the password in JAVA TIMES CAFFE",
    html: htmlText,
    // html : `<p>Verify your email address to forget the password</p><p>This link
    // <b>expires in 5 minutes</b></p><p>Press <a href=${`${TESTPATH}` + "api/users/verify/" +verificationId +"/"+ uniqueString+"/"+email}>here </a>to proceed </p>`,
  };

  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    }
  });
};

const sendResetPasswordEmail = async (
  email,
  name,
  obj,
  verificationId,
  uniqueString
) => {
  const data = {
    email: email,
    name: name,
    url:
      `${PATH}` +
      "api/users/verify/" +
      verificationId +
      "/" +
      uniqueString +
      "/" +
      email,
  };

  const htmlText = await ejs.renderFile(
    `${__dirname}${obj.template}/html.ejs`,
    data
  );

  const mailOptions = {
    from: user,
    to: email,
    subject: "Reset Your Password In JAVA TIMES CAFFE Platform",
    html: htmlText,
    // html : `<h2>Hi ${name}</h2>
    // <h3>Your email address is ${email}</h3>
    // <h3>To Reset Your Password Click <a href=${`${LOCALPATH}`+"forget"}>here </a>to proceed</h3>`,
  };

  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });

  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(info?.response);
    }
  });
};

const contactUsEmail = async (message) => {
  const mailOptions = {
    from: user,
    to: "inversion@javatimescaffe.com",
    subject: "Contact Us Request From Java Times Caffe Platform",
    html: `<h3>Name : ${message?.name}</h3>
    <h3>Email : ${message?.email}</h3>
    <h3>Phone : ${message.phone}</h3>
    <h3>Message : ${message.message}</h3>`,

    // html : `<h2>Hi ${name}</h2>
    // <h3>Your email address is ${email}</h3>
    // <h3>To Reset Your Password Click <a href=${`${LOCALPATH}`+"forget"}>here </a>to proceed</h3>`
  };

  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    }
  });
};


const contactUsWallet = async (message) => {
  const mailOptions = {
    from: user,
    to: "inversion@javatimescaffe.com",
    subject: "Contact Us Request From Java Times Caffe Platform",
    html: `<h3>Name : ${message?.name}</h3>
    <h3>Email : ${message?.email}</h3>
    <h3>Wallet Address : ${message.message}</h3>`,

    // html : `<h2>Hi ${name}</h2>
    // <h3>Your email address is ${email}</h3>
    // <h3>To Reset Your Password Click <a href=${`${LOCALPATH}`+"forget"}>here </a>to proceed</h3>`
  };

  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    }
  });
};



const sendNotificationEmail = async (email,notification) => {
  
  const data = {
    email: email,
    notification: notification
  };
  const htmlText = await ejs.renderFile(
    `${__dirname}/template/notification.ejs`,
    data
  );

  
  const mailOptions = {
    from: user,
    to: email,
    subject: notification?.title,
    html:htmlText
  
  };


  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    }
  });
};







export const otpEmail = async (email, OTP) => {

  const data = {
    email: email,
    otp: OTP
  };
  const htmlText = await ejs.renderFile(
    `${__dirname}/template/otp.ejs`,
    data
  );

  const mailOptions = {
    from: user,
    to: email,
    subject: "Otp Send By Java Times Caffe",
    html: htmlText
  }

  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(info?.response);
    }
  });
}



export const riderEmail = async (email, password,name) => {

  const data = {
    email: email,
    password: password,
    name:name
  };
console.log(data,"data")
  const htmlText = await ejs.renderFile(
    `${__dirname}/template/rider.ejs`,
    data
  );

  const mailOptions = {
    from: user,
    to: email,
    subject: "Welcome to JavaTimesCaffe",
    html: htmlText
  }

  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(info?.response);
    }
  });
}


export { forgetEmail, sendResetPasswordEmail, contactUsEmail , sendNotificationEmail ,contactUsWallet};
