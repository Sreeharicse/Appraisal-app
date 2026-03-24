import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Icons from '../components/Icons';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { currentUser, cycles, getActiveCycle, goals, selfReviews, evaluations, users, approvals, resetAndSeedFakeData, updateUser, refreshData } = useApp();
    const navigate = useNavigate();
    const activeCycle = getActiveCycle();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return 'badge-blue';
            case 'completed': return 'badge-green';
            case 'draft': return 'badge-gray';
            default: return 'badge-gray';
        }
    };

    // -- Personal Stats (All Roles)
    const hasSelfReview = selfReviews.some(sr => sr.employeeId === currentUser.id && sr.cycleId === activeCycle?.id);
    const myEvaluation = evaluations.find(e => e.employeeId === currentUser.id && e.cycleId === activeCycle?.id);

    // -- Manager / Admin Stats
    const teamMembers = useMemo(() => {
        if (currentUser.role === 'admin') return users.filter(u => u.role === 'hr' || u.role === 'manager');
        return users.filter(u => u.managerId === currentUser.id);
    }, [users, currentUser]);
    const pendingEvaluations = useMemo(() => {
        if (!activeCycle) return [];
        return teamMembers.map(member => {
            const hasEval = evaluations.some(e => e.employeeId === member.id && e.cycleId === activeCycle.id);
            const hasSelf = selfReviews.some(sr => sr.employeeId === member.id && sr.cycleId === activeCycle.id);
            if (hasSelf && !hasEval) return member;
            return null;
        }).filter(Boolean);
    }, [teamMembers, evaluations, selfReviews, activeCycle]);

    // -- HR / Admin Stats
    const totalEmployees = users.filter(u => u.role !== 'admin').length;
    const pendingHRApprovals = evaluations.filter(ev => {
        if (ev.status !== 'pending_approval') return false;
        const emp = users.find(u => u.id === ev.employeeId);
        if (currentUser.role === 'admin') return emp?.role !== 'admin';
        if (currentUser.role === 'hr') return emp?.role === 'employee';
        return false;
    });

    const handleResetData = () => {
        if (window.confirm('This will RESET all local mock data and seed fresh sample data. Continue?')) {
            resetAndSeedFakeData();
            alert('Fake testing data has been seeded successfully!');
        }
    };

    const handleAvatarUpload = async (base64) => {
        const res = await updateUser(currentUser.id, { avatar: base64 });
        if (res.success) {
            await refreshData();
        } else {
            alert('Failed to update profile photo.');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="section-header" style={{ marginBottom: '32px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px' }}>
                    <Avatar 
                        avatarData={currentUser.avatar} 
                        name={currentUser.name} 
                        size={64} 
                        editable={true} 
                        onUpload={handleAvatarUpload}
                        style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                    />
                    <h2 className="section-title" style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
                        {getGreeting()}, <span style={{ color: 'var(--purple)' }}>{currentUser.name}</span>
                    </h2>
                </div>
                {(currentUser.role === 'hr' || currentUser.role === 'admin') && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/hr/cycles')}>
                            <Icons.Cycles style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                            Manage Cycles
                        </button>
                    </div>
                )}
            </div>

            {/* ----- ALL ROLES: Personal Dashboard ----- */}
            <div className="grid grid-3" style={{ marginBottom: '24px' }}>
                <div className="kpi-card" style={{ '--accent-color': 'var(--blue-light)', cursor: 'pointer' }} onClick={() => activeCycle && navigate(`/employee/cycle/${activeCycle.id}`)}>
                    <div className="kpi-icon"><Icons.Calendar /></div>
                    <div className="kpi-label">Active Cycle</div>
                    <div className="kpi-value" style={{ fontSize: '22px', marginTop: '8px' }}>
                        {activeCycle ? activeCycle.name : 'None'}
                    </div>
                    <div className="kpi-change">
                        {activeCycle ? `Ends ${new Date(activeCycle.endDate).toLocaleDateString()}` : 'No active cycle'}
                    </div>
                </div>
                {/* Self Review Card - Now First after Active Cycle */}
                <div className="kpi-card" style={{ '--accent-color': 'var(--purple)', cursor: 'pointer' }} onClick={() => navigate('/employee/self-review')}>
                    <div className="kpi-icon"><Icons.FileText /></div>
                    <div className="kpi-label">Self Review</div>
                    <div className="kpi-value">{hasSelfReview ? 'Submitted' : 'Pending'}</div>
                    <div className="kpi-change">Your submission</div>
                </div>
                {/* Manager Evaluation Card - Now Last */}
                <div className="kpi-card" style={{ '--accent-color': 'var(--green)', cursor: 'pointer' }} onClick={() => navigate('/employee/results')}>
                    <div className="kpi-icon"><Icons.Check /></div>
                    <div className="kpi-label">Manager Evaluation</div>
                    <div className="kpi-value">{myEvaluation ? 'Completed' : 'Pending'}</div>
                    <div className="kpi-change">Final results</div>
                </div>
            </div>

            {!hasSelfReview && (
                <div style={{ marginBottom: '24px' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/employee/self-review')}>Start Self Review</button>
                </div>
            )}

            {/* ----- ALL ROLES: Appraisal Cycles List ----- */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.Cycles style={{ color: 'var(--purple)' }} /> All Appraisal Cycles
                    </h3>
                </div>
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

            {/* ----- MANAGER / ADMIN: Team Stats ----- */}
            {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
                <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--green)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icons.Users style={{ color: 'var(--green)' }} /> My Team Overview
                    </div>

                    <div className="grid grid-3" style={{ marginTop: '20px' }}>
                        <div className="kpi-card" style={{ '--accent-color': 'var(--text-primary)' }}>
                            <div className="kpi-icon"><Icons.Users /></div>
                            <div className="kpi-label">Direct Reports</div>
                            <div className="kpi-value">{teamMembers.length}</div>
                            <div className="kpi-change">Active employees</div>
                        </div>
                        <div className="kpi-card" style={{ '--accent-color': 'var(--yellow)' }}>
                            <div className="kpi-icon"><Icons.Clock /></div>
                            <div className="kpi-label">Pending Evals</div>
                            <div className="kpi-value">{pendingEvaluations.length}</div>
                            <div className="kpi-change">Requires action</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/manager')}>Evaluate Team</button>
                    </div>
                </div>
            )}

            {/* ----- HR / ADMIN: System Stats ----- */}
            {(currentUser.role === 'hr' || currentUser.role === 'admin') && (
                <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--purple)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icons.PieChart style={{ color: 'var(--purple)' }} /> System Overview (HR)
                    </div>

                    <div className="grid grid-3" style={{ marginTop: '20px' }}>
                        <div className="kpi-card" style={{ '--accent-color': 'var(--text-primary)' }}>
                            <div className="kpi-icon"><Icons.Users /></div>
                            <div className="kpi-label">Total Headcount</div>
                            <div className="kpi-value">{totalEmployees}</div>
                            <div className="kpi-change">Active in platform</div>
                        </div>
                        <div className="kpi-card" style={{ '--accent-color': 'var(--yellow)' }}>
                            <div className="kpi-icon"><Icons.Check /></div>
                            <div className="kpi-label">Pending Approvals</div>
                            <div className="kpi-value">{pendingHRApprovals.length}</div>
                            <div className="kpi-change">Awaiting HR review</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/hr/approvals')}>Review Approvals</button>
                    </div>
                </div>
            )}

            {/* ----- ADMIN: Fake Testing Tools ----- */}
            {currentUser.role === 'admin' && (
                <div className="card" style={{ background: 'var(--bg-card-hover)', border: '1px dashed var(--border)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Icons.Target style={{ color: 'var(--red)' }} /> Admin: Testing Tools
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-danger btn-sm" onClick={handleResetData}>
                            <Icons.Database style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                            Seed Local Fake Data
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
