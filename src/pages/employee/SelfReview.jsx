import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function SelfReview() {
    const { currentUser, cycles, evaluations = [], getGoalsForEmployee, getSelfReview, submitSelfReview, getScore, refreshData } = useApp();

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const activeCycles = cycles.filter(c => c.status === 'active');
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [activeTab, setActiveTab] = useState(1);

    // Form State
    const [summary, setSummary] = useState('');
    const [goalRatings, setGoalRatings] = useState({});
    const [comments, setComments] = useState('');
    const [progress, setProgress] = useState({}); // { goalId: { percentage: 0, comment: '', complete: false } }
    const [competencies, setCompetencies] = useState({});
    const [feedback, setFeedback] = useState('');
    const [achievements, setAchievements] = useState('');
    const [learning, setLearning] = useState('');

    const [submitted, setSubmitted] = useState(false); // Legacy flag for some UI
    const [status, setStatus] = useState('new'); // 'new', 'draft', 'submitted'
    const [loading, setLoading] = useState(true);

    const COMPETENCY_QUESTIONS = [
        { id: 'q1', label: '1. Quality of Work', desc: 'How consistently do you deliver high-quality work in your role? Describe how you ensure your tasks are completed accurately, efficiently, and meet the required standards.' },
        { id: 'q2', label: '2. Technical Competency', desc: 'Evaluate your technical skills required for your role. How effectively do you apply your technical knowledge to solve problems and complete assigned tasks?' },
        { id: 'q3', label: '3. Problem Solving', desc: 'Describe your ability to analyze problems and find effective solutions. Provide examples where you identified issues and implemented solutions that improved outcomes.' },
        { id: 'q4', label: '4. Productivity and Efficiency', desc: 'How effectively do you manage your workload and meet deadlines? Explain how you prioritize tasks and maintain productivity throughout the review period.' },
        { id: 'q5', label: '5. Communication Skills', desc: 'Evaluate how clearly and effectively you communicate with your team, manager, and other stakeholders. Include examples of how communication helped improve project outcomes or teamwork.' },
        { id: 'q6', label: '6. Team Collaboration', desc: 'How well do you collaborate with colleagues and contribute to team goals? Describe how you support team members and participate in collective problem solving.' },
        { id: 'q7', label: '7. Initiative and Ownership', desc: 'Describe situations where you took initiative beyond your assigned responsibilities. How do you demonstrate ownership of tasks, projects, or issues that arise?' },
        { id: 'q8', label: '8. Learning and Skill Development', desc: 'How have you improved your skills during this appraisal cycle? Mention any new technologies, tools, or practices you have learned and applied in your work.' },
        { id: 'q9', label: '9. Adaptability', desc: 'How well do you adapt to changes in priorities, technologies, or project requirements? Provide examples where you successfully handled change or uncertainty.' },
        { id: 'q10', label: '10. Time Management', desc: 'How effectively do you manage your time while balancing multiple responsibilities? Describe strategies you use to stay organized and meet deadlines.' },
        { id: 'q11', label: '11. Contribution to Project Success', desc: 'Explain how your work contributed to the success of your projects or team objectives. Highlight any measurable results or improvements you helped achieve.' },
        { id: 'q12', label: '12. Innovation and Improvement', desc: 'Have you suggested or implemented any improvements in processes, tools, or workflows? Describe how these improvements benefited your team or organization.' },
        { id: 'q13', label: '13. Accountability', desc: 'How do you handle mistakes or challenges in your work? Explain how you take responsibility and work toward resolving issues effectively.' },
        { id: 'q14', label: '14. Professional Behavior', desc: 'Evaluate how you demonstrate professionalism in the workplace. This includes reliability, respect for colleagues, and maintaining a positive work attitude.' },
        { id: 'q15', label: '15. Overall Self Assessment', desc: 'Reflect on your overall performance during this appraisal cycle. What are your key achievements, and what areas do you believe need further improvement?' }
    ];

    const RATING_OPTIONS = [
        { value: 0, label: 'Select Rating...' },
        { value: 1, label: '1 — Outstanding' },
        { value: 2, label: '2 — Exceeds Expectations' },
        { value: 3, label: '3 — Meets Expectations' },
        { value: 4, label: '4 — Needs Improvement' },
        { value: 5, label: '5 — Poor' }
    ];

    // Initialize cycle
    useEffect(() => {
        if (!selectedCycleId && activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
        }
    }, [activeCycles, selectedCycleId]);

    const cycle = cycles.find(c => c.id === selectedCycleId);
    const goals = selectedCycleId ? getGoalsForEmployee(currentUser.id, selectedCycleId) : [];
    const isReadOnly = status === 'submitted';

    // Load existing data when cycle or employee changes
    useEffect(() => {
        if (!selectedCycleId) return;

        setLoading(true);
        const existing = getSelfReview(currentUser.id, selectedCycleId);

        if (existing) {
            setSummary(existing.summary || '');
            setComments(existing.comments || '');
            setGoalRatings(existing.goalRatings || {});

            const meta = existing.metadata || {};
            setProgress(meta.progress || {});

            // Initialize competencies with 15 questions if not present
            const loadedComps = meta.competencies || {};
            const initialComps = {};
            COMPETENCY_QUESTIONS.forEach(q => {
                initialComps[q.id] = loadedComps[q.id] || { rating: 0, comment: '' };
            });
            setCompetencies(initialComps);

            setFeedback(meta.feedback || '');
            setAchievements(meta.achievements || '');
            setLearning(meta.learning || '');

            setStatus(meta.status || 'submitted');
            setSubmitted(true);
        } else {
            setSummary('');
            setComments('');
            setGoalRatings({});
            setProgress({});

            const initialComps = {};
            COMPETENCY_QUESTIONS.forEach(q => {
                initialComps[q.id] = { rating: 0, comment: '' };
            });
            setCompetencies(initialComps);

            setFeedback('');
            setAchievements('');
            setLearning('');
            setStatus('new');
            setSubmitted(false);
        }
        setLoading(false);
    }, [selectedCycleId]);

    const handleSubmit = async (targetStatus) => {
        if (!selectedCycleId) return;

        const finalStatus = targetStatus || 'submitted';

        await submitSelfReview({
            cycleId: selectedCycleId,
            employeeId: currentUser.id,
            summary,
            goalRatings,
            comments,
            progress,
            competencies,
            feedback,
            achievements,
            learning,
            status: finalStatus
        });

        setStatus(finalStatus);
        setSubmitted(true);
        alert(finalStatus === 'submitted' ? 'Self-review submitted successfully!' : 'Draft saved successfully!');
    };

    const TABS = [
        { id: 1, label: '🧩 Competencies' },
        { id: 2, label: '🏆 Achievements' },
        { id: 3, label: '📚 Learning' },
        { id: 4, label: '💬 Feedback' },
        { id: 5, label: '🏁 Summary' }
    ];

    if (loading && selectedCycleId) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading review data...</div>;

    const evaluation = evaluations.find(e =>
        String(e.cycleId) === String(selectedCycleId) &&
        String(e.employeeId) === String(currentUser.id)
    );
    const mngComps = evaluation?.metadata?.competencies || {};
    const mngScore = evaluation ? getScore(currentUser.id, selectedCycleId) : null;

    const renderCompetenciesTab = () => {
        return (
            <div style={{ paddingBottom: '40px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>Detailed Self-Assessment</div>
                <p className="section-subtitle" style={{ marginBottom: '24px' }}>Please rate yourself and view manager feedback (if available) for each competency.</p>

                {COMPETENCY_QUESTIONS.map((q, index) => (
                    <div key={q.id} className="card" style={{ marginBottom: '32px', padding: '24px' }}>
                        <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--blue-light)', marginBottom: '8px' }}>{q.label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>{q.desc}</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Employee Section */}
                            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--blue-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👤 Employee Perspective
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Rating</label>
                                    <select
                                        className="form-select"
                                        style={{ width: '100%' }}
                                        disabled={isReadOnly}
                                        value={competencies[q.id]?.rating || 0}
                                        onChange={e => setCompetencies(p => ({
                                            ...p,
                                            [q.id]: { ...p[q.id], rating: parseInt(e.target.value) }
                                        }))}
                                    >
                                        {RATING_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Comments / Examples</label>
                                    <textarea
                                        className="form-input"
                                        placeholder="Supporting evidence..."
                                        style={{ minHeight: '80px', width: '100%', fontSize: '13px' }}
                                        disabled={isReadOnly}
                                        value={competencies[q.id]?.comment || ''}
                                        onChange={e => setCompetencies(p => ({
                                            ...p,
                                            [q.id]: { ...p[q.id], comment: e.target.value }
                                        }))}
                                    />
                                </div>
                            </div>

                            {/* Manager Section */}
                            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👨‍💼 Manager Perspective
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Rating</label>
                                    <div style={{
                                        padding: '8px 12px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: mngComps[q.id]?.rating ? 'var(--text-primary)' : 'var(--text-muted)'
                                    }}>
                                        {RATING_OPTIONS.find(o => o.value === (mngComps[q.id]?.rating || 0))?.label || 'Not yet rated'}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Comments / Feedback</label>
                                    <div style={{
                                        padding: '12px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        minHeight: '80px',
                                        color: mngComps[q.id]?.comment ? 'var(--text-primary)' : 'var(--text-muted)',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {mngComps[q.id]?.comment || 'No manager feedback provided yet.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderFeedbackTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Additional Feedback</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Provide feedback about the team, your manager, or organizational processes.</p>
            <textarea className="form-textarea" rows={10} placeholder="Type your feedback here..."
                disabled={isReadOnly}
                value={feedback} onChange={e => setFeedback(e.target.value)} />
        </div>
    );

    const renderAchievementsTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Additional Highlights</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Significant accomplishments or evidence not covered by specific goals.</p>
            <textarea className="form-textarea" rows={10} placeholder="Document any extra wins..."
                disabled={isReadOnly}
                value={achievements} onChange={e => setAchievements(e.target.value)} />
        </div>
    );

    const renderLearningTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Learning & Development</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Track completed training or define future developmental aspirations.</p>
            <textarea className="form-textarea" rows={10} placeholder="Training completed, certifications, or desired skills..."
                disabled={isReadOnly}
                value={learning} onChange={e => setLearning(e.target.value)} />
        </div>
    );

    const renderSummaryTab = () => (
        <div>
            <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--purple)' }}>
                <div className="card-title" style={{ marginBottom: '8px' }}>Final Overview</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {isReadOnly ? 'This review has been submitted and is now read-only.' : 'Review all sections before submitting your self-appraisal.'}
                </p>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <label className="form-label">Final Thoughts / Career Aspirations</label>
                <textarea className="form-textarea" rows={4} placeholder="Where do you see yourself in the next 12 months?"
                    disabled={isReadOnly}
                    value={comments} onChange={e => setComments(e.target.value)} />
            </div>

            {evaluation && (
                <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--purple)', background: 'rgba(168, 85, 247, 0.05)' }}>
                    <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span>👨‍💼 Manager's Assessment</span>
                        {mngScore && (
                            <span className={`badge ${mngScore.category.color.startsWith('gray') ? 'badge-gray' : mngScore.category.color.startsWith('blue') ? 'badge-blue' : mngScore.category.color.startsWith('green') ? 'badge-green' : 'badge-purple'}`}>
                                Score: {mngScore.score}% — {mngScore.category.label}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', lineHeight: '1.6' }}>
                        {evaluation.feedback || 'No summary feedback provided.'}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                {!isReadOnly && (
                    <>
                        {status === 'new' && (
                            <button type="button" className="btn btn-secondary" onClick={() => handleSubmit('draft')} style={{ padding: '12px 24px' }}>
                                💾 Save Draft
                            </button>
                        )}
                        {status === 'draft' && (
                            <button type="button" className="btn btn-secondary" onClick={() => handleSubmit('draft')} style={{ padding: '12px 24px' }}>
                                🔄 Update Draft
                            </button>
                        )}
                        <button type="button" className="btn btn-primary" onClick={() => handleSubmit('submitted')} style={{ padding: '12px 32px', fontWeight: 700 }}>
                            🚀 Submit Full Appraisal
                        </button>
                    </>
                )}
                {isReadOnly && (
                    <button type="button" className="btn btn-primary" disabled style={{ padding: '12px 32px', fontWeight: 700, opacity: 0.7 }}>
                        ✅ Submitted
                    </button>
                )}
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 1: return renderCompetenciesTab();
            case 2: return renderAchievementsTab();
            case 3: return renderLearningTab();
            case 4: return renderFeedbackTab();
            case 5: return renderSummaryTab();
            default: return null;
        }
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Comprehensive Self Review</h2>
                    <p className="section-subtitle">{cycle?.name || 'Loading cycle...'}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select className="form-select" value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} style={{ width: '220px' }}>
                        {activeCycles.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', position: 'relative' }}>
                {/* Tabs Sidebar */}
                <div style={{ width: '240px', flexShrink: 0 }}>
                    <div className="card" style={{ padding: '8px', position: 'sticky', top: '24px' }}>
                        {TABS.map(t => (
                            <button key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeTab === t.id ? 'var(--bg-primary)' : 'transparent',
                                    boxShadow: activeTab === t.id ? 'var(--nm-shadow-in-sm)' : 'none',
                                    color: activeTab === t.id ? 'var(--blue-light)' : 'var(--text-secondary)',
                                    fontWeight: activeTab === t.id ? 700 : 500,
                                    cursor: 'pointer',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s',
                                    fontSize: '14px'
                                }}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flexGrow: 1 }}>
                    {!selectedCycleId && <div className="alert alert-warning">⚠️ Select an Appraisal Cycle.</div>}
                    {selectedCycleId && renderTabContent()}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <button className="btn btn-secondary" disabled={activeTab === 1} onClick={() => setActiveTab(p => p - 1)}>← Previous</button>
                        {activeTab < 5 && <button className="btn btn-primary" onClick={() => setActiveTab(p => p + 1)}>Next →</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}
