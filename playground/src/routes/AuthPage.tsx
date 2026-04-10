import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithMicrosoft, loginWithGoogle, sendMagicLink } from '../api/client';
import './AuthPage.css';

// OAuth Configuration
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Type declarations for OAuth SDKs
declare global {
  interface Window {
    msal?: any;
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle Google login callback
  const handleGoogleCallback = useCallback(async (response: any) => {
    if (!response?.credential) {
      setError('Google login failed');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithGoogle(response.credential);
      navigate('/ai-designer');
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
    });

    // Render the Google button
    const googleButtonContainer = document.getElementById('google-signin-button');
    if (googleButtonContainer) {
      window.google.accounts.id.renderButton(googleButtonContainer, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 300,
      });
    }
  }, [handleGoogleCallback]);

  // Handle Google login (manual trigger)
  const handleGoogleLogin = () => {
    if (!window.google || !GOOGLE_CLIENT_ID) {
      setError('Google Sign-In not available');
      return;
    }
    window.google.accounts.id.prompt();
  };

  // Handle Microsoft login
  const handleMicrosoftLogin = async () => {
    if (!window.msal || !MICROSOFT_CLIENT_ID) {
      setError('Microsoft Sign-In not available');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const msalConfig = {
        auth: {
          clientId: MICROSOFT_CLIENT_ID,
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin,
        },
      };

      const msalInstance = new window.msal.PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      
      const loginResponse = await msalInstance.loginPopup({
        scopes: ['User.Read', 'email', 'profile'],
      });

      if (loginResponse?.accessToken) {
        await loginWithMicrosoft(loginResponse.accessToken);
        navigate('/ai-designer');
      }
    } catch (err: any) {
      if (err.errorCode !== 'user_cancelled') {
        setError(err.message || 'Microsoft login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle send magic link
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);

    try {
      await sendMagicLink(email);
      setLinkSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send login link');
      setIsLoading(false); // Only unset loading if failed, as successful sends leave us in "sent" state
    } finally {
      if (error) setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background */}
      <div className="auth-background">
        <div className="auth-gradient-1" />
        <div className="auth-gradient-2" />
      </div>

      {/* Back Button */}
      <Link to="/" className="auth-back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
        </svg>
      </Link>

      {/* Auth Card */}
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <Link to="/" className="auth-logo">
            <img src="/logo.svg" alt="Mouva" className="logo-icon-img" />
            <span className="logo-text">Mouva</span>
          </Link>

          {!linkSent ? (
            <>

              {/* Social Login */}
              <div className="auth-social" style={{ marginBottom: '24px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Google Login Button */}
                <button 
                  className="social-btn google" 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Microsoft Login Button */}
                <button 
                  className="social-btn microsoft" 
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24z" fill="#00A4EF"/>
                    <path d="M24 24H12.6V12.6H24V24z" fill="#FFB900"/>
                    <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#F25022"/>
                    <path d="M24 11.4H12.6V0H24v11.4z" fill="#7FBA00"/>
                  </svg>
                  Continue with Outlook
                </button>
              </div>


              <div className="auth-divider">
                <span>or sign in with email</span>
              </div>

              {/* Form */}
              <form className="auth-form" onSubmit={handleSendLink}>
                {error && (
                  <div className="auth-error">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <button type="submit" className="auth-submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="auth-spinner" />
                  ) : (
                    'Send Login Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
               <div style={{ width: '60px', height: '60px', background: 'rgba(147, 51, 234, 0.1)', borderRadius: '50%', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '32px', height: '32px' }}>
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                </svg>
              </div>
              <h2 className="auth-title">Check your email</h2>
              <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                We sent a login link to <strong>{email}</strong>
              </p>
              <p className="auth-footer-text">
                Click the link in the email to sign in.<br/>
                Don't see it? Check your spam folder.
              </p>
              
              <button 
                onClick={() => { setLinkSent(false); setIsLoading(false); }}
                className="auth-resend"
                style={{ marginTop: '24px' }}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
        <p className="auth-footer-text" style={{ marginTop: '24px' }}>
          By signing in, you agree to our{' '}
          <a href="/terms">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
