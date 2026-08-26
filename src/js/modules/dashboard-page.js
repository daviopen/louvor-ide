/**
 * Dashboard page composition. Business filtering stays in DashboardService.
 */
(function initDashboardPage(scope) {
  if (!scope || !scope.document) return;

  const PERIOD_LABELS = Object.freeze({ MORNING: 'Manhã', AFTERNOON: 'Tarde', EVENING: 'Noite' });
  const STATUS_LABELS = Object.freeze({
    PLANNED: 'Planejado', CONFIRMED: 'Confirmado', DRAFT: 'Pendente', COMPLETE: 'Completa', READY: 'Pronto'
  });

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
  }

  function formatDateTime(date, time) {
    const label = formatDate(date);
    return time ? `${label} · ${time}` : label;
  }

  function element(tag, className, text) {
    const node = scope.document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function icon(name) {
    const node = element('i', `fa-solid ${name}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function badge(value) {
    const normalized = String(value || '').toUpperCase();
    const node = element('span', 'ide-dashboard-badge', STATUS_LABELS[normalized] || normalized || '—');
    node.dataset.status = normalized;
    return node;
  }

  function empty(container, iconName, title, description) {
    container.textContent = '';
    const state = element('div', 'ide-empty-state ide-dashboard-empty');
    state.append(icon(iconName), element('h3', '', title), element('p', '', description));
    container.appendChild(state);
  }

  function itemLink(href, title, meta, status, iconName) {
    const link = element('a', 'ide-dashboard-item');
    link.href = href;
    const glyph = element('span', 'ide-dashboard-item__icon');
    glyph.appendChild(icon(iconName));
    const content = element('span', 'ide-dashboard-item__content');
    content.append(element('strong', '', title), element('span', '', meta));
    const end = element('span', 'ide-dashboard-item__end');
    if (status) end.appendChild(badge(status));
    end.appendChild(icon('fa-chevron-right'));
    link.append(glyph, content, end);
    return link;
  }

  function renderEvents(items) {
    const container = scope.document.getElementById('dashboard-upcoming-events');
    if (!container) return;
    container.textContent = '';
    if (!items.length) return empty(container, 'fa-calendar-check', 'Agenda livre', 'Não há eventos futuros planejados ou confirmados.');
    items.forEach(event => container.appendChild(itemLink(
      `module.html?section=events&eventId=${encodeURIComponent(event.id)}`,
      event.name || 'Evento',
      formatDateTime(event.date, event.time),
      event.status,
      'fa-calendar-day'
    )));
  }

  function renderSchedules(items) {
    const container = scope.document.getElementById('dashboard-upcoming-schedules');
    if (!container) return;
    container.textContent = '';
    if (!items.length) return empty(container, 'fa-people-group', 'Nenhuma escala próxima', 'As próximas escalas aparecerão aqui quando houver eventos futuros.');
    items.forEach(schedule => container.appendChild(itemLink(
      `module.html?section=schedules&scheduleId=${encodeURIComponent(schedule.id)}`,
      schedule.event?.name || 'Escala',
      `${formatDateTime(schedule.date, schedule.event?.time || schedule.eventTime)} · ${schedule.memberCount} integrante${schedule.memberCount === 1 ? '' : 's'}`,
      schedule.status,
      'fa-people-group'
    )));
  }

  function renderSetlists(items) {
    const container = scope.document.getElementById('dashboard-pending-setlists');
    if (!container) return;
    container.textContent = '';
    if (!items.length) return empty(container, 'fa-list-check', 'Setlists em dia', 'Não há setlists futuros pendentes de preparação.');
    items.forEach(setlist => container.appendChild(itemLink(
      `setlist.html?id=${encodeURIComponent(setlist.id)}`,
      setlist.event?.name || 'Setlist',
      formatDateTime(setlist.date, setlist.event?.time || setlist.eventTime),
      setlist.status,
      'fa-list-check'
    )));
  }

  function renderUnavailability(items) {
    const container = scope.document.getElementById('dashboard-upcoming-unavailability');
    if (!container) return;
    container.textContent = '';
    if (!items.length) return empty(container, 'fa-calendar-plus', 'Você está disponível', 'Nenhuma indisponibilidade futura foi registrada para o seu usuário.');
    items.forEach(item => {
      const period = PERIOD_LABELS[String(item.period || '').toUpperCase()];
      const meta = [formatDate(item.date), period, item.note].filter(Boolean).join(' · ');
      container.appendChild(itemLink(
        'module.html?section=unavailability',
        'Indisponibilidade',
        meta,
        null,
        'fa-calendar-xmark'
      ));
    });
  }

  function normalizePermission(profile, moduleName) {
    if (profile.role === 'SUPER_ADMIN') return 'EDIT';
    const entry = profile.permissions && profile.permissions[moduleName];
    const value = typeof entry === 'object' && entry ? entry.level || entry.access : entry;
    return String(value || 'NONE').toUpperCase();
  }

  function canUse(profile, moduleName, level = 'READ') {
    const access = normalizePermission(profile, moduleName);
    return level === 'EDIT' ? access === 'EDIT' : access === 'READ' || access === 'EDIT';
  }

  function renderQuickActions(profile) {
    const container = scope.document.getElementById('dashboard-quick-actions');
    if (!container) return;
    const actions = [
      { module: 'unavailability', level: 'EDIT', href: 'module.html?section=unavailability&action=new', icon: 'fa-calendar-xmark', label: 'Informar indisponibilidade' },
      { module: 'events', level: 'EDIT', href: 'module.html?section=events&action=new', icon: 'fa-calendar-plus', label: 'Novo evento' },
      { module: 'schedules', level: 'EDIT', href: 'module.html?section=schedules', icon: 'fa-people-group', label: 'Montar escala' },
      { module: 'setlists', level: 'EDIT', href: 'setlists.html?view=upcoming', icon: 'fa-list-check', label: 'Preparar setlist' },
      { module: 'songs', level: 'EDIT', href: 'nova-musica.html', icon: 'fa-circle-plus', label: 'Nova música' }
    ].filter(action => canUse(profile, action.module, action.level));
    container.textContent = '';
    if (!actions.length) {
      const link = element('a', 'ide-dashboard-action', 'Consultar músicas');
      link.href = 'consultar.html';
      link.prepend(icon('fa-music'));
      container.appendChild(link);
      return;
    }
    actions.forEach(action => {
      const link = element('a', 'ide-dashboard-action', action.label);
      link.href = action.href;
      link.prepend(icon(action.icon));
      container.appendChild(link);
    });
  }

  function renderAdminIndicators(indicators) {
    const section = scope.document.getElementById('dashboard-admin-section');
    const container = scope.document.getElementById('dashboard-admin-indicators');
    if (!section || !container) return;
    section.hidden = !indicators;
    container.textContent = '';
    if (!indicators) return;
    const cards = [
      ['Próximos eventos', indicators.upcomingEvents, 'fa-calendar-day'],
      ['Próximas escalas', indicators.upcomingSchedules, 'fa-people-group'],
      ['Escalas incompletas', indicators.incompleteSchedules, 'fa-user-clock'],
      ['Setlists pendentes', indicators.pendingSetlists, 'fa-list-check']
    ];
    cards.forEach(([label, value, iconName]) => {
      const card = element('article', 'ide-dashboard-indicator');
      card.append(icon(iconName), element('strong', '', value), element('span', '', label));
      container.appendChild(card);
    });
  }

  function setStatus(message, type = 'loading') {
    const status = scope.document.getElementById('dashboard-status');
    if (!status) return;
    status.textContent = message || '';
    status.dataset.type = type;
    status.hidden = !message;
  }

  function render(viewModel) {
    const greeting = scope.document.getElementById('dashboard-greeting');
    if (greeting) greeting.textContent = viewModel.profile.name ? `Olá, ${viewModel.profile.name.split(' ')[0]}.` : 'Olá.';
    renderQuickActions(viewModel.profile);
    renderEvents(viewModel.upcomingEvents);
    renderSchedules(viewModel.upcomingSchedules);
    renderSetlists(viewModel.pendingSetlists);
    renderUnavailability(viewModel.upcomingUnavailability);
    renderAdminIndicators(viewModel.adminIndicators);
    setStatus('', 'success');
  }

  async function loadForUser(user) {
    try {
      setStatus('Atualizando seu painel…');
      const Repository = scope.MusicIdeDashboardRepository && scope.MusicIdeDashboardRepository.DashboardRepository;
      const Service = scope.MusicIdeDashboardService && scope.MusicIdeDashboardService.DashboardService;
      if (!Repository || !Service || !scope.firebase || !scope.firebase.firestore) throw new Error('Dependências do Dashboard não estão disponíveis.');
      const service = new Service(new Repository(scope.firebase.firestore()));
      render(await service.load(user.uid));
    } catch (error) {
      console.error('Dashboard:', error);
      setStatus('Não foi possível carregar o Dashboard. Atualize a página ou tente novamente em instantes.', 'error');
    }
  }

  function bootstrap() {
    if (!scope.firebase || !scope.firebase.auth) return setStatus('Autenticação indisponível.', 'error');
    scope.firebase.auth().onAuthStateChanged(user => {
      if (user) loadForUser(user);
    });
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);