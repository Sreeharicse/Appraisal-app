import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';
import Avatar from '../../components/Avatar';
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

const ROLE_BADGE = {
    admin: 'badge-purple',
    hr: 'badge-purple',
    manager: 'badge-blue',
    employee: 'badge-gray'
};

/* ═══════════════════════════════════════════════════════════ */
export default function Employees() {
    const { currentUser, users, addUser, updateUser, deleteUser, refreshData, departments, designations, questionSets, cycles, selfReviews, employeeOverrides, saveEmployeeOverride, deleteEmployeeOverride } = useApp();
    const isManager = currentUser.role === 'manager';

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', role: 'employee', designation: '', department: '', managerId: '' });
    const [overrideForm, setOverrideForm] = useState({ cycleId: '', questionSetId: '' });
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: string }

    const profileReviewStarted = editing && selfReviews.some(r => 
        String(r.employeeId) === String(editing.id) && 
        (r.status === 'draft' || r.status === 'submitted')
    );

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const { instance, accounts } = useMsal();
    const [fetchState, setFetchState] = useState('idle'); // idle | loading | success | error
    const [fetchError, setFetchError] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);

    const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');
    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase()) ||
        u.designation?.toLowerCase().includes(search.toLowerCase())
    );

    const resetModal = () => {
        setFetchState('idle');
        setFetchError('');
        setProfilePhoto(null);
    };

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', email: '', role: 'employee', designation: '', department: '', managerId: '' });
        resetModal();
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        setForm({ name: u.name, email: u.email, role: u.role, designation: u.designation || '', department: u.department || '', managerId: u.managerId || '' });
        
        // Preselect common question set if available
        const commonSet = questionSets.find(qs => qs.isCommon);
        setOverrideForm({ cycleId: '', questionSetId: commonSet ? commonSet.id : '' });
        
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
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_W = 150, MAX_H = 150;
                            let w = img.width, h = img.height;
                            if (w > h) { if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; } }
                            else { if (h > MAX_H) { w *= MAX_H / h; h = MAX_H; } }
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            setProfilePhoto(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(blob);
                }
            } catch (_) { /* photo is optional */ }

            setForm(p => ({
                ...p,
                name: userData.displayName || p.name,
                department: userData.department || p.department,
                designation: userData.jobTitle || p.designation,
            }));
            setFetchState('success');
        } catch (err) {
            setFetchError(err.message || 'Failed to fetch. Check permissions.');
            setFetchState('error');
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.email) return;
        const fallbackInitials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const avatar = profilePhoto || (editing && editing.avatar?.startsWith('data:image') ? editing.avatar : fallbackInitials);
        if (editing) {
            const result = await updateUser(editing.id, { ...form, avatar });
            if (result?.success) {
                showToast('success', 'Employee updated successfully in Supabase.');
                await refreshData();
            } else {
                showToast('error', `Supabase update failed: ${result?.error || 'Permission denied. Check HR RLS policy.'}`);
            }
        } else {
            await addUser({ ...form, avatar });
            showToast('success', 'Employee added successfully.');
            await refreshData();
        }
        setShowModal(false);
        resetModal();
    };

    const handleAddOverride = async () => {
        if (!editing || !overrideForm.cycleId || !overrideForm.questionSetId) return;
        const res = await saveEmployeeOverride(editing.id, overrideForm.cycleId, overrideForm.questionSetId);
        if (res.success) {
            setOverrideForm({ cycleId: '', questionSetId: '' });
        } else {
            showToast('error', `Failed to save: ${res.error}`);
        }
    };

    const handleRemoveOverride = async (cycleId) => {
        if (!editing) return;
        const res = await deleteEmployeeOverride(editing.id, cycleId);
        if (!res.success) showToast('error', `Failed to remove: ${res.error}`);
    };

    const currentEmployeeOverrides = editing ? employeeOverrides.filter(o => String(o.employeeId) === String(editing.id)) : [];


    return (
        <div>
            {/* Spin keyframe */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
                    padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    color: toast.type === 'success' ? '#10b981' : '#ef4444',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    maxWidth: '420px',
                    animation: 'slideIn 0.3s ease',
                }}
                >
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

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
                            <th>Access Level</th>
                            <th>Job Title</th>
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
                                            <Avatar avatarData={u.avatar} name={u.name} size={32} />
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                        </div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                                    </td>
                                    <td>
                                        {u.designation ? <span style={{ color: 'var(--text-primary)' }}>{u.designation}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td>{u.department || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
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
                                <Avatar
                                    avatarData={profilePhoto || (editing ? editing.avatar : null) || form.name}
                                    name={form.name}
                                    size={44}
                                    editable={true}
                                    onUpload={(base64) => setProfilePhoto(base64)}
                                    style={{ boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}
                                />
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

                            {/* ── Edit mode: read-only email field ── */}
                            {editing && (
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        value={form.email}
                                        readOnly
                                        style={{ color: 'var(--text-muted)', cursor: 'not-allowed', background: 'transparent' }}
                                    />
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
                                    <label className="form-label">Job Title / Designation</label>
                                    <select 
                                        className="form-select" 
                                        value={form.designation}
                                        onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                                    >
                                        <option value="">-- Select Title --</option>
                                        {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    {profileReviewStarted && (
                                        <div style={{ 
                                            fontSize: '11px', 
                                            color: 'var(--blue)', 
                                            marginTop: '6px', 
                                            fontWeight: 600, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '4px',
                                            padding: '4px 8px',
                                            background: 'rgba(59, 130, 246, 0.05)',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(59, 130, 246, 0.1)'
                                        }}>
                                            <Icons.Info style={{ width: 14, height: 14 }} /> 
                                            Designation updated. Question Set remains unchanged as review has already started.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Row 2: Department + Role ── */}
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select className="form-select" value={form.department}
                                        onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                                        <option value="">-- Select Department --</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">System Access Level</label>
                                    <select className="form-select" value={form.role}
                                        onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="hr">HR Admin</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            {/* ── Row 3: Reporting Manager ── */}
                            <div className="form-group">
                                <label className="form-label">Reporting Manager</label>
                                <select className="form-select" value={form.managerId}
                                    onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}>
                                    <option value="">None</option>
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            {/* ── Cycle-Specific Question Set Overrides (only for existing employees) ── */}
                            {editing && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    marginTop: '4px',
                                }}>
                                    <h4 style={{
                                        margin: '0 0 12px 0',
                                        fontSize: '13px',
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <Icons.Cycles style={{ width: 14, height: 14 }} /> Cycle-Specific Question Set
                                    </h4>

                                    {/* Existing override list */}
                                    {currentEmployeeOverrides.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                            {currentEmployeeOverrides.map(override => {
                                                const c = cycles.find(cy => cy.id === override.cycleId);
                                                const q = questionSets.find(qs => qs.id === override.questionSetId);
                                                
                                                // Check if a review has already started for this cycle
                                                const reviewStarted = selfReviews.some(r => 
                                                    String(r.employeeId) === String(editing.id) && 
                                                    String(r.cycleId) === String(override.cycleId) && 
                                                    (r.status === 'draft' || r.status === 'submitted')
                                                );
                                                
                                                const isCycleClosed = c?.status === 'closed';

                                                return (
                                                    <div key={override.cycleId} style={{ marginBottom: '8px' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            background: 'var(--bg-card)',
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)'
                                                        }}>
                                                            <div style={{ fontSize: '13px' }}>
                                                                <strong style={{ color: 'var(--blue)' }}>{c?.name || 'Unknown Cycle'}</strong>
                                                                <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                                                                <span style={{ color: 'var(--text-secondary)' }}>{q?.name || 'Unknown Set'}</span>
                                                            </div>
                                                            {!reviewStarted && !isCycleClosed && (
                                                                <button
                                                                    className="btn btn-sm"
                                                                    style={{ padding: '4px', background: 'transparent', color: 'var(--red)', border: 'none', cursor: 'pointer' }}
                                                                    onClick={() => handleRemoveOverride(override.cycleId)}
                                                                    title="Remove this override"
                                                                >
                                                                    <Icons.Trash style={{ width: 14, height: 14 }} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {(reviewStarted || isCycleClosed) && (
                                                            <div style={{ 
                                                                fontSize: '11px', 
                                                                color: '#ef4444', 
                                                                marginTop: '4px', 
                                                                paddingLeft: '4px',
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                <AlertCircle /> {isCycleClosed ? 'Question Set cannot be changed for closed cycles' : 'Question Set cannot be changed once review is started'}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Add new override */}
                                    {(() => {
                                        const activeCycle = cycles.find(c => c.status === 'active');
                                        if (!activeCycle) return <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No active cycle available.</div>;
                                        
                                        const hasOverride = currentEmployeeOverrides.some(o => o.cycleId === activeCycle.id);
                                        const reviewStarted = selfReviews.some(r => 
                                            String(r.employeeId) === String(editing.id) && 
                                            String(r.cycleId) === String(activeCycle.id) && 
                                            (r.status === 'draft' || r.status === 'submitted')
                                        );

                                        if (hasOverride) return null; // Already assigned

                                        return (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginTop: currentEmployeeOverrides.length > 0 ? '12px' : '0' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Active Cycle</label>
                                                    <div style={{
                                                        height: '36px',
                                                        fontSize: '13px',
                                                        background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0 12px',
                                                        color: 'var(--text-primary)',
                                                        fontWeight: 600,
                                                        opacity: reviewStarted ? 0.6 : 1
                                                    }}>
                                                        {activeCycle.name}
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Question Set</label>
                                                    <select
                                                        className="form-select"
                                                        style={{ height: '36px', fontSize: '13px' }}
                                                        value={overrideForm.questionSetId}
                                                        onChange={e => setOverrideForm(p => ({ ...p, cycleId: activeCycle.id, questionSetId: e.target.value }))}
                                                        disabled={reviewStarted}
                                                    >
                                                        <option value="">-- Choose Set --</option>
                                                        {questionSets.map(qs => <option key={qs.id} value={qs.id}>{qs.name}</option>)}
                                                    </select>
                                                </div>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ height: '36px', padding: '0 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                                                    onClick={() => {
                                                        const activeCycle = cycles.find(c => c.status === 'active');
                                                        if (!editing || !activeCycle || !overrideForm.questionSetId) return;
                                                        saveEmployeeOverride(editing.id, activeCycle.id, overrideForm.questionSetId).then(res => {
                                                            if (res.success) {
                                                                setOverrideForm({ cycleId: '', questionSetId: '' });
                                                            } else {
                                                                showToast('error', `Failed to save: ${res.error}`);
                                                            }
                                                        });
                                                    }}
                                                    disabled={reviewStarted || !overrideForm.questionSetId}
                                                >
                                                    + Add
                                                </button>
                                            </div>
                                        );
                                    })()}
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Overrides take priority. All other cycles fall back to Job Title defaults.
                                    </div>
                                </div>
                            )}
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
