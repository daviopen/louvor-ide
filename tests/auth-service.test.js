const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  bootstrap,
  buildCurrentReturnUrl,
  friendlyAuthError,
  isGoogleUser,
  isLoginPage,
  sanitizeReturnUrl
} = require('../src/js/modules/auth-service');

const projectRoot = path.resolve(__dirname, '..');

test('aceita somente retornos internos para páginas HTML', () => {
  assert.equal(sanitizeReturnUrl('setlists.html?id=123'), 'setlists.html?id=123');
  assert.equal(sanitizeReturnUrl('/setlist.html#musicas'), 'setlist.html#musicas');
  assert.equal(sanitizeReturnUrl('https://site-malicioso.test/roubar'), 'index.html');
  assert.equal(sanitizeReturnUrl('//site-malicioso.test/roubar'), 'index.html');
  assert.equal(sanitizeReturnUrl('login.html'), 'index.html');
});

test('preserva a página atual sem expor o caminho do servidor', () => {
  const result = buildCurrentReturnUrl({
    pathname: '/src/pages/ver.html',
    search: '?id=musica-1',
    hash: '#cifra'
  });

  assert.equal(result, 'ver.html?id=musica-1#cifra');
});

test('identifica a página de login', () => {
  assert.equal(isLoginPage('/login.html'), true);
  assert.equal(isLoginPage('/src/pages/login.html'), true);
  assert.equal(isLoginPage('/index.html'), false);
});

test('aceita apenas usuários autenticados pelo provedor Google', () => {
  assert.equal(isGoogleUser({ providerData: [{ providerId: 'google.com' }] }), true);
  assert.equal(isGoogleUser({ providerData: [{ providerId: 'password' }] }), false);
  assert.equal(isGoogleUser(null), false);
});

test('traduz erros importantes do Firebase Authentication', () => {
  assert.match(friendlyAuthError({ code: 'auth/unauthorized-domain' }), /autorizado/i);
  assert.match(friendlyAuthError({ code: 'auth/operation-not-allowed' }), /habilitado/i);
  assert.match(friendlyAuthError({ code: 'auth/erro-desconhecido' }), /tente novamente/i);
});

test('redireciona páginas protegidas para o login e preserva o retorno', async () => {
  const storage = new Map();
  let redirect = null;
  let popupCalls = 0;

  const auth = {
    useDeviceLanguage() {},
    getRedirectResult: async () => null,
    onAuthStateChanged(callback) {
      callback(null);
    },
    signOut: async () => null,
    setPersistence: async () => null,
    signInWithPopup: async () => {
      popupCalls += 1;
      return { user: { providerData: [{ providerId: 'google.com' }] } };
    },
    signInWithRedirect: async () => null
  };

  function authFactory() {
    return auth;
  }
  authFactory.Auth = { Persistence: { LOCAL: 'local' } };
  authFactory.GoogleAuthProvider = class GoogleAuthProvider {
    addScope() {}
  };

  const scope = {
    MusicIdeAuth: {},
    firebase: { auth: authFactory },
    location: {
      pathname: '/setlist-view.html',
      search: '?id=123',
      hash: '',
      replace(value) {
        redirect = value;
      }
    },
    sessionStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    document: {
      body: {},
      documentElement: { classList: { add() {}, remove() {} } },
      getElementById() { return null; }
    },
    CustomEvent: class CustomEvent {},
    dispatchEvent() {}
  };

  bootstrap(scope);
  await scope.musicIdeAuthReady;

  assert.equal(redirect, 'login.html');
  assert.equal(storage.get('musicIdeReturnUrl'), 'setlist-view.html?id=123');
  assert.equal(popupCalls, 0);
});

test('abre o Google em popup para funcionar com armazenamento restrito', async () => {
  let popupCalls = 0;
  let persistence = null;

  const auth = {
    useDeviceLanguage() {},
    getRedirectResult: async () => null,
    onAuthStateChanged(callback) { callback(null); },
    signOut: async () => null,
    setPersistence: async value => { persistence = value; },
    signInWithPopup: async () => {
      popupCalls += 1;
      return { user: { providerData: [{ providerId: 'google.com' }] } };
    }
  };

  function authFactory() { return auth; }
  authFactory.Auth = { Persistence: { LOCAL: 'local' } };
  authFactory.GoogleAuthProvider = class GoogleAuthProvider { addScope() {} };

  const scope = {
    MusicIdeAuth: {},
    firebase: { auth: authFactory },
    location: { pathname: '/login.html', search: '', hash: '', replace() {} },
    sessionStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },
    document: {
      body: {},
      documentElement: { classList: { add() {}, remove() {} } },
      getElementById() { return null; }
    },
    CustomEvent: class CustomEvent {},
    dispatchEvent() {}
  };

  bootstrap(scope);
  await scope.MusicIdeAuth.signInWithGoogle();

  assert.equal(persistence, 'local');
  assert.equal(popupCalls, 1);
});

test('todas as páginas principais carregam autenticação e o tema MUSIC.IDE', () => {
  const pages = [
    'index.html',
    'consultar.html',
    'nova-musica.html',
    'ver.html',
    'setlist.html',
    'setlists.html',
    'setlist-view.html'
  ];

  pages.forEach(page => {
    const html = fs.readFileSync(path.join(projectRoot, 'src/pages', page), 'utf8');
    assert.match(html, /firebase-auth\.js/, `${page} sem Firebase Auth`);
    assert.match(html, /auth-service\.js/, `${page} sem proteção de acesso`);
    assert.match(html, /music-ide-theme\.css/, `${page} sem tema MUSIC.IDE`);
  });
});

test('a tela de login oferece o fluxo do Google', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'src/pages/login.html'), 'utf8');
  assert.match(html, /Continuar com Google/);
  assert.match(html, /MusicIdeAuth\.signInWithGoogle/);
  assert.match(html, /firebase-auth\.js/);
});

test('as regras do Firestore exigem autenticação Google', () => {
  const rules = fs.readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8');
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /sign_in_provider == 'google\.com'/);
});
