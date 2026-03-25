import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

const SECTION_ICONS = {
    'Job-specific': '💼', 'Problem-solving': '🧩', 'Leadership & Initiative': '🚀',
    'Adaptability & Resilience': '🌱', 'Strategic Thinking': '🧠', 'Leadership & Ownership': '🏆',
    'Decision Making': '📊', 'Innovation & Improvement': '💡', 'Collaboration & Influence': '🤝',
    'Performance & Results': '📈', 'General': '📋',
};
const SECTION_COLORS = {
    'Job-specific': 'var(--blue-light)', 'Problem-solving': 'var(--purple)',
    'Leadership & Initiative': '#10b981', 'Adaptability & Resilience': '#f59e0b',
    'Strategic Thinking': '#8b5cf6', 'Leadership & Ownership': '#f59e0b',
    'Decision Making': '#06b6d4', 'Innovation & Improvement': '#10b981',
    'Collaboration & Influence': '#ec4899', 'Performance & Results': '#3b82f6',
    'General': 'var(--text-secondary)',
};
const DEFAULT_SECTION_COLORS = [
    'var(--blue-light)', 'var(--purple)', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6',
];

function getSectionColor(name, idx) {
    return SECTION_COLORS[name] || DEFAULT_SECTION_COLORS[idx % DEFAULT_SECTION_COLORS.length];
}
function getSectionIcon(name) {
    return SECTION_ICONS[name] || '📋';
}

export default function QuestionSets() {
    const { questionSets, createQuestionSet, updateQuestionSet, deleteQuestionSet, currentUser } = useApp();

    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [editingSet, setEditingSet] = useState(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formSections, setFormSections] = useState([]);   // [{ name, icon }]
    const [formQuestions, setFormQuestions] = useState([]); // [{ id, label, desc, section }]
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const isReadOnly = currentUser.role !== 'hr' && currentUser.role !== 'admin';

    const makeId = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // ── Open New ──
    const openNew = () => {
        setEditingSet(null);
        setFormName('');
        setFormDesc('');
        const secName = 'Section 1';
        setFormSections([{ name: secName, icon: '📋' }]);
        setFormQuestions([
            { id: makeId(), label: '', desc: '', section: secName },
            { id: makeId(), label: '', desc: '', section: secName },
            { id: makeId(), label: '', desc: '', section: secName },
        ]);
        setView('edit');
    };

    // ── Open Edit ──
    const openEdit = (qs) => {
        setEditingSet(qs);
        setFormName(qs.name);
        setFormDesc(qs.description || '');
        const qs_copy = (qs.questions || []).map(q => ({ ...q }));
        setFormQuestions(qs_copy);
        // Derive ordered sections from questions
        const seen = new Set();
        const secs = [];
        qs_copy.forEach(q => {
            const sec = q.section || 'General';
            if (!seen.has(sec)) { seen.add(sec); secs.push({ name: sec, icon: getSectionIcon(sec) }); }
        });
        setFormSections(secs);
        setView('edit');
    };

    // ── Section operations ──
    const addSection = () => {
        const secName = `Section ${formSections.length + 1}`;
        setFormSections(p => [...p, { name: secName, icon: '📋' }]);
        setFormQuestions(p => [...p,
            { id: makeId(), label: '', desc: '', section: secName },
            { id: makeId(), label: '', desc: '', section: secName },
        ]);
    };

    const renameSection = (oldName, newName) => {
        setFormSections(p => p.map(s => s.name === oldName ? { ...s, name: newName } : s));
        setFormQuestions(p => p.map(q => q.section === oldName ? { ...q, section: newName } : q));
    };

    const setSectionIcon = (name, icon) => {
        setFormSections(p => p.map(s => s.name === name ? { ...s, icon } : s));
    };

    const deleteSection = (name) => {
        setFormSections(p => p.filter(s => s.name !== name));
        setFormQuestions(p => p.filter(q => q.section !== name));
    };

    // ── Question operations ──
    const updateQuestion = (id, field, value) => {
        setFormQuestions(p => p.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const addQuestion = (section) => {
        setFormQuestions(p => [...p, { id: makeId(), label: '', desc: '', section }]);
    };

    const removeQuestion = (id) => {
        setFormQuestions(p => p.filter(q => q.id !== id));
    };

    // ── Save ──
    const handleSave = async () => {
        if (!formName.trim()) return alert('Please enter a set name.');
        // Re-index questions to stable IDs (q1, q2, …)
        const indexed = formQuestions.map((q, i) => ({ ...q, id: `q${i + 1}` }));
        setSaving(true);
        const payload = { name: formName.trim(), description: formDesc.trim(), questions: indexed };
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
                                            <span key={i} className="badge badge-gray" style={{ fontSize: '11px' }}>Q{i + 1}: {(q.label || '—').substring(0, 24)}</span>
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
    const sectionsCount = formSections.length;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')} style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ← Back to Sets
                    </button>
                    <h2 className="section-title">{editingSet ? 'Edit Question Set' : 'New Question Set'}</h2>
                    <p className="section-subtitle">Configure sections and competency questions for this set ({sectionsCount} sections, {formQuestions.length} questions)</p>
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
                        <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)}
                            placeholder="e.g. Engineering Team Set" disabled={isReadOnly} style={{ background: 'var(--bg-secondary)' }} />
                    </div>
                    <div>
                        <label className="form-label">Description</label>
                        <input className="form-input" value={formDesc} onChange={e => setFormDesc(e.target.value)}
                            placeholder="Brief description of when to use this set" disabled={isReadOnly} style={{ background: 'var(--bg-secondary)' }} />
                    </div>
                </div>
            </div>

            {/* Sections Editor */}
            {formSections.map((sec, secIdx) => {
                const color = getSectionColor(sec.name, secIdx);
                const sectionQs = formQuestions.filter(q => q.section === sec.name);

                return (
                    <div key={secIdx} style={{ marginBottom: '40px' }}>

                        {/* ── Section Header (Editable) ── */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
                            background: 'var(--bg-secondary)', border: `1px solid ${color}33`
                        }}>
                            {/* Icon picker */}
                            {!isReadOnly ? (
                                <input
                                    value={sec.icon}
                                    onChange={e => setSectionIcon(sec.name, e.target.value)}
                                    style={{
                                        width: '44px', fontSize: '20px', background: 'transparent',
                                        border: '1px dashed var(--border)', borderRadius: '6px',
                                        textAlign: 'center', cursor: 'text', padding: '2px',
                                        color: 'var(--text-primary)'
                                    }}
                                    title="Type an emoji for this section"
                                    maxLength={4}
                                />
                            ) : (
                                <span style={{ fontSize: '20px' }}>{sec.icon}</span>
                            )}

                            {/* Section name input */}
                            {!isReadOnly ? (
                                <input
                                    value={sec.name}
                                    onChange={e => renameSection(sec.name, e.target.value)}
                                    placeholder="Section title..."
                                    style={{
                                        flex: 1, fontWeight: 800, fontSize: '14px',
                                        color, background: 'transparent',
                                        border: 'none', outline: 'none',
                                        borderBottom: `1px dashed ${color}66`,
                                    }}
                                />
                            ) : (
                                <div style={{ fontWeight: 800, fontSize: '14px', color, flex: 1 }}>{sec.name}</div>
                            )}

                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                {sectionQs.length} questions
                            </span>

                            {/* Delete Section */}
                            {!isReadOnly && formSections.length > 1 && (
                                <button
                                    onClick={() => deleteSection(sec.name)}
                                    title="Remove this section and its questions"
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '16px', color: 'var(--red)', opacity: 0.7,
                                        paddingLeft: '8px', flexShrink: 0
                                    }}>🗑</button>
                            )}
                        </div>

                        {/* ── Questions in this section ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {sectionQs.map((q) => {
                                const globalIndex = formQuestions.indexOf(q);
                                return (
                                    <div key={q.id} className="card" style={{ borderLeft: `4px solid ${color}`, paddingLeft: '20px', position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '8px',
                                                background: color, color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 800, flexShrink: 0
                                            }}>
                                                {globalIndex + 1}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Question {globalIndex + 1}
                                            </div>
                                            {/* Remove question button */}
                                            {!isReadOnly && sectionQs.length > 1 && (
                                                <button
                                                    onClick={() => removeQuestion(q.id)}
                                                    title="Remove this question"
                                                    style={{
                                                        marginLeft: 'auto', background: 'none', border: 'none',
                                                        cursor: 'pointer', fontSize: '15px', color: 'var(--red)', opacity: 0.7
                                                    }}>✕</button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px' }}>Label (short title)</label>
                                                <input className="form-input" value={q.label}
                                                    onChange={e => updateQuestion(q.id, 'label', e.target.value)}
                                                    placeholder="Question Title"
                                                    disabled={isReadOnly}
                                                    style={{ background: 'var(--bg-secondary)', fontWeight: 600 }} />
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px' }}>Description (prompt for employee)</label>
                                                <textarea className="form-input" value={q.desc}
                                                    onChange={e => updateQuestion(q.id, 'desc', e.target.value)}
                                                    placeholder="Enter the full question prompt that the employee will see..."
                                                    disabled={isReadOnly} rows={3}
                                                    style={{ background: 'var(--bg-secondary)', resize: 'vertical', minHeight: '72px' }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Question to this section */}
                        {!isReadOnly && (
                            <button
                                onClick={() => addQuestion(sec.name)}
                                style={{
                                    marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                    background: `${color}14`, border: `1px dashed ${color}66`,
                                    color, cursor: 'pointer', transition: 'all 0.2s'
                                }}>
                                + Add Question to "{sec.name}"
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Add Section button */}
            {!isReadOnly && (
                <div style={{ marginBottom: '32px' }}>
                    <button
                        onClick={addSection}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                            background: 'var(--bg-secondary)', border: '2px dashed var(--border)',
                            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}>
                        ➕ Add New Section
                    </button>
                </div>
            )}

            {!isReadOnly && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {saving ? '⏳ Saving...' : '💾 Save Question Set'}
                    </button>
                </div>
            )}
        </div>
    );
}
