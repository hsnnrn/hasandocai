import { createHash, randomBytes } from 'crypto';

/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * Implements RFC 7636 for secure OAuth flows
 */

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface StateParams {
  state: string;
  nonce: string;
}

/**
 * Generate a cryptographically secure random string for code_verifier
 * @param length Length of the code verifier (43-128 characters recommended)
 * @returns Base64URL encoded random string
 */
export function generateCodeVerifier(length: number = 128): string {
  const bytes = randomBytes(length);
  return base64URLEncode(bytes);
}

/**
 * Generate code challenge from code verifier using SHA256
 * @param codeVerifier The code verifier string
 * @returns Base64URL encoded SHA256 hash
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash('sha256');
  hash.update(codeVerifier);
  return base64URLEncode(hash.digest());
}

/**
 * Generate complete PKCE parameters
 * @param verifierLength Length of the code verifier
 * @returns Complete PKCE parameters
 */
export function generatePKCEParams(verifierLength: number = 128): PKCEParams {
  const codeVerifier = generateCodeVerifier(verifierLength);
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

/**
 * Generate a secure random state parameter
 * @param length Length of the state string
 * @returns Base64URL encoded random string
 */
export function generateState(length: number = 32): string {
  const bytes = randomBytes(length);
  return base64URLEncode(bytes);
}

/**
 * Generate a nonce for additional security
 * @param length Length of the nonce
 * @returns Base64URL encoded random string
 */
export function generateNonce(length: number = 16): string {
  const bytes = randomBytes(length);
  return base64URLEncode(bytes);
}

/**
 * Generate state parameters with nonce
 * @param stateLength Length of the state string
 * @param nonceLength Length of the nonce string
 * @returns State parameters
 */
export function generateStateParams(stateLength: number = 32, nonceLength: number = 16): StateParams {
  return {
    state: generateState(stateLength),
    nonce: generateNonce(nonceLength)
  };
}

/**
 * Base64URL encode a buffer (RFC 4648)
 * @param buffer The buffer to encode
 * @returns Base64URL encoded string
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode a string
 * @param str The Base64URL string to decode
 * @returns Decoded buffer
 */
export function base64URLDecode(str: string): Buffer {
  // Add padding if needed
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return Buffer.from(base64, 'base64');
}

/**
 * Verify code challenge against code verifier
 * @param codeVerifier The original code verifier
 * @param codeChallenge The code challenge to verify
 * @returns True if the challenge matches the verifier
 */
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  const expectedChallenge = generateCodeChallenge(codeVerifier);
  return expectedChallenge === codeChallenge;
}

/**
 * Generate a secure random string for various OAuth purposes
 * @param length Length of the string
 * @param charset Character set to use (default: alphanumeric + safe symbols)
 * @returns Random string
 */
export function generateRandomString(
  length: number = 32,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
): string {
  let result = '';
  const bytes = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  
  return result;
}

/**
 * Validate PKCE parameters
 * @param params PKCE parameters to validate
 * @returns True if parameters are valid
 */
export function validatePKCEParams(params: PKCEParams): boolean {
  // Check code verifier length (43-128 characters)
  if (params.codeVerifier.length < 43 || params.codeVerifier.length > 128) {
    return false;
  }
  
  // Check code challenge method
  if (params.codeChallengeMethod !== 'S256') {
    return false;
  }
  
  // Verify code challenge matches verifier
  return verifyCodeChallenge(params.codeVerifier, params.codeChallenge);
}

/**
 * Generate OAuth authorization URL with PKCE parameters
 * @param baseUrl Base OAuth authorization URL
 * @param clientId OAuth client ID
 * @param redirectUri Redirect URI
 * @param scopes Requested scopes
 * @param state State parameter
 * @param pkceParams PKCE parameters
 * @param additionalParams Additional URL parameters
 * @returns Complete OAuth authorization URL
 */
export function buildOAuthURL(
  baseUrl: string,
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string,
  pkceParams: PKCEParams,
  additionalParams: Record<string, string> = {}
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: pkceParams.codeChallenge,
    code_challenge_method: pkceParams.codeChallengeMethod,
    ...additionalParams
  });
  
  return `${baseUrl}?${params.toString()}`;
}
