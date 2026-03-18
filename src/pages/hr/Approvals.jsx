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
                        padding: '4px', color: star <= value ? 'var(--yellow)' : 'var(--text-muted)',
                        opacity: star <= value ? 1 : 0.3,
                        transition: 'all 0.2s', fontSize: '20px', lineHeight: 1
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
    const { evaluations, users, cycles, approveEvaluation, rejectEvaluation, getScore, currentUser, getCategory } = useApp();
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
            <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
                <div>
                    <h2 className="section-title" style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>Approval Queue</h2>
                    <p className="section-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {currentUser.role === 'admin'
                            ? 'Review and approve HR & Manager evaluations'
                            : 'Review and approve manager evaluations'}
                    </p>
                </div>
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
                
                // Calculate live preview score: 90% Sub-Rating (Manager) + 10% HR Assessment
                const previewScoreMath = Math.round(((ev.subRating || 0) / 5 * 90) + (avgHr / 5 * 10));
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

                        {/* Manager Rating Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: 'rgba(168, 85, 247, 0.08)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Manager Rating <span style={{ color: 'var(--purple)' }}>(90%)</span></div>
                                <div style={{ fontWeight: 700 }}>{ev.subRating || '0'}/5</div>
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
                                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--nm-shadow-out-sm)' }}>
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
                                    style={{ minHeight: '80px', fontSize: '13px' }}
                                    value={comment[ev.id] || ''}
                                    onChange={e => setComment(prev => ({ ...prev, [ev.id]: e.target.value }))}
                                    onInput={e => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                            </div>
                        </div>

                        {/* Manager Final Rating Block */}
                        <div className="card" style={{ padding: '24px', marginBottom: '20px', border: '1px solid var(--border)', boxShadow: 'var(--nm-shadow-out-sm)' }}>
                            <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>FINAL RATING CLASSIFICATION</div>
                            <p className="section-subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Manager's assigned overall final rating and sub-rating.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>FINAL RATING</label>
                                    <div className="form-input" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                                        {ev.finalRating || 'Not Classified'}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SUB-RATING (1-5, HIDDEN FROM EMPLOYEE)</label>
                                    <div className="form-input" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                                        {ev.subRating ? ev.subRating : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Manager Feedback */}
                        <div className="card" style={{ padding: '24px', marginBottom: '20px', border: '1px solid var(--border)', boxShadow: 'var(--nm-shadow-out-sm)' }}>
                            <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>MANAGER SUMMARY FEEDBACK</div>
                            <p className="read-only-text" style={{ fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word', maxHeight: '150px', overflowY: 'auto' }}>
                                {ev.feedback || 'No feedback provided.'}
                            </p>
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
