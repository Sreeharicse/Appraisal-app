import React from 'react';
import Avatar from './Avatar';

// Color rings per role
const ROLE_CONFIG = {
    admin:    { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'Administrator',   badge: '#ef4444' },
    hr:       { border: '#a855f7', bg: 'rgba(168,85,247,0.08)',  label: 'Human Resources', badge: '#a855f7' },
    manager:  { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  label: 'Manager',         badge: '#3b82f6' },
    employee: { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'Employee',        badge: '#10b981' },
};

// ── Single Node ─────────────────────────────────────────────────────────────
function OrgNode({ user }) {
    const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee;
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '110px',
            userSelect: 'none',
        }}>
            {/* Avatar ring */}
            <div style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                border: `3px solid ${cfg.border}`,
                boxShadow: `0 0 0 3px ${cfg.bg}, 0 4px 16px ${cfg.bg}`,
                overflow: 'hidden',
                background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s',
            }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Avatar avatarData={user.avatar} name={user.name} size={66} />
            </div>

            {/* Name */}
            <div style={{
                marginTop: '8px',
                fontWeight: 700,
                fontSize: '12px',
                color: 'var(--text-primary)',
                textAlign: 'center',
                maxWidth: '100px',
                lineHeight: '1.3',
            }}>
                {user.name}
            </div>

            {/* Role badge */}
            <div style={{
                marginTop: '4px',
                fontSize: '10px',
                fontWeight: 600,
                color: cfg.border,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
            }}>
                {user.department ? user.department : cfg.label}
            </div>
        </div>
    );
}

// ── Horizontal row of nodes with a shared top bar connector ─────────────────
function NodeRow({ nodes, borderColor }) {
    if (!nodes || nodes.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Top connecting bar (only rendered if more than one child) */}
            {nodes.length > 1 && (
                <div style={{
                    width: 'calc(100% - 110px)',
                    borderTop: `2px solid ${borderColor}`,
                    marginBottom: 0,
                }} />
            )}

            {/* The nodes in a horizontal row */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '32px', width: '100%' }}>
                {nodes.map((u, i) => (
                    <div key={u.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* Vertical stem from bar down to node */}
                        <div style={{ width: '2px', height: '20px', background: borderColor }} />
                        <OrgNode user={u} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Vertical connector between two tiers ────────────────────────────────────
function VerticalConnector({ color }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '32px', background: color }} />
        </div>
    );
}

// ── Full Org Chart ───────────────────────────────────────────────────────────
export default function OrgChart({ users }) {
    const admins    = users.filter(u => u.role === 'admin');
    const hrs       = users.filter(u => u.role === 'hr');
    const managers  = users.filter(u => u.role === 'manager');
    const employees = users.filter(u => u.role === 'employee');

    const sectionTitle = (emoji, label, color) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '12px',
        }}>
            <span style={{ fontSize: '16px' }}>{emoji}</span>
            <span style={{
                fontSize: '11px', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: color,
            }}>{label}</span>
            <div style={{ flex: 1, height: '1px', background: `${color}33` }} />
        </div>
    );

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            padding: '40px 32px',
            overflowX: 'auto',
        }}>
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Organizational Chart
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Company hierarchy — Admin → HR → Managers → Employees
                </p>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
                {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.border }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{role}</span>
                    </div>
                ))}
            </div>

            <div style={{ minWidth: '600px' }}>
                {/* Level 1 — Admin */}
                {sectionTitle('👑', 'Administration', ROLE_CONFIG.admin.border)}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0' }}>
                    <NodeRow nodes={admins} borderColor={ROLE_CONFIG.admin.border} />
                </div>

                {/* Connector */}
                <VerticalConnector color={ROLE_CONFIG.hr.border} />

                {/* Level 2 — HR */}
                {sectionTitle('🏢', 'Human Resources', ROLE_CONFIG.hr.border)}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <NodeRow nodes={hrs} borderColor={ROLE_CONFIG.hr.border} />
                </div>

                {/* Connector */}
                <VerticalConnector color={ROLE_CONFIG.manager.border} />

                {/* Level 3 — Managers */}
                {sectionTitle('👔', 'Managers', ROLE_CONFIG.manager.border)}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <NodeRow nodes={managers} borderColor={ROLE_CONFIG.manager.border} />
                </div>

                {/* Connector */}
                <VerticalConnector color={ROLE_CONFIG.employee.border} />

                {/* Level 4 — Employees */}
                {sectionTitle('👥', `Employees (${employees.length})`, ROLE_CONFIG.employee.border)}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <NodeRow nodes={employees} borderColor={ROLE_CONFIG.employee.border} />
                </div>
            </div>
        </div>
    );
}
