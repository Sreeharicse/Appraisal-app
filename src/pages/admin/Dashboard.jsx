import React from 'react';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function AdminDashboard() {
    const { users, cycles, evaluations, resetAndSeedFakeData } = useApp();

    const handleResetData = () => {
        if (window.confirm('This will RESET all local mock data and seed fresh sample data. Continue?')) {
            resetAndSeedFakeData();
            alert('Fake testing data has been seeded successfully!');
        }
    };

    const stats = [
        { label: 'Total Users', value: users.length, icon: <Icons.Users />, color: 'var(--blue-light)' },
        { label: 'Appraisal Cycles', value: cycles.length, icon: <Icons.Cycles />, color: 'var(--purple)' },
        { label: 'Evaluations', value: evaluations.length, icon: <Icons.Star />, color: 'var(--green)' }
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <h2 className="section-title">System Administration</h2>
                    <p className="section-subtitle">Monitor and manage the entire appraisal ecosystem</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-danger" onClick={handleResetData}>
                        <Icons.Refresh style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Seed Fake Testing Data
                    </button>
                </div>
            </div>

            <div className="kpi-grid" style={{ marginBottom: '32px' }}>
                {stats.map((stat, i) => (
                    <div key={i} className="kpi-card" style={{ '--accent-color': stat.color }}>
                        <div className="kpi-icon">{stat.icon}</div>
                        <div className="kpi-label">{stat.label}</div>
                        <div className="kpi-value">{stat.value}</div>
                        <div className="kpi-change">Active in system</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-2" style={{ gap: '24px' }}>
                <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Icons.Shield style={{ color: 'var(--blue-light)' }} /> System Security
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                        Manage encryption keys, audit logs, and system-wide security settings. Ensure compliance with data protection policies.
                    </p>
                    <button className="btn btn-outline" style={{ width: '100%' }}>View Security Logs</button>
                </div>

                <div className="card" style={{ background: 'var(--bg-card-hover)', border: '1px dashed var(--border)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Icons.Target style={{ color: 'var(--purple)' }} /> Testing Tools
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                        Use these tools to simulate different system states, generate mock reports, or test role-based access control.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => alert('Generating mock report...')}>Gen Mock Report</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => alert('Validation triggered...')}>Sys Validation</button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>System Overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Database Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                            Connected / Fake Mode
                        </div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Modules</div>
                        <div style={{ fontWeight: 600 }}>8 Modules</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>System Version</div>
                        <div style={{ fontWeight: 600 }}>v4.2.0-stable</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
