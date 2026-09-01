export const MUSIC_AI_SCHEMA_VERSION = '1.0.0';
export const MUSIC_AI_SECTION_TYPES = Object.freeze([
  'intro',
  'verse',
  'pre_chorus',
  'chorus',
  'bridge',
  'instrumental',
  'outro'
]);

export const MUSIC_AI_PROVENANCE_SOURCES = Object.freeze([
  'pasted_text',
  'source_url',
  'youtube_url',
  'manual',
  'model_inference'
]);

const SECTION_ALIASES = Object.freeze({
  intro: 'intro',
  introducao: 'intro',
  introdução: 'intro',
  verse: 'verse',
  verso: 'verse',
  estrofe: 'verse',
  prechorus: 'pre_chorus',
  pre_chorus: 'pre_chorus',
  'pre-chorus': 'pre_chorus',
  prerefrao: 'pre_chorus',
  pre_refrao: 'pre_chorus',
  'pre-refrão': 'pre_chorus',
  'pré-refrão': 'pre_chorus',
  chorus: 'chorus',
  refrao: 'chorus',
  refrão: 'chorus',
  bridge: 'bridge',
  ponte: 'bridge',
  instrumental: 'instrumental',
  solo: 'instrumental',
  outro: 'outro',
  final: 'outro',
  ending: 'outro'
});

function cleanText(value, maxLength = 20000) {
  if (value == null) return '';
  return String(value).replace(/\r\n?/g, '\n').trim().slice(0, maxLength);
}

function cleanNullableText(value, maxLength = 20000) {
  const text = cleanText(value, maxLength);
  return text || null;
}

export function normalizeMusicalKey(value) {
  const normalized = cleanText(value, 16)
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/\s+/g, '');
  if (!normalized) return null;
  const match = normalized.match(/^([A-Ga-g])([#b]?)(m?)$/);
  if (!match) return null;
  return `${match[1].toUpperCase()}${match[2]}${match[3]}`;
}

export function normalizeBpm(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const bpm = Math.round(number);
  return bpm >= 30 && bpm <= 300 ? bpm : null;
}

export function normalizeTimeSignature(value) {
  const text = cleanText(value, 12).replace(/\s+/g, '');
  if (!text) return null;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (numerator < 1 || numerator > 16 || ![1, 2, 4, 8, 16].includes(denominator)) return null;
  return `${numerator}/${denominator}`;
}

export function normalizeHttpUrl(value) {
  const text = cleanText(value, 2048);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function sourceProviderFromUrl(value) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

export function parseYouTubeReference(value) {
  const url = normalizeHttpUrl(value);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      videoId = parsed.searchParams.get('v') || '';
      if (!videoId) {
        const segments = parsed.pathname.split('/').filter(Boolean);
        const markerIndex = segments.findIndex(segment => ['shorts', 'embed', 'live'].includes(segment));
        if (markerIndex >= 0) videoId = segments[markerIndex + 1] || '';
      }
    } else {
      return null;
    }

    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
    return {
      provider: 'youtube',
      url,
      videoId
    };
  } catch {
    return null;
  }
}

export function normalizeSectionType(value) {
  const key = cleanText(value, 40)
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  return SECTION_ALIASES[key] || (MUSIC_AI_SECTION_TYPES.includes(key) ? key : null);
}

function normalizeSections(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map((section, index) => {
    const type = normalizeSectionType(section?.type || section?.sectionType || section?.name);
    const title = cleanNullableText(section?.title || section?.label || section?.name, 80);
    const content = cleanNullableText(section?.content || section?.text, 12000);
    const chords = cleanNullableText(section?.chords, 4000);
    if (!type && !title && !content && !chords) return null;
    return {
      order: index,
      type: type || 'verse',
      title,
      content,
      chords
    };
  }).filter(Boolean);
}

function normalizeEvidence(value) {
  if (!Array.isArray(value)) return [];
  const allowedFields = new Set([
    'title', 'artist', 'originalKey', 'chordSheet', 'lyrics',
    'timeSignature', 'bpm', 'video', 'sections'
  ]);
  const allowedConfidence = new Set(['high', 'medium', 'low']);

  return value.slice(0, 50).map(item => {
    const field = cleanText(item?.field, 40);
    const source = cleanText(item?.source, 32);
    if (!allowedFields.has(field) || !MUSIC_AI_PROVENANCE_SOURCES.includes(source)) return null;
    return {
      field,
      source,
      confidence: allowedConfidence.has(item?.confidence) ? item.confidence : 'low',
      evidence: cleanNullableText(item?.evidence, 240)
    };
  }).filter(Boolean);
}

export function buildSourceType(input = {}) {
  const hasText = Boolean(cleanText(input.pastedText, 120000));
  const hasUrl = Boolean(normalizeHttpUrl(input.sourceUrl));
  if (hasText && hasUrl) return 'pasted_text+url';
  if (hasUrl) return 'url';
  if (hasText) return 'pasted_text';
  return 'manual';
}

export function validateMusicAIInput(input = {}) {
  const pastedText = cleanText(input.pastedText, 120000);
  const sourceUrl = normalizeHttpUrl(input.sourceUrl);
  const youtube = parseYouTubeReference(input.youtubeUrl);
  const manualBpm = normalizeBpm(input.manualBpm);
  const errors = [];

  if (!pastedText && !sourceUrl) {
    errors.push('Cole uma cifra/texto ou informe uma URL para análise.');
  }
  if (input.sourceUrl && !sourceUrl) errors.push('Informe uma URL de cifra válida.');
  if (input.youtubeUrl && !youtube) errors.push('Informe uma URL válida do YouTube.');
  if (input.manualBpm !== '' && input.manualBpm != null && manualBpm == null) {
    errors.push('Informe um BPM entre 30 e 300.');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      pastedText,
      sourceUrl,
      youtube,
      manualBpm,
      sourceType: buildSourceType({ pastedText, sourceUrl })
    }
  };
}

export function normalizeMusicAIResponse(raw = {}, context = {}) {
  const warnings = Array.isArray(raw?.warnings)
    ? raw.warnings.map(item => cleanText(item, 240)).filter(Boolean).slice(0, 20)
    : [];

  const originalKeyRaw = raw?.originalKey ?? raw?.key ?? raw?.tom;
  const originalKey = normalizeMusicalKey(originalKeyRaw);
  if (originalKeyRaw && !originalKey) warnings.push('O tom sugerido pela IA foi descartado por ser inválido.');

  const bpmRaw = context.manualBpm ?? raw?.bpm;
  const bpm = normalizeBpm(bpmRaw);
  if (raw?.bpm != null && context.manualBpm == null && bpm == null) {
    warnings.push('O BPM sugerido pela IA foi descartado por estar fora da faixa plausível.');
  }

  const timeSignatureRaw = raw?.timeSignature ?? raw?.compasso;
  const timeSignature = normalizeTimeSignature(timeSignatureRaw);
  if (timeSignatureRaw && !timeSignature) warnings.push('O compasso sugerido pela IA foi descartado por ser inválido.');

  const providedVideo = context.youtube || parseYouTubeReference(context.youtubeUrl);
  const aiVideo = parseYouTubeReference(raw?.video?.url || raw?.videoUrl || raw?.youtubeUrl);
  const video = providedVideo || aiVideo || null;

  const title = cleanNullableText(raw?.title ?? raw?.name ?? raw?.titulo, 160);
  const artist = cleanNullableText(raw?.artist ?? raw?.artista, 160);
  const chordSheet = cleanNullableText(raw?.chordSheet ?? raw?.cifra, 60000);
  const lyrics = cleanNullableText(raw?.lyrics ?? raw?.letra, 60000);
  const sections = normalizeSections(raw?.sections);
  const fieldProvenance = normalizeEvidence(raw?.fieldEvidence ?? raw?.provenance);

  return {
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    title,
    artist,
    originalKey,
    chordSheet,
    lyrics,
    timeSignature,
    bpm,
    video,
    sections,
    fieldProvenance,
    warnings: [...new Set(warnings)].slice(0, 20)
  };
}

export function buildMusicAIImportMetadata(result = {}, input = {}, providerInfo = {}, now = new Date()) {
  const sourceUrl = normalizeHttpUrl(input.sourceUrl);
  const youtube = parseYouTubeReference(input.youtubeUrl) || result.video || null;
  return {
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    provider: cleanNullableText(providerInfo.provider, 80),
    model: cleanNullableText(providerInfo.model, 120),
    sourceUrl,
    sourceProvider: sourceProviderFromUrl(sourceUrl),
    sourceType: buildSourceType(input),
    importedAt: now,
    video: youtube,
    sections: normalizeSections(result.sections),
    fieldProvenance: normalizeEvidence(result.fieldProvenance),
    warnings: Array.isArray(result.warnings) ? result.warnings.slice(0, 20) : []
  };
}

export function buildMusicAnalysisPrompt(input = {}) {
  const validated = validateMusicAIInput(input);
  if (!validated.valid) throw new Error(validated.errors.join(' '));
  const { pastedText, sourceUrl, youtube, manualBpm } = validated.value;

  const parts = [
    'Analise o material musical informado para auxiliar o cadastro de uma música no IDE Music.',
    `A resposta deve seguir o contrato ${MUSIC_AI_SCHEMA_VERSION}.`,
    'Não invente informações ausentes. Quando não houver evidência suficiente, omita o campo correspondente.',
    'Preserve o conteúdo da cifra e da letra como texto simples, sem HTML.',
    'Identifique seções apenas quando elas estiverem presentes ou claramente inferíveis no material fornecido.',
    'Para BPM e compasso, responda somente quando houver evidência suficiente.',
    'Para a proveniência, use somente: pasted_text, source_url, youtube_url, manual ou model_inference.',
    'Ao usar uma URL, não tente contornar login, paywall, bloqueio ou restrição de acesso. Se não puder ler a página, avise em warnings.',
    'Não faça pesquisa ampla na web; use apenas o texto e as URLs explicitamente fornecidos pelo usuário.'
  ];

  if (sourceUrl) parts.push(`URL de origem fornecida pelo usuário: ${sourceUrl}`);
  if (youtube) parts.push(`Vídeo de referência fornecido pelo usuário: ${youtube.url}`);
  if (manualBpm) parts.push(`BPM informado manualmente pelo usuário: ${manualBpm}. Preserve esse valor.`);
  if (pastedText) parts.push(`\nCONTEÚDO COLADO PELO USUÁRIO:\n${pastedText}`);
  return parts.join('\n');
}
