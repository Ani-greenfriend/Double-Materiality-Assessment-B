// The report builder's PDF assembly (Section 8 "Report builder", Section 3
// "Export Arm" design intent, CLAUDE.md Brand: white pages, dark text, one
// accent colour (default #1F9A63) for headings and table header rows, a
// standard sans-serif font, graphs as images on a white background, topics
// and stakeholders in tables with repeating header rows, professional and
// compact. Built entirely in the browser (jsPDF + jspdf-autotable),
// matching CLAUDE.md's Export Arm ("no server function").
//
// The console's own charts (ResultsScreen.jsx) are dark-themed and not
// reusable here — the PDF needs light/white-background versions of the
// same charts, so this file has its own small SVG chart builders using the
// same underlying calc.js math (aggregateIro/aggregateTopic/
// assessmentSeverity), not a second scoring implementation.
//
// Section 4 ("Topics and results") leads with a materiality determination
// grouped by ESRS pillar and topic (E1–E5, S1–S4, G1) — every topic in
// scope shown as Material, Not material or Not yet assessed — since a DMA
// report's core deliverable is that determination, not just a flat IRO
// table.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { aggregateIro, aggregateTopic, hasImpactAxis, assessmentSeverity, CALC_METHODOLOGY_VERSION } from './calc';
import { ESRS_TOPICS, TYPE_LABEL } from './topics';

const ACCENT = '#1F9A63';
const AMBER = '#B36B1F';
const PRINT_PILLAR_COLOR = { E: '#1F9A63', S: '#C77F1A', G: '#3A5BD9' };
const PILLAR_NAME = { E: 'Environmental', S: 'Social', G: 'Governance' };
const PILLAR_RANGE = { E: 'ESRS E1–E5', S: 'ESRS S1–S4', G: 'ESRS G1' };
const TEXT_DARK = '#1F2328';
const TEXT_MUTED = '#6B7280';
const GRID = '#DDE1E4';
const BORDER = '#D8DBDE';

const MARGIN = 48;

function pillarOf(topicId) {
  return ESRS_TOPICS.find((t) => t.id === topicId)?.cat ?? 'E';
}

// ---- SVG chart builders (light theme, explicit pixel size so they can be
// rasterized without ever being mounted in the DOM) ----

function buildBarChartSvg(scoredIros) {
  const W = 900, rowH = 24, top = 14, left = 260, right = 50, bottom = 34;
  const H = top + scoredIros.length * rowH + bottom;
  const maxScore = 5;
  const plotW = W - left - right;
  const gx = (v) => left + (v / maxScore) * plotW;
  const grid = [0, 1, 2, 3, 4, 5].map((v) => `
    <line x1="${gx(v)}" y1="${top - 6}" x2="${gx(v)}" y2="${top + scoredIros.length * rowH}" stroke="${GRID}" stroke-width="0.5" />
    <text x="${gx(v)}" y="${top + scoredIros.length * rowH + 16}" text-anchor="middle" font-size="9" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
  `).join('');
  const rows = scoredIros.map(({ iro, score }, i) => {
    const y = top + i * rowH;
    const color = PRINT_PILLAR_COLOR[pillarOf(iro.topic)];
    const w = score !== null ? (score / maxScore) * plotW : 0;
    const label = iro.name.length > 40 ? iro.name.slice(0, 38) + '…' : iro.name;
    return `
      <text x="${left - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="9.5" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${escapeXml(label)}</text>
      <rect x="${left}" y="${y + 5}" width="${plotW}" height="${rowH - 11}" fill="#F2F3F4" />
      <rect x="${left}" y="${y + 5}" width="${w}" height="${rowH - 11}" fill="${color}" />
      <text x="${left + w + 6}" y="${y + rowH / 2 + 4}" font-size="9.5" font-weight="700" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${score !== null ? score.toFixed(1) : '–'}</text>
    `;
  }).join('');
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${grid}${rows}<text x="${left + plotW / 2}" y="${H - 4}" text-anchor="middle" font-size="9.5" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">Score (0–5)</text></svg>`,
    width: W, height: H,
  };
}

function buildHeatmapSvg({ points, xLabel, yLabel, title, threshold = 3.0 }) {
  const W = 480, H = 360, M = 46, BOTTOM = 40;
  const plotW = W - M - 16, plotH = H - M - BOTTOM;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - BOTTOM) - ((v - 1) / 4) * plotH;
  const grid = [1, 2, 3, 4, 5].map((v) => `
    <line x1="${sx(v)}" y1="${M - 6}" x2="${sx(v)}" y2="${H - BOTTOM}" stroke="${GRID}" stroke-width="0.5" />
    <text x="${sx(v)}" y="${H - BOTTOM + 16}" text-anchor="middle" font-size="10" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
    <text x="${M - 10}" y="${sy(v) + 3}" text-anchor="end" font-size="10" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
  `).join('');
  // Score = likelihood x severity/magnitude / 5 (calc.js assessmentImpactScore/
  // assessmentFinancialScore) — the material region is bounded by the hyperbola
  // y = 5*threshold/x, not the square x>=threshold AND y>=threshold, so the
  // shaded zone here has to curve the same way the live Results screen's does.
  const Tc = Math.min(5, Math.max(1, threshold));
  const materialRegionPath = (() => {
    const steps = 24;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = Tc + (5 - Tc) * (i / steps);
      const y = Math.min(5, (5 * Tc) / x);
      pts.push(`${sx(x).toFixed(2)},${sy(y).toFixed(2)}`);
    }
    return `M ${sx(5)},${sy(5)} L ${sx(Tc)},${sy(5)} L ${pts.join(' L ')} Z`;
  })();
  const dots = points.map((p) => `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="5" fill="${PRINT_PILLAR_COLOR[pillarOf(p.topic)]}" stroke="${p.isMaterial ? AMBER : 'none'}" stroke-width="${p.isMaterial ? 2 : 0}" />`).join('');
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="#FFFFFF"/>
      <text x="${M}" y="18" font-size="13" font-weight="700" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${escapeXml(title)}</text>
      <rect x="${M}" y="${M - 6}" width="${plotW}" height="${plotH + 6}" fill="none" stroke="${GRID}" />
      <path d="${materialRegionPath}" fill="rgba(179,107,31,0.12)" stroke="${AMBER}" stroke-width="1" stroke-dasharray="3 2" />
      ${grid}${dots}
      <text x="${M + plotW / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${escapeXml(xLabel)}</text>
      <text x="12" y="${H / 2}" text-anchor="middle" font-size="11" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif" transform="rotate(-90 12 ${H / 2})">${escapeXml(yLabel)}</text>
    </svg>`,
    width: W, height: H,
  };
}

function buildMatrixSvg({ topics, impactTh, financialTh }) {
  const W = 520, H = 380, M = 50, BOTTOM = 40;
  const plotW = W - M - 16, plotH = H - M - BOTTOM;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - BOTTOM) - ((v - 1) / 4) * plotH;
  const ix = sx(impactTh), fy = sy(financialTh);
  const grid = [1, 2, 3, 4, 5].map((v) => `
    <text x="${sx(v)}" y="${H - BOTTOM + 16}" text-anchor="middle" font-size="10" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
    <text x="${M - 10}" y="${sy(v) + 3}" text-anchor="end" font-size="10" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
  `).join('');
  const dots = topics.map(({ id, ta, meta }) => {
    const cx = sx(ta.impactScore ?? 1), cy = sy(ta.financialScore ?? 1);
    const r = ta.isMaterial ? 7 : 5;
    const label = (meta?.name ?? id).length > 22 ? (meta?.name ?? id).slice(0, 20) + '…' : (meta?.name ?? id);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PRINT_PILLAR_COLOR[meta?.cat ?? 'E']}" stroke="${ta.isMaterial ? '#C77F1A' : 'none'}" stroke-width="${ta.isMaterial ? 2 : 0}" />
      <text x="${cx + r + 4}" y="${cy + 3}" font-size="8.5" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${escapeXml(label)}</text>`;
  }).join('');
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="#FFFFFF"/>
      <rect x="${M}" y="${M - 6}" width="${plotW}" height="${plotH + 6}" fill="none" stroke="${GRID}" />
      <line x1="${ix}" y1="${M - 6}" x2="${ix}" y2="${H - BOTTOM}" stroke="${GRID}" stroke-dasharray="3 2" />
      <line x1="${M}" y1="${fy}" x2="${M + plotW}" y2="${fy}" stroke="${GRID}" stroke-dasharray="3 2" />
      ${grid}${dots}
      <text x="${M + plotW / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">Impact materiality →</text>
      <text x="14" y="${H / 2}" text-anchor="middle" font-size="11" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif" transform="rotate(-90 14 ${H / 2})">Financial materiality →</text>
    </svg>`,
    width: W, height: H,
  };
}

function escapeXml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgStringToPngDataUrl(svgString, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale; canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ---- PDF assembly ----

function fmt(v) {
  return v === null || v === undefined ? '–' : v.toFixed(1);
}

// Wraps and draws a paragraph, returning the y position after it — the
// line count actually rendered (not a guessed fixed increment) drives the
// cursor, so long lines never overlap the content that follows them.
function paragraph(doc, text, x, y, maxWidth, opts = {}) {
  const { fontSize = 10, color = TEXT_DARK, font = 'normal' } = opts;
  const lineHeight = opts.lineHeight ?? fontSize * 1.4;
  doc.setFontSize(fontSize);
  doc.setTextColor(color);
  doc.setFont(undefined, font);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  doc.setFont(undefined, 'normal');
  return y + lines.length * lineHeight;
}

function subheading(doc, text, y) {
  doc.setFontSize(11.5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(TEXT_DARK);
  doc.text(text, MARGIN, y);
  doc.setFont(undefined, 'normal');
  return y + 16;
}

// A small rounded label — used for Provisional/Final on the cover.
function pill(doc, text, x, y, { fill, textColor, fontSize = 9 }) {
  doc.setFontSize(fontSize);
  doc.setFont(undefined, 'bold');
  const padX = 9, h = fontSize + 8;
  const w = doc.getTextWidth(text) + padX * 2;
  doc.setFillColor(fill);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  doc.setTextColor(textColor);
  doc.text(text, x + w / 2, y + h / 2 + fontSize * 0.35, { align: 'center' });
  doc.setFont(undefined, 'normal');
  return w;
}

// A numbered circle beside a wrapped line of text — used for the process
// steps in Section 2.
function numberedStep(doc, n, text, x, y, maxWidth) {
  const r = 9, cy = y + r;
  doc.setFillColor(ACCENT);
  doc.circle(x + r, cy, r, 'F');
  doc.setFontSize(9.5);
  doc.setTextColor('#FFFFFF');
  doc.setFont(undefined, 'bold');
  doc.text(String(n), x + r, cy + 3.2, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK);
  const textX = x + r * 2 + 12;
  const lines = doc.splitTextToSize(text, maxWidth - r * 2 - 12);
  const lineH = 13;
  doc.text(lines, textX, cy + 3.2);
  return y + Math.max(lines.length * lineH, r * 2) + 12;
}

// A bordered stat box — label, big value, small sub-line — used on the
// cover and for the two thresholds in Section 2.
function statCard(doc, x, y, w, h, { label, value, sub }) {
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED);
  doc.setFont(undefined, 'normal');
  doc.text(label.toUpperCase(), x + 12, y + 16);
  doc.setFontSize(19);
  doc.setTextColor(TEXT_DARK);
  doc.setFont(undefined, 'bold');
  doc.text(value, x + 12, y + 37);
  doc.setFont(undefined, 'normal');
  if (sub) {
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED);
    doc.text(sub, x + 12, y + h - 10);
  }
}

function addFooter(doc, { cycleLabel, esrsLabel, provisional }) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(GRID);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, pageH - 34, pageW - MARGIN, pageH - 34);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(TEXT_MUTED);
    doc.text(`${cycleLabel} · ${esrsLabel} · ${dateStr}`, MARGIN, pageH - 20);
    doc.text(`${provisional ? 'PROVISIONAL' : 'FINAL'} · Page ${i} of ${pageCount}`, pageW - MARGIN, pageH - 20, { align: 'right' });
  }
}

// A slim running header (report title, client name, a rule) on every page
// except the cover, which already carries its own large title.
function addRunningHeader(doc, { clientName }) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(TEXT_MUTED);
    doc.text('DOUBLE MATERIALITY ASSESSMENT', MARGIN, 28);
    doc.text(clientName, pageW - MARGIN, 28, { align: 'right' });
    doc.setDrawColor(GRID);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 34, pageW - MARGIN, 34);
  }
}

function sectionHeading(doc, num, text, y) {
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED);
  doc.setFont(undefined, 'bold');
  doc.text(`SECTION ${num}`, MARGIN, y);
  doc.setFontSize(18);
  doc.setTextColor(TEXT_DARK);
  doc.text(text, MARGIN, y + 22);
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(2);
  doc.line(MARGIN, y + 30, MARGIN + 40, y + 30);
  doc.setLineWidth(0.5);
  doc.setFont(undefined, 'normal');
  return y + 52;
}

// A colored tick mark + pillar name + ESRS range — groups the materiality
// determination table and the topic matrix by Environmental/Social/
// Governance.
function pillarHeading(doc, pillarKey, y) {
  const color = PRINT_PILLAR_COLOR[pillarKey];
  doc.setFillColor(color);
  doc.rect(MARGIN, y - 10, 4, 14, 'F');
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(TEXT_DARK);
  doc.text(PILLAR_NAME[pillarKey], MARGIN + 10, y);
  const nameW = doc.getTextWidth(PILLAR_NAME[pillarKey]);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED);
  doc.text(PILLAR_RANGE[pillarKey], MARGIN + 10 + nameW + 8, y);
  return y + 14;
}

function ensureSpace(doc, y, needed, topMargin = MARGIN + 20) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 46) {
    doc.addPage();
    return topMargin;
  }
  return y;
}

const TABLE_THEME = {
  headStyles: { fillColor: ACCENT, textColor: '#FFFFFF', fontStyle: 'bold', fontSize: 8.5 },
  styles: { fontSize: 8.5, textColor: TEXT_DARK, cellPadding: 5, lineColor: GRID, lineWidth: 0.5 },
  alternateRowStyles: { fillColor: '#FAFAFB' },
  margin: { left: MARGIN, right: MARGIN },
};

export async function buildReportPdf({ cycle, iros, groupEngagement, thresholdChanges, liveSessions, liveParticipants, submissions, ratings, consultantLogoUrl }, { sections, options }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - MARGIN * 2;
  const isFinal = iros.length > 0 && iros.every((iro) => iro.calibration?.reviewed_with_owner);
  const esrsLabel = cycle.esrsVersion === 'esrs_2026' ? 'ESRS 2026' : 'ESRS 2023 as amended';
  const clientName = cycle.clientName ?? 'Client';
  const cycleLabel = `${clientName} — FY${cycle.financialYear}`;
  const showPersonalData = !!options.personalData;

  const thresholds = { impact: cycle.impactThreshold ?? 3.0, financial: cycle.financialThreshold ?? 3.0 };

  const scopedIros = iros.filter((iro) => {
    if (options.scope === 'material') return aggregateIro(iro, thresholds).isMaterial;
    if (options.scope && options.scope !== 'all') return iro.topic === options.scope;
    return true;
  });

  // The ESRS topic-level determination, in canonical E1..G1 order — the
  // basis for both the cover summary and Section 4's pillar-grouped
  // breakdown. A topic with no submitted ratings yet is called out
  // separately from one that was assessed and found not material.
  const topicOrder = ESRS_TOPICS.map((t) => t.id);
  const presentTopicIds = [...new Set(scopedIros.map((i) => i.topic))]
    .sort((a, b) => topicOrder.indexOf(a) - topicOrder.indexOf(b));
  const topicSummaries = presentTopicIds.map((id) => {
    const meta = ESRS_TOPICS.find((t) => t.id === id);
    const ta = aggregateTopic(id, scopedIros, thresholds);
    const hasData = ta.iros.some((i) => i.assessments.length > 0);
    const status = !hasData ? 'not_assessed' : ta.isMaterial ? 'material' : 'not_material';
    return { id, meta, ta, status };
  });
  const materialCount = topicSummaries.filter((t) => t.status === 'material').length;
  const assessedCount = topicSummaries.filter((t) => t.status !== 'not_assessed').length;

  // Each section starts on its own fresh page, but only the page break
  // between two INCLUDED sections — never a trailing blank page after
  // whichever section happens to be ticked last.
  let firstSection = true;
  function startSection() {
    if (!firstSection) doc.addPage();
    firstSection = false;
  }

  // ---- 1. Cover and basis ----
  if (sections.cover) {
    startSection();
    doc.setFillColor(ACCENT);
    doc.rect(0, 0, pageW, 6, 'F');

    let y = 74;
    if (consultantLogoUrl) { try { doc.addImage(consultantLogoUrl, 'PNG', MARGIN, y, 54, 54); } catch { /* skip if not loadable */ } }
    if (cycle.clientLogoUrl) { try { doc.addImage(cycle.clientLogoUrl, 'PNG', pageW - MARGIN - 54, y, 54, 54); } catch { /* skip if not loadable */ } }
    y += 86;

    doc.setFontSize(10);
    doc.setTextColor(ACCENT);
    doc.setFont(undefined, 'bold');
    doc.text('DOUBLE MATERIALITY ASSESSMENT', MARGIN, y);
    y += 30;
    doc.setFontSize(27);
    doc.setTextColor(TEXT_DARK);
    doc.text(clientName, MARGIN, y);
    y += 20;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(13);
    doc.setTextColor(TEXT_MUTED);
    doc.text(`Financial year ${cycle.financialYear} · ${esrsLabel}`, MARGIN, y);
    y += 38;

    const statW = (contentW - 24) / 3;
    statCard(doc, MARGIN, y, statW, 64, { label: 'ESRS topics in scope', value: String(topicSummaries.length), sub: `${assessedCount} assessed` });
    statCard(doc, MARGIN + statW + 12, y, statW, 64, { label: 'Material topics', value: String(materialCount), sub: `of ${topicSummaries.length}` });
    const signedOff = iros.filter((i) => i.calibration?.reviewed_with_owner).length;
    statCard(doc, MARGIN + (statW + 12) * 2, y, statW, 64, { label: 'Report status', value: isFinal ? 'Final' : 'Provisional', sub: isFinal ? 'All IROs signed off' : `${signedOff} of ${iros.length} IROs signed off` });
    y += 92;

    const summary = `This report presents the outcome of the Double Materiality Assessment performed for ${clientName}, covering financial year ${cycle.financialYear} under ${esrsLabel}. Sustainability topics were assessed from both an impact and a financial materiality perspective, in line with the ESRS double materiality principle. Of the ${topicSummaries.length} ESRS topic${topicSummaries.length === 1 ? '' : 's'} in scope, ${materialCount} ${materialCount === 1 ? 'was' : 'were'} determined material, based on an impact materiality threshold of ${fmt(thresholds.impact)} and a financial materiality threshold of ${fmt(thresholds.financial)} (both on a 0–5 scale). Section 4 sets out the determination for every topic; Section 2 explains the process and scoring method behind it.`;
    y = paragraph(doc, summary, MARGIN, y, contentW, { fontSize: 10.5, lineHeight: 15 });
    y += 26;

    pill(doc, isFinal ? 'FINAL' : 'PROVISIONAL', MARGIN, y, { fill: isFinal ? ACCENT : AMBER, textColor: '#FFFFFF', fontSize: 10 });
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED);
    doc.text(`Report generated ${new Date().toLocaleDateString()}`, MARGIN, y + 32);
  }

  // ---- 2. Process and methodology ----
  if (sections.methodology) {
    startSection();
    let y = sectionHeading(doc, '02', 'Process and methodology', MARGIN + 4);
    y = paragraph(doc, `This assessment applied the double materiality principle set out in the European Sustainability Reporting Standards (ESRS): a sustainability topic is material if it is material from an impact perspective, a financial perspective, or both. Impact materiality considers the severity and likelihood of ${clientName}'s actual and potential impacts on people and the environment; financial materiality considers the risks and opportunities that could reasonably affect ${clientName}'s development, performance and position. The process below was followed to reach the determination set out in Section 4.`, MARGIN, y, contentW, { fontSize: 10, lineHeight: 14 });
    y += 18;

    const steps = [
      'Stakeholders were identified across the impact and financial perspectives, including silent stakeholders (nature, biodiversity and future generations) represented by a proxy.',
      'Sustainability topics were scoped from the ESRS topic library and broken down into impacts, risks and opportunities (IROs).',
      'Experts rated each applicable IRO — by written questionnaire (Expert survey) or in a facilitated group session (Expert live session).',
      'Scores were calculated from the ratings, then calibrated where the group agreed an adjustment was needed; every calibration change was logged.',
      'Each IRO was signed off individually once its result was confirmed with the topic owner.',
    ];
    steps.forEach((s, i) => { y = numberedStep(doc, i + 1, s, MARGIN, y, contentW); });
    y += 6;

    y = ensureSpace(doc, y, 150);
    y = subheading(doc, 'Scoring method', y);
    const scoringLines = [
      'Severity of a negative impact is the average of Scale, Scope and Irremediability — or 5 if any one of the three is rated 5 (a precautionary override).',
      'Severity of a positive impact is the average of Scale and Scope, with no override.',
      'Impact score = severity × (likelihood ÷ 5). Financial score = magnitude × (financial likelihood ÷ 5), with no override.',
      'A topic is material if any one of its underlying impacts, risks or opportunities meets or exceeds the applicable threshold.',
    ];
    scoringLines.forEach((s) => { y = paragraph(doc, `–  ${s}`, MARGIN, y, contentW, { fontSize: 9.5, lineHeight: 13 }); y += 4; });
    y += 4;
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_MUTED);
    doc.text(`Methodology version: ${CALC_METHODOLOGY_VERSION}`, MARGIN, y);
    y += 26;

    y = ensureSpace(doc, y, 100);
    y = subheading(doc, 'Materiality thresholds', y);
    const halfW = (contentW - 12) / 2;
    statCard(doc, MARGIN, y, halfW, 56, { label: 'Impact threshold', value: `${fmt(thresholds.impact)} / 5`, sub: `Baseline ${fmt(cycle.baselineImpactThreshold)}` });
    statCard(doc, MARGIN + halfW + 12, y, halfW, 56, { label: 'Financial threshold', value: `${fmt(thresholds.financial)} / 5`, sub: `Baseline ${fmt(cycle.baselineFinancialThreshold)}` });
    y += 76;

    if (thresholdChanges.length) {
      y = ensureSpace(doc, y, 50);
      y = subheading(doc, 'Threshold change log', y);
      autoTable(doc, {
        startY: y,
        head: [['Axis', 'Old value', 'New value', 'Reason', 'Changed at']],
        body: thresholdChanges.map((c) => [c.axis, fmt(c.old_value), fmt(c.new_value), c.reason ?? '', new Date(c.changed_at).toLocaleDateString()]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }
    if (options.notes?.methodology) paragraph(doc, options.notes.methodology, MARGIN, ensureSpace(doc, y, 30), contentW, { fontSize: 9, color: TEXT_MUTED, font: 'italic' });
  }

  // ---- 3. Engagement ----
  if (sections.engagement) {
    startSection();
    let y = sectionHeading(doc, '03', 'Engagement', MARGIN + 4);
    y = paragraph(doc, 'Engagement covered stakeholders across both the impact and financial perspectives, including proxies for stakeholders who cannot represent themselves directly (nature and ecosystems, species and biodiversity, future generations).', MARGIN, y, contentW, { fontSize: 10, lineHeight: 14 });
    y += 12;

    if (groupEngagement.length) {
      y = subheading(doc, 'Stakeholder groups', y);
      autoTable(doc, {
        startY: y,
        head: [['Stakeholder group', 'Type', 'Invited', 'Responded']],
        body: groupEngagement.map((g) => [g.group_name, g.group_type === 'silent' ? 'Silent stakeholder' : (g.group_type ?? '—'), g.invited_count, g.submitted_count]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    const silentSubmissions = submissions.filter((s) => s.basis_for_representation);
    if (silentSubmissions.length) {
      y = ensureSpace(doc, y, 60);
      y = subheading(doc, 'Silent stakeholder representation', y);
      autoTable(doc, {
        startY: y,
        head: [['Stakeholder group', 'Basis for representation']],
        body: silentSubmissions.map((s) => [s.stakeholder_group ?? '—', s.basis_for_representation]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    y = ensureSpace(doc, y, 60);
    y = subheading(doc, 'Respondents by field of expertise', y);
    const expertiseCounts = {};
    submissions.forEach((s) => (s.expertise_topics || []).forEach((t) => { expertiseCounts[t] = (expertiseCounts[t] ?? 0) + 1; }));
    const expertiseRows = Object.entries(expertiseCounts);
    if (expertiseRows.length) {
      autoTable(doc, { startY: y, head: [['Field of expertise', 'Respondents']], body: expertiseRows, ...TABLE_THEME });
      y = doc.lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(9); doc.setTextColor(TEXT_MUTED); doc.text('No expertise declared yet.', MARGIN, y); y += 20;
    }

    if (liveSessions.length) {
      y = ensureSpace(doc, y, 60);
      y = subheading(doc, 'Live session dates and attendees', y);
      autoTable(doc, {
        startY: y,
        head: [['Facilitator', 'Started', 'Finished', 'Attendees']],
        body: liveSessions.map((ls) => [
          ls.facilitator ?? '—',
          ls.started_at ? new Date(ls.started_at).toLocaleDateString() : '—',
          ls.finished_at ? new Date(ls.finished_at).toLocaleDateString() : '—',
          liveParticipants.filter((p) => p.live_session_id === ls.id).map((p) => (showPersonalData ? p.name : (p.expertise || []).join('/'))).join(', ') || '—',
        ]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }
    if (options.notes?.engagement) paragraph(doc, options.notes.engagement, MARGIN, ensureSpace(doc, y, 30), contentW, { fontSize: 9, color: TEXT_MUTED, font: 'italic' });
  }

  // ---- 4. Topics and results ----
  if (sections.results) {
    startSection();
    let y = sectionHeading(doc, '04', 'Topics and results', MARGIN + 4);
    y = paragraph(doc, `Of the ${topicSummaries.length} ESRS topic${topicSummaries.length === 1 ? '' : 's'} in scope for ${clientName}, ${assessedCount} ${assessedCount === 1 ? 'has' : 'have'} been assessed to date and ${materialCount} ${materialCount === 1 ? 'is' : 'are'} determined material under the process described in Section 2. A topic is Material if any of its underlying impacts, risks or opportunities (IROs) scored at or above the applicable threshold — impact ≥ ${fmt(thresholds.impact)}, financial ≥ ${fmt(thresholds.financial)}. "Not yet assessed" means no rating has been submitted for that topic yet.`, MARGIN, y, contentW, { fontSize: 10, lineHeight: 14 });
    y += 10;

    y = ensureSpace(doc, y, 40);
    y = subheading(doc, 'Materiality determination by ESRS topic', y);

    ['E', 'S', 'G'].forEach((pk) => {
      const rows = topicSummaries.filter((t) => t.meta?.cat === pk);
      if (!rows.length) return;
      y = ensureSpace(doc, y, 80);
      y = pillarHeading(doc, pk, y + 8) + 6;
      autoTable(doc, {
        startY: y,
        head: [['Topic', 'Impact score', 'Financial score', 'Determination']],
        body: rows.map((t) => {
          const impactIroCount = t.ta.iros.filter((i) => hasImpactAxis(i.iroType)).length;
          const financialIroCount = t.ta.iros.filter((i) => !hasImpactAxis(i.iroType)).length;
          const label = t.status === 'material' ? 'Material' : t.status === 'not_material' ? 'Not material' : 'Not yet assessed';
          return [t.meta?.name ?? t.id, impactIroCount ? fmt(t.ta.impactScore) : '—', financialIroCount ? fmt(t.ta.financialScore) : '—', label];
        }),
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Material') data.cell.styles.textColor = ACCENT;
            else if (data.cell.raw === 'Not yet assessed') { data.cell.styles.textColor = TEXT_MUTED; data.cell.styles.fontStyle = 'italic'; }
            else data.cell.styles.textColor = TEXT_MUTED;
          }
        },
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 18;
    });

    y = ensureSpace(doc, y, 40);
    y = subheading(doc, 'Visual analysis', y);

    const scoredIros = scopedIros
      .map((iro) => { const agg = aggregateIro(iro, thresholds); return { iro, agg, score: agg.effectiveValue }; })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const aggByIroId = new Map(scoredIros.map(({ iro, agg }) => [iro.id, agg]));
    const bar = buildBarChartSvg(scoredIros);
    const barPng = await svgStringToPngDataUrl(bar.svg, bar.width, bar.height);
    const barW = contentW, barH = (bar.height / bar.width) * barW;
    y = ensureSpace(doc, y, barH + 30);
    doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(TEXT_DARK); doc.text('IRO scores', MARGIN, y); doc.setFont(undefined, 'normal'); y += 10;
    doc.addImage(barPng.dataUrl, 'PNG', MARGIN, y, barW, barH);
    y += barH + 24;

    const impactPoints = scopedIros.filter((iro) => hasImpactAxis(iro.iroType) && iro.assessments.length).map((iro) => {
      const severities = iro.assessments.map((a) => assessmentSeverity(iro, a));
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!severities.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { topic: iro.topic, x: avg(likelihoods), y: avg(severities), isMaterial: aggByIroId.get(iro.id)?.isMaterial ?? false };
    }).filter(Boolean);
    const financialPoints = scopedIros.filter((iro) => !hasImpactAxis(iro.iroType) && iro.assessments.length).map((iro) => {
      const magnitudes = iro.assessments.map((a) => a.magnitude).filter((v) => v !== null && v !== undefined);
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!magnitudes.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { topic: iro.topic, x: avg(likelihoods), y: avg(magnitudes), isMaterial: aggByIroId.get(iro.id)?.isMaterial ?? false };
    }).filter(Boolean);

    y = ensureSpace(doc, y, 220);
    doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(TEXT_DARK); doc.text('Impact and financial heatmaps', MARGIN, y); doc.setFont(undefined, 'normal'); y += 10;
    const impactHm = buildHeatmapSvg({ points: impactPoints, xLabel: 'Likelihood', yLabel: 'Severity', title: 'Impact heatmap', threshold: thresholds.impact });
    const financialHm = buildHeatmapSvg({ points: financialPoints, xLabel: 'Likelihood', yLabel: 'Magnitude', title: 'Financial heatmap', threshold: thresholds.financial });
    const [impactPng, financialPng] = await Promise.all([
      svgStringToPngDataUrl(impactHm.svg, impactHm.width, impactHm.height),
      svgStringToPngDataUrl(financialHm.svg, financialHm.width, financialHm.height),
    ]);
    const halfW2 = (contentW - 16) / 2, hmH = (impactHm.height / impactHm.width) * halfW2;
    doc.addImage(impactPng.dataUrl, 'PNG', MARGIN, y, halfW2, hmH);
    doc.addImage(financialPng.dataUrl, 'PNG', MARGIN + halfW2 + 16, y, halfW2, hmH);
    y += hmH + 24;

    const matrixTopics = presentTopicIds
      .map((id) => ({ id, ta: aggregateTopic(id, scopedIros, thresholds), meta: ESRS_TOPICS.find((t) => t.id === id) }))
      .filter((t) => t.ta && t.ta.iros.some((i) => i.assessments.length > 0));
    if (matrixTopics.length) {
      y = ensureSpace(doc, y, 280);
      doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(TEXT_DARK); doc.text('Topic matrix', MARGIN, y); doc.setFont(undefined, 'normal'); y += 10;
      const matrix = buildMatrixSvg({ topics: matrixTopics, impactTh: thresholds.impact, financialTh: thresholds.financial });
      const matrixPng = await svgStringToPngDataUrl(matrix.svg, matrix.width, matrix.height);
      const matrixW = contentW, matrixH = (matrix.height / matrix.width) * matrixW;
      doc.addImage(matrixPng.dataUrl, 'PNG', MARGIN, y, matrixW, matrixH);
    }

    doc.addPage();
    y = MARGIN + 14;
    y = subheading(doc, 'Full IRO listing', y);
    const sortedIros = [...scopedIros].sort((a, b) => topicOrder.indexOf(a.topic) - topicOrder.indexOf(b.topic) || a.name.localeCompare(b.name));
    autoTable(doc, {
      startY: y,
      head: [['ESRS Topic', 'IRO', 'Type', 'Survey', 'Session', 'Calibrated/Calculated', 'Material']],
      body: sortedIros.map((iro) => {
        const agg = aggregateIro(iro, thresholds);
        return [iro.topic, iro.name, TYPE_LABEL[iro.iroType], fmt(agg.surveyAvg), fmt(agg.sessionAvg), fmt(agg.effectiveValue), agg.isMaterial ? 'Yes' : 'No'];
      }),
      ...TABLE_THEME,
    });
    if (options.notes?.results) paragraph(doc, options.notes.results, MARGIN, ensureSpace(doc, doc.lastAutoTable.finalY + 20, 30), contentW, { fontSize: 9, color: TEXT_MUTED, font: 'italic' });
  }

  // ---- 5. Calibration and sign-off ----
  if (sections.calibration) {
    startSection();
    let y = sectionHeading(doc, '05', 'Calibration and sign-off', MARGIN + 4);
    const allHistory = scopedIros.flatMap((iro) => (iro.calibrationHistory || []).map((h) => ({ iro, h })));
    if (allHistory.length) {
      y = subheading(doc, 'Calibration history', y);
      autoTable(doc, {
        startY: y,
        head: [['IRO', 'Old value', 'New value', 'Reason', 'Changed by', 'Changed at']],
        body: allHistory.map(({ iro, h }) => [iro.name, fmt(h.from_value), fmt(h.to_value), h.notes ?? '', h.changed_by ?? '', new Date(h.changed_at).toLocaleString()]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(9); doc.setTextColor(TEXT_MUTED); doc.text('No calibration changes recorded.', MARGIN, y); y += 24;
    }

    y = ensureSpace(doc, y, 60);
    y = subheading(doc, 'Sign-off', y);
    autoTable(doc, {
      startY: y,
      head: [['IRO', 'Signed off', 'Date']],
      body: scopedIros.map((iro) => [iro.name, iro.calibration?.reviewed_with_owner ? 'Yes' : 'No', iro.calibration?.reviewed_with_owner_at ? new Date(iro.calibration.reviewed_with_owner_at).toLocaleDateString() : '—']),
      ...TABLE_THEME,
    });
    y = doc.lastAutoTable.finalY + 20;

    if (options.approvalDetails?.approverName) {
      y = ensureSpace(doc, y, 60);
      y = subheading(doc, 'Approval details', y);
      doc.setFontSize(9); doc.setTextColor(TEXT_DARK);
      doc.text(`Approver: ${options.approvalDetails.approverName}${options.approvalDetails.approverRole ? ` (${options.approvalDetails.approverRole})` : ''}`, MARGIN, y); y += 14;
      if (options.approvalDetails.approvalDate) { doc.text(`Date: ${options.approvalDetails.approvalDate}`, MARGIN, y); y += 14; }
      if (options.approvalDetails.minutesReference) { doc.text(`Minutes reference: ${options.approvalDetails.minutesReference}`, MARGIN, y); y += 14; }
    }
    if (options.notes?.calibration) paragraph(doc, options.notes.calibration, MARGIN, ensureSpace(doc, y + 6, 30), contentW, { fontSize: 9, color: TEXT_MUTED, font: 'italic' });
  }

  // ---- 6. Appendix ----
  if (sections.appendix) {
    startSection();
    let y = sectionHeading(doc, '06', 'Appendix', MARGIN + 4);
    const includeJustifications = options.justifications !== 'excluded';
    if (includeJustifications) {
      const flaggedTopicIds = options.justifications === 'flagged'
        ? new Set(scopedIros.filter((iro) => { const agg = aggregateIro(iro, thresholds); return agg.discrepancy || agg.overrideTriggered; }).map((i) => i.id))
        : null;
      const ratingRows = ratings.filter((r) => r.justification && (!flaggedTopicIds || flaggedTopicIds.has(r.iro_id)));
      const iroNameById = new Map(iros.map((i) => [i.id, i.name]));
      if (ratingRows.length) {
        y = subheading(doc, 'Ratings and justifications', y);
        autoTable(doc, {
          startY: y,
          head: [['IRO', 'Source', 'Stakeholder group', 'Criterion', 'Value', 'Justification']],
          body: ratingRows.map((r) => [iroNameById.get(r.iro_id) ?? r.iro_id, TYPE_LABEL[r.source] ?? r.source, r.stakeholder_group ?? '—', r.criterion_key, r.value ?? '', r.justification]),
          ...TABLE_THEME,
        });
        y = doc.lastAutoTable.finalY + 20;
      }
    }
    const comments = submissions.filter((s) => s.overall_comment);
    if (comments.length) {
      y = ensureSpace(doc, y, 60);
      y = subheading(doc, "Experts' overall comments", y);
      autoTable(doc, {
        startY: y,
        head: [['Source', 'Stakeholder group', 'Comment']],
        body: comments.map((s) => [TYPE_LABEL[s.source] ?? s.source, s.stakeholder_group ?? '—', s.overall_comment]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }
    if (options.notes?.appendix) paragraph(doc, options.notes.appendix, MARGIN, ensureSpace(doc, y, 30), contentW, { fontSize: 9, color: TEXT_MUTED, font: 'italic' });
  }

  addRunningHeader(doc, { clientName });
  addFooter(doc, { cycleLabel, esrsLabel, provisional: !isFinal });
  return doc;
}
