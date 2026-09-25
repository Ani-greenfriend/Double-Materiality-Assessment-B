import { useState } from 'react';
import { updateOwnProfile, uploadAvatar } from '../lib/data';

function accessDescription(me) {
  if (me.accessLevel === 'full') {
    if (me.isOwner) return 'Full access — Tool Owner. You can read and edit everything in this tool, and manage the team, including granting or revoking Admin.';
    if (me.isAdmin) return 'Full access — Admin. You can read and edit everything in this tool, and manage the team (Settings → Admin & Roles), except toggling another member’s Admin flag.';
    return 'Full access. You can read and edit everything in this tool. Team management (Settings → Admin & Roles) is for Tool Owner and Admin only.';
  }
  const grants = [];
  if (me.canSignoffTopics) grants.push('Topics');
  if (me.canSignoffResults) grants.push('Results');
  const grantText = grants.length ? `sign off ${grants.join(' and ')}` : 'no sign-off permission yet — ask your Admin to grant one';
  return `Sign-off only. Read-only everywhere you have access; you can ${grantText}. Dashboard and Report are not available to this access level.`;
}

export default function ProfileTab({ me, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateOwnProfile(me.id, { name });
      onChanged?.();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    setError('');
    try {
      await uploadAvatar(me.authUserId, me.id, file);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-[20px] font-semibold mb-1">Profile</h1>
      <p className="text-[12.5px] text-text-secondary mb-5">Your own details — visible to the rest of the team in Settings → Admin & Roles.</p>

      <div className="bg-surface rounded-2xl p-5 mb-5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1">ROLE</p>
          <p className="text-[14px] font-semibold">{me.roleTitle || '—'}</p>
        </div>
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1">EMAIL</p>
          <p className="text-[14px] font-semibold truncate" title={me.email}>{me.email}</p>
        </div>
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1">ADMIN</p>
          <p className="text-[14px] font-semibold" style={{ color: me.isAdmin ? '#5ED996' : undefined }}>{me.isAdmin ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-5 mb-6">
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-[22px] font-semibold shrink-0" style={{ background: '#4C6FFF', color: '#07070B' }}>
              {(me.name || me.email)[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <label className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5 border border-border-apus cursor-pointer inline-block">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleAvatarFile(e.target.files[0])} />
            </label>
            <p className="text-[10.5px] text-text-secondary mt-1.5">JPG or PNG. Visible to the whole team.</p>
          </div>
        </div>

        {error && <p className="text-[12px] text-badge-amber mb-3">{error}</p>}

        {editing ? (
          <form onSubmit={handleSave}>
            <div className="mb-3">
              <p className="text-[10.5px] text-text-secondary mb-1">NAME</p>
              <input
                required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-app-black border border-border-apus rounded-lg px-3 py-2 text-[13px] outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setName(me.name || ''); setError(''); }} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 border border-border-apus">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-3">
              <p className="text-[10.5px] text-text-secondary mb-1">NAME</p>
              <p className="text-[13.5px]">{me.name || '—'}</p>
            </div>
            <button onClick={() => setEditing(true)} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 border border-border-apus">
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl p-6">
        <div className="mb-4">
          <p className="text-[10.5px] text-text-secondary mb-1">MEMBER SINCE</p>
          <p className="text-[13.5px]">{me.createdAt ? new Date(me.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
        </div>
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1">ACCESS LEVEL</p>
          <p className="text-[13px] leading-relaxed">{accessDescription(me)}</p>
        </div>
      </div>
    </div>
  );
}
