const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const lgpd = require('../src/js/modules/lgpd-service.js');
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('consentimento vigente combina versões de termos e privacidade', () => {
  assert.equal(lgpd.TERMS_VERSION, '2026-08-25');
  assert.equal(lgpd.PRIVACY_VERSION, '2026-08-25');
  assert.equal(lgpd.CONSENT_VERSION, 'terms:2026-08-25|privacy:2026-08-25');
});

test('novo usuário ou versão antiga exige novo consentimento', () => {
  assert.equal(lgpd.needsConsent(null), true);
  assert.equal(lgpd.needsConsent({ lgpdConsentVersion: 'old' }), true);
  assert.equal(lgpd.needsConsent({ lgpdConsentVersion: lgpd.CONSENT_VERSION }), false);
});

test('payload do aceite é mínimo, versionado e sem dados de dispositivo', () => {
  const timestamp = { server: true };
  const payload = lgpd.buildConsentPayload({ uid: 'user-1', email: 'ignored@example.com' }, timestamp);
  assert.deepEqual(payload, {
    userId: 'user-1',
    consentVersion: lgpd.CONSENT_VERSION,
    termsVersion: lgpd.TERMS_VERSION,
    privacyVersion: lgpd.PRIVACY_VERSION,
    acceptedAt: timestamp,
    status: 'ACCEPTED',
    source: 'web'
  });
  for (const unnecessary of ['email', 'ip', 'userAgent', 'device', 'location']) {
    assert.equal(Object.hasOwn(payload, unnecessary), false, `${unnecessary} não deve ser coletado`);
  }
});

test('retorno do gate aceita somente páginas locais seguras', () => {
  assert.equal(lgpd.sanitizeReturnUrl('setlists.html?filter=next'), 'setlists.html?filter=next');
  assert.equal(lgpd.sanitizeReturnUrl('https://evil.example/x.html'), 'index.html');
  assert.equal(lgpd.sanitizeReturnUrl('//evil.example/x.html'), 'index.html');
  assert.equal(lgpd.sanitizeReturnUrl('login.html'), 'index.html');
  assert.equal(lgpd.sanitizeReturnUrl('consentimento.html'), 'index.html');
});

test('tela exige ação explícita e não pré-marca consentimento', () => {
  const html = read('src/pages/consentimento.html');
  assert.match(html, /id="lgpd-consent" type="checkbox"/);
  assert.doesNotMatch(html, /id="lgpd-consent"[^>]*\schecked(?:\s|>|=)/i);
  assert.match(html, /id="accept-button"[^>]*disabled/);
  assert.match(html, /Termos de Uso/);
  assert.match(html, /Política de Privacidade/);
});

test('documentação define retenção, inativação, exclusão e histórico', () => {
  const doc = read('docs/LGPD.md');
  assert.match(doc, /Retenção, inativação e exclusão/);
  assert.match(doc, /Consentimentos LGPD/);
  assert.match(doc, /Audit Logs/);
  assert.match(doc, /histórico\/auditoria/i);
  assert.match(doc, /Não registrar IP/);
});

test('shell carrega o gate LGPD nas telas autenticadas', () => {
  const shell = read('src/js/modules/app-shell.js');
  assert.match(shell, /lgpd-service\.js/);
  assert.match(shell, /bootstrapGate/);
});


function createConsentFirestoreScope({ consentExists }) {
  const operations = [];
  const refs = new Map();
  const docRef = (collection, id = 'generated-audit-id') => {
    const key = collection + '/' + id;
    if (!refs.has(key)) refs.set(key, { collection, id, key });
    return refs.get(key);
  };
  const db = {
    collection(name) {
      return {
        doc(id) {
          return docRef(name, id);
        }
      };
    },
    async runTransaction(handler) {
      const transaction = {
        async get(ref) {
          operations.push({ type: 'get', ref: ref.key });
          return { exists: consentExists };
        },
        set(ref, payload) {
          operations.push({ type: 'set', ref: ref.key, payload });
        },
        update(ref, payload) {
          operations.push({ type: 'update', ref: ref.key, payload });
        }
      };
      return handler(transaction);
    }
  };
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP' };
  return {
    scope: { firebase: { firestore } },
    operations
  };
}

test('aceite LGPD cria o documento da versão quando ele ainda não existe', async () => {
  const { scope, operations } = createConsentFirestoreScope({ consentExists: false });
  const user = { uid: 'user-1' };

  await lgpd.recordConsent(scope, user);

  assert.deepEqual(
    operations.map(item => [item.type, item.ref]),
    [
      ['get', 'lgpdConsents/user-1__terms-2026-08-25-privacy-2026-08-25'],
      ['set', 'lgpdConsents/user-1__terms-2026-08-25-privacy-2026-08-25'],
      ['set', 'auditLogs/generated-audit-id'],
      ['update', 'users/user-1']
    ]
  );
});

test('aceite LGPD é idempotente quando a mesma versão já existe', async () => {
  const { scope, operations } = createConsentFirestoreScope({ consentExists: true });
  const user = { uid: 'user-1' };

  await lgpd.recordConsent(scope, user);

  const consentWrites = operations.filter(item => item.type === 'set' && item.ref.startsWith('lgpdConsents/'));
  assert.equal(consentWrites.length, 0, 'consentimento histórico existente não deve ser sobrescrito');
  assert.deepEqual(
    operations.map(item => [item.type, item.ref]),
    [
      ['get', 'lgpdConsents/user-1__terms-2026-08-25-privacy-2026-08-25'],
      ['set', 'auditLogs/generated-audit-id'],
      ['update', 'users/user-1']
    ]
  );
  const profileUpdate = operations.find(item => item.type === 'update' && item.ref === 'users/user-1');
  assert.equal(profileUpdate.payload.lgpdConsentVersion, lgpd.CONSENT_VERSION);
  assert.equal(profileUpdate.payload.lgpdConsentAcceptedAt, 'SERVER_TIMESTAMP');
});
