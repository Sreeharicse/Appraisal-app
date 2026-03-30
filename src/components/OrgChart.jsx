import React from 'react';
import Avatar from './Avatar';

const ROLE_CONFIG = {
    admin:    { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'Administrator' },
    hr:       { border: '#a855f7', bg: 'rgba(168,85,247,0.08)',  label: 'Human Resources' },
    manager:  { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  label: 'Manager' },
    employee: { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'Employee' },
};

// CSS for the pure CSS Tree Graph
const treeStyle = `
.org-tree * { margin: 0; padding: 0; }
.org-tree ul {
    padding-top: 20px;
    position: relative;
    display: flex;
    justify-content: center;
}
.org-tree li {
    float: left;
    text-align: center;
    list-style-type: none;
    position: relative;
    padding: 20px 10px 0 10px;
}
/* Lines between nodes */
.org-tree li::before, .org-tree li::after {
    content: '';
    position: absolute;
    top: 0; 
    right: 50%;
    border-top: 2px solid #cbd5e1;
    width: 50%;
    height: 20px;
}
.org-tree li::after {
    right: auto;
    left: 50%;
    border-left: 2px solid #cbd5e1;
}
/* Only children don't need horizontal links */
.org-tree li:only-child::after, .org-tree li:only-child::before {
    display: none;
}
/* Remove top padding for only children */
.org-tree li:only-child {
    padding-top: 0;
}
/* Trim horizontal lines for first and last children */
.org-tree li:first-child::before, .org-tree li:last-child::after {
    border: 0 none;
}
/* Curve the lines back down */
.org-tree li:last-child::before {
    border-right: 2px solid #cbd5e1;
    border-radius: 0 5px 0 0;
}
.org-tree li:first-child::after {
    border-radius: 5px 0 0 0;
}
/* Drop vertical line from parents */
.org-tree ul ul::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    border-left: 2px solid #cbd5e1;
    width: 0;
    height: 20px;
    transform: translateX(-50%);
}

/* ── Appraisal Status Badges ── */
.org-badge {
    margin-top: 10px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    border: 1px solid transparent;
}
.status-none       { display: none; }
.status-notstarted { background: var(--bg-secondary); color: var(--text-muted); border-color: var(--border); }
.status-draft      { background: rgba(245, 158, 11, 0.15); color: #d97706; border-color: rgba(245, 158, 11, 0.3); }
.status-submitted  { background: rgba(59, 130, 246, 0.15); color: #2563eb; border-color: rgba(59, 130, 246, 0.3); animation: pulse-blue 2s infinite; }
.status-evaluated  { background: rgba(168, 85, 247, 0.15); color: #9333ea; border-color: rgba(168, 85, 247, 0.3); animation: pulse-purple 2s infinite; }
.status-approved   { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); font-size: 11px; padding: 5px 14px; border: none; }

@keyframes pulse-blue {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
@keyframes pulse-purple {
    0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(168, 85, 247, 0); }
    100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
}
`;

function OrgNode({ user, evaluations, activeCycle, getScore }) {
    const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee;
    
    // Determine Status Badge
    let statusBadge = null;
    if (activeCycle) {
        const ev = evaluations?.find(e => e.employeeId === user.id && e.cycleId === activeCycle.id);
        if (ev) {
            if (ev.status === 'approved') {
                const scoreData = getScore ? getScore(user.id, activeCycle.id) : null;
                const scoreValue = scoreData?.score || '-';
                statusBadge = <div className="org-badge status-approved">Score: {scoreValue}</div>;
            } else if (ev.status === 'evaluated') {
                statusBadge = <div className="org-badge status-evaluated">Pending HR</div>;
            } else if (ev.status === 'submitted') {
                statusBadge = <div className="org-badge status-submitted">Ready for Eval</div>;
            } else if (ev.status === 'draft') {
                statusBadge = <div className="org-badge status-draft">Drafting Review</div>;
            }
        } else {
            statusBadge = <div className="org-badge status-notstarted">Not Started</div>;
        }
    }
    return (
        <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s',
            zIndex: 1,
            position: 'relative',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{
                width: '64px', height: '64px',
                borderRadius: '50%',
                border: `3px solid ${cfg.border}`,
                boxShadow: `0 0 0 4px ${cfg.bg}`,
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <Avatar avatarData={user.avatar} name={user.name} size={58} />
            </div>
            
            <div style={{ marginTop: '12px', fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>
                {user.name}
            </div>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 600, color: cfg.border, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.department || cfg.label}
            </div>

            {/* Appraisal Status Badge */}
            {statusBadge}
        </div>
    );
}

// Recursive component to render tree nodes
function TreeNode({ node, evaluations, activeCycle, getScore }) {
    return (
        <li>
            <OrgNode user={node.item} evaluations={evaluations} activeCycle={activeCycle} getScore={getScore} />
            {node.children && node.children.length > 0 && (
                <ul>
                    {node.children.map((child, idx) => (
                        <TreeNode key={child.item.id + '-' + idx} node={child} evaluations={evaluations} activeCycle={activeCycle} getScore={getScore} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function OrgChart({ users, evaluations, activeCycle, getScore }) {
    // 1. Group users by role
    const admins = users.filter(u => u.role === 'admin');
    const hrs = users.filter(u => u.role === 'hr');
    const managers = users.filter(u => u.role === 'manager');
    const employees = users.filter(u => u.role === 'employee');

    // 2. Build bottom-up simulated hierarchy for the graph
    const employeeNodes = employees.map(e => ({ item: e, children: [] }));
    
    const managerNodes = managers.map(m => ({ item: m, children: [] }));
    employeeNodes.forEach((e, i) => {
        if (managerNodes.length > 0) managerNodes[i % managerNodes.length].children.push(e);
        else managerNodes.push(e); // fallback if no managers
    });

    const hrNodes = hrs.map(h => ({ item: h, children: [] }));
    managerNodes.forEach((m, i) => {
        if (hrNodes.length > 0) hrNodes[i % hrNodes.length].children.push(m);
        else hrNodes.push(m); // fallback if no HRs
    });

    const rootNodes = admins.map(a => ({ item: a, children: [] }));
    hrNodes.forEach((h, i) => {
        if (rootNodes.length > 0) rootNodes[i % rootNodes.length].children.push(h);
        else rootNodes.push(h); // fallback if no admins
    });

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            padding: '40px 32px',
            overflowX: 'auto',
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <style dangerouslySetInnerHTML={{ __html: treeStyle }} />
            
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Company Organizational Chart
                </h3>
            </div>

            <div className="org-tree" style={{ paddingBottom: '40px' }}>
                <ul>
                    {rootNodes.map((root, idx) => (
                        <TreeNode key={'root-'+idx} node={root} evaluations={evaluations} activeCycle={activeCycle} getScore={getScore} />
                    ))}
                </ul>
            </div>
        </div>
    );
}
