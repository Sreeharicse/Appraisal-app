import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';

export default function Evaluate() {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const { currentUser, users, cycles, getEvaluation, selfReviews, evaluations, submitEvaluation, calculateScore, getCategory, refreshData } = useApp();
    const team = currentUser.role === 'admin'
        ? users.filter(u => u.role === 'hr' || u.role === 'manager')
        : users.filter(u => u.managerId === currentUser.id);
    const activeCycles = cycles.filter(c => c.status === 'active');

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(employeeId || team[0]?.id || '');
    const [status, setStatus] = useState('draft');
    const [isLocked, setIsLocked] = useState(true);
    const [activeTab, setActiveTab] = useState(1);
    const [hasEdited, setHasEdited] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState({ title: '', body: '' });

    // Once saved as 'pending_approval' or 'approved', the evaluation is permanently locked
    const isSubmitted = status === 'pending_approval' || status === 'approved';
    const isReadOnly = isSubmitted || (status === 'draft' && isLocked);

    const [competencies, setCompetencies] = useState({});
    const [feedback, setFeedback] = useState('');
    const [finalRating, setFinalRating] = useState('');
    const [subRating, setSubRating] = useState('');

    // Fallback for old fields
    const [workRating, setWorkRating] = useState(0);
    const [behaviorRating, setBehaviorRating] = useState(0);

    const TABS = [
        { id: 1, label: '🧩 Competencies' },
        { id: 2, label: '🏆 Achievements' },
        { id: 3, label: '📚 Learning & Dev' },
        { id: 4, label: '💬 Employee Feedback' },
        { id: 5, label: '🏁 Final Assessment' }
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
        { value: 1, label: '1 — Poor' },
        { value: 2, label: '2 — Needs Improvement' },
        { value: 3, label: '3 — Meets Expectations' },
        { value: 4, label: '4 — Exceeds Expectations' },
        { value: 5, label: '5 — Outstanding' }
    ];

    useEffect(() => {
        if (!selectedCycleId && activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
        }
    }, [activeCycles, selectedCycleId]);

    const cycle = cycles.find(c => String(c.id) === String(selectedCycleId));
    const emp = users.find(u => String(u.id) === String(selectedEmp));
    const selfReview = cycle && emp ? selfReviews.find(r => String(r.employeeId) === String(selectedEmp) && String(r.cycleId) === String(cycle.id)) : null;
    const empComps = selfReview?.metadata?.competencies || {};
    const isSelfReviewSubmitted = selfReview?.status === 'submitted' || selfReview?.status === 'approved';

    useEffect(() => {
        if (!selectedCycleId || !selectedEmp) return;

        // If manager has started editing, don't overwrite with background refreshes
        // unless they explicitly switch employees (handled by selectedEmp dependency)
        if (hasEdited) return;

        const ev = getEvaluation(selectedEmp, selectedCycleId);

        // Initialize manager competencies
        const loadedComps = ev?.metadata?.competencies || {};
        const initialComps = {};
        COMPETENCY_QUESTIONS.forEach(q => {
            initialComps[q.id] = loadedComps[q.id] || { rating: 0, comment: '' };
        });
        setCompetencies(initialComps);

        setFeedback(ev?.feedback || '');
        setFinalRating(ev?.finalRating || '');
        setSubRating(ev?.subRating || '');
        setWorkRating(ev?.workPerformanceRating || 0);
        setBehaviorRating(ev?.behavioralRating || 0);
        
        if (ev) {
            setStatus(ev.status);
            setIsLocked(true);
        } else {
            setStatus('new');
            setIsLocked(false);
        }
    }, [selectedEmp, selectedCycleId, evaluations, selfReviews]);

    useEffect(() => {
        if (employeeId) {
            setSelectedEmp(employeeId);
            setHasEdited(false); // Reset edit flag on employee change
        }
    }, [employeeId]);

    const handleEmpChange = (id) => {
        setSelectedEmp(id);
        setHasEdited(false);
    };

    const handleSubmit = async (finalStatus = 'pending_approval') => {
        if (!selectedCycleId || !selectedEmp) return;

        if (finalStatus === 'pending_approval') {
            // Validate all manager competencies have rating and comment
            const unrated = COMPETENCY_QUESTIONS.filter(q => !competencies[q.id] || competencies[q.id].rating === 0);
            if (unrated.length > 0) {
                alert('Please provide a rating for all competencies before submitting.');
                setActiveTab(1);
                return;
            }
            const poorComments = COMPETENCY_QUESTIONS.filter(q => !competencies[q.id]?.comment || competencies[q.id].comment.trim().length < 20);
            if (poorComments.length > 0) {
                alert('Please provide a detailed comment (min 20 chars) for all competencies.');
                setActiveTab(1);
                return;
            }

            // Validate overall feedback
            if (!feedback || feedback.trim().length < 20) {
                alert('Please provide a detailed final assessment (min 20 chars).');
                setActiveTab(5);
                return;
            }

            // Validate Final Rating
            if (!finalRating) {
                alert('Please select a Final Rating Classification.');
                setActiveTab(5);
                return;
            }
            if (!subRating || parseFloat(subRating) < 1 || parseFloat(subRating) > 5) {
                alert('Please provide a valid Sub-Rating between 1 and 5.');
                setActiveTab(5);
                return;
            }
        }

        await submitEvaluation({
            cycleId: selectedCycleId,
            employeeId: selectedEmp,
            competencies,
            feedback,
            finalRating,
            subRating: parseFloat(subRating) || 0,
            status: finalStatus
        });

        setStatus(finalStatus);
        setHasEdited(false);
        setIsLocked(true);

        if (finalStatus === 'pending_approval') {
            setPopupMessage({ title: '🎊 Evaluation Complete!', body: 'Your official performance evaluation has been submitted successfully.' });
        } else {
            setPopupMessage({ title: '💾 Draft Saved', body: 'Your evaluation progress has been saved securely and locked. Click "Edit" to continue later.' });
        }
        setShowPopup(true);
    };

    const updateCompRating = (qid, val) => {
        if (isReadOnly) return; // locked after submission
        setCompetencies(p => ({ ...p, [qid]: { ...p[qid], rating: val } }));
        setHasEdited(true);
    };

    const updateCompComment = (qid, val) => {
        if (isReadOnly) return; // locked after submission
        setCompetencies(p => ({ ...p, [qid]: { ...p[qid], comment: val } }));
        setHasEdited(true);
    };


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
                                <div className="read-only-text" style={{ padding: '12px', paddingRight: '36px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', height: '180px', overflowY: 'scroll', fontStyle: empComps[q.id]?.comment ? 'normal' : 'italic' }}>
                                    {empComps[q.id]?.comment || 'No comments provided.'}
                                </div>
                            </div>
                        </div>

                        {/* Manager Part (Editable / Locked) */}
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                👨‍💼 Manager Perspective 
                                {isSubmitted && <span style={{ fontSize: '11px', background: 'rgba(10, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>✅ Submitted</span>}
                                {!isSubmitted && isLocked && status === 'draft' && <span style={{ fontSize: '11px', background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>🔒 Draft Locked</span>}
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="form-label" style={{ fontSize: '12px', color: isReadOnly ? 'var(--text-muted)' : undefined }}>Rating</label>
                                <select className="form-select" value={competencies[q.id]?.rating || 0}
                                    disabled={isReadOnly}
                                    style={{ 
                                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)', 
                                        background: 'var(--bg-secondary)',
                                        opacity: 1,
                                        cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                    }}
                                    onChange={e => updateCompRating(q.id, parseInt(e.target.value))}>
                                    {RATING_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '12px', color: isReadOnly ? 'var(--text-muted)' : undefined }}>Feedback / Examples</label>
                                <textarea id={`comp-${q.id}`} className="form-input read-only-text" placeholder={isSubmitted ? 'Evaluation submitted.' : (isLocked ? 'Draft locked. Click Edit to continue...' : 'Manager feedback (min 20 chars)...')} 
                                    style={{ 
                                        height: '180px', 
                                        overflowY: 'scroll',
                                        fontSize: '14px', 
                                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)', 
                                        background: 'var(--bg-secondary)',
                                        cursor: isReadOnly ? 'not-allowed' : 'text'
                                    }}
                                    value={competencies[q.id]?.comment || ''}
                                    readOnly={isReadOnly}
                                    onChange={e => { if (!isReadOnly) updateCompComment(q.id, e.target.value); }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderManagerReadOnlyBox = (content, placeholder) => (
        <div className="read-only-text" style={{
            padding: '12px',
            background: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '12px',
            height: '180px',
            overflowY: 'scroll',
            paddingRight: '36px',
            color: content ? 'var(--text-primary)' : 'var(--text-muted)'
        }}>
        {content || placeholder}
    </div>
    );

    const renderEmployeeReadOnlyTab = (title, subtitle, content, placeholder) => (
        <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
            <div className="card-title" style={{ marginBottom: '8px', color: 'var(--blue-light)' }}>👤 Employee's {title}</div>
            <p className="section-subtitle" style={{ marginBottom: '24px' }}>{subtitle}</p>
            <div className={`read-only-text ${content ? '' : 'italic'}`} style={{
                padding: '20px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.1)',
                borderRadius: '12px',
                height: '180px',
                overflowY: 'scroll',
                paddingRight: '36px',
                color: content ? 'var(--text-primary)' : 'var(--text-muted)'
            }}>
                {content || placeholder}
            </div>
        </div>
    );

    const renderSummaryTab = () => (
        <div>
            <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div className="card-title">Overall Summary Feedback</div>
                <p className="section-subtitle" style={{ marginBottom: '16px' }}>Provide a final assessment of the employee's performance over this cycle.</p>
                <textarea className="form-textarea"
                    placeholder={isReadOnly ? 'Evaluation has been submitted and locked.' : 'Final assessment, growth areas, and career pathing...'}
                    value={feedback}
                    readOnly={isReadOnly}
                    style={{ 
                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)', 
                        background: 'var(--bg-secondary)',
                        cursor: isReadOnly ? 'not-allowed' : 'text',
                        minHeight: '150px' 
                    }}
                    onChange={e => { if (!isReadOnly) { setFeedback(e.target.value); setHasEdited(true); } }}
                    onInput={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }} />
            </div>

            <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div className="card-title">Final Rating Classification</div>
                <p className="section-subtitle" style={{ marginBottom: '16px' }}>Assign an overall final rating and sub-rating.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '12px', color: isReadOnly ? 'var(--text-muted)' : undefined }}>Final Rating</label>
                        <select className="form-select" value={finalRating} disabled={isReadOnly} onChange={(e) => { setFinalRating(e.target.value); setHasEdited(true); }} 
                            style={{ 
                                color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)', 
                                background: 'var(--bg-secondary)',
                                opacity: 1,
                                cursor: isReadOnly ? 'not-allowed' : 'pointer'
                            }}>
                            <option value="">Select a rating...</option>
                            <option value="Outstanding">Outstanding</option>
                            <option value="Exceeded">Exceeded Expectations</option>
                            <option value="Met">Met Expectations</option>
                            <option value="Below">Below Expectations</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '12px', color: isReadOnly ? 'var(--text-muted)' : undefined }}>Sub-Rating (1-5, hidden from employee)</label>
                        <input type="number" step="0.1" min="1" max="5" className="form-input" placeholder="e.g. 4.2" value={subRating} disabled={isReadOnly} onChange={(e) => { setSubRating(e.target.value); setHasEdited(true); }} 
                            style={{ 
                                color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)', 
                                background: 'var(--bg-secondary)',
                                opacity: 1,
                                cursor: isReadOnly ? 'not-allowed' : 'text'
                            }} />
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '40px' }}>
                {isSubmitted ? (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        padding: '12px 28px', borderRadius: '12px',
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        color: '#10b981', fontWeight: 700, fontSize: '15px'
                    }}>
                        ✅ Evaluation Submitted &amp; Locked
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                        {status === 'draft' && isLocked ? (
                            <button type="button" className="btn btn-secondary" style={{ padding: '16px 32px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsLocked(false)}>
                                ✏️ Edit Evaluation
                            </button>
                        ) : (
                            <>
                                <button type="button" className="btn btn-secondary" style={{ padding: '16px 32px', fontWeight: 600 }} onClick={() => handleSubmit('draft')}>
                                    💾 Save Draft
                                </button>
                                <button type="button" className="btn btn-primary" style={{ padding: '16px 64px', fontWeight: 700, fontSize: '16px' }} onClick={() => handleSubmit('pending_approval')}>
                                    Complete Evaluation
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
                <div>
                    <h2 className="section-title" style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>Performance Evaluation</h2>
                    <p className="section-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Reviewing performance for a specific cycle.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Employee</label>
                        <select
                            className="form-select btn-sm"
                            style={{ minWidth: '180px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                            value={selectedEmp}
                            onChange={(e) => handleEmpChange(e.target.value)}
                        >
                            {!team.length && <option value="">No team members</option>}
                            {team.map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Appraisal Cycle</label>
                        <select
                            className="form-select btn-sm"
                            style={{ minWidth: '160px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                            value={selectedCycleId}
                            onChange={(e) => {
                                setSelectedCycleId(e.target.value);
                                setStatus('draft');
                                setHasEdited(false);
                            }}
                        >
                            <option value="">Select Cycle...</option>
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button onClick={() => navigate('/manager')} className="btn btn-secondary" style={{ padding: '8px 16px', alignSelf: 'flex-end', height: '36px' }}>
                        ← Back
                    </button>
                </div>
            </div>

            {isReadOnly && !hasEdited && isSelfReviewSubmitted && <div style={{
                marginBottom: '20px', padding: '12px 20px',
                background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500
            }}>
                {isSubmitted ? (
                    <>🔒 This evaluation has been submitted and is now <strong style={{ color: 'var(--text-secondary)' }}>read-only</strong>. No further changes can be made.</>
                ) : (
                    <>🔒 This evaluation is saved as a <strong style={{ color: 'var(--text-secondary)' }}>draft</strong> and locked. Click "Edit Evaluation" to continue.</>
                )}
            </div>}
            {hasEdited && <div className="alert alert-warning" style={{ marginBottom: '24px' }}>⚠️ You have unsaved changes. Click "Complete Evaluation" in the Final Assessment tab to save.</div>}

            {!isSelfReviewSubmitted ? (
                <div className="card" style={{ padding: '64px 24px', textAlign: 'center', marginTop: '24px', background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Waiting for Employee</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                        This employee has not yet submitted their self-review. You cannot begin your evaluation until their review is completed and submitted.
                    </p>
                </div>
            ) : (
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
                        {activeTab === 1 && renderCompetenciesTab()}
                    {activeTab === 2 && renderEmployeeReadOnlyTab('Achievements', 'Significant accomplishments or evidence provided by the employee not covered by specific goals.', selfReview?.metadata?.achievements, 'No additional achievements provided.')}
                    {activeTab === 3 && renderEmployeeReadOnlyTab('Learning & Development', 'Training completed or developmental aspirations noted by the employee.', selfReview?.metadata?.learning, 'No learning and development notes provided.')}
                    {activeTab === 4 && renderEmployeeReadOnlyTab('Feedback', 'Feedback about the team, manager, or organizational processes.', selfReview?.metadata?.feedback, 'No feedback provided.')}
                    {activeTab === 5 && renderSummaryTab()}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', marginBottom: '40px' }}>
                        <button className="btn btn-secondary" disabled={activeTab === 1} onClick={() => setActiveTab(p => p - 1)}>← Previous</button>
                        {activeTab < 5 && <button className="btn btn-primary" onClick={() => setActiveTab(p => p + 1)}>Next Section →</button>}
                    </div>
                </div>
            </div>
            )}

            {/* Custom Popup Overlay */}
            {showPopup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{popupMessage.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>{popupMessage.body}</p>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowPopup(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

