import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';
import Avatar from '../../components/Avatar';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#10b981', '#06b6d4', '#7c3aed', '#f59e0b', '#ef4444'];

export default function Reports() {
    const { users, cycles, evaluations, getScore, currentUser } = useApp();
    const [selectedCycleId, setSelectedCycleId] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('approved');
    const employees = useMemo(() => {
        if (currentUser?.role === 'admin' || currentUser?.role === 'hr') {
            return users;
        }
        return users.filter(u => u.role === 'employee');
    }, [users, currentUser]);

    // Auto-select active cycle initially
    React.useEffect(() => {
        if (!selectedCycleId && cycles.length > 0) {
            const active = cycles.find(c => c.status === 'active') || cycles[0];
            setSelectedCycleId(active.id);
        }
    }, [cycles, selectedCycleId]);

    const activeCycle = cycles.find(c => String(c.id) === String(selectedCycleId));

    const employeeScores = employees.map(emp => {
        const scoreData = activeCycle ? getScore(emp.id, activeCycle.id) : null;
        return { ...emp, scoreData };
    }).filter(e => e.scoreData);

    const allEmployeesData = useMemo(() => {
        return employees.map(emp => {
            const ev = activeCycle ? evaluations.find(e => e.employeeId === emp.id && e.cycleId === activeCycle.id) : null;
            let pipelineStatus = 'not_started';
            let statusObj = { label: 'Not Started', badge: 'badge-gray', pendingAction: 'Employee' };
            
            if (ev) {
                pipelineStatus = ev.status;
                if (ev.status === 'draft') {
                    statusObj = { label: 'Draft', badge: 'badge-yellow', pendingAction: 'Employee' };
                } else if (ev.status === 'submitted') {
                    statusObj = { label: 'Ready for Eval', badge: 'badge-blue', pendingAction: 'Manager' };
                } else if (ev.status === 'evaluated') {
                    statusObj = { label: 'Pending Approval', badge: 'badge-purple', pendingAction: 'HR / Admin' };
                } else if (ev.status === 'approved') {
                    statusObj = { label: 'Completed', badge: 'badge-green', pendingAction: 'None' };
                }
            }
            
            const scoreData = (ev?.status === 'approved' && activeCycle) ? getScore(emp.id, activeCycle.id) : null;
            return { ...emp, ev, pipelineStatus, statusObj, scoreData };
        });
    }, [employees, evaluations, activeCycle, getScore]);

    const summaryCounts = useMemo(() => {
        const counts = { not_started: 0, draft: 0, submitted: 0, evaluated: 0, approved: 0 };
        allEmployeesData.forEach(e => {
            if (counts[e.pipelineStatus] !== undefined) counts[e.pipelineStatus]++;
        });
        return counts;
    }, [allEmployeesData]);

    // Histogram chart data (Score Distribution)
    const scoreBuckets = {
        '0-49': 0,
        '50-59': 0,
        '60-69': 0,
        '70-79': 0,
        '80-89': 0,
        '90-100': 0
    };

    employeeScores.forEach(e => {
        const s = e.scoreData.score;
        if (s < 50) scoreBuckets['0-49']++;
        else if (s < 60) scoreBuckets['50-59']++;
        else if (s < 70) scoreBuckets['60-69']++;
        else if (s < 80) scoreBuckets['70-79']++;
        else if (s < 90) scoreBuckets['80-89']++;
        else scoreBuckets['90-100']++;
    });

    const histogramData = Object.entries(scoreBuckets).map(([range, count]) => ({
        name: range,
        count: count
    }));

    // Pie chart data
    const catCounts = {};
    employeeScores.forEach(e => {
        const lbl = e.scoreData.category.label;
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

    const exportToCSV = () => {
        if (employeeScores.length === 0) {
            alert('No data to export for this cycle.');
            return;
        }

        const headers = ['Employee Name', 'Role', 'Department', 'Score', 'Category', 'Status'];

        const rows = employeeScores.map(emp => {
            const ev = evaluations.find(e => e.employeeId === emp.id && e.cycleId === activeCycle?.id);
            const status = ev?.status?.replace('_', ' ') || 'pending';
            return [
                emp.name,
                emp.role,
                emp.department,
                emp.scoreData.score,
                emp.scoreData.category.label,
                status
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Reports_${activeCycle?.name || 'Cycle'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Performance Reports</h2>
                    <p className="section-subtitle">Cycle analytics, scores, and performance distribution</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={exportToCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Export CSV
                    </button>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '220px' }}>
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
                            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>CYCLE</span>
                        </div>
                        <select
                            className="form-select"
                            value={selectedCycleId}
                            onChange={(e) => setSelectedCycleId(e.target.value)}
                            disabled={cycles.length === 0}
                            style={{
                                paddingLeft: '75px',
                                fontWeight: 700,
                                fontSize: '13px',
                                width: '100%',
                                background: 'var(--bg-secondary)',
                                height: '42px'
                            }}
                        >
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.status})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Pipeline Summary Cards (Filters) */}
            {activeCycle && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    {[
                        { id: 'all', label: 'All Profiles', color: 'var(--text-secondary)', count: allEmployeesData.length },
                        { id: 'not_started', label: 'Not Started', color: 'var(--text-muted)', count: summaryCounts.not_started },
                        { id: 'draft', label: 'Drafts', color: '#f59e0b', count: summaryCounts.draft },
                        { id: 'submitted', label: 'Awaiting Manager', color: '#3b82f6', count: summaryCounts.submitted },
                        { id: 'evaluated', label: 'Awaiting HR', color: '#a855f7', count: summaryCounts.evaluated },
                        { id: 'approved', label: 'Completed', color: '#10b981', count: summaryCounts.approved },
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
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {card.id !== 'all' && card.id !== 'not_started' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: card.color }} />}
                            <div style={{ color: filterStatus === card.id ? card.color : 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: card.color, marginTop: '8px' }}>{card.count}</div>
                        </div>
                    ))}
                </div>
            )}

            {employeeScores.length === 0 && (
                <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '12px' }}>
                    <Icons.Chart style={{ width: '20px', height: '20px', color: 'var(--yellow)' }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Analytics Pending Approval</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Score distributions and performance charts will be available here once appraisals are officially <b>approved by HR</b>.</div>
                    </div>
                </div>
            )}

            {employeeScores.length > 0 && (
                <>
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
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        innerRadius={40}
                                        paddingAngle={2}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#151731', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Comprehensive Pipeline Table */}
                    <div className="table-container" style={{ marginTop: '24px' }}>
                        <div className="table-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Comprehensive Pipeline Report</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Status tracking for all employees in the current cycle</p>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Pipeline Status</th>
                                    <th>Pending Action From</th>
                                    <th>Final Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allEmployeesData
                                    .filter(emp => filterStatus === 'all' || emp.pipelineStatus === filterStatus)
                                    .map(emp => (
                                    <tr key={emp.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Avatar avatarData={emp.avatar} name={emp.name} size={28} />
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${emp.role === 'hr' ? 'badge-purple' : emp.role === 'manager' ? 'badge-blue' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{emp.role}</span></td>
                                        <td>{emp.department}</td>
                                        
                                        <td>
                                            <span className={`badge ${emp.statusObj.badge}`} style={{ 
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                boxShadow: emp.pipelineStatus === 'approved' ? '0 2px 8px rgba(16,185,129,0.2)' : 'none' 
                                            }}>
                                                {emp.pipelineStatus === 'approved' && <Icons.Check style={{ width: '12px', height: '12px' }} />}
                                                {emp.statusObj.label}
                                            </span>
                                        </td>
                                        
                                        <td>
                                            {emp.statusObj.pendingAction !== 'None' ? (
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {emp.statusObj.pendingAction}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>

                                        <td>
                                            {emp.scoreData ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--purple-light)' }}>
                                                        {emp.scoreData.score}
                                                    </div>
                                                    <span className={`badge ${emp.scoreData.category.badge}`}>{emp.scoreData.category.label}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* All cycles summary */}
            <div className="table-container" style={{ marginTop: '24px' }}>
                <div className="table-header"><h3>📁 Appraisal History</h3></div>
                <table>
                    <thead><tr><th>Cycle</th><th>Period</th><th>Status</th><th>Evaluations</th></tr></thead>
                    <tbody>
                        {cycles.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                                <td>{c.startDate} → {c.endDate}</td>
                                <td><span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'closed' ? 'badge-red' : 'badge-gray'}`}>{c.status}</span></td>
                                <td>{evaluations.filter(e => e.cycleId === c.id).length} evaluations</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

