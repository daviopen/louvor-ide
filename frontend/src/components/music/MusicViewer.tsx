import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, RotateCcw, Volume2, Headphones, Edit, X } from 'lucide-react';
import type { Music } from '../../types/music';
import { ApiService } from '../../services/api';
import { VALID_KEYS } from '../../config/constants';
import clsx from 'clsx';

interface MusicViewerProps {
  music: Music | null;
  onClose: () => void;
  onEdit: (music: Music) => void;
  isOpen: boolean;
}

const MusicViewer: React.FC<MusicViewerProps> = ({ music, onClose, onEdit, isOpen }) => {
  // Função para converter Firebase Timestamp ou string em Date
  const parseTimestamp = (date: any): Date => {
    if (date instanceof Date) return date;
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    if (date && typeof date === 'object' && ('seconds' in date || '_seconds' in date)) {
      const secs = (date.seconds ?? date._seconds) * 1000;
      return new Date(secs);
    }
    return new Date(date);
  };

  // Formata data e hora para DD/MM/AAAA HH:MM
  const formatDateTime = (date: any) => {
    const d = parseTimestamp(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const [currentTranspose, setCurrentTranspose] = useState(0);
  const [transposedCifra, setTransposedCifra] = useState(music?.cifra || '');
  const [currentKey, setCurrentKey] = useState(music?.tom || '');
  const [isTransposing, setIsTransposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when music changes
  useEffect(() => {
    if (music) {
      setCurrentTranspose(0);
      setTransposedCifra(music.cifra);
      setCurrentKey(music.tom);
      setError(null);
    }
  }, [music]);

  // Early return if no music is provided
  if (!music) {
    return null;
  }

  const transpose = async (semitones: number) => {
    if (semitones === 0) return;

    setIsTransposing(true);
    setError(null);

    try {
      const response = await ApiService.transposeCifra({
        cifra: music.cifra,
        semitones: currentTranspose + semitones,
        tom_original: music.tom
      });

      setTransposedCifra(response.cifraTransposta);
      setCurrentTranspose(currentTranspose + semitones);
      setCurrentKey(response.tomFinal || calculateNewKey(music.tom, currentTranspose + semitones));
    } catch (err) {
      console.error('Erro ao transpor:', err);
      // Fallback to local transposition
      const newKey = calculateNewKey(music.tom, currentTranspose + semitones);
      setCurrentKey(newKey);
      setCurrentTranspose(currentTranspose + semitones);
      setError('Transposição offline - algumas funcionalidades podem estar limitadas');
    } finally {
      setIsTransposing(false);
    }
  };

  const calculateNewKey = (originalKey: string, semitones: number) => {
    const keyIndex = VALID_KEYS.indexOf(originalKey);
    if (keyIndex === -1) return originalKey;
    
    let newIndex = (keyIndex + semitones) % 12;
    if (newIndex < 0) newIndex += 12;
    
    return VALID_KEYS[newIndex];
  };

  const resetTranspose = async () => {
    setCurrentTranspose(0);
    setTransposedCifra(music.cifra);
    setCurrentKey(music.tom);
    setError(null);
  };

  const formatCifra = (cifra: string) => {
    return cifra.split('\n').map((line, index) => (
      <div key={index} className="chord-line">
        {line || <br />}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{music.titulo}</h2>
            <p className="text-lg text-gray-600 truncate">{music.artista}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Tom original: <strong>{music.tom}</strong></span>
              {music.bpm && <span>BPM: <strong>{music.bpm}</strong></span>}
              {currentTranspose !== 0 && (
                <span className="text-primary-600 font-medium">
                  Tom atual: <strong>{currentKey}</strong> ({currentTranspose > 0 ? '+' : ''}{currentTranspose} semitons)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(music)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
              title="Editar música"
            >
              <Edit className="w-5 h-5" />
            </button>
            
            {music.link && (
              <a
                href={music.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                title="Ouvir música"
              >
                <Headphones className="w-5 h-5" />
              </a>
            )}
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transpose controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => transpose(-1)}
              disabled={isTransposing}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-red-100 text-red-700 hover:bg-red-200',
                isTransposing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ChevronDown className="w-4 h-4" />
              Tom ↓
            </button>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
              <Volume2 className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-lg font-bold text-primary-600">
                {currentKey}
              </span>
              {currentTranspose !== 0 && (
                <span className="text-sm text-gray-500">
                  ({currentTranspose > 0 ? '+' : ''}{currentTranspose})
                </span>
              )}
            </div>
            
            <button
              onClick={() => transpose(1)}
              disabled={isTransposing}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-green-100 text-green-700 hover:bg-green-200',
                isTransposing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ChevronUp className="w-4 h-4" />
              Tom ↑
            </button>
            
            {currentTranspose !== 0 && (
              <button
                onClick={resetTranspose}
                disabled={isTransposing}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  isTransposing && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}
        </div>

        {/* Ministers and their keys */}
        {music.ministros.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Ministros e Tons:</h3>
            <div className="flex flex-wrap gap-2">
              {music.ministros.map((ministro) => {
                const ministroKey = music.tomMinistro[ministro] || music.tom;
                const ministroTransposed = calculateNewKey(ministroKey, currentTranspose);
                
                return (
                  <div key={ministro} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    <span>{ministro}:</span>
                    <span className="font-mono font-bold">
                      {ministroTransposed}
                      {currentTranspose !== 0 && ministroKey !== ministroTransposed && (
                        <span className="text-blue-500 ml-1">
                          (era {ministroKey})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cifra content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
              {formatCifra(transposedCifra)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {/* Exibe data somente se updatedAt ou createdAt estiver presente */}
              {(() => {
                const dateValue = music.updatedAt ?? music.createdAt;
                return dateValue ? (
                  <span>Atualizado em {formatDateTime(dateValue)}</span>
                ) : null;
              })()}
            </span>
            <div className="flex items-center gap-4">
              <span>ID: {music.id}</span>
              {isTransposing && <span className="text-primary-600">Transpondo...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicViewer;
