import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function Settings() {
    const {
        departments, addDepartment, deleteDepartment,
        designations, addDesignation, deleteDesignation,
        users, cycles, selfReviews, evaluations, getCategory
    } = useApp();

    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'analytics'
    const [newDept, setNewDept] = useState('');
    const [newDesig, setNewDesig] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);

    // Analytics State
    const [viewLevel, setViewLevel] = useState('company'); // 'company' | 'department' | 'manager' | 'employee'
    const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id || '');
    const [path, setPath] = useState([{ level: 'company', label: 'Company', id: 'root' }]);

    // Sync selected cycle if none matches
    React.useEffect(() => {
        if (!selectedCycleId && cycles.length > 0) setSelectedCycleId(cycles[0].id);
    }, [cycles, selectedCycleId]);

    const handleAddDepartment = async () => {
        if (!newDept.trim()) return;
        setLoadingAction(true);
        await addDepartment(newDept.trim());
        setNewDept('');
        setLoadingAction(false);
    };

    const handleAddDesignation = async () => {
        if (!newDesig.trim()) return;
        setLoadingAction(true);
        await addDesignation(newDesig.trim());
        setNewDesig('');
        setLoadingAction(false);
    };

    // Analytics Helpers
    const getStatus = (userId, cycleId) => {
        const sr = selfReviews.find(r => r.employeeId === userId && r.cycleId === cycleId);
        const ev = evaluations.find(e => e.employeeId === userId && e.cycleId === cycleId);

        if (ev?.status === 'approved') return { label: 'Approved', badge: 'badge-green', sort: 5 };
        if (ev?.status === 'pending_approval') return { label: 'Approval Pending', badge: 'badge-purple', sort: 4 };
        if (sr?.status === 'submitted') return { label: 'Evaluation Pending', badge: 'badge-yellow', sort: 3 };
        if (sr) return { label: 'Draft', badge: 'badge-blue', sort: 2 };
        return { label: 'Not Started', badge: 'badge-red', sort: 1 };
    };

    const drillDown = (level, id, label) => {
        setPath(prev => [...prev, { level, id, label }]);
        setViewLevel(level);
    };

    const navigateToPath = (index) => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        setViewLevel(newPath[newPath.length - 1].level);
    };

    // Data Aggregation
    const getLevelData = () => {
        const currentCycle = selectedCycleId;
        const currentPath = path[path.length - 1];

        if (viewLevel === 'company') {
            const counts = { total: users.length, reviews: 0, evals: 0, approvals: 0 };
            users.forEach(u => {
                const s = getStatus(u.id, currentCycle);
                if (s.label === 'Draft' || s.label === 'Not Started') counts.reviews++;
                if (s.label === 'Evaluation Pending') counts.evals++;
                if (s.label === 'Approval Pending') counts.approvals++;
            });
            return counts;
        }

        if (viewLevel === 'department') {
            return departments.map(d => {
                const deptUsers = users.filter(u => u.department === d.name);
                const pending = deptUsers.filter(u => ['Draft', 'Not Started', 'Evaluation Pending', 'Approval Pending'].includes(getStatus(u.id, currentCycle).label)).length;
                return { id: d.id, name: d.name, total: deptUsers.length, pending };
            });
        }

        if (viewLevel === 'manager') {
            const deptName = path.find(p => p.level === 'department')?.label;
            const deptUsers = users.filter(u => u.department === deptName);
            // Unique managers in this department
            const managers = [...new Set(deptUsers.map(u => u.managerId))].filter(Boolean).map(mid => {
                const m = users.find(u => u.id === mid);
                const reports = users.filter(u => u.managerId === mid);
                const pending = reports.filter(u => getStatus(u.id, currentCycle).label !== 'Approved').length;
                return { id: mid, name: m?.name || 'Unknown', total: reports.length, pending };
            });
            return managers;
        }

        if (viewLevel === 'employee') {
            const managerId = path.find(p => p.level === 'manager')?.id;
            const reports = users.filter(u => u.managerId === managerId);
            return reports.map(u => ({
                id: u.id,
                name: u.name,
                status: getStatus(u.id, currentCycle),
                pendingAction: getStatus(u.id, currentCycle).label
            }));
        }
        return null;
    };

    const renderLevel = () => {
        const data = getLevelData();
        const currentCycle = selectedCycleId;

        switch (viewLevel) {
            case 'company':
                return (
                    <div className="grid-4" style={{ gap: '24px' }}>
                        <div className="card clickable-card" onClick={() => drillDown('department', 'root', 'All Departments')} style={{ borderLeft: '4px solid var(--blue-light)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>TOTAL EMPLOYEES</div>
                            <div style={{ fontSize: '32px', fontWeight: 800 }}>{data.total}</div>
                            <div style={{ color: 'var(--blue-light)', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>Click to view details →</div>
                        </div>
                        <div className="card clickable-card" onClick={() => drillDown('department', 'reviews', 'Pending Reviews')} style={{ borderLeft: '4px solid var(--purple-light)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>PENDING REVIEWS</div>
                            <div style={{ fontSize: '32px', fontWeight: 800 }}>{data.reviews}</div>
                            <div style={{ color: 'var(--purple-light)', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>Action Required →</div>
                        </div>
                        <div className="card clickable-card" onClick={() => drillDown('department', 'evals', 'Pending Evaluations')} style={{ borderLeft: '4px solid var(--yellow)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>PENDING EVALUATIONS</div>
                            <div style={{ fontSize: '32px', fontWeight: 800 }}>{data.evals}</div>
                            <div style={{ color: 'var(--yellow)', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>Action Required →</div>
                        </div>
                        <div className="card clickable-card" onClick={() => drillDown('department', 'approvals', 'Pending Approvals')} style={{ borderLeft: '4px solid var(--red)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>PENDING APPROVALS</div>
                            <div style={{ fontSize: '32px', fontWeight: 800 }}>{data.approvals}</div>
                            <div style={{ color: 'var(--red)', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>Action Required →</div>
                        </div>
                    </div>
                );
            case 'department':
                return (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Department</th><th style={{ textAlign: 'center' }}>Total</th><th style={{ textAlign: 'center' }}>Pending</th><th></th></tr></thead>
                            <tbody>
                                {data.map(d => (
                                    <tr key={d.id} className="hover-row" onClick={() => drillDown('manager', d.id, d.name)}>
                                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                                        <td style={{ textAlign: 'center' }}>{d.total}</td>
                                        <td style={{ textAlign: 'center' }}><span className="badge badge-yellow">{d.pending}</span></td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Details →</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'manager':
                return (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Manager</th><th style={{ textAlign: 'center' }}>Team Size</th><th style={{ textAlign: 'center' }}>Pending</th><th></th></tr></thead>
                            <tbody>
                                {data.map(m => (
                                    <tr key={m.id} className="hover-row" onClick={() => drillDown('employee', m.id, m.name)}>
                                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                                        <td style={{ textAlign: 'center' }}>{m.total}</td>
                                        <td style={{ textAlign: 'center' }}><span className="badge badge-yellow">{m.pending}</span></td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>View Team →</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'employee':
                return (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Employee</th><th>Status</th><th>Pending Action</th></tr></thead>
                            <tbody>
                                {data.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ fontWeight: 600 }}>{e.name}</td>
                                        <td><span className={`badge ${e.status.badge}`}>{e.status.label}</span></td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {e.status.label === 'Not Started' && 'Awaiting Self Review'}
                                            {e.status.label === 'Draft' && 'Review in Progress'}
                                            {e.status.label === 'Evaluation Pending' && 'Manager must Evaluate'}
                                            {e.status.label === 'Approval Pending' && 'HR/Admin Approval needed'}
                                            {e.status.label === 'Approved' && 'Completed'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="section-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="section-title" style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>System Settings</h2>
                    <p className="section-subtitle">Admin controls and performance analytics</p>
                </div>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('config')}
                        style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none',
                            background: activeTab === 'config' ? 'var(--bg-primary)' : 'transparent',
                            color: activeTab === 'config' ? 'var(--blue-light)' : 'var(--text-muted)',
                            boxShadow: activeTab === 'config' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}>Configuration</button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none',
                            background: activeTab === 'analytics' ? 'var(--bg-primary)' : 'transparent',
                            color: activeTab === 'analytics' ? 'var(--blue-light)' : 'var(--text-muted)',
                            boxShadow: activeTab === 'analytics' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}>Performance Analytics</button>
                </div>
            </div>

            {activeTab === 'config' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Departments Section */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '16px' }}>Manage Departments</div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                className="form-input"
                                placeholder="New Department"
                                value={newDept}
                                onChange={e => setNewDept(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                            />
                            <button className="btn btn-primary" onClick={handleAddDepartment} disabled={loadingAction || !newDept.trim()}>Add</button>
                        </div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                            {departments.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No departments found.</div>
                            ) : (
                                departments.map(d => (
                                    <div key={d.id} className="list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{d.name}</span>
                                        <button className="btn btn-danger btn-sm" onClick={() => window.confirm(`Delete ${d.name}?`) && deleteDepartment(d.id)} style={{ padding: '4px 8px' }}>Delete</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Job Titles Section */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '16px' }}>Manage Job Titles</div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                className="form-input"
                                placeholder="New Job Title"
                                value={newDesig}
                                onChange={e => setNewDesig(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddDesignation()}
                            />
                            <button className="btn btn-primary" onClick={handleAddDesignation} disabled={loadingAction || !newDesig.trim()}>Add</button>
                        </div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                            {designations.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No job titles found.</div>
                            ) : (
                                designations.map(d => (
                                    <div key={d.id} className="list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{d.name}</span>
                                        <button className="btn btn-danger btn-sm" onClick={() => window.confirm(`Delete ${d.name}?`) && deleteDesignation(d.id)} style={{ padding: '4px 8px' }}>Delete</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            {path.map((p, idx) => (
                                <React.Fragment key={idx}>
                                    <span
                                        onClick={() => navigateToPath(idx)}
                                        style={{
                                            cursor: 'pointer',
                                            color: idx === path.length - 1 ? 'var(--text-primary)' : 'var(--blue-light)',
                                            fontWeight: idx === path.length - 1 ? 700 : 500
                                        }}
                                    >
                                        {p.label}
                                    </span>
                                    {idx < path.length - 1 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
                                </React.Fragment>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>APPRAISAL CYCLE:</span>
                            <select
                                className="form-input"
                                style={{ width: '200px', padding: '6px 12px', height: '36px' }}
                                value={selectedCycleId}
                                onChange={e => setSelectedCycleId(e.target.value)}
                            >
                                {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {renderLevel()}
                </div>
            )}
        </div>
    );
}
