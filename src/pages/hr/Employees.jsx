import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../auth/msalConfig';

/* ─── Microsoft Logo SVG ──────────────────────────────────── */
const MsLogo = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
);

/* ─── Spinner ─────────────────────────────────────────────── */
const Spinner = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'spin 0.75s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

/* ─── Check Icon (small) ──────────────────────────────────── */
const CheckCircle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

/* ─── AlertCircle ─────────────────────────────────────────── */
const AlertCircle = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

/* ═══════════════════════════════════════════════════════════ */
export default function Employees() {
    const { currentUser, users, addUser, updateUser, deleteUser } = useApp();
    const isManager = currentUser.role === 'manager';

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', role: 'employee', department: '', managerId: '' });
    const [search, setSearch] = useState('');

    const { instance, accounts } = useMsal();
    const [fetchState, setFetchState] = useState('idle'); // idle | loading | success | error
    const [fetchError, setFetchError] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);

    const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');
    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase())
    );

    const resetModal = () => {
        setFetchState('idle');
        setFetchError('');
        setProfilePhoto(null);
    };

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', email: '', role: 'employee', department: '', managerId: '' });
        resetModal();
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        setForm({ name: u.name, email: u.email, role: u.role, department: u.department || '', managerId: u.managerId || '' });
        resetModal();
        setShowModal(true);
    };

    /* ── Microsoft Graph Fetch ── */
    const handleFetchFromMS = async () => {
        if (!form.email) return;
        setFetchState('loading');
        setFetchError('');
        try {
            let account = accounts[0];
            if (!account) {
                const res = await instance.loginPopup(loginRequest);
                account = res.account;
            }
            const tokenRes = await instance.acquireTokenSilent({ ...loginRequest, account }).catch(async err => {
                if (err.name === 'InteractionRequiredAuthError' || err.name === 'BrowserAuthError') {
                    return instance.acquireTokenPopup(loginRequest);
                }
                throw err;
            });

            /* User profile */
            const userRes = await fetch(`https://graph.microsoft.com/v1.0/users/${form.email}?$select=displayName,department,jobTitle,mail`, {
                headers: { Authorization: `Bearer ${tokenRes.accessToken}` }
            });

            if (!userRes.ok) {
                const errJson = await userRes.json().catch(() => ({}));
                throw new Error(errJson?.error?.message || `User not found (${userRes.status})`);
            }

            const userData = await userRes.json();

            /* Optional: profile photo */
            try {
                const photoRes = await fetch(`https://graph.microsoft.com/v1.0/users/${form.email}/photo/$value`, {
                    headers: { Authorization: `Bearer ${tokenRes.accessToken}` }
                });
                if (photoRes.ok) {
                    const blob = await photoRes.blob();
                    setProfilePhoto(URL.createObjectURL(blob));
                }
            } catch (_) { /* photo is optional */ }

            setForm(p => ({
                ...p,
                name: userData.displayName || p.name,
                department: userData.department || p.department,
            }));
            setFetchState('success');
        } catch (err) {
            setFetchError(err.message || 'Failed to fetch. Check permissions.');
            setFetchState('error');
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.email) return;
        const avatar = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        if (editing) await updateUser(editing.id, { ...form, avatar });
        else await addUser({ ...form, avatar });
        setShowModal(false);
        resetModal();
    };

    const ROLE_BADGE = { hr: 'badge-purple', manager: 'badge-blue', employee: 'badge-gray' };

    return (
        <div>
            {/* Spin keyframe */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <div className="section-header">
                <div>
                    <h2 className="section-title">Employee Management</h2>
                    <p className="section-subtitle">Manage all employees, departments, and reporting relationships</p>
                </div>
                {!isManager && (
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
                )}
            </div>

            {/* ── Table ── */}
            <div className="table-container">
                <div className="table-header">
                    <h3>All Users ({filtered.length})</h3>
                    <input className="form-input" style={{ width: '220px' }} placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Manager</th>
                            {!isManager && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => {
                            const mgr = managers.find(m => m.id === u.managerId);
                            return (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{u.avatar}</div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                        </div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                                    <td>{u.department || '—'}</td>
                                    <td>{mgr ? mgr.name : '—'}</td>
                                    {!isManager && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>
                                                    <Icons.Edit style={{ marginRight: '4px' }} /> Edit
                                                </button>
                                                <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if (window.confirm('Delete this user?')) deleteUser(u.id); }}>
                                                    <Icons.Trash />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ══════════════════════════════════════════════════════
                REDESIGNED MODAL
            ══════════════════════════════════════════════════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '560px' }}>

                        {/* Header */}
                        <div className="modal-header" style={{ padding: '20px 24px 16px', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Avatar preview */}
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '50%',
                                    background: 'var(--blue-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '16px', fontWeight: 700, color: 'white',
                                    overflow: 'hidden', flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(59,130,246,0.35)'
                                }}>
                                    {profilePhoto
                                        ? <img src={profilePhoto} style={{ width: '44px', height: '44px', objectFit: 'cover' }} alt="avatar" />
                                        : (form.name ? form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?')
                                    }
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                                        {editing ? 'Edit Employee' : 'Add New Employee'}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                                        {editing ? 'Update employee information' : 'Enter email to auto-fill from Microsoft'}
                                    </p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="modal-body" style={{ padding: '20px 24px' }}>

                            {/* ── STEP 1: Email Hero Field ── */}
                            {!editing && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '14px',
                                    padding: '16px',
                                    marginBottom: '20px',
                                }}>
                                    <label className="form-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MsLogo />
                                        <span>Work Email — auto-fill from Microsoft Entra ID</span>
                                    </label>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                className="form-input"
                                                type="email"
                                                placeholder="employee@company.com"
                                                value={form.email}
                                                onChange={e => {
                                                    setForm(p => ({ ...p, email: e.target.value }));
                                                    if (fetchState !== 'idle') setFetchState('idle');
                                                }}
                                                style={{
                                                    paddingRight: '36px',
                                                    borderColor: fetchState === 'success'
                                                        ? 'rgba(16,185,129,0.5)'
                                                        : fetchState === 'error'
                                                            ? 'rgba(239,68,68,0.5)'
                                                            : 'var(--border)',
                                                }}
                                            />
                                            {fetchState === 'success' && (
                                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                                    <CheckCircle />
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleFetchFromMS}
                                            disabled={!form.email || fetchState === 'loading'}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '7px',
                                                padding: '10px 16px', borderRadius: '10px',
                                                background: fetchState === 'loading'
                                                    ? 'rgba(59,130,246,0.15)'
                                                    : 'linear-gradient(135deg,#0078d4,#106ebe)',
                                                color: fetchState === 'loading' ? 'var(--text-muted)' : 'white',
                                                border: 'none', cursor: !form.email || fetchState === 'loading' ? 'not-allowed' : 'pointer',
                                                fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.2s',
                                                opacity: !form.email ? 0.5 : 1,
                                                boxShadow: fetchState !== 'loading' && form.email ? '0 4px 12px rgba(0,120,212,0.35)' : 'none',
                                            }}>
                                            {fetchState === 'loading' ? <Spinner /> : <MsLogo />}
                                            {fetchState === 'loading' ? 'Fetching…' : 'Fetch Details'}
                                        </button>
                                    </div>

                                    {/* Status messages */}
                                    {fetchState === 'success' && (
                                        <div style={{
                                            marginTop: '10px', padding: '8px 12px',
                                            background: 'rgba(16,185,129,0.08)', borderRadius: '8px',
                                            border: '1px solid rgba(16,185,129,0.2)',
                                            fontSize: '12px', color: '#10b981',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            <CheckCircle />
                                            Details fetched successfully from Microsoft Entra ID — review below
                                        </div>
                                    )}
                                    {fetchState === 'error' && (
                                        <div style={{
                                            marginTop: '10px', padding: '8px 12px',
                                            background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            fontSize: '12px', color: '#ef4444',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            <AlertCircle />
                                            {fetchError} — you can still fill in the fields manually
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Edit mode: plain email field ── */}
                            {editing && (
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.email}
                                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                                </div>
                            )}

                            {/* ── Row 1: Name + Department ── */}
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-input" placeholder="Display Name"
                                        value={form.name}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input className="form-input" placeholder="e.g. Engineering"
                                        value={form.department}
                                        onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
                                </div>
                            </div>

                            {/* ── Row 2: Role + Reporting Manager ── */}
                            <div className="form-grid" style={{ marginBottom: 0 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Role</label>
                                    <select className="form-select" value={form.role}
                                        onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="hr">HR Admin</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Reporting Manager</label>
                                    <select className="form-select" value={form.managerId}
                                        onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}>
                                        <option value="">None</option>
                                        {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setShowModal(false); resetModal(); }}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={handleSave}
                                disabled={!form.name || !form.email}>
                                <Icons.Save /> {editing ? 'Update Employee' : 'Add Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
