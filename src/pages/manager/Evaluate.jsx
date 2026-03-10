import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';

export default function Evaluate() {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const { currentUser, users, cycles, getGoalsForEmployee, getEvaluation, selfReviews, evaluations, submitEvaluation, calculateScore, getCategory, refreshData } = useApp();
    const team = users.filter(u => u.managerId === currentUser.id);
    const activeCycles = cycles.filter(c => c.status === 'active');

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(employeeId || team[0]?.id || '');
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState(1);
    const [hasEdited, setHasEdited] = useState(false);

    const [goalRatings, setGoalRatings] = useState({});
    const [competencies, setCompetencies] = useState({});
    const [feedback, setFeedback] = useState('');

    // Fallback for old fields
    const [workRating, setWorkRating] = useState(0);
    const [behaviorRating, setBehaviorRating] = useState(0);

    const TABS = [
        { id: 1, label: '🎯 Goal Performance' },
        { id: 2, label: '🧩 Competencies' },
        { id: 3, label: '🏁 Final Assessment' }
    ];

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

    useEffect(() => {
        if (!selectedCycleId && activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
        }
    }, [activeCycles, selectedCycleId]);

    const cycle = cycles.find(c => String(c.id) === String(selectedCycleId));
    const emp = users.find(u => String(u.id) === String(selectedEmp));
    const empGoals = cycle ? getGoalsForEmployee(selectedEmp, cycle.id) : [];
    const selfReview = cycle ? selfReviews.find(r => String(r.employeeId) === String(selectedEmp) && String(r.cycleId) === String(cycle.id)) : null;
    const empComps = selfReview?.metadata?.competencies || {};

    useEffect(() => {
        if (!selectedCycleId || !selectedEmp) return;

        // If manager has started editing, don't overwrite with background refreshes
        // unless they explicitly switch employees (handled by selectedEmp dependency)
        if (hasEdited) return;

        const ev = getEvaluation(selectedEmp, selectedCycleId);
        const r = {};
        empGoals.forEach(g => { r[g.id] = ev?.goalRatings?.[g.id] || 0; });

        setGoalRatings(r);

        // Initialize manager competencies
        const loadedComps = ev?.metadata?.competencies || {};
        const initialComps = {};
        COMPETENCY_QUESTIONS.forEach(q => {
            initialComps[q.id] = loadedComps[q.id] || { rating: 0, comment: '' };
        });
        setCompetencies(initialComps);

        setFeedback(ev?.feedback || '');
        setWorkRating(ev?.workPerformanceRating || 0);
        setBehaviorRating(ev?.behavioralRating || 0);
        setSaved(!!ev);
    }, [selectedEmp, selectedCycleId, empGoals.length, evaluations?.length, selfReviews?.length]);

    useEffect(() => {
        if (employeeId) {
            setSelectedEmp(employeeId);
            setHasEdited(false); // Reset edit flag on employee change
        }
    }, [employeeId]);

    const handleEmpChange = (id) => {
        setSelectedEmp(id);
        setSaved(false);
        setHasEdited(false);
    };

    const handleSubmit = async () => {
        if (!selectedCycleId || !selectedEmp) return;

        // Calculate legacy ratings from competency average to satisfy DB constraints
        const compValues = Object.values(competencies).map(c => c.rating).filter(r => r > 0);
        const legacyRating = compValues.length > 0
            ? Math.round(compValues.reduce((a, b) => a + b, 0) / compValues.length)
            : 3; // Default to 3 (Meets Expectations) if no ratings

        await submitEvaluation({
            cycleId: selectedCycleId,
            employeeId: selectedEmp,
            goalRatings,
            competencies,
            feedback,
            workPerformanceRating: legacyRating,
            behavioralRating: legacyRating,
        });
        setSaved(true);
        setHasEdited(false);
        alert('Evaluation submitted successfully!');
    };

    const updateGoalRating = (gid, val) => {
        setGoalRatings(p => ({ ...p, [gid]: val }));
        setHasEdited(true);
    };

    const updateCompRating = (qid, val) => {
        setCompetencies(p => ({ ...p, [qid]: { ...p[qid], rating: val } }));
        setHasEdited(true);
    };

    const updateCompComment = (qid, val) => {
        setCompetencies(p => ({ ...p, [qid]: { ...p[qid], comment: val } }));
        setHasEdited(true);
    };

    const previewScore = empGoals.length > 0 && workRating > 0 && behaviorRating > 0
        ? calculateScore(empGoals, goalRatings, workRating, behaviorRating)
        : null;

    const renderGoalsTab = () => (
        <div className="card" style={{ padding: '24px' }}>
            <div className="card-title" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Goal Performance Assessment</div>
            <div style={{ display: 'grid', gap: '24px' }}>
                {empGoals.length === 0 && <p className="text-muted">No goals associated with this employee for the selected cycle.</p>}
                {empGoals.map(g => (
                    <div key={g.id} className="card" style={{ background: 'var(--bg-secondary)', border: 'none', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{g.title}</div>
                            <span className="badge badge-purple">Weight: {g.weightage}%</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{g.description}</p>
                        <div className="rating-scale" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} type="button"
                                    className={`rating-btn ${goalRatings[g.id] === n ? 'selected' : ''}`}
                                    onClick={() => updateGoalRating(g.id, n)}>
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCompetenciesTab = () => (
        <div>
            <div className="card-title" style={{ marginBottom: '16px' }}>Competency Evaluation</div>
            <p className="section-subtitle" style={{ marginBottom: '24px' }}>Compare employee self-ratings with your own assessment.</p>
            {COMPETENCY_QUESTIONS.map((q) => (
                <div key={q.id} className="card" style={{ marginBottom: '32px', padding: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--blue-light)', marginBottom: '8px' }}>{q.label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>{q.desc}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Employee Part (Read-only) */}
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--blue-light)' }}>👤 Employee Perspective</div>
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Self-Rating</div>
                                <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                                    {RATING_OPTIONS.find(o => o.value === (empComps[q.id]?.rating || 0))?.label || 'Not rated'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Self-Comments</div>
                                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', minHeight: '60px', fontStyle: 'italic', lineHeight: '1.5' }}>
                                    {empComps[q.id]?.comment || 'No comments provided.'}
                                </div>
                            </div>
                        </div>

                        {/* Manager Part (Editable) */}
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--purple)' }}>👨‍💼 Manager Perspective</div>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Rating</label>
                                <select className="form-select" value={competencies[q.id]?.rating || 0}
                                    onChange={e => updateCompRating(q.id, parseInt(e.target.value))}>
                                    {RATING_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '12px' }}>Feedback / Examples</label>
                                <textarea className="form-input" placeholder="Manager feedback..." style={{ minHeight: '80px', fontSize: '13px' }}
                                    value={competencies[q.id]?.comment || ''}
                                    onChange={e => updateCompComment(q.id, e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSummaryTab = () => (
        <div>
            <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div className="card-title">Overall Summary Feedback</div>
                <p className="section-subtitle" style={{ marginBottom: '16px' }}>Provide a final assessment of the employee's performance over this cycle.</p>
                <textarea className="form-textarea" rows={8} placeholder="Final assessment, growth areas, and career pathing..."
                    value={feedback} onChange={e => { setFeedback(e.target.value); setHasEdited(true); }} />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '40px' }}>
                <button type="button" className="btn btn-primary" style={{ padding: '16px 64px', fontWeight: 700, fontSize: '16px' }} onClick={handleSubmit}>
                    {saved ? 'Update Evaluation' : 'Complete Evaluation'}
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Performance Evaluation</h2>
                    <p className="section-subtitle">Reviewing performance for: <strong style={{ color: 'var(--purple)' }}>{emp?.name || 'Loading...'}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/manager')} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                        ← Back to Team
                    </button>
                    {cycle && <span className="badge badge-green">{cycle.name}</span>}
                </div>
            </div>

            {saved && !hasEdited && <div className="alert alert-success" style={{ marginBottom: '24px' }}>✨ Evaluation record synchronized successfully.</div>}
            {hasEdited && <div className="alert alert-warning" style={{ marginBottom: '24px' }}>⚠️ You have unsaved changes. Click "Complete Evaluation" in the Final Assessment tab to save.</div>}

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
                                    color: activeTab === t.id ? 'var(--purple)' : 'var(--text-secondary)',
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
                    {activeTab === 1 && renderGoalsTab()}
                    {activeTab === 2 && renderCompetenciesTab()}
                    {activeTab === 3 && renderSummaryTab()}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', marginBottom: '40px' }}>
                        <button className="btn btn-secondary" disabled={activeTab === 1} onClick={() => setActiveTab(p => p - 1)}>← Previous</button>
                        {activeTab < 3 && <button className="btn btn-primary" onClick={() => setActiveTab(p => p + 1)}>Next Section →</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

