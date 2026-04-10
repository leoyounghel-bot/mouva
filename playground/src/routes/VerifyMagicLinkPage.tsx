import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyMagicLink } from '../api/client';
import './AuthPage.css';

export default function VerifyMagicLinkPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function verify() {
      // Prevent double verification in React.StrictMode
      if (processedRef.current) return;
      processedRef.current = true;

      const email = searchParams.get('email');
      const token = searchParams.get('token');

      if (!email || !token) {
        if (mounted) {
          setStatus('error');
          setError('Invalid login link. Please try sending a new one.');
        }
        return;
      }

      try {
        await verifyMagicLink(email, token);
        if (mounted) {
          setStatus('success');
          // Short delay to show success state
          setTimeout(() => {
            navigate('/ai-designer');
          }, 1500);
        }
      } catch (err: any) {
        if (mounted) {
          setStatus('error');
          setError(err.message || 'Login link expired or invalid. Please try again.');
        }
      }
    }

    verify();

    return () => {
      mounted = false;
    };
  }, [searchParams, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-gradient-1" />
        <div className="auth-gradient-2" />
      </div>

      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          {status === 'verifying' && (
            <>
              <div className="auth-spinner" style={{ margin: '0 auto 24px', width: '40px', height: '40px', borderTopColor: '#9333ea', borderRightColor: '#9333ea', borderBottomColor: '#9333ea' }} />
              <h2 className="auth-title" style={{ fontSize: '24px' }}>Verifying Login...</h2>
              <p className="auth-subtitle">Please wait while we log you in.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '32px', height: '32px' }}>
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="auth-title" style={{ fontSize: '24px' }}>Success!</h2>
              <p className="auth-subtitle">Redirecting you to the app...</p>
            </>
          )}

          {status === 'error' && (
            <>
               <div style={{ width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '32px', height: '32px' }}>
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="auth-title" style={{ fontSize: '24px', color: '#dc2626' }}>Login Failed</h2>
              <p className="auth-subtitle" style={{ marginBottom: '24px' }}>{error}</p>
              <button 
                className="auth-submit" 
                onClick={() => navigate('/auth')}
                style={{ width: '100%' }}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
