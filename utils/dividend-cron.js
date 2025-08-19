import PendingDividend from "#models/pendingDividendModel";
import Wallet from "#models/walletModel";
import schedule from "node-schedule";

export const dividend_cron = schedule.scheduleJob("* * * * *", async () => {
  const now = new Date();

  const pendingDividends = await PendingDividend.find({
    createdAt: { $lte: now },
  });

  for (const record of pendingDividends) {
    await Wallet.findOneAndUpdate(
      { userId: record.userId },
      {
        $inc: {
          dividend: -record.dividendValue,
        },
      },
      { new: true }
    );

    await PendingDividend.findByIdAndDelete(record._id);
  }
});
