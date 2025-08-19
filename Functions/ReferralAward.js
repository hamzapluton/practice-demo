import Referral from "#models/referralModel";
import Transaction from "#models/transactionModel";
import User from "#models/userModel";
import Wallet from "#models/walletModel";

export async function ReferralAward(user, store, amountInvested){
  console.log("---------------")
    const referral = await Referral.findOne({ to_referral_userId: user._id });

    if (referral && referral.rewarded_amount == 0) {
      let commission = 0;
  
      if (referral) {
        commission = amountInvested * 0.025;
  
        referral.invested_amount = amountInvested;
        referral.rewarded_amount += commission;
        referral.status = "investor";
        await referral.save();
  
        const referrer = await Wallet.findOne({ userId: referral.from_referral_userId });
          console.log("wallet", referrer);

        if (referrer) {
          if(referrer.shares >= 25){

            referrer.dividend += commission;
            await referrer.save();
            
            await Transaction.create({
              userId: referrer._id,
              storeId: store._id,
              amountInvested,
              amount: commission,
              type: "refer",
              description: `Commission earned from referral (${user.email})`,
            });
            
          }else{
            console.log(`Referrer does not meet the 25-share requirement for withdrawal`)
          }
        }
      }
    }
}
