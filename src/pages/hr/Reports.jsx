import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';
import Avatar from '../../components/Avatar';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#10b981', '#06b6d4', '#7c3aed', '#f59e0b', '#ef4444'];

// ─── Pipeline status resolution ───────────────────────────────────────────────
// Source of truth:  selfReviews → evaluations (in that order)
// Every user in the cycle goes through: not_started → draft → submitted → evaluated → approved
function resolvePipeline(userId, cycleId, selfReviews, evaluations) {
    const sr = selfReviews.find(
        r => String(r.employeeId) === String(userId) && String(r.cycleId) === String(cycleId)
    );
    const ev = evaluations.find(
        e => String(e.employeeId) === String(userId) && String(e.cycleId) === String(cycleId)
    );

    // Evaluation stages take priority when they exist
    if (ev) {
        if (ev.status === 'approved')   return { stage: 'approved',   sr, ev };
        if (ev.status === 'evaluated')  return { stage: 'evaluated',  sr, ev };
        if (ev.status === 'pending_approval') return { stage: 'evaluated', sr, ev };
        if (ev.status === 'submitted')  return { stage: 'submitted',  sr, ev };
    }

    // Fall back to self-review status
    if (sr) {
        if (sr.status === 'submitted') return { stage: 'submitted', sr, ev: null };
        if (sr.status === 'draft')     return { stage: 'draft',     sr, ev: null };
        return                               { stage: 'draft',     sr, ev: null }; // sr exists but unknown status = draft
    }

    return { stage: 'not_started', sr: null, ev: null };
}

const STAGE_META = {
    not_started: { label: 'Not Started',      badge: 'badge-gray',   color: '#64748b' },
    draft:       { label: 'Draft',            badge: 'badge-yellow', color: '#f59e0b' },
    submitted:   { label: 'Awaiting Manager', badge: 'badge-blue',   color: '#3b82f6' },
    evaluated:   { label: 'Awaiting HR',      badge: 'badge-purple', color: '#a855f7' },
    approved:    { label: 'Completed',        badge: 'badge-green',  color: '#10b981' },
};

const NEXT_STEP = {
    not_started: { text: '📝 Start Self Review',  color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.25)' },
    draft:       { text: '✏️ Submit Draft',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
    submitted:   { text: '👤 Manager — Evaluate', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)'  },
    evaluated:   { text: '✅ HR — Approve',       color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.3)'  },
    approved:    { text: '🏆 Complete',           color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
};

export default function Reports() {
    const { users, cycles, selfReviews, evaluations, getScore, currentUser } = useApp();
    const [selectedCycleId, setSelectedCycleId] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('all');

    // All users visible to HR/Admin — every role, no filtering by role
    const allUsers = useMemo(() => {
        if (currentUser?.role === 'admin' || currentUser?.role === 'hr') return users;
        return users.filter(u => u.role === 'employee');
    }, [users, currentUser]);

    // Auto-select active (or first) cycle
    React.useEffect(() => {
        if (!selectedCycleId && cycles.length > 0) {
            const active = cycles.find(c => c.status === 'active') || cycles[0];
            setSelectedCycleId(active.id);
        }
    }, [cycles, selectedCycleId]);

    const activeCycle = cycles.find(c => String(c.id) === String(selectedCycleId));

    // ── Core pipeline data ──────────────────────────────────────────────────
    const pipelineData = useMemo(() => {
        if (!activeCycle) return [];
        return allUsers.map(user => {
            const { stage, sr, ev } = resolvePipeline(user.id, activeCycle.id, selfReviews, evaluations);
            const meta = STAGE_META[stage];
            const nextStep = NEXT_STEP[stage];
            const scoreData = stage === 'approved' ? getScore(user.id, activeCycle.id) : null;
            return { ...user, stage, meta, nextStep, sr, ev, scoreData };
        });
    }, [allUsers, activeCycle, selfReviews, evaluations, getScore]);

    // ── Summary counts ──────────────────────────────────────────────────────
    const summaryCounts = useMemo(() => {
        const counts = { not_started: 0, draft: 0, submitted: 0, evaluated: 0, approved: 0 };
        pipelineData.forEach(u => { if (counts[u.stage] !== undefined) counts[u.stage]++; });
        return counts;
    }, [pipelineData]);

    // ── Filtered table rows ─────────────────────────────────────────────────
    const filteredRows = useMemo(() => {
        if (filterStatus === 'all') return pipelineData;
        return pipelineData.filter(u => u.stage === filterStatus);
    }, [pipelineData, filterStatus]);

    // ── Chart data (approved only — needs scores) ───────────────────────────
    const approvedWithScores = pipelineData.filter(u => u.scoreData);

    const scoreBuckets = { '0-49': 0, '50-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 };
    approvedWithScores.forEach(u => {
        const s = u.scoreData.score;
        if (s < 50) scoreBuckets['0-49']++;
        else if (s < 60) scoreBuckets['50-59']++;
        else if (s < 70) scoreBuckets['60-69']++;
        else if (s < 80) scoreBuckets['70-79']++;
        else if (s < 90) scoreBuckets['80-89']++;
        else scoreBuckets['90-100']++;
    });
    const histogramData = Object.entries(scoreBuckets).map(([name, count]) => ({ name, count }));

    const catCounts = {};
    approvedWithScores.forEach(u => {
        const lbl = u.scoreData.category.label;
        catCounts[lbl] = (catCounts[lbl] || 0) + 1;
    });
    const pieData = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload?.length) {
            return (
                <div style={{ background: '#151731', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{payload[0].payload.name}</div>
                    <div style={{ color: '#a78bfa', fontSize: '20px', fontWeight: 800 }}>{payload[0].value}</div>
                </div>
            );
        }
        return null;
    };

    // ── CSV Export ──────────────────────────────────────────────────────────
    const exportToCSV = () => {
        if (pipelineData.length === 0) { alert('No data to export.'); return; }
        const headers = ['Name', 'Role', 'Department', 'Pipeline Status', 'Self Review', 'Evaluation', 'Score', 'Category'];
        const rows = pipelineData.map(u => [
            u.name,
            u.role,
            u.department || '-',
            u.stage.replace('_', ' '),
            u.sr?.status || 'not started',
            u.ev?.status || '-',
            u.scoreData?.score ?? '-',
            u.scoreData?.category?.label ?? '-',
        ]);
        const csv = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Reports_${activeCycle?.name || 'Cycle'}.csv`;
        a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    // ── Role badge color helper ─────────────────────────────────────────────
    const roleBadge = r => r === 'admin' ? 'badge-red' : r === 'hr' ? 'badge-purple' : r === 'manager' ? 'badge-blue' : 'badge-gray';

    return (
        <div>
            {/* Header */}
            <div className="section-header">
                <div>
                    <h2 className="section-title">Performance Reports</h2>
                    <p className="section-subtitle">Cycle analytics, scores, and performance distribution for all roles</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={exportToCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '220px' }}>
                        <div style={{ position: 'absolute', left: '14px', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none', color: 'var(--text-muted)', zIndex: 1 }}>
                            <Icons.Cycles style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>CYCLE</span>
                        </div>
                        <select
                            className="form-select"
                            value={selectedCycleId}
                            onChange={e => setSelectedCycleId(e.target.value)}
                            disabled={cycles.length === 0}
                            style={{ paddingLeft: '75px', fontWeight: 700, fontSize: '13px', width: '100%', background: 'var(--bg-secondary)', height: '42px' }}
                        >
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Status filter cards ── */}
            {activeCycle && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                        { id: 'all',         label: 'All Profiles',    color: 'var(--text-secondary)', count: pipelineData.length },
                        { id: 'not_started', label: 'Not Started',     color: '#64748b',               count: summaryCounts.not_started },
                        { id: 'draft',       label: 'Draft',           color: '#f59e0b',               count: summaryCounts.draft },
                        { id: 'submitted',   label: 'Awaiting Manager',color: '#3b82f6',               count: summaryCounts.submitted },
                        { id: 'evaluated',   label: 'Awaiting HR',     color: '#a855f7',               count: summaryCounts.evaluated },
                        { id: 'approved',    label: 'Completed',       color: '#10b981',               count: summaryCounts.approved },
                    ].map(card => (
                        <div
                            key={card.id}
                            className="stat-card"
                            onClick={() => setFilterStatus(card.id)}
                            style={{
                                padding: '20px',
                                background: filterStatus === card.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                                border: filterStatus === card.id ? `2px solid ${card.color}` : '1px solid var(--border)',
                                borderRadius: '16px',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {card.id !== 'all' && card.id !== 'not_started' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: card.color }} />}
                            <div style={{ color: filterStatus === card.id ? card.color : 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: card.color, marginTop: '8px' }}>{card.count}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Charts (only when approved data exists) ── */}
            {approvedWithScores.length > 0 ? (
                <div className="charts-grid" style={{ marginBottom: '24px' }}>
                    <div className="chart-card">
                        <div className="chart-title">📊 Score Distribution</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={histogramData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {histogramData.map((_, i) => <Cell key={i} fill={COLORS[1]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                        <div className="chart-title">🥧 Performance Category Distribution</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#151731', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : activeCycle && currentUser?.role !== 'admin' && currentUser?.role !== 'hr' ? (
                <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px' }}>
                    <Icons.Chart style={{ width: '20px', height: '20px', color: 'var(--yellow)' }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Analytics Pending Approvals</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Score charts will appear once HR approves evaluations. Pipeline table below shows all current statuses.</div>
                    </div>
                </div>
            ) : null}

            {/* ── Comprehensive Pipeline Table — ALWAYS VISIBLE ── */}
            {activeCycle && (
                <div className="table-container" style={{ marginTop: '8px' }}>
                    <div className="table-header">
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Comprehensive Pipeline Report</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                All roles · {filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''} {filterStatus !== 'all' ? `· filtered by "${STAGE_META[filterStatus]?.label || filterStatus}"` : ''}
                            </p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Self Review</th>
                                <th>Pipeline Status</th>
                                <th>Next Step</th>
                                <th>Final Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                        No records match this filter.
                                    </td>
                                </tr>
                            ) : filteredRows.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Avatar avatarData={user.avatar} name={user.name} size={28} />
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${roleBadge(user.role)}`} style={{ textTransform: 'capitalize' }}>{user.role}</span>
                                    </td>
                                    <td>{user.department || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                    <td>
                                        {user.sr ? (
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px',
                                                background: user.sr.status === 'submitted' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                                                color: user.sr.status === 'submitted' ? '#3b82f6' : '#f59e0b',
                                                textTransform: 'capitalize'
                                            }}>
                                                {user.sr.status}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not started</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${user.meta.badge}`} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            boxShadow: user.stage === 'approved' ? '0 2px 8px rgba(16,185,129,0.2)' : 'none'
                                        }}>
                                            {user.stage === 'approved' && <Icons.Check style={{ width: '12px', height: '12px' }} />}
                                            {user.meta.label}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                                            background: user.nextStep.bg, color: user.nextStep.color, border: `1px solid ${user.nextStep.border}`
                                        }}>
                                            {user.nextStep.text}
                                        </span>
                                    </td>
                                    <td>
                                        {user.scoreData ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--purple-light)' }}>{user.scoreData.score}</div>
                                                <span className={`badge ${user.scoreData.category.badge}`}>{user.scoreData.category.label}</span>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Appraisal History ── */}
            <div className="table-container" style={{ marginTop: '24px' }}>
                <div className="table-header"><h3>📁 Appraisal History</h3></div>
                <table>
                    <thead>
                        <tr>
                            <th>Cycle</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th>Participants</th>
                            <th>Evaluations</th>
                            <th>Approved</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cycles.map(c => {
                            const cycleEvals = evaluations.filter(e => String(e.cycleId) === String(c.id));
                            const approved = cycleEvals.filter(e => e.status === 'approved').length;
                            const cycleSRs = selfReviews.filter(sr => String(sr.cycleId) === String(c.id));
                            return (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.startDate} → {c.endDate}</td>
                                    <td><span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'closed' ? 'badge-red' : 'badge-gray'}`}>{c.status}</span></td>
                                    <td>{cycleSRs.length} self reviews</td>
                                    <td>{cycleEvals.length} evaluations</td>
                                    <td>
                                        {approved > 0
                                            ? <span style={{ fontWeight: 700, color: '#10b981' }}>{approved} approved</span>
                                            : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None yet</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
