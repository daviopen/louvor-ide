import MusicAIService from '../../services/music-ai-service.js';
import { normalizeMusicAIResponse, extractYouTubeVideoId } from '../../services/music-ai-schema.js';
import {
  compactSectionContent,
  getMusicAIImportMetadata,
  mountMusicAIImport as mountBaseMusicAIImport
} from './music-ai-import-base.js';
export { compactSectionContent, composeChordSheet, composeCanonicalChordSheet, formatCapoHeader, resolveReferenceLink } from './music-ai-import-base.js';

// Contrato visual herdado do módulo base: "A IA está analisando a música…", "confirmando o tom real",
// .ai-import__thinking, aria-busy e o rótulo de ação "IA analisando" permanecem obrigatórios.
const SECTION_LABELS = Object.freeze({
  intro: 'Intro',
  verse: 'Estrofe',
  pre_chorus: 'Pré-Refrão',
  chorus: 'Refrão',
  bridge: 'Ponte',
  instrumental: 'Instrumental',
  outro: 'Final'
});

const SHARP_KEYS = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const FLAT_KEYS = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
const NOTE_INDEX = Object.freeze({
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
});
const CHORD_TOKEN_RE = /^(?:[A-G](?:#|b)?)(?:(?:m|maj|min|dim|aug|sus|add|M)?(?:\d{0,2})?(?:[#b+\-º°()]*)?)(?:\/[A-G](?:#|b)?)?$/u;

export { getMusicAIImportMetadata };

function normalizeLabel(value) {
  return String(value || '').trim().replace(/^\[|\]$/g, '').replace(/:+$/, '').trim();
}

function canonicalLabel(section, index) {
  const canonical = SECTION_LABELS[String(section?.type || '').trim().toLowerCase()];
  const provided = normalizeLabel(section?.label);
  if (!canonical) return provided || `Parte ${index + 1}`;
  const suffix = provided.match(/(?:^|\s)(\d+)$/)?.[1];
  return suffix ? `${canonical} ${suffix}` : canonical;
}

function sectionKey(section, label) {
  const type = String(section?.type || '').trim().toLowerCase();
  if (SECTION_LABELS[type]) return type;
  return normalizeLabel(label).toLocaleLowerCase('pt-BR').replace(/\s+\d+$/, '') || 'other';
}

function normalizeKeyRoot(value) {
  const match = String(value || '').trim().match(/^([A-Ga-g])([#b]?)/);
  if (!match) return null;
  const key = `${match[1].toUpperCase()}${match[2]}`;
  return Object.prototype.hasOwnProperty.call(NOTE_INDEX, key) ? key : null;
}

function sourceKeyFrom(data = {}) {
  const explicit = normalizeKeyRoot(data.chordFormKey);
  if (explicit) return explicit;
  const target = normalizeKeyRoot(data.originalKey);
  const fret = Number(data.capoFret);
  if (!target || !Number.isInteger(fret) || fret <= 0 || fret > 12) return target;
  const sourceIndex = (NOTE_INDEX[target] - fret + 12) % 12;
  return String(data.originalKey || '').includes('b') ? FLAT_KEYS[sourceIndex] : SHARP_KEYS[sourceIndex];
}

function transposeChord(chord, fromKey, toKey) {
  const from = normalizeKeyRoot(fromKey);
  const to = normalizeKeyRoot(toKey);
  if (!from || !to || from === to) return chord;

  const parsed = String(chord || '').match(/^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!parsed) return chord;

  const steps = (NOTE_INDEX[to] - NOTE_INDEX[from] + 12) % 12;
  const spelling = to.includes('b') ? FLAT_KEYS : SHARP_KEYS;
  const transposeRoot = root => spelling[(NOTE_INDEX[root] + steps) % 12] || root;
  return `${transposeRoot(parsed[1])}${parsed[2]}${parsed[3] ? `/${transposeRoot(parsed[3])}` : ''}`;
}

function transposeChordText(text, data = {}) {
  const fromKey = sourceKeyFrom(data);
  const toKey = normalizeKeyRoot(data.originalKey);
  if (!fromKey || !toKey) return String(text || '');

  return String(text || '').split(/(\s+)/).map(token => {
    const stripped = token.trim();
    return stripped && CHORD_TOKEN_RE.test(stripped) ? transposeChord(stripped, fromKey, toKey) : token;
  }).join('');
}

function transposeCompactContent(content, data = {}) {
  return String(content || '').split('\n').map(line => {
    const cueMatch = line.match(/^(.+?)\s+-\s+(.+)$/);
    if (cueMatch) return `${cueMatch[1].trim()} - ${transposeChordText(cueMatch[2], data).trim()}`;
    return transposeChordText(line, data).trim();
  }).join('\n').trim();
}

function harmonicIdentity(content) {
  return String(content || '')
    .replace(/^.*?\s-\s/gm, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function lyricalIdentity(content) {
  return String(content || '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function lineIsChordOnly(line) {
  const tokens = String(line || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every(token => CHORD_TOKEN_RE.test(token.replace(/^[\[({|]+/, '').replace(/[\])},;:|]+$/, '')));
}

export function hasIdeMusicVocalCues(data = {}) {
  const sections = Array.isArray(data.sections) ? data.sections : [];
  return sections.some(section => {
    const type = String(section?.type || '').trim().toLowerCase();
    if (['intro', 'instrumental', 'outro'].includes(type)) return false;
    return String(section?.content || '').split(/\r?\n/).some(line => {
      const text = line.trim();
      if (!text || lineIsChordOnly(text)) return false;
      if (/^[\[\(]?(?:intro|estrofe|verso|pré-refrão|pre-refrão|refrão|ponte|final|instrumental)[\]\)]?\s*:??$/iu.test(text)) return false;
      return /\p{L}/u.test(text);
    });
  });
}

function isYoutubeWatchUrl(value) {
  return Boolean(extractYouTubeVideoId(String(value || '')));
}

function mergeRecoveredSections(data = {}, recovered = {}) {
  if (!hasIdeMusicVocalCues(recovered)) return data;
  return {
    ...data,
    sections: recovered.sections,
    provenance: {
      ...(data.provenance || {}),
      chordSheet: recovered?.provenance?.chordSheet || data?.provenance?.chordSheet || 'segunda leitura focada nas pistas vocais da cifra'
    }
  };
}

function mergeRecoveredVideo(data = {}, recovered = {}) {
  if (data?.video?.url || data?.video?.videoId) return data;
  const videoUrl = String(recovered?.video?.url || '').trim();
  const videoId = String(recovered?.video?.videoId || '').trim() || extractYouTubeVideoId(videoUrl);
  if (!videoId && !isYoutubeWatchUrl(videoUrl)) return data;
  const id = videoId || extractYouTubeVideoId(videoUrl);
  if (!id) return data;
  return {
    ...data,
    video: { provider: 'youtube', videoId: id, url: `https://www.youtube.com/watch?v=${id}` },
    provenance: {
      ...(data.provenance || {}),
      video: recovered?.provenance?.video || 'busca complementar no YouTube por música e artista'
    }
  };
}

export function composeIdeMusicChordSheet(data = {}) {
  const sections = Array.isArray(data.sections) ? data.sections.filter(section => String(section?.content || '').trim()) : [];
  if (!sections.length) {
    const rawChordSheet = String(data.chordSheet || '').replace(/^\s*capotraste\s*:.*$/gim, '').trim();
    return transposeCompactContent(rawChordSheet, data);
  }

  const groups = [];
  const byKey = new Map();

  sections.forEach((section, index) => {
    const label = canonicalLabel(section, index);
    const compact = compactSectionContent(section.content, label);
    if (!compact) return;
    const content = transposeCompactContent(compact, data);
    if (!content) return;

    const key = sectionKey(section, label);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: SECTION_LABELS[key] || normalizeLabel(label).replace(/\s+\d+$/, '') || 'Parte', variants: [] };
      byKey.set(key, group);
      groups.push(group);
    }

    const identity = key === 'verse' ? lyricalIdentity(content) : harmonicIdentity(content);
    if (group.variants.some(variant => variant.identity === identity)) return;
    group.variants.push({ content, identity });
  });

  return groups.filter(group => group.variants.length).map(group => {
    if (group.key === 'verse' && group.variants.length > 1) {
      return group.variants.map((variant, index) => `${group.label} ${index + 1}:\n${variant.content}`).join('\n\n');
    }
    return `${group.label}:\n${group.variants.map(variant => variant.content).join('\n')}`;
  }).join('\n\n');
}

function escapeCueSeparatorsForLegacyFormatter(chordSheet) {
  return String(chordSheet || '').replace(/\s-\s/g, ' — ');
}

class EnhancedMusicAIService {
  constructor(service = new MusicAIService()) {
    this.service = service;
  }

  async recoverVocalCues(data, input) {
    if (!input?.sourceUrl || hasIdeMusicVocalCues(data) || !this.service?.provider?.analyzeSong) return data;
    try {
      const raw = await this.service.provider.analyzeSong({
        ...input,
        sourceType: 'source-url',
        pastedText: [
          'REVISÃO DE FORMATAÇÃO IDE MUSIC.',
          'A primeira leitura encontrou os acordes, mas perdeu as pistas vocais.',
          'Leia novamente a mesma página e concentre-se em sections.',
          'Para Estrofe, Pré-Refrão, Refrão e Ponte, cada linha deve conter SOMENTE 2 ou 3 palavras iniciais da frase como pista visual e os acordes correspondentes daquela frase.',
          'Exemplo de formato: "A Cristo - Ab  Eb/G". Não copie letra completa e não invente palavras ou acordes.',
          'Intro, Instrumental e Final podem permanecer somente com acordes.'
        ].join(' ')
      });
      return mergeRecoveredSections(data, normalizeMusicAIResponse(raw));
    } catch (error) {
      console.warn('Recuperação das pistas vocais não encontrou evidência utilizável:', error?.code || error?.message || error);
      return data;
    }
  }

  async recoverVideo(data) {
    if (data?.video?.url || data?.video?.videoId || !this.service?.provider?.analyzeSong) return data;
    const title = String(data?.title || '').trim();
    const artist = String(data?.artist || '').trim();
    if (!title || !artist) return data;

    const query = encodeURIComponent(`${title} ${artist}`);
    try {
      const raw = await this.service.provider.analyzeSong({
        rawInput: `https://www.youtube.com/results?search_query=${query}`,
        sourceUrl: `https://www.youtube.com/results?search_query=${query}`,
        youtubeUrl: null,
        sourceType: 'source-url',
        songQuery: null,
        songIdentity: null,
        manualBpm: null,
        pastedText: [
          `BUSCA DE VÍDEO PARA: ${title} — ${artist}.`,
          'Use esta página somente para localizar um resultado real do YouTube que corresponda claramente ao mesmo título e artista.',
          'Retorne video.url/video.videoId somente quando houver correspondência comprovável. Não invente ID e não use a URL da página de resultados como vídeo.'
        ].join(' ')
      });
      return mergeRecoveredVideo(data, normalizeMusicAIResponse(raw));
    } catch (error) {
      console.warn('Busca complementar do vídeo não encontrou evidência utilizável:', error?.code || error?.message || error);
      return data;
    }
  }

  async analyze(input) {
    const result = await this.service.analyze(input);
    let data = result?.data || {};
    data = await this.recoverVocalCues(data, result?.input || {});
    data = await this.recoverVideo(data);

    const sourceChordSheet = String(data.chordSheet || '').trim() || null;
    const canonicalChordSheet = escapeCueSeparatorsForLegacyFormatter(composeIdeMusicChordSheet(data));

    return {
      ...result,
      data: {
        ...data,
        sourceChordSheet,
        canonicalChordSheet: canonicalChordSheet || null,
        chordSheet: canonicalChordSheet || sourceChordSheet,
        sections: []
      }
    };
  }
}

function tunePanelForCifraClub() {
  const panel = document.querySelector('.ai-import');
  if (!panel) return;
  const topDescription = panel.querySelector('.ai-import__top p');
  const label = panel.querySelector('label[for="ai-universal-input"]');
  const input = panel.querySelector('#ai-universal-input');
  const hint = panel.querySelector('.ai-import__hint');
  const examples = panel.querySelector('.ai-import__examples');

  if (topDescription) topDescription.textContent = 'Para obter o resultado mais confiável, informe o link da música no Cifra Club. A IA identifica a fonte e o aplicativo valida tom, capotraste e acordes antes de você aplicar a sugestão.';
  if (label) label.textContent = 'Link do Cifra Club';
  if (input) input.placeholder = 'https://www.cifraclub.com.br/artista/musica/';
  if (hint) hint.textContent = 'Entrada esperada: link da música no Cifra Club. Primeiro você verá a revisão de tom, capotraste, forma, vídeo e fonte; depois decide se aplica ao formulário.';
  if (examples) examples.innerHTML = '<span><i class="fa-solid fa-link" aria-hidden="true"></i> Cifra Club</span>';
}

function preserveCueSeparator() {
  const chordField = document.getElementById('cifra');
  if (!chordField) return;
  chordField.addEventListener('input', () => {
    if (chordField.value.includes(' — ')) chordField.value = chordField.value.replaceAll(' — ', ' - ');
  });
}

export function mountMusicAIImport({ service = new MusicAIService() } = {}) {
  mountBaseMusicAIImport({ service: new EnhancedMusicAIService(service) });
  tunePanelForCifraClub();
  preserveCueSeparator();
}

export default mountMusicAIImport;