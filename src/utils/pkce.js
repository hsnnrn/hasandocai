"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPABASE_OAUTH_ENDPOINTS = exports.DEFAULT_OAUTH_SCOPES = void 0;
exports.generateCodeVerifier = generateCodeVerifier;
exports.generateCodeChallenge = generateCodeChallenge;
exports.generatePKCEPair = generatePKCEPair;
exports.generateState = generateState;
exports.base64urlEncode = base64urlEncode;
exports.base64urlDecode = base64urlDecode;
exports.buildAuthorizationURL = buildAuthorizationURL;
exports.buildTokenExchangeData = buildTokenExchangeData;
exports.buildRefreshTokenData = buildRefreshTokenData;
exports.parseCallbackURL = parseCallbackURL;
exports.handleOAuthError = handleOAuthError;
exports.validatePKCEParameters = validatePKCEParameters;
const crypto = __importStar(require("crypto"));
/**
 * Generate a cryptographically random code verifier
 * @param length Length of the code verifier (43-128 characters recommended)
 * @returns Base64url-encoded code verifier
 */
function generateCodeVerifier(length = 128) {
    if (length < 43 || length > 128) {
        throw new Error('Code verifier length must be between 43 and 128 characters');
    }
    const bytes = crypto.randomBytes(Math.ceil(length * 3 / 4));
    return base64urlEncode(bytes).substring(0, length);
}
/**
 * Generate code challenge from code verifier using SHA256
 * @param codeVerifier The code verifier
 * @returns Base64url-encoded SHA256 hash of the code verifier
 */
function generateCodeChallenge(codeVerifier) {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return base64urlEncode(hash);
}
/**
 * Generate a complete PKCE pair
 * @param verifierLength Length of the code verifier
 * @returns PKCE pair with verifier, challenge, and method
 */
function generatePKCEPair(verifierLength = 128) {
    const codeVerifier = generateCodeVerifier(verifierLength);
    const codeChallenge = generateCodeChallenge(codeVerifier);
    return {
        codeVerifier,
        codeChallenge,
        codeChallengeMethod: 'S256'
    };
}
/**
 * Generate a random state parameter for CSRF protection
 * @param length Length of the state parameter
 * @returns Base64url-encoded random state
 */
function generateState(length = 32) {
    const bytes = crypto.randomBytes(Math.ceil(length * 3 / 4));
    return base64urlEncode(bytes).substring(0, length);
}
/**
 * Base64url encode a buffer
 * @param buffer Buffer to encode
 * @returns Base64url-encoded string
 */
function base64urlEncode(buffer) {
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
/**
 * Base64url decode a string
 * @param str Base64url-encoded string
 * @returns Decoded buffer
 */
function base64urlDecode(str) {
    // Add padding if needed
    const padded = str + '='.repeat((4 - str.length % 4) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64');
}
/**
 * Build authorization URL with PKCE parameters
 * @param baseUrl Base authorization URL
 * @param clientId OAuth client ID
 * @param redirectUri Redirect URI
 * @param scopes OAuth scopes
 * @param codeChallenge PKCE code challenge
 * @param state State parameter
 * @param additionalParams Additional query parameters
 * @returns Complete authorization URL
 */
function buildAuthorizationURL(baseUrl, clientId, redirectUri, scopes, codeChallenge, state, additionalParams = {}) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
        ...additionalParams
    });
    return `${baseUrl}?${params.toString()}`;
}
/**
 * Build token exchange request data
 * @param code Authorization code
 * @param redirectUri Redirect URI
 * @param clientId OAuth client ID
 * @param codeVerifier PKCE code verifier
 * @returns URLSearchParams for token exchange
 */
function buildTokenExchangeData(code, redirectUri, clientId, codeVerifier) {
    return new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
    });
}
/**
 * Build refresh token request data
 * @param refreshToken Refresh token
 * @param clientId OAuth client ID
 * @returns URLSearchParams for token refresh
 */
function buildRefreshTokenData(refreshToken, clientId) {
    return new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
    });
}
/**
 * Parse OAuth callback URL and extract parameters
 * @param url Callback URL
 * @returns Parsed parameters
 */
function parseCallbackURL(url) {
    try {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        return {
            code: params.get('code') || undefined,
            state: params.get('state') || undefined,
            error: params.get('error') || undefined,
            errorDescription: params.get('error_description') || undefined
        };
    }
    catch (error) {
        throw new Error(`Invalid callback URL: ${error}`);
    }
}
/**
 * Handle OAuth error codes
 * @param error Error code
 * @param errorDescription Error description
 * @returns Human-readable error message
 */
function handleOAuthError(error, errorDescription) {
    const errorMessages = {
        'access_denied': 'Access was denied by the user',
        'invalid_request': 'The request is missing a required parameter or is otherwise malformed',
        'invalid_client': 'Client authentication failed',
        'invalid_grant': 'The provided authorization grant is invalid, expired, or revoked',
        'unsupported_grant_type': 'The authorization grant type is not supported',
        'invalid_scope': 'The requested scope is invalid, unknown, or malformed',
        'server_error': 'The authorization server encountered an unexpected condition',
        'temporarily_unavailable': 'The authorization server is currently unable to handle the request'
    };
    const baseMessage = errorMessages[error] || `OAuth error: ${error}`;
    return errorDescription ? `${baseMessage} - ${errorDescription}` : baseMessage;
}
/**
 * Validate PKCE parameters
 * @param codeVerifier Code verifier
 * @param codeChallenge Code challenge
 * @returns True if valid
 */
function validatePKCEParameters(codeVerifier, codeChallenge) {
    try {
        const expectedChallenge = generateCodeChallenge(codeVerifier);
        return expectedChallenge === codeChallenge;
    }
    catch (error) {
        return false;
    }
}
/**
 * Default OAuth scopes for Supabase
 */
exports.DEFAULT_OAUTH_SCOPES = [
    'read:organizations',
    'read:projects',
    'read:api-keys',
    'read:storage',
    'read:functions'
];
/**
 * Supabase OAuth endpoints
 */
exports.SUPABASE_OAUTH_ENDPOINTS = {
    AUTHORIZE: 'https://api.supabase.com/v1/oauth/authorize',
    TOKEN: 'https://api.supabase.com/v1/oauth/token',
    REVOKE: 'https://api.supabase.com/v1/oauth/revoke'
};
