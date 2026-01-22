# Authentication System Guide

## Overview

The Coffee Rating App now features a comprehensive username/password authentication system with a "Remember Me" feature. Email codes are now only used for account verification and password resets.

## Features

### 1. **Sign Up**
- Users create an account with:
  - **Username**: 3-20 characters, letters, numbers, and underscores only
  - **Email**: Valid email address for verification and password reset
  - **Password**: Must be 8+ characters with uppercase, lowercase, and numbers
- After submitting, users receive a verification code via email
- Once verified, the account is created

### 2. **Sign In**
- Users sign in with their **username** and **password**
- A verification code is sent to their email for security
- After verifying the code, they're signed in
- **Remember Me** checkbox:
  - When checked, a secure token is stored in localStorage
  - Next time the user visits, they can sign in faster

### 3. **Forgot Password**
- Users enter their email address
- A reset code is sent via email
- Users enter the code and create a new password
- The password is updated securely

### 4. **Sign Out**
- Clears the remember me token from both localStorage and database
- Signs the user out completely

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Password Storage
- Passwords are hashed using SHA-256 before storage
- Plain text passwords are never stored
- Hashing happens client-side before sending to database

### Remember Me Token
- Generates a secure 64-character random token
- Stored in both localStorage and database
- Cleared on sign out
- Used for faster authentication on return visits

### Email Verification
- All sign-ups require email verification
- Sign-ins also require email verification code for added security
- Password resets use email verification

## Technical Implementation

### Files Modified/Created

1. **`src/utils/auth.js`** (NEW)
   - Password hashing and validation
   - Username and email validation
   - Token generation and management
   - Remember me token storage

2. **`src/components/Auth.jsx`** (UPDATED)
   - Sign up flow with email verification
   - Sign in flow with username/password
   - Forgot password and reset password flows
   - Remember me functionality
   - Multi-step form handling

3. **`src/db.js`** (UPDATED)
   - Added `username` field (unique, indexed)
   - Added `password` field for hashed passwords
   - Added `rememberMeToken` field
   - Added `resetToken` and `resetTokenExpiry` fields

4. **`src/App.jsx`** (UPDATED)
   - Enhanced sign out to clear remember me tokens
   - Imports auth utilities

5. **`src/styles/App.css`** (UPDATED)
   - Added checkbox styling for Remember Me
   - Added auth heading styles
   - Enhanced form styling

### Database Schema Changes

```javascript
$users: {
  email: string (unique, indexed),
  username: string (unique, indexed),  // NEW
  password: string,                     // NEW (hashed)
  profilePhotoUrl: string (optional),
  rememberMeToken: string (optional),   // NEW
  resetToken: string (optional),        // NEW
  resetTokenExpiry: number (optional),  // NEW
}
```

## User Flow Diagrams

### Sign Up Flow
1. User enters username, email, password
2. System validates inputs
3. System checks for existing username/email
4. Password is hashed
5. Verification code sent to email
6. User enters code
7. Account created with username and hashed password

### Sign In Flow
1. User enters username and password
2. Password is hashed and verified
3. Verification code sent to email
4. User enters code
5. If "Remember Me" checked, token is generated and stored
6. User is signed in

### Forgot Password Flow
1. User enters email
2. System verifies email exists
3. Reset code sent to email
4. User enters code and new password
5. New password is hashed and updated
6. User can now sign in with new password

## Testing the System

### Test Sign Up
1. Click "Sign Up"
2. Enter a unique username (e.g., "testuser123")
3. Enter a valid email
4. Create a password with uppercase, lowercase, and numbers
5. Confirm the password
6. Check your email for the verification code
7. Enter the code to complete signup

### Test Sign In
1. Click "Sign In"
2. Enter your username and password
3. Check the "Remember Me" box
4. Check your email for the verification code
5. Enter the code to sign in

### Test Forgot Password
1. Click "Forgot password?"
2. Enter your email
3. Check your email for the reset code
4. Enter the code and create a new password
5. Sign in with your new password

## Important Notes

⚠️ **Security Considerations**:
- The current password hashing uses SHA-256 which is good for demo purposes
- For production, implement server-side authentication with bcrypt or Argon2
- Consider adding rate limiting for failed login attempts
- Consider adding CAPTCHA for signup/signin

⚠️ **Email Codes**:
- InstantDB handles the email code delivery
- Codes are temporary and expire after a short period
- Users can request a new code by going back and resubmitting

⚠️ **Remember Me**:
- The token is stored in localStorage (browser storage)
- Clearing browser data will remove the token
- Signing out clears the token
- The token itself doesn't auto-sign in but helps identify returning users

## Future Enhancements

Potential improvements:
- [ ] Add 2FA (Two-Factor Authentication)
- [ ] Add OAuth (Google, GitHub, etc.)
- [ ] Add session timeout
- [ ] Add password strength meter
- [ ] Add profile picture upload during signup
- [ ] Add email change functionality
- [ ] Add username change functionality
- [ ] Add account deletion option
