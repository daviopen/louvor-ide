(function initScheduleExportPolish(scope) {
  if (!scope || !scope.document) return;

  const params = new URLSearchParams(scope.location && scope.location.search || '');
  const section = params.get('section');
  const view = params.get('view') || '';
  const exportRoute = section === 'schedules-export' || (section === 'schedules' && view === 'export');
  if (!exportRoute) return;

  const ABSENCE_PEOPLE_PER_PAGE = 10;
  const STYLE_ID = 'schedule-export-polish-style';
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js';
  const COLORS = Object.freeze({
    lime: [216, 255, 69],
    violet: [110, 89, 221],
    ink: [9, 11, 12],
    text: [21, 23, 23],
    muted: [82, 89, 87],
    border: [205, 209, 207],
    paper: [249, 250, 247],
    white: [255, 255, 255]
  });

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
          left:clamp(16px,4vw,42px)!important;right:clamp(16px,4vw,42px)!important;bottom:18px!important;
          min-height:0!important;height:auto!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;
          gap:4px!important;padding:10px 0 0!important;color:var(--ide-color-neutral-700,#3f4645)!important;
          border:0!important;border-top:1px solid rgba(16,18,19,.15)!important;background:none!important;background-color:transparent!important;
          box-shadow:none!important;font-size:11px!important;font-weight:850!important;line-height:1!important;letter-spacing:.01em!important;
        }
        .weekly-export-sheet .weekly-export-footer span,.weekly-export-sheet .weekly-export-footer strong{font-size:inherit!important;font-weight:850!important;line-height:1!important}
        .weekly-export-sheet .weekly-export-footer span{display:inline-flex!important;align-items:center!important;gap:6px!important;color:var(--ide-color-neutral-800,#252a29)!important;letter-spacing:.04em!important}
        .weekly-export-sheet .weekly-export-footer span::before{content:''!important;width:7px!important;height:7px!important;border-radius:999px!important;background:var(--ide-primary,#d8ff45)!important}
        .weekly-export-sheet .weekly-export-footer strong{color:var(--ide-color-violet-600,#6e59dd)!important}
        #monthly-export-preview .weekly-export-sheet .weekly-export-footer::after,#schedule-print-report .weekly-export-sheet .weekly-export-footer::after{
          content:'PÁG. ' counter(ide-export-page) ' • COMUNIDADE IDE'!important;position:absolute!important;right:0!important;
          color:var(--ide-color-neutral-500,#707775)!important;font-size:8px!important;font-weight:750!important;letter-spacing:.07em!important;text-transform:uppercase!important;
        }
        .weekly-export-absence-sheet .weekly-export-sheet-header{min-height:96px!important;align-items:flex-end!important;padding-bottom:12px!important}
        .weekly-export-absence-sheet .weekly-export-heading--absence span{font-size:clamp(24px,4.2vw,40px)!important}
        .weekly-export-absence-sheet .weekly-export-heading--absence strong{font-size:clamp(36px,6vw,60px)!important}
        .weekly-export-absence-sheet .weekly-export-week-label{max-width:none!important;padding-bottom:3px!important;font-size:10px!important;line-height:1.2!important;white-space:nowrap}
        .weekly-export-absence-content{flex:1!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:start!important;gap:10px 12px!important;min-height:0!important;padding:10px 2px 58px!important;overflow:visible!important}
        .weekly-export-absence-person{break-inside:avoid;min-width:0;padding:10px 12px 11px;border:1px solid rgba(16,18,19,.16);border-radius:15px;background:rgba(255,255,255,.72);box-shadow:0 4px 12px rgba(9,11,12,.03)}
        .weekly-export-absence-person h3{position:relative;margin:0 0 6px;padding-left:10px;color:var(--ide-color-neutral-950,#090b0c)!important;font-size:12.5px;font-weight:950;line-height:1.1;letter-spacing:-.02em}
        .weekly-export-absence-person h3::before{content:'';position:absolute;left:0;top:1px;bottom:1px;width:4px;border-radius:999px;background:var(--ide-primary,#d8ff45)}
        .weekly-export-absence-person ul{display:grid;gap:5px;margin:0;padding:0;list-style:none}
        .weekly-export-absence-person li{display:grid;gap:2px;padding-top:5px;border-top:1px solid rgba(16,18,19,.09)}
        .weekly-export-absence-person li:first-child{padding-top:0;border-top:0}
        .weekly-export-absence-period{color:var(--ide-color-neutral-900,#151717)!important;font-size:10px;font-weight:720;line-height:1.24}
        .weekly-export-absence-note{color:var(--ide-color-neutral-650,#555d5b)!important;font-size:9px;font-weight:650;line-height:1.2}
        .weekly-export-absence-note::before{content:'Obs.: ';font-weight:850}
        .weekly-export-absence-empty{grid-column:1/-1;padding:24px;border:1px dashed rgba(16,18,19,.22);border-radius:16px;text-align:center;color:var(--ide-color-neutral-650,#555d5b)}
        @media(max-width:720px){.weekly-export-absence-sheet .weekly-export-sheet-header{min-height:82px!important;padding-bottom:8px!important}.weekly-export-absence-content{grid-template-columns:1fr!important;padding-bottom:54px!important}.weekly-export-absence-sheet .weekly-export-week-label{white-space:normal}}
        @media print{
          #schedule-print-report .weekly-export-event-title h2{color:#090b0c!important}
          #schedule-print-report .weekly-export-footer{left:12mm!important;right:12mm!important;bottom:6mm!important;padding-top:2.2mm!important;border-top-width:.25mm!important;background:transparent!important;font-size:2.8mm!important}
          #schedule-print-report .weekly-export-footer span::before{width:1.7mm!important;height:1.7mm!important}
          #schedule-print-report .weekly-export-footer::after{font-size:2.05mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-sheet-header{height:34mm!important;min-height:34mm!important;padding:0 1mm 2.5mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-heading--absence span{font-size:7.4mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-heading--absence strong{font-size:13.2mm!important}
          #schedule-print-report .weekly-export-absence-sheet .weekly-export-week-label{font-size:2.5mm!important;padding-bottom:1mm!important}
          #schedule-print-report .weekly-export-absence-content{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:2.5mm 3mm!important;padding:2.2mm .5mm 15mm!important}
          #schedule-print-report .weekly-export-absence-person{padding:2.4mm 3mm 2.6mm!important;border-width:.25mm!important;border-radius:3.6mm!important;box-shadow:none!important}
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
    if (monthlyStyle && monthlyStyle.nextElementSibling !== style) monthlyStyle.insertAdjacentElement('afterend', style);
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
    return { from: `${year}-${String(monthNumber).padStart(2, '0')}-01`, to: `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
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
    for (let index = 0; index < groups.length; index += ABSENCE_PEOPLE_PER_PAGE) chunks.push(groups.slice(index, index + ABSENCE_PEOPLE_PER_PAGE));
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
    if (label) label.textContent = pageCount > 1 ? `Organizado por pessoa · ${pageIndex + 1} de ${pageCount}` : 'Organizado por pessoa';
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
    const schedule = typeof scope.requestAnimationFrame === 'function' ? scope.requestAnimationFrame.bind(scope) : callback => scope.setTimeout(callback, 0);
    schedule(polishPreview);
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function titleMonth(value) {
    const text = cleanText(value);
    if (!text) return '';
    return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1).toLocaleLowerCase('pt-BR');
  }

  function loadJsPdf() {
    if (scope.jspdf?.jsPDF) return Promise.resolve(scope.jspdf.jsPDF);
    if (scope.__musicIdeJsPdfPromise) return scope.__musicIdeJsPdfPromise;
    scope.__musicIdeJsPdfPromise = new Promise((resolve, reject) => {
      const script = scope.document.createElement('script');
      script.src = JSPDF_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.idePdfEngine = 'jspdf';
      script.addEventListener('load', () => scope.jspdf?.jsPDF ? resolve(scope.jspdf.jsPDF) : reject(new Error('Motor de PDF indisponível.')), { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar o motor de PDF.')), { once: true });
      scope.document.head.appendChild(script);
    });
    return scope.__musicIdeJsPdfPromise;
  }

  function textLines(doc, text, maxWidth) {
    const value = cleanText(text);
    if (!value) return [];
    const result = doc.splitTextToSize(value, maxWidth);
    return Array.isArray(result) ? result : [String(result)];
  }

  function extractEvent(eventNode) {
    const badge = eventNode.querySelector('.weekly-export-date-badge');
    return {
      weekday: cleanText(badge?.querySelector('strong')?.textContent),
      date: cleanText(badge?.querySelector('span')?.textContent),
      title: cleanText(eventNode.querySelector('.weekly-export-event-title h2')?.textContent) || 'Evento',
      location: cleanText(eventNode.querySelector('.weekly-export-location')?.textContent),
      assignments: Array.from(eventNode.querySelectorAll('.weekly-export-team p')).map(node => cleanText(node.textContent)).filter(Boolean)
    };
  }

  function extractSheetModel(sheet) {
    const month = titleMonth(sheet.querySelector('.weekly-export-heading strong')?.textContent);
    if (sheet.classList.contains('weekly-export-absence-sheet')) {
      return {
        type: 'absence',
        month,
        label: cleanText(sheet.querySelector('.weekly-export-week-label')?.textContent),
        people: Array.from(sheet.querySelectorAll('.weekly-export-absence-person')).map(card => ({
          name: cleanText(card.querySelector('h3')?.textContent),
          entries: Array.from(card.querySelectorAll('li')).map(item => ({
            period: cleanText(item.querySelector('.weekly-export-absence-period')?.textContent),
            note: cleanText(item.querySelector('.weekly-export-absence-note')?.textContent)
          }))
        }))
      };
    }
    return { type: 'schedule', month, events: Array.from(sheet.querySelectorAll('.weekly-export-event')).map(extractEvent) };
  }

  function setRgb(doc, method, color) {
    doc[method](color[0], color[1], color[2]);
  }

  function drawPageBase(doc) {
    setRgb(doc, 'setFillColor', COLORS.paper);
    doc.rect(0, 0, 210, 297, 'F');
    setRgb(doc, 'setFillColor', COLORS.lime);
    doc.rect(12, 12, 186, 1.6, 'F');
  }

  function drawHeader(doc, kind, month, label) {
    setRgb(doc, 'setTextColor', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(kind === 'indisponibilidades' ? 17 : 18);
    doc.text(kind, 14, 23);
    doc.setFontSize(kind === 'indisponibilidades' ? 31 : 32);
    const monthLines = textLines(doc, month, 125).slice(0, 2);
    doc.text(monthLines, 14, 37, { lineHeightFactor: 0.9 });
    if (label) {
      setRgb(doc, 'setTextColor', COLORS.muted);
      doc.setFontSize(7.5);
      doc.text(textLines(doc, label, 58).slice(0, 2), 196, 34, { align: 'right', lineHeightFactor: 1.05 });
    }
  }

  function drawFooter(doc, page, total) {
    setRgb(doc, 'setDrawColor', COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(12, 284, 198, 284);
    setRgb(doc, 'setFillColor', COLORS.lime);
    doc.circle(13.6, 289, 1, 'F');
    setRgb(doc, 'setTextColor', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('IDE', 16.2, 291);
    setRgb(doc, 'setTextColor', COLORS.violet);
    doc.setFontSize(7.2);
    doc.text('Music', 27, 291);
    setRgb(doc, 'setTextColor', COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.text(`PÁG. ${page} • COMUNIDADE IDE`, 197, 291, { align: 'right' });
    doc.setFontSize(5.4);
    doc.text(`${page}/${total}`, 197, 287.5, { align: 'right' });
  }

  function measureEventHeight(doc, event, compact) {
    const titleSize = compact ? 10 : 12;
    const teamSize = compact ? 7.1 : 8;
    doc.setFontSize(titleSize);
    const titleCount = Math.max(1, textLines(doc, event.title, 124).length);
    doc.setFontSize(teamSize);
    const assignmentLines = event.assignments.reduce((sum, item) => sum + Math.max(1, textLines(doc, item, 126).length), 0);
    const locationLines = event.location ? Math.max(1, textLines(doc, event.location, 126).length) : 0;
    return Math.max(compact ? 32 : 38, 10 + titleCount * 5 + locationLines * 3.5 + assignmentLines * (compact ? 3.4 : 3.8));
  }

  function drawEventCard(doc, event, y, height, compact) {
    const badgeX = 14;
    const badgeW = 38;
    const cardX = 58;
    const cardW = 138;
    setRgb(doc, 'setFillColor', COLORS.lime);
    doc.roundedRect(badgeX, y, badgeW, height, 18, 18, 'F');
    setRgb(doc, 'setTextColor', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(compact ? 18 : 21);
    doc.text(event.weekday || 'DATA', badgeX + badgeW / 2, y + height / 2 - 1.5, { align: 'center' });
    doc.setFontSize(compact ? 8.5 : 9.5);
    doc.text(event.date || '—', badgeX + badgeW / 2, y + height / 2 + 5, { align: 'center' });

    setRgb(doc, 'setFillColor', COLORS.white);
    setRgb(doc, 'setDrawColor', COLORS.ink);
    doc.setLineWidth(0.55);
    doc.roundedRect(cardX, y, cardW, height, 8, 8, 'FD');
    let cy = y + 7;
    setRgb(doc, 'setTextColor', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(compact ? 10 : 12);
    const title = textLines(doc, event.title, cardW - 12).slice(0, compact ? 2 : 3);
    doc.text(title, cardX + 6, cy, { lineHeightFactor: 1.05 });
    cy += title.length * (compact ? 4.1 : 4.8) + 1;
    if (event.location) {
      setRgb(doc, 'setTextColor', COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(compact ? 6.8 : 7.4);
      const location = textLines(doc, event.location, cardW - 12).slice(0, 1);
      doc.text(location, cardX + 6, cy);
      cy += 3.8;
    }
    setRgb(doc, 'setTextColor', COLORS.text);
    doc.setFontSize(compact ? 7.1 : 8);
    event.assignments.forEach(item => {
      if (cy > y + height - 4) return;
      const colon = item.indexOf(':');
      const label = colon > -1 ? item.slice(0, colon + 1) : '';
      const value = colon > -1 ? item.slice(colon + 1).trim() : item;
      doc.setFont('helvetica', 'bold');
      const labelText = label ? `${label} ` : '';
      const labelW = labelText ? doc.getTextWidth(labelText) : 0;
      if (labelText) doc.text(labelText, cardX + 6, cy);
      doc.setFont('helvetica', 'normal');
      const available = cardW - 12 - labelW;
      const lines = textLines(doc, value, Math.max(30, available)).slice(0, 2);
      if (lines.length) {
        doc.text(lines[0], cardX + 6 + labelW, cy);
        if (lines[1] && cy + 3.2 <= y + height - 3) doc.text(lines[1], cardX + 6, cy + 3.2);
      }
      cy += lines.length > 1 ? 6.3 : (compact ? 3.35 : 3.7);
    });
  }

  function drawSchedulePage(doc, model) {
    drawPageBase(doc);
    drawHeader(doc, 'escala', model.month, '');
    const events = model.events || [];
    if (!events.length) return;
    const compact = events.length >= 4;
    const top = 54;
    const bottom = 278;
    const available = bottom - top;
    const heights = events.map(event => measureEventHeight(doc, event, compact));
    const sum = heights.reduce((acc, value) => acc + value, 0);
    let gap;
    let y;
    if (events.length === 1) {
      y = top + Math.max(0, (available - heights[0]) / 2);
      gap = 0;
    } else if (events.length === 2 && sum < available - 20) {
      gap = Math.max(12, (available - sum) / 3);
      y = top + gap;
    } else {
      gap = Math.max(3, (available - sum) / Math.max(1, events.length - 1));
      y = top;
    }
    events.forEach((event, index) => {
      const remaining = bottom - y;
      const height = Math.min(heights[index], Math.max(28, remaining));
      drawEventCard(doc, event, y, height, compact);
      y += height + gap;
    });
  }

  function absenceCardLines(doc, person, width) {
    const lines = [];
    person.entries.forEach(entry => {
      textLines(doc, entry.period, width).slice(0, 3).forEach(text => lines.push({ text, note: false }));
      if (entry.note) textLines(doc, `Obs.: ${entry.note}`, width).slice(0, 2).forEach(text => lines.push({ text, note: true }));
    });
    return lines;
  }

  function drawAbsenceCard(doc, person, x, y, width, height) {
    setRgb(doc, 'setFillColor', COLORS.white);
    setRgb(doc, 'setDrawColor', COLORS.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, width, height, 4, 4, 'FD');
    setRgb(doc, 'setFillColor', COLORS.lime);
    doc.roundedRect(x + 3.5, y + 3.5, 1.3, 5, 0.65, 0.65, 'F');
    setRgb(doc, 'setTextColor', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.text(textLines(doc, person.name || 'Pessoa', width - 11).slice(0, 1), x + 7, y + 7.5);
    let cy = y + 13;
    doc.setFontSize(6.8);
    const lines = absenceCardLines(doc, person, width - 8);
    lines.forEach((line, index) => {
      if (cy > y + height - 3.3) return;
      if (index > 0) {
        setRgb(doc, 'setDrawColor', COLORS.border);
        doc.setLineWidth(0.15);
        doc.line(x + 4, cy - 2.4, x + width - 4, cy - 2.4);
      }
      setRgb(doc, 'setTextColor', line.note ? COLORS.muted : COLORS.text);
      doc.setFont('helvetica', line.note ? 'normal' : 'bold');
      doc.text(line.text, x + 4, cy);
      cy += 3.55;
    });
  }

  function drawAbsencePage(doc, model) {
    drawPageBase(doc);
    drawHeader(doc, 'indisponibilidades', model.month, model.label);
    const people = model.people || [];
    if (!people.length) {
      setRgb(doc, 'setTextColor', COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Nenhuma indisponibilidade registrada no mês.', 105, 120, { align: 'center' });
      return;
    }
    const columns = 2;
    const rows = Math.ceil(people.length / columns);
    const gapX = 4;
    const gapY = 3.2;
    const x1 = 13;
    const width = (184 - gapX) / 2;
    const top = 55;
    const bottom = 278;
    const height = Math.min(50, (bottom - top - (rows - 1) * gapY) / rows);
    people.forEach((person, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      drawAbsenceCard(doc, person, x1 + col * (width + gapX), top + row * (height + gapY), width, height);
    });
  }

  async function generateStaticPdf() {
    polishPreview();
    const preview = scope.document.getElementById('monthly-export-preview');
    const sheets = Array.from(preview?.querySelectorAll('.weekly-export-sheet') || []);
    if (!sheets.length) throw new Error('A prévia ainda não está pronta.');
    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true, precision: 2 });
    const month = selectedExportMonth();
    doc.setProperties({
      title: `IDE Music — Escalas ${month || ''}`.trim(),
      subject: 'Escalas mensais do IDE Music',
      author: 'IDE Music · Comunidade IDE',
      creator: 'IDE Music',
      keywords: 'IDE Music, escalas, louvor, Comunidade IDE'
    });
    if (typeof doc.setCreationDate === 'function') doc.setCreationDate(new Date());
    const models = sheets.map(extractSheetModel);
    models.forEach((model, index) => {
      if (index > 0) doc.addPage('a4', 'portrait');
      if (model.type === 'absence') drawAbsencePage(doc, model); else drawSchedulePage(doc, model);
      drawFooter(doc, index + 1, models.length);
    });
    doc.save(`IDE-Music-Escalas-${month || 'mensal'}.pdf`);
  }

  let generating = false;
  async function interceptExport(event) {
    const button = event.target?.closest?.('#monthly-export-button');
    if (!button) return;
    const preview = scope.document.getElementById('monthly-export-preview');
    if (!preview?.querySelector('.weekly-export-sheet')) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    if (generating) return;
    generating = true;
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Gerando PDF…';
    try {
      await generateStaticPdf();
    } catch (error) {
      console.error('Falha ao gerar PDF estático.', error);
      if (typeof scope.alert === 'function') scope.alert('Não foi possível gerar o PDF agora. Verifique sua conexão e tente novamente.');
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      generating = false;
    }
  }

  function bootstrap() {
    ensureStyles();
    queuePreviewPolish();
    if (typeof scope.MutationObserver === 'function' && scope.document.body) {
      const observer = new scope.MutationObserver(queuePreviewPolish);
      observer.observe(scope.document.body, { childList: true, subtree: true });
      scope.__musicIdeScheduleExportPolishObserver = observer;
    }
    scope.document.addEventListener('click', interceptExport, true);
    loadJsPdf().catch(() => {});
    scope.addEventListener('beforeprint', () => polishRoot(scope.document.getElementById('schedule-print-report')));
  }

  scope.MusicIdeScheduleExportPolish = {
    ABSENCE_PEOPLE_PER_PAGE,
    normalizeAbsencePeriod,
    collectAbsenceGroups,
    groupChunks,
    polishRoot,
    extractSheetModel,
    generateStaticPdf
  };

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);
