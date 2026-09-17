import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------------
// Stakeholders — the master map (stakeholder_groups + stakeholder_members).
// Loaded/saved as one nested array, matching the shape StakeholderModule.jsx
// already expects: [{ id, name, perspectives, members: [{ id, name, title,
// company, email, pillars, expertise }] }]. "title" in the app === "role" in
// the DB (schema-draft.md's column name; the reference prototype's UI copy
// calls it "Role" but the JS field has always been `title`).
// ---------------------------------------------------------------------------

export async function loadStakeholderMap() {
  const { data: groups, error: gErr } = await supabase
    .from('stakeholder_groups')
    .select('id, name, perspectives, order')
    .order('order', { ascending: true });
  if (gErr) throw gErr;

  const { data: members, error: mErr } = await supabase
    .from('stakeholder_members')
    .select('id, group_id, name, role, company, email, pillars, expertise')
    .order('created_at', { ascending: true });
  if (mErr) throw mErr;

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    perspectives: g.perspectives || [],
    members: members
      .filter((m) => m.group_id === g.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        title: m.role,
        company: m.company || '',
        email: m.email || '',
        pillars: m.pillars || [],
        expertise: m.expertise || '',
      })),
  }));
}

// Full-collection sync: upserts everything present in `map`, deletes
// whatever's no longer there. Simple and correct at this tool's scale
// (dozens of stakeholders, not thousands) — avoids tracking a separate
// prev/next diff in the caller.
export async function saveStakeholderMap(map) {
  const groupRows = map.map((g, index) => ({
    id: g.id,
    name: g.name,
    perspectives: g.perspectives,
    order: index,
  }));
  const memberRows = map.flatMap((g) =>
    g.members.map((m) => ({
      id: m.id,
      group_id: g.id,
      name: m.name,
      role: m.title,
      company: m.company || null,
      email: m.email || null,
      pillars: m.pillars || [],
      expertise: m.expertise || null,
    }))
  );

  if (groupRows.length) {
    const { error } = await supabase.from('stakeholder_groups').upsert(groupRows);
    if (error) throw error;
  }
  if (memberRows.length) {
    const { error } = await supabase.from('stakeholder_members').upsert(memberRows);
    if (error) throw error;
  }

  const groupIds = groupRows.map((g) => g.id);
  const { error: delGroupsErr } = groupIds.length
    ? await supabase.from('stakeholder_groups').delete().not('id', 'in', `(${groupIds.join(',')})`)
    : await supabase.from('stakeholder_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delGroupsErr) throw delGroupsErr;

  const memberIds = memberRows.map((m) => m.id);
  const { error: delMembersErr } = memberIds.length
    ? await supabase.from('stakeholder_members').delete().not('id', 'in', `(${memberIds.join(',')})`)
    : await supabase.from('stakeholder_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delMembersErr) throw delMembersErr;
}

// ---------------------------------------------------------------------------
// Topics — the master IRO library (topic_library). Same full-sync pattern.
// JS field names per TopicsModule.jsx: iroType, esrsTopicId, subtopic (not
// esrsSubtopic — matches the component exactly, not the DB column name),
// shortTitle, description, actual, valueChain, referenceCode, signedOffBy,
// signedOffAt (a JS ms timestamp, converted to/from the DB's timestamptz).
// ---------------------------------------------------------------------------

export async function loadTopicLibrary() {
  const { data: rows, error } = await supabase
    .from('topic_library')
    .select('id, iro_type, esrs_topic_id, esrs_subtopic, short_title, description, actual, value_chain, reference_code, signed_off_by, signed_off_at, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return rows.map((r) => ({
    id: r.id,
    iroType: r.iro_type,
    esrsTopicId: r.esrs_topic_id,
    subtopic: r.esrs_subtopic || '',
    shortTitle: r.short_title,
    description: r.description || '',
    actual: r.actual,
    valueChain: r.value_chain,
    referenceCode: r.reference_code,
    signedOffBy: r.signed_off_by,
    signedOffAt: r.signed_off_at ? new Date(r.signed_off_at).getTime() : null,
  }));
}

export async function saveTopicLibrary(list) {
  const rows = list.map((t) => ({
    id: t.id,
    iro_type: t.iroType,
    esrs_topic_id: t.esrsTopicId,
    esrs_subtopic: t.subtopic || null,
    short_title: t.shortTitle,
    description: t.description || null,
    actual: t.actual,
    value_chain: t.valueChain,
    reference_code: t.referenceCode,
    signed_off_by: t.signedOffBy || null,
    signed_off_at: t.signedOffAt ? new Date(t.signedOffAt).toISOString() : null,
  }));

  if (rows.length) {
    const { error } = await supabase.from('topic_library').upsert(rows);
    if (error) throw error;
  }

  const ids = rows.map((r) => r.id);
  const { error: delErr } = ids.length
    ? await supabase.from('topic_library').delete().not('id', 'in', `(${ids.join(',')})`)
    : await supabase.from('topic_library').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw delErr;
}
