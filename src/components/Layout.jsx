import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import logo from '../assets/logo-techxl.png';
import Icons from './Icons';

const HR_LINKS = [
    { to: '/hr', label: 'Dashboard', icon: <Icons.Home /> },
    { to: '/hr/employees', label: 'Employees', icon: <Icons.Users /> },
    { to: '/hr/cycles', label: 'Appraisal Cycles', icon: <Icons.Cycles /> },
    { to: '/hr/goals', label: 'Assign Goals', icon: <Icons.Target /> },
    { to: '/hr/approvals', label: 'Approvals', icon: <Icons.Check /> },
    { to: '/hr/reports', label: 'Reports', icon: <Icons.Chart /> },
];

const MANAGER_LINKS = [
    { to: '/manager', label: 'Dashboard', icon: <Icons.Home /> },
    { to: '/manager/goals', label: 'Assign Goals', icon: <Icons.Target /> },
    { to: '/manager/evaluate', label: 'Evaluate Team', icon: <Icons.Star /> },
    { to: '/manager/team-report', label: 'Team Report', icon: <Icons.Chart /> },
];

const EMPLOYEE_LINKS = [
    { to: '/employee', label: 'Dashboard', icon: <Icons.Home /> },
    { to: '/employee/goals', label: 'My Goals', icon: <Icons.Target /> },
    { to: '/employee/self-review', label: 'Self Review', icon: <Icons.FileText /> },
    { to: '/employee/results', label: 'My Results', icon: <Icons.Trophy /> },
];

const ROLE_LINKS = {
    employee: EMPLOYEE_LINKS,
    manager: MANAGER_LINKS,
    hr: HR_LINKS,
    admin: [...MANAGER_LINKS, ...HR_LINKS]
};
const ROLE_LABELS = { hr: 'HR Administrator', manager: 'Team Manager', employee: 'Employee', admin: 'Administrator' };

export default function Layout({ children }) {
    const { currentUser, logout, theme, toggleTheme } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const links = ROLE_LINKS[currentUser?.role] || [];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getPageTitle = () => {
        const all = [...HR_LINKS, ...MANAGER_LINKS, ...EMPLOYEE_LINKS];
        const match = all.slice().reverse().find(l => location.pathname.startsWith(l.to) && (l.to !== '/hr' || location.pathname === '/hr') && (l.to !== '/manager' || location.pathname === '/manager') && (l.to !== '/employee' || location.pathname === '/employee'));
        return match?.label || 'Techxl';
    };

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '48px', height: '48px', overflow: 'hidden', borderRadius: '12px', display: 'flex', justifyContent: 'flex-start' }}>
                            <img src={logo} alt="Logo" style={{ height: '48px', width: 'auto', maxWidth: 'none' }} />
                        </div>
                    </div>
                    <span>{ROLE_LABELS[currentUser?.role]}</span>
                </div>
                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/hr' || link.to === '/manager' || link.to === '/employee'}
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
                    <div className="theme-switcher">
                        <button
                            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                            onClick={() => toggleTheme('dark')}
                            title="Dark Mode"
                        >
                            <Icons.Moon /> Dark
                        </button>
                        <button
                            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => toggleTheme('light')}
                            title="Light Mode"
                        >
                            <Icons.Sun /> White
                        </button>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
                </div>
            </aside>

            <div className="main-content">
                <div className="topbar">
                    <h1>{getPageTitle()}</h1>
                    <span className="topbar-meta">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
                <div className="page-body">{children}</div>
            </div>
        </div>
    );
}
