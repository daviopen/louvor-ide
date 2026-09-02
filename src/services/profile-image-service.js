/**
 * Upload e otimização de fotos de perfil no Cloudinary.
 * Nenhuma credencial secreta é utilizada no navegador: apenas cloud name e unsigned preset.
 */
(function initProfileImageService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeProfileImageService = api;
})(typeof window !== 'undefined' ? window : null, function createProfileImageServiceModule() {
  const ALLOWED_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

  function validateSourceFile(file, options = {}) {
    const maxSourceBytes = Math.max(1, Number(options.maxSourceBytes) || 5 * 1024 * 1024);
    if (!file) throw new Error('Selecione uma foto.');
    if (!ALLOWED_MIME_TYPES.includes(String(file.type || '').toLowerCase())) {
      throw new Error('Use uma imagem JPG, PNG ou WebP.');
    }
    if (!Number.isFinite(Number(file.size)) || Number(file.size) <= 0) throw new Error('A imagem selecionada está vazia.');
    if (Number(file.size) > maxSourceBytes) throw new Error('A foto deve ter no máximo 5 MB.');
    return true;
  }

  function loadImage(scope, file) {
    return new Promise((resolve, reject) => {
      const reader = new scope.FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      reader.onload = () => {
        const image = new scope.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('O arquivo selecionado não é uma imagem válida.'));
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Não foi possível otimizar a imagem.'));
        resolve(blob);
      }, mimeType, quality);
    });
  }

  async function optimizeProfileImage(scope, file, options = {}) {
    if (!scope || !scope.document || !scope.FileReader || !scope.Image) throw new Error('O navegador não suporta processamento local de imagens.');
    validateSourceFile(file, options);
    const maxDimension = Math.max(128, Number(options.maxDimension) || 800);
    const outputMimeType = options.outputMimeType || 'image/jpeg';
    const outputQuality = Math.min(0.95, Math.max(0.65, Number(options.outputQuality) || 0.86));
    const image = await loadImage(scope, file);
    const sourceWidth = Math.max(1, image.naturalWidth || image.width);
    const sourceHeight = Math.max(1, image.naturalHeight || image.height);
    const side = Math.min(sourceWidth, sourceHeight);
    const sourceX = Math.max(0, Math.floor((sourceWidth - side) / 2));
    const sourceY = Math.max(0, Math.floor((sourceHeight - side) / 2));
    const target = Math.min(maxDimension, side);
    const canvas = scope.document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem.');
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, target, target);
    return canvasToBlob(canvas, outputMimeType, outputQuality);
  }

  class ProfileImageService {
    constructor(config = {}, options = {}) {
      this.config = config;
      this.fetch = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
      if (!this.fetch) throw new Error('Fetch API é obrigatória para upload de fotos.');
    }

    endpoint() {
      const cloudName = String(this.config.cloudName || '').trim();
      if (!cloudName) throw new Error('Cloudinary cloud name não configurado.');
      return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
    }

    async upload(blob) {
      const uploadPreset = String(this.config.uploadPreset || '').trim();
      if (!uploadPreset) throw new Error('Cloudinary upload preset não configurado.');
      const form = new FormData();
      form.append('file', blob, `profile-${Date.now()}.jpg`);
      form.append('upload_preset', uploadPreset);
      const response = await this.fetch(this.endpoint(), { method: 'POST', body: form });
      let payload = null;
      try { payload = await response.json(); } catch (_) { /* resposta inválida */ }
      if (!response.ok || !payload || !payload.secure_url) {
        const message = payload?.error?.message || 'Não foi possível enviar a foto. Tente novamente.';
        throw new Error(message);
      }
      return {
        url: payload.secure_url,
        publicId: payload.public_id || null,
        width: payload.width || null,
        height: payload.height || null,
        bytes: payload.bytes || null
      };
    }

    async prepareAndUpload(scope, file) {
      const blob = await optimizeProfileImage(scope, file, this.config);
      return this.upload(blob);
    }
  }

  return Object.freeze({ ProfileImageService, validateSourceFile, optimizeProfileImage, ALLOWED_MIME_TYPES });
});
