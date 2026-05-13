import React, { useState, useEffect } from 'react';
import { db } from '../db';
import {
  validateEmail,
  generateToken,
  saveRememberMeToken,
  getRememberMeToken,
  clearRememberMeToken,
} from '../utils/auth';

export default function Auth({ onSuccess, onSignUpSuccess }) {
  const { user: authUser } = db.useAuth();
  const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'verifySignup', 'verifySignin'
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Check for remember me token on mount and auto-sign-in if InstantDB has session
  useEffect(() => {
    const checkRememberMe = async () => {
      const storedToken = getRememberMeToken();

      if (storedToken && authUser && authUser.id) {
        try {
          const { data: userData } = await db.queryOnce({
            users: {
              $: {
                where: {
                  id: authUser.id,
                  rememberMeToken: storedToken,
                },
              },
            },
          });

          if (userData?.users && userData.users.length > 0) {
            if (onSuccess) {
              setTimeout(() => onSuccess(), 100);
            }
            return;
          }
        } catch (err) {
          console.error('Error checking remember me token:', err);
        }
      }

      if (storedToken && !authUser && mode === 'signin') {
        try {
          const { data: userData } = await db.queryOnce({
            users: {
              $: {
                where: {
                  rememberMeToken: storedToken,
                },
              },
            },
          });

          if (userData?.users && userData.users.length > 0) {
            const user = userData.users[0];
            setEmail(user.email || '');
            setRememberMe(true);
          }
        } catch (err) {
          console.error('Error checking remember me token:', err);
          clearRememberMeToken();
        }
      }
    };

    checkRememberMe();
  }, [mode, authUser, onSuccess]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      await db.auth.sendMagicCode({ email: normalizedEmail });
      setMessage('Check your email for a verification code to complete signup!');

      sessionStorage.setItem('pendingSignup', JSON.stringify({
        email: normalizedEmail,
      }));

      setMode('verifySignup');
    } catch (err) {
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const pendingData = sessionStorage.getItem('pendingSignup');
      if (!pendingData) {
        setError('Signup session expired. Please try again.');
        setMode('signup');
        return;
      }

      const { email: pendingEmail } = JSON.parse(pendingData);

      const signInResult = await db.auth.signInWithMagicCode({ email: pendingEmail, code });
      const authUser = signInResult.user;

      if (!authUser || !authUser.id) {
        setError('Authentication failed. Please try again.');
        return;
      }

      const userId = authUser.id;
      const normalizedEmail = pendingEmail.toLowerCase().trim();

      const { data: existingUserData } = await db.queryOnce({
        users: {
          $: {
            where: {
              id: userId,
            },
          },
        },
      });

      const userExists = existingUserData?.users && existingUserData.users.length > 0;

      try {
        if (userExists) {
          await db.transact([
            db.tx.users[userId].merge({
              authProvider: 'email',
            }),
          ]);
        } else {
          await db.transact([
            db.tx.users[userId].update({
              id: userId,
              email: normalizedEmail,
              authProvider: 'email',
            }),
          ]);
        }
      } catch (txError) {
        if (txError.message?.includes('unique') && txError.message?.includes('email')) {
          try {
            await db.transact([
              db.tx.users[userId].merge({
                authProvider: 'email',
              }),
            ]);
          } catch (mergeError) {
            setError('Failed to save user data: ' + (mergeError.message || 'Unknown error'));
            return;
          }
        } else {
          setError('Failed to save user data: ' + (txError.message || 'Unknown error'));
          return;
        }
      }

      sessionStorage.removeItem('pendingSignup');

      if (onSignUpSuccess) {
        setTimeout(() => onSignUpSuccess(userId), 500);
      } else if (onSuccess) {
        setTimeout(() => onSuccess(), 500);
      }
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      const { data: userData } = await db.queryOnce({
        users: {
          $: {
            where: {
              email: normalizedEmail,
            },
          },
        },
      });

      if (!userData?.users || userData.users.length === 0) {
        setError('No account found with this email. Please sign up first.');
        return;
      }

      const user = userData.users[0];
      const storedToken = getRememberMeToken();
      const hasValidRememberMe = storedToken && user.rememberMeToken === storedToken;

      if (hasValidRememberMe && rememberMe && authUser && authUser.id === user.id) {
        setMessage('Signed in successfully!');
        if (onSuccess) {
          setTimeout(() => onSuccess(), 500);
        }
        return;
      }

      await db.auth.sendMagicCode({ email: user.email });

      sessionStorage.setItem('pendingSignin', JSON.stringify({
        email: user.email,
        userId: user.id,
        rememberMe: rememberMe,
        hasValidRememberMe: hasValidRememberMe,
      }));

      setMode('verifySignin');
      setMessage('Please check your email for the verification code to complete sign-in.');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const pendingData = sessionStorage.getItem('pendingSignin');
      if (!pendingData) {
        setError('Signin session expired. Please try again.');
        setMode('signin');
        return;
      }

      const { email: pendingEmail, userId, rememberMe: doRememberMe } = JSON.parse(pendingData);

      await db.auth.signInWithMagicCode({ email: pendingEmail, code });

      if (doRememberMe) {
        try {
          const token = generateToken();
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: userData } = await db.queryOnce({
            users: {
              $: {
                where: {
                  id: userId,
                },
              },
            },
          });

          if (userData?.users && userData.users.length > 0) {
            await db.transact([
              db.tx.users[userId].merge({
                rememberMeToken: token,
              }),
            ]);
            saveRememberMeToken(token);
          }
        } catch (rememberMeError) {
          console.warn('Remember me token not saved:', rememberMeError);
        }
      }

      sessionStorage.removeItem('pendingSignin');
      setMessage('Signed in successfully!');

      if (onSuccess) {
        setTimeout(() => onSuccess(), 500);
      }
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending Code...' : 'Sign Up'}
            </button>

            <p className="auth-switch">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="link-button"
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          </form>
        );

      case 'verifySignup':
        return (
          <form onSubmit={handleVerifySignup} className="auth-form">
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code from email"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMode('signup');
                setCode('');
                sessionStorage.removeItem('pendingSignup');
              }}
              disabled={loading}
            >
              Back to Sign Up
            </button>
          </form>
        );

      case 'verifySignin':
        return (
          <form onSubmit={handleVerifySignin} className="auth-form">
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code from email"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMode('signin');
                setCode('');
                sessionStorage.removeItem('pendingSignin');
              }}
              disabled={loading}
            >
              Back to Sign In
            </button>
          </form>
        );

      default: // signin
        return (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending Code...' : 'Sign In'}
            </button>

            <p className="auth-switch">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="link-button"
                disabled={loading}
              >
                Sign Up
              </button>
            </p>
          </form>
        );
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup':
        return 'Create Account';
      case 'verifySignup':
        return 'Verify Email';
      case 'verifySignin':
        return 'Verify Sign In';
      default:
        return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup':
        return 'Enter your email to get started';
      case 'verifySignup':
      case 'verifySignin':
        return 'Enter the verification code sent to your email';
      default:
        return 'Sign in to continue to Sip & Swoon';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">☕ Sip & Swoon - Rate Your Coffee</h1>
        <h2 className="auth-heading">{getTitle()}</h2>
        <p className="auth-subtitle">{getSubtitle()}</p>
        {renderForm()}
      </div>
    </div>
  );
}
