import React, { useState } from 'react';
import { savePendingSignupUsername } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import {
  checkUsernameAvailability,
  createSignupProfile,
  passwordLogin,
  updateCurrentUserProfile,
} from '../utils/backendApi';
import { validateUsername } from '../utils/auth';

const GENERIC_LOGIN_ERROR = 'Invalid username/email or password.';
const USERNAME_LOGIN_ERROR = 'We could not find that username yet. Try your email address, or check that your account confirmation is complete.';
const SIGNUP_CONFIRMATION_MESSAGE = 'Account created. Check your email to confirm your account. After confirming, you can sign in with your email or username.';
const EMAIL_DELIVERY_HELP = 'If no email arrives, check spam and confirm Supabase Auth has custom SMTP configured or that this address is authorized on your Supabase team.';
const SIGNUP_PROFILE_WARNING = 'Your account was created, but username sign-in may not be ready yet. If username sign-in fails, use your email address once to finish setup.';

function getBackendMessage(error) {
  return error.message?.replace(/^Backend request failed: \d+\s-\s/, '') || '';
}

function getSignupMessage(error) {
  const message = getBackendMessage(error) || error.message || '';
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('email address not authorized')) {
    return 'Supabase did not send the email because this address is not authorized. Add the address to the Supabase team or configure custom SMTP.';
  }

  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many')) {
    return 'Supabase email sending is rate limited right now. Wait a bit or configure custom SMTP for reliable delivery.';
  }

  return message || 'Authentication failed. Please try again.';
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getLoginMessage(identifier) {
  if (!looksLikeEmail(identifier.trim())) {
    return USERNAME_LOGIN_ERROR;
  }

  return GENERIC_LOGIN_ERROR;
}

export default function Auth({ onSuccess, onSignUpSuccess }) {
  const [mode, setMode] = useState('signin');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isSignup = mode === 'signup';

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
      }

      const normalizedEmail = email.toLowerCase().trim();
      setConfirmationEmail('');

      if (isSignup) {
        const trimmedUsername = username.trim();
        const usernameError = trimmedUsername ? validateUsername(trimmedUsername) : null;

        if (usernameError) {
          throw new Error(usernameError);
        }

        if (trimmedUsername) {
          try {
            await checkUsernameAvailability(trimmedUsername);
          } catch (usernameCheckError) {
            throw new Error(getBackendMessage(usernameCheckError) || 'That username is not available.');
          }
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: trimmedUsername ? {
              username: trimmedUsername,
            } : undefined,
          },
        });

        if (signUpError) throw signUpError;

        let usernameProfileCreated = false;
        let profileWarning = '';

        if (trimmedUsername && data?.session?.access_token) {
          try {
            await createSignupProfile(data.session.access_token, trimmedUsername);
            usernameProfileCreated = true;
          } catch (profileError) {
            profileWarning = SIGNUP_PROFILE_WARNING;
          }
        }

        if (trimmedUsername && !usernameProfileCreated && data?.session?.access_token) {
          try {
            await updateCurrentUserProfile(data.session.access_token, {
              username: trimmedUsername,
            });
            usernameProfileCreated = true;
            profileWarning = '';
          } catch {
            profileWarning = SIGNUP_PROFILE_WARNING;
          }
        }

        if (trimmedUsername && !usernameProfileCreated) {
          savePendingSignupUsername({
            email: normalizedEmail,
            username: trimmedUsername,
          });
        }

        if (data?.session) {
          setMessage(profileWarning ? `Account created. ${profileWarning}` : 'Account created.');
        } else {
          setConfirmationEmail(normalizedEmail);
          setMessage(`${SIGNUP_CONFIRMATION_MESSAGE} ${EMAIL_DELIVERY_HELP}${profileWarning ? ` ${profileWarning}` : ''}`);
        }
        if (data?.session && onSignUpSuccess) {
          onSignUpSuccess(data.user?.id);
        } else if (data?.session && onSuccess) {
          onSuccess();
        }
        return;
      }

      const response = await passwordLogin(identifier.trim(), password);
      const session = response.data?.session;

      if (!session?.access_token || !session?.refresh_token) {
        throw new Error(GENERIC_LOGIN_ERROR);
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessionError) throw sessionError;
      if (onSuccess) onSuccess();
    } catch (err) {
      if (!isSignup) {
        setError(getLoginMessage(identifier));
      } else {
        setError(getSignupMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: confirmationEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (resendError) throw resendError;

      setMessage(`Confirmation email sent again. ${EMAIL_DELIVERY_HELP}`);
    } catch (err) {
      setError(getSignupMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <p className="auth-title">Sip & Swoon</p>
        <h2 className="auth-heading">{isSignup ? 'Create Account' : 'Sign In'}</h2>
        <p className="auth-subtitle">
          {isSignup ? 'Save favorites and share cafe notes.' : 'Welcome back to your cafe list.'}
        </p>

        <form onSubmit={handleEmailAuth} className="auth-form">
          {isSignup ? (
            <>
              <div className="form-group">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-username">Username (optional)</label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={loading}
                  placeholder="coffeelover"
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label htmlFor="auth-identifier">Email or username</label>
              <input
                id="auth-identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com or coffeelover"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={loading}
              placeholder="At least 6 characters"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          {confirmationEmail && isSignup && (
            <button
              type="button"
              className="link-button"
              onClick={handleResendConfirmation}
              disabled={loading}
            >
              Resend confirmation email
            </button>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Working...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button type="button" className="btn btn-secondary auth-google" onClick={handleGoogleSignIn} disabled={loading}>
          Continue with Google
        </button>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setMode(isSignup ? 'signin' : 'signup');
              setError('');
              setMessage('');
              setPassword('');
              setConfirmationEmail('');
            }}
          >
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
