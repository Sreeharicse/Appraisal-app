import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function HRDashboard() {
    const { users, cycles, evaluations, getActiveCycle } = useApp();
    const navigate = useNavigate();
    const activeCycle = getActiveCycle();
    const employees = users.filter(u => u.role === 'employee');
    const pendingApprovals = evaluations.filter(e => e.status === 'pending_approval');

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return 'badge-blue';
            case 'completed': return 'badge-green';
            case 'draft': return 'badge-gray';
            default: return 'badge-gray';
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Appraisal Management</h2>
                    <p className="section-subtitle">Oversee all appraisal cycles, employees, and final approvals</p>
                </div>
                {activeCycle && (
                    <span className="badge badge-green">
                        <Icons.Check style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                        {activeCycle.name} — Active
                    </span>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Cycle Name</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Management</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cycles.length > 0 ? (
                            cycles.map(cycle => (
                                <tr key={cycle.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cycle.name}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(cycle.status)}`} style={{ textTransform: 'capitalize' }}>
                                            {cycle.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => navigate(`/hr/cycle/${cycle.id}`)}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No appraisal cycles found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Management Quick Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div className="card" onClick={() => navigate('/hr/employees')} style={{ cursor: 'pointer', borderLeft: '4px solid var(--blue-light)', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="card-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Total Employees</div>
                            <div style={{ fontSize: '28px', fontWeight: 800 }}>{employees.length}</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--blue-light)' }}>
                            <Icons.Users />
                        </div>
                    </div>
                </div>

                <div className="card" onClick={() => navigate('/hr/approvals')} style={{ cursor: 'pointer', borderLeft: '4px solid var(--green)', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="card-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Pending Approvals</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: pendingApprovals.length > 0 ? 'var(--green)' : 'inherit' }}>
                                {pendingApprovals.length}
                            </div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--green)' }}>
                            <Icons.Check />
                        </div>
                    </div>
                </div>

                <div className="card" onClick={() => navigate('/hr/reports')} style={{ cursor: 'pointer', borderLeft: '4px solid var(--purple)', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="card-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Cycle Progress</div>
                            <div style={{ fontSize: '28px', fontWeight: 800 }}>
                                {employees.length ? Math.round((evaluations.filter(e => e.status === 'approved').length / employees.length) * 100) : 0}%
                            </div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--purple)' }}>
                            <Icons.Chart />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
