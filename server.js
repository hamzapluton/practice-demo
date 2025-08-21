import cors from "cors";
import dotenv from "dotenv";
import express, { response } from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import connectDB from "#config/db";
import SocketServer from "#sockets/SocketServer";
import userRoutes from "#routes/userRoutes";
import storeRouter from "#routes/storeRoutes";
import investRouter from "#routes/investRoute";
import walletRouter from "#routes/walletRoutes";
import contactRoutes from "#routes/contactRoutes";
import investorRoutes from "#routes/investorsRoute";
import transactionRoutes from "#routes/TransactionRoutes";
import withDrawlRoutes from "#routes/withDrawlRoutes";
import schedule from "node-schedule";
import log from "#middlewares/log";
import { errorHandler, notFound } from "#middlewares/errorMiddleware";
import adminRoutes from "#routes/adminRoutes";
import kycRoutes from "#routes/kycRoutes";
import riderRoutes from "#routes/riderRoutes";
import { SOCKET_ORIGINS } from "#constants/user";
import Order from "#models/orderModel";
import Abono from "#models/abonoModel";
import { shareDistributed } from "#controllers/investController";
import ecommerceRouter from "#routes/ecommerceRoutes";
import popupRouter from "#routes/popupRoutes";
import ticketRouter from "#routes/ticketRoutes";
import Transaction from "#models/transactionModel";
import Profit from "#models/profitModel";
import Wallet from "#models/walletModel";
import User from "#models/userModel";
import { firebaseNotification } from "#utils/firebaseNotification";
import AdminTransaction from "#models/adminTransactionModel";
import AdminProfit from "#models/adminProfitModel";
import { dividend_cron } from "#utils/dividend-cron";

dotenv.config();
await connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(cors({ origin: true, credentials: true }));

app.use(cookieParser());
app.use(log);

app.get("/test", (req, res) => {
  res.send("Server-Running");
});

app.get("/test-cron", async (req, res) => {
  if (
    req.body.key !==
    "aa7771268dd102149117d44c365744d2420e767411cbb54d02374fd78993ec90"
  ) {
    return res.json({
      message: "Not Accessible",
    });
  }

  try {
    let usersProfit = [];
    console.log("Job ran at 10:00 AM in the Mexico City timezone!");
    const transactionFind = await Transaction.find({ isProfitStart: true });
    console.log(transactionFind);
    let totalProfitAmount;

    if (transactionFind?.length > 0) {
      const profitPromises = transactionFind.map(async (transaction) => {
        const profitFind = await Profit.findOne({
          transactionId: transaction?._id,
        });
        console.log(profitFind, "profitFind");

        let profitAmount =
          transaction?.purchasedShare *
          transaction?.sharePrice *
          (0.027397260273973 / 100);
        console.log(profitAmount);
        const profit = new Profit({
          transactionId: transaction?._id,
          userId: transaction?.userId,
          profitAmount,
          loss: 0,
        });
        await profit.save(); // Save the profit object and return the promise
        await Wallet.findOneAndUpdate(
          { userId: transaction?.userId },
          { $inc: { dividend: profitAmount } }
        );
        await Wallet.findOneAndUpdate(
          { userId: transaction?.userId },
          { $inc: { balance: profitAmount } }
        );

        if (profitFind) {
          totalProfitAmount = await Profit.aggregate([
            {
              $match: {
                transactionId: transaction?._id, // Match transactions for the specific userId
              },
            },
            {
              $group: {
                _id: null,
                TotalProfitValue: {
                  $sum: "$profitAmount",
                },
              },
            },
          ]);
          await Profit.findOneAndUpdate(
            { _id: profit?._id },
            { totalProfitAmount: totalProfitAmount?.[0]?.TotalProfitValue }
          );
        } else {
          await Profit.findOneAndUpdate(
            { _id: profit?._id },
            { totalProfitAmount: profitAmount }
          );
        }

        const transactionUser = await User.findById(transaction?.userId);

        if (transactionUser?._id) {
          // Check if the user already exists in the usersProfit array
          const existingUserIndex = usersProfit?.findIndex(
            (user) =>
              user?.userData?._id?.toString() ===
              transactionUser?._id?.toString()
          );

          if (existingUserIndex !== -1) {
            // User already exists, update their values
            usersProfit[existingUserIndex].profitAmount += profitAmount;
            usersProfit[existingUserIndex].totalProfitAmount =
              (usersProfit[existingUserIndex].totalProfitAmount || 0) +
              (totalProfitAmount?.[0]?.TotalProfitValue || 0);
            usersProfit[existingUserIndex].amountInvested +=
              transaction.amountInvested;
          } else {
            // User doesn't exist, add a new object
            usersProfit.push({
              profitAmount,
              totalProfitAmount:
                totalProfitAmount?.[0]?.TotalProfitValue || profitAmount,
              amountInvested: transaction.amountInvested,
              userData: transactionUser,
            });
          }
        }
      });

      // Wait for all profit promises to resolve
      await Promise.all(profitPromises);

      await Promise.allSettled(
        usersProfit.map((user) => {
          const notification = {
            title: `Hoy Ganaste con Java 300 💸`,
            body: `<p>Estimado inversionista de Java Times Caffé, ${user?.userData?.name}:</p>
            <p></p>
            <p>Nos complace informarte que tu ganancia total de hoy es de ${user?.profitAmount} MXN.</p>
            <p>Este monto equivale a ${user?.totalProfitAmount} diarios, basado en:</p>
            <p>• Tu inversión total de ${user?.amountInvested} MXN</p>
            <p></p>
            <p>💡 ¡Invierte más para ganar más! 🎉</p>`,
          };

          firebaseNotification(
            notification,
            [user?.userData],
            "news",
            "Selected-Users",
            "system",
            "users"
          );
        })
      );

      const transactionAdminFind = await AdminTransaction.find({
        isProfitStart: true,
      }).populate("userTransactionId");

      const profitAdminPromises = transactionAdminFind.map(
        async (transaction) => {
          console.log(transaction);
          const profitFind = await AdminProfit.findOne({
            adminTransactionId: transaction?._id,
          });
          console.log(profitFind, "profitFind");

          let profitAmount =
            transaction?.purchasedShare *
            transaction?.sharePrice *
            (0.027397260273973 / 100);
          console.log(profitAmount, "Amount Of profit User");
          const profit = new AdminProfit({
            adminTransactionId: transaction?._id,
            type: transaction?.type || "owner",
            profitAmount,
            loss: 0,
          });
          await profit.save(); // Save the profit object and return the promise
          await Wallet.findOneAndUpdate(
            { type: transaction?.type },
            { $inc: { dividend: profitAmount } }
          );

          if (profitFind) {
            const totalProfitAmount = await AdminProfit.aggregate([
              {
                $match: {
                  adminTransactionId: transaction?._id,
                },
              },
              {
                $group: {
                  _id: null,
                  TotalProfitValue: {
                    $sum: "$profitAmount",
                  },
                },
              },
            ]);

            await AdminProfit.findOneAndUpdate(
              { _id: profit?._id },
              { totalProfitAmount: totalProfitAmount?.[0]?.TotalProfitValue }
            );
          } else {
            await AdminProfit.findOneAndUpdate(
              { _id: profit?._id },
              { totalProfitAmount: profitAmount }
            );
          }
        }
      );

      // Wait for all profit promises to resolve
      await Promise.all(profitAdminPromises);

      console.log("Profit added sucessfully");
      return res.json({
        message: "Profit added sucessfully",
      });
    } else {
      console.log("Profit Not yet Start For Any Store");
      return res.json({
        message: "Profit Not yet Start For Any Store",
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      error: error.message,
      message: "Server Error",
    });
  }
});

//Staging changes done By kashan
app.use("/api/ecommerce", ecommerceRouter);
app.use("/api/popup", popupRouter);
app.use("/api/rider", riderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/store", storeRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/invest", investRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/investors", investorRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api", withDrawlRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/ticket", ticketRouter);

app.use("/upload", express.static("upload"));
app.use("/contractUpload", express.static("contractUpload"));

app.use("/newContractUpload", express.static("newContractUpload"));
app.use("/newTileContract", express.static("newTileContract"));

app.use("/TileContract", express.static("TileContract"));

app.use(notFound);
app.use(errorHandler);

schedule.scheduleJob("*/50 * * * * *", async () => {
  const investFind = await Order.find({ status: "processing" });

  console.log("investFind", investFind);

  if (investFind.length > 0) {
    investFind.map(async (item, i) => {
      const updatedAt = new Date(item?.updatedAt);
      const twoMinutesAgo = new Date(updatedAt.getTime() + 2 * 60 * 1000);
      const current_Date = new Date();
      console.log("current date", current_Date);
      console.log("created date", twoMinutesAgo);
      if (current_Date > twoMinutesAgo) {
        await Order.findOneAndUpdate(
          { _id: item?._id },
          { status: "execution-start" }
        );
        const orderFind = await Order.findOne({
          status: "success",
          claveRastreo: item?.claveRastreo,
          clabe: item?.clabe,
        });
        console.log(orderFind, "orderFind");

        if (orderFind) {
          return await Order.findOneAndUpdate(
            { _id: orderFind?._id },
            { status: "pending", claveRastreo: "" }
          );
        }
        const abonoFind = await Abono.findOne({
          claveRastreo: item?.claveRastreo,
        });

        if (abonoFind && abonoFind?.fechaOperacion) {
          console.log("EXECUTE TRANSACTION");
          const status = await shareDistributed({
            userId: item?.userId,
            storeId: item?.storeId,
            amountInvested: item?.amountInvested,
            clabe: item?.clabe,
            item_order: item,
          });
          if (status) {
            await Order.findOneAndUpdate(
              { _id: item?._id, clabe: item?.clabe, status: "execution-start" },
              { status: "success", claveRastreo: item?.claveRastreo }
            );
          } else {
            await Order.findOneAndUpdate(
              { _id: item?._id, clabe: item?.clabe, status: "execution-start" },
              { status: "failed" }
            );
            console.log("Something Error In Execution");
          }
        } else {
          console.log("Not found record");
        }
      } else {
        console.log("Found but not execute waiting for 2 minutes", item);
      }
    });
  }
});

await dividend_cron;

// await Wallet.updateOne({userId:"66ed9a58625614000343b4f4"},{shares:0,amount:0,balance:10000,dividend:10000})
// await Wallet.updateMany({type:'investor'},{lockedAmount:0});

const server = createServer(app);
const sockets = new SocketServer(server, {
  cors: SOCKET_ORIGINS,
  transports: ["websocket", "polling"],
});

server.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

export { sockets };

process.on("unhandledRejection", (err, promise) => {
  console.log(`logged error: ${err}`);
  server.close(() => process.exit(1));
});

