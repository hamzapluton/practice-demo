import Transaction from "#models/transactionModel";
import Profit from "#models/profitModel";
import User from "#models/userModel";
import Store from "#models/storeModel";
import AdminProfit from "#models/adminProfitModel";
import Wallet from "#models/walletModel";
import AdminTransaction from "#models/adminTransactionModel";

import { firebaseNotification } from "#utils/firebaseNotification";

export const giveDividendManually = async (transactionId) => {
  try {
    // Fetch the transaction
    const transaction = await Transaction.findOne({ _id: transactionId, isProfitStart: true });
    if (!transaction) {
      throw new Error('Transaction not found.');
    }
    const userId = transaction.userId;
    const storeId = transaction.userId;

    // Calculate the profit amount
    const profitAmount = (transaction?.purchasedShare * transaction?.sharePrice) * (0.027397260273973 / 100);
    // Create a profit record
    const profit = new Profit({
      transactionId,
      userId,
      profitAmount,
      loss: 0,
    });
    await profit.save();

    // Update the user's wallet
    await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: { dividend: profitAmount, balance: profitAmount },
      }
    );

    // Update total profit if there are previous profits
    const totalProfitAmount = await Profit.aggregate([
      { $match: { transactionId } },
      {
        $group: {
          _id: null,
          TotalProfitValue: { $sum: "$profitAmount" },
        },
      },
    ]);

    await Profit.findOneAndUpdate(
      { _id: profit._id },
      { totalProfitAmount: totalProfitAmount?.[0]?.TotalProfitValue || profitAmount }
    );

    // Fetch user and store details
    const user = await User.findById(userId);
    const store = await Store.findById(storeId);

    // Prepare and send notification
    const notification = {
      title: `Profit Successfully Generated for ${store?.title_en}`,
      body: `Dear ${user?.name}, your profit has been successfully generated from the purchase of ${transaction?.purchasedShare} shares in ${store?.title_en}. Thank you for investing with us!`,
    };

    // await firebaseNotification(
    //   notification,
    //   [user],
    //   "news",
    //   "Selected-Users",
    //   "system",
    //   "users"
    // );

    console.log('Dividend successfully given to user.');

    // --- Admin Logic ---
    // Fetch admin transaction
    const adminTransaction = await AdminTransaction.findOne({ userTransactionId: transactionId, isProfitStart: true });
    if (!adminTransaction) {
      console.log('No corresponding admin transaction found. Skipping admin logic.');
      return;
    }

    const profitAmountAdmin = (adminTransaction?.purchasedShare * adminTransaction?.sharePrice) * (0.027397260273973 / 100);

    // Create a profit record for the admin
    const adminProfit = new AdminProfit({
      adminTransactionId: adminTransaction._id,
      type: adminTransaction.type,
      profitAmount: profitAmountAdmin,
      loss: 0,
    });
    await adminProfit.save();

    // Update the admin wallet
    await Wallet.findOneAndUpdate(
      { type: adminTransaction.type },
      {
        $inc: { dividend: profitAmountAdmin },
      }
    );

    // Update total profit for the admin transaction
    const totalProfitAmountAdmin = await AdminProfit.aggregate([
      { $match: { adminTransactionId: adminTransaction._id } },
      {
        $group: {
          _id: null,
          TotalProfitValue: { $sum: "$profitAmount" },
        },
      },
    ]);

    await AdminProfit.findOneAndUpdate(
      { _id: adminProfit._id },
      { totalProfitAmount: totalProfitAmountAdmin?.[0]?.TotalProfitValue || profitAmountAdmin }
    );

    console.log('Dividend successfully given to admin.');
  } catch (error) {
    console.error('Error giving dividend manually:', error.message);
  }
};