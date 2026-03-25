import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import Icons from '../../components/Icons';

export default function Evaluate() {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const { currentUser, users, cycles, getEvaluation, selfReviews, evaluations, submitEvaluation, calculateScore, getCategory, refreshData, setTopBarAction, questionSets } = useApp();
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
    const [showEmpPicker, setShowEmpPicker] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
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
        { id: 2, label: '📚 Learning & Dev' },
        { id: 3, label: '💬 Feedback & Summary' }
    ];

    const DEFAULT_COMPETENCY_QUESTIONS = [
        { id: 'q1', label: '1. Quality of Work', desc: 'How consistently do you deliver high-quality work in your role? Describe how you ensure your tasks are completed accurately, efficiently, and meet the required standards.' },
        { id: 'q2', label: '2. Technical Competency', desc: 'Evaluate your technical skills required for your role. How effectively do you apply your technical knowledge to solve problems and complete assigned tasks?' },
        { id: 'q3', label: '3. Problem Solving', desc: 'Describe your ability to analyze problems and find effective solutions. Provide examples where you identified issues and implemented solutions that improved outcomes.' },
        { id: 'q4', label: '4. Productivity and Efficiency', desc: 'How effectively do you manage your workload and meet deadlines? Explain how you prioritize tasks and maintain productivity throughout the review period.' },
        { id: 'q5', label: '5. Communication Skills', desc: 'Evaluate how clearly and effectively you communicate with your team, manager, and other stakeholders. Include examples of how communication helped improve project outcomes or teamwork.' },
        { id: 'q6', label: '6. Team Collaboration', desc: 'How well do you collaborate with colleagues and contribute to team goals? Describe how you support team members and participate in collective problem solving.' },
        { id: 'q7', label: '7. Initiative and Ownership', desc: 'Describe situations where you took initiative beyond your assigned responsibilities. How do you demonstrate ownership of tasks, projects, or issues that arise?' },
        { id: 'q10', label: '8. Time Management', desc: 'How effectively do you manage your time while balancing multiple responsibilities? Describe strategies you use to stay organized and meet deadlines.' },
        { id: 'q11', label: '9. Contribution to Project Success', desc: 'Explain how your work contributed to the success of your projects or team objectives. Highlight any measurable results or improvements you helped achieve.' },
        { id: 'q14', label: '10. Professional Behavior', desc: 'Evaluate how you demonstrate professionalism in the workplace. This includes reliability, respect for colleagues, and maintaining a positive work attitude.' }
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

    // Resolve the template questions based on Job Title (Designation)
    const empAssignedSet = emp?.designation 
        ? questionSets.find(qs => qs.targetDesignations?.includes(emp.designation))
        : null;

    const TEMPLATE_QUESTIONS = empAssignedSet ? empAssignedSet.questions : DEFAULT_COMPETENCY_QUESTIONS;

    let COMPETENCY_QUESTIONS = TEMPLATE_QUESTIONS;
    if (cycle && cycle.status === 'closed') {
        const srQuestions = selfReview?.metadata?.questions;
        if (srQuestions && srQuestions.length > 0) {
            COMPETENCY_QUESTIONS = srQuestions;
        } else if (isSelfReviewSubmitted) {
            COMPETENCY_QUESTIONS = DEFAULT_COMPETENCY_QUESTIONS;
        }
    }

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
            // Auto-unlock if it's a draft to allow immediate editing
            setIsLocked(ev.status !== 'draft');
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

    // Auto-calculate Sub-Rating from Competencies
    useEffect(() => {
        if (isReadOnly || isSubmitted) return;

        const ratings = Object.values(competencies).map(c => c.rating).filter(r => r > 0);
        if (ratings.length > 0) {
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            // Round to 1 decimal place for the input field
            setSubRating(avg.toFixed(1));
        } else {
            setSubRating('');
        }
    }, [competencies, isReadOnly, isSubmitted]);

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
                setActiveTab(3); // Changed from 5 to 3
                return;
            }
            if (!subRating || parseFloat(subRating) < 1 || parseFloat(subRating) > 5) {
                alert('Please provide a valid Sub-Rating between 1 and 5.');
                setActiveTab(3); // Changed from 5 to 3
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
        setIsLocked(finalStatus === 'pending_approval');

        if (finalStatus === 'pending_approval') {
            setPopupMessage({ title: '🎊 Evaluation Complete!', body: 'Your official performance evaluation has been submitted successfully.' });
        } else {
            setPopupMessage({ title: '💾 Progress Saved', body: 'Your evaluation draft has been saved. You can continue editing at any time.' });
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
            <div className="card-title" style={{ marginBottom: '8px' }}>Competency Evaluation</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Compare employee self-ratings with your own assessment.</p>
            {COMPETENCY_QUESTIONS.map((q) => (
                <div key={q.id} className="card" style={{ marginBottom: '12px', padding: '14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--blue-light)', marginBottom: '4px' }}>{q.label} <span style={{ color: '#ef4444', fontSize: '13px' }}>*</span></div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.desc}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Employee Part (Read-only) */}
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--blue-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Employee Perspective</div>
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Self-Rating</div>
                                <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--border)' }}>
                                    {RATING_OPTIONS.find(o => o.value === (empComps[q.id]?.rating || 0))?.label || 'Not rated'}
                                </div>
                            </div>
                            <div>
                                <div className="read-only-text" style={{ padding: '16px', paddingRight: '24px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '14px', height: '180px', maxHeight: '180px', overflowY: 'auto', fontStyle: empComps[q.id]?.comment ? 'normal' : 'italic', lineHeight: '1.5' }}>
                                    {empComps[q.id]?.comment || 'No comments provided.'}
                                </div>
                            </div>
                        </div>

                        {/* Manager Part (Editable / Locked) */}
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                👨‍💼 Manager Perspective
                                {isSubmitted && <span style={{ fontSize: '11px', background: 'rgba(10, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>✅ Submitted</span>}
                                {!isSubmitted && status === 'draft' && <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>✍️ In Progress</span>}
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', color: isReadOnly ? 'var(--text-muted)' : 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Rating</label>
                                <select className="form-select" value={competencies[q.id]?.rating || 0}
                                    disabled={isReadOnly}
                                    style={{
                                        width: '100%',
                                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                                        background: 'var(--bg-secondary)',
                                        opacity: 1,
                                        pointerEvents: isReadOnly ? 'none' : 'auto',
                                        cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                    }}
                                    onChange={e => updateCompRating(q.id, parseInt(e.target.value))}>
                                    {RATING_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <textarea id={`comp-${q.id}`} className="form-input" placeholder={isSubmitted ? 'Submitted.' : (isLocked ? 'Draft locked...' : 'Manager feedback (min 20 chars)...')}
                                    style={{
                                        width: '100%',
                                        height: '180px',
                                        minHeight: '180px',
                                        maxHeight: '180px',
                                        overflowY: 'auto',
                                        resize: 'none',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                                        background: 'var(--bg-secondary)',
                                        cursor: isReadOnly ? 'not-allowed' : 'text',
                                        padding: '16px'
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
            <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
                <div className="card-title" style={{ marginBottom: '10px', fontSize: '14px' }}>Overall Summary Feedback</div>
                <textarea className="form-textarea"
                    placeholder={isReadOnly ? 'Evaluation has been submitted and locked.' : 'Final assessment, growth areas, and career pathing...'}
                    value={feedback}
                    readOnly={isReadOnly}
                    style={{
                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                        background: 'var(--bg-secondary)',
                        cursor: isReadOnly ? 'not-allowed' : 'text',
                        height: '240px',
                        maxHeight: '240px',
                        minHeight: '240px',
                        overflowY: 'auto',
                        resize: 'none',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        padding: '16px'
                    }}
                    onChange={e => { if (!isReadOnly) { setFeedback(e.target.value); setHasEdited(true); } }}
                />
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
                            <button type="button" className="btn btn-primary" style={{ padding: '16px 64px', fontWeight: 700, fontSize: '16px' }} onClick={() => {
                                // Pre-validate before opening the modal
                                const unrated = COMPETENCY_QUESTIONS.filter(q => !competencies[q.id] || competencies[q.id].rating === 0);
                                if (unrated.length > 0) { alert('Please provide a rating for all competencies before submitting.'); setActiveTab(1); return; }
                                const poorComments = COMPETENCY_QUESTIONS.filter(q => !competencies[q.id]?.comment || competencies[q.id].comment.trim().length < 20);
                                if (poorComments.length > 0) { alert('Please provide a detailed comment (min 20 chars) for all competencies.'); setActiveTab(1); return; }
                                if (!feedback || feedback.trim().length < 20) { alert('Please provide a detailed final assessment (min 20 chars).'); return; }
                                setShowRatingModal(true);
                            }}>
                                🏁 Submit Evaluation
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // Helper for cycle status badge
    const getCycleEvalInfo = (cycleId, empId) => {
        const ev = evaluations.find(e => String(e.employeeId) === String(empId) && String(e.cycleId) === String(cycleId));
        const sr = selfReviews.find(r => String(r.employeeId) === String(empId) && String(r.cycleId) === String(cycleId));
        let statusLabel = 'Not Started';
        let statusColor = '#9ca3af';
        let pct = null;
        if (ev?.status === 'approved') { statusLabel = 'Approved'; statusColor = '#10b981'; }
        else if (ev?.status === 'pending_approval') { statusLabel = 'Submitted'; statusColor = '#6366f1'; }
        else if (ev?.status === 'draft') { statusLabel = 'In Progress'; statusColor = '#f59e0b'; }
        else if (sr?.status === 'submitted' || sr?.status === 'approved') { statusLabel = 'Ready to Evaluate'; statusColor = '#3b82f6'; }
        if (ev?.subRating) { pct = Math.round((parseFloat(ev.subRating) / 5) * 100); }
        return { statusLabel, statusColor, pct };
    };
    const renderLearningTab = () => (
        renderEmployeeReadOnlyTab(
            'Learning & Development',
            "Employee's self-reported learning achievements and development goals.",
            selfReview?.metadata?.learning,
            'No learning & development details provided.'
        )
    );

    const renderFeedbackTab = () => (
        renderEmployeeReadOnlyTab(
            'Feedback',
            "Employee's feedback about the team, manager, or organizational processes.",
            selfReview?.metadata?.feedback,
            'No feedback provided.'
        )
    );
    // No topBarAction used anymore here

    const renderTabContent = () => {
        switch (activeTab) {
            case 1: return renderCompetenciesTab();
            case 2: return renderLearningTab();
            case 3:
                return (
                    <div>
                        {renderFeedbackTab()}
                        <div style={{ marginTop: '24px' }}>
                            {renderSummaryTab()}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div style={{ margin: '0 auto', padding: '0' }}>
            {/* Top Nav Bar — sticky */}
            <div style={{
                position: 'sticky', top: '-32px', zIndex: 100,
                margin: '-32px -40px 32px -40px',
                padding: '32px 40px 12px 40px',
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
                {/* Left: Title + Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                            {selectedCycleId ? cycles.find(c => c.id === selectedCycleId)?.name : 'Select a cycle'}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        {TABS.map(t => (
                            <button key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeTab === t.id ? 'var(--bg-primary)' : 'transparent',
                                    boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    color: activeTab === t.id ? 'var(--purple)' : 'var(--text-secondary)',
                                    fontWeight: activeTab === t.id ? 700 : 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap'
                                }}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Cycle dropdown + Back Draft Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    {/* Draft Button */}
                    {!isSubmitted && selectedEmp && isSelfReviewSubmitted && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleSubmit('draft')}
                            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        >
                            <span style={{ fontSize: '16px' }}>💾</span>
                            {status === 'new' ? 'Save Draft' : 'Update Draft'}
                        </button>
                    )}

                    {/* Cycle dropdown */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '220px' }}>
                        <div style={{
                            position: 'absolute',
                            left: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            pointerEvents: 'none',
                            color: 'var(--text-muted)',
                            zIndex: 1
                        }}>
                            <Icons.Cycles style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>CYCLE</span>
                        </div>
                        <select
                            className="form-select"
                            value={selectedCycleId}
                            onChange={e => { setSelectedCycleId(e.target.value); setStatus('draft'); setHasEdited(false); }}
                            style={{
                                paddingLeft: '75px',
                                fontWeight: 700,
                                fontSize: '13px',
                                width: '100%',
                                background: 'var(--bg-secondary)',
                                height: '42px'
                            }}
                        >
                            <option value="">Select Cycle...</option>
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <button onClick={() => navigate('/manager')} className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        ← Back
                    </button>
                </div>
            </div>

            {/* Full-width Content Area */}
            <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>

                {/* Employee Selection row */}
                <div style={{ marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                        Select Team Member
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap' }}>
                        {team.map(member => {
                            const info = getCycleEvalInfo(selectedCycleId, member.id);
                            const isSelected = selectedEmp === member.id;
                            return (
                                <button key={member.id}
                                    onClick={() => handleEmpChange(member.id)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                        padding: '12px 16px', borderRadius: '12px',
                                        background: isSelected ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                        border: isSelected ? '2px solid var(--purple)' : '1px solid var(--border)',
                                        cursor: 'pointer', minWidth: '200px', flexShrink: 0, transition: 'all 0.2s',
                                        boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none'
                                    }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginBottom: '6px' }}>
                                        {member.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: info.statusColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            width: '8px', height: '8px', borderRadius: '50%', backgroundColor: info.statusColor
                                        }}></span>
                                        {info.statusLabel || 'Not Started'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!selectedEmp ? (
                    <div className="card" style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '20px', fontWeight: 800 }}>Select a Team Member</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>Choose an employee from the top bar to start their performance evaluation.</p>
                    </div>
                ) : !isSelfReviewSubmitted ? (
                    <div className="card" style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '20px', fontWeight: 800 }}>Waiting for Employee</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>This employee has not yet submitted their self-review. You cannot begin your evaluation until their review is completed.</p>
                    </div>
                ) : (
                    <div>
                        {isReadOnly && !hasEdited && <div style={{
                            marginBottom: '20px', padding: '12px 20px',
                            background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)',
                            borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)'
                        }}>
                            🔒 This evaluation is {isSubmitted ? 'submitted and' : 'saved as a draft and'} <strong>read-only</strong>.
                        </div>}

                        <div style={{ minHeight: '400px' }}>
                            {renderTabContent()}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', marginBottom: '40px' }}>
                            <button className="btn btn-secondary" disabled={activeTab === 1} onClick={() => setActiveTab(p => p - 1)}>← Previous</button>
                            {activeTab < 3 && <button className="btn btn-primary" onClick={() => setActiveTab(p => p + 1)}>Next Section →</button>}
                        </div>
                    </div>
                )}
            </div>

            {/* Final Rating Modal */}
            {showRatingModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)'
                }}>
                    <div className="card" style={{ width: '480px', maxWidth: '95vw', padding: '32px', animation: 'slideUp 0.25s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>🏆 Final Rating Classification</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Assign an overall rating before submitting. This is hidden from the employee.</div>
                            </div>
                            <button onClick={() => setShowRatingModal(false)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '12px' }}>×</button>
                        </div>

                        <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Final Rating</label>
                                <select className="form-select" value={finalRating} onChange={e => { setFinalRating(e.target.value); setHasEdited(true); }}
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}>
                                    <option value="">Select a rating...</option>
                                    <option value="Outstanding">⭐ Outstanding</option>
                                    <option value="Exceeded">✅ Exceeded Expectations</option>
                                    <option value="Met">👍 Met Expectations</option>
                                    <option value="Below">⚠️ Below Expectations</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                    Sub-Rating <span style={{ color: 'var(--purple)', fontWeight: 700 }}>(Auto-calculated Average)</span>
                                </label>
                                <input type="number" step="0.1" min="1" max="5" className="form-input" placeholder="e.g. 4.2"
                                    value={subRating} onChange={e => { setSubRating(e.target.value); setHasEdited(true); }}
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }} />
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Score from 1 (Poor) to 5 (Outstanding)</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRatingModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }}
                                onClick={() => {
                                    if (!finalRating) { alert('Please select a Final Rating Classification.'); return; }
                                    if (!subRating || parseFloat(subRating) < 1 || parseFloat(subRating) > 5) { alert('Please provide a valid Sub-Rating between 1 and 5.'); return; }
                                    setShowRatingModal(false);
                                    handleSubmit('pending_approval');
                                }}>
                                🚀 Confirm &amp; Submit
                            </button>
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

