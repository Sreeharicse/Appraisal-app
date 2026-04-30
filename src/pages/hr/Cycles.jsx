import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function Cycles() {
    const { currentUser, users, cycles, selfReviews, evaluations, approvals, addCycle, updateCycle, deleteCycle, requestCycleDelete, getScore } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', startDate: '', endDate: '', employeeEndDate: '', managerEndDate: '', status: 'draft' });

    // Deletion Flow State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState(null);
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const [deleteRequested, setDeleteRequested] = useState({});

    const openAdd = () => { setEditing(null); setForm({ name: '', startDate: '', endDate: '', employeeEndDate: '', managerEndDate: '', status: 'draft' }); setShowModal(true); };
    const openEdit = (c) => { setEditing(c); setForm({ name: c.name, startDate: c.startDate, endDate: c.endDate, employeeEndDate: c.employeeEndDate || c.endDate, managerEndDate: c.managerEndDate || c.endDate, status: c.status }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name || !form.startDate || !form.endDate) return;
        if (editing) await updateCycle(editing.id, form);
        else await addCycle(form);
        setShowModal(false);
    };

    const statusBadge = { draft: 'badge-gray', active: 'badge-green', closed: 'badge-red' };

    const activate = async (c) => {
        // deactivate all others first
        for (const x of cycles) {
            if (x.status === 'active') await updateCycle(x.id, { status: 'closed' });
        }
        await updateCycle(c.id, { status: 'active' });
    };
    // --- State for Close Warning Modal ---
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [cycleToClose, setCycleToClose] = useState(null);
    const [closeWarnings, setCloseWarnings] = useState([]);

    const handleClose = (c) => {
        const allReviewers = users; // All roles: employee, hr, manager, admin
        const warnings = [];

        // 1. Users with no self-review at all for this cycle
        const noReview = allReviewers.filter(u => !selfReviews.find(sr => sr.cycleId === c.id && sr.employeeId === u.id));
        if (noReview.length > 0) {
            warnings.push({ type: '❌ Missing Self-Review', names: noReview.map(u => `${u.name} (${u.role})`) });
        }

        // 2. Draft self-reviews (started but not submitted)
        const drafts = selfReviews.filter(sr => sr.cycleId === c.id && sr.status === 'draft');
        if (drafts.length > 0) {
            const names = drafts.map(sr => {
                const u = users.find(u => u.id === sr.employeeId);
                return u ? `${u.name} (${u.role})` : null;
            }).filter(Boolean);
            warnings.push({ type: '📝 Draft Self-Reviews (Not Submitted)', names });
        }

        // 3. Users with submitted self-review but no manager evaluation
        const submittedReviews = selfReviews.filter(sr => sr.cycleId === c.id && sr.status === 'submitted');
        const noEval = submittedReviews.filter(sr => !evaluations.find(ev => ev.cycleId === c.id && ev.employeeId === sr.employeeId));
        if (noEval.length > 0) {
            const names = noEval.map(sr => {
                const u = users.find(u => u.id === sr.employeeId);
                return u ? `${u.name} (${u.role})` : null;
            }).filter(Boolean);
            warnings.push({ type: '⏳ Awaiting Manager Evaluation', names });
        }

        // 4. Evaluations pending HR/Admin approval
        const pendingApprovals = evaluations.filter(ev => ev.cycleId === c.id && ev.status === 'pending_approval');
        if (pendingApprovals.length > 0) {
            const names = pendingApprovals.map(ev => {
                const u = users.find(u => u.id === ev.employeeId);
                return u ? `${u.name} (${u.role})` : null;
            }).filter(Boolean);
            warnings.push({ type: '🔔 Pending Approval', names });
        }

        if (warnings.length > 0) {
            setCycleToClose(c);
            setCloseWarnings(warnings);
            setShowCloseWarning(true);
        } else {
            updateCycle(c.id, { status: 'closed' });
        }
    };
    const confirmClose = () => {
        updateCycle(cycleToClose.id, { status: 'closed' });
        setShowCloseWarning(false);
        setCycleToClose(null);
        setCloseWarnings([]);
    };

    // --- Deletion Handlers ---
    const handleDeleteClick = (c) => {
        if (currentUser?.role === 'admin') {
            setCycleToDelete(c);
            setHasDownloaded(false);
            setConfirmName('');
            setShowDeleteConfirm(true);
        } else {
            if (window.confirm(`Request Admin to delete cycle '${c.name}'?`)) {
                requestCycleDelete(c);
                setDeleteRequested(prev => ({ ...prev, [c.id]: true }));
            }
        }
    };

    const exportCycleData = (cycle) => {
        // Find evaluated employees for this cycle
        const cycleEvals = evaluations.filter(e => e.cycleId === cycle.id);

        const headers = ['Employee Name', 'Role', 'Department', 'Score', 'Category', 'Status'];

        const rows = users.filter(u => u.role !== 'admin' && u.role !== 'hr' || cycleEvals.some(e => e.employeeId === u.id)).map(emp => {
            const ev = cycleEvals.find(e => e.employeeId === emp.id);
            if (!ev && emp.role !== 'employee') return null; // Only include non-employees if they were evaluated

            const status = ev?.status?.replace('_', ' ') || 'pending';
            let score = 'N/A';
            let category = 'N/A';

            if (ev && (ev.status === 'submitted' || ev.status === 'approved' || ev.status === 'rejected')) {
                const scoreData = getScore(emp.id, cycle.id);
                if (scoreData) {
                    score = scoreData.score;
                    category = scoreData.category.label;
                }
            }

            return [
                emp.name,
                emp.role,
                emp.department,
                score,
                category,
                status
            ];
        }).filter(Boolean); // remove nulls

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(field => `"${field ?? ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `cycle-backup-${cycle.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setHasDownloaded(true);
    };

    const confirmAdminDelete = async () => {
        const canDelete = cycleToDelete && (hasDownloaded || confirmName.trim() === cycleToDelete.name);
        if (canDelete) {
            const res = await deleteCycle(cycleToDelete.id);
            if (res && !res.success) {
                alert(`Failed to delete cycle: ${res.error}`);
            } else {
                setShowDeleteConfirm(false);
                setCycleToDelete(null);
                setConfirmName('');
            }
        }
    };

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Appraisal Cycles</h2>
                    <p className="section-subtitle">Create and manage appraisal periods</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ New Cycle</button>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3>All Cycles</h3>
                </div>
                <table>
                    <thead>
                        <tr><th>Cycle Name</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {cycles.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No cycles yet. Create your first one.</td></tr>}
                        {cycles.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                                <td><Icons.Calendar style={{ width: '12px', height: '12px', marginRight: '4px', verticalAlign: 'middle' }} /> {c.startDate}</td>
                                <td><Icons.Calendar style={{ width: '12px', height: '12px', marginRight: '4px', verticalAlign: 'middle' }} /> {c.endDate}</td>
                                <td><span className={`badge ${statusBadge[c.status] || 'badge-gray'}`}>{c.status}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {c.status !== 'active' && c.status !== 'closed' && (
                                            <button className="btn btn-success btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => activate(c)}>
                                                <Icons.Play /> Activate
                                            </button>
                                        )}
                                        {c.status === 'active' && (
                                            <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleClose(c)}>
                                                <Icons.Square /> Close
                                            </button>
                                        )}
                                        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => openEdit(c)}>
                                            <Icons.Edit /> Edit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cycle Close Warning Modal - Blue Theme */}
            {showCloseWarning && cycleToClose && (
                <div className="modal-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal" style={{ maxWidth: '560px', borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '24px 32px', border: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
                                    <Icons.AlertTriangle style={{ color: '#fff', width: '24px', height: '24px' }} />
                                </div>
                                <div>
                                    <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Action Required</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '4px 0 0 0', fontWeight: 500 }}>Pending items detected in {cycleToClose.name}</p>
                                </div>
                            </div>
                            <button className="close-btn" style={{ color: '#fff', opacity: 0.8 }} onClick={() => setShowCloseWarning(false)}>×</button>
                        </div>

                        <div className="modal-body" style={{ padding: '32px', background: 'var(--bg-card)' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: 500 }}>
                                    The following tasks must be completed or acknowledged before closing this cycle. Closing will lock all participant data.
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                                {closeWarnings.map((w, i) => (
                                    <div key={i} style={{
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        border: '1px solid var(--border)',
                                        borderLeft: '4px solid #3b82f6'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '11px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{w.type}</span>
                                            <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{w.names.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {w.names.map((name, idx) => (
                                                <span key={idx} style={{
                                                    background: 'var(--bg-primary)',
                                                    border: '1px solid var(--border)',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    color: 'var(--text-secondary)',
                                                    fontWeight: 500
                                                }}>
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '24px', padding: '12px 16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.15)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <Icons.Info style={{ color: '#3b82f6', width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                    Closing this cycle is an irreversible action. Records for the people listed above will be finalized in their current incomplete state.
                                </p>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '24px 32px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 600 }} onClick={() => setShowCloseWarning(false)}>Go Back</button>
                            <button className="btn" onClick={confirmClose} style={{
                                background: '#3b82f6',
                                color: '#fff',
                                padding: '10px 24px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
                            }}>
                                <Icons.Square style={{ width: '16px', height: '16px' }} /> Confirm & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Delete Confirmation Modal */}
            {showDeleteConfirm && cycleToDelete && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal" style={{ maxWidth: '500px', border: '1px solid var(--red)' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <h3 style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚠️ Delete Appraisal Cycle
                            </h3>
                            <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px' }}>
                            <p style={{ marginBottom: '16px', fontSize: '14px' }}>You are about to permanently delete:</p>
                            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{cycleToDelete.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{cycleToDelete.startDate} to {cycleToDelete.endDate}</div>
                            </div>

                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                                <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>⚠️ WARNING: This will cascade delete:</strong>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--red)', fontSize: '13px', lineHeight: '1.6' }}>
                                    <li>All employee self-reviews</li>
                                    <li>All manager evaluations</li>
                                    <li>All HR approvals and ratings</li>
                                </ul>
                                <p style={{ marginTop: '8px', marginBottom: 0, color: 'var(--red)', fontSize: '13px', fontWeight: 600 }}>This action cannot be undone.</p>
                            </div>

                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: hasDownloaded ? 'var(--bg-secondary)' : 'var(--blue)', color: hasDownloaded ? 'var(--text-primary)' : '#fff', border: hasDownloaded ? '1px solid var(--border)' : 'none' }}
                                onClick={() => exportCycleData(cycleToDelete)}
                            >
                                📥 {hasDownloaded ? 'Records Downloaded' : 'Download All Records (CSV)'}
                            </button>

                            <div style={{ margin: '16px 0', textAlign: 'center', position: 'relative' }}>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
                                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', padding: '0 12px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>OR</span>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Type <strong>{cycleToDelete.name}</strong> to confirm deletion without downloading a backup:</label>
                                <input
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    placeholder={cycleToDelete.name}
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                            <button className="btn btn-secondary" onClick={() => { setShowDeleteConfirm(false); setConfirmName(''); }}>Cancel</button>
                            <button
                                className="btn btn-danger"
                                disabled={!hasDownloaded && confirmName.trim() !== cycleToDelete.name}
                                onClick={confirmAdminDelete}
                                style={{ opacity: hasDownloaded || confirmName.trim() === cycleToDelete.name ? 1 : 0.5, cursor: hasDownloaded || confirmName.trim() === cycleToDelete.name ? 'pointer' : 'not-allowed' }}
                                title={(!hasDownloaded && confirmName.trim() !== cycleToDelete.name) ? "You must download records or type the cycle name to confirm" : "Confirm Delete"}
                            >
                                🗑️ Delete Cycle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editing ? 'Edit Cycle' : 'New Appraisal Cycle'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Cycle Name *</label>
                                <input className="form-input" placeholder="Annual Review 2026" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Start Date *</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date *</label>
                                    <input className="form-input" type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Employee Deadline</label>
                                    <input className="form-input" type="date" value={form.employeeEndDate} onChange={e => setForm(p => ({ ...p, employeeEndDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manager Deadline</label>
                                    <input className="form-input" type="date" value={form.managerEndDate} onChange={e => setForm(p => ({ ...p, managerEndDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        pointerEvents: 'none',
                                        color: 'var(--text-muted)',
                                        zIndex: 1
                                    }}>
                                        <Icons.Cycles style={{ width: '14px', height: '14px' }} />
                                        <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>STATUS</span>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={form.status}
                                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                                        style={{
                                            paddingLeft: '85px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            width: '100%',
                                            background: 'var(--bg-secondary)',
                                            height: '42px'
                                        }}
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleSave}>
                                <Icons.Save /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

