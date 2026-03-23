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
            <div className="ms-auth-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <img src={logo} alt="Logo" style={{ height: '48px', width: 'auto' }} />
                </div>

                <h1 className="ms-auth-title" style={{ marginBottom: '32px' }}>Sign In</h1>

                {error && <div className="ms-auth-error">{error}</div>}

                <button
                    onClick={handleMicrosoftLogin}
                    disabled={loading}
                    className="ms-auth-microsoft-btn"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
                        <path fill="#fff" d="M1 1h9v9H1z" opacity="0.9" />
                        <path fill="#fff" d="M11 1h9v9h-9z" opacity="0.9" />
                        <path fill="#fff" d="M1 11h9v9H1z" opacity="0.9" />
                        <path fill="#fff" d="M11 11h9v9h-9z" opacity="0.9" />
                    </svg>
                    {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                </button>

            </div>
        </div>
    );
}
