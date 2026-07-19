// crypto.js - Client-side AES-GCM-256 encryption helper

// Helper to convert ArrayBuffer to Hex string
function bufToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Helper to convert Hex string to ArrayBuffer
function hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
}

// Derive a CryptoKey from password and salt using PBKDF2
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt plain text using a master password
export async function encrypt(plainText, password) {
    try {
        const encoder = new TextEncoder();
        const dataBuf = encoder.encode(plainText);
        
        // Generate random salt (16 bytes) and iv (12 bytes)
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const key = await deriveKey(password, salt);
        
        const encryptedBuf = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            dataBuf
        );
        
        const saltHex = bufToHex(salt);
        const ivHex = bufToHex(iv);
        const encryptedHex = bufToHex(encryptedBuf);
        
        // Return format: salt:iv:ciphertext
        return `${saltHex}:${ivHex}:${encryptedHex}`;
    } catch (e) {
        console.error("Encryption failed:", e);
        throw new Error("Mã hóa dữ liệu thất bại");
    }
}

// Decrypt cipher text using a master password
export async function decrypt(cipherText, password) {
    try {
        const parts = cipherText.split(':');
        if (parts.length !== 3) {
            throw new Error("Định dạng dữ liệu mã hóa không hợp lệ");
        }
        
        const salt = new Uint8Array(hexToBuf(parts[0]));
        const iv = new Uint8Array(hexToBuf(parts[1]));
        const encryptedData = hexToBuf(parts[2]);
        
        const key = await deriveKey(password, salt);
        
        const decryptedBuf = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuf);
    } catch (e) {
        console.error("Decryption failed:", e);
        throw new Error("Sai mật khẩu giải mã hoặc dữ liệu bị lỗi");
    }
}

// Generate Asymmetric RSA-OAEP Keypair
// CVE-4 Fix (v4.2.86): Nâng key size từ 2048 lên 4096-bit để đảm bảo bảo mật dài hạn.
// Lưu ý: keypair cũ (2048-bit) vẫn hoạt động bình thường do hash: "SHA-256" giữ nguyên.
// Keypair mới chỉ được tạo khi người dùng thiết lập lần đầu hoặc reset thiết bị.
export async function generateAsymmetricKeypair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,          // Nâng từ 2048 → 4096-bit (NIST approved, secure 2030+)
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"               // Giữ SHA-256 để tương thích với keypair cũ
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );
        
        const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
        
        return {
            publicKey: JSON.stringify(publicKeyJwk),
            privateKey: JSON.stringify(privateKeyJwk)
        };
    } catch (e) {
        console.error("Failed to generate asymmetric keypair:", e);
        throw new Error("Tạo cặp khóa mã hóa bất đối xứng thất bại");
    }
}

// Encrypt plain text using a JWK public key
export async function encryptWithPublicKey(pubKeyJwkStr, plainText) {
    try {
        const pubKey = await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(pubKeyJwkStr),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["encrypt"]
        );
        const encoder = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            pubKey,
            encoder.encode(plainText)
        );
        return bufToHex(encrypted);
    } catch (e) {
        console.error("Public key encryption failed:", e);
        throw new Error("Mã hóa bằng khóa công khai thất bại");
    }
}

// Decrypt cipher text (hex) using a JWK private key
export async function decryptWithPrivateKey(privKeyJwkStr, cipherTextHex) {
    try {
        const privKey = await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(privKeyJwkStr),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["decrypt"]
        );
        const cipherBuf = hexToBuf(cipherTextHex);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privKey,
            cipherBuf
        );
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (e) {
        console.error("Private key decryption failed:", e);
        throw new Error("Giải mã bằng khóa bí mật thất bại");
    }
}

