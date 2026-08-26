const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildDashboardViewModel, DashboardService } = require('../src/services/dashboard-service.js');
const { DashboardRepository } = require('../src/repositories/dashboard-repository.js');

const now = new Date('2026-08-25T12:00:00-03:00');
const date = value => new Date(`${value}T10:00:00-03:00`);

test('Dashboard filtra passado/cancelados, ordena próximos itens e conta integrantes ativos', () => {
  const result = buildDashboardViewModel({
    profile: { active: true, role: 'MEMBER' },
    events: [
      { id: 'event-2', name: 'Evento 2', date: date('2026-08-30'), status: 'CONFIRMED' },
      { id: 'event-old', name: 'Antigo', date: date('2026-08-20'), status: 'COMPLETED' },
      { id: 'event-1', name: 'Evento 1', date: date('2026-08-26'), status: 'PLANNED' },
      { id: 'event-cancel', name: 'Cancelado', date: date('2026-08-27'), status: 'CANCELLED' }
    ],
    schedules: [
      { id: 'schedule-2', eventId: 'event-2', status: 'COMPLETE' },
      { id: 'schedule-1', eventId: 'event-1', status: 'DRAFT' }
    ],
    scheduleMembers: [
      { scheduleId: 'schedule-1', active: true },
      { scheduleId: 'schedule-1', active: true },
      { scheduleId: 'schedule-1', active: false }
    ],
    setlists: [
      { id: 'setlist-2', eventId: 'event-2', status: 'READY' },
      { id: 'setlist-1', eventId: 'event-1', status: 'DRAFT' }
    ],
    unavailability: [
      { id: 'u2', date: date('2026-09-02') },
      { id: 'u-old', date: date('2026-08-20') },
      { id: 'u1', date: date('2026-08-26') }
    ]
  }, { now });

  assert.deepEqual(result.upcomingEvents.map(item => item.id), ['event-1', 'event-2']);
  assert.deepEqual(result.upcomingSchedules.map(item => item.id), ['schedule-1', 'schedule-2']);
  assert.equal(result.upcomingSchedules[0].memberCount, 2);
  assert.deepEqual(result.pendingSetlists.map(item => item.id), ['setlist-1']);
  assert.deepEqual(result.upcomingUnavailability.map(item => item.id), ['u1', 'u2']);
  assert.equal(result.adminIndicators, null);
});

test('Dashboard exibe indicadores operacionais somente para ADMIN/SUPER_ADMIN', () => {
  const base = {
    events: [{ id: 'event-1', date: date('2026-08-26'), status: 'CONFIRMED' }],
    schedules: [{ id: 'schedule-1', eventId: 'event-1', status: 'DRAFT' }],
    scheduleMembers: [],
    setlists: [{ id: 'setlist-1', eventId: 'event-1', status: 'DRAFT' }],
    unavailability: []
  };
  const admin = buildDashboardViewModel({ ...base, profile: { role: 'ADMIN' } }, { now });
  const member = buildDashboardViewModel({ ...base, profile: { role: 'MEMBER' } }, { now });

  assert.deepEqual(admin.adminIndicators, {
    upcomingEvents: 1,
    upcomingSchedules: 1,
    incompleteSchedules: 1,
    pendingSetlists: 1
  });
  assert.equal(member.adminIndicators, null);
});

test('DashboardService coordena somente o read model do usuário autenticado', async () => {
  const calls = [];
  const repository = {
    async getOwnProfile(uid) { calls.push(['profile', uid]); return { id: uid, active: true, role: 'MEMBER' }; },
    async listEvents() { calls.push(['events']); return []; },
    async listSchedules() { calls.push(['schedules']); return []; },
    async listScheduleMembers() { calls.push(['members']); return []; },
    async listSetlists() { calls.push(['setlists']); return []; },
    async listOwnUnavailability(uid) { calls.push(['unavailability', uid]); return []; }
  };
  const service = new DashboardService(repository, { clock: () => now });
  const result = await service.load('user-1');

  assert.equal(result.profile.id, 'user-1');
  assert.deepEqual(calls, [
    ['profile', 'user-1'], ['events'], ['schedules'], ['members'], ['setlists'], ['unavailability', 'user-1']
  ]);
});

test('DashboardRepository restringe indisponibilidades ao userId consultado', async () => {
  const queries = [];
  const fakeDb = {
    collection(name) {
      return {
        where(field, operator, value) {
          queries.push([name, field, operator, value]);
          return { get: async () => ({ docs: [] }) };
        }
      };
    }
  };
  const repository = new DashboardRepository(fakeDb);
  await repository.listOwnUnavailability('user-42');
  assert.deepEqual(queries, [['unavailability', 'userId', '==', 'user-42']]);
});

test('index.html é o Dashboard operacional e não a antiga listagem de músicas', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'index.html'), 'utf8');
  [
    'dashboard-upcoming-events',
    'dashboard-upcoming-schedules',
    'dashboard-pending-setlists',
    'dashboard-upcoming-unavailability',
    'dashboard-quick-actions',
    'dashboard-admin-indicators'
  ].forEach(id => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /Dashboard — IDE Music/);
  assert.doesNotMatch(html, /id="lista-musicas"/);
  assert.doesNotMatch(html, /id="search-input"/);
});

test('Dashboard possui layout responsivo e usa tokens do Design System', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'dashboard.css'), 'utf8');
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /var\(--ide-background\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});