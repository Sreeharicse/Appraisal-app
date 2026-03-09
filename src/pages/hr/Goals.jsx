import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function HRGoals() {
    const { users, cycles, goals, addGoal, updateGoal, deleteGoal } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [selectedCycle, setSelectedCycle] = useState('');
    const [form, setForm] = useState({ title: '', description: '', weightage: 20, deadline: '' });

    const activeCycles = cycles.filter(c => c.status === 'active');

    // Initial load - don't force selection so "All Users" / "All Cycles" can work
    // If we want a default, we should set it in useState initial value instead of a reactive effect
    // that overrides user selection.

    const filteredGoals = goals.filter(g =>
        (!selectedCycle || g.cycleId === selectedCycle) &&
        (!selectedEmp || g.employeeId === selectedEmp)
    );

    const openAdd = () => {
        setEditing(null);
        setForm({ title: '', description: '', weightage: 20, deadline: '' });
        setShowModal(true);
    };

    const openEdit = (g) => {
        setEditing(g);
        setSelectedEmp(g.employeeId);
        setSelectedCycle(g.cycleId);
        setForm({ title: g.title, description: g.description, weightage: g.weightage, deadline: g.deadline });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.title || !selectedEmp || !selectedCycle) return;
        const goalData = { ...form, employeeId: selectedEmp, cycleId: selectedCycle };
        if (editing) await updateGoal(editing.id, goalData);
        else await addGoal(goalData);
        setShowModal(false);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Goal Management</h2>
                    <p className="section-subtitle">Oversee and assign project goals across the organization</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd} disabled={activeCycles.length === 0}>
                    <span style={{ fontSize: '18px' }}>+</span> Assign New Goal
                </button>
            </div>

            <div className="grid-2" style={{ marginBottom: '24px', gap: '16px' }}>
                <div className="card" style={{ padding: '16px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Project / Cycle</label>
                    <select className="form-select" value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
                        <option value="">All Cycles</option>
                        {cycles.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                        ))}
                    </select>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Assigned To</label>
                    <select className="form-select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                        <option value="">All Users</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎯 Goals <span className="badge badge-gray">{filteredGoals.length}</span>
                    </h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Assignee</th>
                            <th>Cycle</th>
                            <th>Goal Details</th>
                            <th style={{ textAlign: 'center' }}>Weight</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredGoals.map(g => {
                            const emp = users.find(u => u.id === g.employeeId);
                            const cyc = cycles.find(c => c.id === g.cycleId);
                            return (
                                <tr key={g.id}>
                                    <td style={{ width: '200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{emp?.avatar}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp?.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp?.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ width: '150px' }}>
                                        <span className="badge badge-blue" style={{ borderRadius: '6px' }}>{cyc?.name}</span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{g.title}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{g.description}</div>
                                    </td>
                                    <td style={{ textAlign: 'center', width: '100px' }}>
                                        <span className="badge badge-purple" style={{ minWidth: '50px', justifyContent: 'center' }}>{g.weightage}%</span>
                                    </td>
                                    <td style={{ textAlign: 'right', width: '120px' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-icon" title="Edit" onClick={() => openEdit(g)}>✏️</button>
                                            <button className="btn btn-danger btn-icon" title="Delete" onClick={() => { if (confirm('Delete goal?')) deleteGoal(g.id); }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredGoals.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    No goals found matching the filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editing ? 'Edit Assigned Goal' : 'Assign New Goal'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Project / Cycle *</label>
                                    <select className="form-select" value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
                                        <option value="">Select a cycle</option>
                                        {activeCycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign To *</label>
                                    <select className="form-select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                                        <option value="">Select a user</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Goal Title *</label>
                                <input className="form-input" placeholder="e.g., Deliver Mobile App Alpha"
                                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Detailed Description</label>
                                <textarea className="form-textarea" rows={3} placeholder="What are the success criteria?"
                                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Weightage (%)</label>
                                    <input className="form-input" type="number" value={form.weightage}
                                        onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Deadline</label>
                                    <input className="form-input" type="date" value={form.deadline}
                                        onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>💾 {editing ? 'Update' : 'Assign'} Goal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
