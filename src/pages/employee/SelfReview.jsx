import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function SelfReview() {
    const { currentUser, users, cycles, evaluations = [], selfReviews = [], getSelfReview, submitSelfReview, getScore, refreshData, setTopBarAction, questionSets, employeeOverrides } = useApp();

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const activeCycles = cycles.filter(c => c.status === 'active');
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [activeTab, setActiveTab] = useState(1);

    // Form State
    const [competencies, setCompetencies] = useState({});

    const [feedback, setFeedback] = useState('');
    const [learning, setLearning] = useState('');

    const [submitted, setSubmitted] = useState(false); // Legacy flag for some UI
    const [status, setStatus] = useState('new'); // 'new', 'draft', 'submitted'
    const [isLocked, setIsLocked] = useState(true);
    const [loading, setLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState({ title: '', body: '' });
    const [errors, setErrors] = useState({});

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

    // 2-Tier Question Set Resolution:
    // Priority 1: Cycle-specific employee override (set by HR per employee per cycle)
    // Priority 2: Job Title (designation) based mapping (global default)
    const latestUserData = users.find(u => u.id === currentUser.id) || currentUser;

    const resolveQuestionSet = (cycleId) => {
        // Priority 1: Cycle-specific override for this employee
        const override = employeeOverrides?.find(
            o => String(o.employeeId) === String(currentUser.id) && String(o.cycleId) === String(cycleId)
        );
        if (override) return questionSets.find(qs => qs.id === override.questionSetId) || null;

        // Priority 2: Designation (Job Title) mapping
        if (latestUserData?.designation) {
            const byDesignation = questionSets.find(qs => qs.targetDesignations?.includes(latestUserData.designation));
            if (byDesignation) return byDesignation;
        }

        // Priority 3: Common Question Set (Universal Default)
        const commonSet = questionSets.find(qs => qs.isCommon);
        if (commonSet) return commonSet;

        // Priority 4: Smart Search (Set named "Common")
        const namedCommon = questionSets.find(qs => qs.name.toLowerCase().includes('common'));
        if (namedCommon) return namedCommon;

        // Priority 5: First available set
        return questionSets[0] || null;
    };

    // Will be recomputed whenever selectedCycleId changes
    const assignedSet = resolveQuestionSet(selectedCycleId);
    const TEMPLATE_QUESTIONS = assignedSet ? assignedSet.questions : DEFAULT_COMPETENCY_QUESTIONS;

    const RATING_OPTIONS = [
        { value: 0, label: 'Select Rating...' },
        { value: 1, label: '1 — Poor' },
        { value: 2, label: '2 — Needs Improvement' },
        { value: 3, label: '3 — Meets Expectations' },
        { value: 4, label: '4 — Exceeds Expectations' },
        { value: 5, label: '5 — Outstanding' }
    ];

    // Initialize cycle
    useEffect(() => {
        if (!selectedCycleId && activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
        }
    }, [activeCycles, selectedCycleId]);

    const cycle = cycles.find(c => String(c.id) === String(selectedCycleId));
    const isActive = cycle?.status === 'active';
    const isClosed = cycle?.status === 'closed';
    const isSubmitted = status !== 'new' && status !== 'draft';
    const isReadOnly = isSubmitted || (status === 'draft' && isLocked) || !isActive;

    // Resolve question set: If cycle is closed OR review is already submitted, use the saved snapshot. 
    // Otherwise, use the live designation-based template so HR edits still apply to drafts.
    const existingReview = selfReviews.find(r => String(r.employeeId) === String(currentUser.id) && String(r.cycleId) === String(selectedCycleId));
    let COMPETENCY_QUESTIONS = TEMPLATE_QUESTIONS;

    const isActuallySubmitted = existingReview?.status === 'submitted' || existingReview?.status === 'approved';

    const hasSnapshot = existingReview?.metadata?.questions && existingReview.metadata.questions.length > 0;
    
    // Priority: Snapshot (Submitted) > Resolved Set (Draft/New)
    // We only lock to the snapshot if it's actually submitted or the cycle is closed.
    // If it's a draft, ALWAYS prefer the live HR Mapping (TEMPLATE_QUESTIONS) so HR overrides apply perfectly.
    if (isClosed || isActuallySubmitted) {
        if (hasSnapshot) {
            COMPETENCY_QUESTIONS = existingReview.metadata.questions;
        } else {
            COMPETENCY_QUESTIONS = DEFAULT_COMPETENCY_QUESTIONS;
        }
    }
    // Load existing data when cycle or employee changes
    useEffect(() => {
        if (!selectedCycleId) return;

        setLoading(true);
        const existing = getSelfReview(currentUser.id, selectedCycleId);

        if (existing) {


            const meta = existing.metadata || {};

            // Flatten questions for initialization
            const flatQs = (COMPETENCY_QUESTIONS.length > 0 && COMPETENCY_QUESTIONS[0].questions)
                ? COMPETENCY_QUESTIONS.reduce((acc, s) => [...acc, ...s.questions], [])
                : COMPETENCY_QUESTIONS;

            const loadedComps = meta.competencies || {};
            const initialComps = {};
            flatQs.forEach(q => {
                initialComps[q.id] = loadedComps[q.id] || { rating: 0, comment: '' };
            });
            setCompetencies(initialComps);

            setFeedback(meta.feedback || '');
            setLearning(meta.learning || '');

            setStatus(meta.status || 'submitted');
            setSubmitted(true);
            setIsLocked(true);
        } else {
            // Flatten questions for initialization
            const flatQs = (COMPETENCY_QUESTIONS.length > 0 && COMPETENCY_QUESTIONS[0].questions)
                ? COMPETENCY_QUESTIONS.reduce((acc, s) => [...acc, ...s.questions], [])
                : COMPETENCY_QUESTIONS;

            const initialComps = {};
            flatQs.forEach(q => {
                initialComps[q.id] = { rating: 0, comment: '' };
            });
            setCompetencies(initialComps);

            setFeedback('');
            setLearning('');
            setStatus('new');
            setSubmitted(false);
            setIsLocked(false);
        }
        setLoading(false);
    }, [selectedCycleId]);

    const handleSubmit = async (targetStatus) => {
        if (!selectedCycleId) return;

        const finalStatus = targetStatus || 'submitted';

        // Validation only applies if they are trying to submit it fully
        if (finalStatus === 'submitted') {
            const newErrors = {};
            let firstErrorTab = null;
            let firstErrorId = null;

            // Flatten questions for validation
            const flatQs = (COMPETENCY_QUESTIONS.length > 0 && COMPETENCY_QUESTIONS[0].questions)
                ? COMPETENCY_QUESTIONS.reduce((acc, s) => [...acc, ...s.questions], [])
                : COMPETENCY_QUESTIONS;

            // Check competencies
            const unratedCompetencies = flatQs.filter(q => !competencies[q.id] || competencies[q.id].rating === 0);
            if (unratedCompetencies.length > 0) {
                unratedCompetencies.forEach(q => newErrors[`comp-${q.id}`] = 'Please select a rating.');
                if (!firstErrorTab) {
                    firstErrorTab = 1;
                    firstErrorId = `comp-${unratedCompetencies[0].id}`;
                }
            }
            const poorCompetencyComments = flatQs.filter(q => !competencies[q.id]?.comment || competencies[q.id].comment.trim().length < 20);
            if (poorCompetencyComments.length > 0) {
                poorCompetencyComments.forEach(q => {
                    if (!newErrors[`comp-${q.id}`]) newErrors[`comp-${q.id}`] = 'Please provide a detailed explanation (min 20 chars).';
                });
                if (!firstErrorTab) {
                    firstErrorTab = 1;
                    firstErrorId = `comp-${poorCompetencyComments[0].id}`;
                }
            }

            // Learning tab (Tab 2)
            if (!learning.trim() || learning.trim().length < 20) {
                newErrors.learning = 'Please provide a detailed explanation (min 20 chars).';
                if (!firstErrorTab) { firstErrorTab = 2; firstErrorId = 'learning-input'; }
            }
            if (!feedback.trim() || feedback.trim().length < 20) {
                newErrors.feedback = 'Please provide a detailed explanation (min 20 chars).';
                if (!firstErrorTab) { firstErrorTab = 3; firstErrorId = 'feedback-input'; }
            }


            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                setActiveTab(firstErrorTab);
                setTimeout(() => {
                    const el = document.getElementById(firstErrorId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.focus();
                    }
                }, 100);
                return;
            }
        }

        await submitSelfReview({
            cycleId: selectedCycleId,
            employeeId: currentUser.id,

            competencies,
            feedback,
            learning,
            questions: COMPETENCY_QUESTIONS, // Permanent snapshot: Once submitted, these questions are locked forever
            status: finalStatus
        });

        setStatus(finalStatus);
        setSubmitted(true);
        setIsLocked(finalStatus === 'submitted');

        if (finalStatus === 'submitted') {
            setPopupMessage({ title: '🎊 Review Submitted!', body: 'Your self-review has been successfully submitted to your manager for evaluation.' });
        } else {
            setPopupMessage({ title: '💾 Draft Saved', body: 'Your progress has been saved securely. You can continue editing your review.' });
        }
        setShowPopup(true);
    };

    const TABS = [
        { id: 1, label: '🧩 Competencies' },
        { id: 2, label: '📚 Learning' },
        { id: 3, label: '💬 Feedback' },
    ];

    // No topBarAction used anymore here

    if (loading && selectedCycleId) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading review data...</div>;

    const evaluation = evaluations.find(e =>
        String(e.cycleId) === String(selectedCycleId) &&
        String(e.employeeId) === String(currentUser.id)
    );
    const mngComps = evaluation?.metadata?.competencies || {};
    const mngScore = evaluation ? getScore(currentUser.id, selectedCycleId) : null;

    const renderCompetenciesTab = () => {
        // Group questions by section.
        // If assignedSet.questions is already nested (new format), use it directly.
        // If it's flat (legacy), group it.
        let grouped = [];
        if (COMPETENCY_QUESTIONS.length > 0 && COMPETENCY_QUESTIONS[0].questions) {
            // New format: questions is an array of sections
            grouped = COMPETENCY_QUESTIONS.map(s => ({
                title: s.title,
                questions: s.questions
            }));
        } else {
            // Legacy flat format
            const sections = [];
            const seen = new Set();
            COMPETENCY_QUESTIONS.forEach(q => {
                const sec = q.section || 'Section 1';
                if (!seen.has(sec)) { seen.add(sec); sections.push(sec); }
            });
            grouped = sections.map(sec => ({
                title: sec,
                questions: COMPETENCY_QUESTIONS.filter(q => (q.section || 'Section 1') === sec)
            }));
        }

        const SECTION_ICONS = {
            'Job-specific': '💼', 'Problem-solving': '🧩', 'Leadership & Initiative': '🚀', 'Adaptability & Resilience': '🌱',
            'Strategic Thinking': '🧠', 'Leadership & Ownership': '🏆', 'Decision Making': '📊', 'Innovation & Improvement': '🚀',
            'Collaboration & Influence': '🤝', 'Performance & Results': '📈', 'Section 1': '📋'
        };
        const SECTION_COLORS = {
            'Job-specific': '#3b82f6', 'Problem-solving': '#8b5cf6', 'Leadership & Initiative': '#10b981', 'Adaptability & Resilience': '#f59e0b',
            'Strategic Thinking': '#c026d3', 'Leadership & Ownership': '#ea580c', 'Decision Making': '#0d9488', 'Innovation & Improvement': '#16a34a',
            'Collaboration & Influence': '#db2777', 'Performance & Results': '#2563eb', 'Section 1': 'var(--blue-light)'
        };

        return (
            <div style={{ paddingBottom: '40px' }}>
                <div className="card-title" style={{ marginBottom: '8px' }}>Detailed Self-Assessment</div>
                <p className="section-subtitle" style={{ marginBottom: '24px' }}>Rate yourself and view manager feedback for each question.</p>

                {grouped.map(({ title, questions }) => (
                    <div key={title} style={{ marginBottom: '40px' }}>
                        {/* Section Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '14px 20px', borderRadius: '14px', marginBottom: '24px',
                            background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-card) 100%)', 
                            border: `1px solid var(--border)`,
                            borderLeft: `5px solid ${SECTION_COLORS[title] || 'var(--blue-light)'}`,
                            boxShadow: 'var(--nm-shadow-sm)'
                        }}>
                            <span style={{ 
                                fontSize: '24px', 
                                background: 'var(--bg-card)', 
                                width: '40px', height: '40px', 
                                borderRadius: '10px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid var(--border)'
                            }}>
                                {SECTION_ICONS[title] || '📋'}
                            </span>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: '18px', color: SECTION_COLORS[title] || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{questions.length} Questions in this section</div>
                            </div>
                        </div>

                        {questions.map((q) => (
                            <div key={q.id} className="card" style={{ marginBottom: '32px', padding: '24px' }}>
                                <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--blue-light)', marginBottom: '8px' }}>{q.label} <span style={{ color: '#ef4444', fontSize: '15px' }}>*</span></div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>{q.desc}</div>

                                <div className="form-grid" style={{ gap: '24px' }}>
                                    {/* Employee Section */}
                                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--blue-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            👤 Employee Perspective
                                        </div>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Rating</label>
                                            <select
                                                className="form-select"
                                                style={{
                                                    width: '100%',
                                                    color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    background: 'var(--bg-secondary)',
                                                    opacity: 1,
                                                    pointerEvents: isReadOnly ? 'none' : 'auto',
                                                    cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                                }}
                                                tabIndex={isReadOnly ? -1 : 0}
                                                value={competencies[q.id]?.rating || 0}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setCompetencies(p => ({
                                                        ...p,
                                                        [q.id]: { ...p[q.id], rating: val }
                                                    }));
                                                    if (val > 0 && errors[`comp-${q.id}`]) {
                                                        setErrors(p => ({ ...p, [`comp-${q.id}`]: null }));
                                                    }
                                                }}
                                            >
                                                {RATING_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            {errors[`comp-${q.id}`] && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>{errors[`comp-${q.id}`]}</div>}
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Comments / Examples</label>
                                            <textarea
                                                id={`comp-${q.id}`}
                                                className="form-input"
                                                placeholder="Provide detailed explanation with examples and achievements..."
                                                style={{
                                                    height: '180px',
                                                    overflowY: 'scroll',
                                                    width: '100%',
                                                    fontSize: '14px',
                                                    color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    background: 'var(--bg-secondary)',
                                                    cursor: isReadOnly ? 'not-allowed' : 'text',
                                                    border: errors[`comp-${q.id}`]?.includes('chars') ? '1px solid var(--red)' : undefined
                                                }}
                                                readOnly={isReadOnly}
                                                value={competencies[q.id]?.comment || ''}
                                                onChange={e => {
                                                    if (isReadOnly) return;
                                                    setCompetencies(p => ({
                                                        ...p,
                                                        [q.id]: { ...p[q.id], comment: e.target.value }
                                                    }));
                                                    if (errors[`comp-${q.id}`]) setErrors(p => ({ ...p, [`comp-${q.id}`]: null }));
                                                }}
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
                                            <div className="read-only-text" style={{
                                                padding: '12px',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                height: '180px',
                                                overflowY: 'scroll',
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
                ))}
            </div>
        );
    };
    const renderLearningTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Learning & Development</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Track completed training or define future developmental aspirations.</p>
            <textarea id="learning-input" className="form-textarea" rows={10} placeholder="Training completed, certifications, or desired skills..."
                readOnly={isReadOnly}
                style={{
                    color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    cursor: isReadOnly ? 'not-allowed' : 'text',
                    border: errors.learning ? '1px solid var(--red)' : undefined,
                    height: '180px',
                    overflowY: 'scroll'
                }}
                value={learning} onChange={e => {
                    if (isReadOnly) return;
                    setLearning(e.target.value);
                    if (errors.learning) setErrors({ ...errors, learning: null });
                }} />
            {errors.learning && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>{errors.learning}</div>}
        </div>
    );

    const renderFeedbackTab = () => (
        <div>
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>Employee Feedback</div>
                <p className="section-subtitle" style={{ marginBottom: '16px' }}>Feedback about the team, manager, or organizational processes.</p>
                <textarea id="feedback-input" className="form-textarea" rows={8} placeholder="Provide your feedback..."
                    readOnly={isReadOnly}
                    style={{
                        color: isReadOnly ? 'var(--text-muted)' : 'var(--text-primary)',
                        background: 'var(--bg-secondary)',
                        cursor: isReadOnly ? 'not-allowed' : 'text',
                        border: errors.feedback ? '1px solid var(--red)' : undefined,
                        height: '150px',
                        overflowY: 'scroll'
                    }}
                    value={feedback} onChange={e => {
                        if (isReadOnly) return;
                        setFeedback(e.target.value);
                        if (errors.feedback) setErrors({ ...errors, feedback: null });
                    }} />
                {errors.feedback && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>{errors.feedback}</div>}
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
                    <div className="read-only-text" style={{ fontSize: '13px', fontStyle: evaluation.feedback ? 'normal' : 'italic', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', height: '160px', maxHeight: '160px', overflowY: 'scroll', lineHeight: '1.6' }}>
                        {evaluation.feedback || 'No summary feedback provided.'}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                {!isSubmitted && isActive && (
                    <button type="button" className="btn btn-primary" onClick={() => handleSubmit('submitted')} style={{ padding: '12px 32px', fontWeight: 700 }}>
                        🚀 Submit Full Appraisal
                    </button>
                )}
                {isSubmitted && (
                    <button type="button" className="btn btn-primary" disabled style={{ padding: '12px 32px', fontWeight: 700, opacity: 0.7 }}>
                        ✅ Submitted
                    </button>
                )}
                {!isSubmitted && !isActive && (
                    <button type="button" className="btn btn-primary" disabled style={{ padding: '12px 32px', fontWeight: 700, opacity: 0.7 }}>
                        🔒 {isClosed ? 'Closed' : 'Not Active'}
                    </button>
                )}
            </div>
        </div>
    );
    const renderTabContent = () => {
        switch (activeTab) {
            case 1: return renderCompetenciesTab();
            case 2: return renderLearningTab();
            case 3: return renderFeedbackTab();
            default: return null;
        }
    };

    return (
        <div style={{ margin: '0 auto', padding: '0' }}>
            {/* Top Nav Bar — sticks at top of scrollable content */}
            <div style={{
                position: 'sticky', top: '-32px', zIndex: 100,
                margin: '-32px -40px 32px -40px',
                padding: '32px 40px 12px 40px',
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
                {/* Left: Tabs only */}
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
                                color: activeTab === t.id ? 'var(--blue-light)' : 'var(--text-secondary)',
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

                {/* Right: Cycle dropdown Context */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    {/* Edit button when draft is locked */}
                    {!isSubmitted && isActive && status === 'draft' && isLocked && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsLocked(false)}
                            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        >
                            <span style={{ fontSize: '16px' }}>✏️</span>
                            Edit Draft
                        </button>
                    )}

                    {/* Save/Update Draft button when unlocked */}
                    {!isSubmitted && isActive && !(status === 'draft' && isLocked) && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleSubmit('draft')}
                            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        >
                            <span style={{ fontSize: '16px' }}>💾</span>
                            {status === 'new' ? 'Save Draft' : 'Update Draft'}
                        </button>
                    )}

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
                            onChange={e => setSelectedCycleId(e.target.value)}
                            style={{
                                paddingLeft: '75px',
                                fontWeight: 700,
                                fontSize: '13px',
                                width: '100%',
                                background: 'var(--bg-secondary)',
                                height: '42px'
                            }}
                        >
                            {cycles.filter(c => c.status !== 'draft').map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.status === 'closed' ? '(Closed)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Full-width Content Area */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px' }}>
                {isReadOnly && <div style={{
                    marginBottom: '20px', padding: '12px 20px',
                    background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)',
                    borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)'
                }}>
                    🔒 {!isActive
                        ? `This cycle is ${cycle?.status}. No changes are allowed.`
                        : <>This review is {isSubmitted ? 'submitted and' : 'saved as a draft and'} <strong>read-only</strong>.</>}
                </div>}

                <div style={{ minHeight: '400px' }}>
                    {!selectedCycleId && <div className="alert alert-warning">⚠️ No active appraisal cycle found.</div>}
                    {selectedCycleId && renderTabContent()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', marginBottom: '40px' }}>
                    <button className="btn btn-secondary" disabled={activeTab === 1} onClick={() => setActiveTab(p => p - 1)}>← Previous</button>
                    {activeTab < 3 && <button className="btn btn-primary" onClick={() => setActiveTab(p => p + 1)}>Next Section →</button>}
                </div>
            </div>

            {/* Custom Popup Overlay */}
            {showPopup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{popupMessage.title.includes('Draft') ? '💾' : '✨'}</div>
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
