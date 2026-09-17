import Papa from 'papaparse';

export const REQUIRED_COLUMNS = ['Topic', 'Actual or Potential', 'IRO Name', 'IRO Type'];
export const ALL_COLUMNS = ['Topic', 'Actual or Potential', 'IRO Name', 'Description', 'IRO Type'];

const TYPE_MAP = {
  'negative impact': 'neg_impact',
  'positive impact': 'pos_impact',
  'risk': 'risk',
  'opportunity': 'opportunity',
};

export const EXAMPLE_CSV_ROWS = [
  { Topic: 'Climate Change Mitigation', 'Actual or Potential': 'Actual', 'IRO Name': 'Stationary combustion GHG', Description: 'Direct Scope 1 GHG emissions from stationary combustion in factory furnaces', 'IRO Type': 'Negative Impact' },
  { Topic: 'Biodiversity and Ecosystems', 'Actual or Potential': 'Actual', 'IRO Name': 'Local biodiversity restoration programme', Description: 'Habitat restoration around quarry sites', 'IRO Type': 'Positive Impact' },
  { Topic: 'Climate Change', 'Actual or Potential': 'Potential', 'IRO Name': 'Carbon pricing regulations', Description: 'Transition risk from evolving carbon pricing regulations (EU ETS)', 'IRO Type': 'Risk' },
];

export function generateExampleCsv() {
  return Papa.unparse(EXAMPLE_CSV_ROWS, { columns: ALL_COLUMNS, delimiter: ';' });
}

// Flattened topic + sub-topic name list for matching real-world files where
// "Topic" is a sub-topic name (e.g. "Climate Change Mitigation"), not an
// ESRS AR16 top-level ID.
const SUBTOPIC_NAMES = {
  E1: ['Climate Change', 'Climate Change Adaptation', 'Climate Change Mitigation', 'Energy', 'Energy Transition'],
  E2: ['Pollution', 'Pollution Of Air', 'Pollution Of Water', 'Pollution Of Soil'],
  E3: ['Water', 'Marine Resources', 'Water And Marine Resources'],
  E4: ['Biodiversity', 'Biodiversity And Ecosystems'],
  E5: ['Resource Use', 'Circular Economy', 'Resource Use And Circular Economy'],
  S1: ['Own Workforce', 'Working Conditions'],
  S2: ['Workers In The Value Chain'],
  S3: ['Affected Communities'],
  S4: ['Consumers', 'Consumers And End-Users'],
  G1: ['Business Conduct', 'Corporate Culture'],
};

function matchTopic(rawTopic, esrsTopics) {
  const needle = String(rawTopic).trim().toLowerCase();
  const direct = esrsTopics.find((t) => t.id.toLowerCase() === needle || t.name.toLowerCase().includes(needle));
  if (direct) return direct;
  for (const [topicId, names] of Object.entries(SUBTOPIC_NAMES)) {
    const hit = names.some((n) => n.toLowerCase() === needle || needle.includes(n.toLowerCase()) || n.toLowerCase().includes(needle));
    if (hit) return esrsTopics.find((t) => t.id === topicId);
  }
  return null;
}

export function parseCsv(text, esrsTopics) {
  const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, delimiter: ';' });
  const errors = [];
  const iros = [];

  result.data.forEach((row, idx) => {
    const rowNum = idx + 2;
    const missing = REQUIRED_COLUMNS.filter((c) => !row[c] || String(row[c]).trim() === '');
    if (missing.length) {
      errors.push({ row: rowNum, message: `Missing required column(s): ${missing.join(', ')}` });
      return;
    }

    const typeKey = String(row['IRO Type']).trim().toLowerCase();
    const iroType = TYPE_MAP[typeKey];
    if (!iroType) {
      errors.push({ row: rowNum, message: `IRO Type "${row['IRO Type']}" is not recognized (expected Negative Impact / Positive Impact / Risk / Opportunity)` });
      return;
    }

    const actualKey = String(row['Actual or Potential']).trim().toLowerCase();
    if (actualKey !== 'actual' && actualKey !== 'potential') {
      errors.push({ row: rowNum, message: `"Actual or Potential" must be "Actual" or "Potential", got "${row['Actual or Potential']}"` });
      return;
    }

    const topicMatch = matchTopic(row.Topic, esrsTopics);
    if (!topicMatch) {
      errors.push({ row: rowNum, message: `Topic "${row.Topic}" not found in ESRS taxonomy — flagged for manual assignment`, flagged: true, raw: row });
    }

    iros.push({
      id: `${row.Topic}::${row['IRO Name']}::${idx}`,
      topic: topicMatch ? topicMatch.id : row.Topic,
      subtopicRaw: row.Topic,
      name: row['IRO Name'],
      iroType,
      actual: actualKey === 'actual',
      description: row.Description || '',
      impactThreshold: 3.0,
      financialThreshold: 3.0,
      assessments: [],
    });
  });

  return { iros, errors };
}

// ---- Topic library CSV (Topics module) ----
// A distinct, richer format matching the master Topics library's fields —
// separate from the legacy per-assessment format above.

export const TOPIC_LIBRARY_COLUMNS = ['IRO Type', 'ESRS Topic', 'ESRS Sub-topic Code', 'Short Title', 'Description', 'Actual or Potential', 'Value Chain Location'];

const VALUE_CHAIN_MAP = {
  'own operations': 'own', 'own': 'own',
  'upstream': 'upstream', 'upstream / supply chain': 'upstream', 'supply chain': 'upstream',
  'downstream': 'downstream', 'downstream / product use & end-of-life': 'downstream', 'product use': 'downstream',
};

export function generateTopicLibraryExampleCsv(esrsSubtopics) {
  const rows = [
    { 'IRO Type': 'Negative Impact', 'ESRS Topic': 'E1', 'ESRS Sub-topic Code': 'E1-6', 'Short Title': 'Stationary combustion GHG', Description: 'Direct Scope 1 GHG emissions from stationary combustion in factory furnaces', 'Actual or Potential': 'Actual', 'Value Chain Location': 'Own operations' },
    { 'IRO Type': 'Risk', 'ESRS Topic': 'E1', 'ESRS Sub-topic Code': 'E1-9', 'Short Title': 'Carbon pricing exposure', Description: 'Transition risk from evolving carbon pricing regulations (EU ETS)', 'Actual or Potential': 'Potential', 'Value Chain Location': 'Own operations' },
    { 'IRO Type': 'Negative Impact', 'ESRS Topic': 'S1', 'ESRS Sub-topic Code': 'S1-14', 'Short Title': 'Workplace injury rate', Description: 'Occupational health and safety incidents at manufacturing sites', 'Actual or Potential': 'Actual', 'Value Chain Location': 'Own operations' },
  ];
  const noteRow = { 'IRO Type': '# Valid: Negative Impact / Positive Impact / Risk / Opportunity', 'ESRS Topic': `# One of: ${Object.keys(esrsSubtopics).join(', ')}`, 'ESRS Sub-topic Code': '# e.g. E1-6 — must match a real code for that topic', 'Short Title': '', Description: '', 'Actual or Potential': '# Actual / Potential', 'Value Chain Location': '# Own operations / Upstream / Downstream' };
  return Papa.unparse([noteRow, ...rows], { columns: TOPIC_LIBRARY_COLUMNS, delimiter: ';' });
}

export function parseTopicLibraryCsv(text, esrsTopics, esrsSubtopics) {
  const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, delimiter: ';' });
  const errors = [];
  const topics = [];

  result.data.forEach((row, idx) => {
    const rowNum = idx + 2;
    // Skip instruction/comment rows (first column starts with '#')
    if (String(row['IRO Type'] || '').trim().startsWith('#')) return;

    const missing = ['IRO Type', 'ESRS Topic', 'Short Title'].filter((c) => !row[c] || String(row[c]).trim() === '');
    if (missing.length) {
      errors.push({ row: rowNum, message: `Missing required column(s): ${missing.join(', ')}` });
      return;
    }

    const typeKey = String(row['IRO Type']).trim().toLowerCase();
    const iroType = TYPE_MAP[typeKey];
    if (!iroType) {
      errors.push({ row: rowNum, message: `IRO Type "${row['IRO Type']}" not recognized (expected Negative Impact / Positive Impact / Risk / Opportunity)` });
      return;
    }

    const esrsTopicId = String(row['ESRS Topic']).trim().toUpperCase();
    if (!esrsTopics.find((t) => t.id === esrsTopicId)) {
      errors.push({ row: rowNum, message: `ESRS Topic "${row['ESRS Topic']}" not recognized — expected one of E1–E5, S1–S4, G1` });
      return;
    }

    const subCode = String(row['ESRS Sub-topic Code'] || '').trim().toUpperCase();
    let subtopic = '';
    if (subCode) {
      const match = (esrsSubtopics[esrsTopicId] || []).find((s) => s.toUpperCase().startsWith(subCode));
      if (!match) {
        errors.push({ row: rowNum, message: `Sub-topic code "${row['ESRS Sub-topic Code']}" not found under ${esrsTopicId} — left blank, assign manually`, flagged: true });
      } else {
        subtopic = match;
      }
    }

    const actualKey = String(row['Actual or Potential'] || 'actual').trim().toLowerCase();
    const valueChainKey = String(row['Value Chain Location'] || 'own operations').trim().toLowerCase();

    topics.push({
      id: crypto.randomUUID(),
      iroType,
      esrsTopicId,
      subtopic,
      shortTitle: row['Short Title'],
      description: row.Description || '',
      actual: actualKey !== 'potential',
      valueChain: VALUE_CHAIN_MAP[valueChainKey] || 'own',
    });
  });

  return { topics, errors };
}

