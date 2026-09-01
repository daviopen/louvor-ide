/**
 * @typedef {Object} MusicVideoReference
 * @property {'youtube'|string} provider
 * @property {string} url
 * @property {string} videoId
 */

/**
 * @typedef {Object} MusicSection
 * @property {number} order
 * @property {'intro'|'verse'|'pre_chorus'|'chorus'|'bridge'|'instrumental'|'outro'} type
 * @property {string|null=} title
 * @property {string|null=} content
 * @property {string|null=} chords
 */

/**
 * @typedef {Object} Music
 * @property {string=} id
 * @property {string} titulo Campo legado/canônico de exibição para nome.
 * @property {string|null=} artista
 * @property {string|null=} tom Campo legado retrocompatível; espelha `originalKey`.
 * @property {string|null=} originalKey Tom original canônico da música.
 * @property {number|null=} bpm
 * @property {'manual'|'ai'|null=} bpmSource
 * @property {string|null=} timeSignature
 * @property {string|null=} compasso Alias retrocompatível de `timeSignature`.
 * @property {string|null=} link
 * @property {string|null=} sourceUrl
 * @property {string|null=} sourceProvider
 * @property {string|null=} sourceType
 * @property {MusicVideoReference|null=} video
 * @property {string|null=} youtubeUrl
 * @property {string} cifra
 * @property {string|null=} letra
 * @property {MusicSection[]=} sections
 * @property {Object[]=} fieldProvenance
 * @property {'manual'|'ai_assisted'=} creationMode
 * @property {Object|null=} aiImport Metadados do provider/modelo; não contém prompt/cifra/letra.
 * @property {string[]=} ministros
 * @property {Object<string,string>=} tomMinistro Compatibilidade; preferências canônicas ficam em songMinisterKeys.
 * @property {Date|number=} importedAt
 * @property {Date|number=} criadoEm
 * @property {Date|number=} createdAt
 * @property {Date|number=} updatedAt
 */

export const MUSIC_MODEL_VERSION = 2;
