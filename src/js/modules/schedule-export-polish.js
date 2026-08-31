(function initScheduleExportPolish(scope) {
  if (!scope || !scope.document) return;

  const params = new URLSearchParams(scope.location && scope.location.search || '');
  const section = params.get('section');
  const view = params.get('view') || '';
  const exportRoute = section === 'schedules-export' || (section === 'schedules' && view === 'export');
  if (!exportRoute) return;

  const ABSENCE_PEOPLE_PER_PAGE = 10;
  const STYLE_ID = 'schedule-export-polish-style';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'\"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;'
    }[char]));
  }

  function ensureStyles() {
    let style = scope.document.getElementById(STYLE_ID);
    if (!style) {
      style = scope.document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .weekly-export-sheet:not(.weekly-export-absence-sheet) .weekly-export-week-label{display:none!important}
        .weekly-export-event-title>span{display:none!important}
        .weekly-export-event-title h2{color:var(--ide-color-neutral-950,#090b0c)!important;text-shadow:none!important}

        .weekly-export-sheet .weekly-export-footer{
          left:clamp(16px,4vw,42px)!important;
          right:clamp(16px,4vw,42px)!important;
          bottom:18px!important;
          min-height:0!important;
          height:auto!important;
          display:flex!important;
          align-items:center!important;
          justify-content:flex-start!important;
          gap:4px!important;
          padding:10px 0 0!important;
          color:var(--ide-color-neutral-700,#3f4645)!important;
          border:0!important;
          border-top:1px solid rgba(16,18,19,.15)!important;
          background:none!important;
          background-color:transparent!important;
          box-shadow:none!important;
          font-size:11px!important;
          font-weight:850!important;
          line-height:1!important;
          letter-spacing:.01em!important;
        }
        .weekly-export-sheet .weekly-export-footer span,
        .weekly-export-sheet .weekly-export-footer strong{font-size:inherit!important;font-weight:850!important;line-height:1!important}
        .weekly-export-sheet .weekly-export-footer span{display:inline-flex!important;align-items:center!important;gap:6px!important;color:var(--ide-color-neutral-800,#252a29)!important;letter-spacing:.04em!important}
        .weekly-export-sheet .weekly-export-footer span::before{content:''!important;width:7px!important;height:7px!important;border-radius:999px!important;background:var(--ide-primary,#d8ff45)!important}
        .weekly-export-sheet .weekly-export-footer strong{color:var(--ide-color-violet-600,#6e59dd)!important}
        #monthly-export-preview .weekly-export-sheet .weekly-export-footer::after,
        #schedule-print-report .weekly-export-sheet .weekly-export-footer::after{
          content:'PÁG. ' counter(ide-export-page) ' • COMUNIDADE IDE'!important;
          position:absolute!important;
          right:0!important;
          color:var(--ide-color-neutral-500,#707775)!important;
          font-size:8px!important;
          font-weight:750!important;
          letter-spacing:.07em!important;
          text-transform:uppercase!important;
        }

        .weekly-export-absence-sheet .weekly-export-sheet-header{
          min-height:96px!important;
          align-items:flex-end!important;
          padding-bottom:12px!important;
        }
        .weekly-export-absence-sheet .weekly-export-heading--absence span{font-size:clamp(24px,4.2vw,40px)!important}
        .weekly-export-absence-sheet .weekly-export-heading--absence strong{font-size:clamp(36px,6vw,60px)!important}
        .weekly-export-absence-sheet .weekly-export-week-label{
          max-width:none!important;
          padding-bottom:3px!important;
          font-size:10px!important;
          line-height:1.2!important;
          white-space:nowrap;
        }
        .weekly-export-absence-content{
          flex:1!important;
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          align-content:start!important;
          gap:10px 12px!important;
          min-height:0!important;
          padding:10px 2px 58px!important;
          overflow:visible!important;
        }
        .weekly-export-absence-person{
          break-inside:avoid;
          min-width:0;
          padding:10px 12px 11px;
          border:1px solid rgba(16,18,19,.16);
          border-radius:15px;
          background:rgba(255,255,255,.72);
          box-shadow:0 4px 12px rgba(9,11,12,.03);
        }
        .weekly-export-absence-person h3{
          position:relative;
          margin:0 0 6px;
          padding-left:10px;
          color:var(--ide-color-neutral-950,#090b0c)!important;
          font-size:12.5px;
          font-weight:950;
          line-height:1.1;
          letter-spacing:-.02em;
        }
        .weekly-export-absence-person h3::before{
          content:'';
          position:absolute;
          left:0;
          top:1px;
          bottom:1px;
          width:4px;
          border-radius:999px;
          background:var(--ide-primary,#d8ff45);
        }
        .weekly-export-absence-person ul{display:grid;gap:5px;margin:0;padding:0;list-style:none}
        .weekly-export-absence-person li{display:grid;gap:2px;padding-top:5px;border-top:1px solid rgba(16,18,19,.09)}
        .weekly-export-absence-person li:first-child{padding-top:0;border-top:0}
        .weekly-export-absence-period{color:var(--ide-color-neutral-900,#151717)!important;font-size:10px;font-weight:720;line-height:1.24}
        .weekly-export-absence-note{color:var(--ide-color-neutral-650,#555d5b)!important;font-size:9px;font-weight:650;line-height:1.2}
        .weekly-export-absence-note::before{content:'Obs.: ';font-weight:850}
        .weekly-export-absence-empty{grid-column:1/-1;padding:24px;border:1px dashed rgba(16,18,19,.22);border-radius:16px;text-align:center;color:var(--ide-color-neutral-650,#555d5b)}

        @media(max-width:720px){
          .weekly-export-absence-sheet .weekly-export-sheet-header{min-height:82px!important;padding-bottom:8px!important}
          .weekly-export-absence-content{grid-template-columns:1fr!important;padding-bottom:54px!important}
          .weekly-export-absence-sheet .weekly-export-week-label{white-space:normal}
        }

        @media print{
          #schedule-print-report .weekly-export-event-title h2{color:#090b0c!important}
          #schedule-print-report .weekly-export-footer{
            left:12mm!important;
            right:12mm!important;
            bottom:6mm!important;
            padding-top:2.2mm!important;
            border-top-width:.25mm!important;
            background:transparent!important;
            font-size:2.8mm!important;
          }
          #schedule-print-report .weekly-export-footer span::before{width:1.7mm!important;height:1.7mm!important}
          #schedule-print-report .weekly-export-footer::after{font-size:2.05mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-sheet-header{
            height:34mm!important;
            min-height:34mm!important;
            padding:0 1mm 2.5mm!important;
          }
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-heading--absence span{font-size:7.4mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-heading--absence strong{font-size:13.2mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-week-label{font-size:2.5mm!important;padding-bottom:1mm!important}
          #schedule-print-report .weekly-export-absence-content{
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
            gap:2.5mm 3mm!important;
            padding:2.2mm .5mm 15mm!important;
          }
          #schedule-print-report .weekly-export-absence-person{
            padding:2.4mm 3mm 2.6mm!important;
            border-width:.25mm!important;
            border-radius:3.6mm!important;
            box-shadow:none!important;
          }
          #schedule-print-report .weekly-export-absence-person h3{margin-bottom:1.45mm!important;padding-left:2.5mm!important;font-size:3.1mm!important}
          #schedule-print-report .weekly-export-absence-person h3::before{width:.9mm!important}
          #schedule-print-report .weekly-export-absence-person ul{gap:1.15mm!important}
          #schedule-print-report .weekly-export-absence-person li{gap:.45mm!important;padding-top:1.15mm!important}
          #schedule-print-report .weekly-export-absence-period{font-size:2.4mm!important;line-height:1.2!important}
          #schedule-print-report .weekly-export-absence-note{font-size:2.15mm!important;line-height:1.18!important}
        }
      `;
      scope.document.head.appendChild(style);
    }

    const monthlyStyle = scope.document.getElementById('monthly-print-style');
    if (monthlyStyle && monthlyStyle.nextElementSibling !== style) {
      monthlyStyle.insertAdjacentElement('afterend', style);
    }
  }

  function replaceFooter(sheet) {
    const footer = sheet.querySelector('.weekly-export-footer');
    if (!footer || footer.tagName !== 'FOOTER') return;
    const replacement = scope.document.createElement('div');
    replacement.className = footer.className;
    replacement.innerHTML = footer.innerHTML;
    replacement.setAttribute('aria-label', 'IDE Music');
    footer.replaceWith(replacement);
  }

  function polishScheduleSheet(sheet) {
    if (!sheet || sheet.dataset.exportPolished === 'true') return;
    sheet.querySelectorAll('.weekly-export-event-title > span').forEach(node => node.remove());
    const weekLabel = sheet.querySelector('.weekly-export-week-label');
    if (weekLabel) weekLabel.remove();
    replaceFooter(sheet);
    sheet.dataset.exportPolished = 'true';
  }

  function monthBounds(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return null;
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return {
      from: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
      to: `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };
  }

  function brDateToKey(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }

  function keyToBrDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
  }

  function selectedExportMonth() {
    return scope.document.getElementById('monthly-export-month')?.value || '';
  }

  function clampKey(value, from, to) {
    if (!value) return '';
    if (value < from) return from;
    if (value > to) return to;
    return value;
  }

  function normalizeAbsencePeriod(period, month) {
    const text = String(period || '').trim();
    const bounds = monthBounds(month);
    if (!text || !bounds) return text;

    const dateMatches = Array.from(text.matchAll(/\b\d{2}\/\d{2}\/\d{4}\b/g)).map(match => match[0]);
    const dateKeys = dateMatches.map(brDateToKey).filter(Boolean);
    const recurrenceMatch = text.match(/^(Recorrente semanal|Tod[oa]\b.*?|Toda semana:.*?)(?:\s*·|\s+a partir de\b)/i);
    const isRecurring = Boolean(recurrenceMatch) || /^Tod[oa]\b|^Toda semana:|^Recorrente semanal/i.test(text);

    if (isRecurring) {
      const prefix = recurrenceMatch?.[1]?.trim() || text.split('·')[0].trim();
      const originalStart = dateKeys[0] || bounds.from;
      const originalEnd = dateKeys.length > 1 ? dateKeys[dateKeys.length - 1] : bounds.to;
      const start = clampKey(originalStart, bounds.from, bounds.to);
      const end = clampKey(originalEnd, bounds.from, bounds.to);
      return `${prefix} · ${keyToBrDate(start)} a ${keyToBrDate(end)}`;
    }

    if (dateKeys.length >= 2) {
      const start = clampKey(dateKeys[0], bounds.from, bounds.to);
      const end = clampKey(dateKeys[dateKeys.length - 1], bounds.from, bounds.to);
      return `${keyToBrDate(start)} a ${keyToBrDate(end)}`;
    }

    return text;
  }

  function collectAbsenceGroups(sheet) {
    const groups = new Map();
    const month = selectedExportMonth();
    sheet.querySelectorAll('.weekly-export-absence-content tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const name = cells[0].textContent.trim();
      if (!name || /^nenhuma indisponibilidade/i.test(name)) return;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push({
        period: normalizeAbsencePeriod(cells[1].textContent.trim() || 'Período não informado', month),
        note: cells[2] ? cells[2].textContent.trim() : ''
      });
    });
    return Array.from(groups, ([name, entries]) => ({ name, entries }));
  }

  function groupChunks(groups) {
    const chunks = [];
    for (let index = 0; index < groups.length; index += ABSENCE_PEOPLE_PER_PAGE) {
      chunks.push(groups.slice(index, index + ABSENCE_PEOPLE_PER_PAGE));
    }
    return chunks.length ? chunks : [[]];
  }

  function absenceCards(groups) {
    if (!groups.length) return '<div class="weekly-export-absence-empty">Nenhuma indisponibilidade registrada no mês.</div>';
    return groups.map(group => {
      const items = group.entries.map(entry => {
        const hasNote = entry.note && entry.note !== '—' && entry.note !== '-';
        return `<li><span class="weekly-export-absence-period">${esc(entry.period)}</span>${hasNote ? `<span class="weekly-export-absence-note">${esc(entry.note)}</span>` : ''}</li>`;
      }).join('');
      return `<article class="weekly-export-absence-person"><h3>${esc(group.name)}</h3><ul>${items}</ul></article>`;
    }).join('');
  }

  function configureAbsencePage(page, groups, pageIndex, pageCount) {
    page.dataset.exportPolished = 'true';
    page.dataset.absencePage = `${pageIndex + 1}/${pageCount}`;
    const label = page.querySelector('.weekly-export-week-label');
    if (label) label.textContent = pageCount > 1
      ? `Organizado por pessoa · ${pageIndex + 1} de ${pageCount}`
      : 'Organizado por pessoa';
    const content = page.querySelector('.weekly-export-absence-content');
    if (content) content.innerHTML = absenceCards(groups);
    replaceFooter(page);
    return page;
  }

  function polishAbsenceSheet(sheet) {
    if (!sheet || sheet.dataset.exportPolished === 'true') return;
    const groups = collectAbsenceGroups(sheet);
    const pages = groupChunks(groups);
    const parent = sheet.parentNode;
    if (!parent) return;
    const marker = sheet.nextSibling;
    pages.forEach((groupsForPage, index) => {
      const page = sheet.cloneNode(true);
      configureAbsencePage(page, groupsForPage, index, pages.length);
      parent.insertBefore(page, marker);
    });
    sheet.remove();
  }

  function polishRoot(root) {
    if (!root) return;
    ensureStyles();
    Array.from(root.querySelectorAll('.weekly-export-absence-sheet')).forEach(polishAbsenceSheet);
    Array.from(root.querySelectorAll('.weekly-export-sheet:not(.weekly-export-absence-sheet)')).forEach(polishScheduleSheet);
  }

  let previewQueued = false;
  function polishPreview() {
    previewQueued = false;
    polishRoot(scope.document.getElementById('monthly-export-preview'));
  }

  function queuePreviewPolish() {
    if (previewQueued) return;
    previewQueued = true;
    const schedule = typeof scope.requestAnimationFrame === 'function'
      ? scope.requestAnimationFrame.bind(scope)
      : callback => scope.setTimeout(callback, 0);
    schedule(polishPreview);
  }

  function bootstrap() {
    ensureStyles();
    queuePreviewPolish();
    if (typeof scope.MutationObserver === 'function' && scope.document.body) {
      const observer = new scope.MutationObserver(queuePreviewPolish);
      observer.observe(scope.document.body, { childList: true, subtree: true });
      scope.__musicIdeScheduleExportPolishObserver = observer;
    }
    scope.addEventListener('beforeprint', () => polishRoot(scope.document.getElementById('schedule-print-report')));
  }

  scope.MusicIdeScheduleExportPolish = {
    ABSENCE_PEOPLE_PER_PAGE,
    collectAbsenceGroups,
    groupChunks,
    monthBounds,
    normalizeAbsencePeriod,
    polishRoot
  };

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);
