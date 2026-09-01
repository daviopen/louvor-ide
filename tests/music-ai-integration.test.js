const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const controller = fs.readFileSync(path.join(root, 'src/js/pages/song-form.js'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/services/music-ai-provider.js'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'src/services/music-ai-contract.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/styles/music-ai-import.css'), 'utf8');
const makefile = fs.readFileSync(path.join(root, 'Makefile'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

test('fluxo mantém cadastro manual e adiciona Importar com IA no mesmo formulário', () => {
  assert.match(controller, /Cadastro manual/);
  assert.match(controller, /Importar com IA/);
  assert.match(controller, /ai-import-panel/);
  assert.match(controller, /applyAISuggestion/);
  assert.match(controller, /form\.addEventListener\('submit', save\)/);
  assert.doesNotMatch(provider, /musicRepository|\.collection\(['"]songs['"]\)/);
});

test('IA nunca salva automaticamente e exige revisão explícita', () => {
  assert.match(controller, /nada é salvo até você revisar/i);
  assert.match(controller, /Sugestões preenchidas — revise antes de salvar/);
  const analyzeBody = controller.slice(controller.indexOf('async function analyzeWithAI'), controller.indexOf('async function loadMinisters'));
  assert.doesNotMatch(analyzeBody, /musicRepository\.create|musicRepository\.update/);
  assert.match(analyzeBody, /applyAISuggestion/);
});

test('provider usa Firebase AI Logic no cliente, App Check e Gemini Developer API sem backend próprio', () => {
  assert.match(provider, /firebase-ai\.js/);
  assert.match(provider, /firebase-app-check\.js/);
  assert.match(provider, /ReCaptchaEnterpriseProvider/);
  assert.match(provider, /GoogleAIBackend/);
  assert.match(provider, /getGenerativeModel/);
  assert.match(provider, /responseMimeType:\s*'application\/json'/);
  assert.match(provider, /responseSchema/);
  assert.match(provider, /\[\{ urlContext: \{\} \}\]/);
  assert.match(provider, /tools,/);
  assert.doesNotMatch(provider, /functions\.httpsCallable|cloudfunctions|serviceAccount|privateKey/);
});

test('integração possui fallback para texto/manual, timeout, quota e proteção contra duplicação', () => {
  assert.match(provider, /REQUEST_COOLDOWN_MS/);
  assert.match(provider, /this\.inflight/);
  assert.match(provider, /TIMEOUT/);
  assert.match(provider, /QUOTA/);
  assert.match(provider, /APP_CHECK/);
  assert.match(provider, /fallbackUsed/);
  assert.match(controller, /Continuar manualmente/);
  assert.match(controller, /sem perder o que já digitou/);
});

test('uso de IA exige usuário autenticado com EDIT em Músicas', () => {
  assert.match(controller, /currentUser\(\)/);
  assert.match(controller, /profile\.active !== true/);
  assert.match(controller, /profile\.permissions\?\.songs/);
  assert.match(controller, /=== 'EDIT'/);
  assert.match(controller, /SUPER_ADMIN/);
});

test('auditoria técnica não envia prompt, cifra ou letra nas tentativas de IA', () => {
  assert.match(controller, /SONG_AI_IMPORT_SUCCEEDED/);
  assert.match(controller, /SONG_AI_IMPORT_FAILED/);
  assert.match(controller, /hasPastedText/);
  assert.match(controller, /hasSourceUrl/);
  const auditArea = controller.slice(controller.indexOf("await recordAIUsage('SONG_AI_IMPORT_SUCCEEDED'"), controller.indexOf('} finally {', controller.indexOf("await recordAIUsage('SONG_AI_IMPORT_SUCCEEDED'")));
  assert.doesNotMatch(auditArea, /pastedText:\s*input|chordSheet|lyrics|cifra|letra/);
});

test('modelo de dados separa originalKey, execução no setlist e preferredKey por ministro', () => {
  assert.match(controller, /originalKey/);
  assert.match(controller, /replaceMinisterKeys/);
  assert.match(controller, /preferredKey/);
  assert.doesNotMatch(controller, /executionKey\s*:/);
  assert.match(contract, /MUSIC_AI_SCHEMA_VERSION/);
});

test('build injeta apenas configuração pública de App Check e modelo', () => {
  assert.match(envExample, /VITE_FIREBASE_APPCHECK_SITE_KEY/);
  assert.match(envExample, /VITE_FIREBASE_AI_MODEL/);
  assert.match(envExample, /SITE KEY pública/);
  assert.match(makefile, /VITE_FIREBASE_APPCHECK_SITE_KEY/);
  assert.match(makefile, /VITE_FIREBASE_AI_MODEL/);
  assert.doesNotMatch(envExample, /RECAPTCHA_SECRET|PRIVATE_KEY|SERVICE_ACCOUNT/);
});

test('UI assistida respeita touch targets e breakpoint mobile', () => {
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /@media \(max-width: 600px\)/);
  assert.match(styles, /width:\s*100%/);
});
