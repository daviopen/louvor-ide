const test = require('node:test');
const assert = require('node:assert/strict');

const {
  embeddedBrowserMessage,
  googleAuthStrategy,
  isEmbeddedBrowser,
  isIpadOs,
  isMobileBrowser,
  isPopupFallbackError,
  preferredExternalBrowser
} = require('../src/js/modules/mobile-auth-compat');

function navigatorFixture(overrides = {}) {
  return {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0 Safari/537.36',
    platform: 'Win32',
    maxTouchPoints: 0,
    ...overrides
  };
}

test('desktop mantém login Google por popup', () => {
  const navigatorLike = navigatorFixture();
  assert.equal(isMobileBrowser(navigatorLike), false);
  assert.equal(isEmbeddedBrowser(navigatorLike), false);
  assert.equal(googleAuthStrategy(navigatorLike), 'popup');
});

test('Android Chrome usa redirect para evitar popup frágil no celular', () => {
  const navigatorLike = navigatorFixture({
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    maxTouchPoints: 5
  });

  assert.equal(isMobileBrowser(navigatorLike), true);
  assert.equal(googleAuthStrategy(navigatorLike), 'redirect');
  assert.equal(preferredExternalBrowser(navigatorLike), 'Chrome');
});

test('iPhone Safari usa redirect', () => {
  const navigatorLike = navigatorFixture({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    maxTouchPoints: 5
  });

  assert.equal(isMobileBrowser(navigatorLike), true);
  assert.equal(googleAuthStrategy(navigatorLike), 'redirect');
  assert.equal(preferredExternalBrowser(navigatorLike), 'Safari');
});

test('iPadOS com user agent desktop continua sendo tratado como mobile', () => {
  const navigatorLike = navigatorFixture({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 5
  });

  assert.equal(isIpadOs(navigatorLike), true);
  assert.equal(isMobileBrowser(navigatorLike), true);
  assert.equal(googleAuthStrategy(navigatorLike), 'redirect');
});

test('navegadores internos não iniciam OAuth Google e orientam navegador externo', () => {
  const instagramAndroid = navigatorFixture({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Version/4.0 Chrome/120.0 Mobile Safari/537.36 Instagram 330.0.0.0.0 Android',
    platform: 'Linux armv8l',
    maxTouchPoints: 5
  });
  const whatsappIphone = navigatorFixture({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WhatsApp/2.26.16',
    platform: 'iPhone',
    maxTouchPoints: 5
  });

  assert.equal(isEmbeddedBrowser(instagramAndroid), true);
  assert.equal(googleAuthStrategy(instagramAndroid), 'external-browser');
  assert.match(embeddedBrowserMessage(instagramAndroid), /Chrome/);

  assert.equal(isEmbeddedBrowser(whatsappIphone), true);
  assert.equal(googleAuthStrategy(whatsappIphone), 'external-browser');
  assert.match(embeddedBrowserMessage(whatsappIphone), /Safari/);
});

test('popup bloqueado ou ambiente sem suporte cai para redirect; cancelamento voluntário não', () => {
  assert.equal(isPopupFallbackError({ code: 'auth/popup-blocked' }), true);
  assert.equal(isPopupFallbackError({ code: 'auth/cancelled-popup-request' }), true);
  assert.equal(isPopupFallbackError({ code: 'auth/operation-not-supported-in-this-environment' }), true);
  assert.equal(isPopupFallbackError({ code: 'auth/web-storage-unsupported' }), true);
  assert.equal(isPopupFallbackError({ code: 'auth/popup-closed-by-user' }), false);
  assert.equal(isPopupFallbackError({ code: 'auth/network-request-failed' }), false);
});

test('userAgentData.mobile tem precedência quando disponível', () => {
  const navigatorLike = navigatorFixture({
    userAgentData: { mobile: true }
  });
  assert.equal(isMobileBrowser(navigatorLike), true);
  assert.equal(googleAuthStrategy(navigatorLike), 'redirect');
});
