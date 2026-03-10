import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import NextStepsCard from '../../components/NextStepsCard';
import Icons from '../../components/Icons';

export default function CycleDetail() {
    const { cycleId } = useParams();
    const navigate = useNavigate();
    const { currentUser, cycles, getGoalsForEmployee, getSelfReview, getEvaluation, getScore } = useApp();

    const cycle = useMemo(() => cycles.find(c => c.id === cycleId), [cycles, cycleId]);

    if (!cycle) {
        return (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-primary)' }}>Cycle not found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>The appraisal cycle you are looking for does not exist.</p>
                <button className="btn btn-primary" onClick={() => navigate('/employee')}>Back to Dashboard</button>
            </div>
        );
    }

    const goals = getGoalsForEmployee(currentUser.id, cycleId);
    const selfReview = getSelfReview(currentUser.id, cycleId);
    const evaluation = getEvaluation(currentUser.id, cycleId);
    const scoreData = getScore(currentUser.id, cycleId);

    const getNextStep = () => {
        if (goals.length === 0) return { title: 'Waiting for Goals', description: 'Your manager needs to assign goals for this cycle before you can proceed.', actionPath: null, statusType: 'waiting' };
        if (!selfReview) return { title: 'Complete Self-Review', description: 'Goals are assigned! It is time to reflect on your performance and submit your self-review.', actionPath: '/employee/self-review', actionLabel: 'Start Self-Review', statusType: 'pending' };
        if (!evaluation) return { title: 'Awaiting Manager Evaluation', description: 'Your self-review is submitted. Your manager will evaluate your performance soon.', actionPath: null, statusType: 'waiting' };
        if (evaluation.status === 'pending_approval') return { title: 'Awaiting HR Approval', description: 'Your manager has submitted the evaluation. It is now pending final approval from HR.', actionPath: null, statusType: 'waiting' };
        return { title: 'Check Your Results', description: 'Your appraisal is complete! You can now view your final score and feedback.', actionPath: '/employee/results', actionLabel: 'View Results', statusType: 'complete' };
    };

    const nextStep = getNextStep();

    const statusSteps = [
        { label: 'Goals Assigned', done: goals.length > 0 },
        { label: 'Self Review', done: !!selfReview },
        { label: 'Manager Eval', done: !!evaluation },
        { label: 'HR Approved', done: evaluation?.status === 'approved' },
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Link to="/employee" className="btn-icon" style={{ padding: '4px', display: 'flex' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        </Link>
                        <h2 className="section-title" style={{ margin: 0 }}>{cycle.name}</h2>
                    </div>
                    <p className="section-subtitle">Appraisal details and progress for this cycle</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={`badge ${cycle.status === 'active' ? 'badge-blue' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                        {cycle.status}
                    </span>
                </div>
            </div>

            <NextStepsCard {...nextStep} />

            {/* Appraisal Journey (Moved from Main Dashboard) */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-title" style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Appraisal Journey</div>
                <div className="workflow-steps">
                    {statusSteps.map((step, i) => (
                        <React.Fragment key={i}>
                            <div className="workflow-step">
                                <div className={`step-dot ${step.done ? 'completed' : ''}`}>
                                    {step.done ? '✓' : i + 1}
                                </div>
                                <div className="step-label" style={{ fontWeight: step.done ? 600 : 400 }}>{step.label}</div>
                            </div>
                            {i < statusSteps.length - 1 && (
                                <div className={`step-connector ${statusSteps[i + 1]?.done ? 'completed' : ''}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
                <div className="kpi-card" style={{ '--accent-color': '#7c3aed' }}>
                    <div className="kpi-icon"><Icons.Target /></div>
                    <div className="kpi-label">Goals Assigned</div>
                    <div className="kpi-value">{goals.length}</div>
                    <div className="kpi-change">for this cycle</div>
                </div>
                <div className="kpi-card" style={{ '--accent-color': selfReview ? '#10b981' : '#f59e0b' }}>
                    <div className="kpi-icon">{selfReview ? <Icons.Check /> : <Icons.FileText />}</div>
                    <div className="kpi-label">Self Review</div>
                    <div className="kpi-value" style={{ fontSize: '20px', marginTop: '4px' }}>{selfReview ? 'Submitted' : 'Pending'}</div>
                    <div className="kpi-change">{selfReview ? `on ${new Date(selfReview.submittedAt).toLocaleDateString()}` : 'action required'}</div>
                </div>
                <div className="kpi-card" style={{ '--accent-color': evaluation?.status === 'approved' ? '#10b981' : '#06b6d4' }}>
                    <div className="kpi-icon"><Icons.Star /></div>
                    <div className="kpi-label">Evaluation Status</div>
                    <div className="kpi-value" style={{ fontSize: '18px', marginTop: '4px' }}>
                        {evaluation ? evaluation.status.replace('_', ' ') : 'Awaiting'}
                    </div>
                    <div className="kpi-change">by your manager</div>
                </div>
                <div className="kpi-card" style={{ '--accent-color': scoreData ? '#f59e0b' : '#64748b' }}>
                    <div className="kpi-icon"><Icons.Trophy /></div>
                    <div className="kpi-label">My Score</div>
                    <div className="kpi-value">{scoreData ? scoreData.score : '—'}</div>
                    <div className="kpi-change">{scoreData ? scoreData.category.label : 'not yet available'}</div>
                </div>
            </div>

            {/* Action alerts */}
            {!selfReview && goals.length > 0 && (
                <div className="alert alert-warning" style={{ borderRadius: '12px' }}>
                    <Icons.FileText style={{ width: '20px', height: '20px' }} />
                    <span>Your self-review is pending! Please submit it from the <b>Self Review</b> page.</span>
                </div>
            )}
            {scoreData && (
                <div className="alert alert-success" style={{ borderRadius: '12px' }}>
                    <Icons.Trophy style={{ width: '20px', height: '20px' }} />
                    <span>Your evaluation is complete! Check your results on the <b>My Results</b> page.</span>
                </div>
            )}

            {/* Goals preview */}
            {goals.length > 0 && (
                <div className="card">
                    <div className="card-title" style={{ marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.Target /> My Goals (Quick View)
                    </div>
                    <div style={{ display: 'grid', gap: '2px' }}>
                        {goals.map(g => (
                            <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{g.title}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{g.description.slice(0, 100)}{g.description.length > 100 ? '...' : ''}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '20px' }}>
                                    <span className="badge badge-purple" style={{ borderRadius: '6px' }}>{g.weightage}%</span>
                                    <span className="badge badge-gray" style={{ borderRadius: '6px' }}>{g.deadline}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
