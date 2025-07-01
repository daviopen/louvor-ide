/**
 * Transpose Service - Gerenciamento de transposição de acordes
 */

import { Utils } from './utils.js';

export class TransposeService {
  constructor() {
    this.keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    this.currentStep = 0;
    this.originalKey = null;
    this.originalCifra = '';
    this.isChordTransposerReady = false;
    
    this.checkChordTransposer();
  }

  // Verificar se ChordTransposer está disponível
  checkChordTransposer() {
    if (typeof ChordTransposer !== 'undefined') {
      this.isChordTransposerReady = true;
      console.log("✅ TransposeService: ChordTransposer disponível");
    } else {
      console.warn("⚠️ TransposeService: ChordTransposer não disponível");
      // Tentar novamente em 1 segundo
      setTimeout(() => this.checkChordTransposer(), 1000);
    }
  }

  // Inicializar com uma música
  initialize(musica) {
    if (!musica) {
      console.error("❌ TransposeService: Música não fornecida");
      return false;
    }

    this.originalKey = musica.tom || 'C';
    this.originalCifra = musica.cifra || '';
    this.currentStep = 0;
    
    console.log("🎵 TransposeService: Inicializado com música:", musica.titulo);
    console.log("🎼 Tom original:", this.originalKey);
    
    return true;
  }

  // Obter tom atual
  getCurrentKey() {
    if (!this.originalKey || this.currentStep === 0) {
      return this.originalKey || 'N/A';
    }
    
    const currentIndex = this.keys.indexOf(this.originalKey);
    
    if (currentIndex === -1) {
      console.warn("⚠️ Tom original não reconhecido:", this.originalKey);
      return this.originalKey;
    }
    
    let newIndex = (currentIndex + this.currentStep) % 12;
    if (newIndex < 0) newIndex += 12;
    
    return this.keys[newIndex];
  }

  // Transpor para cima
  transposeUp() {
    return this.transpose(1);
  }

  // Transpor para baixo
  transposeDown() {
    return this.transpose(-1);
  }

  // Transpor por número de semitons
  transpose(steps) {
    if (!this.isChordTransposerReady) {
      console.error("❌ TransposeService: ChordTransposer não disponível");
      throw new Error("Biblioteca de transposição não carregada. Recarregue a página.");
    }

    if (!this.originalCifra) {
      console.error("❌ TransposeService: Cifra original não definida");
      throw new Error("Cifra não disponível para transposição");
    }

    try {
      this.currentStep += steps;
      console.log(`🎼 TransposeService: Transpondo ${steps} semitons (total: ${this.currentStep})`);
      
      const transposed = ChordTransposer.transpose(this.originalCifra).up(this.currentStep).toString();
      const currentKey = this.getCurrentKey();
      
      console.log(`🎵 Novo tom: ${currentKey}`);
      
      return {
        cifra: transposed,
        currentKey: currentKey,
        currentStep: this.currentStep,
        isOriginal: this.currentStep === 0
      };
    } catch (error) {
      console.error("❌ TransposeService: Erro ao transpor:", error);
      throw new Error("Erro ao transpor a música: " + error.message);
    }
  }

  // Resetar para tom original
  reset() {
    console.log("🔄 TransposeService: Resetando para tom original");
    this.currentStep = 0;
    
    return {
      cifra: this.originalCifra,
      currentKey: this.originalKey,
      currentStep: 0,
      isOriginal: true
    };
  }

  // Transpor para tom específico
  transposeToKey(targetKey) {
    if (!this.originalKey) {
      throw new Error("Tom original não definido");
    }

    // Normalizar as chaves
    const normalizeKey = (key) => {
      if (!key) return 'C';
      const cleanKey = key.replace(/[^A-G#b]/g, '').toUpperCase();
      const keyMap = {
        'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#'
      };
      return keyMap[cleanKey] || cleanKey;
    };

    const normalizedOriginal = normalizeKey(this.originalKey);
    const normalizedTarget = normalizeKey(targetKey);

    const originalIndex = this.keys.indexOf(normalizedOriginal);
    const targetIndex = this.keys.indexOf(normalizedTarget);

    if (originalIndex === -1 || targetIndex === -1) {
      throw new Error("Tom inválido");
    }

    // Calcular steps usando o caminho mais curto
    let steps = targetIndex - originalIndex;
    if (steps > 6) steps -= 12;
    if (steps < -6) steps += 12;

    // Resetar e aplicar nova transposição
    this.currentStep = 0;
    return this.transpose(steps);
  }

  // Obter informações de transposição
  getTransposeInfo() {
    return {
      originalKey: this.originalKey,
      currentKey: this.getCurrentKey(),
      currentStep: this.currentStep,
      isOriginal: this.currentStep === 0,
      availableKeys: this.keys,
      canTransposeUp: true,
      canTransposeDown: true
    };
  }

  // Destacar acordes na cifra
  highlightChords(cifra) {
    return Utils.highlightChords(cifra);
  }

  // Obter direções de transposição sugeridas
  getSuggestedTranspositions() {
    if (!this.originalKey) return [];

    const suggestions = [];
    const originalIndex = this.keys.indexOf(this.originalKey);
    
    if (originalIndex === -1) return [];

    // Sugerir tons comuns
    const commonTranspositions = [
      { steps: 2, label: "1 tom acima" },
      { steps: -2, label: "1 tom abaixo" },
      { steps: 3, label: "Meio tom acima (capo 3)" },
      { steps: -3, label: "Meio tom abaixo" },
      { steps: 5, label: "Quinta acima" },
      { steps: -5, label: "Quinta abaixo" }
    ];

    for (const suggestion of commonTranspositions) {
      let newIndex = (originalIndex + suggestion.steps) % 12;
      if (newIndex < 0) newIndex += 12;
      
      suggestions.push({
        ...suggestion,
        targetKey: this.keys[newIndex],
        isCurrent: this.currentStep === suggestion.steps
      });
    }

    return suggestions;
  }

  // Salvar preferência de transposição
  saveTransposePreference(musicId, steps) {
    const preferences = JSON.parse(localStorage.getItem('transposePreferences') || '{}');
    preferences[musicId] = steps;
    localStorage.setItem('transposePreferences', JSON.stringify(preferences));
    
    console.log(`💾 TransposeService: Preferência salva para música ${musicId}: ${steps} semitons`);
  }

  // Carregar preferência de transposição
  loadTransposePreference(musicId) {
    const preferences = JSON.parse(localStorage.getItem('transposePreferences') || '{}');
    const steps = preferences[musicId] || 0;
    
    if (steps !== 0) {
      console.log(`📥 TransposeService: Carregando preferência para música ${musicId}: ${steps} semitons`);
      this.currentStep = 0; // Reset
      return this.transpose(steps);
    }
    
    return null;
  }

  // Limpar preferências de transposição
  clearTransposePreferences() {
    localStorage.removeItem('transposePreferences');
    console.log("🗑️ TransposeService: Preferências de transposição limpas");
  }

  // Transpor diretamente de um tom para outro
  transposeKey(fromKey, toKey) {
    if (!fromKey || !toKey) {
      console.warn("⚠️ TransposeService: Tons não fornecidos");
      return fromKey || 'C';
    }

    // Normalizar os tons (remover sufixos como m, 7, etc.)
    const normalizeKey = (key) => {
      const cleanKey = key.replace(/[^A-G#b]/g, '').toUpperCase();
      // Converter bemóis para sustenidos para padronização
      const keyMap = {
        'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#'
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

    // Calcular a diferença em semitons usando o caminho mais curto
    let semitones = toIndex - fromIndex;
    if (semitones > 6) semitones -= 12;
    if (semitones < -6) semitones += 12;

    console.log(`🎼 TransposeService: ${fromKey} -> ${toKey} (${semitones} semitons)`);
    return toKey;
  }
}

// Criar instância global
const transposeService = new TransposeService();

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  window.transposeService = transposeService;
}

export default transposeService;
