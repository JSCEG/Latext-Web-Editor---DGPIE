export const SESSION_KEY = 'sheet_token';
export const EXPIRY_KEY = 'token_expiry';
export const USER_KEY = 'user_profile';

export interface UserProfile {
  name: string;
  email: string;
  photo?: string;
}

export const setSession = (token: string, expiresInSeconds: number = 3600) => {
  const now = Date.now();
  // Subtract a small buffer (e.g., 5 minutes) to be safe against clock skew
  const expiryTime = now + (expiresInSeconds * 1000) - (5 * 60 * 1000); 
  
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
  
  console.log(`[Auth] Session created. Expires at: ${new Date(expiryTime).toISOString()}`);
};

export const getSession = (): string | null => {
  const token = localStorage.getItem(SESSION_KEY);
  const expiryStr = localStorage.getItem(EXPIRY_KEY);

  if (!token) return null;
  
  // If no expiry is stored, assume it's valid (legacy support) or treat as demo/permanent if it's special
  if (token === 'DEMO') return token;

  if (!expiryStr) {
      console.warn('[Auth] No expiry found for token. Treating as potentially stale.');
      // Optional: Force logout if strict security is needed. For now, let it slide but log it.
      // But to fix the user issue, maybe we should invalidate it if we want to be sure?
      // Let's return it but logging warning.
      return token;
  }

  const expiry = parseInt(expiryStr, 10);
  const now = Date.now();

  if (now >= expiry) {
    console.warn(`[Auth] Session expired. Expiry: ${new Date(expiry).toISOString()}, Now: ${new Date(now).toISOString()}`);
    clearSession();
    return null;
  }

  return token;
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(USER_KEY);
  console.log('[Auth] Session cleared.');
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
};

export const getUserProfile = (): UserProfile | null => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};
