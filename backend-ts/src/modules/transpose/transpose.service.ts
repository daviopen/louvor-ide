import * as Teoria from 'teoria';
import { TransposeRequest, TransposeResponse, ValidationResponse } from '../../types';

export class TransposeService {
  private readonly validKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /**
   * Transpose a cifra by semitones
   */
  transpose(request: TransposeRequest): TransposeResponse {
    const { cifra, semitones, tomOriginal } = request;

    try {
      // Transpose the cifra text
      const cifraTransposta = this.transposeCifraText(cifra, semitones);
      
      // Calculate final key if original key provided
      let tomFinal: string | undefined;
      if (tomOriginal) {
        tomFinal = this.transposeKey(tomOriginal, semitones);
      }

      return {
        cifraOriginal: cifra,
        cifraTransposta,
        tomOriginal,
        tomFinal,
        semitones,
      };
    } catch (error) {
      throw new Error(`Erro ao transpor cifra: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Transpose a single key by semitones
   */
  transposeKey(originalKey: string, semitones: number): string {
    try {
      const note = Teoria.note(originalKey);
      const transposed = note.interval(Teoria.interval.toCoord([semitones]));
      return transposed.toString().replace('b', 'b').replace('♯', '#');
    } catch (error) {
      throw new Error(`Tom inválido: ${originalKey}`);
    }
  }

  /**
   * Validate a cifra and extract chords
   */
  validate(cifra: string): ValidationResponse {
    const errors: string[] = [];
    const warnings: string[] = [];
    const chordsFound: string[] = [];

    try {
      // Extract chords from cifra using regex
      const chordRegex = /\[([^\]]+)\]/g;
      let match;
      const chords = new Set<string>();

      while ((match = chordRegex.exec(cifra)) !== null) {
        const chord = match[1].trim();
        if (chord) {
          chords.add(chord);
          
          // Validate each chord
          try {
            Teoria.chord(chord);
          } catch (chordError) {
            // Try to parse as a simple note
            try {
              Teoria.note(chord.replace(/[^A-G#b]/g, ''));
              warnings.push(`Acorde '${chord}' pode estar incompleto ou em formato não padrão`);
            } catch (noteError) {
              errors.push(`Acorde inválido: '${chord}'`);
            }
          }
        }
      }

      chordsFound.push(...Array.from(chords).sort());

      // Additional validations
      if (chordsFound.length === 0) {
        warnings.push('Nenhum acorde encontrado na cifra. Use o formato [Acorde] para marcar acordes.');
      }

      if (cifra.length < 10) {
        warnings.push('Cifra muito curta. Considere adicionar mais conteúdo.');
      }

      if (cifra.length > 5000) {
        warnings.push('Cifra muito longa. Considere dividir em seções.');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        chordsFound,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Erro ao validar cifra: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
        warnings,
        chordsFound,
      };
    }
  }

  /**
   * Get all valid keys
   */
  getValidKeys(): string[] {
    return [...this.validKeys];
  }

  /**
   * Private method to transpose cifra text
   */
  private transposeCifraText(cifra: string, semitones: number): string {
    // Regular expression to find chords in brackets
    const chordRegex = /\[([^\]]+)\]/g;
    
    return cifra.replace(chordRegex, (match, chord) => {
      try {
        // Try to transpose the chord
        const transposedChord = this.transposeChordString(chord.trim(), semitones);
        return `[${transposedChord}]`;
      } catch (error) {
        // If chord is invalid, return original
        return match;
      }
    });
  }

  /**
   * Private method to transpose a chord string
   */
  private transposeChordString(chord: string, semitones: number): string {
    try {
      // Try to parse as a full chord first
      const teoriaChord = Teoria.chord(chord);
      const transposed = teoriaChord.root.interval(Teoria.interval.toCoord([semitones]));
      
      // Reconstruct the chord with the transposed root
      let result = transposed.toString().replace('b', 'b').replace('♯', '#');
      
      // Add back the chord quality/extensions
      const rootMatch = chord.match(/^[A-G][#b]?/);
      if (rootMatch) {
        const quality = chord.substring(rootMatch[0].length);
        result += quality;
      }
      
      return result;
    } catch (error) {
      // If full chord parsing fails, try just the root note
      const rootMatch = chord.match(/^[A-G][#b]?/);
      if (rootMatch) {
        try {
          const root = rootMatch[0];
          const note = Teoria.note(root);
          const transposed = note.interval(Teoria.interval.toCoord([semitones]));
          const quality = chord.substring(root.length);
          
          return transposed.toString().replace('b', 'b').replace('♯', '#') + quality;
        } catch (noteError) {
          throw new Error(`Não foi possível transpor o acorde: ${chord}`);
        }
      }
      
      throw new Error(`Formato de acorde inválido: ${chord}`);
    }
  }

  /**
   * Convert chord to different notations
   */
  convertChordNotation(chord: string, notation: 'sharp' | 'flat' = 'sharp'): string {
    try {
      const teoriaChord = Teoria.chord(chord);
      const root = teoriaChord.root;
      
      if (notation === 'flat') {
        return root.toString(true); // Use flat notation
      } else {
        return root.toString(false); // Use sharp notation
      }
    } catch (error) {
      return chord; // Return original if conversion fails
    }
  }

  /**
   * Get chord information
   */
  getChordInfo(chord: string): {
    name: string;
    root: string;
    quality: string;
    notes: string[];
    intervals: string[];
  } | null {
    try {
      const teoriaChord = Teoria.chord(chord);
      
      return {
        name: teoriaChord.name,
        root: teoriaChord.root.toString(),
        quality: teoriaChord.quality,
        notes: teoriaChord.notes().map(note => note.toString()),
        intervals: teoriaChord.simple(),
      };
    } catch (error) {
      return null;
    }
  }
}
