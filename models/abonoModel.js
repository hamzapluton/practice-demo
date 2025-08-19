import mongoose from "mongoose";

const abonoSchema = new mongoose.Schema({
  id: Number,
  fechaOperacion: Number,
  institucionOrdenante: Number,
  institucionBeneficiaria: Number,
  claveRastreo: String,
  monto: Number,
  nombreOrdenante: String,
  tipoCuentaOrdenante: Number,
  cuentaOrdenante: String,
  rfcCurpOrdenante: String,
  nombreBeneficiario: String,
  tipoCuentaBeneficiario: Number,
  cuentaBeneficiario: String,
  nombreBeneficiario2: String,
  tipoCuentaBeneficiario2: String,
  cuentaBeneficiario2: String,
  rfcCurpBeneficiario: String,
  conceptoPago: String,
  referenciaNumerica: Number,
  empresa: String,
  tipoPago: String,
  tsLiquidacion: String,
  folioCodi: String
},{timestamps:true});

const Abono = mongoose.model('Abono', abonoSchema);

export default Abono;