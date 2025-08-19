import _ from "lodash";
import dotenv from "dotenv";
import connectDB from "#config/db";
import Wallet from "#models/walletModel";
import Transaction from "#models/transactionModel";
import User from "#models/userModel";
import AdminNotification from "#models/notificationModel";
import Notification from "#models/notificationModel";
import KYC from "#models/kycModel";
import updateSharesToPdf from "#utils/updateSharesToPdf";
import { PATH } from "#constants/user";
import fs from 'fs/promises';
const createAdmin = async () => {
  await dotenv.config();
  await connectDB();

  const findTransactions = async () => {
    // try {
    //   // Step 1: Fetch all investor users
    //   const investors = await User.find({ isInvestor: true});
    //   const investorIds = investors.map((user) => user._id);

    //   // Step 2: Fetch all wallets and KYC details for the investor users in a single query
    //   const [wallets, kycs] = await Promise.all([
    //     Wallet.find({ userId: { $in: investorIds } }),
    //     KYC.find({ userId: { $in: investorIds } }),
    //   ]);

    //   // Step 3: Fetch all transactions related to investor users in a single query
    //   const transactions = await Transaction.find({
    //     isDeleted: false,
    //     userId: { $in: investorIds },
    //   });

    //   // Step 4: Group transactions by userId for easier lookup
    //   const transactionsByUser = _.groupBy(transactions, "userId");

    //   // Step 5: Process each investor, wallet, and KYC in parallel
    //   await Promise.all(
    //     investors.map(async (user) => {
    //       let userId = user._id;
    //       let investorWallet = wallets.find((wallet) => wallet.userId.toString() === userId.toString());
    //       let kyc = kycs.find((kyc) => kyc.userId.toString() == userId.toString());
    //       let userTransactions = transactionsByUser[userId] || [];
    //       const transactionFind = await Transaction.find({
    //         isDeleted: false,
    //         userId: userId,
    //       });
    
    //       const amountInvested = transactionFind.reduce(
    //         (acc, obj) => (acc += obj.amountInvested),
    //         0
    //       );
    //       if (investorWallet) {
    //         let path = await updateSharesToPdf(
    //           {
    //             amount: investorWallet?.amount,
    //             shares: investorWallet?.shares,
    //             amountInvested: amountInvested,
    //             totalTransactions: userTransactions?.length || "0",
    //           },
    //           kyc,
    //           user
    //         );

    //         if (path) {
    //           let cleanedPath = path.replace("./", "");
    //           if(kyc)
    //           {
    //             await KYC.findByIdAndUpdate(kyc?._id, {
    //               file_before_signature: `${PATH}${cleanedPath}`,
    //               file: `${PATH}${cleanedPath}`,
    //             });
    //           }else{

    //             let kycCreated = new KYC({ userId: userId });
               
    //               console.log(path, "pdfPath");
    //               let cleanedPath = path.replace("./", "");
    //               console.log(userId);
    //               console.log(`${PATH}${cleanedPath}`);
    //               kycCreated.file = `${PATH}${cleanedPath}`;
    //               kycCreated.file_before_signature = `${PATH}${cleanedPath}`;
    //               kycCreated.save();
    //             }
              
    //           console.log(`PDF path updated for user ${userId}: ${PATH}${cleanedPath}`);
    //         }
    //       }
    //     })
    //   );

    //   console.log("All users processed successfully.");
    // } catch (error) {
    //   console.error("Error processing transactions for users:", error);
    // }
    
  };

  await findTransactions();
  process.exit(0);
};

createAdmin();
