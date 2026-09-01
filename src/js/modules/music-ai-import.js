import MusicAIService from '../../services/music-ai-service.js';
import {
  compactSectionContent,
  getMusicAIImportMetadata,
  mountMusicAIImport as mountBaseMusicAIImport
} from './music-ai-import-base.js';
export { compactSectionContent, composeChordSheet, composeCanonicalChordSheet, formatCapoHeader, resolveReferenceLink } from './music-ai-import-base.js';

// Contrato visual herdado do módulo base: "A IA está analisando a música…", "verificando tom/capotraste",
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

export function composeIdeMusicChordSheet(data = {}) {
  const sections = Array.isArray(data.sections) ? data.sections.filter(section => String(section?.content || '').trim()) : [];
  if (!sections.length) return String(data.chordSheet || '').replace(/^\s*capotraste\s*:.*$/gim, '').trim();

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

  async analyze(input) {
    const result = await this.service.analyze(input);
    const data = result?.data || {};
    const chordSheet = composeIdeMusicChordSheet(data);

    const theme = String(data.theme || '').trim();
    if (theme) {
      const themeField = document.getElementById('tema');
      if (themeField) {
        themeField.value = theme;
        themeField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    return {
      ...result,
      data: {
        ...data,
        chordSheet: escapeCueSeparatorsForLegacyFormatter(chordSheet),
        sections: [],
        chordFormKey: data.originalKey || data.chordFormKey || null,
        capoFret: null
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

  if (topDescription) topDescription.textContent = 'Para obter o resultado mais confiável, informe o link da música no Cifra Club. A IA organiza os dados no padrão do IDE Music para você revisar.';
  if (label) label.textContent = 'Link do Cifra Club';
  if (input) input.placeholder = 'https://www.cifraclub.com.br/artista/musica/';
  if (hint) hint.textContent = 'Entrada esperada: link da música no Cifra Club. Depois da análise, revise tom, cifra, tema e referência antes de salvar.';
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
