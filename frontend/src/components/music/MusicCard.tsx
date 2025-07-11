import React from 'react';
import { Music, Clock, Headphones, Eye, Edit, Trash2 } from 'lucide-react';
import type { Music as MusicType } from '../../types/music';
import clsx from 'clsx';

interface MusicCardProps {
  music: MusicType;
  onView: (music: MusicType) => void;
  onEdit: (music: MusicType) => void;
  onDelete: (music: MusicType) => void;
  className?: string;
}

const MusicCard: React.FC<MusicCardProps> = ({
  music,
  onView,
  onEdit,
  onDelete,
  className
}) => {
  // Converte Firebase Timestamp ou string em Date
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

  const formatBPM = (bpm?: number) => {
    return bpm ? `${bpm} BPM` : 'BPM não definido';
  };

  return (
    <div className={clsx(
      'card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group',
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 
            className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors"
            onClick={() => onView(music)}
          >
            {music.titulo}
          </h3>
          <p className="text-sm text-gray-600 truncate">{music.artista}</p>
        </div>
        
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(music);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="Editar música"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(music);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Excluir música"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
          <Music className="w-3 h-3" />
          {music.tom}
        </span>
        
        {music.bpm && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            {formatBPM(music.bpm)}
          </span>
        )}
        
        {/* Removido badge de ministros */}
      </div>

      {/* Footer */}
      <div className="flex flex-col text-xs text-gray-500">
        {/* Exibe data apenas se for data válida */}
        {(() => {
          const dateValue = music.updatedAt ?? music.createdAt;
          const parsed = parseTimestamp(dateValue);
          if (isNaN(parsed.getTime())) return null;
          return <span>Atualizado em {formatDateTime(dateValue)}</span>;
        })()}

        <div className="flex items-center justify-between mt-2">
          {music.link && (
            <a
              href={music.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
              title="Ouvir música"
            >
              <Headphones className="w-4 h-4" />
            </a>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); onView(music); }}
            className="p-2 text-primary-600 hover:text-primary-700 transition-colors"
            title="Ver completa"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusicCard;
