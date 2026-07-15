import forge from 'node-forge';

// Helper to convert Base64Url to BigInteger/Buffer of node-forge
function base64UrlToBigInteger(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = forge.util.decode64(b64);
  return new forge.jsbn.BigInteger(forge.util.bytesToHex(bytes), 16);
}

// Helper to convert BigInteger of node-forge to Base64Url
function bigIntegerToBase64Url(bigint) {
  let hex = bigint.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const bytes = forge.util.hexToBytes(hex);
  const b64 = forge.util.encode64(bytes);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Derive key using PBKDF2
function deriveKey(password, saltBytes) {
  // iterations: 100000, key size: 32 bytes (256 bits), digest: SHA-256
  const derived = forge.pkcs5.pbkdf2(password, saltBytes, 100000, 32, forge.md.sha256.create());
  return derived;
}

// Encrypt symmetry AES-GCM
export async function encrypt(plainText, password) {
  try {
    const salt = forge.random.getBytesSync(16);
    const iv = forge.random.getBytesSync(12);
    
    const key = deriveKey(password, salt);
    
    const cipher = forge.cipher.createCipher('AES-GCM', key);
    cipher.start({ iv: iv, tagLength: 128 });
    cipher.update(forge.util.createBuffer(plainText, 'utf8'));
    cipher.finish();
    
    const saltHex = forge.util.bytesToHex(salt);
    const ivHex = forge.util.bytesToHex(iv);
    const encryptedHex = cipher.output.toHex() + cipher.mode.tag.toHex();
    
    return `${saltHex}:${ivHex}:${encryptedHex}`;
  } catch (e) {
    console.error("Encryption failed:", e);
    throw new Error("Mã hóa dữ liệu thất bại");
  }
}

// Decrypt symmetry AES-GCM
export async function decrypt(cipherText, password) {
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error("Định dạng dữ liệu mã hóa không hợp lệ");
    }
    
    const salt = forge.util.hexToBytes(parts[0]);
    const iv = forge.util.hexToBytes(parts[1]);
    const fullEncryptedHex = parts[2];
    
    // Auth tag length: 16 bytes = 32 hex chars at the end
    const tagHex = fullEncryptedHex.slice(-32);
    const cipherHex = fullEncryptedHex.slice(0, -32);
    
    const key = deriveKey(password, salt);
    
    const decipher = forge.cipher.createDecipher('AES-GCM', key);
    decipher.start({
      iv: iv,
      tag: forge.util.createBuffer(forge.util.hexToBytes(tagHex))
    });
    decipher.update(forge.util.createBuffer(forge.util.hexToBytes(cipherHex)));
    
    const success = decipher.finish();
    if (!success) {
      throw new Error("Auth tag validation failed");
    }
    
    return decipher.output.toString('utf8');
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Sai mật khẩu giải mã hoặc dữ liệu bị lỗi");
  }
}

// Generate Asymmetric RSA Keypair matching JWK format
export async function generateAsymmetricKeypair() {
  try {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    
    const n = bigIntegerToBase64Url(keypair.publicKey.n);
    const e = bigIntegerToBase64Url(keypair.publicKey.e);
    
    const d = bigIntegerToBase64Url(keypair.privateKey.d);
    const p = bigIntegerToBase64Url(keypair.privateKey.p);
    const q = bigIntegerToBase64Url(keypair.privateKey.q);
    const dp = bigIntegerToBase64Url(keypair.privateKey.dP);
    const dq = bigIntegerToBase64Url(keypair.privateKey.dQ);
    const qi = bigIntegerToBase64Url(keypair.privateKey.qInv);
    
    const publicKeyJwk = {
      kty: "RSA",
      alg: "RSA-OAEP-256",
      n,
      e,
      key_ops: ["encrypt"]
    };
    
    const privateKeyJwk = {
      kty: "RSA",
      alg: "RSA-OAEP-256",
      n,
      e,
      d,
      p,
      q,
      dp,
      dq,
      qi,
      key_ops: ["decrypt"]
    };
    
    return {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk)
    };
  } catch (e) {
    console.error("Failed to generate asymmetric keypair:", e);
    throw new Error("Tạo cặp khóa mã hóa bất đối xứng thất bại");
  }
}

// Encrypt plain text using JWK public key (RSA-OAEP with SHA-256)
export async function encryptWithPublicKey(pubKeyJwkStr, plainText) {
  try {
    const pubKeyJwk = JSON.parse(pubKeyJwkStr);
    
    const n = base64UrlToBigInteger(pubKeyJwk.n);
    const e = base64UrlToBigInteger(pubKeyJwk.e);
    
    const pubKey = forge.pki.setRsaPublicKey(n, e);
    
    // RSA-OAEP with SHA-256
    const encryptedBytes = pubKey.encrypt(plainText, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    });
    
    return forge.util.bytesToHex(encryptedBytes);
  } catch (e) {
    console.error("Public key encryption failed:", e);
    throw new Error("Mã hóa bằng khóa công khai thất bại");
  }
}

// Decrypt cipher text (hex) using JWK private key (RSA-OAEP with SHA-256)
export async function decryptWithPrivateKey(privKeyJwkStr, cipherTextHex) {
  try {
    const privKeyJwk = JSON.parse(privKeyJwkStr);
    
    const n = base64UrlToBigInteger(privKeyJwk.n);
    const e = base64UrlToBigInteger(privKeyJwk.e);
    const d = base64UrlToBigInteger(privKeyJwk.d);
    const p = base64UrlToBigInteger(privKeyJwk.p);
    const q = base64UrlToBigInteger(privKeyJwk.q);
    const dP = base64UrlToBigInteger(privKeyJwk.dp);
    const dQ = base64UrlToBigInteger(privKeyJwk.dq);
    const qInv = base64UrlToBigInteger(privKeyJwk.qi);
    
    const privKey = forge.pki.setRsaPrivateKey(n, e, d, p, q, dP, dQ, qInv);
    
    const cipherBytes = forge.util.hexToBytes(cipherTextHex);
    
    // RSA-OAEP with SHA-256
    const decrypted = privKey.decrypt(cipherBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    });
    
    return forge.util.decodeUtf8(decrypted);
  } catch (e) {
    console.error("Private key decryption failed:", e);
    throw new Error("Giải mã bằng khóa bí mật thất bại");
  }
}
