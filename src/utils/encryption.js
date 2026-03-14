import CryptoJS from 'crypto-js';

const AES_PREFIX = 'AES:';
const LEGACY_PREFIX = '[ENC]';
const LEGACY_SHIFT = 3;

/**
 * Returns the AES encryption key from environment variables.
 */
function getKey() {
    return import.meta.env.VITE_SUPABASE_ENCRYPTION_KEY || 'fallback-dev-key-do-not-use-in-production';
}

// ─── Legacy Caesar Cipher (backward compatibility) ───────────────────────────

function legacyDecrypt(value) {
    const cipher = value.slice(LEGACY_PREFIX.length);
    return cipher
        .split('')
        .map(ch => String.fromCharCode(ch.charCodeAt(0) - LEGACY_SHIFT))
        .join('');
}

// ─── AES Encrypt / Decrypt ───────────────────────────────────────────────────

/**
 * Encrypt a string value using AES with the env key.
 * Adds a prefix 'AES:' to distinguish encrypted values.
 */
export function encrypt(value) {
    if (value === null || value === undefined) return value;
    const text = typeof value !== 'string' ? String(value) : value;
    if (!text) return text;
    if (text.startsWith(AES_PREFIX)) return text;   // already AES-encrypted
    if (text.startsWith(LEGACY_PREFIX)) return text; // leave old data as is (decrypt-only)

    const encrypted = CryptoJS.AES.encrypt(text, getKey()).toString();
    return AES_PREFIX + encrypted;
}

/**
 * Decrypt a value — handles both new AES and old Caesar-cipher formats.
 * - 'AES:...'   → AES decrypt with env key
 * - '[ENC]...'  → legacy Caesar-cipher decrypt (backward compat)
 * - Other       → return as-is (plain text)
 */
export function decrypt(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;

    // New AES format
    if (value.startsWith(AES_PREFIX)) {
        try {
            const cipherText = value.slice(AES_PREFIX.length);
            const bytes = CryptoJS.AES.decrypt(cipherText, getKey());
            const result = bytes.toString(CryptoJS.enc.Utf8);
            return result || value;
        } catch {
            return value;
        }
    }

    // Old Caesar cipher format
    if (value.startsWith(LEGACY_PREFIX)) {
        try {
            return legacyDecrypt(value);
        } catch {
            return value;
        }
    }

    // Plain text — return as-is
    return value;
}

/**
 * Encrypt a JSON object (converts to JSON string, then AES-encrypts).
 * Used for JSONB fields like goal_ratings.
 */
export function encryptJSON(obj) {
    if (obj === null || obj === undefined) return obj;
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return encrypt(json);
}

/**
 * Decrypt an encrypted JSON string back to an object.
 * Handles both AES and legacy formats.
 */
export function decryptJSON(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'object') return value; // already parsed by Supabase
    const json = decrypt(value);
    try {
        return JSON.parse(json);
    } catch {
        return {};
    }
}

/** Mask sensitive data for unauthorized users */
export const MASKED = '****** Protected Data ******';

/** Authorized roles that can see decrypted data */
export const AUTHORIZED_ROLES = ['admin', 'hr', 'manager'];

/** Returns true if the value looks encrypted (either format) */
export function isEncrypted(value) {
    return typeof value === 'string' && (value.startsWith(AES_PREFIX) || value.startsWith(LEGACY_PREFIX));
}

/** Log a decryption access event to console */
export function logDecryptionAccess(userId, recordId, tableName) {
    console.log(
        `[DECRYPTION ACCESS] User: ${userId} | Record: ${recordId} | Table: ${tableName} | Time: ${new Date().toISOString()}`
    );
}
