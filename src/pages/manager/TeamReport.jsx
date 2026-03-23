import React from 'react';
import { useApp } from '../../context/AppContext';

export default function TeamReport() {
    const { currentUser, users, cycles, evaluations, selfReviews, getScore } = useApp();
    const team = users.filter(u => u.managerId === currentUser.id);

    // Sort cycles descending by date
    const sortedCycles = [...cycles].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Team Report & History</h2>
                    <p className="section-subtitle">Comprehensive performance summary for your team members across all cycles.</p>
                </div>
            </div>

            {team.length === 0 ? (
                <div className="alert alert-warning">⚠️ No team members assigned.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {team.map(emp => (
                        <div key={emp.id} className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                                <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '16px' }}>{emp.avatar}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>{emp.name}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{emp.department} • {emp.designation}</div>
                                </div>
                            </div>

                            <div className="table-container" style={{ margin: 0, boxShadow: 'none' }}>
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
                                            const ev = evaluations.find(e => e.employeeId === emp.id && e.cycleId === c.id);
                                            const hasSr = selfReviews.some(sr => sr.employeeId === emp.id && sr.cycleId === c.id);
                                            const scoreData = getScore(emp.id, c.id);

                                            // Only show the cycle if the employee participated (evaluation or self-review) OR if it is currently active.
                                            if (!ev && !hasSr && c.status !== 'active') return null;

                                            return (
                                                <tr key={c.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}><span style={{ textTransform: 'capitalize' }}>{c.status}</span></div>
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
                                                                <div style={{ fontWeight: 800, fontSize: '15px' }}>{scoreData.score}%</div>
                                                                <span className={`badge ${scoreData.category.badge}`}>{scoreData.category.label}</span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Not available yet</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sortedCycles.filter(c => evaluations.some(e => e.employeeId === emp.id && e.cycleId === c.id) || selfReviews.some(sr => sr.employeeId === emp.id && sr.cycleId === c.id) || c.status === 'active').length === 0 && (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No cycle history found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
