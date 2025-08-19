import fs from 'fs';
import crypto from "crypto";

class TransactionsCryptoHandler {
    constructor(data) {
      this.cadenaOriginal =
        "||" +
        data["empresa"] + 
        "|" + 
        data["tipoOrden"] +
        "|" + 
        data["fechaOperacion"] + 
        "||"
    }
  
    getSign() {
      var sign = crypto.createSign('RSA-SHA256');
      sign.update(this.cadenaOriginal);
      console.log(this.cadenaOriginal)
      const key = fs.readFileSync('ssl/private.pem');
      let signature_b64 = sign.sign(key, 'base64');
    
      return signature_b64;
  }    
  }
  
  export {TransactionsCryptoHandler}