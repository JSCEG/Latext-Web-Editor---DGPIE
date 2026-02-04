
// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

// --- Auth Logic (from utils/authUtils.ts) ---
const SESSION_KEY = 'sheet_token';
const EXPIRY_KEY = 'token_expiry';

const setSession = (token, expiresInSeconds = 3600) => {
  const now = Date.now();
  // Buffer of 5 minutes
  const expiryTime = now + (expiresInSeconds * 1000) - (5 * 60 * 1000); 
  
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
  
  return expiryTime;
};

const getSession = () => {
  const token = localStorage.getItem(SESSION_KEY);
  const expiryStr = localStorage.getItem(EXPIRY_KEY);

  if (!token) return null;
  if (token === 'DEMO') return token;

  if (!expiryStr) {
      console.warn('[Auth] No expiry found. Returning token anyway.');
      return token;
  }

  const expiry = parseInt(expiryStr, 10);
  const now = Date.now();

  if (now >= expiry) {
    console.log(`[Auth] Token expired. Now: ${now}, Expiry: ${expiry}`);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }

  return token;
};

// --- Tests ---
console.log('--- Starting Auth Logic Tests ---');

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
};

// Test 1: Set and Get Valid Session
localStorage.clear();
setSession('valid-token', 3600);
assert(getSession() === 'valid-token', 'Should retrieve valid token');

// Test 2: Expiration Logic
localStorage.clear();
// Set session that expires in 10 seconds (minus 5 min buffer = expired immediately?)
// Wait, if expiresInSeconds is 10, then:
// now + 10000 - 300000 = now - 290000. It is already expired.
// The buffer logic makes short tokens expire immediately if < 5 mins.
// Let's verify this behavior.
setSession('short-token', 10); 
assert(getSession() === null, 'Token with short life (< 5 mins) should be treated as expired due to buffer');

// Test 3: Valid Session with Buffer
localStorage.clear();
// 10 minutes = 600s. Buffer 300s. Remaining 300s. Valid.
setSession('long-token', 600);
assert(getSession() === 'long-token', 'Token with > 5 mins life should be valid');

// Test 4: Expiration over time (Mocking Date)
localStorage.clear();
const realDateNow = Date.now;
const startTime = 1000000000000;
global.Date.now = () => startTime;

// Set token for 1 hour (3600s). Expiry = Start + 3600000 - 300000 = Start + 3300000
setSession('time-token', 3600);
assert(getSession() === 'time-token', 'Token valid at start time');

// Advance time by 50 minutes (3000000ms). Should be valid. (3.3M > 3.0M)
global.Date.now = () => startTime + 3000000;
assert(getSession() === 'time-token', 'Token valid after 50 mins');

// Advance time by 56 minutes (3360000ms). Should be expired (Limit is 3.3M)
global.Date.now = () => startTime + 3360000;
assert(getSession() === null, 'Token expired after 56 mins (due to 5 min buffer)');

// Restore Date
global.Date.now = realDateNow;

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
