import React from 'react';
import { useApp } from '../../context/AppContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#10b981', '#06b6d4', '#7c3aed', '#f59e0b', '#ef4444'];

export default function Reports() {
    const { users, cycles, evaluations, goals, getScore, currentUser } = useApp();
    const [selectedCycleId, setSelectedCycleId] = React.useState('');
    const employees = (currentUser?.role === 'admin' || currentUser?.role === 'hr')
        ? users.filter(u => u.role !== 'admin')
        : users.filter(u => u.role === 'employee');

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

    // Bar chart data
    const barData = employeeScores.map(e => ({
        name: e.name.split(' ')[0],
        score: e.scoreData.score,
        category: e.scoreData.category.label,
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
                <div style={{ background: '#151731', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{payload[0].payload.name}</div>
                    <div style={{ color: '#a78bfa', fontSize: '20px', fontWeight: 800 }}>{payload[0].value}</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Performance Reports</h2>
                    <p className="section-subtitle">Cycle analytics, scores, and performance distribution</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        className="form-select"
                        style={{ minWidth: '200px' }}
                        value={selectedCycleId}
                        onChange={(e) => setSelectedCycleId(e.target.value)}
                    >
                        {cycles.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {employeeScores.length === 0 && (
                <div className="alert alert-warning">⚠️ No evaluated employees yet. Scores will appear once managers submit evaluations.</div>
            )}

            {employeeScores.length > 0 && (
                <>
                    <div className="charts-grid" style={{ marginBottom: '24px' }}>
                        <div className="chart-card">
                            <div className="chart-title">📊 Individual Performance Scores</div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <div className="chart-title">🥧 Performance Category Distribution</div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={pieData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} width={110} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: '#151731', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Employees" barSize={24}>
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Individual Score Table */}
                    <div className="table-container">
                        <div className="table-header"><h3>Individual Reports</h3></div>
                        <table>
                            <thead>
                                <tr><th>Employee</th><th>Role</th><th>Department</th><th>Score</th><th>Category</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {employeeScores.map(emp => {

                                    const ev = evaluations.find(e => e.employeeId === emp.id && e.cycleId === activeCycle?.id);
                                    return (
                                        <tr key={emp.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>{emp.avatar}</div>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${emp.role === 'hr' ? 'badge-purple' : emp.role === 'manager' ? 'badge-blue' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{emp.role}</span></td>
                                            <td>{emp.department}</td>

                                            <td>
                                                <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--purple-light)' }}>
                                                    {emp.scoreData.score}
                                                </div>
                                                <div className="progress-bar" style={{ width: '80px' }}>
                                                    <div className="progress-fill" style={{ width: `${emp.scoreData.score}%` }} />
                                                </div>
                                            </td>
                                            <td><span className={`badge ${emp.scoreData.category.badge}`}>{emp.scoreData.category.label}</span></td>
                                            <td><span className={`badge ${ev?.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>{ev?.status?.replace('_', ' ') || 'pending'}</span></td>
                                        </tr>
                                    );
                                })}
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
