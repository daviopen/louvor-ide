(function exposeCloudinaryPublicConfig(scope) {
  if (!scope) return;
  scope.MusicIdeCloudinaryConfig = Object.freeze({
    cloudName: 'vqyuxscx',
    uploadPreset: 'ide_music_profile',
    maxSourceBytes: 5 * 1024 * 1024,
    maxDimension: 800,
    outputMimeType: 'image/jpeg',
    outputQuality: 0.86
  });
})(typeof window !== 'undefined' ? window : null);
