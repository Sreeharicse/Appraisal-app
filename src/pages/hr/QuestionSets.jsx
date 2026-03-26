import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

const DEFAULT_SECTIONS = [
    {
        id: 'sec-1',
        title: 'Job-specific',
        questions: [
            { id: 'q1', label: 'What do you think sets you apart in this role?', desc: 'Reflect on the unique skills, experiences, or qualities you bring to this position.' },
            { id: 'q2', label: 'How do you stay updated with industry trends?', desc: 'Describe the methods or resources you use to keep your knowledge current.' },
            { id: 'q3', label: 'Can you walk me through a recent project?', desc: 'Share a recent project — your role, the challenges faced, and the outcome.' }
        ]
    },
    {
        id: 'sec-2',
        title: 'Problem-solving',
        questions: [
            { id: 'q4', label: 'Describe a tough problem you solved. How did you approach it?', desc: 'Walk through your structured thinking and resolution process.' },
            { id: 'q5', label: 'How do you prioritize tasks when faced with multiple deadlines?', desc: 'Explain your approach to managing competing priorities.' },
            { id: 'q6', label: 'What is your process for making tough decisions?', desc: 'Describe how you weigh options and commit to action under pressure.' }
        ]
    }
];

export default function QuestionSets() {
    const { questionSets, createQuestionSet, updateQuestionSet, deleteQuestionSet, setCommonQuestionSet, currentUser, designations } = useApp();

    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [editingSet, setEditingSet] = useState(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formDesignations, setFormDesignations] = useState([]);
    const [formSections, setFormSections] = useState([]);
    const [formIsCommon, setFormIsCommon] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const isReadOnly = currentUser.role !== 'hr' && currentUser.role !== 'admin';

    const openNew = () => {
        setEditingSet(null);
        setFormName('');
        setFormDesc('');
        setFormDesignations([]);
        setFormIsCommon(false);
        // Convert default sections to empty placeholders for a fresh set if desired, 
        // but here we'll provide the standard structure as a starting point.
        setFormSections(DEFAULT_SECTIONS.map(s => ({
            ...s,
            id: 'sec-' + Math.random().toString(36).substr(2, 9),
            questions: s.questions.map(q => ({ ...q, id: 'q-' + Math.random().toString(36).substr(2, 9), label: '', desc: '' }))
        })));
        setView('edit');
    };

    const openEdit = (qs) => {
        setEditingSet(qs);
        setFormName(qs.name);
        setFormDesc(qs.description || '');
        setFormDesignations(qs.targetDesignations || []);
        setFormIsCommon(!!qs.isCommon);
        
        // Handle backward compatibility: If qs.questions is flat, group it by 'section'
        const rawQs = qs.questions || [];
        if (rawQs.length > 0 && !rawQs[0].questions) {
            const grouped = [];
            const seen = {};
            rawQs.forEach(q => {
                const secTitle = q.section || 'General';
                if (!seen[secTitle]) {
                    seen[secTitle] = { id: 'sec-' + Math.random().toString(36).substr(2, 9), title: secTitle, questions: [] };
                    grouped.push(seen[secTitle]);
                }
                seen[secTitle].questions.push({ id: q.id, label: q.label, desc: q.desc });
            });
            setFormSections(grouped);
        } else {
            setFormSections(qs.questions || []);
        }
        
        setView('edit');
    };

    // ── Section Actions ──
    const addSection = () => {
        setFormSections(prev => [
            ...prev,
            { id: 'sec-' + Math.random().toString(36).substr(2, 9), title: `Section ${prev.length + 1}`, questions: [] }
        ]);
    };

    const updateSectionTitle = (secId, title) => {
        setFormSections(prev => prev.map(s => s.id === secId ? { ...s, title } : s));
    };

    const deleteSection = (secId) => {
        setFormSections(prev => prev.filter(s => s.id !== secId));
    };

    // ── Question Actions ──
    const addQuestion = (secId) => {
        setFormSections(prev => prev.map(s => {
            if (s.id !== secId) return s;
            return {
                ...s,
                questions: [
                    ...s.questions,
                    { id: 'q-' + Math.random().toString(36).substr(2, 9), label: '', desc: '' }
                ]
            };
        }));
    };

    const updateQuestion = (secId, qId, field, value) => {
        setFormSections(prev => prev.map(s => {
            if (s.id !== secId) return s;
            return {
                ...s,
                questions: s.questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
            };
        }));
    };

    const deleteQuestion = (secId, qId) => {
        setFormSections(prev => prev.map(s => {
            if (s.id !== secId) return s;
            return {
                ...s,
                questions: s.questions.filter(q => q.id !== qId)
            };
        }));
    };

    const handleSave = async () => {
        if (!formName.trim()) return alert('Please enter a set name.');
        
        // Validation: At least one section and one question
        if (formSections.length === 0) return alert('Please add at least one section.');
        const totalQs = formSections.reduce((sum, s) => sum + s.questions.length, 0);
        if (totalQs === 0) return alert('Please add at least one question.');

        // Validation: Empty titles/text
        for (const sec of formSections) {
            if (!sec.title.trim()) return alert('All sections must have a title.');
            for (const q of sec.questions) {
                if (!q.label.trim()) return alert('All questions must have a label.');
            }
        }

        setSaving(true);
        const payload = { 
            name: formName.trim(), 
            description: formDesc.trim(), 
            questions: formSections, // Storing as nested array
            targetDesignations: formDesignations,
            isCommon: formIsCommon
        };
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

    const handleSetCommon = async (id) => {
        const result = await setCommonQuestionSet(id);
        if (!result.success) alert('Failed to set default: ' + result.error);
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
                        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Create a custom question set to start appraisals.</p>
                        {!isReadOnly && <button className="btn btn-primary" onClick={openNew} style={{ marginTop: '20px' }}>Create First Set</button>}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {questionSets.map(qs => {
                            // Calculate stats
                            const sCount = qs.questions?.[0]?.questions ? qs.questions.length : new Set((qs.questions || []).map(q => q.section)).size;
                            const qCount = qs.questions?.[0]?.questions ? qs.questions.reduce((sum, s) => sum + s.questions.length, 0) : (qs.questions || []).length;

                            return (
                                <div 
                                    key={qs.id} 
                                    className="card" 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        gap: '16px',
                                        border: qs.isCommon ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid var(--border)',
                                        background: qs.isCommon ? 'linear-gradient(to right, rgba(234, 179, 8, 0.05), transparent)' : 'var(--bg-card)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {qs.isCommon && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '4px',
                                            height: '100%',
                                            background: '#eab308'
                                        }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{qs.name}</div>
                                            {qs.isCommon && (
                                                <span className="badge" style={{ 
                                                    fontSize: '10px', 
                                                    background: 'rgba(234, 179, 8, 0.15)', 
                                                    color: '#eab308', 
                                                    border: '1px solid rgba(234, 179, 8, 0.3)', 
                                                    padding: '2px 8px',
                                                    fontWeight: 700,
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    ⭐ System Default
                                                </span>
                                            )}
                                        </div>
                                        {qs.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{qs.description}</div>}
                                        
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                                                {sCount} Sections · {qCount} Questions
                                            </span>
                                            {qs.targetDesignations && qs.targetDesignations.length > 0 && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {qs.targetDesignations.slice(0, 3).map((tg, i) => (
                                                        <span key={i} className="badge badge-primary" style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue-light)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                            💼 {tg}
                                                        </span>
                                                    ))}
                                                    {qs.targetDesignations.length > 3 && (
                                                        <span className="badge badge-gray" style={{ fontSize: '10px' }}>+{qs.targetDesignations.length - 3} more</span>
                                                    )}
                                                </div>
                                            )}
                                            {!qs.isCommon && qs.name.toLowerCase().includes('common') && (
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    (Recommended for Default)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                        {!isReadOnly && !qs.isCommon && (
                                            <button 
                                                className="btn btn-secondary" 
                                                onClick={() => handleSetCommon(qs.id)}
                                                style={{ fontSize: '11px', padding: '6px 12px', borderColor: 'rgba(234, 179, 8, 0.3)', color: 'var(--text-secondary)' }}
                                            >
                                                👑 Make Default
                                            </button>
                                        )}
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
                                                <button 
                                                    className="btn btn-secondary" 
                                                    onClick={() => setDeleteConfirm(qs.id)} 
                                                    disabled={qs.isCommon}
                                                    style={{ fontSize: '12px', padding: '6px 14px', color: qs.isCommon ? 'var(--text-muted)' : 'var(--red)', opacity: qs.isCommon ? 0.5 : 1 }}
                                                >
                                                    🗑 Delete
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    const totalQuestionsCount = formSections.reduce((sum, s) => sum + s.questions.length, 0);

    /* ── EDIT VIEW ── */
    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px', animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                .section-container:hover { border-color: var(--blue-light) !important; box-shadow: 0 8px 30px rgba(0,0,0,0.08) !important; }
                .question-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
                .form-input:focus { border-color: var(--blue-light) !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important; }
                .btn-add:hover { background: rgba(59, 130, 246, 0.08) !important; border-style: solid !important; }
            `}</style>

            <div className="section-header" style={{ position: 'sticky', top: '-1px', zIndex: 100, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '20px 0', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')} style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}>
                        ← Back to Sets
                    </button>
                    <h2 className="section-title" style={{ fontSize: '24px', fontWeight: 800 }}>{editingSet ? '✏️ Edit Question Set' : '✨ New Question Set'}</h2>
                    <p className="section-subtitle">Configure the competency questions for this set ({formSections.length} sections, {totalQuestionsCount} questions)</p>
                </div>
                {!isReadOnly && (
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                        {saving ? <Icons.Spinner /> : <Icons.Save />}
                        {saving ? 'Saving...' : 'Save Question Set'}
                    </button>
                )}
            </div>

            {/* Set Details */}
            <div className="card" style={{ marginBottom: '40px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div className="card-title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--blue-light)' }}><Icons.Settings style={{ width: 18, height: 18 }} /></div>
                    Basic Configuration
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label className="form-label" style={{ fontWeight: 600 }}>Set Name *</label>
                            <input
                                className="form-input"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="e.g. Engineering Team Set"
                                disabled={isReadOnly}
                                style={{ borderRadius: '10px', padding: '12px 16px' }}
                            />
                        </div>
                        <div>
                            <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
                            <input
                                className="form-input"
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                                placeholder="When should this set be used?"
                                disabled={isReadOnly}
                                style={{ borderRadius: '10px', padding: '12px 16px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>Target Job Titles (Designations)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            {designations.map(d => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                        if (formDesignations.includes(d.name)) {
                                            setFormDesignations(p => p.filter(x => x !== d.name));
                                        } else {
                                            setFormDesignations(p => [...p, d.name]);
                                        }
                                    }}
                                    className={`badge ${formDesignations.includes(d.name) ? 'badge-primary' : 'badge-gray'}`}
                                    style={{ 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        padding: '8px 16px', 
                                        fontSize: '13px',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s',
                                        background: formDesignations.includes(d.name) ? 'var(--blue-light)' : 'rgba(0,0,0,0.05)',
                                        color: formDesignations.includes(d.name) ? 'white' : 'var(--text-secondary)'
                                    }}
                                    disabled={isReadOnly}
                                >
                                    {d.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', padding: '20px', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.08), transparent)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.15)', transition: 'transform 0.2s' }}>
                                <input 
                                    type="checkbox" 
                                    checked={formIsCommon} 
                                    onChange={e => setFormIsCommon(e.target.checked)}
                                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--green-light)' }}
                                />
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        👑 Set as System Default (Common)
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>Automatically assigned to all employees without a specific job-title mapping.</div>
                                </div>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Questions Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {formSections.map((sec, sIdx) => (
                    <div key={sec.id} className="section-container" style={{ 
                        position: 'relative', 
                        padding: '32px', 
                        borderRadius: '24px', 
                        border: '1px solid var(--border)', 
                        background: 'var(--bg-card)', 
                        transition: 'all 0.3s ease',
                        animation: 'slideIn 0.4s ease-out'
                    }}>
                        {/* Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ 
                                width: '44px', height: '44px', borderRadius: '14px', 
                                background: 'linear-gradient(135deg, var(--blue-light) 0%, #0ea5e9 100%)', 
                                color: '#fff', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontWeight: 900, fontSize: '20px', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.25)'
                            }}>
                                {sIdx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                                <input 
                                    className="form-input" 
                                    value={sec.title}
                                    onChange={e => updateSectionTitle(sec.id, e.target.value)}
                                    placeholder="e.g. Technical Mastery"
                                    disabled={isReadOnly}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        borderBottom: '2px solid rgba(56, 189, 248, 0.3)', 
                                        borderRadius: 0, 
                                        padding: '4px 0', 
                                        fontWeight: 800, 
                                        fontSize: '22px',
                                        color: 'var(--text-primary)',
                                        width: '100%',
                                        transition: 'all 0.3s'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section Header</div>
                            </div>
                            {!isReadOnly && (
                                <button className="btn" onClick={() => deleteSection(sec.id)} style={{ color: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                                    🗑 Delete Section
                                </button>
                            )}
                        </div>

                        {/* Questions in Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {sec.questions.map((q, qIdx) => (
                                <div key={q.id} className="question-card" style={{ 
                                    padding: '24px', 
                                    borderRadius: '16px', 
                                    background: 'var(--bg-secondary)', 
                                    border: '1px solid var(--border)',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--blue-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Question {qIdx + 1}
                                        </div>
                                        {!isReadOnly && (
                                            <button className="btn" onClick={() => deleteQuestion(sec.id, q.id)} style={{ color: 'var(--red)', border: 'none', background: 'transparent', padding: '4px', fontSize: '11px', fontWeight: 700 }}>
                                                ✕ REMOVE
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <input
                                            className="form-input"
                                            value={q.label}
                                            onChange={e => updateQuestion(sec.id, q.id, 'label', e.target.value)}
                                            placeholder="Question Title (e.g. Code Quality)"
                                            disabled={isReadOnly}
                                            style={{ background: 'var(--bg-card)', fontWeight: 700, borderRadius: '10px', padding: '12px 16px' }}
                                        />
                                        <textarea
                                            className="form-input"
                                            value={q.desc}
                                            onChange={e => updateQuestion(sec.id, q.id, 'desc', e.target.value)}
                                            placeholder="Detailed prompt for the employee..."
                                            disabled={isReadOnly}
                                            rows={2}
                                            style={{ background: 'var(--bg-card)', resize: 'vertical', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', lineHeight: 1.5 }}
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            {!isReadOnly && (
                                <button className="btn btn-add" onClick={() => addQuestion(sec.id)} style={{ 
                                    marginTop: '12px',
                                    padding: '16px',
                                    border: '2px dashed rgba(59, 130, 246, 0.3)', 
                                    background: 'rgba(59, 130, 246, 0.03)', 
                                    color: 'var(--blue-light)',
                                    borderRadius: '16px',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}>
                                    <span style={{ fontSize: '20px' }}>+</span> Add Question to {sec.title || 'this section'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {!isReadOnly && (
                    <button className="btn" onClick={addSection} style={{ 
                        width: '100%', 
                        padding: '24px', 
                        fontSize: '16px', 
                        fontWeight: 800, 
                        border: '2px dashed var(--border)', 
                        background: 'rgba(0,0,0,0.02)', 
                        borderRadius: '24px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                    }} onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--blue-light)'; e.currentTarget.style.color = 'var(--blue-light)'; }}
                       onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px' }}>+</div>
                        Add New Section
                    </button>
                )}
            </div>

            {!isReadOnly && (
                <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '48px', display: 'flex', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '16px 60px', fontSize: '16px', fontWeight: 800, borderRadius: '16px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
                        {saving ? '⏳ Saving...' : '💾 Save Question Set'}
                    </button>
                </div>
            )}
        </div>
    );
}
