import React from 'react';
import { X, User, Mail, Phone, Music, Calendar, Edit } from 'lucide-react';
import type { Minister } from '../../types/music';
import clsx from 'clsx';

interface MinisterViewerProps {
  minister: Minister | null;
  onClose: () => void;
  onEdit: (minister: Minister) => void;
  isOpen: boolean;
}

const MinisterViewer: React.FC<MinisterViewerProps> = ({ minister, onClose, onEdit, isOpen }) => {
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

  if (!isOpen || !minister) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{minister.nome}</h2>
              <p className="text-sm text-gray-600">{minister.email || 'Email não informado'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(minister)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
              title="Editar ministro"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={clsx(
              'inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium',
              minister.status === 'ativo'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            )}>
              <User className="w-4 h-4" />
              {minister.status.charAt(0).toUpperCase() + minister.status.slice(1)}
            </span>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Informações de Contato
              </h3>
              
              {minister.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{minister.email}</p>
                  </div>
                </div>
              )}

              {minister.telefone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium text-gray-900">{minister.telefone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Informações Musicais
              </h3>
              
              {minister.instrumento && minister.instrumento.length > 0 && (
                <div className="flex items-start gap-3">
                  <Music className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Instrumentos</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {minister.instrumento.map((inst, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {minister.observacoes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Observações
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{minister.observacoes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">Criado em</p>
                  <p className="font-medium text-gray-900">{formatDateTime(minister.createdAt)}</p>
                </div>
              </div>
              
              {minister.updatedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600">Atualizado em</p>
                    <p className="font-medium text-gray-900">{formatDateTime(minister.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => onEdit(minister)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Editar Ministro
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinisterViewer;
