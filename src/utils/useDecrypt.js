import { useApp } from '../context/AppContext';
import { decrypt, decryptJSON, MASKED, AUTHORIZED_ROLES, logDecryptionAccess } from './encryption';

/**
 * Hook that returns a `safeDecrypt` function.
 * - If the user is authorized AND showDecrypted is ON, decrypts and logs the access.
 * - Otherwise returns MASKED placeholder.
 *
 * Usage:
 *   const safeDecrypt = useDecrypt();
 *   <p>{safeDecrypt(evaluation.feedback, evaluation.id, 'evaluations')}</p>
 */
export function useDecrypt() {
    const { currentUser, showDecrypted } = useApp();

    return (value, recordId, tableName = 'unknown') => {
        if (!value) return value;

        const isAuthorized = currentUser && AUTHORIZED_ROLES.includes(currentUser.role);

        if (isAuthorized && showDecrypted) {
            logDecryptionAccess(currentUser.id, recordId, tableName);
            return decrypt(value);
        }

        // If the value starts with AES: it's encrypted — mask it
        if (typeof value === 'string' && value.startsWith('AES:')) {
            return MASKED;
        }

        return value;
    };
}

/**
 * Hook that returns a `safeDecryptJSON` function.
 * Used for JSONB fields like goal_ratings.
 */
export function useDecryptJSON() {
    const { currentUser, showDecrypted } = useApp();

    return (value, recordId, tableName = 'unknown') => {
        if (!value) return value;

        const isAuthorized = currentUser && AUTHORIZED_ROLES.includes(currentUser.role);

        if (isAuthorized && showDecrypted) {
            logDecryptionAccess(currentUser.id, recordId, tableName);
            return decryptJSON(value);
        }

        if (typeof value === 'string' && value.startsWith('AES:')) {
            return {}; // Return empty for masked JSONB fields
        }

        return typeof value === 'object' ? value : {};
    };
}
