import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function Results() {
    const { currentUser, cycles, getEvaluation, getSelfReview, getScore, getUserById, approvals } = useApp();

    const [selectedCycleId, setSelectedCycleId] = useState('');

    useEffect(() => {
        if (!selectedCycleId && cycles.length > 0) {
            // Default to an active cycle, or the newest cycle if none are active
            const activeCycle = cycles.find(c => c.status === 'active');
            setSelectedCycleId(activeCycle ? activeCycle.id : cycles[0].id);
        }
    }, [cycles, selectedCycleId]);

    if (!cycles || cycles.length === 0) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading results...</div>;

    const cycle = cycles.find(c => String(c.id) === String(selectedCycleId)) || cycles[0];
    const ev = cycle ? getEvaluation(currentUser.id, cycle.id) : null;
    const scoreData = ev ? getScore(currentUser.id, cycle.id) : null;
    const manager = ev ? getUserById(ev.managerId) : null;
    const approval = ev ? approvals.find(a => a.evalId === ev.id) : null;

    const hasApprovedEval = ev && ev.status === 'approved';
    const hasPendingEval = ev && ev.status === 'pending_approval';

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <h2 className="section-title">My Performance Results</h2>
                    <p className="section-subtitle">Final scores and feedback for the selected project</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select className="form-select" value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} style={{ width: '220px' }}>
                        {cycles.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.status === 'closed' ? '(Closed)' : ''}
                            </option>
                        ))}
                    </select>
                    {hasApprovedEval && (
                        <span className="badge badge-green" style={{ padding: '6px 14px' }}>Approved</span>
                    )}
                    {hasPendingEval && (
                        <span className="badge badge-yellow" style={{ padding: '6px 14px' }}>Pending Approval</span>
                    )}
                </div>
            </div>

            {!hasApprovedEval ? (
                // BLANK SLATE
                <div className="card" style={{ textAlign: 'center', padding: '60px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {hasPendingEval ? '⏳' : '📊'}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {hasPendingEval
                            ? (currentUser.role === 'hr' || currentUser.role === 'manager' ? 'Awaiting Admin Approval' : 'Awaiting HR Approval')
                            : 'No results available yet'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px', maxWidth: '400px', margin: '8px auto 0' }}>
                        {hasPendingEval
                            ? (currentUser.role === 'hr' || currentUser.role === 'manager'
                                ? 'Your manager has submitted your evaluation. Results will be visible here once the Admin officially approves it.'
                                : 'Your manager has submitted your evaluation. Results will be visible here once HR officially approves it.')
                            : (currentUser.role === 'hr' || currentUser.role === 'manager'
                                ? 'Once your evaluation is completed and approved by the Admin, your results will appear here.'
                                : 'Once your manager completes your evaluation and HR approves it, your results will appear here.')}
                    </p>
                </div>
            ) : (
                // SCORE METRICS
                <>
                    {/* Score Hero */}
                    <div className="card" style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '120px', height: '120px', borderRadius: '50%',
                                    background: `conic-gradient(var(--purple) ${scoreData?.score || 0}%, #f1f5f9 0)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                                }}>
                                    <div style={{
                                        width: '92px', height: '92px', borderRadius: '50%',
                                        background: 'var(--bg-card)', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', position: 'absolute',
                                        boxShadow: 'var(--nm-shadow-in-sm)'
                                    }}>
                                        <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{scoreData?.score || 0}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Performance Category</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span className={`badge ${scoreData?.category?.badge}`} style={{ fontSize: '18px', padding: '8px 20px', borderRadius: '12px' }}>
                                        {scoreData?.category?.label}
                                    </span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '16px' }}>
                                    Project: <b style={{ color: 'var(--text-primary)' }}>{cycle.name}</b> &nbsp;·&nbsp; Evaluated by <b style={{ color: 'var(--text-primary)' }}>{manager?.name}</b>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Official Submission Date: {new Date(ev.submittedAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid-2" style={{ marginBottom: '24px', gap: '24px' }}>
                        {/* Score Breakdown */}
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <div className="card-title" style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Score Breakdown</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Core Performance (Q1-4) 40.5% of total */}
                                <div>
                                    {(() => {
                                        const comps = ev.metadata?.competencies || {};
                                        const CORE_IDS = ['q1', 'q2', 'q3', 'q4'];
                                        const coreRatings = CORE_IDS.map(id => comps[id]?.rating).filter(r => r > 0);
                                        const coreAvg = coreRatings.length > 0 ? coreRatings.reduce((a, b) => a + b, 0) / coreRatings.length : 0;
                                        const corePts = Math.round((coreAvg / 5) * 0.45 * 90);
                                        return (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Core Performance</span>
                                                    <span style={{ fontWeight: 700, color: 'var(--blue-light)' }}>{coreAvg.toFixed(1)}/5 → {corePts} pts</span>
                                                </div>
                                                <div className="progress-bar" style={{ height: '8px' }}><div className="progress-fill" style={{ width: `${(coreAvg / 5) * 100}%`, background: 'var(--blue-light)' }} /></div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Behavioral Traits (Q5-10) 27% of total */}
                                <div>
                                    {(() => {
                                        const comps = ev.metadata?.competencies || {};
                                        const BEHAVIORAL_IDS = ['q5', 'q6', 'q7', 'q10', 'q11', 'q14'];
                                        const behavioralRatings = BEHAVIORAL_IDS.map(id => comps[id]?.rating).filter(r => r > 0);
                                        const behavioralAvg = behavioralRatings.length > 0 ? behavioralRatings.reduce((a, b) => a + b, 0) / behavioralRatings.length : 0;
                                        const behavioralPts = Math.round((behavioralAvg / 5) * 0.30 * 90);
                                        return (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Behavioral Traits</span>
                                                    <span style={{ fontWeight: 700, color: '#06b6d4' }}>{behavioralAvg.toFixed(1)}/5 → {behavioralPts} pts</span>
                                                </div>
                                                <div className="progress-bar" style={{ height: '8px' }}><div className="progress-fill" style={{ width: `${(behavioralAvg / 5) * 100}%`, background: '#06b6d4' }} /></div>
                                            </>
                                        );
                                    })()}
                                </div>


                                {/* HR Assessment 10% */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>HR Assessment & Compliance</span>
                                        {ev.hrRating > 0 ? (
                                            <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>{Math.round(ev.hrRating * 10) / 10}/5 → {Math.round((ev.hrRating / 5) * 10)} pts</span>
                                        ) : (
                                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Not Evaluated</span>
                                        )}
                                    </div>
                                    <div className="progress-bar" style={{ height: '8px' }}>
                                        <div className="progress-fill" style={{ width: ev.hrRating > 0 ? `${(ev.hrRating / 5) * 100}%` : '0%', background: ev.hrRating > 0 ? 'var(--yellow)' : 'var(--border)' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Section: Manager & HR side-by-side */}
                    <div className="grid-2" style={{ marginBottom: '24px', gap: '24px' }}>
                        {/* Manager Feedback */}
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: '12px', color: 'var(--text-primary)', fontSize: '15px' }}>
                                👤 Manager Feedback
                            </div>
                            <div className="custom-scrollbar" style={{
                                padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px',
                                fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)', border: '1px solid var(--border)',
                                height: '180px', overflowY: 'scroll'
                            }}>
                                {ev.feedback || 'Your manager has not provided detailed written feedback for this cycle.'}
                            </div>
                        </div>

                        {/* HR Feedback */}
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: '12px', color: 'var(--purple-light)', fontSize: '15px' }}>
                                📋 HR Assessment Feedback
                            </div>
                            <div className="custom-scrollbar" style={{
                                padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px',
                                fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)', border: '1px solid var(--border)',
                                height: '180px', overflowY: 'scroll'
                            }}>
                                {(() => {
                                    if (!approval?.comment) {
                                        return ev.status === 'approved'
                                            ? 'Evaluation approved with no additional HR comments.'
                                            : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>HR feedback will appear here once the evaluation is fully approved.</span>;
                                    }

                                    try {
                                        if (approval.comment.startsWith('{')) {
                                            const parsed = JSON.parse(approval.comment);
                                            return parsed.comment || approval.comment;
                                        }
                                        return approval.comment;
                                    } catch (e) {
                                        return approval.comment;
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
