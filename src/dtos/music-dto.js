import {
  normalizeBpm,
  normalizeMusicalKey,
  normalizeTimeSignature,
  parseYouTubeReference
} from '../services/music-ai-contract.js';

/**
 * Normaliza entrada externa/formulário antes da camada de serviço.
 * Mantém aliases legados para retrocompatibilidade com músicas existentes.
 * @param {Object} input
 */
export function toMusicInputDto(input = {}) {
  const originalKey = normalizeMusicalKey(input.originalKey || input.tom) || '';
  const timeSignature = normalizeTimeSignature(input.timeSignature || input.compasso);
  const youtubeUrl = input.youtubeUrl ? String(input.youtubeUrl).trim() : '';
  const video = input.video || parseYouTubeReference(youtubeUrl);

  return {
    titulo: String(input.titulo || input.title || '').trim(),
    artista: input.artista || input.artist ? String(input.artista || input.artist).trim() : '',
    tom: originalKey,
    originalKey,
    bpm: normalizeBpm(input.bpm),
    bpmSource: input.bpmSource || null,
    compasso: timeSignature,
    timeSignature,
    link: input.link ? String(input.link).trim() : '',
    youtubeUrl: video?.url || youtubeUrl || '',
    video: video || null,
    cifra: String(input.cifra || input.chordSheet || '').trim(),
    letra: input.letra || input.lyrics ? String(input.letra || input.lyrics).trim() : '',
    sourceUrl: input.sourceUrl ? String(input.sourceUrl).trim() : null,
    sourceProvider: input.sourceProvider || null,
    sourceType: input.sourceType || null,
    creationMode: input.creationMode || 'manual',
    sections: Array.isArray(input.sections) ? input.sections : [],
    fieldProvenance: Array.isArray(input.fieldProvenance) ? input.fieldProvenance : [],
    ministro: input.ministro || '',
    tomMinistro: input.tomMinistro || null
  };
}
