import React from 'react';
import Icons from './Icons';

export default function CycleStepper({ cycle }) {
    if (!cycle) return null;

    // Evaluate Deadlines
    const isPast = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(23, 59, 59, 999);
        return new Date() > d;
    };

    const selfClosed = isPast(cycle.selfReviewEndDate || cycle.endDate) || cycle.status === 'closed';
    const evalClosed = isPast(cycle.evaluationEndDate || cycle.endDate) || cycle.status === 'closed';
    const cycleClosed = cycle.status === 'closed';

    const formatDateStr = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const steps = [
        {
            id: 1,
            title: 'Self Review',
            isClosed: selfClosed,
            descClosed: 'Employees can no longer submit reviews',
            descOpen: `Open for submissions until ${formatDateStr(cycle.selfReviewEndDate || cycle.endDate)}`,
            icon: <Icons.FileText style={{ width: '16px', height: '16px' }} />
        },
        {
            id: 2,
            title: 'Evaluation',
            isClosed: evalClosed,
            descClosed: 'Managers can no longer evaluate',
            descOpen: `Open for evaluations until ${formatDateStr(cycle.evaluationEndDate || cycle.endDate)}`,
            icon: <Icons.Check style={{ width: '16px', height: '16px' }} />
        },
        {
            id: 3,
            title: 'Final Closure',
            isClosed: cycleClosed,
            descClosed: 'Entire cycle is locked',
            descOpen: `Final approval target: ${formatDateStr(cycle.approvalEndDate || cycle.endDate)}`,
            icon: <Icons.Lock style={{ width: '16px', height: '16px' }} />
        }
    ];

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', margin: '24px 0', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            {steps.map((step, index) => {
                const isCompleted = step.isClosed;
                const isActive = !step.isClosed && (index === 0 || steps[index - 1].isClosed);
                
                let iconColor = isCompleted ? '#10b981' : isActive ? '#f59e0b' : '#9ca3af';
                let bgColor = isCompleted ? 'rgba(16, 185, 129, 0.1)' : isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(156, 163, 175, 0.1)';
                let borderColor = isCompleted ? 'rgba(16, 185, 129, 0.3)' : isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(156, 163, 175, 0.3)';
                
                return (
                    <React.Fragment key={step.id}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, minWidth: '160px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: bgColor, color: iconColor, border: `1px solid ${borderColor}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    {step.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{step.title}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: iconColor, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {isCompleted && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: iconColor }}></span>}
                                        {isCompleted ? 'Closed' : isActive ? 'Active' : 'Pending'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', paddingLeft: '48px' }}>
                                {isCompleted ? step.descClosed : step.descOpen}
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div style={{
                                flex: 1, height: '2px', marginTop: '17px',
                                background: steps[index].isClosed ? '#10b981' : 'var(--border)',
                                minWidth: '40px'
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
