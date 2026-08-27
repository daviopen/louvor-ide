(function initScheduleMonthlyUi(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search);
  const section = params.get('section');
  const view = params.get('view') || '';
  const supported = new Set(['schedules', 'schedules-export', 'schedules-participation', 'events', 'unavailability']);
  if (!supported.has(section)) return;

  const esc = value => String(value == null ? '' : value).replace(/[&<>'\"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[c]));
  const monthly = () => scope.MusicIdeScheduleMonthlyService;
  const userId = user => user?.id || user?.uid;
  const currentMonth = () => monthly().monthKey(new Date());
  const formatMonth = value => /^\d{4}-\d{2}$/.test(String(value || ''))
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`)) : '';

  function injectNav() {
    const nav = scope.document.getElementById('ide-sidebar-nav');
    const base = nav?.querySelector('[data-nav-id="schedules"]');
    if (!base || nav.querySelector('[data-nav-id="schedules-export"]')) return;
    const entries = [
      ['schedules-export', 'Exportar', 'fa-file-pdf', 'export'],
      ['schedules-participation', 'Participações', 'fa-chart-column', 'participation']
    ];
    let anchor = base;
    entries.forEach(([id, label, icon, targetView]) => {
      const link = scope.document.createElement('a');
      link.className = 'ide-sidebar-link';
      if (section === 'schedules' && view === targetView) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); base.classList.remove('active'); base.removeAttribute('aria-current'); }
      link.href = `module.html?section=schedules&view=${targetView}`;
      link.dataset.navId = id;
      link.dataset.tooltip = label;
      link.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span class="ide-sidebar-label">${label}</span>`;
      anchor.insertAdjacentElement('afterend', link);
      anchor = link;
    });
  }

  function connectMonthToRange(monthInput, fromInput, toInput) {
    monthInput.addEventListener('change', () => {
      const bounds = monthly().monthBounds(monthInput.value);
      fromInput.value = bounds.from;
      toInput.value = bounds.to;
      fromInput.dispatchEvent(new Event('change', { bubbles: true }));
      toInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function addMonthFilter(id, fromId, toId) {
    const from = scope.document.getElementById(fromId);
    const to = scope.document.getElementById(toId);
    if (!from || !to || scope.document.getElementById(id)) return false;
    const label = scope.document.createElement('label');
    label.innerHTML = `<span>Mês</span><input id="${id}" class="ide-field__control ide-field__input" type="month">`;
    from.closest('label')?.insertAdjacentElement('beforebegin', label);
    connectMonthToRange(label.querySelector('input'), from, to);
    return true;
  }

  async function loadScheduleData() {
    if (!scope.firebase?.firestore || !scope.MusicIdeScheduleRepository || !scope.MusicIdeScheduleService) throw new Error('Escalas indisponíveis.');
    const repository = new scope.MusicIdeScheduleRepository.ScheduleRepository(scope.firebase.firestore());
    const service = new scope.MusicIdeScheduleService.ScheduleService(repository);
    return service.load(scope.currentMusicIdeUser, scope.currentMusicIdeProfile);
  }

  function participationTable(data, month, heading) {
    const rows = monthly().monthlyParticipation(data.users, data.schedules, month);
    return `<section class="ide-section-card schedule-monthly-summary"><div><span class="ide-module-kicker">Resumo mensal</span><h2 style="margin:.25rem 0">${esc(heading)}</h2><p style="margin:0 0 1rem;color:var(--text-secondary)">${esc(formatMonth(month))} · cada pessoa conta no máximo uma vez por escala.</p></div><div style="overflow:auto"><table class="ide-table"><thead><tr><th>Pessoa</th><th style="text-align:right">Escalas no mês</th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(row.name)}</td><td style="text-align:right"><strong>${row.total}</strong></td></tr>`).join('')}</tbody></table></div></section>`;
  }

  let editorTimer = null;
  function addEditorMonthlySummary() {
    const scheduleId = params.get('scheduleId');
    const card = scope.document.querySelector('.schedule-editor-card');
    if (!scheduleId || !card || view) return false;
    clearTimeout(editorTimer);
    editorTimer = setTimeout(async () => {
      try {
        const data = await loadScheduleData();
        const schedule = data.schedules.find(item => item.id === scheduleId);
        if (!schedule) return;
        const month = monthly().monthKey(schedule.event?.date || schedule.eventDate);
        scope.document.querySelector('.schedule-monthly-summary')?.remove();
        card.insertAdjacentHTML('afterend', participationTable(data, month, 'Participações no mês'));
      } catch (error) { console.error('Resumo mensal indisponível.', error); }
    }, 150);
    return true;
  }

  function scheduleRows(data, month) {
    const users = new Map(data.users.map(user => [userId(user), user.name || user.email || 'Usuário']));
    const functions = new Map(data.functions.map(fn => [fn.id, fn.name || 'Função']));
    return monthly().schedulesForMonth(data.schedules, month).sort((a, b) => monthly().dateKey(a.event?.date || a.eventDate).localeCompare(monthly().dateKey(b.event?.date || b.eventDate))).map(schedule => {
      const people = new Map();
      (schedule.members || []).filter(member => member.active !== false).forEach(member => {
        const fn = functions.get(member.functionId) || 'Função';
        if (!people.has(fn)) people.set(fn, []);
        people.get(fn).push(users.get(member.userId) || 'Usuário');
      });
      return { schedule, people };
    });
  }

  function renderScheduleCards(data, month) {
    const rows = scheduleRows(data, month);
    return rows.map(({ schedule, people }) => {
      const event = schedule.event || {};
      const key = monthly().dateKey(event.date || schedule.eventDate);
      const date = key ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${key}T12:00:00`)) : 'Data a definir';
      return `<article class="ide-section-card monthly-export-event"><h2 style="margin:0">${esc(event.name || 'Evento')}</h2><p><strong>${esc(date)}</strong>${event.time || schedule.eventTime ? ` · ${esc(event.time || schedule.eventTime)}` : ''}</p>${event.location ? `<p>${esc(event.location)}</p>` : ''}<table class="ide-table"><tbody>${Array.from(people.entries()).map(([fn, names]) => `<tr><th>${esc(fn)}</th><td>${esc(names.join(', '))}</td></tr>`).join('') || '<tr><td>Nenhuma pessoa escalada.</td></tr>'}</tbody></table></article>`;
    }).join('') || '<div class="ide-empty-state"><strong>Nenhuma escala encontrada neste mês</strong></div>';
  }

  function absenceTable(data, month) {
    const users = new Map(data.users.map(user => [userId(user), user.name || user.email || 'Usuário']));
    const records = (data.unavailability || []).filter(record => monthly().unavailabilityOverlapsMonth(record, month));
    return `<section class="ide-section-card monthly-absence-list"><h2>Indisponibilidades do mês</h2><div style="overflow:auto"><table class="ide-table"><thead><tr><th>Pessoa</th><th>Período</th><th>Observação</th></tr></thead><tbody>${records.map(record => { const start=monthly().dateKey(record.date); const end=monthly().dateKey(record.endAt || record.date); return `<tr><td>${esc(users.get(record.userId) || 'Usuário')}</td><td>${esc(start)}${end && end !== start ? ` a ${esc(end)}` : ''}${record.recurrence?.frequency === 'WEEKLY' ? ' · recorrente' : ''}</td><td>${esc(record.note || '')}</td></tr>`; }).join('') || '<tr><td colspan="3">Nenhuma indisponibilidade registrada no mês.</td></tr>'}</tbody></table></div></section>`;
  }

  function ensurePrintStyle() {
    if (scope.document.getElementById('monthly-print-style')) return;
    const style = scope.document.createElement('style');
    style.id = 'monthly-print-style';
    style.textContent = '@media print{body.ide-monthly-print>*{display:none!important}body.ide-monthly-print>#schedule-print-report{display:block!important}#schedule-print-report{font-family:Arial,sans-serif;color:#111;background:#fff}#schedule-print-report .ide-section-card{break-inside:avoid;border:1px solid #aaa;margin:0 0 12px;padding:12px}#schedule-print-report table{width:100%;border-collapse:collapse}#schedule-print-report th,#schedule-print-report td{padding:5px;border-bottom:1px solid #ddd;text-align:left}}';
    scope.document.head.appendChild(style);
  }

  function printReport(data, month) {
    ensurePrintStyle();
    scope.document.getElementById('schedule-print-report')?.remove();
    const report = scope.document.createElement('main');
    report.id = 'schedule-print-report';
    report.innerHTML = `<header><h1>IDE Music · Escalas</h1><p>${esc(formatMonth(month))}</p></header>${renderScheduleCards(data, month)}${absenceTable(data, month)}`;
    scope.document.body.appendChild(report);
    scope.document.body.classList.add('ide-monthly-print');
    const cleanup = () => { scope.document.body.classList.remove('ide-monthly-print'); report.remove(); scope.removeEventListener('afterprint', cleanup); };
    scope.addEventListener('afterprint', cleanup);
    scope.print();
  }

  async function renderExportPage() {
    const root = scope.document.getElementById('module-placeholder');
    if (!root) return;
    const month = currentMonth();
    root.hidden = false;
    root.className = 'ide-module-page';
    root.innerHTML = `<div class="ide-module-page__inner"><section class="ide-module-card ide-module-card--wide"><div class="ide-module-kicker">Escalas · Exportação</div><h1>Exportar escala mensal</h1><p>Selecione um mês para gerar uma versão clara para impressão/PDF. A relação de indisponibilidades aparece ao final.</p><div style="display:flex;gap:.75rem;align-items:end;flex-wrap:wrap;margin:1rem 0"><label><span class="ide-field__label">Mês</span><input id="monthly-export-month" class="ide-field__control ide-field__input" type="month" value="${month}"></label><button id="monthly-export-button" class="ide-button ide-button--primary" type="button"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Exportar PDF</button></div><div id="monthly-export-preview">Carregando…</div></section></div>`;
    scope.document.title = 'IDE Music — Exportar Escalas';
    const data = await loadScheduleData();
    const render = () => { const selected=scope.document.getElementById('monthly-export-month').value; scope.document.getElementById('monthly-export-preview').innerHTML=`<h2>${esc(formatMonth(selected))}</h2>${renderScheduleCards(data, selected)}${absenceTable(data, selected)}`; };
    scope.document.getElementById('monthly-export-month').addEventListener('change', render);
    scope.document.getElementById('monthly-export-button').addEventListener('click', () => printReport(data, scope.document.getElementById('monthly-export-month').value));
    render();
  }

  async function renderParticipationPage() {
    const root = scope.document.getElementById('module-placeholder');
    if (!root) return;
    const month = currentMonth();
    root.hidden = false;
    root.className = 'ide-module-page';
    root.innerHTML = `<div class="ide-module-page__inner"><section class="ide-module-card ide-module-card--wide"><div class="ide-module-kicker">Escalas · Indicadores</div><h1>Participações por mês</h1><p>Mostra todos os usuários ativos, inclusive quem teve zero escalas. A mesma pessoa não é contada duas vezes no mesmo evento.</p><label style="display:block;max-width:260px;margin:1rem 0"><span class="ide-field__label">Mês</span><input id="monthly-participation-month" class="ide-field__control ide-field__input" type="month" value="${month}"></label><div id="monthly-participation-content">Carregando…</div></section></div>`;
    scope.document.title = 'IDE Music — Participações';
    const data = await loadScheduleData();
    const render = () => { const selected=scope.document.getElementById('monthly-participation-month').value; scope.document.getElementById('monthly-participation-content').innerHTML=participationTable(data, selected, 'Total por pessoa'); };
    scope.document.getElementById('monthly-participation-month').addEventListener('change', render);
    render();
  }

  function rangeOverlapsRecord(record, from, to) {
    const start = monthly().dateKey(record?.date);
    const end = monthly().dateKey(record?.endAt || record?.date) || start;
    if (!start) return false;
    if (record?.recurrence?.frequency === 'WEEKLY' && record.recurrence.openEnded) return !to || start <= to;
    return (!from || end >= from) && (!to || start <= to);
  }

  async function enhanceUnavailability() {
    const heading = scope.document.querySelector('.unavailability-list-card .unavailability-section-heading');
    const originalList = scope.document.getElementById('unavailability-list');
    const empty = scope.document.getElementById('unavailability-empty');
    if (!heading || !originalList || scope.document.getElementById('unavailability-month-filter')) return false;

    const controls = scope.document.createElement('div');
    controls.className = 'unavailability-filter';
    controls.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:.5rem;width:min(620px,100%)';
    controls.innerHTML = '<label><span>Mês</span><input id="unavailability-month-filter" class="ide-field__control ide-field__input" type="month"></label><label><span>Data inicial</span><input id="unavailability-filter-from" class="ide-field__control ide-field__input" type="date"></label><label><span>Data final</span><input id="unavailability-filter-to" class="ide-field__control ide-field__input" type="date"></label>';
    heading.appendChild(controls);
    const monthInput = controls.querySelector('#unavailability-month-filter');
    const fromInput = controls.querySelector('#unavailability-filter-from');
    const toInput = controls.querySelector('#unavailability-filter-to');
    connectMonthToRange(monthInput, fromInput, toInput);

    const filtered = scope.document.createElement('div');
    filtered.id = 'unavailability-filtered-list';
    filtered.className = 'unavailability-list';
    filtered.hidden = true;
    originalList.insertAdjacentElement('afterend', filtered);

    const repository = new scope.MusicIdeUnavailabilityRepository.UnavailabilityRepository(scope.firebase.firestore());
    const role = String(scope.currentMusicIdeProfile?.role || '').toUpperCase();
    const admin = scope.currentMusicIdeProfile?.isSuperAdmin === true || scope.currentMusicIdeProfile?.isAdmin === true || role === 'SUPER_ADMIN' || role === 'ADMIN';
    const actor = scope.currentMusicIdeUser?.uid;
    const users = admin ? await repository.listActiveUsers() : [];
    const names = new Map(users.map(user => [userId(user), user.name || user.email || 'Usuário']));

    const apply = async () => {
      const from = fromInput.value;
      const to = toInput.value;
      const active = Boolean(from || to);
      originalList.hidden = active;
      filtered.hidden = !active;
      if (empty) empty.hidden = active ? true : empty.hidden;
      if (!active) return;
      const records = admin ? await repository.listAll() : await repository.listByUser(actor);
      const matches = records.filter(record => rangeOverlapsRecord(record, from, to)).sort((a,b) => monthly().dateKey(a.date).localeCompare(monthly().dateKey(b.date)));
      filtered.innerHTML = matches.map(record => {
        const start = monthly().dateKey(record.date);
        const end = monthly().dateKey(record.endAt || record.date);
        const person = admin ? (names.get(record.userId) || 'Usuário') : (scope.currentMusicIdeProfile?.name || scope.currentMusicIdeUser?.displayName || scope.currentMusicIdeUser?.email || 'Você');
        return `<article class="unavailability-item"><div class="unavailability-item-main"><strong>${esc(person)}</strong><small>${esc(start)}${end && end !== start ? ` até ${esc(end)}` : ''}${record.recurrence?.frequency === 'WEEKLY' ? ' · recorrente semanal' : ''}</small><div class="unavailability-item-meta"><span class="ide-badge">${esc(record.period || 'Dia inteiro')}</span></div>${record.note ? `<small>${esc(record.note)}</small>` : ''}</div></article>`;
      }).join('') || '<div class="ide-empty-state"><strong>Nenhuma indisponibilidade no período selecionado</strong></div>';
    };
    monthInput.addEventListener('change', apply);
    fromInput.addEventListener('change', apply);
    toInput.addEventListener('change', apply);
    return true;
  }

  async function bootstrap() {
    try { await scope.musicIdeAuthReady; } catch (_) {}
    injectNav();
    if ((section === 'schedules-export') || (section === 'schedules' && view === 'export')) return renderExportPage();
    if ((section === 'schedules-participation') || (section === 'schedules' && view === 'participation')) return renderParticipationPage();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      injectNav();
      if (section === 'events') addMonthFilter('events-month-filter', 'events-date-from', 'events-date-to');
      if (section === 'schedules' && !view) { addMonthFilter('schedule-filter-month', 'schedule-filter-from', 'schedule-filter-to'); addEditorMonthlySummary(); }
      if (section === 'unavailability') enhanceUnavailability().catch(error => console.error('Filtro de indisponibilidade indisponível.', error));
      if (attempts > 40) clearInterval(timer);
    }, 250);
    if (section === 'schedules' && !view && typeof MutationObserver === 'function') {
      const root = scope.document.getElementById('module-placeholder');
      if (root) new MutationObserver(() => { addMonthFilter('schedule-filter-month', 'schedule-filter-from', 'schedule-filter-to'); addEditorMonthlySummary(); }).observe(root, { childList: true, subtree: true });
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true }); else bootstrap();
})(window);