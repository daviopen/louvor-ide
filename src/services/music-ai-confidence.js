const SHARP_KEYS = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const FLAT_KEYS = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
const NOTE_INDEX = Object.freeze({
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
});

export function normalizeKeyRoot(value) {
  const match = String(value || '').trim().match(/^([A-Ga-g])([#b]?)/);
  if (!match) return null;
  const key = `${match[1].toUpperCase()}${match[2]}`;
  return Object.prototype.hasOwnProperty.call(NOTE_INDEX, key) ? key : null;
}

function keyForIndex(index, preferFlats = false) {
  const normalized = ((index % 12) + 12) % 12;
  return (preferFlats ? FLAT_KEYS : SHARP_KEYS)[normalized];
}

export function expectedSoundingKey(chordFormKey, capoFret, originalKey = '') {
  const form = normalizeKeyRoot(chordFormKey);
  const fret = Number(capoFret);
  if (!form || !Number.isInteger(fret) || fret < 0 || fret > 12) return null;
  const preferFlats = String(originalKey || chordFormKey || '').includes('b');
  return keyForIndex(NOTE_INDEX[form] + fret, preferFlats);
}

export function validateHarmonicContext(data = {}) {
  const originalKey = normalizeKeyRoot(data.originalKey);
  const chordFormKey = normalizeKeyRoot(data.chordFormKey);
  const fret = data.capoFret === null || data.capoFret === undefined || data.capoFret === '' ? null : Number(data.capoFret);

  if (!originalKey) {
    return { status: 'unknown', valid: null, originalKey: null, chordFormKey, capoFret: fret, expectedKey: null, message: 'Tom original não identificado.' };
  }

  if (fret === null || fret === 0) {
    const valid = !chordFormKey || NOTE_INDEX[chordFormKey] === NOTE_INDEX[originalKey];
    return {
      status: valid ? 'consistent' : 'inconsistent',
      valid,
      originalKey,
      chordFormKey,
      capoFret: fret,
      expectedKey: chordFormKey || originalKey,
      message: valid
        ? 'Sem capotraste: a forma harmônica é compatível com o tom original.'
        : `Sem capotraste, a forma ${chordFormKey} não é compatível com o tom original ${originalKey}.`
    };
  }

  if (!Number.isInteger(fret) || fret < 1 || fret > 12 || !chordFormKey) {
    return {
      status: 'unknown', valid: null, originalKey, chordFormKey, capoFret: fret, expectedKey: null,
      message: 'Não há dados suficientes para validar matematicamente forma e capotraste.'
    };
  }

  const expectedKey = expectedSoundingKey(chordFormKey, fret, originalKey);
  const valid = NOTE_INDEX[expectedKey] === NOTE_INDEX[originalKey];
  return {
    status: valid ? 'consistent' : 'inconsistent',
    valid,
    originalKey,
    chordFormKey,
    capoFret: fret,
    expectedKey,
    message: valid
      ? `${chordFormKey} + capotraste ${fret} resulta em ${originalKey}.`
      : `${chordFormKey} + capotraste ${fret} resulta em ${expectedKey}, não em ${originalKey}.`
  };
}

function provenanceText(data, field) {
  return String(data?.provenance?.[field] || '').trim().toLocaleLowerCase('pt-BR');
}

export function inferFieldConfidence(data = {}, field, input = {}) {
  const value = field === 'video' ? data?.video?.url || data?.video?.videoId : data?.[field];
  if (value === null || value === undefined || value === '') return 'unknown';

  const provenance = provenanceText(data, field);
  if (/conhecimento do modelo|revisar|fallback/.test(provenance)) return 'review';
  if (/informad[oa] pelo usu[aá]rio|cifra club|banana cifras|url|p[aá]gina|thumbnail|fonte/.test(provenance)) return 'high';

  if (input?.sourceUrl && ['originalKey', 'chordFormKey', 'capoFret', 'chordSheet', 'video'].includes(field)) return 'high';
  if (input?.youtubeUrl && ['video', 'bpm', 'timeSignature'].includes(field)) return 'high';
  return 'medium';
}

export function buildFieldConfidence(data = {}, input = {}) {
  const fields = ['title', 'artist', 'originalKey', 'chordFormKey', 'capoFret', 'chordSheet', 'bpm', 'timeSignature', 'video'];
  return Object.fromEntries(fields.map(field => [field, inferFieldConfidence(data, field, input)]));
}
