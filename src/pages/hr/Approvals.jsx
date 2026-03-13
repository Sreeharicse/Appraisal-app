import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

const StarRating = ({ value, onChange, readonly = false }) => {
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => !readonly && onChange(star)}
                    style={{
                        background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer',
                        padding: '4px', color: star <= value ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                        transition: 'color 0.2s', fontSize: '20px', lineHeight: 1
                    }}
                >
                    ★
                </button>
            ))}
        </div>
    );
};

const HR_QUESTIONS = [
    { id: 'hr_q1', label: 'Cultural Fit & Values Alignment', desc: 'How well does the employee embody company core values?' },
    { id: 'hr_q2', label: 'Policy Compliance & Conduct', desc: 'Adherence to workplace policies, attendance, and professional conduct.' },
];

export default function Approvals() {
    const { evaluations, users, cycles, goals, approveEvaluation, rejectEvaluation, getScore, currentUser, getCategory } = useApp();
    const [comment, setComment] = useState({});
    const [hrRatings, setHrRatings] = useState({});

    const setHrRatingForQuestion = (evalId, qId, value) => {
        setHrRatings(prev => ({
            ...prev,
            [evalId]: { ...(prev[evalId] || {}), [qId]: value }
        }));
    };

    const getAvgHrRating = (evalId) => {
        const ratings = hrRatings[evalId] || {};
        const values = HR_QUESTIONS.map(q => ratings[q.id] || 0);
        if (values.includes(0)) return 0; // Not fully rated
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    };

    const filterByRole = (ev) => {
        const emp = users.find(u => u.id === ev.employeeId);
        if (currentUser.role === 'admin' || currentUser.role === 'hr') {
            return emp?.role !== 'admin';
        }
        return false;
    };

    const pending = evaluations.filter(e => e.status === 'pending_approval' && filterByRole(e));
    const historical = evaluations.filter(e => e.status !== 'pending_approval' && filterByRole(e));

    const getUserById = (id) => users.find(u => u.id === id);
    const getCycleById = (id) => cycles.find(c => c.id === id);

    const handleApprove = (evalId) => {
        const avgHr = getAvgHrRating(evalId);
        if (avgHr === 0) return;
        approveEvaluation(evalId, comment[evalId] || '', avgHr);
    };

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Approval Queue</h2>
                    <p className="section-subtitle">
                        {currentUser.role === 'admin'
                            ? 'Review and approve HR & Manager evaluations'
                            : 'Review and approve manager evaluations'}
                    </p>
                </div>
                <span className="badge badge-yellow">
                    <Icons.Clock style={{ width: '14px', height: '14px', marginRight: '4px' }} /> {pending.length} Pending
                </span>
            </div>

            {pending.length === 0 && (
                <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--blue-light)' }}><Icons.Check style={{ width: '60px', height: '60px' }} /></div>
                    <h3 style={{ marginBottom: '8px' }}>No Pending Approvals</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                        Evaluations appear here once managers complete reviews for their team members.
                    </p>
                </div>
            )}

            {pending.map(ev => {
                const emp = getUserById(ev.employeeId);
                const mgr = getUserById(ev.managerId);
                const cycle = getCycleById(ev.cycleId);
                const avgHr = getAvgHrRating(ev.id);
                const allRated = avgHr > 0;
                
                // Calculate live preview score
                const previewScoreMath = Math.round(((ev.workPerformanceRating || 0) / 5 * 45) + ((ev.behavioralRating || 0) / 5 * 45) + (avgHr / 5 * 10));
                const previewCategory = getCategory(previewScoreMath);

                return (
                    <div key={ev.id} className="card" style={{ marginBottom: '20px' }}>
                        {/* Employee Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="avatar">{emp?.avatar}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{emp?.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Evaluated by {mgr?.name} · {ev.submittedAt}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cycle?.name}</div>
                                </div>
                            </div>
                            {/* Live Score Preview */}
                            <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    Final Score Preview
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--purple)', opacity: allRated ? 1 : 0.5 }}>{previewScoreMath || '—'}</div>
                                {previewScoreMath > 0 && <span className={`badge ${previewCategory.badge}`}>{previewCategory.label}</span>}
                            </div>
                        </div>

                        {/* Manager Score Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Technical <span style={{ color: 'var(--indigo)' }}>(45%)</span></div>
                                <div style={{ fontWeight: 700 }}>{Math.round((ev.workPerformanceRating || 0) * 10) / 10}/5</div>
                            </div>
                            <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(6,182,212,0.15)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Behavioural <span style={{ color: 'var(--cyan)' }}>(45%)</span></div>
                                <div style={{ fontWeight: 700 }}>{Math.round((ev.behavioralRating || 0) * 10) / 10}/5</div>
                            </div>
                            <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>HR Assessment <span style={{ color: 'var(--yellow)' }}>(10%)</span></div>
                                <div style={{ fontWeight: 700, opacity: allRated ? 1 : 0.5 }}>{allRated ? avgHr.toFixed(1) : '?'} / 5</div>
                            </div>
                        </div>

                        {/* HR Assessment Form */}
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px', color: 'var(--purple-light)' }}>
                                📋 HR Assessment (10% of Final Score)
                            </div>
                            
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {HR_QUESTIONS.map(q => (
                                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{q.label}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.desc}</div>
                                        </div>
                                        <StarRating 
                                            value={(hrRatings[ev.id] || {})[q.id] || 0} 
                                            onChange={(val) => setHrRatingForQuestion(ev.id, q.id, val)} 
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>HR Comment (Sent to Employee)</div>
                                <textarea 
                                    className="form-input" 
                                    placeholder="HR feedback..." 
                                    style={{ minHeight: '60px', fontSize: '13px' }}
                                    value={comment[ev.id] || ''}
                                    onChange={e => setComment(prev => ({ ...prev, [ev.id]: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Manager Feedback */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Manager Feedback</div>
                            <p style={{ fontSize: '13px', lineHeight: '1.6' }}>{ev.feedback || 'No feedback provided.'}</p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn btn-success"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: allRated ? 1 : 0.5 }}
                                disabled={!allRated}
                                onClick={() => handleApprove(ev.id)}>
                                <Icons.Check /> {allRated ? 'Approve Evaluation' : 'Complete HR Ratings to Approve'}
                            </button>
                            <button className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={() => { if (window.confirm('Reject this evaluation?')) rejectEvaluation(ev.id, comment[ev.id]); }}>
                                <Icons.X /> Reject
                            </button>
                        </div>
                    </div>
                );
            })}

            {historical.length > 0 && (
                <div className="table-container" style={{ marginTop: '24px' }}>
                    <div className="table-header"><h3>History ({historical.length})</h3></div>
                    <table>
                        <thead><tr><th>Employee</th><th>Cycle</th><th>Score</th><th>HR Rating</th><th>Category</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                            {historical.map(ev => {
                                const emp = getUserById(ev.employeeId);
                                const cycle = getCycleById(ev.cycleId);
                                const scoreData = getScore(ev.employeeId, ev.cycleId);
                                return (
                                    <tr key={ev.id}>
                                        <td style={{ fontWeight: 600 }}>{emp?.name}</td>
                                        <td>{cycle?.name}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--purple-light)' }}>{scoreData?.score ?? '—'}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--yellow)' }}>{ev.hrRating ? ev.hrRating.toFixed(1) + ' / 5' : '—'}</td>
                                        <td>{scoreData ? <span className={`badge ${scoreData.category.badge}`}>{scoreData.category.label}</span> : '—'}</td>

                                        <td><span className={`badge ${ev.status === 'approved' ? 'badge-green' : 'badge-red'}`}>{ev.status}</span></td>
                                        <td>{ev.submittedAt}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
