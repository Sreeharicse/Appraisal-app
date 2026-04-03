import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function Settings() {
    const {
        departments,
        addDepartment,
        deleteDepartment,
        designations,
        addDesignation,
        deleteDesignation
    } = useApp();

    const [newDept, setNewDept] = useState('');
    const [newDesig, setNewDesig] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);

    const handleAddDepartment = async () => {
        if (!newDept.trim()) return;
        setLoadingAction(true);
        await addDepartment(newDept.trim());
        setNewDept('');
        setLoadingAction(false);
    };

    const handleAddDesignation = async () => {
        if (!newDesig.trim()) return;
        setLoadingAction(true);
        await addDesignation(newDesig.trim());
        setNewDesig('');
        setLoadingAction(false);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="section-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h2 className="section-title">System Settings</h2>
                    <p className="section-subtitle">Manage organizational departments and job titles</p>
                </div>
            </div>



            {/* Organization Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Departments Section */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: '16px' }}>Manage Departments</div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input
                            className="form-input"
                            placeholder="New Department"
                            value={newDept}
                            onChange={e => setNewDept(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                        />
                        <button className="btn btn-primary" onClick={handleAddDepartment} disabled={loadingAction || !newDept.trim()}>Add</button>
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                        {departments.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No departments found.</div>
                        ) : (
                            departments.map(d => (
                                <div key={d.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)'
                                }}>
                                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{d.name}</span>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => window.confirm(`Delete ${d.name}?`) && deleteDepartment(d.id)}
                                        style={{ padding: '4px 8px' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Job Titles Section */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: '16px' }}>Manage Job Titles</div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input
                            className="form-input"
                            placeholder="New Job Title"
                            value={newDesig}
                            onChange={e => setNewDesig(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddDesignation()}
                        />
                        <button className="btn btn-primary" onClick={handleAddDesignation} disabled={loadingAction || !newDesig.trim()}>Add</button>
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                        {designations.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No job titles found.</div>
                        ) : (
                            designations.map(d => (
                                <div key={d.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)'
                                }}>
                                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{d.name}</span>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => window.confirm(`Delete ${d.name}?`) && deleteDesignation(d.id)}
                                        style={{ padding: '4px 8px' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
