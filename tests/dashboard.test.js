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
      { id: 'schedule-2', eventId: 'event-2', status: 'DRAFT', slots: [{ id: 'slot-2' }] },
      { id: 'schedule-1', eventId: 'event-1', status: 'COMPLETE', slots: [{ id: 'slot-1' }, { id: 'slot-empty' }] },
      { id: 'schedule-other', eventId: 'event-other', status: 'DRAFT' }
    ],
    scheduleMembers: [
      { scheduleId: 'schedule-1', slotId: 'slot-1', userId: 'user-1', active: true },
      { scheduleId: 'schedule-2', slotId: 'slot-2', userId: 'user-1', active: true },
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
  assert.deepEqual(result.upcomingSchedules.map(item => item.status), ['DRAFT', 'COMPLETE']);
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

test('DashboardService consulta somente relações ligadas ao usuário autenticado', async () => {
  const calls = [];
  const repository = {
    async getOwnProfile(uid) { calls.push(['profile', uid]); return { id: uid, active: true, role: 'MEMBER' }; },
    async listOwnScheduleMembers(uid) { calls.push(['members', uid]); return [{ scheduleId: 'schedule-1', userId: uid, active: true }]; },
    async listOwnUnavailability(uid) { calls.push(['unavailability', uid]); return []; },
    async getSchedulesByIds(ids) { calls.push(['schedulesByIds', ids]); return [{ id: 'schedule-1', eventId: 'event-1', status: 'DRAFT', slots: [{ id: 'slot-1' }] }]; },
    async getEventsByIds(ids) { calls.push(['eventsByIds', ids]); return [{ id: 'event-1', date: date('2026-08-26') }]; },
    async listSetlistsForTargets(targets) { calls.push(['setlistsForTargets', targets]); return []; },
    async listMembersForSchedules(ids) { calls.push(['membersForSchedules', ids]); return [{ scheduleId: 'schedule-1', slotId: 'slot-1', userId: 'user-1', active: true }]; }
  };
  const service = new DashboardService(repository, { clock: () => now });
  const result = await service.load('user-1');

  assert.equal(result.profile.id, 'user-1');
  assert.deepEqual(calls, [
    ['profile', 'user-1'],
    ['members', 'user-1'],
    ['unavailability', 'user-1'],
    ['schedulesByIds', ['schedule-1']],
    ['eventsByIds', ['event-1']],
    ['setlistsForTargets', { scheduleIds: ['schedule-1'], eventIds: ['event-1'] }],
    ['membersForSchedules', ['schedule-1']]
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
  await repository.listMembersForSchedules(['schedule-1']);
  await repository.listOwnUnavailability('user-42');
  assert.deepEqual(queries, [
    ['scheduleMembers', 'userId', '==', 'user-42'],
    ['scheduleMembers', 'scheduleId', '==', 'schedule-1'],
    ['unavailability', 'userId', '==', 'user-42']
  ]);
});

test('Dashboard deriva o status pela mesma completude da tela de escala', () => {
  const result = buildDashboardViewModel({
    profile: { id: 'user-1', active: true },
    events: [{ id: 'event-1', date: date('2026-08-26'), status: 'CONFIRMED' }],
    schedules: [{ id: 'schedule-1', eventId: 'event-1', status: 'DRAFT', slots: [{ id: 'a' }, { id: 'b' }] }],
    scheduleMembers: [
      { scheduleId: 'schedule-1', slotId: 'a', userId: 'user-1', active: true },
      { scheduleId: 'schedule-1', slotId: 'b', userId: 'user-2', active: true }
    ],
    setlists: [],
    unavailability: []
  }, { now });

  assert.equal(result.upcomingSchedules[0].status, 'COMPLETE');
  assert.equal(result.upcomingSchedules[0].completeness.complete, true);
  assert.equal(result.userIndicators.draftSchedules, 0);
});

test('index.html contém somente as áreas pessoais solicitadas no Dashboard', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'index.html'), 'utf8');
  [
    'dashboard-upcoming-schedules',
    'dashboard-upcoming-setlists',
    'dashboard-upcoming-unavailability',
    'dashboard-user-indicators',
    'dashboard-schedules-title-link',
    'dashboard-setlists-title-link',
    'dashboard-unavailability-title-link'
  ].forEach(id => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /Dashboard — IDE Music/);
  assert.match(html, /class="ide-dashboard-card__title-link"/);
  assert.doesNotMatch(html, /dashboard-upcoming-events/);
  assert.doesNotMatch(html, /dashboard-quick-actions/);
  assert.doesNotMatch(html, /dashboard-admin-indicators/);
  assert.doesNotMatch(html, /id="lista-musicas"/);
  assert.doesNotMatch(html, /id="search-input"/);
});

test('Dashboard mantém dados pessoais, mas abre a consulta geral de escalas', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'modules', 'dashboard-page.js'), 'utf8');
  const unavailability = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'modules', 'unavailability-page.js'), 'utf8');

  assert.match(script, /element\('a', 'ide-dashboard-indicator'\)/);
  assert.match(script, /function personalDestinations\(profile\)/);
  assert.match(script, /schedules: `module\.html\?section=schedules&from=\$\{today\}`/);
  assert.doesNotMatch(script, /section=schedules&person=/);
  assert.match(script, /setlists\.html\?view=upcoming&participant=\$\{encodeURIComponent\(participant\)\}/);
  assert.match(script, /module\.html\?section=unavailability&user=\$\{encodeURIComponent\(userId\)\}&future=1/);
  assert.match(script, /function configureSectionLinks\(profile\)/);
  assert.match(script, /dashboard-schedules-title-link/);
  assert.match(script, /dashboard-setlists-title-link/);
  assert.match(script, /dashboard-unavailability-title-link/);
  assert.match(script, /configureSectionLinks\(viewModel\.profile\)/);
  assert.match(script, /renderUserIndicators\(viewModel\.userIndicators, viewModel\.profile\)/);

  assert.match(unavailability, /const params = new URLSearchParams\(scope\.location\.search\)/);
  assert.match(unavailability, /filterUserId: params\.get\('user'\) \|\| 'ALL'/);
  assert.match(unavailability, /const keepAllFuture = params\.get\('future'\) === '1'/);
  assert.match(unavailability, /await loadRecords\(\{ initial: !keepAllFuture \}\)/);
});

test('Dashboard possui layout responsivo e usa tokens do Design System', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'dashboard.css'), 'utf8');
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /var\(--ide-background\)/);
  assert.match(css, /\.ide-dashboard-indicator:hover/);
  assert.match(css, /\.ide-dashboard-card__title-link:hover/);
  assert.match(css, /\.ide-dashboard-card__title-link:focus-visible/);
  assert.match(css, /cursor: pointer/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});
