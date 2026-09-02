/**
 * Legacy permissions route.
 * Permission administration now lives in Configurações > Rotas e Acessos.
 * Kept only as a compatibility redirect for old bookmarks.
 */
(function redirectLegacyPermissions(scope) {
  if (!scope || !scope.location) return;
  const params = new URLSearchParams(scope.location.search || '');
  if (params.get('section') !== 'permissions') return;
  scope.location.replace('module.html?section=settings&tab=routes');
})(typeof window !== 'undefined' ? window : null);
