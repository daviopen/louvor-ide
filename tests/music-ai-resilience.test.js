import test from 'node:test';
import assert from 'node:assert/strict';
import { FirebaseMusicAIProvider, classifyError } from '../src/services/firebase-music-ai-provider.js';
import { MusicAIService } from '../src/services/music-ai-service.js';
import { EnhancedMusicAIService } from '../src/js/modules/music-ai-import.js';
import { runMusicAIRequest, assertMusicAIRequest } from '../src/services/music-ai-request.js';

const url = 'https://www.cifraclub.com.br/hillsong-brasil/eu-me-rendo-i-surrender/';
const input = { sourceType: 'source-url', sourceUrl: url };

test('AbortError/código 20 é timeout; quota e App Check permanecem distintos', () => {
  assert.equal(classifyError(new DOMException('aborted', 'AbortError')), 'TIMEOUT');
  assert.equal(classifyError({ code: 20 }), 'TIMEOUT');
  assert.equal(classifyError({ message: '429 quota' }), 'QUOTA');
  assert.equal(classifyError({ message: '403 appcheck' }), 'APP_CHECK');
});

test('fonte não recuperada produz identidade parcial sem cifra inventada nem nova chamada', async () => {
  const provider = new FirebaseMusicAIProvider();
  let calls = 0;
  provider._loadModel = async () => ({ generateContent: async () => {
    calls++;
    return { response: { text: () => JSON.stringify({ title: 'invenção', originalKey: 'G', chordSheet: 'G C D' }) } };
  } });
  const result = await provider.analyzeSong(input);
  assert.equal(calls, 1);
  assert.equal(result.provenance.sourceRead, 'unavailable');
  assert.equal(result.originalKey, null);
  assert.equal(result.chordSheet, null);
  assert.notEqual(result.title, 'invenção');
});

test('leitura confirmada preserva cifra e origem', async () => {
  const provider = new FirebaseMusicAIProvider();
  provider._loadModel = async () => ({ generateContent: async () => ({ response: {
    text: () => JSON.stringify({ title: 'Teste', originalKey: 'G', chordSheet: 'G C D' }),
    candidates: [{ urlContextMetadata: { urlMetadata: [{ retrievedUrl: url, urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' }] } }]
  } }) });
  assert.equal((await provider.analyzeSong(input)).chordSheet, 'G C D');
});

test('erro de segurança não tenta inferir cifra nem trocar de modelo', async () => {
  const provider = new FirebaseMusicAIProvider();
  let calls = 0;
  provider._analyzePrimary = async () => { calls++; throw { message: '403 appcheck' }; };
  const service = new MusicAIService(provider, { fallbackProvider: { analyzeSong: () => assert.fail('fallback indevido') } });
  await assert.rejects(service.analyze({ rawInput: url }), { code: 'APP_CHECK' });
  assert.equal(calls, 1);
});

test('prazo global encerra espera, descarta progresso atrasado e bloqueia novas chamadas', async () => {
  let scoped;
  let finish;
  const progress = [];
  const pending = runMusicAIRequest({ onProgress: event => progress.push(event) }, async value => {
    scoped = value;
    await new Promise(resolve => { finish = resolve; });
    value.onProgress({ message: 'atrasado' });
    assertMusicAIRequest(value);
  }, { timeoutMs: 15 });
  await assert.rejects(pending, { code: 'TIMEOUT' });
  assert.throws(() => assertMusicAIRequest(scoped), { code: 'TIMEOUT' });
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(progress, []);
});

test('recuperação opcional expirada não fecha o orçamento do resultado principal', async () => {
  const result = await runMusicAIRequest({}, async scoped => {
    await assert.rejects(runMusicAIRequest(scoped, () => new Promise(() => {}), { child: true, timeoutMs: 5 }), { code: 'TIMEOUT' });
    assertMusicAIRequest(scoped);
    return 'resultado preservado';
  }, { timeoutMs: 100 });
  assert.equal(result, 'resultado preservado');
});

test('identidade parcial não inicia recuperação de pistas ou vídeo', async () => {
  const enhanced = new EnhancedMusicAIService({ analyze: async () => ({ data: {
    title: 'Eu me rendo', artist: 'Hillsong', provenance: { sourceRead: 'unavailable' }
  }, input }) });
  enhanced.recoverVocalCues = () => assert.fail('recuperação indevida');
  enhanced.recoverVideo = () => assert.fail('recuperação indevida');
  const result = await enhanced.analyze({ rawInput: url });
  assert.equal(result.data.provenance.sourceRead, 'unavailable');
  assert.equal(result.data.chordSheet, null);
});


test('source URL indisponível troca de modelo antes de aceitar identidade parcial', async () => {
  const primary = new FirebaseMusicAIProvider({ model: 'gemini-3.8-flash' });
  const fallback = new FirebaseMusicAIProvider({ model: 'gemini-3.5-flash-lite' });
  let primaryCalls = 0;
  let fallbackCalls = 0;

  primary._analyzePrimary = async () => {
    primaryCalls++;
    const error = new Error('URL context unavailable');
    error.code = 'SOURCE_UNAVAILABLE';
    throw error;
  };
  fallback._analyzePrimary = async () => {
    fallbackCalls++;
    return {
      title: 'Eu Me Rendo',
      artist: 'Hillsong Brasil',
      originalKey: 'C',
      chordSheet: 'C G Am F C G Am F'
    };
  };

  const service = new MusicAIService(primary, { fallbackProvider: fallback });
  const result = await service.analyze({ rawInput: url });
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 1);
  assert.equal(result.provider.model, 'gemini-3.5-flash-lite');
  assert.equal(result.data.chordSheet, 'C G Am F C G Am F');
});

test('falha transitória repete modelo primário uma vez antes do fallback', async () => {
  let primaryCalls = 0;
  const primary = {
    model: 'primary',
    analyzeSong: async () => {
      primaryCalls++;
      if (primaryCalls < 2) {
        const error = new Error('temporary unavailable');
        error.code = 'UNAVAILABLE';
        throw error;
      }
      return { title: 'Teste' };
    },
    getMetadata: () => ({ provider: 'test', model: 'primary' })
  };
  const service = new MusicAIService(primary);
  const result = await service.analyze({ rawInput: 'Intro:\nC G Am F' });
  assert.equal(primaryCalls, 2);
  assert.equal(result.data.title, 'Teste');
});
