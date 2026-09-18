// Ported from reference-prototype/src/lib/topics.js (trimmed to what the
// dashboard needs — the full ESRS sub-topic lists belong to the Topics
// admin module, not built yet).
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

export const TYPE_LABEL = {
  neg_impact: 'Negative impact',
  pos_impact: 'Positive impact',
  risk: 'Risk',
  opportunity: 'Opportunity',
};

export const TYPE_COLOR = {
  pos_impact: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
  neg_impact: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
  risk: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
  opportunity: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
};

// ESRS pillar colors: Environmental = green, Social = amber, Governance = blue.
export const PILLAR_COLOR = {
  E: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
  S: { text: '#D79A4C', bg: 'rgba(215,154,76,0.16)' },
  G: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
};

export const MATERIAL_BADGE = { text: '#D79A4C', bg: 'rgba(215,154,76,0.16)' };

export function pillarFor(esrsTopicId) {
  return ESRS_TOPICS.find((t) => t.id === esrsTopicId)?.cat ?? 'E';
}
