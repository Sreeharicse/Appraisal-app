import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const DEFAULT_QUESTIONS = [
    // Job-specific
    { id: 'q1', label: 'What do you think sets you apart in this role?', desc: 'Reflect on the unique skills, experiences, or qualities you bring to this position.', section: 'Job-specific' },
    { id: 'q2', label: 'How do you stay updated with industry trends?', desc: 'Describe the methods or resources you use to keep your knowledge current.', section: 'Job-specific' },
    { id: 'q3', label: 'Can you walk me through a recent project?', desc: 'Share a recent project — your role, the challenges faced, and the outcome.', section: 'Job-specific' },
    // Problem-solving
    { id: 'q4', label: 'Describe a tough problem you solved. How did you approach it?', desc: 'Walk through your structured thinking and resolution process.', section: 'Problem-solving' },
    { id: 'q5', label: 'How do you prioritize tasks when faced with multiple deadlines?', desc: 'Explain your approach to managing competing priorities.', section: 'Problem-solving' },
    { id: 'q6', label: 'What is your process for making tough decisions?', desc: 'Describe how you weigh options and commit to action under pressure.', section: 'Problem-solving' },
    // Leadership & Initiative
    { id: 'q7', label: 'Do you lead or participate in any initiatives outside work?', desc: 'Share examples of leadership or community initiatives beyond your core role.', section: 'Leadership & Initiative' },
    { id: 'q8', label: 'How do you motivate your team or colleagues?', desc: 'Describe strategies or examples of how you inspire others.', section: 'Leadership & Initiative' },
    { id: 'q9', label: 'Can you give an example of taking a calculated risk?', desc: 'Describe a situation where you stepped deliberately beyond your comfort zone.', section: 'Leadership & Initiative' },
    // Adaptability & Resilience
    { id: 'q10', label: 'How do you handle change or unexpected setbacks?', desc: 'Describe your mindset when plans change unexpectedly.', section: 'Adaptability & Resilience' },
    { id: 'q11', label: 'Can you describe a situation where you adapted to a new process?', desc: 'Share an example where you transitioned to a new workflow or tool.', section: 'Adaptability & Resilience' },
    { id: 'q12', label: 'How do you bounce back from failures?', desc: 'Reflect on a past failure and the steps you took to recover and move forward.', section: 'Adaptability & Resilience' },
];

export default function QuestionSets() {
    const { questionSets, createQuestionSet, updateQuestionSet, deleteQuestionSet, currentUser } = useApp();

    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [editingSet, setEditingSet] = useState(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formQuestions, setFormQuestions] = useState([...DEFAULT_QUESTIONS]);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const isReadOnly = currentUser.role !== 'hr' && currentUser.role !== 'admin';

    const openNew = () => {
        setEditingSet(null);
        setFormName('');
        setFormDesc('');
        setFormQuestions(DEFAULT_QUESTIONS.map(q => ({ ...q })));
        setView('edit');
    };

    const openEdit = (qs) => {
        setEditingSet(qs);
        setFormName(qs.name);
        setFormDesc(qs.description || '');
        // Load all questions from the set without any trimming
        const qs_copy = [...(qs.questions || [])];
        setFormQuestions(qs_copy);
        setView('edit');
    };

    const updateQuestion = (index, field, value) => {
        setFormQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const handleSave = async () => {
        if (!formName.trim()) return alert('Please enter a set name.');
        setSaving(true);
        const payload = { name: formName.trim(), description: formDesc.trim(), questions: formQuestions };
        let result;
        if (editingSet) {
            result = await updateQuestionSet(editingSet.id, payload);
        } else {
            result = await createQuestionSet(payload);
        }
        setSaving(false);
        if (result.success) {
            setView('list');
        } else {
            alert('Error saving: ' + result.error);
        }
    };

    const handleDelete = async (id) => {
        const result = await deleteQuestionSet(id);
        if (!result.success) alert('Delete failed: ' + result.error);
        setDeleteConfirm(null);
    };

    /* ── LIST VIEW ── */
    if (view === 'list') {
        return (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Question Sets</h2>
                        <p className="section-subtitle">Create and manage competency question sets for employee appraisals</p>
                    </div>
                    {!isReadOnly && (
                        <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>+</span> New Question Set
                        </button>
                    )}
                </div>

                {questionSets.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>No Question Sets Yet</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Run the SQL migration script first, then create a custom question set.</p>
                        {!isReadOnly && <button className="btn btn-primary" onClick={openNew} style={{ marginTop: '20px' }}>Create First Set</button>}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {questionSets.map(qs => (
                            <div key={qs.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{qs.name}</div>
                                    {qs.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{qs.description}</div>}
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {(qs.questions || []).slice(0, 5).map((q, i) => (
                                            <span key={i} className="badge badge-gray" style={{ fontSize: '11px' }}>{q.label?.split('.')[0] ? `Q${i+1}` : `Q${i+1}`}: {q.label?.split('. ').slice(1).join('. ')?.substring(0, 24)}</span>
                                        ))}
                                        {(qs.questions || []).length > 5 && <span className="badge badge-gray" style={{ fontSize: '11px' }}>+{(qs.questions || []).length - 5} more</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button className="btn btn-secondary" onClick={() => openEdit(qs)} style={{ fontSize: '12px', padding: '6px 14px' }}>
                                        {isReadOnly ? '👁 View' : '✏️ Edit'}
                                    </button>
                                    {!isReadOnly && (
                                        deleteConfirm === qs.id ? (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="btn" onClick={() => handleDelete(qs.id)} style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--red)', color: '#fff', border: 'none' }}>Confirm</button>
                                                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} style={{ fontSize: '12px', padding: '6px 12px' }}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(qs.id)} style={{ fontSize: '12px', padding: '6px 14px', color: 'var(--red)' }}>🗑 Delete</button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const sectionsCount = new Set(formQuestions.map(q => q.section || 'General')).size;

    /* ── EDIT VIEW ── */
    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')} style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ← Back to Sets
                    </button>
                    <h2 className="section-title">{editingSet ? 'Edit Question Set' : 'New Question Set'}</h2>
                    <p className="section-subtitle">Configure the competency questions for this set ({sectionsCount} sections, {formQuestions.length} questions)</p>
                </div>
                {!isReadOnly && (
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {saving ? '⏳ Saving...' : '💾 Save Set'}
                    </button>
                )}
            </div>

            {/* Set Details */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>Set Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label className="form-label">Set Name *</label>
                        <input
                            className="form-input"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            placeholder="e.g. Engineering Team Set"
                            disabled={isReadOnly}
                            style={{ background: 'var(--bg-secondary)' }}
                        />
                    </div>
                    <div>
                        <label className="form-label">Description</label>
                        <input
                            className="form-input"
                            value={formDesc}
                            onChange={e => setFormDesc(e.target.value)}
                            placeholder="Brief description of when to use this set"
                            disabled={isReadOnly}
                            style={{ background: 'var(--bg-secondary)' }}
                        />
                    </div>
                </div>
            </div>

            {/* Questions Editor — grouped by section */}
            {(() => {
                const sections = [];
                const seen = new Set();
                formQuestions.forEach(q => {
                    const sec = q.section || 'General';
                    if (!seen.has(sec)) { seen.add(sec); sections.push(sec); }
                });

                return sections.map(sec => {
                    const sectionQs = formQuestions.filter(q => (q.section || 'General') === sec);
                    const SECTION_ICONS = { 
                        'Job-specific': '💼', 'Problem-solving': '🧩', 'Leadership & Initiative': '🚀', 'Adaptability & Resilience': '🌱', 
                        'Strategic Thinking': '🧠', 'Leadership & Ownership': '🏆', 'Decision Making': '📊', 'Innovation & Improvement': '🚀', 
                        'Collaboration & Influence': '🤝', 'Performance & Results': '📈', 'General': '📋' 
                    };
                    const SECTION_COLORS = { 
                        'Job-specific': 'var(--blue-light)', 'Problem-solving': 'var(--purple)', 'Leadership & Initiative': '#10b981', 'Adaptability & Resilience': '#f59e0b', 
                        'Strategic Thinking': '#8b5cf6', 'Leadership & Ownership': '#f59e0b', 'Decision Making': '#06b6d4', 'Innovation & Improvement': '#10b981', 
                        'Collaboration & Influence': '#ec4899', 'Performance & Results': '#3b82f6', 'General': 'var(--text-secondary)' 
                    };

                    return (
                        <div key={sec} style={{ marginBottom: '36px' }}>
                            {/* Section Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
                                background: 'var(--bg-secondary)', border: `1px solid ${SECTION_COLORS[sec] || 'var(--border)'}22`
                            }}>
                                <span style={{ fontSize: '20px' }}>{SECTION_ICONS[sec] || '📋'}</span>
                                <div style={{ fontWeight: 800, fontSize: '14px', color: SECTION_COLORS[sec] || 'var(--text-primary)' }}>{sec}</div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{sectionQs.length} questions</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {sectionQs.map((q) => {
                                    const index = formQuestions.indexOf(q);
                                    return (
                                        <div key={q.id} className="card" style={{ borderLeft: `4px solid ${SECTION_COLORS[sec] || 'var(--purple)'}`, paddingLeft: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                <div style={{
                                                    width: '28px', height: '28px', borderRadius: '8px',
                                                    background: SECTION_COLORS[sec] || 'var(--purple)', color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '12px', fontWeight: 800, flexShrink: 0
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Question {index + 1}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div>
                                                    <label className="form-label" style={{ fontSize: '12px' }}>Label (short title)</label>
                                                    <input
                                                        className="form-input"
                                                        value={q.label}
                                                        onChange={e => updateQuestion(index, 'label', e.target.value)}
                                                        placeholder="Question Title"
                                                        disabled={isReadOnly}
                                                        style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label" style={{ fontSize: '12px' }}>Description (prompt for employee)</label>
                                                    <textarea
                                                        className="form-input"
                                                        value={q.desc}
                                                        onChange={e => updateQuestion(index, 'desc', e.target.value)}
                                                        placeholder="Enter the full question prompt that the employee will see..."
                                                        disabled={isReadOnly}
                                                        rows={3}
                                                        style={{ background: 'var(--bg-secondary)', resize: 'vertical', minHeight: '72px' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                });
            })()}

            {!isReadOnly && (
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {saving ? '⏳ Saving...' : '💾 Save Question Set'}
                    </button>
                </div>
            )}
        </div>
    );
}
