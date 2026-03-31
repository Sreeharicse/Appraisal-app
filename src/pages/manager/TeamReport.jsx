import React from 'react';
import { useApp } from '../../context/AppContext';
import Avatar from '../../components/Avatar';

export default function TeamReport() {
    const { currentUser, users, cycles, evaluations, selfReviews, getScore } = useApp();
    const team = users.filter(u => u.managerId === currentUser.id);

    const [selectedEmpId, setSelectedEmpId] = React.useState(team[0]?.id || null);

    // Sync selectedEmpId if team changes or on mount
    React.useEffect(() => {
        if (!selectedEmpId && team.length > 0) {
            setSelectedEmpId(team[0].id);
        }
    }, [team, selectedEmpId]);

    const selectedEmp = team.find(e => String(e.id) === String(selectedEmpId));

    // Sort cycles descending by date
    const sortedCycles = [...cycles].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Team Report & History</h2>
                    <p className="section-subtitle">Select a team member to view their comprehensive performance summary across all cycles.</p>
                </div>
            </div>

            {team.length === 0 ? (
                <div className="alert alert-warning">⚠️ No team members assigned.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Horizontal Employee Selector */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {team.map(emp => (
                            <button
                                key={emp.id}
                                onClick={() => setSelectedEmpId(emp.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 16px', borderRadius: '12px',
                                    border: selectedEmpId === emp.id ? '2px solid var(--purple)' : '1px solid var(--border)',
                                    background: selectedEmpId === emp.id ? 'var(--bg-card)' : 'transparent',
                                    boxShadow: selectedEmpId === emp.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    minWidth: 'max-content',
                                    outline: 'none'
                                }}
                            >
                                <Avatar avatarData={emp.avatar} name={emp.name} size={32} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: selectedEmpId === emp.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                        {emp.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {emp.designation}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Selected Employee Card */}
                    {selectedEmp && (
                        <div className="card" style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '24px' }}>
                                <Avatar avatarData={selectedEmp.avatar} name={selectedEmp.name} size={64} />
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedEmp.name}</h3>
                                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{selectedEmp.department} • {selectedEmp.designation}</div>
                                </div>
                            </div>

                            <div className="table-container" style={{ margin: 0, boxShadow: 'none', background: 'transparent' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Appraisal Cycle</th>
                                            <th>Self Review</th>
                                            <th>Manager Evaluation</th>
                                            <th>Final Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedCycles.map(c => {
                                            const ev = evaluations.find(e => e.employeeId === selectedEmp.id && e.cycleId === c.id);
                                            const hasSr = selfReviews.some(sr => sr.employeeId === selectedEmp.id && sr.cycleId === c.id);
                                            const scoreData = getScore(selectedEmp.id, c.id);

                                            // Only show the cycle if the employee participated (evaluation or self-review) OR if it is currently active.
                                            if (!ev && !hasSr && c.status !== 'active') return null;

                                            return (
                                                <tr key={c.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}><span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{c.status}</span></div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${hasSr ? 'badge-green' : 'badge-gray'}`}>
                                                            {hasSr ? '✓ Submitted' : '⏳ Pending'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${ev ? 'badge-green' : 'badge-gray'}`}>
                                                            {ev ? `✓ ${ev.status.replace('_', ' ')}` : '⏳ Pending'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {scoreData ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--purple-light)' }}>{scoreData.score}%</div>
                                                                <span className={`badge ${scoreData.category.badge}`}>{scoreData.category.label}</span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Not available yet</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sortedCycles.filter(c => evaluations.some(e => e.employeeId === selectedEmp.id && e.cycleId === c.id) || selfReviews.some(sr => sr.employeeId === selectedEmp.id && sr.cycleId === c.id) || c.status === 'active').length === 0 && (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No cycle history found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
