import Referral from "#models/referralModel";
import Transaction from "#models/transactionModel";
import User from "#models/userModel";
import Wallet from "#models/walletModel";

export async function ManualReferralAward(user, store, amountInvested, commissionPercentage) {
    console.log("---------------");
  
    console.log(commissionPercentage);
    // Convert commission percentage to decimal (e.g., 10% -> 0.10)
    
    const commissionRate = commissionPercentage?.percentage / 100;
    console.log('userrrrrr',user);
  
    // Find the referral based on the user ID
    const referral = await Referral.findOne({ to_referral_userId: user?._id });
  
    // Check if the referral exists and hasn't already been rewarded
    if (referral ) {
      let commission = 0;
  
      // Calculate commission based on the converted commission rate
      if (referral) {
        commission = amountInvested * commissionRate;  // Dynamic commission rate
  
        referral.invested_amount = amountInvested;
        referral.rewarded_amount += commission;
        referral.status = "investor";
        await referral.save();
  
        // Find the referrer's wallet
        console.log('kashaaan',commissionPercentage?.walletId);
const referrer = await Wallet.findById(commissionPercentage?.walletId);
        
  
        // Check if the referrer exists and meets the 25-share requirement
        if (referrer) {
          if (referrer.shares >= 25) {
  
            // Add commission to the referrer's dividend
            referrer.dividend += commission;
            await referrer.save();
  
            // Create a transaction record for the referral reward
            await Transaction.create({
              userId: referrer._id,
              storeId: store._id,
              amountInvested,
              amount: commission,
              type: "refer",
              description: `Commission earned from referral (${user.email})`,
            });
            console.log(`Referrer  meet the 25-share requirement  from his referral`);
  
          } else {
            console.log(`Referrer does not meet the 25-share requirement for withdrawal`);
          }
        }
      }
    }
  }
  