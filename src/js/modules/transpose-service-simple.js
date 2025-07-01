/**
 * Transpose Service - Wrapper simples para transposição de acordes
 */

class TransposeService {
  constructor() {
    this.keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  // Transpor diretamente de um tom para outro
  transposeKey(fromKey, toKey) {
    if (!fromKey || !toKey) {
      console.warn("⚠️ TransposeService: Tons não fornecidos");
      return fromKey || 'C';
    }

    // Normalizar os tons (remover sufixos como m, 7, etc.)
    const normalizeKey = (key) => {
      const cleanKey = key.replace(/[^A-G#b]/g, '');
      // Converter bemóis para sustenidos para padronização
      const keyMap = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
      };
      return keyMap[cleanKey] || cleanKey;
    };

    const normalizedFrom = normalizeKey(fromKey);
    const normalizedTo = normalizeKey(toKey);

    if (normalizedFrom === normalizedTo) {
      return toKey; // Mesma tonalidade
    }

    const fromIndex = this.keys.indexOf(normalizedFrom);
    const toIndex = this.keys.indexOf(normalizedTo);

    if (fromIndex === -1 || toIndex === -1) {
      console.warn("⚠️ TransposeService: Tom não reconhecido:", fromKey, "->", toKey);
      return toKey; // Retornar o tom de destino mesmo se não conseguir transpor
    }

    // Calcular a diferença em semitons
    let semitones = toIndex - fromIndex;
    if (semitones < 0) {
      semitones += 12;
    }

    console.log(`🎼 TransposeService: ${fromKey} -> ${toKey} (${semitones} semitons)`);
    return toKey;
  }

  // Método simples para verificar se um tom é válido
  isValidKey(key) {
    if (!key) return false;
    const cleanKey = key.replace(/[^A-G#b]/g, '');
    const keyMap = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    const normalizedKey = keyMap[cleanKey] || cleanKey;
    return this.keys.includes(normalizedKey);
  }

  // Obter próximo tom (subir um semitom)
  getNextKey(key) {
    const normalizedKey = this.normalizeKey(key);
    const currentIndex = this.keys.indexOf(normalizedKey);
    if (currentIndex === -1) return key;
    
    const nextIndex = (currentIndex + 1) % 12;
    return this.keys[nextIndex];
  }

  // Obter tom anterior (descer um semitom)
  getPreviousKey(key) {
    const normalizedKey = this.normalizeKey(key);
    const currentIndex = this.keys.indexOf(normalizedKey);
    if (currentIndex === -1) return key;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = 11;
    return this.keys[prevIndex];
  }

  // Normalizar tom (privado)
  normalizeKey(key) {
    if (!key) return 'C';
    const cleanKey = key.replace(/[^A-G#b]/g, '');
    const keyMap = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    return keyMap[cleanKey] || cleanKey;
  }
}
