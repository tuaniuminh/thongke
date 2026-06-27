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
