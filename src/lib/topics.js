export const ESRS_TOPICS = [
  { id: 'E1', cat: 'E', name: 'E1 · Climate change' },
  { id: 'E2', cat: 'E', name: 'E2 · Pollution' },
  { id: 'E3', cat: 'E', name: 'E3 · Water and marine resources' },
  { id: 'E4', cat: 'E', name: 'E4 · Biodiversity and ecosystems' },
  { id: 'E5', cat: 'E', name: 'E5 · Resource use and circular economy' },
  { id: 'S1', cat: 'S', name: 'S1 · Own workforce' },
  { id: 'S2', cat: 'S', name: 'S2 · Workers in the value chain' },
  { id: 'S3', cat: 'S', name: 'S3 · Affected communities' },
  { id: 'S4', cat: 'S', name: 'S4 · Consumers and end-users' },
  { id: 'G1', cat: 'G', name: 'G1 · Business conduct' },
];

// The actual EFRAG disclosure-requirement sub-topics per standard, so IRO
// setup can target e.g. "E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions"
// instead of stopping at the top-level topic.
export const ESRS_SUBTOPICS = {
  E1: [
    'E1-1 Transition plan for climate change mitigation',
    'E1-2 Policies related to climate change mitigation and adaptation',
    'E1-3 Actions and resources in relation to climate change policies',
    'E1-4 Targets related to climate change mitigation and adaptation',
    'E1-5 Energy consumption and mix',
    'E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions',
    'E1-7 GHG removals and GHG mitigation projects financed through carbon credits',
    'E1-8 Internal carbon pricing',
    'E1-9 Anticipated financial effects from material physical and transition risks and potential climate-related opportunities',
  ],
  E2: [
    'E2-1 Policies related to pollution',
    'E2-2 Actions and resources related to pollution',
    'E2-3 Targets related to pollution',
    'E2-4 Pollution of air, water and soil',
    'E2-5 Substances of concern and substances of very high concern',
    'E2-6 Anticipated financial effects from pollution-related impacts, risks and opportunities',
  ],
  E3: [
    'E3-1 Policies related to water and marine resources',
    'E3-2 Actions and resources related to water and marine resources',
    'E3-3 Targets related to water and marine resources',
    'E3-4 Water consumption',
    'E3-5 Anticipated financial effects from water and marine resources-related impacts, risks and opportunities',
  ],
  E4: [
    'E4-1 Transition plan and consideration of biodiversity and ecosystems in strategy and business model',
    'E4-2 Policies related to biodiversity and ecosystems',
    'E4-3 Actions and resources related to biodiversity and ecosystems',
    'E4-4 Targets related to biodiversity and ecosystems',
    'E4-5 Impact metrics related to biodiversity and ecosystems change',
    'E4-6 Anticipated financial effects from biodiversity and ecosystems-related impacts, risks and opportunities',
  ],
  E5: [
    'E5-1 Policies related to resource use and circular economy',
    'E5-2 Actions and resources related to resource use and circular economy',
    'E5-3 Targets related to resource use and circular economy',
    'E5-4 Resource inflows',
    'E5-5 Resource outflows',
    'E5-6 Anticipated financial effects from resource use and circular economy-related impacts, risks and opportunities',
  ],
  S1: [
    'S1-1 Policies related to own workforce',
    'S1-2 Processes for engaging with own workforce and workers\u2019 representatives about impacts',
    'S1-3 Processes to remediate negative impacts and channels for own workforce to raise concerns',
    'S1-4 Taking action on material impacts, and approaches to managing material risks and opportunities',
    'S1-5 Targets related to managing material impacts, risks, and opportunities',
    'S1-6 Characteristics of the undertaking\u2019s employees',
    'S1-7 Characteristics of non-employee workers in the undertaking\u2019s own workforce',
    'S1-8 Collective bargaining coverage and social dialogue',
    'S1-9 Diversity metrics',
    'S1-10 Adequate wages',
    'S1-11 Social protection',
    'S1-12 Persons with disabilities',
    'S1-13 Training and skills development metrics',
    'S1-14 Health and safety metrics',
    'S1-15 Work-life balance metrics',
    'S1-16 Remuneration metrics (pay gap and total remuneration)',
    'S1-17 Incidents, complaints and severe human rights impacts',
  ],
  S2: [
    'S2-1 Policies related to value chain workers',
    'S2-2 Processes for engaging with value chain workers about impacts',
    'S2-3 Processes to remediate negative impacts and channels for value chain workers to raise concerns',
    'S2-4 Taking action on material impacts, and approaches to managing material risks and opportunities',
    'S2-5 Targets related to managing material impacts, risks, and opportunities',
  ],
  S3: [
    'S3-1 Policies related to affected communities',
    'S3-2 Processes for engaging with affected communities about impacts',
    'S3-3 Processes to remediate negative impacts and channels for affected communities to raise concerns',
    'S3-4 Taking action on material impacts, and approaches to managing material risks and opportunities',
    'S3-5 Targets related to managing material impacts, risks, and opportunities',
  ],
  S4: [
    'S4-1 Policies related to consumers and end-users',
    'S4-2 Processes for engaging with consumers and end-users about impacts',
    'S4-3 Processes to remediate negative impacts and channels for consumers and end-users to raise concerns',
    'S4-4 Taking action on material impacts, and approaches to managing material risks and opportunities',
    'S4-5 Targets related to managing material impacts, risks, and opportunities',
  ],
  G1: [
    'G1-1 Business conduct policies and corporate culture',
    'G1-2 Management of relationships with suppliers',
    'G1-3 Prevention and detection of corruption and bribery',
    'G1-4 Confirmed incidents of corruption or bribery',
    'G1-5 Political influence and lobbying activities',
    'G1-6 Payment practices',
  ],
};

export const TYPE_LABEL = {
  neg_impact: 'Negative impact',
  pos_impact: 'Positive impact',
  risk: 'Risk',
  opportunity: 'Opportunity',
};

// Curated palette — Impact-type IROs (positive or negative) are green,
// Financial-type IROs (risk or opportunity) are blue. Polarity within each
// group is distinguished by label text, not a separate hue.
export const TYPE_COLOR = {
  pos_impact: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
  neg_impact: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
  risk:       { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
  opportunity:{ text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
};

// ESRS pillar colors: Environmental = green, Social = yellow/amber,
// Governance = blue — per explicit direction, reusing the same palette.
export const PILLAR_COLOR = {
  E: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
  S: { text: '#D79A4C', bg: 'rgba(215,154,76,0.16)' },
  G: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
};

export const MATERIAL_BADGE = { text: '#D79A4C', bg: 'rgba(215,154,76,0.16)' };

// Used by ResultsScreen.jsx/CalibrationTab.jsx (pre-existing, not a prototype
// screen) — not part of reference-prototype/'s own lib/topics.js.
export function pillarFor(esrsTopicId) {
  return ESRS_TOPICS.find((t) => t.id === esrsTopicId)?.cat ?? 'E';
}
