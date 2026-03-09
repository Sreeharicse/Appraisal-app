import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import logo from '../assets/logo-techxl.png';

export default function Login() {
    const { loginWithMicrosoft, loginAsFake } = useApp();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Supabase sometimes returns errors in the hash (#error=...) and sometimes in the query string (?error=...)
        const hash = window.location.hash;
        const search = window.location.search;
        let params = null;

        if (hash && hash.includes('error=')) {
            params = new URLSearchParams(hash.substring(1));
            window.history.replaceState(null, '', window.location.pathname + search);
        } else if (search && search.includes('error=')) {
            params = new URLSearchParams(search);
            window.history.replaceState(null, '', window.location.pathname + hash);
        }

        if (params) {
            const errorDesc = params.get('error_description') || params.get('error');
            setError('Authentication Error: ' + decodeURIComponent(errorDesc).replace(/\+/g, ' '));
        }
    }, []);

    const handleMicrosoftLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const result = await loginWithMicrosoft();
            if (!result.success) {
                setError(result.error || 'Login failed.');
                setLoading(false);
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="ms-auth-container">
            <div className="ms-auth-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logo} alt="Techxl Logo" className="ms-auth-logo" style={{ marginBottom: '32px', height: '40px' }} />

                <h1 className="ms-auth-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Sign In</h1>
                <p style={{ fontSize: '15px', color: '#666', textAlign: 'center', marginBottom: '32px' }}>
                    Access the Techxl Employee Appraisal System using your Microsoft 365 account.
                </p>

                {error && <div className="ms-auth-error" style={{ textAlign: 'center' }}>{error}</div>}

                <button
                    onClick={handleMicrosoftLogin}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '12px 24px',
                        backgroundColor: '#fff',
                        border: '1px solid #8c8c8c',
                        borderRadius: '2px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#333',
                        transition: 'background-color 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        opacity: loading ? 0.7 : 1
                    }}
                    onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#f3f2f1'; }}
                    onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#fff'; }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21">
                        <path fill="#f25022" d="M1 1h9v9H1z" />
                        <path fill="#7fb900" d="M11 1h9v9h-9z" />
                        <path fill="#00a4ef" d="M1 11h9v9H1z" />
                        <path fill="#ffb900" d="M11 11h9v9h-9z" />
                    </svg>
                    {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                </button>

                <div style={{ marginTop: '24px', width: '100%', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Developer Testing</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                            onClick={() => loginAsFake('hr')}
                            style={{ flex: 1, padding: '8px', fontSize: '13px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155', fontWeight: '500', transition: 'background-color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            HR
                        </button>
                        <button 
                            onClick={() => loginAsFake('manager')}
                            style={{ flex: 1, padding: '8px', fontSize: '13px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155', fontWeight: '500', transition: 'background-color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            Manager
                        </button>
                        <button 
                            onClick={() => loginAsFake('employee')}
                            style={{ flex: 1, padding: '8px', fontSize: '13px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155', fontWeight: '500', transition: 'background-color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            Employee
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
