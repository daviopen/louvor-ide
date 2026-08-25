/**
 * Normaliza entrada externa/formulário antes da camada de serviço.
 * @param {Object} input
 */
export function toMusicInputDto(input = {}) {
  return {
    titulo: String(input.titulo || '').trim(),
    artista: input.artista ? String(input.artista).trim() : '',
    tom: input.tom ? String(input.tom).trim() : '',
    bpm: input.bpm === '' || input.bpm == null ? null : Number(input.bpm),
    link: input.link ? String(input.link).trim() : '',
    cifra: String(input.cifra || '').trim(),
    letra: input.letra ? String(input.letra).trim() : '',
    ministro: input.ministro || '',
    tomMinistro: input.tomMinistro || null
  };
}
