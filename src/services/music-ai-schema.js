export const MUSIC_AI_SCHEMA_VERSION = '1.0.0';

export const MUSIC_AI_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'title', 'artist', 'originalKey', 'chordFormKey', 'capoFret', 'chordSheet', 'lyrics', 'sections', 'timeSignature', 'bpm', 'video', 'provenance'],
  properties: {
    schemaVersion: { type: 'string' },
    title: { type: ['string', 'null'] },
    artist: { type: ['string', 'null'] },
    originalKey: { type: ['string', 'null'] },
    chordFormKey: { type: ['string', 'null'] },
    capoFret: { type: ['integer', 'null'], minimum: 0, maximum: 12 },
    chordSheet: { type: ['string', 'null'] },
    lyrics: { type: ['string', 'null'] },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'label', 'content'],
        properties: {
          type: { type: 'string', enum: ['intro', 'verse', 'pre_chorus', 'chorus', 'bridge', 'instrumental', 'outro', 'other'] },
          label: { type: ['string', 'null'] },
          content: { type: ['string', 'null'] }
        }
      }
    },
    timeSignature: { type: ['string', 'null'] },
    bpm: { type: ['integer', 'null'], minimum: 30, maximum: 260 },
    bpmSource: { type: ['string', 'null'] },
    video: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        provider: { type: ['string', 'null'] },
        url: { type: ['string', 'null'] },
        videoId: { type: ['string', 'null'] }
      }
    },
    provenance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: ['string', 'null'] }, artist: { type: ['string', 'null'] }, originalKey: { type: ['string', 'null'] },
        chordFormKey: { type: ['string', 'null'] }, capoFret: { type: ['string', 'null'] },
        chordSheet: { type: ['string', 'null'] }, lyrics: { type: ['string', 'null'] }, timeSignature: { type: ['string', 'null'] }, bpm: { type: ['string', 'null'] }, video: { type: ['string', 'null'] }
      }
    }
  }
};

const KEY_RE = /^(?:[A-G](?:#|b)?)(?:m|maj|min|sus|dim|aug)?(?:\d{0,2})?$/i;
export function normalizeMusicalKey(value) {
  const key = String(value || '').trim();
  return key && KEY_RE.test(key) ? key : null;
}

export function normalizeCapoFret(value) {
  if (value === null || value === undefined || value === '') return null;
  const fret = Number(value);
  return Number.isInteger(fret) && fret >= 0 && fret <= 12 ? fret : null;
}

export function normalizeBpm(value) {
  if (value === null || value === undefined || value === '') return null;
  const bpm = Number(value);
  return Number.isInteger(bpm) && bpm >= 30 && bpm <= 260 ? bpm : null;
}

export function extractYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0] || null;
    if (parsed.hostname.endsWith('youtube.com')) return parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1] || null;
    if (parsed.hostname === 'i.ytimg.com' || parsed.hostname.endsWith('.ytimg.com')) {
      return parsed.pathname.match(/\/(?:vi|vi_webp)\/([^/?]+)\//)?.[1] || null;
    }
  } catch {}
  return null;
}

export function normalizeYouTubeVideoUrl(url) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

function normalizeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeMusicAIResponse(raw = {}) {
  const rawVideoUrl = raw?.video?.url || null;
  const rawVideoId = String(raw?.video?.videoId || '').trim() || null;
  const extractedVideoId = extractYouTubeVideoId(rawVideoUrl);
  const youtubeVideoId = rawVideoId || extractedVideoId;
  const canonicalYouTubeUrl = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : null;
  const videoUrl = canonicalYouTubeUrl || rawVideoUrl;

  return {
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    title: String(raw.title || '').trim() || null,
    artist: String(raw.artist || '').trim() || null,
    originalKey: normalizeMusicalKey(raw.originalKey),
    chordFormKey: normalizeMusicalKey(raw.chordFormKey),
    capoFret: normalizeCapoFret(raw.capoFret),
    chordSheet: String(raw.chordSheet || '').trim() || null,
    lyrics: String(raw.lyrics || '').trim() || null,
    sections: Array.isArray(raw.sections) ? raw.sections.filter(Boolean).map(section => ({ type: section.type || 'other', label: String(section.label || '').trim() || null, content: String(section.content || '').trim() || null })) : [],
    timeSignature: /^\d{1,2}\/\d{1,2}$/.test(String(raw.timeSignature || '').trim()) ? String(raw.timeSignature).trim() : null,
    bpm: normalizeBpm(raw.bpm),
    bpmSource: String(raw.bpmSource || '').trim() || null,
    video: videoUrl ? { provider: youtubeVideoId ? 'youtube' : (raw.video?.provider || null), url: videoUrl, videoId: youtubeVideoId } : null,
    chordSourceUrl: normalizeHttpUrl(raw.chordSourceUrl),
    chordSourceProvider: String(raw.chordSourceProvider || '').trim() || null,
    provenance: raw.provenance && typeof raw.provenance === 'object' ? raw.provenance : {}
  };
}
