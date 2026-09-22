// The report builder's PDF assembly (Section 8 "Report builder", Section 3
// "Export Arm" design intent, CLAUDE.md Brand: white pages, dark text, one
// accent colour (default #1F9A63) for headings and table header rows, a
// standard sans-serif font, graphs as images on a white background, topics
// and stakeholders in tables with repeating header rows, compact — no
// decorative elements. Built entirely in the browser (jsPDF +
// jspdf-autotable), matching CLAUDE.md's Export Arm ("no server function").
//
// The console's own charts (ResultsScreen.jsx) are dark-themed and not
// reusable here — the PDF needs light/white-background versions of the
// same charts, so this file has its own small SVG chart builders using the
// same underlying calc.js math (aggregateIro/aggregateTopic/
// assessmentSeverity), not a second scoring implementation.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { aggregateIro, aggregateTopic, hasImpactAxis, assessmentSeverity, CALC_METHODOLOGY_VERSION } from './calc';
import { ESRS_TOPICS, TYPE_LABEL } from './topics';

const ACCENT = '#1F9A63';
const PRINT_PILLAR_COLOR = { E: '#1F9A63', S: '#C77F1A', G: '#3A5BD9' };
const TEXT_DARK = '#1A1A1A';
const TEXT_MUTED = '#6B6B6B';
const GRID = '#DADADA';

function pillarOf(topicId) {
  return ESRS_TOPICS.find((t) => t.id === topicId)?.cat ?? 'E';
}

// ---- SVG chart builders (light theme, explicit pixel size so they can be
// rasterized without ever being mounted in the DOM) ----

function buildBarChartSvg(scoredIros) {
  const W = 900, rowH = 26, top = 10, left = 260, right = 60;
  const H = top + scoredIros.length * rowH + 10;
  const maxScore = Math.max(5, ...scoredIros.map((x) => x.score ?? 0));
  const plotW = W - left - right;
  const rows = scoredIros.map(({ iro, score }, i) => {
    const y = top + i * rowH;
    const color = PRINT_PILLAR_COLOR[pillarOf(iro.topic)];
    const w = score !== null ? (score / maxScore) * plotW : 0;
    const label = iro.name.length > 42 ? iro.name.slice(0, 40) + '…' : iro.name;
    return `
      <text x="${left - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="11" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${escapeXml(label)}</text>
      <rect x="${left}" y="${y + 4}" width="${plotW}" height="${rowH - 10}" fill="#F2F2F2" />
      <rect x="${left}" y="${y + 4}" width="${w}" height="${rowH - 10}" fill="${color}" />
      <text x="${left + plotW + 6}" y="${y + rowH / 2 + 4}" font-size="11" font-weight="700" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${score !== null ? score.toFixed(1) : '–'}</text>
    `;
  }).join('');
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${rows}</svg>`, width: W, height: H };
}

function buildHeatmapSvg({ points, xLabel, yLabel, title }) {
  const W = 480, H = 360, M = 46, BOTTOM = 40;
  const plotW = W - M - 16, plotH = H - M - BOTTOM;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - BOTTOM) - ((v - 1) / 4) * plotH;
  const grid = [1, 2, 3, 4, 5].map((v) => `
    <line x1="${sx(v)}" y1="${M - 6}" x2="${sx(v)}" y2="${H - BOTTOM}" stroke="${GRID}" stroke-width="0.5" />
    <text x="${sx(v)}" y="${H - BOTTOM + 16}" text-anchor="middle" font-size="10" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
    <text x="${M - 10}" y="${sy(v) + 3}" text-anchor="end" font-size="10" fill="${TEXT_MUTED}" font-family="Helvetica,Arial,sans-serif">${v}</text>
  `).join('');
  const dots = points.map((p) => `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="5" fill="${PRINT_PILLAR_COLOR[pillarOf(p.topic)]}" stroke="#FFFFFF" stroke-width="1" />`).join('');
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="#FFFFFF"/>
      <text x="${M}" y="18" font-size="13" font-weight="700" fill="${TEXT_DARK}" font-family="Helvetica,Arial,sans-serif">${escapeXml(title)}</text>
      <rect x="${M}" y="${M - 6}" width="${plotW}" height="${plotH + 6}" fill="none" stroke="${GRID}" />
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
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PRINT_PILLAR_COLOR[meta?.cat ?? 'E']}" stroke="${ta.isMaterial ? '#C77F1A' : '#FFFFFF'}" stroke-width="${ta.isMaterial ? 2 : 1}" />
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

function addFooter(doc, { cycleLabel, esrsLabel, provisional }) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED);
    doc.text(`${cycleLabel} · ${esrsLabel} · ${dateStr}`, 36, pageH - 20);
    doc.text(`${provisional ? 'PROVISIONAL' : 'FINAL'} · Page ${i} of ${pageCount}`, pageW - 36, pageH - 20, { align: 'right' });
  }
}

function sectionHeading(doc, text, y) {
  doc.setFontSize(16);
  doc.setTextColor(ACCENT);
  doc.setFont(undefined, 'bold');
  doc.text(text, 36, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(TEXT_DARK);
  return y + 20;
}

function ensureSpace(doc, y, needed, topMargin = 50) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 40) {
    doc.addPage();
    return topMargin;
  }
  return y;
}

const TABLE_THEME = { headStyles: { fillColor: ACCENT, textColor: '#FFFFFF', fontStyle: 'bold' }, styles: { fontSize: 8.5, textColor: TEXT_DARK, cellPadding: 4 }, margin: { left: 36, right: 36 } };

export async function buildReportPdf({ cycle, iros, groupEngagement, thresholdChanges, liveSessions, liveParticipants, submissions, ratings, consultantLogoUrl }, { sections, options }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const isFinal = iros.length > 0 && iros.every((iro) => iro.calibration?.reviewed_with_owner);
  const esrsLabel = cycle.esrsVersion === 'esrs_2026' ? 'ESRS 2026' : 'ESRS 2023 as amended';
  const cycleLabel = `${cycle.clientName ?? 'Client'} — FY${cycle.financialYear}`;
  const showPersonalData = !!options.personalData;

  const thresholds = { impact: cycle.impactThreshold ?? 3.0, financial: cycle.financialThreshold ?? 3.0 };

  const scopedIros = iros.filter((iro) => {
    if (options.scope === 'material') return aggregateIro(iro, thresholds).isMaterial;
    if (options.scope && options.scope !== 'all') return iro.topic === options.scope;
    return true;
  });

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
    let y = 90;
    if (consultantLogoUrl) { try { doc.addImage(consultantLogoUrl, 'PNG', 36, 36, 60, 60); } catch { /* skip if not loadable */ } }
    if (cycle.clientLogoUrl) { try { doc.addImage(cycle.clientLogoUrl, 'PNG', pageW - 96, 36, 60, 60); } catch { /* skip if not loadable */ } }
    doc.setFontSize(24);
    doc.setTextColor(ACCENT);
    doc.setFont(undefined, 'bold');
    doc.text('Double Materiality Assessment', 36, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(TEXT_DARK);
    y += 34;
    doc.setFontSize(13);
    doc.text(cycle.clientName ?? 'Client', 36, y); y += 20;
    doc.setFontSize(11);
    doc.setTextColor(TEXT_MUTED);
    doc.text(`Financial year ${cycle.financialYear}`, 36, y); y += 16;
    doc.text(esrsLabel, 36, y); y += 16;
    doc.text(`Report generated ${new Date().toLocaleDateString()}`, 36, y); y += 24;
    doc.setFontSize(12);
    doc.setTextColor(isFinal ? ACCENT : '#B36B1F');
    doc.setFont(undefined, 'bold');
    doc.text(isFinal ? 'FINAL' : 'PROVISIONAL', 36, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(TEXT_DARK);
  }

  // ---- 2. Process and methodology ----
  if (sections.methodology) {
    startSection();
    let y = sectionHeading(doc, 'Process and methodology', 50);
    doc.setFontSize(10);
    const steps = [
      'Stakeholders identified across impact and financial perspectives, including silent stakeholders represented by a proxy.',
      'Topics assessed as Impacts, Risks or Opportunities, drawn from the ESRS topic library.',
      'Experts rate each applicable topic — by questionnaire (Expert survey) or a facilitated group session (Expert live session).',
      'Results are calculated, then calibrated where the group agrees an adjustment is needed, with every change logged.',
      'Each IRO is signed off individually once the group confirms the result.',
    ];
    steps.forEach((s, i) => { doc.text(`${i + 1}. ${s}`, 36, y, { maxWidth: pageW - 72 }); y += 26; });
    y += 8;
    doc.setFont(undefined, 'bold'); doc.text('Scoring', 36, y); doc.setFont(undefined, 'normal'); y += 16;
    doc.setFontSize(9);
    [
      'Severity (negative impact) = average of Scale, Scope and Irremediability — or 5 if any one of them is 5.',
      'Severity (positive impact) = average of Scale and Scope.',
      'Impact score = severity × (likelihood ÷ 5). Financial score = magnitude × (likelihood ÷ 5), no override.',
      `Methodology version: ${CALC_METHODOLOGY_VERSION}.`,
    ].forEach((s) => { doc.text(s, 36, y, { maxWidth: pageW - 72 }); y += 14; });
    y += 14;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold'); doc.text('Thresholds', 36, y); doc.setFont(undefined, 'normal'); y += 16;
    doc.setFontSize(9);
    doc.text(`Impact threshold: ${fmt(thresholds.impact)} (baseline ${fmt(cycle.baselineImpactThreshold)})`, 36, y); y += 14;
    doc.text(`Financial threshold: ${fmt(thresholds.financial)} (baseline ${fmt(cycle.baselineFinancialThreshold)})`, 36, y); y += 20;

    if (thresholdChanges.length) {
      y = ensureSpace(doc, y, 40);
      autoTable(doc, {
        startY: y,
        head: [['Axis', 'Old value', 'New value', 'Reason', 'Changed at']],
        body: thresholdChanges.map((c) => [c.axis, fmt(c.old_value), fmt(c.new_value), c.reason ?? '', new Date(c.changed_at).toLocaleDateString()]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }
    if (options.notes?.methodology) { doc.setFontSize(9); doc.text(options.notes.methodology, 36, y, { maxWidth: pageW - 72 }); }
  }

  // ---- 3. Engagement ----
  if (sections.engagement) {
    startSection();
    let y = sectionHeading(doc, 'Engagement', 50);
    if (groupEngagement.length) {
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
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Silent stakeholder representation', 36, y); doc.setFont(undefined, 'normal'); y += 16;
      autoTable(doc, {
        startY: y,
        head: [['Stakeholder group', 'Basis for representation']],
        body: silentSubmissions.map((s) => [s.stakeholder_group ?? '—', s.basis_for_representation]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    y = ensureSpace(doc, y, 60);
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Respondents by field of expertise', 36, y); doc.setFont(undefined, 'normal'); y += 16;
    const expertiseCounts = {};
    submissions.forEach((s) => (s.expertise_topics || []).forEach((t) => { expertiseCounts[t] = (expertiseCounts[t] ?? 0) + 1; }));
    const expertiseRows = Object.entries(expertiseCounts);
    if (expertiseRows.length) {
      autoTable(doc, { startY: y, head: [['Field of expertise', 'Respondents']], body: expertiseRows, ...TABLE_THEME });
      y = doc.lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(9); doc.text('No expertise declared yet.', 36, y); y += 20;
    }

    if (liveSessions.length) {
      y = ensureSpace(doc, y, 60);
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Live session dates and attendees', 36, y); doc.setFont(undefined, 'normal'); y += 16;
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
    }
    if (options.notes?.engagement) { const ny = ensureSpace(doc, (doc.lastAutoTable?.finalY ?? y) + 20, 20); doc.setFontSize(9); doc.text(options.notes.engagement, 36, ny, { maxWidth: pageW - 72 }); }
  }

  // ---- 4. Topics and results ----
  if (sections.results) {
    startSection();
    let y = sectionHeading(doc, 'Topics and results', 50);

    const scoredIros = scopedIros
      .map((iro) => ({ iro, score: aggregateIro(iro, thresholds).effectiveValue }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const bar = buildBarChartSvg(scoredIros);
    const barPng = await svgStringToPngDataUrl(bar.svg, bar.width, bar.height);
    const barW = pageW - 72, barH = (bar.height / bar.width) * barW;
    y = ensureSpace(doc, y, barH + 20);
    doc.addImage(barPng.dataUrl, 'PNG', 36, y, barW, barH);
    y += barH + 24;

    const impactPoints = scopedIros.filter((iro) => hasImpactAxis(iro.iroType) && iro.assessments.length).map((iro) => {
      const severities = iro.assessments.map((a) => assessmentSeverity(iro, a));
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!severities.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { topic: iro.topic, x: avg(likelihoods), y: avg(severities) };
    }).filter(Boolean);
    const financialPoints = scopedIros.filter((iro) => !hasImpactAxis(iro.iroType) && iro.assessments.length).map((iro) => {
      const magnitudes = iro.assessments.map((a) => a.magnitude).filter((v) => v !== null && v !== undefined);
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!magnitudes.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { topic: iro.topic, x: avg(likelihoods), y: avg(magnitudes) };
    }).filter(Boolean);

    y = ensureSpace(doc, y, 200);
    const impactHm = buildHeatmapSvg({ points: impactPoints, xLabel: 'Likelihood', yLabel: 'Severity', title: 'Impact heatmap' });
    const financialHm = buildHeatmapSvg({ points: financialPoints, xLabel: 'Likelihood', yLabel: 'Magnitude', title: 'Financial heatmap' });
    const [impactPng, financialPng] = await Promise.all([
      svgStringToPngDataUrl(impactHm.svg, impactHm.width, impactHm.height),
      svgStringToPngDataUrl(financialHm.svg, financialHm.width, financialHm.height),
    ]);
    const halfW = (pageW - 72 - 16) / 2, hmH = (impactHm.height / impactHm.width) * halfW;
    doc.addImage(impactPng.dataUrl, 'PNG', 36, y, halfW, hmH);
    doc.addImage(financialPng.dataUrl, 'PNG', 36 + halfW + 16, y, halfW, hmH);
    y += hmH + 24;

    const topicIds = [...new Set(scopedIros.map((i) => i.topic))];
    const topics = topicIds.map((id) => ({ id, ta: aggregateTopic(id, scopedIros, thresholds), meta: ESRS_TOPICS.find((t) => t.id === id) })).filter((t) => t.ta && t.ta.iros.some((i) => i.assessments.length > 0));
    y = ensureSpace(doc, y, 260);
    const matrix = buildMatrixSvg({ topics, impactTh: thresholds.impact, financialTh: thresholds.financial });
    const matrixPng = await svgStringToPngDataUrl(matrix.svg, matrix.width, matrix.height);
    const matrixW = pageW - 72, matrixH = (matrix.height / matrix.width) * matrixW;
    doc.addImage(matrixPng.dataUrl, 'PNG', 36, y, matrixW, matrixH);
    y += matrixH + 20;

    doc.addPage();
    y = 50;
    autoTable(doc, {
      startY: y,
      head: [['ESRS Topic', 'IRO', 'Type', 'Survey', 'Session', 'Calibrated/Calculated', 'Material']],
      body: scopedIros.map((iro) => {
        const agg = aggregateIro(iro, thresholds);
        return [iro.topic, iro.name, TYPE_LABEL[iro.iroType], fmt(agg.surveyAvg), fmt(agg.sessionAvg), fmt(agg.effectiveValue), agg.isMaterial ? 'Yes' : 'No'];
      }),
      ...TABLE_THEME,
    });
    if (options.notes?.results) { const ny = ensureSpace(doc, doc.lastAutoTable.finalY + 20, 20); doc.setFontSize(9); doc.text(options.notes.results, 36, ny, { maxWidth: pageW - 72 }); }
  }

  // ---- 5. Calibration and sign-off ----
  if (sections.calibration) {
    startSection();
    let y = sectionHeading(doc, 'Calibration and sign-off', 50);
    const allHistory = scopedIros.flatMap((iro) => (iro.calibrationHistory || []).map((h) => ({ iro, h })));
    if (allHistory.length) {
      autoTable(doc, {
        startY: y,
        head: [['IRO', 'Old value', 'New value', 'Reason', 'Changed by', 'Changed at']],
        body: allHistory.map(({ iro, h }) => [iro.name, fmt(h.from_value), fmt(h.to_value), h.notes ?? '', h.changed_by ?? '', new Date(h.changed_at).toLocaleString()]),
        ...TABLE_THEME,
      });
      y = doc.lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(9); doc.text('No calibration changes recorded.', 36, y); y += 20;
    }

    y = ensureSpace(doc, y, 60);
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Sign-off', 36, y); doc.setFont(undefined, 'normal'); y += 16;
    autoTable(doc, {
      startY: y,
      head: [['IRO', 'Signed off', 'Date']],
      body: scopedIros.map((iro) => [iro.name, iro.calibration?.reviewed_with_owner ? 'Yes' : 'No', iro.calibration?.reviewed_with_owner_at ? new Date(iro.calibration.reviewed_with_owner_at).toLocaleDateString() : '—']),
      ...TABLE_THEME,
    });
    y = doc.lastAutoTable.finalY + 20;

    if (options.approvalDetails?.approverName) {
      y = ensureSpace(doc, y, 60);
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Approval details', 36, y); doc.setFont(undefined, 'normal'); y += 16;
      doc.setFontSize(9);
      doc.text(`Approver: ${options.approvalDetails.approverName}${options.approvalDetails.approverRole ? ` (${options.approvalDetails.approverRole})` : ''}`, 36, y); y += 14;
      if (options.approvalDetails.approvalDate) { doc.text(`Date: ${options.approvalDetails.approvalDate}`, 36, y); y += 14; }
      if (options.approvalDetails.minutesReference) { doc.text(`Minutes reference: ${options.approvalDetails.minutesReference}`, 36, y); y += 14; }
    }
    if (options.notes?.calibration) { const ny = ensureSpace(doc, y + 10, 20); doc.setFontSize(9); doc.text(options.notes.calibration, 36, ny, { maxWidth: pageW - 72 }); }
  }

  // ---- 6. Appendix ----
  if (sections.appendix) {
    startSection();
    let y = sectionHeading(doc, 'Appendix', 50);
    const includeJustifications = options.justifications !== 'excluded';
    if (includeJustifications) {
      const flaggedTopicIds = options.justifications === 'flagged'
        ? new Set(scopedIros.filter((iro) => { const agg = aggregateIro(iro, thresholds); return agg.discrepancy || agg.overrideTriggered; }).map((i) => i.id))
        : null;
      const ratingRows = ratings.filter((r) => r.justification && (!flaggedTopicIds || flaggedTopicIds.has(r.iro_id)));
      const iroNameById = new Map(iros.map((i) => [i.id, i.name]));
      if (ratingRows.length) {
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
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text("Experts' overall comments", 36, y); doc.setFont(undefined, 'normal'); y += 16;
      autoTable(doc, {
        startY: y,
        head: [['Source', 'Stakeholder group', 'Comment']],
        body: comments.map((s) => [TYPE_LABEL[s.source] ?? s.source, s.stakeholder_group ?? '—', s.overall_comment]),
        ...TABLE_THEME,
      });
    }
    if (options.notes?.appendix) { const ny = ensureSpace(doc, (doc.lastAutoTable?.finalY ?? y) + 20, 20); doc.setFontSize(9); doc.text(options.notes.appendix, 36, ny, { maxWidth: pageW - 72 }); }
  }

  addFooter(doc, { cycleLabel, esrsLabel, provisional: !isFinal });
  return doc;
}
