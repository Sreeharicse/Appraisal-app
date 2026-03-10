import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Icons from '../../components/Icons';

export default function EmployeeDashboard() {
    const { cycles } = useApp();
    const navigate = useNavigate();

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
                    <h2 className="section-title">My Appraisal Cycles</h2>
                    <p className="section-subtitle">View and manage your performance reviews across different periods</p>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Cycle Name</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cycles.length > 0 ? (
                            cycles.map(cycle => (
                                <tr key={cycle.id} onClick={() => navigate(`/employee/cycle/${cycle.id}`)} style={{ cursor: 'pointer' }}>
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/employee/cycle/${cycle.id}`);
                                            }}
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

            {/* Quick Tips or Info */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', color: '#7c3aed' }}>
                            <Icons.FileText />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Submission Tip</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Always complete your self-review before the deadline to ensure your manager has enough time for evaluation.
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', color: '#10b981' }}>
                            <Icons.Check />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Clear Goals</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Review your goals regularly throughout the cycle to track your progress and align with team objectives.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
