import fs from 'fs';
import crypto from "crypto";

class AccountBalanceCryptoHandler {
    constructor(data) {
      this.cadenaOriginal =
        "||" +
        data["empresa"] + //90646
        "|" + //a
        data["cuentaOrdenante"] + //STARTUP
        "|||"
    }
  
    getSign() {
      var sign = crypto.createSign('RSA-SHA256');
      sign.update(this.cadenaOriginal);
      const key = fs.readFileSync('ssl/private.pem');
      let signature_b64 = sign.sign(key, 'base64');
    
      return signature_b64;
  }    
  }
  
  export {AccountBalanceCryptoHandler}