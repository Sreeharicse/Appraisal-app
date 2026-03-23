import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function Settings() {
    const {
        encryptionKey,
        setEncryptionKey,
        departments,
        addDepartment,
        deleteDepartment,
        designations,
        addDesignation,
        deleteDesignation
    } = useApp();

    const [activeTab, setActiveTab] = useState('security');
    const [newDept, setNewDept] = useState('');
    const [newDesig, setNewDesig] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    const [tempKey, setTempKey] = useState(encryptionKey);
    const [showKey, setShowKey] = useState(false);

    const handleKeySave = () => {
        if (!tempKey.trim()) return;
        setEncryptionKey(tempKey.trim());
        alert("Encryption key updated successfully!");
    };

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
                    <p className="section-subtitle">Manage security protocols and organizational data</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: '8px', marginBottom: '24px',
                background: 'var(--bg-secondary)', padding: '6px',
                borderRadius: '12px', width: 'fit-content', border: '1px solid var(--border)'
            }}>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                    <Icons.Lock style={{ marginRight: '8px' }} /> Security
                </button>
                <button
                    onClick={() => setActiveTab('organization')}
                    className={`btn ${activeTab === 'organization' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                    <Icons.Briefcase style={{ marginRight: '8px' }} /> Organization Data
                </button>
            </div>

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <div className="card-title" style={{ marginBottom: '20px' }}>Master Encryption Key</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
                        This key is used to encrypt and decrypt sensitive employee feedback and manager ratings.
                        <strong> Warning:</strong> Changing this key without a migration plan will make existing encrypted data unreadable.
                    </p>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label">Encryption Key</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showKey ? "text" : "password"}
                                value={tempKey}
                                onChange={e => setTempKey(e.target.value)}
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                }}
                            >
                                {showKey ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={handleKeySave} disabled={tempKey === encryptionKey}>
                        Update System Key
                    </button>

                    <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div className="card-title" style={{ fontSize: '14px', marginBottom: '12px' }}>Encryption Best Practices</div>
                        <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '20px', margin: 0 }}>
                            <li style={{ marginBottom: '8px' }}>Use a mix of uppercase, lowercase, numbers, and symbols.</li>
                            <li style={{ marginBottom: '8px' }}>Keys should ideally be at least 16 characters long.</li>
                            <li>Avoid using common phrases or system-default strings.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
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
            )}
        </div>
    );
}
