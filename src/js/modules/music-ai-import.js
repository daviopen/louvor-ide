import MusicAIService from '../../services/music-ai-service.js';

let importMetadata = null;

const SECTION_LABELS = Object.freeze({
  intro: 'Intro',
  verse: 'Estrofe',
  pre_chorus: 'Pré-Refrão',
  chorus: 'Refrão',
  bridge: 'Ponte',
  instrumental: 'Instrumental',
  outro: 'Final'
});

const CHORD_TOKEN_RE = /^(?:[A-G](?:#|b)?)(?:(?:m|maj|min|dim|aug|sus|add|M)?(?:\d{0,2})?(?:[#b+\-º°()]*)?)(?:\/[A-G](?:#|b)?)?$/u;
const DETAILED_CHORD_THRESHOLD = 5;
const SHARP_KEYS = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const FLAT_KEYS = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
const NOTE_INDEX = Object.freeze({
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11
});

export function getMusicAIImportMetadata() {
  return importMetadata ? { ...importMetadata } : null;
}

function injectStyles() {
  if (document.getElementById('music-ai-import-styles')) return;
  const style = document.createElement('style');
  style.id = 'music-ai-import-styles';
  style.textContent = `
    .ai-import { margin-bottom: var(--ide-space-5); padding: var(--ide-space-5); border: 1px solid var(--ide-border); border-radius: var(--ide-radius-xl); background: var(--ide-surface-secondary); }
    .ai-import__top { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--ide-space-4); }
    .ai-import__top h2 { margin:0; color:var(--ide-text-primary); font-size:var(--ide-font-size-lg); }
    .ai-import__top p { margin:6px 0 0; color:var(--ide-text-secondary); font-size:var(--ide-font-size-sm); line-height:1.5; }
    .ai-import__toggle { flex:none; min-height:44px; padding:10px 16px; border:1px solid var(--ide-border-strong); border-radius:999px; background:var(--ide-surface); color:var(--ide-text-primary); font:inherit; font-weight:700; cursor:pointer; }
    .ai-import__body { display:none; margin-top:var(--ide-space-5); }
    .ai-import__body.open { display:block; }
    .ai-import__field { display:flex; flex-direction:column; gap:8px; }
    .ai-import__field label { color:var(--ide-text-primary); font-size:var(--ide-font-size-sm); font-weight:700; }
    .ai-import__field textarea { width:100%; min-height:132px; padding:14px; border:1px solid var(--ide-border-strong); border-radius:var(--ide-radius-md); background:var(--ide-surface); color:var(--ide-text-primary); font:inherit; resize:vertical; line-height:1.5; }
    .ai-import__field textarea:focus { outline:2px solid color-mix(in srgb, var(--ide-primary) 45%, transparent); outline-offset:2px; border-color:var(--ide-primary); }
    .ai-import__hint,.ai-import__state { color:var(--ide-text-secondary); font-size:var(--ide-font-size-xs); line-height:1.5; }
    .ai-import__examples { display:flex; flex-wrap:wrap; gap:6px 10px; margin-top:2px; color:var(--ide-text-secondary); font-size:var(--ide-font-size-xs); }
    .ai-import__examples span { display:inline-flex; align-items:center; gap:5px; }
    .ai-import__actions { display:flex; align-items:center; gap:var(--ide-space-3); margin-top:var(--ide-space-4); flex-wrap:wrap; }
    .ai-import__analyze { min-height:44px; padding:10px 18px; border:1px solid var(--ide-primary); border-radius:999px; background:var(--ide-primary); color:var(--ide-primary-ink); font:inherit; font-weight:800; cursor:pointer; }
    .ai-import__analyze:disabled { opacity:.72; cursor:wait; }
    .ai-import__thinking[hidden] { display:none; }
    .ai-import__thinking { display:flex; align-items:center; gap:var(--ide-space-4); margin-top:var(--ide-space-4); padding:16px; border:1px solid var(--ide-border-strong); border-radius:var(--ide-radius-lg); background:var(--ide-surface); color:var(--ide-text-primary); }
    .ai-import__thinking-icon { width:36px; height:36px; flex:0 0 36px; display:grid; place-items:center; border-radius:50%; background:var(--ide-surface-secondary); color:var(--ide-primary); }
    .ai-import__thinking-icon i { animation:ai-import-spin 1s linear infinite; }
    .ai-import__thinking strong { display:block; margin-bottom:3px; font-size:var(--ide-font-size-sm); }
    .ai-import__thinking span { display:block; color:var(--ide-text-secondary); font-size:var(--ide-font-size-xs); line-height:1.45; }
    .ai-import__review { margin-top:var(--ide-space-4); padding:12px 14px; border-left:4px solid var(--ide-primary); border-radius:var(--ide-radius-md); background:var(--ide-surface); color:var(--ide-text-primary); font-size:var(--ide-font-size-sm); line-height:1.5; }
    @keyframes ai-import-spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion:reduce){.ai-import__thinking-icon i{animation:none}}
    @media (max-width:700px){.ai-import__top{flex-direction:column}.ai-import__toggle{width:100%}.ai-import__analyze{width:100%}.ai-import__thinking{align-items:flex-start}}
  `;
  document.head.appendChild(style);
}

function setValue(id, value) {
  if (value === null || value === undefined || value === '') return false;
  const element = document.getElementById(id);
  if (!element) return false;
  element.value = String(value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function normalizedLabel(value) {
  return String(value || '').trim().replace(/^\[|\]$/g, '').replace(/:+$/, '').trim();
}

function getSectionLabel(section, index) {
  const canonical = SECTION_LABELS[section?.type] || '';
  const provided = normalizedLabel(section?.label);
  if (!canonical) return provided || `Parte ${index + 1}`;

  const numericSuffix = provided.match(/(?:^|\s)(\d+)$/)?.[1];
  return numericSuffix ? `${canonical} ${numericSuffix}` : canonical;
}

function cleanSectionContent(content, label) {
  const lines = String(content || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+$/g, ''));

  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();

  if (lines.length && normalizedLabel(lines[0]).toLocaleLowerCase('pt-BR') === normalizedLabel(label).toLocaleLowerCase('pt-BR')) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeChordToken(token) {
  const normalized = String(token || '')
    .trim()
    .replace(/^[\[({|]+/, '')
    .replace(/[\])},;:|]+$/, '');
  return CHORD_TOKEN_RE.test(normalized) ? normalized : null;
}

function extractChordLine(line) {
  const rawTokens = String(line || '').trim().split(/\s+/).filter(Boolean);
  if (!rawTokens.length) return null;

  const meaningful = rawTokens.filter(token => !/^[|()\[\]{},;:\-]+$/.test(token));
  if (!meaningful.length) return null;

  const chords = meaningful.map(normalizeChordToken);
  return chords.every(Boolean) ? chords : null;
}

function lyricCue(line) {
  const words = String(line || '')
    .trim()
    .replace(/^[\-–—•]+\s*/, '')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return '';
  const secondWord = String(words[1] || '').toLocaleLowerCase('pt-BR').replace(/[^\p{L}]/gu, '');
  const wordLimit = words.length >= 3 && ['a', 'o', 'e', 'à'].includes(secondWord) ? 3 : 2;
  return words.slice(0, wordLimit).join(' ').replace(/[,:;.!?]+$/g, '');
}

function parseCompactCueLine(line) {
  const match = String(line || '').match(/^(.+?)\s+-\s+(.+)$/);
  if (!match) return null;
  const chords = extractChordLine(match[2]);
  if (!chords?.length) return null;
  return { cue: lyricCue(match[1]) || match[1].trim(), chords };
}

function parseSectionPhrases(cleaned, label) {
  const phrases = [];
  let pendingChordLines = [];
  let pendingBreak = false;
  let breakBeforeNext = false;

  const flushInstrumental = () => {
    if (!pendingChordLines.length) return;
    phrases.push({
      cue: '',
      chords: pendingChordLines.flat(),
      breakBefore: pendingBreak || breakBeforeNext
    });
    pendingChordLines = [];
    pendingBreak = false;
    breakBeforeNext = false;
  };

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      breakBeforeNext = true;
      continue;
    }

    const compactLine = parseCompactCueLine(line);
    if (compactLine) {
      flushInstrumental();
      phrases.push({ ...compactLine, breakBefore: breakBeforeNext });
      breakBeforeNext = false;
      continue;
    }

    const chords = extractChordLine(line);
    if (chords?.length) {
      if (!pendingChordLines.length) pendingBreak = breakBeforeNext;
      pendingChordLines.push(chords);
      breakBeforeNext = false;
      continue;
    }

    if (normalizedLabel(line).toLocaleLowerCase('pt-BR') === normalizedLabel(label).toLocaleLowerCase('pt-BR')) continue;

    if (pendingChordLines.length) {
      phrases.push({
        cue: lyricCue(line),
        chords: pendingChordLines.flat(),
        breakBefore: pendingBreak
      });
      pendingChordLines = [];
      pendingBreak = false;
      breakBeforeNext = false;
    }
  }

  flushInstrumental();
  return phrases;
}

function countEffectiveChords(phrases) {
  return phrases.reduce((count, phrase) => count + phrase.chords.length, 0);
}

function compactShortSection(phrases) {
  const progression = [];
  let cue = '';

  for (const phrase of phrases) {
    if (!cue && phrase.cue) cue = phrase.cue;
    progression.push(...phrase.chords);
  }

  const chordText = progression.join('  ');
  if (cue && chordText) return `${cue} - ${chordText}`;
  return chordText || cue;
}

function compactDetailedSection(phrases) {
  const rows = [];

  for (const phrase of phrases) {
    if (!phrase.chords.length) continue;
    const text = phrase.cue
      ? `${phrase.cue} - ${phrase.chords.join('  ')}`
      : phrase.chords.join('  ');
    if (!text) continue;
    rows.push(`${phrase.breakBefore && rows.length ? '\n' : ''}${text}`);
  }

  return rows.join('\n');
}

export function compactSectionContent(content, label = '') {
  const cleaned = cleanSectionContent(content, label);
  if (!cleaned) return '';

  const phrases = parseSectionPhrases(cleaned, label);
  if (!phrases.length) return lyricCue(cleaned) || cleaned;

  const hasVocalCue = phrases.some(phrase => phrase.cue);
  if (!hasVocalCue) return phrases.flatMap(phrase => phrase.chords).join('  ');

  return countEffectiveChords(phrases) > DETAILED_CHORD_THRESHOLD
    ? compactDetailedSection(phrases)
    : compactShortSection(phrases);
}

function compactSectionIdentity(section, label, compactContent) {
  const type = String(section?.type || 'other').trim().toLowerCase();
  const identityContent = compactContent.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
  return `${type}|${normalizedLabel(label).toLocaleLowerCase('pt-BR').replace(/\s+\d+$/, '')}|${identityContent}`;
}

export function formatCapoHeader(data = {}) {
  const fret = Number(data.capoFret);
  if (!Number.isInteger(fret) || fret <= 0 || fret > 12) return '';
  const ordinal = `${fret}ª casa`;
  const formKey = String(data.chordFormKey || '').trim();
  return formKey ? `Capotraste: ${ordinal} (forma de ${formKey})` : `Capotraste: ${ordinal}`;
}

export function composeChordSheet(data = {}) {
  const capoHeader = formatCapoHeader(data);
  const sections = Array.isArray(data.sections) ? data.sections.filter(section => section?.content?.trim()) : [];
  let body = '';

  if (sections.length) {
    const seen = new Set();
    const prepared = [];

    sections.forEach((section, index) => {
      const label = getSectionLabel(section, index);
      const content = compactSectionContent(section.content, label);
      if (!content) return;

      const identity = compactSectionIdentity(section, label, content);
      if (seen.has(identity)) return;
      seen.add(identity);
      prepared.push({ section, label, content });
    });

    const verseTotal = prepared.filter(item => item.section?.type === 'verse').length;
    let verseIndex = 0;

    body = prepared.map(item => {
      let label = item.label;
      if (item.section?.type === 'verse' && verseTotal > 1 && !/\d+$/.test(label)) {
        verseIndex += 1;
        label = `${SECTION_LABELS.verse} ${verseIndex}`;
      }
      return `${label}:\n${item.content}`;
    }).join('\n\n');
  } else {
    body = String(data.chordSheet || '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  return [capoHeader, body].filter(Boolean).join('\n\n');
}

function normalizeKeyRoot(value) {
  const match = String(value || '').trim().match(/^([A-Ga-g])([#b]?)/);
  if (!match) return null;
  const key = `${match[1].toUpperCase()}${match[2]}`;
  return Object.prototype.hasOwnProperty.call(NOTE_INDEX, key) ? key : null;
}

function resolveCanonicalSourceKey(data = {}) {
  const explicitForm = normalizeKeyRoot(data.chordFormKey);
  if (explicitForm) return explicitForm;

  const target = normalizeKeyRoot(data.originalKey);
  const fret = Number(data.capoFret);
  if (!target || !Number.isInteger(fret) || fret <= 0 || fret > 12) return target;

  const sourceIndex = (NOTE_INDEX[target] - fret + 12) % 12;
  return String(data.originalKey || '').includes('b') ? FLAT_KEYS[sourceIndex] : SHARP_KEYS[sourceIndex];
}

function transposeCanonicalChord(chord, fromKey, toKey) {
  const from = normalizeKeyRoot(fromKey);
  const to = normalizeKeyRoot(toKey);
  if (!from || !to || from === to) return chord;

  const parsed = String(chord || '').match(/^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!parsed) return chord;

  const steps = (NOTE_INDEX[to] - NOTE_INDEX[from] + 12) % 12;
  const spelling = to.includes('b') ? FLAT_KEYS : SHARP_KEYS;
  const transposeRoot = root => spelling[(NOTE_INDEX[root] + steps) % 12] || root;
  const bass = parsed[3] ? `/${transposeRoot(parsed[3])}` : '';
  return `${transposeRoot(parsed[1])}${parsed[2]}${bass}`;
}

function sameChordBlock(left, right) {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

function collapseConsecutiveChordCycles(chords = []) {
  const tokens = chords.filter(Boolean);
  const compact = [];
  let index = 0;

  while (index < tokens.length) {
    let best = null;
    const maxBlock = Math.floor((tokens.length - index) / 2);

    for (let blockSize = 1; blockSize <= maxBlock; blockSize += 1) {
      const block = tokens.slice(index, index + blockSize);
      let repetitions = 1;
      while (
        index + ((repetitions + 1) * blockSize) <= tokens.length
        && sameChordBlock(block, tokens.slice(index + (repetitions * blockSize), index + ((repetitions + 1) * blockSize)))
      ) repetitions += 1;

      if (repetitions < 2) continue;
      const span = repetitions * blockSize;
      if (!best || span > best.span || (span === best.span && blockSize < best.blockSize)) {
        best = { span, blockSize, block };
      }
    }

    if (best) {
      compact.push(...best.block);
      index += best.span;
    } else {
      compact.push(tokens[index]);
      index += 1;
    }
  }

  return compact;
}

function progressionContains(container = [], candidate = []) {
  if (!candidate.length || candidate.length > container.length) return false;
  for (let start = 0; start <= container.length - candidate.length; start += 1) {
    if (sameChordBlock(container.slice(start, start + candidate.length), candidate)) return true;
  }
  return false;
}

function canonicalSectionProgression(content, label, data = {}) {
  const cleaned = cleanSectionContent(content, label);
  if (!cleaned) return [];

  const phrases = parseSectionPhrases(cleaned, label);
  if (!phrases.length) {
    const direct = extractChordLine(cleaned);
    if (!direct?.length) return [];
    const sourceKey = resolveCanonicalSourceKey(data);
    const targetKey = normalizeKeyRoot(data.originalKey);
    return collapseConsecutiveChordCycles(direct).map(chord => transposeCanonicalChord(chord, sourceKey, targetKey));
  }

  const sourceKey = resolveCanonicalSourceKey(data);
  const targetKey = normalizeKeyRoot(data.originalKey);
  const seenRows = new Set();
  const progression = [];

  for (const phrase of phrases) {
    const reduced = collapseConsecutiveChordCycles(phrase.chords || []);
    if (!reduced.length) continue;
    const rowKey = reduced.join('|');
    if (seenRows.has(rowKey)) continue;
    seenRows.add(rowKey);
    progression.push(...reduced);
  }

  return collapseConsecutiveChordCycles(progression)
    .map(chord => transposeCanonicalChord(chord, sourceKey, targetKey));
}

function canonicalSectionKey(section, label) {
  const type = String(section?.type || '').trim().toLowerCase();
  if (SECTION_LABELS[type]) return type;
  return normalizedLabel(label).toLocaleLowerCase('pt-BR').replace(/\s+\d+$/, '') || 'other';
}

function canonicalSectionLabel(section, label) {
  const type = String(section?.type || '').trim().toLowerCase();
  return SECTION_LABELS[type] || normalizedLabel(label).replace(/\s+\d+$/, '') || 'Parte';
}

function mergeCanonicalVariant(group, progression) {
  if (!progression.length) return;

  for (let index = 0; index < group.variants.length; index += 1) {
    const existing = group.variants[index];
    if (sameChordBlock(existing, progression)) return;
    if (progressionContains(existing, progression)) return;
    if (progressionContains(progression, existing)) {
      group.variants[index] = progression;
      return;
    }
  }

  group.variants.push(progression);
}

function canonicalizeRawChordSheet(data = {}) {
  const sourceKey = resolveCanonicalSourceKey(data);
  const targetKey = normalizeKeyRoot(data.originalKey);
  return String(data.chordSheet || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter(line => !/^\s*capotraste\s*:/i.test(line))
    .map(line => {
      const compactCue = parseCompactCueLine(line);
      if (compactCue?.chords?.length) {
        return collapseConsecutiveChordCycles(compactCue.chords)
          .map(chord => transposeCanonicalChord(chord, sourceKey, targetKey))
          .join('  ');
      }
      const chords = extractChordLine(line);
      if (!chords?.length) return line;
      return collapseConsecutiveChordCycles(chords)
        .map(chord => transposeCanonicalChord(chord, sourceKey, targetKey))
        .join('  ');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function composeCanonicalChordSheet(data = {}) {
  const sections = Array.isArray(data.sections) ? data.sections.filter(section => section?.content?.trim()) : [];
  if (!sections.length) return canonicalizeRawChordSheet(data);

  const groups = [];
  const byKey = new Map();

  sections.forEach((section, index) => {
    const label = getSectionLabel(section, index);
    const progression = canonicalSectionProgression(section.content, label, data);
    if (!progression.length) return;

    const key = canonicalSectionKey(section, label);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: canonicalSectionLabel(section, label), variants: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    mergeCanonicalVariant(group, progression);
  });

  return groups
    .filter(group => group.variants.length)
    .map(group => `${group.label}:\n${group.variants.map(variant => variant.join('  ')).join('\n')}`)
    .join('\n\n');
}

export function resolveReferenceLink(data = {}, input = {}) {
  const aiVideo = String(data?.video?.url || '').trim();
  const explicitVideo = String(input?.youtubeUrl || '').trim();
  const sourceUrl = String(input?.sourceUrl || '').trim();

  if (aiVideo && aiVideo !== sourceUrl) return aiVideo;
  if (explicitVideo && explicitVideo !== sourceUrl) return explicitVideo;
  return '';
}

function applySuggestion(result) {
  const { data, provider, input } = result;
  const applied = [];
  if (setValue('titulo', data.title)) applied.push('nome');
  if (setValue('artista', data.artist)) applied.push('artista');
  if (setValue('tom', data.originalKey)) applied.push('tom original');
  if (setValue('cifra', composeCanonicalChordSheet(data))) applied.push('cifra');
  if (setValue('letra', data.lyrics)) applied.push('letra');
  if (setValue('link', resolveReferenceLink(data, input))) applied.push('link do vídeo');

  importMetadata = {
    importMethod: 'ai-assisted',
    originalKey: data.originalKey || null,
    chordFormKey: data.chordFormKey || null,
    capoFret: data.capoFret ?? null,
    bpm: data.bpm || input.manualBpm || null,
    bpmSource: input.manualBpm ? 'manual' : (data.bpmSource || null),
    timeSignature: data.timeSignature || null,
    sourceUrl: input.sourceUrl || null,
    sourceProvider: provider.provider,
    sourceType: input.sourceType || (input.sourceUrl ? 'source-url' : 'pasted-text'),
    importedAt: new Date().toISOString(),
    aiProvider: provider.provider,
    aiModel: provider.model,
    aiSchemaVersion: data.schemaVersion,
    video: data.video || (input.youtubeUrl ? { provider: 'youtube', url: input.youtubeUrl, videoId: null } : null),
    fieldProvenance: data.provenance || {}
  };
  return applied;
}

function createPanel() {
  const panel = document.createElement('section');
  panel.className = 'ai-import';
  panel.setAttribute('aria-labelledby', 'ai-import-title');
  panel.innerHTML = `
    <div class="ai-import__top">
      <div><h2 id="ai-import-title">Importar com IA</h2><p>Um único campo para começar. A IA identifica automaticamente o que você informou e tenta preencher a música no padrão do IDE Music.</p></div>
      <button type="button" class="ai-import__toggle" aria-expanded="false" aria-controls="ai-import-body"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Importar com IA</button>
    </div>
    <div class="ai-import__body" id="ai-import-body">
      <div class="ai-import__field">
        <label for="ai-universal-input">Informe a música</label>
        <textarea id="ai-universal-input" placeholder="Cole um link do YouTube, link da cifra, a própria cifra ou digite o nome da música e artista.\n\nEx.: Jesus, Filho de Deus — Fernandinho"></textarea>
        <span class="ai-import__hint">Não precisa escolher o tipo de entrada. O sistema reconhece automaticamente e você poderá revisar tudo antes de salvar.</span>
        <div class="ai-import__examples" aria-hidden="true">
          <span><i class="fa-brands fa-youtube"></i> YouTube</span>
          <span><i class="fa-solid fa-link"></i> Link da cifra</span>
          <span><i class="fa-solid fa-music"></i> Cifra colada</span>
          <span><i class="fa-solid fa-font"></i> Nome + artista</span>
        </div>
      </div>
      <div class="ai-import__actions"><button type="button" class="ai-import__analyze"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Analisar e preencher</button><span class="ai-import__state" role="status" aria-live="polite">A IA só sugere os dados; nada é salvo automaticamente.</span></div>
      <div class="ai-import__thinking" hidden role="status" aria-live="assertive">
        <div class="ai-import__thinking-icon" aria-hidden="true"><i class="fa-solid fa-circle-notch"></i></div>
        <div><strong>A IA está analisando a música…</strong><span>Entendendo sua entrada, identificando a música, confirmando o tom real e organizando a cifra no padrão do IDE Music.</span></div>
      </div>
      <div class="ai-import__review" hidden></div>
    </div>`;
  return panel;
}

export function mountMusicAIImport({ service = new MusicAIService() } = {}) {
  const form = document.getElementById('song-form');
  const firstPanel = form?.querySelector('.panel');
  if (!form || !firstPanel || document.querySelector('.ai-import')) return;
  injectStyles();
  const panel = createPanel();
  firstPanel.insertBefore(panel, firstPanel.firstChild);

  const toggle = panel.querySelector('.ai-import__toggle');
  const body = panel.querySelector('.ai-import__body');
  const analyze = panel.querySelector('.ai-import__analyze');
  const state = panel.querySelector('.ai-import__state');
  const thinking = panel.querySelector('.ai-import__thinking');
  const review = panel.querySelector('.ai-import__review');
  const input = panel.querySelector('#ai-universal-input');
  const idleAnalyzeHtml = analyze.innerHTML;

  toggle.addEventListener('click', () => {
    const open = !body.classList.contains('open');
    body.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input?.focus();
  });

  input?.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !analyze.disabled) {
      event.preventDefault();
      analyze.click();
    }
  });

  analyze.addEventListener('click', async () => {
    const user = window.firebase?.auth?.().currentUser;
    if (!user?.uid) {
      state.textContent = 'Sua sessão expirou. Entre novamente para usar a importação com IA.';
      return;
    }

    analyze.disabled = true;
    analyze.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> IA analisando…';
    panel.setAttribute('aria-busy', 'true');
    thinking.hidden = false;
    state.textContent = 'Aguarde enquanto a IA entende a entrada e organiza a música.';
    review.hidden = true;
    try {
      const result = await service.analyze({ rawInput: input?.value || '' });
      const applied = applySuggestion(result);
      state.textContent = 'Sugestão aplicada ao formulário. Revise os dados antes de salvar.';
      review.hidden = false;
      review.textContent = applied.length
        ? `Campos sugeridos: ${applied.join(', ')}. Campos sem evidência suficiente permaneceram vazios.`
        : 'A IA não encontrou dados suficientes para preencher o formulário. Tente informar mais contexto ou continue manualmente.';
    } catch (error) {
      console.warn('Importação assistida indisponível:', error?.code || error?.message || error);
      state.textContent = `${error?.message || 'A IA está indisponível no momento.'} Você pode continuar normalmente pelo cadastro manual.`;
      review.hidden = false;
      review.textContent = 'Nenhum conteúdo foi salvo. O formulário manual continua disponível.';
    } finally {
      analyze.disabled = false;
      analyze.innerHTML = idleAnalyzeHtml;
      panel.setAttribute('aria-busy', 'false');
      thinking.hidden = true;
    }
  });
}
