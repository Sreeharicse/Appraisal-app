import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NextStepsCard({ title, description, actionPath, actionLabel, statusType = 'pending' }) {
    const navigate = useNavigate();

    const getStatusStyles = () => {
        switch (statusType) {
            case 'complete':
                return {
                    icon: '✅',
                    border: 'rgba(16, 185, 129, 0.2)',
                    glow: 'none',
                    bg: 'var(--bg-secondary)'
                };
            case 'waiting':
                return {
                    icon: '⏳',
                    border: 'var(--border)',
                    glow: 'none',
                    bg: 'var(--bg-secondary)'
                };
            default: // pending
                return {
                    icon: '🚀',
                    border: 'var(--border-accent)',
                    glow: 'none',
                    bg: 'var(--bg-secondary)'
                };
        }
    };

    const styles = getStatusStyles();

    return (
        <div className="card" style={{
            marginBottom: '24px',
            border: `1px solid ${styles.border}`,
            boxShadow: styles.glow,
            background: styles.bg,
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '24px'
        }}>
            <div style={{
                fontSize: '40px',
                width: '64px', height: '64px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '16px'
            }}>
                {styles.icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Next Step
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{description}</p>
            </div>
            {actionPath && (
                <button className="btn btn-primary" onClick={() => navigate(actionPath)}>
                    {actionLabel || 'Go to Page'}
                </button>
            )}
        </div>
    );
}

