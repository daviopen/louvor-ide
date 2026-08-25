const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  bootstrap,
  buildCurrentReturnUrl,
  friendlyAuthError,
  isAllowedUser,
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

test('aceita usuários Google ou e-mail/senha', () => {
  assert.equal(isAllowedUser({ providerData: [{ providerId: 'google.com' }] }), true);
  assert.equal(isAllowedUser({ providerData: [{ providerId: 'password' }] }), true);
  assert.equal(isAllowedUser({ providerData: [{ providerId: 'anonymous' }] }), false);
  assert.equal(isAllowedUser(null), false);
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

test('entra com e-mail e senha usando persistência local', async () => {
  let receivedCredentials = null;
  let persistence = null;

  const auth = {
    useDeviceLanguage() {},
    getRedirectResult: async () => null,
    onAuthStateChanged(callback) { callback(null); },
    signOut: async () => null,
    setPersistence: async value => { persistence = value; },
    signInWithEmailAndPassword: async (email, password) => {
      receivedCredentials = { email, password };
      return { user: { providerData: [{ providerId: 'password' }] } };
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
  await scope.MusicIdeAuth.signInWithEmail(' equipe@music.ide ', 'senha-segura');

  assert.equal(persistence, 'local');
  assert.deepEqual(receivedCredentials, {
    email: 'equipe@music.ide',
    password: 'senha-segura'
  });
});

test('envia recuperação de senha sem revelar se a conta existe', async () => {
  let resetEmail = null;
  let message = null;
  const messageElement = { dataset: {}, hidden: true, textContent: '' };

  const auth = {
    useDeviceLanguage() {},
    getRedirectResult: async () => null,
    onAuthStateChanged(callback) { callback(null); },
    signOut: async () => null,
    sendPasswordResetEmail: async email => { resetEmail = email; }
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
      getElementById(id) { return id === 'auth-message' ? messageElement : null; }
    },
    CustomEvent: class CustomEvent {},
    dispatchEvent() {}
  };

  bootstrap(scope);
  await scope.MusicIdeAuth.sendPasswordReset(' pessoa@music.ide ');
  message = messageElement.textContent;

  assert.equal(resetEmail, 'pessoa@music.ide');
  assert.match(message, /se houver uma conta/i);
});

test('todas as páginas principais carregam autenticação e o tema IDE Music', () => {
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
    assert.match(html, /music-ide-theme\.css/, `${page} sem tema IDE Music`);
  });
});

test('a tela de login oferece Google, e-mail/senha e recuperação', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'src/pages/login.html'), 'utf8');
  assert.match(html, /Continuar com Google/);
  assert.match(html, /MusicIdeAuth\.signInWithGoogle/);
  assert.match(html, /Entrar com e-mail/);
  assert.match(html, /MusicIdeAuth\.signInWithEmail/);
  assert.match(html, /MusicIdeAuth\.sendPasswordReset/);
  assert.match(html, /firebase-auth\.js/);
});

test('as regras do Firestore aceitam somente Google ou e-mail\/senha', () => {
  const rules = fs.readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8');
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /'google\.com'/);
  assert.match(rules, /'password'/);
});
