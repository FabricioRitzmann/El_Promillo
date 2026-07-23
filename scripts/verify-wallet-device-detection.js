import { detectWalletDevice, preferredWallet } from '../public/js/walletDeviceDetection.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const cases = [
  {
    name: 'iPhone routes to Apple Wallet',
    input: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5
    },
    wallet: 'apple'
  },
  {
    name: 'iPad desktop mode routes to Apple Wallet',
    input: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5
    },
    wallet: 'apple'
  },
  {
    name: 'Samsung Android routes to Google Wallet',
    input: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36',
      platform: 'Android',
      brands: [{ brand: 'Samsung Internet' }],
      maxTouchPoints: 5
    },
    wallet: 'google'
  },
  {
    name: 'Samsung Chrome with Galaxy model routes to Google Wallet',
    input: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/121.0 Mobile Safari/537.36',
      platform: 'Android',
      brands: [{ brand: 'Google Chrome' }],
      maxTouchPoints: 5
    },
    wallet: 'google'
  },
  {
    name: 'Other Android routes to Google Wallet',
    input: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/121.0 Mobile Safari/537.36',
      platform: 'Android',
      brands: [{ brand: 'Google Chrome' }],
      maxTouchPoints: 5
    },
    wallet: 'google'
  },
  {
    name: 'Desktop routes to manual choice',
    input: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/121.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0
    },
    wallet: 'choice'
  }
];

for (const testCase of cases) {
  const result = detectWalletDevice(testCase.input);

  assert(result.wallet === testCase.wallet, `${testCase.name}: expected ${testCase.wallet}, got ${result.wallet}`);
  assert(preferredWallet(testCase.input) === testCase.wallet, `${testCase.name}: preferredWallet mismatch`);
  assert(result.reason, `${testCase.name}: reason missing`);
}

console.log('Wallet Device Detection ist für Apple, Android/Google und manuelle Auswahl abgesichert.');
