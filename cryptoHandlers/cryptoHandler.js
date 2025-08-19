
import crypto from "crypto";
import fs from 'fs';

class PaymentCryptoHandler {
  constructor(orderPaymentWs) {
    this.cadenaOriginal =
      "||" +
      orderPaymentWs["institucionContraparte"] + //90646
      "|" + //a
      orderPaymentWs["empresa"] + //STARTUP
      "|||" + //b
      orderPaymentWs["claveRastreo"] + //test1
      "|" + //cd
      orderPaymentWs["institucionOperante"] + //90646
      "|" + //e
      orderPaymentWs["monto"] + //0.01
      "|" + //g
      orderPaymentWs["tipoPago"] + //1
      "|"+ //h
      orderPaymentWs['tipoCuentaOrdenante'] + //40
      "|"+
      orderPaymentWs["nombreOrdenante"]+ //STARTUP S.A. de C.V.
      "|" +
      orderPaymentWs["cuentaOrdenante"] + //646180352800000009
      "|" + //m
      orderPaymentWs["rfcCurpBeneficiario"] + //ND
      "|" + //n
      orderPaymentWs["tipoCuentaBeneficiario"] + //40
      "|" + //o
      orderPaymentWs["nombreBeneficiario"] + //S.A. de C.V.
      "|" + //pqrstu
      orderPaymentWs["cuentaBeneficiario"] + //646180355000000000
      "|" + //vwxyzaa
      orderPaymentWs["rfcCurpOrdenante"] + //ND
      "||||||" + //bbcc
      orderPaymentWs["conceptoPago"] + //Prueba REST
      "||||||"+ //ddeeffgghh+
      orderPaymentWs["referenciaNumerica"] + //123456
      "||||||||"
  }

  getSign() {

    var sign = crypto.createSign('RSA-SHA256');
     sign.update(this.cadenaOriginal);
    const key = fs.readFileSync('ssl/private.pem');
    let signature_b64 = sign.sign(key, 'base64');
  
    return signature_b64;
}    
}


export {PaymentCryptoHandler};
