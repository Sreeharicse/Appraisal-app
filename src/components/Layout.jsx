import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import logo from '../assets/logo-techxl.png';
import logoDark from '../assets/logo-techxl-dark.png';
import Icons from './Icons';
import Avatar from './Avatar';

// BASE LINKS - Available to ALL roles
const BASE_LINKS = [
    { to: '/dashboard', label: 'Dashboard', icon: <Icons.Home /> },
    { to: '/employee/self-review', label: 'Self Review', icon: <Icons.FileText /> },
    { to: '/employee/results', label: 'My Results', icon: <Icons.Trophy /> },
];

const EMPLOYEE_LINKS = [...BASE_LINKS];

// MANAGER LINKS - Base + Manager specific
const MANAGER_LINKS = [
    ...BASE_LINKS,
    { to: '/manager', label: 'Evaluate Team', icon: <Icons.Users /> },
    { to: '/manager/team-report', label: 'Team Report', icon: <Icons.Chart /> },
    { to: '/hr/employees', label: 'Employees', icon: <Icons.Users /> },
];

// HR LINKS - Base + HR specific
const HR_LINKS = [
    ...BASE_LINKS,
    { to: '/hr/employees', label: 'Employees', icon: <Icons.Users /> },
    { to: '/hr/cycles', label: 'Appraisal Cycles', icon: <Icons.Cycles /> },
    { to: '/hr/approvals', label: 'Approvals', icon: <Icons.Check /> },
    { to: '/hr/reports', label: 'Reports', icon: <Icons.Chart /> },
];

// ADMIN LINKS - ALL links + Admin settings
const ADMIN_LINKS = [
    ...BASE_LINKS,
    { to: '/manager', label: 'Evaluate Team', icon: <Icons.Users /> },
    { to: '/manager/team-report', label: 'Team Report', icon: <Icons.Chart /> },
    { to: '/hr/employees', label: 'Employees', icon: <Icons.Users /> },
    { to: '/hr/cycles', label: 'Appraisal Cycles', icon: <Icons.Cycles /> },
    { to: '/hr/approvals', label: 'Approvals', icon: <Icons.Check /> },
    { to: '/hr/reports', label: 'Reports', icon: <Icons.Chart /> },
    { to: '/admin/settings', label: 'Admin Settings', icon: <Icons.Edit /> },
];

const ROLE_LINKS = {
    employee: EMPLOYEE_LINKS,
    manager: MANAGER_LINKS,
    hr: HR_LINKS,
    admin: ADMIN_LINKS
};
const ROLE_LABELS = { hr: 'HR Administrator', manager: 'Team Manager', employee: 'Employee', admin: 'System Administrator' };

export default function Layout({ children }) {
    const { currentUser, logout, theme, toggleTheme, notifications, markNotificationAsRead, refreshData, updateUser } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const links = ROLE_LINKS[currentUser?.role] || [];
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    // Filter notifications to ONLY the current user (important for fake mode locally!)
    const myNotifications = React.useMemo(() => {
        return notifications ? notifications.filter(n => String(n.userId) === String(currentUser?.id)) : [];
    }, [notifications, currentUser?.id]);

    const unreadCount = myNotifications.filter(n => !n.isRead).length;

    const handleAvatarUpload = async (base64) => {
        const res = await updateUser(currentUser.id, { avatar: base64 });
        if (res.success) {
            await refreshData();
        } else {
            alert('Failed to update profile photo.');
        }
    };

    // Polling: Auto-refresh data every 10 seconds to detect new notifications or changes
    useEffect(() => {
        const interval = setInterval(() => {
            if (currentUser) refreshData();
        }, 10000);
        return () => clearInterval(interval);
    }, [refreshData, currentUser]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleMarkAllRead = async () => {
        if (!myNotifications) return;
        const unreadIds = myNotifications.filter(n => !n.isRead).map(n => n.id);
        for (const id of unreadIds) {
            await markNotificationAsRead(id);
        }
    };

    const getPageTitle = () => {
        const all = [...HR_LINKS, ...MANAGER_LINKS, ...EMPLOYEE_LINKS, ...ADMIN_LINKS]; // duplicates are fine for find
        const match = all.slice().reverse().find(l =>
            location.pathname.startsWith(l.to) &&
            (l.to !== '/dashboard' || location.pathname === '/dashboard')
        );
        return match?.label || 'Techxl';
    };

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    {theme === 'dark' ? (
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <img src={logoDark} alt="Techxl Logo" style={{ height: '100px', width: 'auto' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <img src={logo} alt="Techxl Logo" style={{ height: '42px', width: 'auto' }} />
                        </div>
                    )}
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>
                        {ROLE_LABELS[currentUser?.role]}
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {links.map((link, index) => (
                        <NavLink
                            key={index}
                            to={link.to}
                            end={link.to === '/dashboard'}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        >
                            <span className="icon">{link.icon}</span>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-badge">
                        <Avatar 
                             avatarData={currentUser?.avatar} 
                             name={currentUser?.name} 
                             size={36} 
                             editable={true}
                             onUpload={handleAvatarUpload}
                        />
                        <div className="user-info">
                            <div className="user-name">{currentUser?.name}</div>
                            <div className="user-role">{currentUser?.department}</div>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
                </div>
            </aside>

            <div className="main-content">
                <div className="topbar">
                    <h1>{getPageTitle()}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="topbar-meta">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>

                        {/* Notifications */}
                        <div className="notification-container" ref={notifRef}>
                            <button
                                className="notification-btn"
                                onClick={() => setShowNotifications(!showNotifications)}
                                title="Notifications"
                            >
                                <Icons.Bell />
                                {unreadCount > 0 && <span className="notification-badge"></span>}
                            </button>

                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notif-header">
                                        <span className="notif-title">Notifications</span>
                                        {unreadCount > 0 && (
                                            <button className="notif-mark-read" onClick={handleMarkAllRead}>
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="notif-list">
                                        {(!myNotifications || myNotifications.length === 0) ? (
                                            <div className="notif-empty">No notifications yet.</div>
                                        ) : (
                                            (() => {
                                                const unread = myNotifications.filter(n => !n.isRead);
                                                const read = myNotifications.filter(n => n.isRead);

                                                const parseNotification = (notif) => {
                                                    try {
                                                        const parsed = JSON.parse(notif.message);
                                                        return { text: parsed.text, link: parsed.link };
                                                    } catch (e) {
                                                        return { text: notif.message, link: null }; // Fallback for old notifications
                                                    }
                                                };

                                                const handleNotifClick = (notif, parsed) => {
                                                    if (!notif.isRead) markNotificationAsRead(notif.id);
                                                    if (parsed.link) {
                                                        setShowNotifications(false);
                                                        navigate(parsed.link);
                                                    }
                                                };

                                                return (
                                                    <>
                                                        {/* ── Unread Section ── */}
                                                        {unread.length > 0 && (
                                                            <>
                                                                <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                    🔔 New ({unread.length})
                                                                </div>
                                                                {unread.map(notif => {
                                                                    const parsed = parseNotification(notif);
                                                                    return (
                                                                        <div
                                                                            key={notif.id}
                                                                            className="notif-item unread"
                                                                            onClick={() => handleNotifClick(notif, parsed)}
                                                                            style={{ cursor: parsed.link ? 'pointer' : 'default' }}
                                                                        >
                                                                            <div className="notif-item-title">
                                                                                <span>{notif.title}</span>
                                                                                <span className="notif-item-time">
                                                                                    {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            </div>
                                                                            <div className="notif-item-msg">{parsed.text}</div>
                                                                            <button
                                                                                onClick={e => { e.stopPropagation(); markNotificationAsRead(notif.id); }}
                                                                                style={{
                                                                                    marginTop: '8px', fontSize: '11px', fontWeight: 600,
                                                                                    background: 'var(--purple)', color: '#fff',
                                                                                    border: 'none', borderRadius: '6px',
                                                                                    padding: '4px 10px', cursor: 'pointer',
                                                                                    transition: 'opacity 0.2s'
                                                                                }}
                                                                                onMouseOver={e => e.target.style.opacity = '0.85'}
                                                                                onMouseOut={e => e.target.style.opacity = '1'}
                                                                            >
                                                                                ✓ Mark as read
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        )}

                                                        {/* ── Read Section ── */}
                                                        {read.length > 0 && (
                                                            <>
                                                                <div style={{
                                                                    padding: '8px 16px 4px',
                                                                    fontSize: '11px', fontWeight: 700,
                                                                    color: 'var(--text-muted)',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.08em',
                                                                    borderTop: unread.length > 0 ? '1px solid var(--border)' : 'none',
                                                                    marginTop: unread.length > 0 ? '8px' : '0'
                                                                }}>
                                                                    ✓ Read
                                                                </div>
                                                                {read.map(notif => {
                                                                    const parsed = parseNotification(notif);
                                                                    return (
                                                                        <div
                                                                            key={notif.id}
                                                                            className="notif-item"
                                                                            onClick={() => handleNotifClick(notif, parsed)}
                                                                            style={{ opacity: 0.6, cursor: parsed.link ? 'pointer' : 'default' }}
                                                                        >
                                                                            <div className="notif-item-title">
                                                                                <span>{notif.title}</span>
                                                                                <span className="notif-item-time">
                                                                                    {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            </div>
                                                                            <div className="notif-item-msg">{parsed.text}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        )}

                                                        {/* If all read and no unread */}
                                                        {unread.length === 0 && read.length === 0 && (
                                                            <div className="notif-empty">No notifications yet.</div>
                                                        )}
                                                    </>
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>


                        <button
                            className="theme-toggle-btn"
                            onClick={() => toggleTheme(theme === 'dark' ? 'light' : 'dark')}
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        >
                            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
                        </button>
                    </div>
                </div>
                <div className="page-body">{children}</div>
            </div>
        </div>
    );
}
