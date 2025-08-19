import mongoose from "mongoose";

const paymentStpSchema = new mongoose.Schema(
  {
    id: {
      type: String,
    },
    empresa: {
      enum: "STARTUP",
      type: String,
    },
    folioOrigen: {
      type: String,
    },
    estado: {
      type: String,
    },
    causaDevolucion: {
      type: String,
    },
    tsLiquidacion: {
      type: String,
    },
  },
  { timestamps: true }
);

const stpPaymentModel = mongoose.model("stpPayment", paymentStpSchema);

export default stpPaymentModel;
