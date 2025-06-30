/**
 * Utilities - Funções utilitárias compartilhadas
 */

export class Utils {
  // Validar URL
  static isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Debounce para otimizar performance
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Destacar acordes em texto
  static highlightChords(text) {
    const chordRegex = /\b([A-G](?:#|b)?(?:m|maj|dim|aug|sus|add|\d)*(?:\/[A-G](?:#|b)?)?)\b/g;
    return text.replace(chordRegex, '<span class="chord-highlight">$1</span>');
  }

  // Formatar ministros para exibição
  static formatMinistros(musica) {
    let ministrosDisplay = 'Não informado';
    if (musica.ministros && Array.isArray(musica.ministros) && musica.ministros.length > 0) {
      ministrosDisplay = musica.ministros.filter(Boolean).join(', ');
    } else if (musica.ministro && typeof musica.ministro === 'string') {
      ministrosDisplay = musica.ministro;
    }
    return ministrosDisplay;
  }

  // Formatar tom do ministro para exibição
  static formatTomMinistro(musica) {
    let tomMinistroDisplay = '';
    if (musica.tomMinistro && typeof musica.tomMinistro === 'object') {
      const tomsMinistros = Object.entries(musica.tomMinistro)
        .filter(([nome, tom]) => nome && tom)
        .map(([nome, tom]) => `${nome}: ${tom}`)
        .join(', ');
      tomMinistroDisplay = tomsMinistros;
    }
    return tomMinistroDisplay;
  }

  // Processar ministros de string para array
  static processMinistros(ministroString) {
    return ministroString ? 
      ministroString.split(',').map(m => m.trim()).filter(m => m.length > 0) : 
      [];
  }

  // Processar tom do ministro de string para objeto
  static processTomMinistro(tomMinistroString) {
    let tomMinistroObj = null;
    if (tomMinistroString) {
      try {
        tomMinistroObj = {};
        const pares = tomMinistroString.split(',').map(p => p.trim()).filter(p => p.length > 0);
        
        for (const par of pares) {
          if (par.includes(':')) {
            const [nome, tomValue] = par.split(':').map(s => s.trim());
            if (nome && tomValue) {
              tomMinistroObj[nome] = tomValue;
            }
          }
        }
        
        if (Object.keys(tomMinistroObj).length === 0) {
          tomMinistroObj = null;
        }
      } catch (error) {
        console.warn("Erro ao processar tom do ministro:", error);
        tomMinistroObj = null;
      }
    }
    return tomMinistroObj;
  }

  // Validar dados da música
  static validateMusicData(data) {
    const errors = [];

    if (!data.titulo || data.titulo.trim().length < 2) {
      errors.push("O título deve ter pelo menos 2 caracteres.");
    }

    if (!data.cifra || data.cifra.trim().length === 0) {
      errors.push("A cifra é obrigatória.");
    }

    if (data.bpm && (isNaN(data.bpm) || data.bpm < 60 || data.bpm > 200)) {
      errors.push("BPM deve ser um número entre 60 e 200.");
    }

    if (data.link && !this.isValidURL(data.link)) {
      errors.push("Por favor, insira um link válido.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Criar campos de busca para filtro
  static createSearchFields(musica) {
    let searchFields = [
      musica.titulo || '',
      musica.artista || '',
      musica.ministro || '',
      musica.tom || '',
      musica.bpm?.toString() || ''
    ].join(' ').toLowerCase();
    
    // Incluir ministros do array se existir
    if (musica.ministros && Array.isArray(musica.ministros)) {
      const ministrosText = musica.ministros.filter(Boolean).join(' ').toLowerCase();
      searchFields += ' ' + ministrosText;
    }
    
    // Incluir tom do ministro na busca
    if (musica.tomMinistro && typeof musica.tomMinistro === 'object') {
      const tomMinistroText = Object.entries(musica.tomMinistro)
        .filter(([nome, tom]) => nome && tom)
        .map(([nome, tom]) => `${nome} ${tom}`)
        .join(' ').toLowerCase();
      searchFields += ' ' + tomMinistroText;
    }
    
    return searchFields;
  }

  // Gerar ID único
  static generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Sanitizar dados para salvamento
  static sanitizeForSave(data) {
    const sanitized = { ...data };
    
    // Remover campos nulos ou vazios
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === null || sanitized[key] === undefined || sanitized[key] === '') {
        delete sanitized[key];
      }
    });
    
    return sanitized;
  }

  // Formatar timestamp para exibição
  static formatTimestamp(timestamp) {
    if (!timestamp) return 'Data não disponível';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Copiar texto para clipboard
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Erro ao copiar para clipboard:', err);
      return false;
    }
  }

  // Escape HTML para prevenir XSS
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Classe para gerenciar mensagens
export class MessageService {
  static show(message, type = 'info', duration = 3000) {
    const messageEl = document.getElementById('mensagem');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `message ${type}`;
      messageEl.style.display = 'block';
      
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          messageEl.style.display = 'none';
        }, duration);
      }
    }
    console.log(`Message (${type}): ${message}`);
  }

  static success(message, duration) {
    this.show(message, 'success', duration);
  }

  static error(message) {
    this.show(message, 'error');
  }

  static info(message, duration) {
    this.show(message, 'info', duration);
  }

  static warning(message, duration) {
    this.show(message, 'warning', duration);
  }
}

// Disponibilizar globalmente para compatibilidade
if (typeof window !== 'undefined') {
  window.showMessage = MessageService.show.bind(MessageService);
  window.isValidURL = Utils.isValidURL;
}
