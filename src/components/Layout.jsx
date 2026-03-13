import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import logo from '../assets/logo-techxl.png';
import logoDark from '../assets/logo-techxl-dark.png';
import Icons from './Icons';

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
    { to: '/manager/goals', label: 'Team Report', icon: <Icons.Chart /> },
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
    { to: '/manager/goals', label: 'Team Report', icon: <Icons.Chart /> },
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
    const { currentUser, logout, theme, toggleTheme, notifications, markNotificationAsRead, refreshData } = useApp();
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
                <div className="sidebar-logo">
                    {theme === 'dark' ? (
                        // Dark mode: clip whitespace — image is wide with padding, show just the logo content
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ width: '120px', height: '32px', overflow: 'hidden', position: 'relative' }}>
                                <img
                                    src={logoDark}
                                    alt="Techxl Logo"
                                    style={{ width: '120px', height: 'auto', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}
                                />
                            </div>
                        </div>
                    ) : (
                        // Light mode: compact inline logo + text
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <img src={logo} alt="Techxl Logo" style={{ height: '32px', width: 'auto' }} />
                            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}></span>
                        </div>
                    )}
                    <span>{ROLE_LABELS[currentUser?.role]}</span>
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
                        <div className="avatar" style={{ background: 'var(--blue-gradient)' }}>{currentUser?.avatar || '?'}</div>
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
                                            myNotifications.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                                                    onClick={() => !notif.isRead && markNotificationAsRead(notif.id)}
                                                >
                                                    <div className="notif-item-title">
                                                        <span>{notif.title}</span>
                                                        <span className="notif-item-time">
                                                            {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="notif-item-msg">{notif.message}</div>
                                                </div>
                                            ))
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
