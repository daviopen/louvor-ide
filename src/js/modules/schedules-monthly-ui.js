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
  const weekdayLabels = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const weekdayShortLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  function formatDateKey(value) {
    const key = monthly().dateKey(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return '';
    const [year, month, day] = key.split('-');
    return `${day}/${month}/${year}`;
  }

  function toLocalDate(value) {
    const key = monthly().dateKey(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(String(key || '')) ? new Date(`${key}T12:00:00`) : null;
  }

  function shortDate(value) {
    const date = toLocalDate(value);
    return date ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date) : '';
  }

  function weekStart(value) {
    const date = toLocalDate(value);
    if (!date) return '';
    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return monthly().dateKey(date);
  }

  function weekRangeLabel(startKey) {
    const start = toLocalDate(startKey);
    if (!start) return '';
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 6);
    return `${shortDate(start)} a ${shortDate(end)}`;
  }

  function joinNatural(items) {
    const list = (items || []).filter(Boolean);
    if (list.length <= 1) return list[0] || '';
    return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
  }

  function recurrenceLabel(record) {
    if (record?.recurrence?.frequency !== 'WEEKLY') return '';
    const days = Array.isArray(record.recurrence.weekdays)
      ? Array.from(new Set(record.recurrence.weekdays.map(Number))).filter(day => day >= 0 && day <= 6).sort((a, b) => a - b)
      : [];
    if (!days.length) return 'Recorrente semanal';
    if (days.length === 1) {
      const day = days[0];
      return `${day === 0 || day === 6 ? 'Todo' : 'Toda'} ${weekdayLabels[day]}`;
    }
    return `Toda semana: ${joinNatural(days.map(day => weekdayLabels[day]))}`;
  }

  function absencePeriod(record) {
    const start = formatDateKey(record?.date);
    const end = formatDateKey(record?.endAt || record?.date);
    if (record?.recurrence?.frequency === 'WEEKLY') {
      const recurrence = recurrenceLabel(record);
      const range = record.recurrence.openEnded
        ? (start ? `a partir de ${start}` : '')
        : (start && end && start !== end ? `${start} a ${end}` : start);
      return [recurrence, range].filter(Boolean).join(' · ');
    }
    return start && end && start !== end ? `${start} a ${end}` : start;
  }

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
    if (card.nextElementSibling?.classList.contains('schedule-monthly-summary')) return true;
    clearTimeout(editorTimer);
    editorTimer = setTimeout(async () => {
      try {
        const data = await loadScheduleData();
        const schedule = data.schedules.find(item => item.id === scheduleId);
        if (!schedule) return;
        const currentCard = scope.document.querySelector('.schedule-editor-card');
        if (!currentCard?.isConnected || currentCard.dataset.scheduleId !== scheduleId) return;
        if (currentCard.nextElementSibling?.classList.contains('schedule-monthly-summary')) return;
        const month = monthly().monthKey(schedule.event?.date || schedule.eventDate);
        scope.document.querySelector('.schedule-monthly-summary')?.remove();
        currentCard.insertAdjacentHTML('afterend', participationTable(data, month, 'Participações no mês'));
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

  function weeklyRows(data, month) {
    const weeks = new Map();
    scheduleRows(data, month).forEach(row => {
      const event = row.schedule.event || {};
      const key = monthly().dateKey(event.date || row.schedule.eventDate);
      const start = weekStart(key);
      if (!weeks.has(start)) weeks.set(start, []);
      weeks.get(start).push(row);
    });
    return Array.from(weeks.entries()).map(([start, rows], index) => ({ start, rows, index: index + 1 }));
  }

  function renderWeeklyEvent(row) {
    const { schedule, people } = row;
    const event = schedule.event || {};
    const key = monthly().dateKey(event.date || schedule.eventDate);
    const date = toLocalDate(key);
    const weekday = date ? weekdayShortLabels[date.getDay()] : 'DATA';
    const dateLabel = shortDate(key) || '—';
    const assignments = Array.from(people.entries());
    const team = assignments.length
      ? assignments.map(([fn, names]) => `<p><strong>${esc(fn)}:</strong> <span>${esc(names.join(', '))}</span></p>`).join('')
      : '<p class="weekly-export-empty">Nenhuma pessoa escalada.</p>';
    return `<article class="weekly-export-event"><div class="weekly-export-date-badge"><strong>${esc(weekday)}</strong><span>${esc(dateLabel)}</span></div><div class="weekly-export-event-card"><div class="weekly-export-event-title"><h2>${esc(event.name || 'Evento')}</h2>${event.time || schedule.eventTime ? `<span>${esc(event.time || schedule.eventTime)}</span>` : ''}</div>${event.location ? `<div class="weekly-export-location">${esc(event.location)}</div>` : ''}<div class="weekly-export-team">${team}</div></div></article>`;
  }

  function weeklySheet(data, month, week, preview = false) {
    const eventCount = week.rows.length;
    const densityClass = eventCount <= 1 ? 'weekly-export-events--one' : eventCount === 2 ? 'weekly-export-events--two' : eventCount === 3 ? 'weekly-export-events--three' : 'weekly-export-events--many';
    return `<section class="weekly-export-sheet${preview ? ' weekly-export-sheet--preview' : ''}"><header class="weekly-export-sheet-header"><div class="weekly-export-heading"><span>Escala</span><strong>${esc(formatMonth(month))}</strong></div><div class="weekly-export-week-label">Semana ${week.index} · ${esc(weekRangeLabel(week.start))}</div></header><div class="weekly-export-events ${densityClass}">${week.rows.map(renderWeeklyEvent).join('')}</div><footer class="weekly-export-footer"><span>IDE</span><strong>Music</strong></footer></section>`;
  }

  function absenceRecords(data, month) {
    const users = new Map(data.users.map(user => [userId(user), user.name || user.email || 'Usuário']));
    return (data.unavailability || [])
      .filter(record => monthly().unavailabilityOverlapsMonth(record, month))
      .sort((a, b) => {
        const nameA = users.get(a.userId) || 'Usuário';
        const nameB = users.get(b.userId) || 'Usuário';
        return nameA.localeCompare(nameB, 'pt-BR') || monthly().dateKey(a.date).localeCompare(monthly().dateKey(b.date));
      })
      .map(record => ({ record, name: users.get(record.userId) || 'Usuário' }));
  }

  function absenceTable(data, month) {
    const records = absenceRecords(data, month);
    return `<section class="ide-section-card monthly-absence-list"><div class="monthly-absence-heading"><span class="monthly-export-eyebrow">Disponibilidade</span><h2>Indisponibilidades do mês</h2><p>Restrições consideradas durante a montagem das escalas.</p></div><div class="monthly-absence-table-wrap"><table class="ide-table"><thead><tr><th>Pessoa</th><th>Quando não pode servir</th><th>Observação</th></tr></thead><tbody>${records.map(({ record, name }) => `<tr><td><strong>${esc(name)}</strong></td><td>${esc(absencePeriod(record))}</td><td>${esc(record.note || '—')}</td></tr>`).join('') || '<tr><td colspan="3">Nenhuma indisponibilidade registrada no mês.</td></tr>'}</tbody></table></div></section>`;
  }

  function absenceSheet(data, month, preview = false) {
    const records = absenceRecords(data, month);
    const rows = records.map(({ record, name }) => `<tr><td><strong>${esc(name)}</strong></td><td>${esc(absencePeriod(record))}</td><td>${esc(record.note || '—')}</td></tr>`).join('') || '<tr><td colspan="3">Nenhuma indisponibilidade registrada no mês.</td></tr>';
    return `<section class="weekly-export-sheet weekly-export-absence-sheet${preview ? ' weekly-export-sheet--preview' : ''}"><header class="weekly-export-sheet-header"><div class="weekly-export-heading weekly-export-heading--absence"><span>Indisponibilidades</span><strong>${esc(formatMonth(month))}</strong></div><div class="weekly-export-week-label">Referência para montagem das escalas</div></header><div class="weekly-export-absence-content"><table><thead><tr><th>Pessoa</th><th>Quando não pode servir</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table></div><footer class="weekly-export-footer"><span>IDE</span><strong>Music</strong></footer></section>`;
  }

  function renderWeeklySheets(data, month, preview = false) {
    const weeks = weeklyRows(data, month);
    if (!weeks.length) return '<div class="ide-empty-state"><strong>Nenhuma escala encontrada neste mês</strong></div>';
    return `${weeks.map(week => weeklySheet(data, month, week, preview)).join('')}${absenceSheet(data, month, preview)}`;
  }

  function ensurePrintStyle() {
    if (scope.document.getElementById('monthly-print-style')) return;
    const style = scope.document.createElement('style');
    style.id = 'monthly-print-style';
    style.textContent = `
      #monthly-export-preview{display:grid;gap:1.25rem;margin-top:1.5rem}
      #monthly-export-preview .weekly-export-sheet--preview{width:min(100%,760px);min-height:auto;aspect-ratio:210/297;margin:0 auto;padding:clamp(22px,4vw,42px);border:1px solid var(--ide-border);border-radius:18px;box-shadow:var(--ide-shadow-md);overflow:hidden}
      .weekly-export-sheet{box-sizing:border-box;position:relative;display:flex;flex-direction:column;font-family:Inter,"Segoe UI",Arial,sans-serif;color:#101213;background:radial-gradient(circle at 22% 14%,rgba(255,255,255,.98),rgba(246,246,242,.94) 45%,rgba(235,236,232,.96) 100%)}
      .weekly-export-sheet::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.48;background:linear-gradient(118deg,transparent 0 18%,rgba(255,255,255,.65) 18.5% 20%,transparent 20.5% 100%),radial-gradient(circle at 88% 70%,transparent 0 22%,rgba(255,255,255,.7) 22.5% 23.5%,transparent 24% 100%)}
      .weekly-export-sheet>*{position:relative;z-index:1}
      .weekly-export-sheet-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;min-height:112px;padding:0 4px 20px;border-top:7px solid #d8ff45}
      .weekly-export-heading{display:grid;line-height:.86;letter-spacing:-.06em;text-transform:lowercase}
      .weekly-export-heading span{font-size:clamp(34px,6vw,62px);font-weight:850;font-style:italic;color:#111}
      .weekly-export-heading strong{font-size:clamp(46px,8vw,82px);font-weight:950;color:#111;text-transform:capitalize}
      .weekly-export-heading--absence span{font-size:clamp(28px,5vw,48px);font-style:normal;letter-spacing:-.04em}
      .weekly-export-heading--absence strong{font-size:clamp(42px,7vw,72px)}
      .weekly-export-week-label{padding-bottom:7px;color:#4c5150;font-size:12px;font-weight:750;text-align:right;text-transform:capitalize}
      .weekly-export-events{flex:1;display:flex;flex-direction:column;min-height:0;padding:12px 0 70px}
      .weekly-export-events--one{justify-content:center}
      .weekly-export-events--two{justify-content:space-evenly}
      .weekly-export-events--three{justify-content:space-between;gap:14px}
      .weekly-export-events--many{justify-content:flex-start;gap:10px}
      .weekly-export-event{display:grid;grid-template-columns:minmax(126px,28%) 1fr;align-items:center;gap:18px;break-inside:avoid}
      .weekly-export-date-badge{display:grid;place-items:center;align-content:center;min-height:106px;padding:14px 12px;border-radius:999px;background:#d8ff45;color:#090b0c;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,.08)}
      .weekly-export-date-badge strong{font-size:clamp(32px,5vw,54px);font-weight:950;line-height:.9;letter-spacing:-.06em}
      .weekly-export-date-badge span{margin-top:7px;font-size:16px;font-weight:850}
      .weekly-export-event-card{min-height:126px;padding:18px 24px;border:2px solid #151717;border-radius:38px;background:rgba(255,255,255,.36)}
      .weekly-export-event-title{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px}
      .weekly-export-event-title h2{margin:0;font-size:clamp(18px,2.6vw,28px);font-weight:950;line-height:1.04;letter-spacing:-.035em;text-transform:uppercase;color:#101213}
      .weekly-export-event-title span{font-size:11px;font-weight:800;color:#4c5150;white-space:nowrap}
      .weekly-export-location{margin:0 0 7px;color:#555a59;font-size:11px;font-weight:700}
      .weekly-export-team{display:grid;gap:1px}
      .weekly-export-team p{display:flex;gap:5px;align-items:baseline;margin:0;color:#151717;font-size:12px;line-height:1.28}
      .weekly-export-team p strong{font-weight:900;white-space:nowrap}
      .weekly-export-team p span{font-weight:650}
      .weekly-export-empty{font-weight:700;color:#666!important}
      .weekly-export-events--many .weekly-export-date-badge{min-height:82px}
      .weekly-export-events--many .weekly-export-event-card{min-height:96px;padding:13px 20px;border-radius:30px}
      .weekly-export-events--many .weekly-export-team p{font-size:10.5px;line-height:1.18}
      .weekly-export-events--many .weekly-export-event-title h2{font-size:18px}
      .weekly-export-footer{position:absolute;left:0;right:0;bottom:24px;display:flex;align-items:baseline;justify-content:center;gap:4px;color:#aeb2af;font-size:28px;font-weight:900;letter-spacing:-.04em}
      .weekly-export-footer strong{color:#8c78ff;font-size:18px;letter-spacing:-.02em}
      .weekly-export-absence-content{flex:1;padding:18px 2px 72px;overflow:hidden}
      .weekly-export-absence-content table{width:100%;border-collapse:collapse;background:rgba(255,255,255,.35);font-size:11px}
      .weekly-export-absence-content th,.weekly-export-absence-content td{padding:9px 10px;border-bottom:1px solid rgba(16,18,19,.16);text-align:left;vertical-align:top;color:#101213}
      .weekly-export-absence-content th{font-weight:900;background:rgba(216,255,69,.72)}
      .weekly-export-absence-content td:first-child{width:25%}.weekly-export-absence-content td:nth-child(2){width:43%}
      @media(max-width:720px){
        #monthly-export-preview .weekly-export-sheet--preview{aspect-ratio:auto;padding:22px 16px;border-radius:14px}
        .weekly-export-sheet-header{min-height:88px;align-items:flex-start;flex-direction:column;gap:8px}
        .weekly-export-week-label{text-align:left;padding-bottom:0}
        .weekly-export-event{grid-template-columns:88px 1fr;gap:10px}
        .weekly-export-date-badge{min-height:76px;padding:9px 6px}.weekly-export-date-badge strong{font-size:30px}.weekly-export-date-badge span{font-size:12px}
        .weekly-export-event-card{min-height:94px;padding:13px 15px;border-radius:26px}
        .weekly-export-team p{font-size:10.5px}
      }
      @page{size:A4 portrait;margin:0}
      @media print{
        html,body{margin:0!important;padding:0!important;background:#fff!important}
        body.ide-monthly-print>*{display:none!important}
        body.ide-monthly-print>#schedule-print-report{display:block!important}
        body.ide-monthly-print{margin:0!important;padding:0!important;background:#fff!important}
        #schedule-print-report{display:block!important;margin:0!important;padding:0!important;background:#fff!important}
        #schedule-print-report *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
        #schedule-print-report .weekly-export-sheet{width:210mm;height:297mm;min-height:297mm;padding:12mm 12mm 11mm;overflow:hidden;break-after:page;page-break-after:always}
        #schedule-print-report .weekly-export-sheet:last-child{break-after:auto;page-break-after:auto}
        #schedule-print-report .weekly-export-sheet-header{height:42mm;min-height:42mm;padding:0 1mm 4mm;border-top-width:2mm}
        #schedule-print-report .weekly-export-heading span{font-size:15mm}
        #schedule-print-report .weekly-export-heading strong{font-size:20mm}
        #schedule-print-report .weekly-export-heading--absence span{font-size:10mm}
        #schedule-print-report .weekly-export-heading--absence strong{font-size:17mm}
        #schedule-print-report .weekly-export-week-label{font-size:3.1mm;padding-bottom:2mm}
        #schedule-print-report .weekly-export-events{padding:4mm 0 18mm}
        #schedule-print-report .weekly-export-events--three{gap:4mm}
        #schedule-print-report .weekly-export-events--many{gap:2.6mm}
        #schedule-print-report .weekly-export-event{grid-template-columns:42mm 1fr;gap:5mm}
        #schedule-print-report .weekly-export-date-badge{min-height:28mm;padding:3.5mm 3mm;box-shadow:none}
        #schedule-print-report .weekly-export-date-badge strong{font-size:13mm}
        #schedule-print-report .weekly-export-date-badge span{margin-top:1.8mm;font-size:4mm}
        #schedule-print-report .weekly-export-event-card{min-height:33mm;padding:4mm 6mm;border-width:.55mm;border-radius:10mm}
        #schedule-print-report .weekly-export-event-title{gap:3mm;margin-bottom:1.4mm}
        #schedule-print-report .weekly-export-event-title h2{font-size:5.5mm}
        #schedule-print-report .weekly-export-event-title span{font-size:2.8mm}
        #schedule-print-report .weekly-export-location{margin:0 0 1.4mm;font-size:2.7mm}
        #schedule-print-report .weekly-export-team{gap:.25mm}
        #schedule-print-report .weekly-export-team p{gap:1.3mm;font-size:3mm;line-height:1.18}
        #schedule-print-report .weekly-export-events--many .weekly-export-date-badge{min-height:21mm}
        #schedule-print-report .weekly-export-events--many .weekly-export-date-badge strong{font-size:9.5mm}
        #schedule-print-report .weekly-export-events--many .weekly-export-date-badge span{font-size:3.1mm}
        #schedule-print-report .weekly-export-events--many .weekly-export-event-card{min-height:24mm;padding:2.7mm 5mm;border-radius:7.5mm}
        #schedule-print-report .weekly-export-events--many .weekly-export-event-title h2{font-size:4.3mm}
        #schedule-print-report .weekly-export-events--many .weekly-export-team p{font-size:2.5mm;line-height:1.08}
        #schedule-print-report .weekly-export-footer{bottom:7mm;font-size:8mm}
        #schedule-print-report .weekly-export-footer strong{font-size:5mm}
        #schedule-print-report .weekly-export-absence-content{padding:5mm 1mm 18mm}
        #schedule-print-report .weekly-export-absence-content table{font-size:2.9mm}
        #schedule-print-report .weekly-export-absence-content th,#schedule-print-report .weekly-export-absence-content td{padding:2.2mm 2.4mm}
      }`;
    scope.document.head.appendChild(style);
  }

  function printReport(data, month) {
    ensurePrintStyle();
    scope.document.getElementById('schedule-print-report')?.remove();
    const report = scope.document.createElement('main');
    report.id = 'schedule-print-report';
    report.innerHTML = renderWeeklySheets(data, month, false);
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
    ensurePrintStyle();
    root.hidden = false;
    root.className = 'ide-module-page';
    root.innerHTML = `<div class="ide-module-page__inner"><section class="ide-module-card ide-module-card--wide"><div class="ide-module-kicker">Escalas · Exportação</div><h1>Exportar escala por semana</h1><p>Selecione o mês. O PDF terá uma página A4 por semana, com os eventos em cartões, e uma última página com as indisponibilidades.</p><div style="display:flex;gap:.75rem;align-items:end;flex-wrap:wrap;margin:1rem 0"><label><span class="ide-field__label">Mês</span><input id="monthly-export-month" class="ide-field__control ide-field__input" type="month" value="${month}"></label><button id="monthly-export-button" class="ide-button ide-button--primary" type="button"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Exportar PDF</button></div><div id="monthly-export-preview">Carregando…</div></section></div>`;
    scope.document.title = 'IDE Music — Exportar Escalas';
    const data = await loadScheduleData();
    const render = () => {
      const selected = scope.document.getElementById('monthly-export-month').value;
      scope.document.getElementById('monthly-export-preview').innerHTML = renderWeeklySheets(data, selected, true);
    };
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
        const person = admin ? (names.get(record.userId) || 'Usuário') : (scope.currentMusicIdeProfile?.name || scope.currentMusicIdeUser?.displayName || scope.currentMusicIdeUser?.email || 'Você');
        return `<article class="unavailability-item"><div class="unavailability-item-main"><strong>${esc(person)}</strong><small>${esc(absencePeriod(record))}</small><div class="unavailability-item-meta"><span class="ide-badge">${esc(record.period || 'Dia inteiro')}</span></div>${record.note ? `<small>${esc(record.note)}</small>` : ''}</div></article>`;
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