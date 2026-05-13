import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
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

    /* ── Import / Bulk Upload State ── */
    const fileInputRef = useRef(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResults, setBulkResults] = useState(null); // { total, success, failed, skipped, errors[] }
    const [selectedFile, setSelectedFile] = useState(null);
    const [importMode, setImportMode] = useState('file'); // 'file' | 'manual'
    const [manualEmails, setManualEmails] = useState('');


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

    const isCircular = (targetManagerId, employeeId) => {
        if (!targetManagerId || !employeeId) return false;
        let currentId = targetManagerId;
        while (currentId) {
            if (currentId === employeeId) return true;
            const mgr = users.find(u => u.id === currentId);
            currentId = mgr ? mgr.managerId : null;
        }
        return false;
    };

    const availableManagers = users.filter(u => {
        if (u.id === editing?.id) return false;

        if (form.role === 'admin') {
            return u.role === 'admin';
        }

        return u.role === 'manager' || u.role === 'admin';
    });
    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase()) ||
        u.designation?.toLowerCase().includes(search.toLowerCase())
    );



    /* ── Open Import Modal ── */
    const openImportModal = () => {
        setSelectedFile(null);
        setBulkResults(null);
        setBulkUploading(false);
        setImportMode('file');
        setManualEmails('');
        setShowImportModal(true);
    };


    /* ── Drag & Drop Handlers ── */
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) {
            setSelectedFile(file);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
        e.target.value = '';
    };

    /* ── Process the Selected File ── */
    const processImportFile = async () => {
        if (!selectedFile) return;

        setBulkUploading(true);
        setBulkResults(null);

        try {
            const bstr = await selectedFile.arrayBuffer();
            const wb = XLSX.read(bstr, { type: 'array' });
            const wsName = wb.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wsName]);

            if (!rows.length) {
                setBulkResults({ total: 0, success: 0, failed: 0, skipped: 0, errors: [{ row: 0, msg: 'The spreadsheet is empty or has no readable data rows.' }] });
                setBulkUploading(false);
                return;
            }

            let successCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            const errors = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2; // Excel rows are 1-indexed + header
                const name = (row['Full Name'] || row['Name'] || row['name'] || row['full_name'] || '').toString().trim();
                const email = (row['Email'] || row['email'] || row['Email Address'] || '').toString().trim().toLowerCase();
                const role = (row['Role'] || row['role'] || 'employee').toString().trim().toLowerCase();
                const department = (row['Department'] || row['department'] || '').toString().trim();
                const designation = (row['Designation'] || row['designation'] || row['Job Title'] || row['Title'] || '').toString().trim();
                const managerEmail = (row['Manager Email'] || row['manager_email'] || row['Manager'] || '').toString().trim().toLowerCase();

                // Validation
                if (!email) {
                    errors.push({ row: rowNum, msg: `Missing email` });
                    failedCount++;
                    continue;
                }
                if (!name) {
                    errors.push({ row: rowNum, msg: `Missing name for ${email}` });
                    failedCount++;
                    continue;
                }
                const validRoles = ['employee', 'manager', 'hr', 'admin'];
                const normalizedRole = validRoles.includes(role) ? role : 'employee';

                // Check duplicate — skip if email already exists in system
                const existing = users.find(u => u.email?.toLowerCase() === email);
                if (existing) {
                    skippedCount++;
                    errors.push({ row: rowNum, msg: `Skipped — ${email} already exists`, type: 'skip' });
                    continue;
                }

                // Resolve manager
                let managerId = '';
                if (managerEmail) {
                    const mgr = users.find(u => u.email?.toLowerCase() === managerEmail);
                    if (mgr) managerId = mgr.id;
                }

                try {
                    await addUser({
                        name,
                        email,
                        role: normalizedRole,
                        department,
                        designation,
                        managerId,
                        avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
                    });
                    successCount++;
                } catch (err) {
                    failedCount++;
                    errors.push({ row: rowNum, msg: `Failed to add ${email}: ${err.message}` });
                }
            }

            setBulkResults({ total: rows.length, success: successCount, failed: failedCount, skipped: skippedCount, errors });
            if (successCount > 0) await refreshData();
        } catch (err) {
            setBulkResults({ total: 0, success: 0, failed: 1, skipped: 0, errors: [{ row: 0, msg: `File parse error: ${err.message}` }] });
        } finally {
            setBulkUploading(false);
            setSelectedFile(null);
        }
    };

    const handleManualImport = async () => {
        if (!manualEmails.trim()) return;

        setBulkUploading(true);
        setBulkResults(null);

        // Split by comma, newline, or semicolon and filter empty/invalid strings
        const emails = manualEmails
            .split(/[,\n;]+/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e && e.includes('@'));

        if (emails.length === 0) {
            setBulkResults({ total: 0, success: 0, failed: 1, skipped: 0, errors: [{ row: 0, msg: 'No valid emails found.' }] });
            setBulkUploading(false);
            return;
        }

        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const displayId = i + 1;

            // Check duplicate
            const existing = users.find(u => u.email?.toLowerCase() === email);
            if (existing) {
                skippedCount++;
                errors.push({ row: displayId, msg: `Skipped — ${email} already exists`, type: 'skip' });
                continue;
            }

            try {
                // For manual add by email, we use the part before @ as the name initially
                const name = email.split('@')[0].split(/[._-]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                
                await addUser({
                    name,
                    email,
                    role: 'employee',
                    department: '',
                    designation: '',
                    managerId: '',
                    avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
                });
                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ row: displayId, msg: `Failed to add ${email}: ${err.message}` });
            }
        }

        setBulkResults({ total: emails.length, success: successCount, failed: failedCount, skipped: skippedCount, errors });
        if (successCount > 0) await refreshData();
        setBulkUploading(false);
    };


    const resetModal = () => {
        setFetchState('idle');
        setFetchError('');
        setProfilePhoto(null);
    };

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', email: '', role: 'employee', designation: '', department: '', managerId: '' });
        setImportMode('single'); // 'single' | 'manual'
        setManualEmails('');
        setBulkResults(null);
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

            {/* Hidden file input for Import modal */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            <div className="section-header">
                <div>
                    <h2 className="section-title">Employee Management</h2>
                    <p className="section-subtitle">Manage all employees, departments, and reporting relationships</p>
                </div>
                {!isManager && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={openImportModal}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px',
                                background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.12))',
                                border: '1px solid rgba(168,85,247,0.3)',
                                color: '#a855f7',
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            Import
                        </button>
                        <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
                    </div>
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
                            const mgr = users.find(m => m.id === u.managerId);
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
                    <div className="modal" style={{ maxWidth: '640px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div className="modal-header" style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                <Avatar
                                    avatarData={profilePhoto || (editing ? editing.avatar : null) || form.name}
                                    name={form.name}
                                    size={48}
                                    editable={true}
                                    onUpload={(base64) => setProfilePhoto(base64)}
                                    style={{ boxShadow: '0 8px 24px rgba(99,102,241,0.25)', border: '2px solid #fff' }}
                                />
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                        {editing ? 'Edit Employee Profile' : 'Register New Employee'}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>
                                        {editing ? 'Update professional information' : 'Complete the profile or auto-fill via Microsoft'}
                                    </p>
                                </div>
                            </div>
                            <button className="close-btn" style={{ background: 'var(--bg-secondary)', width: '36px', height: '36px' }} onClick={() => { setShowModal(false); resetModal(); }}>×</button>
                        </div>

                        <div className="modal-body" style={{ 
                            padding: '32px', 
                            overflowY: 'auto', 
                            maxHeight: 'calc(90vh - 160px)',
                            scrollbarWidth: 'thin'
                        }}>
                            <div className="form-grid">
                                {/* ── Quick Add / Fetch Section (The Box) ── */}
                                {!editing && (
                                    <div className="form-section full-width" style={{
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.03), rgba(59,130,246,0.03))',
                                        border: '1px solid var(--border)',
                                        padding: '24px',
                                        borderRadius: '20px',
                                        marginBottom: '32px',
                                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                            <div style={{ 
                                                width: '28px', height: '28px', borderRadius: '8px', 
                                                background: 'var(--purple)', color: '#fff', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 4px 10px rgba(99,102,241,0.3)'
                                            }}>
                                                <Icons.Plus style={{ width: 14, height: 14 }} />
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                                QUICK REGISTRATION & MICROSOFT SYNC
                                            </span>
                                        </div>

                                        {!bulkUploading && !bulkResults ? (
                                            <>
                                                <div style={{ position: 'relative', marginBottom: '20px' }}>
                                                    <textarea
                                                        className="form-input"
                                                        placeholder="Paste emails here (one per line, comma or semicolon)..."
                                                        value={manualEmails}
                                                        onChange={e => {
                                                            setManualEmails(e.target.value);
                                                            // If only one email, sync with form.email for potential fetch
                                                            const lines = e.target.value.split(/[,\n;]+/).filter(l => l.trim());
                                                            if (lines.length === 1 && lines[0].includes('@')) {
                                                                setForm(p => ({ ...p, email: lines[0].trim().toLowerCase() }));
                                                            }
                                                        }}
                                                        style={{
                                                            minHeight: '110px',
                                                            resize: 'none',
                                                            padding: '16px',
                                                            fontSize: '13px',
                                                            fontFamily: 'monospace',
                                                            borderRadius: '14px',
                                                            background: 'var(--bg-card)',
                                                            border: '1.5px solid var(--border)',
                                                            lineHeight: '1.6'
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={handleFetchFromMS}
                                                        disabled={fetchState === 'loading' || !manualEmails.trim() || manualEmails.split(/[,\n;]+/).filter(l => l.trim()).length !== 1}
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                                                            fontSize: '13px', padding: '12px',
                                                            background: 'var(--bg-card)',
                                                            border: '1px solid var(--border)',
                                                            boxShadow: 'var(--nm-shadow-out-sm)',
                                                            transition: 'all 0.2s',
                                                            color: manualEmails.split(/[,\n;]+/).filter(l => l.trim()).length === 1 ? 'var(--text-primary)' : 'var(--text-muted)'
                                                        }}
                                                    >
                                                        {fetchState === 'loading' ? <Spinner style={{ width: 14, height: 14 }} /> : <MsLogo />}
                                                        Fetch Profile
                                                    </button>

                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={handleManualImport}
                                                        disabled={!manualEmails.trim()}
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                                                            fontSize: '13px', padding: '12px',
                                                            background: 'var(--purple)', border: 'none',
                                                            boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
                                                        }}
                                                    >
                                                        <Icons.Plus style={{ width: 14, height: 14 }} />
                                                        Quick Add
                                                    </button>
                                                </div>

                                                {fetchState === 'success' && (
                                                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <CheckCircle style={{ width: 14, height: 14 }} /> Profile details loaded below.
                                                    </div>
                                                )}
                                                {fetchState === 'error' && (
                                                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <AlertCircle style={{ width: 14, height: 14 }} /> {fetchError}
                                                    </div>
                                                )}
                                            </>
                                        ) : bulkUploading ? (
                                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                                <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                    </svg>
                                                </div>
                                                <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Processing...</div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '5px 0' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                                    <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{bulkResults.success}</div>
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Added</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{bulkResults.skipped || 0}</div>
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Skipped</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>{bulkResults.failed}</div>
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Failed</div>
                                                    </div>
                                                </div>
                                                <button className="btn btn-secondary" style={{ width: '100%', fontSize: '11px', height: '32px' }} onClick={() => { setBulkResults(null); setManualEmails(''); }}>
                                                    Add More
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Separator (Only for Add mode) ── */}
                                {!editing && !bulkResults && (
                                    <div style={{ 
                                        gridColumn: '1 / -1', 
                                        display: 'flex', alignItems: 'center', gap: '20px', 
                                        margin: '8px 0 32px', opacity: 0.8
                                    }}>
                                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--border), var(--border))' }} />
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                                            OR REGISTER MANUALLY
                                        </span>
                                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--border), var(--border))' }} />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>Work Email Address *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="employee@company.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value.toLowerCase() })}
                                        style={{ height: '46px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>Full Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter display name"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        style={{ height: '46px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>Job Title / Designation</label>
                                    <select
                                        className="form-select"
                                        value={form.designation}
                                        onChange={e => setForm({ ...form, designation: e.target.value })}
                                        style={{ height: '46px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                    >
                                        <option value="">-- Select Professional Title --</option>
                                        {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>Department</label>
                                    <select
                                        className="form-select"
                                        value={form.department}
                                        onChange={e => setForm({ ...form, department: e.target.value })}
                                        style={{ height: '46px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>System Access Level</label>
                                    <select
                                        className="form-select"
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value })}
                                        style={{ height: '46px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                    >
                                        <option value="employee">Standard Employee</option>
                                        <option value="manager">Reporting Manager</option>
                                        <option value="hr">HR Personnel</option>
                                        <option value="admin">System Administrator</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>Reporting Manager</label>
                                    <select
                                        className="form-select"
                                        value={form.managerId}
                                        onChange={e => setForm({ ...form, managerId: e.target.value })}
                                        disabled={currentUser.role !== 'admin' && currentUser.role !== 'hr'}
                                        style={{ height: '46px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                    >
                                        <option value="">None (Top Level)</option>
                                        {users.filter(u => u.role === 'admin' || u.role === 'manager').map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            {/* Self Review Override Section (Existing) */}
                            {editing && (
                                <div style={{
                                    marginTop: '24px',
                                    paddingTop: '24px',
                                    borderTop: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Icons.Target style={{ color: 'var(--purple)' }} />
                                        <span style={{ fontWeight: 700, fontSize: '14px' }}>Self-Review Overrides</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label" style={{ fontSize: '11px' }}>Appraisal Cycle</label>
                                            <select
                                                className="form-select"
                                                style={{ height: '36px', fontSize: '13px' }}
                                                value={overrideForm.cycleId}
                                                onChange={e => setOverrideForm(p => ({ ...p, cycleId: e.target.value }))}
                                            >
                                                <option value="">-- Choose Cycle --</option>
                                                {cycles.filter(c => c.status === 'active').map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label" style={{ fontSize: '11px' }}>Question Set</label>
                                            <select
                                                className="form-select"
                                                style={{ height: '36px', fontSize: '13px' }}
                                                value={overrideForm.questionSetId}
                                                onChange={e => setOverrideForm(p => ({ ...p, questionSetId: e.target.value }))}
                                            >
                                                <option value="">-- Choose Set --</option>
                                                {questionSets.map(qs => <option key={qs.id} value={qs.id}>{qs.name}</option>)}
                                            </select>
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ height: '36px', padding: '0 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                                            onClick={handleAddOverride}
                                            disabled={!overrideForm.cycleId || !overrideForm.questionSetId}
                                        >
                                            + Add
                                        </button>
                                    </div>

                                    {/* List of active overrides */}
                                    {currentEmployeeOverrides.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                            {currentEmployeeOverrides.map(ov => {
                                                const cycle = cycles.find(c => String(c.id) === String(ov.cycleId));
                                                const qSet = questionSets.find(qs => String(qs.id) === String(ov.questionSetId));
                                                if (!cycle) return null;
                                                return (
                                                    <div key={ov.cycleId} style={{ 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)', fontSize: '13px'
                                                    }}>
                                                        <div>
                                                            <span style={{ fontWeight: 600 }}>{cycle.name}</span>
                                                            <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>→</span>
                                                            <span style={{ color: 'var(--purple)', fontWeight: 600 }}>{qSet?.name || 'Unknown Set'}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveOverride(ov.cycleId)}
                                                            style={{ 
                                                                background: 'none', border: 'none', color: '#ef4444', 
                                                                cursor: 'pointer', padding: '4px', display: 'flex' 
                                                            }}
                                                            title="Remove Override"
                                                        >
                                                            <Icons.Trash style={{ width: 14, height: 14 }} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

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
                                disabled={!form.name || !form.email}
                            >
                                <Icons.Save /> 
                                {editing ? 'Update Employee' : 'Add Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                IMPORT MODAL — File Upload Only
            ══════════════════════════════════════════════════════ */}
            {showImportModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !bulkUploading && setShowImportModal(false)}>
                    <div className="modal" style={{ maxWidth: '560px' }}>

                        <div className="modal-header" style={{ padding: '20px 24px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: bulkUploading ? 'rgba(59,130,246,0.15)' : bulkResults ? (bulkResults.failed > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)') : 'rgba(168,85,247,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                                }}>
                                    {bulkUploading ? '⏳' : bulkResults ? (bulkResults.failed > 0 ? '⚠️' : '✅') : '📥'}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                                        {bulkUploading ? 'Importing Employees…' : bulkResults ? 'Import Complete' : 'Import Employees'}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                                        {bulkUploading ? 'Processing your spreadsheet' : bulkResults ? 'Review the results below' : 'Upload an Excel or CSV file'}
                                    </p>
                                </div>
                            </div>
                            {!bulkUploading && <button className="close-btn" onClick={() => setShowImportModal(false)}>×</button>}
                        </div>

                        <div className="modal-body" style={{ padding: '20px 24px' }}>
                            {!bulkUploading && !bulkResults && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${isDragging ? '#a855f7' : selectedFile ? '#10b981' : 'var(--border)'}`,
                                        borderRadius: '16px',
                                        padding: '40px 24px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        background: isDragging ? 'rgba(168,85,247,0.06)' : selectedFile ? 'rgba(16,185,129,0.04)' : 'transparent',
                                        transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                                    }}
                                >
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                                        background: isDragging ? 'rgba(168,85,247,0.15)' : selectedFile ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {selectedFile ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                                            </svg>
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDragging ? '#a855f7' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                            </svg>
                                        )}
                                    </div>
                                    {selectedFile ? (
                                        <>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>{selectedFile.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB — Click to change</div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Drag & drop your Excel file here</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or <span style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'underline' }}>browse files</span></div>
                                        </>
                                    )}
                                </div>
                            )}

                            {bulkUploading && (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                    </div>
                                    <div style={{ marginTop: '16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Importing employees…</div>
                                </div>
                            )}

                            {!bulkUploading && bulkResults && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                        <div style={{ textAlign: 'center', padding: '18px 12px', borderRadius: '14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{bulkResults.success}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', marginTop: '4px', textTransform: 'uppercase' }}>Added</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '18px 12px', borderRadius: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{bulkResults.skipped || 0}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', marginTop: '4px', textTransform: 'uppercase' }}>Skipped</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '18px 12px', borderRadius: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>{bulkResults.failed}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', marginTop: '4px', textTransform: 'uppercase' }}>Failed</div>
                                        </div>
                                    </div>
                                    {bulkResults.errors.length > 0 && (
                                        <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', padding: '12px' }}>
                                            {bulkResults.errors.map((err, idx) => (
                                                <div key={idx} style={{ fontSize: '12px', padding: '6px 8px', marginBottom: '4px', borderRadius: '6px', background: err.type === 'skip' ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)', color: err.type === 'skip' ? '#d97706' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {err.type === 'skip' ? '⏭️' : '❌'} {err.msg}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {!bulkUploading && (
                            <div className="modal-footer">
                                {!bulkResults ? (
                                    <button className="btn btn-primary" disabled={!selectedFile} onClick={processImportFile}>
                                        Import {selectedFile ? `(${selectedFile.name})` : ''}
                                    </button>
                                ) : (
                                    <button className="btn btn-primary" onClick={() => setShowImportModal(false)}>Done</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

