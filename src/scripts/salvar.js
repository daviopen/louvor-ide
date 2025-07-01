function salvarMusica(event) {
  if (event) {
    event.preventDefault();
  }
  
  const titulo = document.getElementById('titulo').value.trim();
  const artista = document.getElementById('artista').value.trim();
  const tom = document.getElementById('tom').value.trim();
  const tomMinistro = document.getElementById('tomMinistro').value.trim();
  const bpm = document.getElementById('bpm').value.trim();
  const link = document.getElementById('link').value.trim();
  const cifra = document.getElementById('cifra').value.trim();
  const mensagemEl = document.getElementById('mensagem');
  const saveBtn = document.getElementById('save-btn');

  // Validações
  if (!titulo || !cifra) {
    showMessage("Preencha ao menos o título e a cifra.", "error");
    return;
  }

  if (titulo.length < 2) {
    showMessage("O título deve ter pelo menos 2 caracteres.", "error");
    return;
  }

  // Validar BPM se fornecido
  if (bpm && (isNaN(bpm) || bpm < 60 || bpm > 200)) {
    showMessage("BPM deve ser um número entre 60 e 200.", "error");
    return;
  }

  // Validar URL se fornecida
  if (link && !isValidURL(link)) {
    showMessage("Por favor, insira um link válido.", "error");
    return;
  }

  // Processar tom do ministro
  let tomMinistroObj = null;
  if (tomMinistro) {
    try {
      tomMinistroObj = {};
      const pares = tomMinistro.split(',').map(p => p.trim()).filter(p => p.length > 0);
      
      for (const par of pares) {
        const [nomeMinistro, tomDoMinistro] = par.split(':').map(p => p.trim());
        if (nomeMinistro && tomDoMinistro) {
          tomMinistroObj[nomeMinistro] = tomDoMinistro;
        }
      }
      
      // Se não conseguiu processar nenhum tom válido, definir como null
      if (Object.keys(tomMinistroObj).length === 0) {
        tomMinistroObj = null;
      }
    } catch (error) {
      console.warn("Erro ao processar tom do ministro:", error);
      tomMinistroObj = null;
    }
  }

  // Desabilitar botão durante salvamento
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  // Verificar se DB está disponível
  if (!window.db) {
    showMessage("Sistema de dados não disponível. Tente recarregar a página.", "error");
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Música';
    return;
  }

  window.db.collection("musicas").add({
    titulo: titulo,
    artista: artista || null,
    tom: tom || null,
    tomMinistro: tomMinistroObj,
    bpm: bpm ? parseInt(bpm) : null,
    link: link || null,
    cifra: cifra,
    timestamp: Date.now(),
    criadoEm: new Date()
  }).then(() => {
    showMessage("Música salva com sucesso!", "success");
    
    // Limpar formulário após sucesso
    setTimeout(() => {
      limparFormulario();
      // Redirecionar para página inicial após 2 segundos
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }, 1000);
    
  }).catch((error) => {
    console.error("Erro ao salvar música:", error);
    showMessage("Erro ao salvar música. Tente novamente.", "error");
  }).finally(() => {
    // Reabilitar botão
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Música';
  });
}

function limparFormulario() {
  document.getElementById('titulo').value = "";
  document.getElementById('artista').value = "";
  document.getElementById('tom').value = "";
  document.getElementById('tomMinistro').value = "";
  document.getElementById('bpm').value = "";
  document.getElementById('link').value = "";
  document.getElementById('cifra').value = "";
  
  // Limpar mensagem
  const mensagemEl = document.getElementById('mensagem');
  mensagemEl.classList.remove('show');
}

function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function showMessage(text, type) {
  const mensagemEl = document.getElementById('mensagem');
  mensagemEl.textContent = text;
  mensagemEl.className = `message ${type}`;
  mensagemEl.classList.add('show');
  
  // Auto-hide após 5 segundos para mensagens de erro
  if (type === 'error') {
    setTimeout(() => {
      mensagemEl.classList.remove('show');
    }, 5000);
  }
}

// Auto-resize do textarea
document.addEventListener('DOMContentLoaded', function() {
  const textarea = document.getElementById('cifra');
  
  function autoResize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
  }
  
  textarea.addEventListener('input', autoResize);
  autoResize(); // Chamada inicial
});
