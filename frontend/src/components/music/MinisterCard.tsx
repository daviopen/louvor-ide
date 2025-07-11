import React from 'react';
import { User, Mail, Phone, Music, Eye, Edit, Trash2 } from 'lucide-react';
import type { Minister } from '../../types/music';
import clsx from 'clsx';

interface MinisterCardProps {
  minister: Minister;
  onView: (minister: Minister) => void;
  onEdit: (minister: Minister) => void;
  onDelete: (minister: Minister) => void;
  className?: string;
}

const MinisterCard: React.FC<MinisterCardProps> = ({
  minister,
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
            onClick={() => onView(minister)}
          >
            {minister.nome}
          </h3>
          <p className="text-sm text-gray-600 truncate">{minister.email || 'Email não informado'}</p>
        </div>
        
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(minister);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="Editar ministro"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(minister);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Excluir ministro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={clsx(
          'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full',
          minister.status === 'ativo'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        )}>
          <User className="w-3 h-3" />
          {minister.status}
        </span>
        
        {minister.instrumento && minister.instrumento.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
            <Music className="w-3 h-3" />
            {minister.instrumento.join(', ')}
          </span>
        )}
      </div>

      {/* Contact info */}
      {(minister.telefone || minister.email) && (
        <div className="space-y-1 mb-4 text-sm text-gray-600">
          {minister.telefone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3" />
              <span>{minister.telefone}</span>
            </div>
          )}
          {minister.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3" />
              <span className="truncate">{minister.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col text-xs text-gray-500">
        {/* Exibe data apenas se for data válida */}
        {(() => {
          const dateValue = minister.updatedAt ?? minister.createdAt;
          const parsed = parseTimestamp(dateValue);
          if (isNaN(parsed.getTime())) return null;
          return <span>Atualizado em {formatDateTime(dateValue)}</span>;
        })()}

        <div className="flex items-center justify-end mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onView(minister); }}
            className="p-2 text-primary-600 hover:text-primary-700 transition-colors"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinisterCard;
