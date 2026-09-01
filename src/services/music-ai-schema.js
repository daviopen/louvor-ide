export const MUSIC_AI_SCHEMA_VERSION = '1.0.0';

export const MUSIC_AI_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'title', 'artist', 'originalKey', 'chordSheet', 'lyrics', 'sections', 'timeSignature', 'bpm', 'video', 'provenance'],
  properties: {
    schemaVersion: { type: 'string' },
    title: { type: ['string', 'null'] },
    artist: { type: ['string', 'null'] },
    originalKey: { type: ['string', 'null'] },
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
  } catch {}
  return null;
}

export function normalizeMusicAIResponse(raw = {}) {
  const videoUrl = raw?.video?.url || null;
  return {
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    title: String(raw.title || '').trim() || null,
    artist: String(raw.artist || '').trim() || null,
    originalKey: normalizeMusicalKey(raw.originalKey),
    chordSheet: String(raw.chordSheet || '').trim() || null,
    lyrics: String(raw.lyrics || '').trim() || null,
    sections: Array.isArray(raw.sections) ? raw.sections.filter(Boolean).map(section => ({ type: section.type || 'other', label: String(section.label || '').trim() || null, content: String(section.content || '').trim() || null })) : [],
    timeSignature: /^\d{1,2}\/\d{1,2}$/.test(String(raw.timeSignature || '').trim()) ? String(raw.timeSignature).trim() : null,
    bpm: normalizeBpm(raw.bpm),
    bpmSource: String(raw.bpmSource || '').trim() || null,
    video: videoUrl ? { provider: raw.video?.provider || (extractYouTubeVideoId(videoUrl) ? 'youtube' : null), url: videoUrl, videoId: raw.video?.videoId || extractYouTubeVideoId(videoUrl) } : null,
    provenance: raw.provenance && typeof raw.provenance === 'object' ? raw.provenance : {}
  };
}
