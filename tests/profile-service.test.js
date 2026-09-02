const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ProfileService,
  normalizeProfileInput,
  validateBirthDate,
  validatePasswordChange,
  authCapabilities,
  googleProviderPhoto
} = require('../src/services/profile-service.js');
const { validateSourceFile } = require('../src/services/profile-image-service.js');
const { SELF_EDITABLE_FIELDS } = require('../src/repositories/profile-repository.js');

test('normaliza somente dados pessoais necessários', () => {
  const result = normalizeProfileInput({
    name: '  Marina Oliveira  ',
    phone: ' (61) 99999-9999 ',
    birthDate: '1990-05-10',
    photoURL: 'https://res.cloudinary.com/vqyuxscx/image/upload/a.jpg'
  }, new Date('2026-09-02T12:00:00Z'));
  assert.deepEqual(result, {
    name: 'Marina Oliveira',
    phone: '(61) 99999-9999',
    birthDate: '1990-05-10',
    photoURL: 'https://res.cloudinary.com/vqyuxscx/image/upload/a.jpg'
  });
  assert.deepEqual(SELF_EDITABLE_FIELDS, ['name', 'phone', 'birthDate', 'photoURL']);
});

test('data de nascimento rejeita data inválida, futura e muito antiga', () => {
  assert.equal(validateBirthDate('', new Date('2026-09-02T00:00:00Z')), null);
  assert.throws(() => validateBirthDate('2026-02-31', new Date('2026-09-02T00:00:00Z')), /válida/);
  assert.throws(() => validateBirthDate('2027-01-01', new Date('2026-09-02T00:00:00Z')), /futuro/);
  assert.throws(() => validateBirthDate('1800-01-01', new Date('2026-09-02T00:00:00Z')), /válida/);
});

test('capacidade de senha depende do provider password', () => {
  assert.equal(authCapabilities({ providerData: [{ providerId: 'google.com' }] }).canChangePassword, false);
  assert.equal(authCapabilities({ providerData: [{ providerId: 'password' }] }).canChangePassword, true);
  const linked = { providerData: [{ providerId: 'google.com', photoURL: 'https://lh3.googleusercontent.com/a/x' }, { providerId: 'password' }] };
  assert.equal(authCapabilities(linked).canChangePassword, true);
  assert.equal(googleProviderPhoto(linked), 'https://lh3.googleusercontent.com/a/x');
});

test('alteração de senha aplica requisitos mínimos', () => {
  assert.throws(() => validatePasswordChange({ currentPassword: '', newPassword: 'Abcdef12', confirmPassword: 'Abcdef12' }), /senha atual/);
  assert.throws(() => validatePasswordChange({ currentPassword: 'Atual123', newPassword: 'curta', confirmPassword: 'curta' }), /8 caracteres/);
  assert.throws(() => validatePasswordChange({ currentPassword: 'Atual123', newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' }), /maiúscula/);
  assert.throws(() => validatePasswordChange({ currentPassword: 'Atual123', newPassword: 'NovaSenha1', confirmPassword: 'OutraSenha1' }), /não confere/);
  assert.deepEqual(validatePasswordChange({ currentPassword: 'Atual123', newPassword: 'NovaSenha1', confirmPassword: 'NovaSenha1' }), { currentPassword: 'Atual123', newPassword: 'NovaSenha1' });
});

test('upload local aceita apenas imagem suportada e até 5 MB', () => {
  assert.equal(validateSourceFile({ type: 'image/jpeg', size: 1024 }), true);
  assert.throws(() => validateSourceFile({ type: 'image/gif', size: 1024 }), /JPG, PNG ou WebP/);
  assert.throws(() => validateSourceFile({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/);
});

test('save persiste somente perfil próprio e sincroniza Firebase Auth', async () => {
  const calls = [];
  const repository = {
    async updateOwnProfile(userId, patch) { calls.push({ userId, patch }); return { id: userId, ...patch }; }
  };
  const profileUpdates = [];
  const user = {
    uid: 'u1',
    email: 'u1@example.com',
    providerData: [{ providerId: 'password' }],
    async updateProfile(patch) { profileUpdates.push(patch); }
  };
  const service = new ProfileService(repository, { clock: () => new Date('2026-09-02T12:00:00Z') });
  const updated = await service.save(user, { name: 'Pessoa Teste', phone: '', birthDate: '', photoURL: null, role: 'SUPER_ADMIN' });
  assert.equal(updated.name, 'Pessoa Teste');
  assert.deepEqual(calls[0].patch, { name: 'Pessoa Teste', phone: null, birthDate: null, photoURL: null });
  assert.equal(Object.hasOwn(calls[0].patch, 'role'), false);
  assert.deepEqual(profileUpdates[0], { displayName: 'Pessoa Teste', photoURL: null });
});
