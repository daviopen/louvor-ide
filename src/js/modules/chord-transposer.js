/**
 * Transposição de acordes usada pelo visualizador de setlists.
 *
 * O módulo não depende de CDN e funciona tanto no navegador quanto nos testes
 * executados pelo Node.js.
 */
(function initChordTransposer(globalScope) {
  const sharpKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const enharmonicIndexes = {
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
  };

  function normalizeKey(key) {
    if (typeof key !== 'string') return null;

    const match = key.trim().match(/^([A-Ga-g])([#b]?)/);
    if (!match) return null;

    const normalized = `${match[1].toUpperCase()}${match[2]}`;
    return Object.prototype.hasOwnProperty.call(enharmonicIndexes, normalized)
      ? normalized
      : null;
  }

  function isValidKey(key) {
    return normalizeKey(key) !== null;
  }

  function semitoneDistance(fromKey, toKey) {
    const normalizedFrom = normalizeKey(fromKey);
    const normalizedTo = normalizeKey(toKey);

    if (!normalizedFrom || !normalizedTo) return null;

    return (enharmonicIndexes[normalizedTo] - enharmonicIndexes[normalizedFrom] + 12) % 12;
  }

  function useFlatSpelling(toKey) {
    return typeof toKey === 'string' && toKey.includes('b');
  }

  function transposeRoot(root, steps, preferFlats) {
    const normalizedRoot = normalizeKey(root);
    if (!normalizedRoot || !Number.isInteger(steps)) return root;

    const targetIndex = (enharmonicIndexes[normalizedRoot] + steps + 12) % 12;
    return (preferFlats ? flatKeys : sharpKeys)[targetIndex];
  }

  function isValidSuffix(suffix) {
    if (!suffix) return true;

    return /^(?:(?:m(?:aj|min)?|maj|min|dim|aug|sus|add|M)|[0-9º°+#()\-])*$/u.test(suffix);
  }

  function parseChordCore(core) {
    const match = core.match(/^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/);
    if (!match || !isValidSuffix(match[2])) return null;

    return {
      root: match[1],
      suffix: match[2],
      bass: match[3] || null
    };
  }

  function splitToken(token) {
    const directChord = parseChordCore(token);
    if (directChord) {
      return { leading: '', trailing: '', chord: directChord };
    }

    const match = token.match(/^([\[\]{},;:|]*)(.*?)([\[\]{},;:.|]*)$/);
    if (!match) return null;

    const chord = parseChordCore(match[2]);
    if (!chord) return null;

    return {
      leading: match[1],
      trailing: match[3],
      chord
    };
  }

  function transposeChordToken(token, steps, preferFlats) {
    const parsedToken = splitToken(token);
    if (!parsedToken) return token;

    const { leading, trailing, chord } = parsedToken;
    const root = transposeRoot(chord.root, steps, preferFlats);
    const bass = chord.bass
      ? `/${transposeRoot(chord.bass, steps, preferFlats)}`
      : '';

    return `${leading}${root}${chord.suffix}${bass}${trailing}`;
  }

  function transposeText(text, fromKey, toKey) {
    if (typeof text !== 'string') return '';

    const steps = semitoneDistance(fromKey, toKey);
    if (steps === null || steps === 0) return text;

    const preferFlats = useFlatSpelling(toKey);
    return text
      .split(/(\s+)/)
      .map(part => (/^\s+$/.test(part) ? part : transposeChordToken(part, steps, preferFlats)))
      .join('');
  }

  function resolveSetlistFinalKey(setlistSong, currentSong) {
    const savedCandidates = [
      setlistSong && setlistSong.tomFinal,
      setlistSong && setlistSong.finalKey,
      setlistSong && setlistSong.tom
    ];

    const savedKey = savedCandidates.find(isValidKey);
    if (savedKey) return normalizeKey(savedKey);

    const ministerName = setlistSong && setlistSong.ministro;
    const currentMinisterKey = ministerName
      && currentSong
      && currentSong.tomMinistro
      && currentSong.tomMinistro[ministerName];

    if (isValidKey(currentMinisterKey)) return normalizeKey(currentMinisterKey);
    if (currentSong && isValidKey(currentSong.tom)) return normalizeKey(currentSong.tom);
    if (setlistSong && isValidKey(setlistSong.tomOriginal)) return normalizeKey(setlistSong.tomOriginal);

    return 'C';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightChords(text) {
    if (typeof text !== 'string') return '';

    return text
      .split(/(\s+)/)
      .map(part => {
        const escapedPart = escapeHtml(part);
        return splitToken(part)
          ? `<span class="chord">${escapedPart}</span>`
          : escapedPart;
      })
      .join('');
  }

  const api = {
    highlightChords,
    isValidKey,
    normalizeKey,
    resolveSetlistFinalKey,
    semitoneDistance,
    transposeChordToken,
    transposeText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.LouvorChordTransposer = api;
  }
})(typeof window !== 'undefined' ? window : null);
