import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function SelfReview() {
    const { currentUser, cycles, getGoalsForEmployee, getSelfReview, submitSelfReview } = useApp();
    const activeCycles = cycles.filter(c => c.status === 'active');
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [activeTab, setActiveTab] = useState(1);

    // Form State
    const [summary, setSummary] = useState('');
    const [goalRatings, setGoalRatings] = useState({});
    const [comments, setComments] = useState('');
    const [progress, setProgress] = useState({}); // { goalId: { percentage: 0, comment: '', complete: false } }
    const [competencies, setCompetencies] = useState({
        teamwork: { rating: 0, comment: '' },
        communication: { rating: 0, comment: '' },
        problemSolving: { rating: 0, comment: '' },
        reliability: { rating: 0, comment: '' }
    });
    const [feedback, setFeedback] = useState('');
    const [achievements, setAchievements] = useState('');
    const [learning, setLearning] = useState('');

    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initialize cycle
    useEffect(() => {
        if (!selectedCycleId && activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
        }
    }, [activeCycles, selectedCycleId]);

    const cycle = cycles.find(c => c.id === selectedCycleId);
    const goals = selectedCycleId ? getGoalsForEmployee(currentUser.id, selectedCycleId) : [];

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
            setCompetencies(meta.competencies || {
                teamwork: { rating: 0, comment: '' },
                communication: { rating: 0, comment: '' },
                problemSolving: { rating: 0, comment: '' },
                reliability: { rating: 0, comment: '' }
            });
            setFeedback(meta.feedback || '');
            setAchievements(meta.achievements || '');
            setLearning(meta.learning || '');
            
            setSubmitted(true);
        } else {
            setSummary('');
            setComments('');
            setGoalRatings({});
            setProgress({});
            setCompetencies({
                teamwork: { rating: 0, comment: '' },
                communication: { rating: 0, comment: '' },
                problemSolving: { rating: 0, comment: '' },
                reliability: { rating: 0, comment: '' }
            });
            setFeedback('');
            setAchievements('');
            setLearning('');
            setSubmitted(false);
        }
        setLoading(false);
    }, [selectedCycleId, goals.length]);

    const handleSubmit = async () => {
        if (!selectedCycleId) return;
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
            learning
        });
        setSubmitted(true);
        alert('Self-review submitted successfully!');
    };

    const TABS = [
        { id: 1, label: '🎯 Goal Tracking' },
        { id: 2, label: '📝 Assessment' },
        { id: 3, label: '🧩 Competencies' },
        { id: 4, label: '💬 Feedback' },
        { id: 5, label: '🏆 Achievements' },
        { id: 6, label: '📚 Learning' },
        { id: 7, label: '🏁 Summary' }
    ];

    if (loading && selectedCycleId) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading review data...</div>;

    const renderProgressTab = () => (
        <div>
            <div className="card-title" style={{ marginBottom: '16px' }}>Goal Progress Tracker</div>
            <p className="section-subtitle" style={{ marginBottom: '24px' }}>Update the status and progress of your assigned objectives.</p>
            {goals.map(g => {
                const gProgress = progress[g.id] || { percentage: 0, comment: '', complete: false };
                return (
                    <div key={g.id} className="card" style={{ marginBottom: '20px', background: gProgress.complete ? '#f0fdf4' : 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{g.title}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{g.description}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600 }}>Complete</label>
                                <input type="checkbox" checked={gProgress.complete} onChange={e => setProgress(p => ({
                                    ...p,
                                    [g.id]: { ...gProgress, complete: e.target.checked, percentage: e.target.checked ? 100 : gProgress.percentage }
                                }))} />
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>Progress: {gProgress.percentage}%</span>
                            </div>
                            <input type="range" min="0" max="100" step="5" style={{ width: '100%' }} 
                                value={gProgress.percentage} 
                                onChange={e => setProgress(p => ({
                                    ...p,
                                    [g.id]: { ...gProgress, percentage: parseInt(e.target.value), complete: parseInt(e.target.value) === 100 }
                                }))} 
                            />
                        </div>
                        
                        <textarea className="form-input" placeholder="Notes on progress..." style={{ minHeight: '60px', width: '100%', fontSize: '12px' }}
                            value={gProgress.comment}
                            onChange={e => setProgress(p => ({
                                ...p,
                                [g.id]: { ...gProgress, comment: e.target.value }
                            }))}
                        />
                    </div>
                );
            })}
        </div>
    );

    const renderAssessmentTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Performance Summary & Ratings</div>
            <div style={{ marginBottom: '24px' }}>
                <label className="form-label">Key Achievements & Impacts</label>
                <textarea className="form-textarea" rows={6}
                    placeholder="Describe your overall impact during this cycle..."
                    value={summary} onChange={e => setSummary(e.target.value)} />
            </div>
            
            <label className="form-label">Goal-Specific Ratings</label>
            {goals.map(g => (
                <div key={g.id} style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>{g.title}</div>
                    <div className="rating-scale">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} type="button"
                                className={`rating-btn ${goalRatings[g.id] === n ? 'selected' : ''}`}
                                onClick={() => setGoalRatings(p => ({ ...p, [g.id]: n }))}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCompetenciesTab = () => {
        const comps = [
            { id: 'teamwork', label: 'Teamwork & Collaboration', desc: 'Working effectively with others to achieve shared goals.' },
            { id: 'communication', label: 'Communication', desc: 'Clarity and effectiveness of information sharing.' },
            { id: 'problemSolving', label: 'Problem Solving', desc: 'Analytical thinking and creative solutions.' },
            { id: 'reliability', label: 'Reliability & Ownership', desc: 'Dependability and taking responsibility for tasks.' }
        ];
        return (
            <div>
                <div className="card-title" style={{ marginBottom: '16px' }}>Core Competencies</div>
                {comps.map(c => (
                    <div key={c.id} className="card" style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{c.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{c.desc}</div>
                        <div className="rating-scale" style={{ marginBottom: '12px' }}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} type="button"
                                    className={`rating-btn ${competencies[c.id]?.rating === n ? 'selected' : ''}`}
                                    onClick={() => setCompetencies(p => ({ ...p, [c.id]: { ...p[c.id], rating: n } }))}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        <textarea className="form-input" placeholder="Specific examples..." style={{ minHeight: '60px', width: '100%', fontSize: '12px' }}
                            value={competencies[c.id]?.comment}
                            onChange={e => setCompetencies(p => ({ ...p, [c.id]: { ...p[c.id], comment: e.target.value } }))}
                        />
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
                value={feedback} onChange={e => setFeedback(e.target.value)} />
        </div>
    );

    const renderAchievementsTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Additional Highlights</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Significant accomplishments or evidence not covered by specific goals.</p>
            <textarea className="form-textarea" rows={10} placeholder="Document any extra wins..." 
                value={achievements} onChange={e => setAchievements(e.target.value)} />
        </div>
    );

    const renderLearningTab = () => (
        <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Learning & Development</div>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>Track completed training or define future developmental aspirations.</p>
            <textarea className="form-textarea" rows={10} placeholder="Training completed, certifications, or desired skills..." 
                value={learning} onChange={e => setLearning(e.target.value)} />
        </div>
    );

    const renderSummaryTab = () => (
        <div>
            <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--purple)' }}>
                <div className="card-title" style={{ marginBottom: '8px' }}>Final Overview</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Review all sections before submitting your self-appraisal.</p>
            </div>
            
            <div className="card" style={{ marginBottom: '24px' }}>
                <label className="form-label">Final Thoughts / Career Aspirations</label>
                <textarea className="form-textarea" rows={4} placeholder="Where do you see yourself in the next 12 months?" 
                    value={comments} onChange={e => setComments(e.target.value)} />
            </div>

            <div style={{ textAlign: 'right', marginTop: '32px' }}>
                <button type="button" className="btn btn-primary" onClick={handleSubmit} style={{ padding: '16px 48px', fontWeight: 700 }}>
                    🚀 {submitted ? 'Update Submission' : 'Submit Full Appraisal'}
                </button>
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 1: return renderProgressTab();
            case 2: return renderAssessmentTab();
            case 3: return renderCompetenciesTab();
            case 4: return renderFeedbackTab();
            case 5: return renderAchievementsTab();
            case 6: return renderLearningTab();
            case 7: return renderSummaryTab();
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
                                    background: activeTab === t.id ? 'var(--purple)' : 'transparent',
                                    color: activeTab === t.id ? 'white' : 'var(--text-secondary)',
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
                    {selectedCycleId && goals.length === 0 && (
                        <div className="alert alert-info">ℹ️ No goals assigned for this cycle.</div>
                    )}
                    {selectedCycleId && goals.length > 0 && renderTabContent()}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <button className="btn btn-secondary" disabled={activeTab === 1} onClick={() => setActiveTab(p => p - 1)}>← Previous</button>
                        {activeTab < 7 && <button className="btn btn-primary" onClick={() => setActiveTab(p => p + 1)}>Next →</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}
