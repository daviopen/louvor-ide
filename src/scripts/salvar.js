function salvarMusica(event) {
  if (event) {
    event.preventDefault();
  }
  
  // Verificar se todos os elementos necessários existem
  const tituloEl = document.getElementById('titulo');
  const artistaEl = document.getElementById('artista');
  const tomEl = document.getElementById('tom');
  const tomMinistroEl = document.getElementById('tomMinistro');
  const bpmEl = document.getElementById('bpm');
  const linkEl = document.getElementById('link');
  const cifraEl = document.getElementById('cifra');
  const mensagemEl = document.getElementById('mensagem');
  const saveBtn = document.getElementById('save-btn');

  if (!tituloEl || !artistaEl || !tomEl || !tomMinistroEl || !bpmEl || !linkEl || !cifraEl || !mensagemEl || !saveBtn) {
    console.error('❌ Erro: Alguns elementos do formulário não foram encontrados');
    alert('Erro interno: Elementos do formulário não encontrados. Tente recarregar a página.');
    return;
  }

  const titulo = tituloEl.value.trim();
  const artista = artistaEl.value.trim();
  const tom = tomEl.value.trim();
  const tomMinistro = tomMinistroEl.value.trim();
  const bpm = bpmEl.value.trim();
  const link = linkEl.value.trim();
  const cifra = cifraEl.value.trim();

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
    console.log('✅ Música salva com sucesso no Firebase');
    showMessage("🎵 Música salva com sucesso! Redirecionando...", "success");
    
    // Reabilitar botão com feedback visual de sucesso
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    saveBtn.style.background = '#4CAF50';
    
    // Limpar formulário após sucesso
    setTimeout(() => {
      limparFormulario();
      // Redirecionar para página inicial após 3 segundos
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
    }, 1500);
    
  }).catch((error) => {
    console.error("❌ Erro ao salvar música:", error);
    showMessage("❌ Erro ao salvar música. Tente novamente.", "error");
    
    // Reabilitar botão em caso de erro
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Música';
    saveBtn.style.background = ''; // Remove cor personalizada
  }).finally(() => {
    // Garantir que o botão seja reabilitado se ainda estiver desabilitado
    setTimeout(() => {
      if (saveBtn.disabled) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Música';
        saveBtn.style.background = ''; // Remove cor personalizada
      }
    }, 5000);
  });
}

function limparFormulario() {
  // Verificar se elementos existem antes de limpar
  const elementos = [
    'titulo', 'artista', 'tom', 'tomMinistro', 
    'bpm', 'link', 'cifra'
  ];
  
  elementos.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.value = "";
    }
  });
  
  // Limpar mensagem
  const mensagemEl = document.getElementById('mensagem');
  if (mensagemEl) {
    mensagemEl.classList.remove('show');
  }
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
  if (!mensagemEl) {
    console.warn('⚠️ Elemento de mensagem não encontrado');
    console.log(`Message (${type}): ${text}`);
    return;
  }

  mensagemEl.textContent = text;
  mensagemEl.className = `message ${type}`;
  mensagemEl.classList.add('show');
  mensagemEl.style.display = 'block';
  
  console.log(`✅ Message displayed (${type}): ${text}`);
  
  // Auto-hide para mensagens de sucesso após 4 segundos
  if (type === 'success') {
    setTimeout(() => {
      mensagemEl.classList.remove('show');
      setTimeout(() => {
        mensagemEl.style.display = 'none';
      }, 300); // Aguarda a animação terminar
    }, 4000);
  }
  
  // Auto-hide para mensagens de erro após 6 segundos
  if (type === 'error') {
    setTimeout(() => {
      mensagemEl.classList.remove('show');
      setTimeout(() => {
        mensagemEl.style.display = 'none';
      }, 300); // Aguarda a animação terminar
    }, 6000);
  }
}

// Auto-resize do textarea
document.addEventListener('DOMContentLoaded', function() {
  const textarea = document.getElementById('cifra');
  
  if (!textarea) {
    console.warn('⚠️ Elemento textarea "cifra" não encontrado');
    return;
  }
  
  function autoResize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
  }
  
  textarea.addEventListener('input', autoResize);
  autoResize(); // Chamada inicial
});
