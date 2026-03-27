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
        // Clean slate: one empty section, no dummy data
        setFormSections([
            { id: 'sec-' + Math.random().toString(36).substr(2, 9), title: '', questions: [] }
        ]);
        setView('edit');
    };

    const openEdit = (qs) => {
        setEditingSet(qs);
        setFormName(qs.name);
        setFormDesc(qs.description || '');
        setFormDesignations(qs.targetDesignations || []);
        setFormIsCommon(!!qs.isCommon);
        
        const raw = qs.questions || [];
        if (raw.length > 0 && !raw[0].questions) {
            // Backward compatibility: If it's a flat list, put it in a "General" section
            setFormSections([
                { id: 'sec-' + Math.random().toString(36).substr(2, 9), title: 'General', questions: raw }
            ]);
        } else {
            setFormSections(raw);
        }
        
        setView('edit');
    };

    // ── Section Actions ──
    const addSection = () => {
        setFormSections(prev => [
            ...prev,
            { id: 'sec-' + Math.random().toString(36).substr(2, 9), title: '', questions: [] }
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

        // Validation: All sections must have titles if there are multiple, or at least one if one
        for (const sec of formSections) {
            if (!sec.title.trim() && formSections.length > 1) return alert('Please provide titles for all sections.');
            for (const q of sec.questions) {
                if (!q.label.trim()) return alert('All questions must have a title.');
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
            <div style={{ width: '100%', padding: '0 40px' }}>
                <div className="section-header" style={{ position: 'sticky', top: '0', zIndex: 100, background: 'var(--bg-card)', padding: '24px 0', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
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
                            const isSectioned = qs.questions?.[0]?.questions;
                            const sCount = isSectioned ? qs.questions.length : 1;
                            const qCount = isSectioned ? qs.questions.reduce((sum, s) => sum + s.questions.length, 0) : (qs.questions || []).length;

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
                                                        <span key={i} className="badge badge-primary" style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue-light)', border: '1px solid rgba(59, 130, 246, 0.2) ' }}>
                                                            💼 {tg}
                                                        </span>
                                                    ))}
                                                    {qs.targetDesignations.length > 3 && (
                                                        <span className="badge badge-gray" style={{ fontSize: '10px' }}>+{qs.targetDesignations.length - 3} more</span>
                                                    )}
                                                </div>
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

    // Identify job titles already used in other question sets
    const busyDesignationsMap = (questionSets || []).reduce((acc, qs) => {
        if (editingSet && qs.id === editingSet.id) return acc;
        (qs.targetDesignations || []).forEach(dName => {
            acc[dName] = qs.name;
        });
        return acc;
    }, {});

    /* ── EDIT VIEW ── */
    return (
        <div style={{ width: '100%', padding: '0 40px', paddingBottom: '100px', animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                .section-container:hover { border-color: var(--blue-light) !important; box-shadow: 0 8px 30px rgba(0,0,0,0.08) !important; }
                .question-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
                .form-input:focus { border-color: var(--blue-light) !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important; }
                .btn-add:hover { background: rgba(59, 130, 246, 0.08) !important; border-style: solid !important; }
            `}</style>

            <div className="section-header" style={{ position: 'sticky', top: '0', zIndex: 100, background: 'var(--bg-card)', padding: '24px 0', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')} style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}>
                        ← Back to Sets
                    </button>
                    <h2 className="section-title" style={{ fontSize: '24px', fontWeight: 800 }}>{editingSet ? '✏️ Edit Question Set' : '✨ New Question Set'}</h2>
                    <p className="section-subtitle">Configure the competency questions for this set ({totalQuestionsCount} questions)</p>
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

                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
                        background: formIsCommon ? 'linear-gradient(to right, rgba(234, 179, 8, 0.08), transparent)' : 'var(--bg-secondary)',
                        border: formIsCommon ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid var(--border)',
                        borderRadius: '12px', cursor: isReadOnly ? 'default' : 'pointer', transition: 'all 0.2s',
                        userSelect: 'none'
                    }}>
                        <input
                            type="checkbox"
                            checked={formIsCommon}
                            onChange={(e) => setFormIsCommon(e.target.checked)}
                            disabled={isReadOnly}
                            style={{
                                width: '20px', height: '20px', cursor: isReadOnly ? 'default' : 'pointer',
                                accentColor: '#eab308'
                            }}
                        />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: formIsCommon ? '#d97706' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ⭐ Set as System Default
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                This question set will be assigned automatically to anyone whose job title is not mapped below.
                            </div>
                        </div>
                    </label>

                    <div>
                        <label className="form-label" style={{ fontWeight: 600, marginBottom: '16px', display: 'block', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Target Job Titles (Designations)
                        </label>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Available Section */}
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue-light)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                    Available for Mapping
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {designations.filter(d => !busyDesignationsMap[d.name] || formDesignations.includes(d.name)).map(d => {
                                        const isSelected = formDesignations.includes(d.name);
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFormDesignations(p => p.filter(x => x !== d.name));
                                                    } else {
                                                        setFormDesignations(p => [...p, d.name]);
                                                    }
                                                }}
                                                className={`badge ${isSelected ? 'badge-primary' : 'badge-gray'}`}
                                                style={{ 
                                                    border: '1px solid',
                                                    borderColor: isSelected ? 'var(--blue-light)' : 'var(--border)',
                                                    cursor: isReadOnly ? 'not-allowed' : 'pointer', 
                                                    padding: '8px 16px', 
                                                    fontSize: '13px',
                                                    borderRadius: '10px',
                                                    transition: 'all 0.2s',
                                                    background: isSelected ? 'var(--blue-light)' : 'var(--bg-card)',
                                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontWeight: isSelected ? 700 : 500,
                                                    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
                                                }}
                                                disabled={isReadOnly}
                                            >
                                                {isSelected && <span style={{ fontSize: '14px' }}>✓</span>}
                                                {d.name}
                                            </button>
                                        );
                                    })}
                                    {designations.filter(d => !busyDesignationsMap[d.name] || formDesignations.includes(d.name)).length === 0 && (
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', italic: 'true', padding: '10px' }}>No available titles found.</div>
                                    )}
                                </div>
                            </div>

                            {/* Busy/Mapped Section */}
                            {designations.some(d => busyDesignationsMap[d.name] && !formDesignations.includes(d.name)) && (
                                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                        Assigned to Other Sets
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', opacity: 0.7 }}>
                                        {designations.filter(d => busyDesignationsMap[d.name] && !formDesignations.includes(d.name)).map(d => (
                                            <div
                                                key={d.id}
                                                title={`Currently used in "${busyDesignationsMap[d.name]}"`}
                                                style={{ 
                                                    padding: '6px 14px', 
                                                    fontSize: '12px',
                                                    borderRadius: '8px',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-muted)',
                                                    border: '1px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'help',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <span style={{ fontSize: '14px', opacity: 0.5 }}>🔒</span>
                                                {d.name}
                                                <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                    {busyDesignationsMap[d.name]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {formSections.map((sec, secIdx) => (
                    <div key={sec.id} className="section-container card" style={{ 
                        padding: '32px', 
                        borderRadius: '24px', 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ flex: 1, marginRight: '20px' }}>
                                <input
                                    className="form-input"
                                    value={sec.title}
                                    onChange={e => updateSectionTitle(sec.id, e.target.value)}
                                    placeholder={formSections.length > 1 ? `Section ${secIdx + 1} Title (e.g. Technical Skills)` : 'Section Title (Optional if only one)'}
                                    disabled={isReadOnly}
                                    style={{ 
                                        fontSize: '18px', 
                                        fontWeight: 800, 
                                        background: 'transparent', 
                                        border: 'none', 
                                        padding: '0',
                                        color: 'var(--text-primary)',
                                        borderBottom: '2px solid transparent',
                                        transition: 'border-color 0.2s',
                                        borderRadius: 0
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--blue-light)'}
                                    onBlur={e => e.target.style.borderColor = 'transparent'}
                                />
                            </div>
                            {!isReadOnly && formSections.length > 1 && (
                                <button className="btn" onClick={() => deleteSection(sec.id)} style={{ color: 'var(--red)', border: 'none', background: 'transparent', padding: '4px', fontSize: '11px', fontWeight: 700 }}>
                                    ✕ REMOVE SECTION
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {sec.questions.map((q, qIdx) => (
                                <div key={q.id} className="question-card" style={{ 
                                    padding: '20px', 
                                    borderRadius: '16px', 
                                    background: 'var(--bg-secondary)', 
                                    border: '1px solid var(--border)',
                                    position: 'relative',
                                    animation: 'slideIn 0.3s ease-out'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Question {qIdx + 1}
                                        </div>
                                        {!isReadOnly && (
                                            <button className="btn" onClick={() => deleteQuestion(sec.id, q.id)} style={{ color: 'var(--red)', border: 'none', background: 'transparent', padding: '0', fontSize: '10px', fontWeight: 700 }}>
                                                ✕ REMOVE
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <textarea
                                                className="form-input"
                                                value={q.label}
                                                onChange={e => updateQuestion(sec.id, q.id, 'label', e.target.value)}
                                                onBlur={e => updateQuestion(sec.id, q.id, 'label', e.target.value.trim())}
                                                placeholder="Enter your question here..."
                                                disabled={isReadOnly}
                                                style={{ 
                                                    background: 'var(--bg-card)', 
                                                    fontWeight: 700, 
                                                    borderRadius: '12px',
                                                    minHeight: '100px',
                                                    padding: '16px',
                                                    lineHeight: '1.6',
                                                    fontSize: '15px',
                                                    resize: 'vertical',
                                                    border: '1px solid var(--border)',
                                                    transition: 'all 0.2s',
                                                    width: '100%'
                                                }}
                                            />
                                        </div>
                                        <textarea
                                            className="form-input"
                                            value={q.desc}
                                            onChange={e => updateQuestion(sec.id, q.id, 'desc', e.target.value)}
                                            onBlur={e => updateQuestion(sec.id, q.id, 'desc', e.target.value.trim())}
                                            placeholder="Detailed prompt/description for the employee (Optional)..."
                                            disabled={isReadOnly}
                                            rows={2}
                                            style={{ 
                                                background: 'var(--bg-secondary)', 
                                                resize: 'vertical', 
                                                borderRadius: '10px', 
                                                fontSize: '13px',
                                                padding: '12px 16px',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border)',
                                                opacity: 0.8
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {!isReadOnly && (
                                <button className="btn btn-add" onClick={() => addQuestion(sec.id)} style={{ 
                                    padding: '16px',
                                    border: '1px dashed var(--blue-light)', 
                                    background: 'rgba(59, 130, 246, 0.02)', 
                                    color: 'var(--blue-light)',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}>
                                    + Add Question to {sec.title || 'this section'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                {!isReadOnly && (
                    <button className="btn btn-add" onClick={addSection} style={{ 
                        marginTop: '12px',
                        padding: '24px',
                        border: '2px dashed rgba(59, 130, 246, 0.3)', 
                        background: 'rgba(59, 130, 246, 0.03)', 
                        color: 'var(--blue-light)',
                        borderRadius: '24px',
                        fontWeight: 800,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                    }}>
                        <div style={{ padding: '6px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '20px' }}>+</div>
                        Add New Section
                    </button>
                )}
            </div>

            {!isReadOnly && (
                <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '48px', display: 'flex', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '16px 80px', fontSize: '16px', fontWeight: 800, borderRadius: '16px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
                        {saving ? '⏳ Saving...' : '💾 Save Question Set'}
                    </button>
                </div>
            )}
        </div>
    );
}
