import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import NextStepsCard from '../../components/NextStepsCard';
import Icons from '../../components/Icons';

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const { currentUser, getTeamEmployees, getActiveCycle, goals, evaluations, selfReviews, refreshData } = useApp();

    React.useEffect(() => {
        refreshData();
    }, [refreshData]);

    const team = getTeamEmployees(currentUser.id);
    const cycle = getActiveCycle();

    const teamGoals = goals.filter(g => g.managerId === currentUser.id && g.cycleId === cycle?.id);
    const teamEvals = evaluations.filter(e => {
        return team.some(t => t.id === e.employeeId) && e.cycleId === cycle?.id && e.status !== 'draft';
    });
    const teamReviews = selfReviews.filter(r => {
        return team.some(t => t.id === r.employeeId) && r.cycleId === cycle?.id;
    });

    const getNextStep = () => {
        if (!cycle) return { title: 'No Active Cycle', description: 'There is currently no active appraisal cycle. HR will notify you when one starts.', actionPath: null, statusType: 'waiting' };
        if (team.length === 0) return { title: 'Assign Team Members', description: 'You do not have any direct reports assigned yet. Please contact HR.', actionPath: null, statusType: 'waiting' };

        const pendingEvals = team.filter(emp => {
            const hasReview = teamReviews.some(r => r.employeeId === emp.id);
            const hasEval = teamEvals.some(e => e.employeeId === emp.id);
            return hasReview && !hasEval;
        });
        if (pendingEvals.length > 0) return { title: 'Evaluate Performance', description: `You have ${pendingEvals.length} employees who have submitted their self-reviews and are ready for your evaluation.`, actionPath: '/manager/evaluate', actionLabel: 'Start Evaluations', statusType: 'pending' };
        if (teamEvals.length < team.length) return { title: 'Monitor Progress', description: 'Waiting for team members to complete their self-reviews before you can evaluate them.', actionPath: '/manager/team-report', actionLabel: 'View Progress', statusType: 'waiting' };

        return { title: 'Appraisals Completed', description: 'All team evaluations have been submitted! You can review the overall team performance in the report.', actionPath: '/manager/team-report', actionLabel: 'View Team Report', statusType: 'complete' };
    };

    const nextStep = getNextStep();

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Manager Dashboard</h2>
                    <p className="section-subtitle">Track your team's appraisal progress</p>
                </div>
                {cycle && (
                    <span className="badge badge-green">
                        <Icons.Check style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                        {cycle.name}
                    </span>
                )}
            </div>

            <NextStepsCard {...nextStep} />

            <div className="kpi-grid">
                <div className="kpi-card" style={{ '--accent-color': '#7c3aed' }}>
                    <div className="kpi-icon"><Icons.Users /></div>
                    <div className="kpi-label">Team Size</div>
                    <div className="kpi-value">{team.length}</div>
                    <div className="kpi-change">direct reports</div>
                </div>
                <div className="kpi-card" style={{ '--accent-color': '#f59e0b' }}>
                    <div className="kpi-icon"><Icons.FileText /></div>
                    <div className="kpi-label">Self Reviews</div>
                    <div className="kpi-value">{teamReviews.length}/{team.length}</div>
                    <div className="kpi-change">submitted</div>
                </div>
                <div className="kpi-card" style={{ '--accent-color': '#10b981' }}>
                    <div className="kpi-icon"><Icons.Star /></div>
                    <div className="kpi-label">Evaluations Done</div>
                    <div className="kpi-value">{teamEvals.length}/{team.length}</div>
                    <div className="kpi-change">completed</div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header"><h3>Team Status</h3></div>
                <table>
                    <thead><tr><th>Employee</th><th>Department</th><th>Self Review</th><th>Evaluated</th><th>Action</th></tr></thead>
                    <tbody>
                        {team.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No direct reports assigned to you.</td></tr>}
                        {team.map(emp => {
                            const hasReview = teamReviews.some(r => r.employeeId === emp.id);
                            const evalData = evaluations.find(e => e.employeeId === emp.id && e.cycleId === cycle?.id);
                            const evalStatus = evalData?.status || 'pending';
                            
                            let evalBadge = 'badge-gray';
                            let evalLabel = 'Pending';
                            let evalIcon = <Icons.Clock style={{ width: '12px', height: '12px', marginRight: '4px' }} />;

                            if (evalStatus === 'approved') { evalBadge = 'badge-green'; evalLabel = '✓ Approved'; evalIcon = null; }
                            else if (evalStatus === 'pending_approval') { evalBadge = 'badge-blue'; evalLabel = '✓ Submitted'; evalIcon = null; }
                            else if (evalStatus === 'draft') { evalBadge = 'badge-yellow'; evalLabel = '✎ Draft'; evalIcon = null; }
                            else if (evalStatus === 'rejected') { evalBadge = 'badge-red'; evalLabel = '✖ Rejected'; evalIcon = null; }
                            
                            return (
                                <tr key={emp.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="avatar" style={{ width: '30px', height: '30px', fontSize: '11px' }}>{emp.avatar}</div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span>
                                        </div>
                                    </td>
                                     <td>{emp.department}</td>
                                    <td><span className={`badge ${hasReview ? 'badge-green' : 'badge-gray'}`}>{hasReview ? '✓ Done' : <><Icons.Clock style={{ width: '12px', height: '12px', marginRight: '4px' }} /> Pending</>}</span></td>
                                    <td><span className={`badge ${evalBadge}`}>{evalIcon}{evalLabel}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <NavLink
                                                to={`/manager/evaluate/${emp.id}`}
                                                className="btn btn-primary"
                                                style={{ padding: '4px 12px', fontSize: '12px' }}
                                            >
                                                {evalData ? (evalStatus === 'draft' ? 'Resume' : 'Update') : 'Evaluate'}
                                            </NavLink>
                                            {evalData && (evalStatus === 'approved' || evalStatus === 'pending_approval') && (
                                                <NavLink
                                                    to="/manager/team-report"
                                                    className="btn btn-secondary"
                                                    style={{ padding: '4px 12px', fontSize: '12px' }}
                                                >
                                                    View
                                                </NavLink>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
