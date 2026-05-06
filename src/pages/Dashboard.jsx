import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Icons from '../components/Icons';
import Avatar from '../components/Avatar';
import CycleStepper from '../components/CycleStepper';
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

    const getCountdownText = (roleOverride) => {
        if (!activeCycle) return 'No active cycle';
        const role = roleOverride || currentUser.role;
        const targetDateStr = role === 'employee' ? (activeCycle.selfReviewEndDate || activeCycle.endDate) :
            role === 'manager' ? (activeCycle.evaluationEndDate || activeCycle.endDate) :
                (activeCycle.approvalEndDate || activeCycle.endDate);
        const targetDate = new Date(targetDateStr);
        targetDate.setHours(23, 59, 59, 999);
        const diffDays = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) return `Ends in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        if (diffDays === 0) return 'Ends today';
        return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
    };

    // -- Personal Stats (All Roles)
    const hasSelfReview = selfReviews.some(sr => sr.employeeId === currentUser.id && sr.cycleId === activeCycle?.id);
    const myEvaluation = evaluations.find(e => e.employeeId === currentUser.id && e.cycleId === activeCycle?.id);

    // -- Manager / Admin Stats
    const teamMembers = useMemo(() => {
        if (currentUser.role === 'admin') return users.filter(u => u.id !== currentUser.id && (u.managerId === currentUser.id || !u.managerId));
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
    const totalEmployees = users.length;
    const pendingHRApprovals = evaluations.filter(ev => {
        if (ev.status !== 'pending_approval') return false;
        const empRole = users.find(u => u.id === ev.employeeId)?.role;

        if (currentUser.role === 'admin') {
            return empRole === 'hr' || empRole === 'admin';
        }
        if (currentUser.role === 'hr') {
            return empRole === 'employee' || empRole === 'manager';
        }
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

    const formatDisplayName = (name) => {
        if (!name) return 'User';
        if (name.includes('@')) {
            const prefix = name.split('@')[0];
            return prefix
                .split(/[\._]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }
        return name;
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
                        {getGreeting()}, <span style={{ color: 'var(--purple)' }}>{formatDisplayName(currentUser.name)}</span>
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
            <div className={`grid ${currentUser.role === 'employee' ? 'grid-3' : 'grid-4'}`} style={{ marginBottom: '24px' }}>
                <div className="kpi-card" style={{ '--accent-color': 'var(--blue-light)', cursor: 'pointer' }} onClick={() => activeCycle && navigate(`/employee/cycle/${activeCycle.id}`)}>
                    <div className="kpi-icon"><Icons.Calendar /></div>
                    <div className="kpi-label">
                        {currentUser.role === 'employee' ? 'Self Review Deadline' :
                            currentUser.role === 'manager' ? 'Evaluation Deadline' :
                                'Approval Deadline'}
                    </div>
                    <div className="kpi-value" style={{ fontSize: '22px', marginTop: '8px' }}>
                        {activeCycle ? activeCycle.name : 'None'}
                    </div>
                    <div className="kpi-change">
                        {getCountdownText()}
                    </div>
                </div>

                {currentUser.role !== 'employee' && (
                    <div className="kpi-card" style={{ '--accent-color': 'var(--indigo)', cursor: 'pointer' }} onClick={() => navigate('/employee/self-review')}>
                        <div className="kpi-icon"><Icons.Clock /></div>
                        <div className="kpi-label">Self Review Deadline</div>
                        <div className="kpi-value" style={{ fontSize: '22px', marginTop: '8px' }}>
                            {activeCycle ? activeCycle.name : 'None'}
                        </div>
                        <div className="kpi-change">
                            {getCountdownText('employee')}
                        </div>
                    </div>
                )}
                {/* Self Review Card - Now First after Active Cycle */}
                <div className="kpi-card" style={{ '--accent-color': 'var(--purple)', cursor: 'pointer' }} onClick={() => navigate('/employee/self-review')}>
                    <div className="kpi-icon"><Icons.FileText /></div>
                    <div className="kpi-label">Self Review</div>
                    {(() => {
                        const sr = selfReviews.find(r => r.employeeId === currentUser.id && r.cycleId === activeCycle?.id);
                        if (!sr) return <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>Pending</div>;
                        if (sr.status === 'draft') return <div className="kpi-value" style={{ color: 'var(--yellow)' }}>Draft</div>;
                        return <div className="kpi-value" style={{ color: 'var(--green)' }}>Submitted</div>;
                    })()}
                    <div className="kpi-change">Your submission</div>
                </div>
                {/* Manager Evaluation Card - Now Last */}
                <div className="kpi-card" style={{ '--accent-color': 'var(--green)', cursor: 'pointer' }} onClick={() => navigate('/employee/results')}>
                    <div className="kpi-icon"><Icons.Check /></div>
                    <div className="kpi-label">Manager Evaluation</div>
                    {(() => {
                        if (!myEvaluation) return <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>Pending</div>;
                        if (myEvaluation.status === 'pending_approval') return <div className="kpi-value" style={{ color: 'var(--blue-light)' }}>HR Review</div>;
                        if (myEvaluation.status === 'approved') return <div className="kpi-value" style={{ color: 'var(--green)' }}>Finalized</div>;
                        return <div className="kpi-value">{myEvaluation.status}</div>;
                    })()}
                    <div className="kpi-change">Final results</div>
                </div>
            </div>

            {!hasSelfReview && (
                <div style={{ marginBottom: '24px' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/employee/self-review')}>Start Self Review</button>
                </div>
            )}

            {/* ----- ALL ROLES: Active Cycle Progress UI ----- */}
            {activeCycle && (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Current Cycle Progress</div>
                    <CycleStepper cycle={activeCycle} />
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
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span className={`badge ${getStatusBadge(cycle.status)}`} style={{ textTransform: 'capitalize' }}>
                                                {cycle.status}
                                            </span>
                                            {(() => {
                                                const sr = selfReviews.find(r => r.cycleId === cycle.id && r.employeeId === currentUser.id);
                                                if (!sr) return <span className="badge badge-gray" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Not Started</span>;
                                                if (sr.status === 'draft') return <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--yellow)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>Draft</span>;
                                                return <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>Submitted</span>;
                                            })()}
                                        </div>
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
