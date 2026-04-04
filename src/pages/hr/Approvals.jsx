import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateScore } from '../../context/AppContext';
import Icons from '../../components/Icons';
import Avatar from '../../components/Avatar';

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

    const filterByRole = (ev) => {
        const empRole = getUserById(ev.employeeId)?.role;

        if (currentUser.role === 'hr') {
            // HR approves Employee & Manager evaluations
            return empRole === 'employee' || empRole === 'manager';
        }
        if (currentUser.role === 'admin') {
            // Admin approves HR & Admin evaluations
            return empRole === 'hr' || empRole === 'admin';
        }

        return false;
    };

    const pending = evaluations.filter(e => e.status === 'pending_approval' && filterByRole(e));
    const historical = evaluations.filter(e => e.status !== 'pending_approval' && filterByRole(e));

    const getUserById = (id) => users.find(u => u.id === id);
    const getCycleById = (id) => cycles.find(c => c.id === id);

    const handleApprove = (evalId) => {
        // Final HR/Admin approval
        const avgHr = getAvgHrRating(evalId);
        if (avgHr === 0) {
            alert('Please complete all HR ratings before final approval.');
            return;
        }
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

                // Calculate live preview score using new flat 70/20/10 formula
                const comps = ev.metadata?.competencies || {};
                const allRatings = Object.values(comps).map(c => c?.rating).filter(r => r > 0);
                const allQsAvg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
                const previewScoreMath = calculateScore(allQsAvg, 0, ev.subRating || 0, avgHr);
                const previewCategory = getCategory(previewScoreMath);

                return (
                    <div key={ev.id} className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                        {/* Employee Header Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Avatar avatarData={emp?.avatar} name={emp?.name} size={40} />
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

                                {/* Compact Breakdown Bars (70/20/10 alignment) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Competencies (70%) */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Competencies Avg <span style={{ color: 'var(--blue-light)', fontWeight: 700 }}>70%</span></span>
                                            <span style={{ fontWeight: 700, color: 'var(--blue-light)' }}>{allQsAvg > 0 ? allQsAvg.toFixed(1) : '—'}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '5px' }}><div className="progress-fill" style={{ width: `${(allQsAvg / 5) * 100}%`, background: 'var(--blue-light)' }} /></div>
                                    </div>

                                    {/* Manager Sub-Rating (20%) */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Manager Sub-Rating <span style={{ color: 'var(--purple)', fontWeight: 700 }}>20%</span></span>
                                            <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{ev.subRating || '—'}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '5px' }}><div className="progress-fill" style={{ width: `${((ev.subRating || 0) / 5) * 100}%`, background: 'var(--purple)' }} /></div>
                                    </div>

                                    {/* HR Assessment (10%) */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>HR Assessment <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>10%</span></span>
                                            <span style={{ fontWeight: 700, color: allRated ? 'var(--yellow)' : 'var(--text-muted)' }}>{allRated ? avgHr.toFixed(1) : '—'}/5</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '5px' }}><div className="progress-fill" style={{ width: allRated ? `${(avgHr / 5) * 100}%` : '0%', background: 'var(--yellow)' }} /></div>
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
                                                readonly={cycle?.status === 'closed' || currentUser.role === 'manager'}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{currentUser.role === 'manager' ? 'Manager Comment' : 'HR Comment (Sent to Employee)'}</div>
                                    <textarea
                                        className="form-input"
                                        placeholder="HR feedback..."
                                        style={{ height: '70px', fontSize: '12px', overflowY: 'auto', resize: 'none' }}
                                        value={comment[ev.id] || ''}
                                        onChange={e => setComment(prev => ({ ...prev, [ev.id]: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Manager Overall Assessment — Rating Classification + Sub-Rating + Feedback */}
                        <div style={{ background: 'rgba(99, 102, 241, 0.03)', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manager Overall Assessment</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {ev.finalRating && <span className="badge badge-green" style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700 }}>{ev.finalRating}</span>}
                                    {ev.subRating && <span className="badge badge-purple" style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700 }}>Score: {ev.subRating}/5</span>}
                                </div>
                            </div>
                            <p className="read-only-text" style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0, maxHeight: '120px', overflowY: 'auto', fontStyle: ev.feedback ? 'normal' : 'italic' }}>
                                {ev.feedback || 'No manager feedback provided.'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn btn-success"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: allRated ? 1 : 0.5 }}
                                disabled={!allRated}
                                onClick={() => handleApprove(ev.id)}>
                                <Icons.Check /> {allRated ? 'Approve Evaluation' : 'Complete HR Ratings to Approve'}
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
