const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildDashboardViewModel, DashboardService } = require('../src/services/dashboard-service.js');
const { DashboardRepository } = require('../src/repositories/dashboard-repository.js');

const now = new Date('2026-08-25T12:00:00-03:00');
const date = value => new Date(`${value}T10:00:00-03:00`);

test('Dashboard mostra somente escalas, setlists e indisponibilidades ligados ao usuário', () => {
  const result = buildDashboardViewModel({
    profile: { id: 'user-1', active: true, role: 'ADMIN' },
    events: [
      { id: 'event-2', name: 'Evento 2', date: date('2026-08-30'), status: 'CONFIRMED' },
      { id: 'event-1', name: 'Evento 1', date: date('2026-08-26'), status: 'PLANNED' },
      { id: 'event-other', name: 'Outro evento', date: date('2026-08-27'), status: 'CONFIRMED' }
    ],
    schedules: [
      { id: 'schedule-2', eventId: 'event-2', status: 'COMPLETE' },
      { id: 'schedule-1', eventId: 'event-1', status: 'DRAFT' },
      { id: 'schedule-other', eventId: 'event-other', status: 'DRAFT' }
    ],
    scheduleMembers: [
      { scheduleId: 'schedule-1', userId: 'user-1', active: true },
      { scheduleId: 'schedule-2', userId: 'user-1', active: true },
      { scheduleId: 'schedule-other', userId: 'user-2', active: true }
    ],
    setlists: [
      { id: 'setlist-2', scheduleId: 'schedule-2', eventId: 'event-2', status: 'READY' },
      { id: 'setlist-1', scheduleId: 'schedule-1', eventId: 'event-1', status: 'DRAFT' },
      { id: 'setlist-other', scheduleId: 'schedule-other', eventId: 'event-other', status: 'DRAFT' }
    ],
    unavailability: [
      { id: 'u2', date: date('2026-09-02') },
      { id: 'u-old', date: date('2026-08-20') },
      { id: 'u1', date: date('2026-08-26') }
    ]
  }, { now });

  assert.deepEqual(result.upcomingSchedules.map(item => item.id), ['schedule-1', 'schedule-2']);
  assert.deepEqual(result.upcomingSetlists.map(item => item.id), ['setlist-1', 'setlist-2']);
  assert.deepEqual(result.upcomingUnavailability.map(item => item.id), ['u1', 'u2']);
  assert.deepEqual(result.userIndicators, {
    upcomingSchedules: 2,
    draftSchedules: 1,
    upcomingSetlists: 2,
    upcomingUnavailability: 2
  });
  assert.equal('upcomingEvents' in result, false);
  assert.equal('adminIndicators' in result, false);
});

test('Dashboard não mostra escala quando vínculo do usuário está inativo', () => {
  const result = buildDashboardViewModel({
    profile: { id: 'user-1', active: true },
    events: [{ id: 'event-1', date: date('2026-08-26'), status: 'CONFIRMED' }],
    schedules: [{ id: 'schedule-1', eventId: 'event-1', status: 'COMPLETE' }],
    scheduleMembers: [{ scheduleId: 'schedule-1', userId: 'user-1', active: false }],
    setlists: [{ id: 'setlist-1', scheduleId: 'schedule-1', eventId: 'event-1', status: 'READY' }],
    unavailability: []
  }, { now });

  assert.deepEqual(result.upcomingSchedules, []);
  assert.deepEqual(result.upcomingSetlists, []);
  assert.equal(result.userIndicators.upcomingSchedules, 0);
  assert.equal(result.userIndicators.upcomingSetlists, 0);
});

test('DashboardService consulta somente os vínculos de escala do usuário autenticado', async () => {
  const calls = [];
  const repository = {
    async getOwnProfile(uid) { calls.push(['profile', uid]); return { id: uid, active: true, role: 'MEMBER' }; },
    async listEvents() { calls.push(['events']); return []; },
    async listSchedules() { calls.push(['schedules']); return []; },
    async listOwnScheduleMembers(uid) { calls.push(['members', uid]); return []; },
    async listSetlists() { calls.push(['setlists']); return []; },
    async listOwnUnavailability(uid) { calls.push(['unavailability', uid]); return []; }
  };
  const service = new DashboardService(repository, { clock: () => now });
  const result = await service.load('user-1');

  assert.equal(result.profile.id, 'user-1');
  assert.deepEqual(calls, [
    ['profile', 'user-1'], ['events'], ['schedules'], ['members', 'user-1'], ['setlists'], ['unavailability', 'user-1']
  ]);
});

test('DashboardRepository restringe participações e indisponibilidades ao userId consultado', async () => {
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
  await repository.listOwnScheduleMembers('user-42');
  await repository.listOwnUnavailability('user-42');
  assert.deepEqual(queries, [
    ['scheduleMembers', 'userId', '==', 'user-42'],
    ['unavailability', 'userId', '==', 'user-42']
  ]);
});

test('index.html contém somente as áreas pessoais solicitadas no Dashboard', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'index.html'), 'utf8');
  [
    'dashboard-upcoming-schedules',
    'dashboard-upcoming-setlists',
    'dashboard-upcoming-unavailability',
    'dashboard-user-indicators'
  ].forEach(id => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /Dashboard — IDE Music/);
  assert.doesNotMatch(html, /dashboard-upcoming-events/);
  assert.doesNotMatch(html, /dashboard-quick-actions/);
  assert.doesNotMatch(html, /dashboard-admin-indicators/);
  assert.doesNotMatch(html, /id="lista-musicas"/);
  assert.doesNotMatch(html, /id="search-input"/);
});

test('Indicadores pessoais do Dashboard navegam para os módulos correspondentes', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'modules', 'dashboard-page.js'), 'utf8');
  assert.match(script, /element\('a', 'ide-dashboard-indicator'\)/);
  assert.match(script, /\['Próximas escalas', indicators\.upcomingSchedules, 'fa-people-group', 'module\.html\?section=schedules'\]/);
  assert.match(script, /\['Escalas pendentes', indicators\.draftSchedules, 'fa-user-clock', 'module\.html\?section=schedules'\]/);
  assert.match(script, /\['Próximos setlists', indicators\.upcomingSetlists, 'fa-list-check', 'setlists\.html\?view=upcoming'\]/);
  assert.match(script, /\['Indisponibilidades futuras', indicators\.upcomingUnavailability, 'fa-calendar-xmark', 'module\.html\?section=unavailability'\]/);
});

test('Dashboard possui layout responsivo e usa tokens do Design System', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'dashboard.css'), 'utf8');
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /var\(--ide-background\)/);
  assert.match(css, /\.ide-dashboard-indicator:hover/);
  assert.match(css, /cursor: pointer/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});