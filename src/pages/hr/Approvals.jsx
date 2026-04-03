import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateScore } from '../../context/AppContext';
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
    const { evaluations, users, cycles, approvals, approveEvaluation, rejectEvaluation, saveHRDraft, getScore, currentUser, getCategory } = useApp();
    const [comment, setComment] = React.useState({});
    const [hrRatings, setHrRatings] = React.useState({});

    // Initialize state from existing metadata drafts
    React.useEffect(() => {
        const initialComments = {};
        const initialRatings = {};
        evaluations.forEach(ev => {
            if (ev.status === 'pending_approval') {
                if (ev.metadata?.hr_comment) initialComments[ev.id] = ev.metadata.hr_comment;
                if (ev.metadata?.hr_ratings) initialRatings[ev.id] = ev.metadata.hr_ratings;
            }
        });
        setComment(initialComments);
        setHrRatings(initialRatings);
    }, [evaluations.length]); // Re-run if evaluation count changes

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

    const getCurrentApproverId = (ev) => {
        let currentApproverId = users.find(u => u.id === ev.managerId)?.managerId;
        const evApprovals = approvals.filter(a => String(a.evalId) === String(ev.id));
        
        // Follow the approval chain
        let hasMoreApprovers = true;
        while(currentApproverId && hasMoreApprovers) {
            const hasApproved = evApprovals.some(a => a.approvedBy === currentApproverId);
            if (hasApproved) {
                currentApproverId = users.find(u => u.id === currentApproverId)?.managerId;
            } else {
                hasMoreApprovers = false;
            }
        }
        return currentApproverId;
    };

    const filterByRole = (ev) => {
        const currentApproverId = getCurrentApproverId(ev);
        
        if (currentUser.role === 'manager') {
            return currentApproverId === currentUser.id;
        }
        if (currentUser.role === 'hr' || currentUser.role === 'admin') {
            return !currentApproverId;
        }
        return false;
    };

    const pending = evaluations.filter(e => e.status === 'pending_approval' && filterByRole(e));
    const historical = evaluations.filter(e => e.status !== 'pending_approval' && filterByRole(e));

    const getUserById = (id) => users.find(u => u.id === id);
    const getCycleById = (id) => cycles.find(c => c.id === id);

    const handleApprove = (evalId) => {
        const currentApproverId = getCurrentApproverId(evaluations.find(e => e.id === evalId));
        
        // If manager is approving (not final step)
        if (currentApproverId && currentUser.role === 'manager') {
            approveEvaluation(evalId, comment[evalId] || '', 0, true); // true = isIntermediate
            return;
        }

        // Final HR/Admin approval
        const avgHr = getAvgHrRating(evalId);
        if (avgHr === 0) {
            alert('Please complete all HR ratings before final approval.');
            return;
        }
        approveEvaluation(evalId, comment[evalId] || '', avgHr, false);
    };

    return (
        <div>
            <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
                <div>
                    <h2 className="section-title" style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>Approval Queue</h2>
                    <p className="section-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {currentUser.role === 'admin'
                            ? 'Review and approve HR & Manager evaluations'
                            : 'Review and approve employee evaluations'}
                    </p>
                </div>
            </div>

            {pending.length === 0 && (
                <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--blue-light)' }}><Icons.Check style={{ width: '60px', height: '60px' }} /></div>
                    <h3 style={{ marginBottom: '8px' }}>No Pending Approvals</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                        Evaluations will appear here when they reach your level in the approval hierarchy.
                    </p>
                </div>
            )}

            {pending.map(ev => {
                const emp = getUserById(ev.employeeId);
                const mgr = getUserById(ev.managerId);
                const cycle = getCycleById(ev.cycleId);
                const avgHr = getAvgHrRating(ev.id);
                const allRated = avgHr > 0;

                // Calculate live preview score using Core vs. Behavioral weighting
                const comps = ev.metadata?.competencies || {};
                const CORE_IDS = ['q1', 'q2', 'q3', 'q4'];
                const BEHAVIORAL_IDS = ['q5', 'q6', 'q7', 'q10', 'q11', 'q14'];
                const coreRatings = CORE_IDS.map(id => comps[id]?.rating).filter(r => r > 0);
                const behavioralRatings = BEHAVIORAL_IDS.map(id => comps[id]?.rating).filter(r => r > 0);
                const coreAvg = coreRatings.length > 0 ? coreRatings.reduce((a, b) => a + b, 0) / coreRatings.length : 0;
                const behavioralAvg = behavioralRatings.length > 0 ? behavioralRatings.reduce((a, b) => a + b, 0) / behavioralRatings.length : 0;
                const previewScoreMath = calculateScore(coreAvg, behavioralAvg, ev.subRating || 0, avgHr);
                const previewCategory = getCategory(previewScoreMath);

                return (
                    <div key={ev.id} className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                        {/* Employee Header Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="avatar">{emp?.avatar}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{emp?.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Evaluated by {mgr?.name} · {ev.submittedAt} · {cycle?.name}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {ev.finalRating && <span className="badge badge-green" style={{ padding: '5px 12px', fontSize: '12px' }}>{ev.finalRating}</span>}
                            </div>
                        </div>

                        {/* Two-Column Layout: Score Breakdown | HR Assessment */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                            {/* LEFT: Score Preview + Breakdown */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)' }}>
                                {/* Score Circle + Label */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                                        background: `conic-gradient(var(--purple) ${previewScoreMath}%, var(--border) 0)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: allRated ? 1 : 0.5
                                    }}>
                                        <div style={{
                                            width: '56px', height: '56px', borderRadius: '50%',
                                            background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{previewScoreMath || '—'}</div>
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>/100</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Score Preview</div>
                                        {previewScoreMath > 0 && <span className={`badge ${previewCategory.badge}`} style={{ fontSize: '12px' }}>{previewCategory.label}</span>}
                                        {!previewScoreMath && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Complete HR ratings</span>}
                                    </div>
                                </div>

                                {/* Compact Breakdown Bars */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Core */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Core Performance <span style={{ color: 'var(--blue-light)', fontWeight: 700 }}>45%</span></span>
                                            <span style={{ fontWeight: 700, color: 'var(--blue-light)' }}>{coreAvg.toFixed(1)}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${(coreAvg / 5) * 100}%`, background: 'var(--blue-light)' }} /></div>
                                    </div>
                                    {/* Behavioral */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Behavioral Traits <span style={{ color: '#06b6d4', fontWeight: 700 }}>30%</span></span>
                                            <span style={{ fontWeight: 700, color: '#06b6d4' }}>{behavioralAvg.toFixed(1)}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${(behavioralAvg / 5) * 100}%`, background: '#06b6d4' }} /></div>
                                    </div>
                                    {/* Sub-Rating */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sub-Rating <span style={{ color: 'var(--purple)', fontWeight: 700 }}>25%</span></span>
                                            <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{ev.subRating || '—'}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${((ev.subRating || 0) / 5) * 100}%`, background: 'var(--purple)' }} /></div>
                                    </div>
                                    {/* HR */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>HR Assessment <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>10%</span></span>
                                            <span style={{ fontWeight: 700, color: allRated ? 'var(--yellow)' : 'var(--text-muted)' }}>{allRated ? avgHr.toFixed(1) : '—'}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '6px' }}><div className="progress-fill" style={{ width: allRated ? `${(avgHr / 5) * 100}%` : '0%', background: 'var(--yellow)' }} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: HR Assessment Form */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '14px', color: 'var(--purple-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📋 HR Assessment
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                    {HR_QUESTIONS.map(q => (
                                        <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>{q.label}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.desc}</div>
                                            </div>
                                            <StarRating
                                                value={(hrRatings[ev.id] || {})[q.id] || 0}
                                                onChange={(val) => setHrRatingForQuestion(ev.id, q.id, val)}
                                                readonly={currentUser.role === 'manager'}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{currentUser.role === 'manager' ? 'Manager Comment' : 'HR Comment (Sent to Employee)'}</div>
                                    <textarea
                                        className="form-input"
                                        placeholder={currentUser.role === 'manager' ? "Leave a comment for the next approver..." : "HR feedback..."}
                                        style={{ height: '70px', fontSize: '12px', overflowY: 'auto', resize: 'none' }}
                                        value={comment[ev.id] || ''}
                                        onChange={e => setComment(prev => ({ ...prev, [ev.id]: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Manager Feedback — compact */}
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Manager Summary Feedback</div>
                            <p className="read-only-text" style={{ fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word', overflowWrap: 'break-word', maxHeight: '72px', overflowY: 'auto', margin: 0 }}>
                                {ev.feedback || 'No feedback provided.'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn btn-success"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (currentUser.role === 'manager' || allRated) ? 1 : 0.5 }}
                                disabled={currentUser.role !== 'manager' && !allRated}
                                onClick={() => handleApprove(ev.id)}>
                                <Icons.Check /> {currentUser.role === 'manager' ? 'Approve & Forward' : (allRated ? 'Final Approve Evaluation' : 'Complete HR Ratings to Approve')}
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={async () => {
                                    const res = await saveHRDraft(ev.id, comment[ev.id] || '', hrRatings[ev.id] || {});
                                    if (res) alert('Progress saved successfully.');
                                }}>
                                💾 Save Progress
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
