import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { id } from '@instantdb/react';
import {
  hashPassword,
  validatePassword,
  validateUsername,
  validateEmail,
  generateToken,
  saveRememberMeToken,
  getRememberMeToken,
  clearRememberMeToken,
  saveRememberedUsername,
  getRememberedUsername,
  clearRememberedUsername,
} from '../utils/auth';

export default function Auth({ onSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'forgot', 'reset'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Load remembered username on mount
  useEffect(() => {
    const rememberedUsername = getRememberedUsername();
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true); // Keep checkbox checked
    }
  }, []);

  // Reset password visibility when mode changes
  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Validate inputs
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        return;
      }

      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Check if username already exists
      const { data: existingUsers } = await db.queryOnce({
        users: {
          $: {
            where: {
              username: username,
            },
          },
        },
      });

      if (existingUsers.users && existingUsers.users.length > 0) {
        setError('Username already taken');
        return;
      }

      // Note: Email uniqueness is handled by InstantDB auth system

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Normalize email for consistency
      const normalizedEmail = email.toLowerCase().trim();

      // Create user account using magic code first
      await db.auth.sendMagicCode({ email: normalizedEmail });
      setMessage('Check your email for a verification code to complete signup!');
      
      // Store signup data temporarily
      sessionStorage.setItem('pendingSignup', JSON.stringify({
        username,
        email: normalizedEmail,
        hashedPassword,
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

      const { username, email, hashedPassword } = JSON.parse(pendingData);

      // Validate that we have all required data
      if (!hashedPassword) {
        console.error('❌ hashedPassword is missing from sessionStorage!');
        setError('Signup data corrupted. Please try again.');
        setMode('signup');
        return;
      }

      console.log('📦 Data from sessionStorage:');
      console.log('  - Username:', username);
      console.log('  - Email:', email);
      console.log('  - Hashed password length:', hashedPassword?.length);
      console.log('  - Hashed password preview:', hashedPassword?.substring(0, 30) + '...');

      // Verify the code and sign in
      console.log('📧 Verifying magic code for email:', email);
      const signInResult = await db.auth.signInWithMagicCode({ email, code });
      console.log('✅ Sign in result:', signInResult);
      
      // Get the authenticated user's ID from the sign-in result
      const authUser = signInResult.user;
      console.log('🔍 Auth user from result:', authUser);
      
      if (!authUser || !authUser.id) {
        setError('Authentication failed. Please try again.');
        console.error('❌ No auth user found in result');
        return;
      }

      const userId = authUser.id;
      const normalizedEmail = email.toLowerCase().trim();
      const trimmedUsername = username.trim();
      
      console.log('✅ Creating user record:');
      console.log('  - User ID:', userId);
      console.log('  - Email:', normalizedEmail);
      console.log('  - Username (original):', username);
      console.log('  - Username (trimmed):', trimmedUsername);
      console.log('  - Password hash length:', hashedPassword.length);
      console.log('  - Password hash preview:', hashedPassword.substring(0, 30) + '...');
      
      // Create/Update user record with username and password
      // Note: Email is managed by InstantDB auth system and cannot be updated directly
      try {
        // Create username lookup entry (public entity, can be queried without auth)
        const lookupId = id();
        const userTransaction = db.tx.users[userId].update({
          id: userId,
          username: trimmedUsername,
          password: hashedPassword,
          email: normalizedEmail,
        });
        const lookupTransaction = db.tx.usernameLookups[lookupId].update({
          username: trimmedUsername,
          email: normalizedEmail,
          userId: userId,
        });
        
        console.log('📝 Transaction objects:', { userTransaction, lookupTransaction });
        
        const result = await db.transact([userTransaction, lookupTransaction]);
        console.log('✅ Transaction result:', result);
        
        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify the data was saved
        const { data: verifyData } = await db.queryOnce({
          users: {
            $: {
              where: {
                id: userId,
              },
            },
          },
        });
        console.log('🔍 Verification - User data in database:', verifyData.users);
        
        if (verifyData.users && verifyData.users[0]) {
          const savedUser = verifyData.users[0];
          console.log('🔍 Verification - Complete user data:');
          console.log('  - Username:', savedUser.username || 'NULL/MISSING');
          console.log('  - Password:', savedUser.password ? `Present (${savedUser.password.length} chars)` : 'NULL/MISSING');
          
          if (!savedUser.username) {
            console.error('❌ Username was NOT saved!');
            setError('Failed to save username. Please try again.');
            return;
          }
          
          if (!savedUser.password) {
            console.error('❌ Password was NOT saved! Transaction may have failed silently.');
            setError('Failed to save password. Please try again.');
            return;
          }
          
          console.log('✅ All fields saved successfully!');
        }
      } catch (txError) {
        console.error('❌ Transaction error:', txError);
        setError('Failed to save user data: ' + (txError.message || 'Unknown error'));
        return;
      }

      sessionStorage.removeItem('pendingSignup');
      console.log('🎉 SIGNUP COMPLETE! User should now be in database.');
      // Don't set a message here as the component will unmount and redirect to main app
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500);
      }
    } catch (err) {
      console.error('❌ Signup verification error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
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
      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Trim username for query (in case of extra spaces)
      const trimmedUsername = username.trim();
      
      console.log('🔍 Sign In Debug:');
      console.log('Username entered:', username);
      console.log('Username trimmed:', trimmedUsername);
      
      // Query username lookup (public entity, can be queried without authentication)
      console.log('🔍 Querying usernameLookups for username:', trimmedUsername);
      const { data: lookupData } = await db.queryOnce({
        usernameLookups: {
          $: {
            where: {
              username: trimmedUsername,
            },
          },
        },
      });

      console.log('Username lookup result:', lookupData?.usernameLookups || []);

      if (!lookupData?.usernameLookups || lookupData.usernameLookups.length === 0) {
        console.log('❌ No username lookup found for:', trimmedUsername);
        setError('Invalid username or password');
        return;
      }

      const lookup = lookupData.usernameLookups[0];
      console.log('✅ Username lookup found:', {
        username: lookup.username,
        email: lookup.email,
        userId: lookup.userId
      });

      // Now query the user by ID to get password (specific ID query might work)
      console.log('🔍 Querying user by ID:', lookup.userId);
      const { data: userData } = await db.queryOnce({
        users: {
          $: {
            where: {
              id: lookup.userId,
            },
          },
        },
      });

      console.log('User data result:', userData?.users || []);

      if (!userData?.users || userData.users.length === 0) {
        console.log('❌ User not found by ID:', lookup.userId);
        setError('Invalid username or password');
        return;
      }

      const user = userData.users[0];
      console.log('✅ User found:', {
        id: user.id,
        username: user.username,
        email: user.email,
        hasPassword: !!user.password
      });

      console.log('✅ User found:', user);
      console.log('User ID:', user.id);
      console.log('User email in database:', user.email);
      console.log('User username in database:', user.username);
      console.log('User password in database:', user.password ? `Present (${user.password.length} chars)` : 'NULL/MISSING');
      console.log('Entered password hash length:', hashedPassword.length);
      console.log('Entered password hash preview:', hashedPassword.substring(0, 30) + '...');

      // Check if password exists in database
      if (!user.password) {
        console.error('❌ Password is NULL in database! User needs to set a password.');
        setError('No password set for this account. Please use "Forgot Password" below to set your password.');
        return;
      }

      // Check password
      if (user.password !== hashedPassword) {
        console.log('❌ Password mismatch');
        console.log('Database password:', user.password.substring(0, 30) + '...');
        console.log('Entered password:', hashedPassword.substring(0, 30) + '...');
        setError('Invalid username or password');
        return;
      }
      
      console.log('✅ Password matches!');
      console.log('📧 Sending magic code to:', user.email);
      console.log('💾 User ID to save:', user.id);
      console.log('✅ Remember me checked:', rememberMe);

      // Sign in with magic code
      await db.auth.sendMagicCode({ email: user.email });
      
      // Store signin data temporarily
      const signinData = {
        email: user.email,
        userId: user.id,
        rememberMe,
      };
      console.log('💾 Storing signin data:', signinData);
      sessionStorage.setItem('pendingSignin', JSON.stringify(signinData));

      setMessage('Check your email for a verification code!');
      setMode('verifySignin');
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
      console.log('🔐 Starting sign-in verification...');
      const pendingData = sessionStorage.getItem('pendingSignin');
      if (!pendingData) {
        setError('Signin session expired. Please try again.');
        setMode('signin');
        return;
      }

      console.log('📦 Retrieved pending signin data:', pendingData);
      const { email, userId, rememberMe } = JSON.parse(pendingData);
      console.log('📧 Email:', email);
      console.log('🆔 User ID:', userId);
      console.log('✅ Remember me:', rememberMe);

      // Verify the code
      console.log('🔐 Verifying magic code...');
      await db.auth.signInWithMagicCode({ email, code });
      console.log('✅ Magic code verified successfully!');

      // Handle remember me
      if (rememberMe) {
        try {
          console.log('💾 Remember me: Starting save process for user:', userId);
          const token = generateToken();
          
          // Wait a moment for auth state to update before querying
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify user exists before updating
          console.log('🔍 Remember me: Querying user with ID:', userId);
          const { data: userData } = await db.queryOnce({
            users: {
              $: {
                where: {
                  id: userId,
                },
              },
            },
          });
          
          console.log('🔍 Remember me: Query result:', userData);
          
          if (!userData.users || userData.users.length === 0) {
            console.error('❌ User not found when trying to save remember me token');
            console.error('User ID:', userId);
            console.error('Query returned:', userData);
            // Don't fail sign-in, just log the error
            console.warn('Remember me token not saved, but sign-in will continue');
          } else {
            const foundUser = userData.users[0];
            console.log('✅ User found:', {
              id: foundUser.id,
              username: foundUser.username,
              email: foundUser.email,
            });
            
            // Update remember me token
            try {
              console.log('💾 Saving remember me token to database...');
              await db.transact([
                db.tx.users[userId].merge({
                  rememberMeToken: token,
                }),
              ]);
              saveRememberMeToken(token);
              console.log('✅ Remember me token saved successfully to database and localStorage');
            } catch (tokenError) {
              console.error('❌ Error saving remember me token:', tokenError);
              // Don't fail sign-in if token save fails
            }
            
            // Save username to localStorage for next visit
            const username = foundUser.username;
            if (username) {
              saveRememberedUsername(username);
              console.log('✅ Username saved for next visit:', username);
            } else {
              console.warn('⚠️ Username is null, cannot save for remember me');
            }
          }
        } catch (rememberMeError) {
          console.error('❌ Error in remember me process:', rememberMeError);
          console.error('Error stack:', rememberMeError.stack);
          // Don't fail sign-in if remember me fails, just log the error
          console.warn('Remember me token not saved, but sign-in will continue');
        }
      } else {
        // If remember me is unchecked, clear any saved username
        clearRememberedUsername();
      }

      sessionStorage.removeItem('pendingSignin');
      setMessage('Signed in successfully!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500);
      }
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
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

      // Normalize email for case-insensitive lookup
      const normalizedEmail = email.toLowerCase().trim();

      // Try to send reset code first (this will fail if email doesn't exist in InstantDB auth)
      try {
        await db.auth.sendMagicCode({ email: normalizedEmail });
        setMessage('Check your email for a password reset code!');
        setMode('reset');
      } catch (sendError) {
        console.error('❌ Failed to send magic code:', sendError);
        setError('No account found with this email');
        return;
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Verify the code and sign in
      const normalizedEmail = email.toLowerCase().trim();
      const signInResult = await db.auth.signInWithMagicCode({ email: normalizedEmail, code });

      // Get user ID from sign-in result
      const authUser = signInResult.user;
      if (!authUser || !authUser.id) {
        setError('Authentication failed. Please try again.');
        return;
      }

      const userId = authUser.id;

      // Validate username
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        return;
      }

      const trimmedUsername = username.trim();

      // Update password AND username (in case any were null before)
      // Note: Email is managed by InstantDB auth system and cannot be updated directly
      const hashedPassword = await hashPassword(password);
      
      // Check if username lookup exists
      const { data: existingLookup } = await db.queryOnce({
        usernameLookups: {
          $: {
            where: {
              username: trimmedUsername,
            },
          },
        },
      });
      
      const transactions = [
        db.tx.users[userId].update({
          id: userId,
          username: trimmedUsername,
          password: hashedPassword,
          email: normalizedEmail,
        }),
      ];
      
      // Update or create username lookup
      if (existingLookup?.usernameLookups && existingLookup.usernameLookups.length > 0) {
        // Update existing lookup
        const lookupId = existingLookup.usernameLookups[0].id;
        transactions.push(
          db.tx.usernameLookups[lookupId].merge({
            email: normalizedEmail,
            userId: userId,
          })
        );
      } else {
        // Create new lookup
        const lookupId = id();
        transactions.push(
          db.tx.usernameLookups[lookupId].update({
            username: trimmedUsername,
            email: normalizedEmail,
            userId: userId,
          })
        );
      }
      
      await db.transact(transactions);
      
      console.log('✅ Username, password, email, and lookup updated successfully for user:', userId);

      setMessage('Account set up successfully!');
      
      // Call onSuccess callback if provided (user is already signed in at this point)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
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
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                disabled={loading}
              />
            </div>

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

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className={showPassword ? '' : 'eye-crossed'}>👁️‍🗨️</span>
                </button>
              </div>
              <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Must be 8+ characters with uppercase, lowercase, and numbers
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <span className={showConfirmPassword ? '' : 'eye-crossed'}>👁️‍🗨️</span>
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
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

      case 'forgot':
        return (
          <form onSubmit={handleForgotPassword} className="auth-form">
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
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode('signin')}
              disabled={loading}
            >
              Back to Sign In
            </button>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="code">Reset Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code from email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                disabled={loading}
              />
              <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Set your username for signing in
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a new password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className={showPassword ? '' : 'eye-crossed'}>👁️‍🗨️</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <span className={showConfirmPassword ? '' : 'eye-crossed'}>👁️‍🗨️</span>
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMode('forgot');
                setCode('');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
              }}
              disabled={loading}
            >
              Back
            </button>
          </form>
        );

      default: // signin
        return (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className={showPassword ? '' : 'eye-crossed'}>👁️‍🗨️</span>
                </button>
              </div>
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
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <button
              type="button"
              className="link-button"
              onClick={() => setMode('forgot')}
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              Forgot password?
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
      case 'forgot':
        return 'Forgot Password';
      case 'reset':
        return 'Reset Password';
      default:
        return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup':
        return 'Sign up to rate and review your favorite coffees';
      case 'verifySignup':
        return 'Enter the verification code sent to your email';
      case 'verifySignin':
        return 'Enter the verification code sent to your email';
      case 'forgot':
        return 'Enter your email to receive a password reset code';
      case 'reset':
        return 'Enter the code, set your username, and create a new password';
      default:
        return 'Sign in to continue to Sip Swoon';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">☕ Sip Swoon - Rate Your Coffee</h1>
        <h2 className="auth-heading">{getTitle()}</h2>
        <p className="auth-subtitle">{getSubtitle()}</p>
        {renderForm()}
      </div>
    </div>
  );
}

