/**
 * Modelo de dados canônico do IDE Music.
 *
 * Este módulo é deliberadamente puro: não conhece Firebase/DOM e pode ser
 * validado em Node. Repositories são responsáveis por converter Date em
 * Timestamp e por persistir os documentos.
 */
(function initDataModel(globalScope, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.MusicIdeDataModel = api;
  }
})(typeof window !== 'undefined' ? window : null, function createDataModel() {
  const DATA_MODEL_VERSION = 1;

  const COLLECTIONS = Object.freeze({
    USERS: 'users',
    MINISTRY_FUNCTIONS: 'ministryFunctions',
    USER_FUNCTIONS: 'userFunctions',
    PERMISSIONS: 'permissions',
    EVENTS: 'events',
    UNAVAILABILITY: 'unavailability',
    SCHEDULES: 'schedules',
    SCHEDULE_MEMBERS: 'scheduleMembers',
    SETLISTS: 'setlists',
    SETLIST_SONGS: 'setlistSongs',
    SONGS: 'songs',
    SONG_MINISTER_KEYS: 'songMinisterKeys',
    AUDIT_LOGS: 'auditLogs',
    LGPD_CONSENTS: 'lgpdConsents'
  });

  const PERMISSION_LEVELS = Object.freeze(['NONE', 'READ', 'EDIT']);
  const PERMISSION_MODULES = Object.freeze([
    'dashboard',
    'users',
    'permissions',
    'unavailability',
    'events',
    'schedules',
    'setlists',
    'songs',
    'audit'
  ]);
  const EVENT_STATUSES = Object.freeze(['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
  const SCHEDULE_STATUSES = Object.freeze(['DRAFT', 'COMPLETE', 'CANCELLED', 'COMPLETED']);
  const SETLIST_STATUSES = Object.freeze(['DRAFT', 'READY', 'CANCELLED', 'COMPLETED']);

  const DEFAULT_MINISTRY_FUNCTIONS = Object.freeze([
    Object.freeze({ name: 'Ministro', slug: 'ministro', order: 10, active: true }),
    Object.freeze({ name: 'Back Vocal', slug: 'back-vocal', order: 20, active: true }),
    Object.freeze({ name: 'Bateria', slug: 'bateria', order: 30, active: true }),
    Object.freeze({ name: 'Baixo', slug: 'baixo', order: 40, active: true }),
    Object.freeze({ name: 'Guitarra', slug: 'guitarra', order: 50, active: true }),
    Object.freeze({ name: 'Violão', slug: 'violao', order: 60, active: true }),
    Object.freeze({ name: 'Teclado', slug: 'teclado', order: 70, active: true }),
    Object.freeze({ name: 'Sax', slug: 'sax', order: 80, active: true }),
    Object.freeze({ name: 'DM', slug: 'dm', order: 90, active: true })
  ]);

  /**
   * Contratos mínimos persistidos. Campos opcionais podem ser adicionados pelos
   * domínios sem quebrar compatibilidade, desde que não misturem autorização,
   * credenciais ou regras de UI com os dados ministeriais.
   */
  const DATA_MODELS = Object.freeze({
    users: Object.freeze({
      collection: COLLECTIONS.USERS,
      required: Object.freeze(['uid', 'name', 'email', 'active']),
      references: Object.freeze([])
    }),
    ministryFunctions: Object.freeze({
      collection: COLLECTIONS.MINISTRY_FUNCTIONS,
      required: Object.freeze(['name', 'slug', 'active', 'order']),
      references: Object.freeze([])
    }),
    userFunctions: Object.freeze({
      collection: COLLECTIONS.USER_FUNCTIONS,
      required: Object.freeze(['userId', 'functionId', 'active']),
      references: Object.freeze(['userId', 'functionId'])
    }),
    permissions: Object.freeze({
      collection: COLLECTIONS.PERMISSIONS,
      required: Object.freeze(['userId', 'module', 'level']),
      references: Object.freeze(['userId'])
    }),
    events: Object.freeze({
      collection: COLLECTIONS.EVENTS,
      required: Object.freeze(['name', 'date', 'status']),
      references: Object.freeze([])
    }),
    unavailability: Object.freeze({
      collection: COLLECTIONS.UNAVAILABILITY,
      required: Object.freeze(['userId', 'date']),
      references: Object.freeze(['userId', 'eventId'])
    }),
    schedules: Object.freeze({
      collection: COLLECTIONS.SCHEDULES,
      required: Object.freeze(['eventId', 'status']),
      references: Object.freeze(['eventId'])
    }),
    scheduleMembers: Object.freeze({
      collection: COLLECTIONS.SCHEDULE_MEMBERS,
      required: Object.freeze(['scheduleId', 'userId', 'functionId', 'active']),
      references: Object.freeze(['scheduleId', 'userId', 'functionId'])
    }),
    setlists: Object.freeze({
      collection: COLLECTIONS.SETLISTS,
      required: Object.freeze(['eventId', 'scheduleId', 'status']),
      references: Object.freeze(['eventId', 'scheduleId'])
    }),
    setlistSongs: Object.freeze({
      collection: COLLECTIONS.SETLIST_SONGS,
      required: Object.freeze(['setlistId', 'songId', 'order']),
      references: Object.freeze(['setlistId', 'songId', 'ministerUserId'])
    }),
    songs: Object.freeze({
      collection: COLLECTIONS.SONGS,
      required: Object.freeze(['name', 'active']),
      references: Object.freeze([])
    }),
    songMinisterKeys: Object.freeze({
      collection: COLLECTIONS.SONG_MINISTER_KEYS,
      required: Object.freeze(['songId', 'userId', 'preferredKey']),
      references: Object.freeze(['songId', 'userId'])
    }),
    auditLogs: Object.freeze({
      collection: COLLECTIONS.AUDIT_LOGS,
      required: Object.freeze(['actorUserId', 'action', 'entityType', 'entityId', 'createdAt']),
      references: Object.freeze(['actorUserId'])
    }),
    lgpdConsents: Object.freeze({
      collection: COLLECTIONS.LGPD_CONSENTS,
      required: Object.freeze(['userId', 'documentType', 'version', 'acceptedAt']),
      references: Object.freeze(['userId'])
    })
  });

  function requiredString(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new TypeError(`${fieldName} deve ser uma string não vazia.`);
    }
    return value.trim();
  }

  function normalizeEmail(value) {
    const email = requiredString(value, 'email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new TypeError('email inválido.');
    }
    return email;
  }

  function normalizeSlug(value) {
    return requiredString(value, 'slug')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function assertOrder(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError('order deve ser um inteiro maior ou igual a zero.');
    }
    return value;
  }

  function encodeIdPart(value, fieldName) {
    return encodeURIComponent(requiredString(value, fieldName));
  }

  function relationDocumentId(...parts) {
    if (parts.length < 2) throw new TypeError('Uma relação exige ao menos duas partes.');
    return parts.map((part, index) => encodeIdPart(part, `relationPart${index + 1}`)).join('__');
  }

  function userFunctionDocumentId(userId, functionId) {
    return relationDocumentId(userId, functionId);
  }

  function permissionDocumentId(userId, moduleName) {
    return relationDocumentId(userId, moduleName);
  }

  function songMinisterKeyDocumentId(songId, userId) {
    return relationDocumentId(songId, userId);
  }

  function validateRequiredFields(modelName, document) {
    const schema = DATA_MODELS[modelName];
    if (!schema) throw new TypeError(`Modelo desconhecido: ${modelName}.`);
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new TypeError(`${modelName} deve ser um objeto.`);
    }

    for (const field of schema.required) {
      const value = document[field];
      if (value === undefined || value === null || value === '') {
        throw new TypeError(`${modelName}.${field} é obrigatório.`);
      }
    }

    return document;
  }

  function validateDocument(modelName, document) {
    validateRequiredFields(modelName, document);

    if (modelName === 'users') normalizeEmail(document.email);
    if (modelName === 'ministryFunctions') {
      requiredString(document.name, 'name');
      normalizeSlug(document.slug);
      assertOrder(document.order);
      if (typeof document.active !== 'boolean') throw new TypeError('active deve ser booleano.');
    }
    if (modelName === 'userFunctions' && typeof document.active !== 'boolean') {
      throw new TypeError('active deve ser booleano.');
    }
    if (modelName === 'permissions') {
      if (!PERMISSION_MODULES.includes(document.module)) throw new TypeError('Módulo de permissão inválido.');
      if (!PERMISSION_LEVELS.includes(document.level)) throw new TypeError('Nível de permissão inválido.');
    }
    if (modelName === 'events' && !EVENT_STATUSES.includes(document.status)) {
      throw new TypeError('Status de evento inválido.');
    }
    if (modelName === 'schedules' && !SCHEDULE_STATUSES.includes(document.status)) {
      throw new TypeError('Status de escala inválido.');
    }
    if (modelName === 'setlists' && !SETLIST_STATUSES.includes(document.status)) {
      throw new TypeError('Status de setlist inválido.');
    }
    if (modelName === 'scheduleMembers' && typeof document.active !== 'boolean') {
      throw new TypeError('active deve ser booleano.');
    }
    if (modelName === 'setlistSongs') assertOrder(document.order);
    if (modelName === 'songs' && typeof document.active !== 'boolean') {
      throw new TypeError('active deve ser booleano.');
    }

    return document;
  }

  function createUserDocument(input) {
    const document = {
      uid: requiredString(input.uid, 'uid'),
      name: requiredString(input.name, 'name'),
      email: normalizeEmail(input.email),
      photoURL: input.photoURL || null,
      active: input.active !== false
    };
    return validateDocument('users', document);
  }

  function createMinistryFunctionDocument(input) {
    const document = {
      name: requiredString(input.name, 'name'),
      slug: normalizeSlug(input.slug || input.name),
      active: input.active !== false,
      order: assertOrder(input.order ?? 0)
    };
    return validateDocument('ministryFunctions', document);
  }

  function createUserFunctionDocument(userId, functionId, active = true) {
    return validateDocument('userFunctions', {
      userId: requiredString(userId, 'userId'),
      functionId: requiredString(functionId, 'functionId'),
      active: Boolean(active)
    });
  }

  return Object.freeze({
    DATA_MODEL_VERSION,
    COLLECTIONS,
    DATA_MODELS,
    DEFAULT_MINISTRY_FUNCTIONS,
    PERMISSION_LEVELS,
    PERMISSION_MODULES,
    EVENT_STATUSES,
    SCHEDULE_STATUSES,
    SETLIST_STATUSES,
    normalizeEmail,
    normalizeSlug,
    relationDocumentId,
    userFunctionDocumentId,
    permissionDocumentId,
    songMinisterKeyDocumentId,
    validateRequiredFields,
    validateDocument,
    createUserDocument,
    createMinistryFunctionDocument,
    createUserFunctionDocument
  });
});
