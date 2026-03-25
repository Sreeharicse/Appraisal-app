import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const DEFAULT_QUESTIONS = [
    { id: 'q1', label: '1. Quality of Work', desc: 'How consistently do you deliver high-quality work in your role?' },
    { id: 'q2', label: '2. Technical Competency', desc: 'Evaluate your technical skills required for your role.' },
    { id: 'q3', label: '3. Problem Solving', desc: 'Describe your ability to analyze problems and find effective solutions.' },
    { id: 'q4', label: '4. Productivity and Efficiency', desc: 'How effectively do you manage your workload and meet deadlines?' },
    { id: 'q5', label: '5. Communication Skills', desc: 'Evaluate how clearly and effectively you communicate with your team.' },
    { id: 'q6', label: '6. Team Collaboration', desc: 'How well do you collaborate with colleagues and contribute to team goals?' },
    { id: 'q7', label: '7. Initiative and Ownership', desc: 'Describe situations where you took initiative beyond your assigned responsibilities.' },
    { id: 'q8', label: '8. Time Management', desc: 'How effectively do you manage your time while balancing multiple responsibilities?' },
    { id: 'q9', label: '9. Contribution to Project Success', desc: 'Explain how your work contributed to the success of your projects.' },
    { id: 'q10', label: '10. Professional Behavior', desc: 'Evaluate how you demonstrate professionalism in the workplace.' },
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
        // Ensure exactly 10 questions; pad/trim as needed
        const qs_copy = [...(qs.questions || [])];
        while (qs_copy.length < 10) qs_copy.push({ id: `q${qs_copy.length + 1}`, label: `${qs_copy.length + 1}. New Question`, desc: '' });
        setFormQuestions(qs_copy.slice(0, 10));
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

    /* ── EDIT VIEW ── */
    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')} style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ← Back to Sets
                    </button>
                    <h2 className="section-title">{editingSet ? 'Edit Question Set' : 'New Question Set'}</h2>
                    <p className="section-subtitle">Configure the 10 competency questions for this set</p>
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

            {/* Questions Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formQuestions.map((q, i) => (
                    <div key={q.id} className="card" style={{ borderLeft: '4px solid var(--purple)', paddingLeft: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: 'var(--purple)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: 800, flexShrink: 0
                            }}>
                                {i + 1}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Question {i + 1} of 10
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '12px' }}>Label (short title)</label>
                                <input
                                    className="form-input"
                                    value={q.label}
                                    onChange={e => updateQuestion(i, 'label', e.target.value)}
                                    placeholder={`${i + 1}. Question Title`}
                                    disabled={isReadOnly}
                                    style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '12px' }}>Description (prompt for employee)</label>
                                <textarea
                                    className="form-input"
                                    value={q.desc}
                                    onChange={e => updateQuestion(i, 'desc', e.target.value)}
                                    placeholder="Enter the full question prompt that the employee will see..."
                                    disabled={isReadOnly}
                                    rows={3}
                                    style={{ background: 'var(--bg-secondary)', resize: 'vertical', minHeight: '72px' }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
