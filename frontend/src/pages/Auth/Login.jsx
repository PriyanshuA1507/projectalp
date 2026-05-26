import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  login as loginThunk,
  selectAuthStatus,
  selectAuthError,
  selectInitializeStatus,
  selectIsAuthenticated
} from '../../store/slices/authSlice.js';
import { authService } from '../../services/auth.service.js';
import { ROLES } from '../../config/rolePermissions.js';
import LoginLayout, { LoginField } from '../../components/LoginLayout.jsx';

export default function Login() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authStatus = useSelector(selectAuthStatus);
  const initializeStatus = useSelector(selectInitializeStatus);
  const globalError = useSelector(selectAuthError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app';
  const roleOptions = [ROLES.IQAC_HEAD, ROLES.DEAN, ROLES.DEPARTMENT_HOD];
  const [roleOptionsState, setRoleOptionsState] = useState(roleOptions);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim().toLowerCase());

  React.useEffect(() => {
    if (roleOptionsState.length === 1 && !selectedRole) {
      setSelectedRole(roleOptionsState[0]);
    }
  }, [roleOptionsState, selectedRole]);

  if (initializeStatus === 'loading') {
    return <LoginLayout variant="iqac" loading />;
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!selectedRole) {
      setError('Please choose your role for this session.');
      return;
    }

    if (!roleOptions.includes(selectedRole)) {
      setError('Only IQAC Head, Dean, and Department HOD can sign in.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    const action = await dispatch(loginThunk({ email: normalizedEmail, password, role: selectedRole }));

    if (loginThunk.fulfilled.match(action)) {
      navigate(from, { replace: true });
    } else {
      setError(action.payload || 'Invalid credentials. Please try again.');
    }
  };

  const fetchAllowedRoles = async (emailValue) => {
    const normalized = emailValue?.trim().toLowerCase();
    if (!normalized || !emailRegex.test(normalized)) return;
    try {
      const resp = await authService.getAllowedRoles(normalized);
      const allowed = (resp?.allowedRoles ?? []).filter((role) => roleOptions.includes(role));
      if (allowed.length > 0) {
        setRoleOptionsState(allowed);
        if (!allowed.includes(selectedRole)) setSelectedRole(allowed[0]);
      } else {
        setRoleOptionsState([]);
        setSelectedRole('');
      }
    } catch {
      // keep defaults
    }
  };

  return (
    <LoginLayout variant="iqac">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <LoginField label="Email address" htmlFor="email" variant="iqac">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            onBlur={() => fetchAllowedRoles(email)}
            placeholder="name@college.edu"
          />
        </LoginField>

        <LoginField label="Sign in as" htmlFor="role" variant="iqac">
          <select
            id="role"
            name="role"
            value={selectedRole}
            disabled={!isEmailValid}
            title={!isEmailValid ? 'Enter a valid email to select role' : ''}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              if (error) setError('');
            }}
          >
            {roleOptionsState.length === 0 && <option value="">No eligible IQAC role</option>}
            {roleOptionsState.map((roleOption) => (
              <option key={roleOption} value={roleOption}>{roleOption}</option>
            ))}
          </select>
        </LoginField>

        <LoginField label="Password" htmlFor="password" variant="iqac">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter your password"
          />
        </LoginField>

        {(error || globalError) && (
          <p className="login-error">{error || globalError}</p>
        )}

        <button
          type="submit"
          disabled={authStatus === 'loading' || roleOptionsState.length === 0}
          className="login-submit bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:ring-indigo-500"
        >
          {roleOptionsState.length === 0
            ? 'No allowed role'
            : authStatus === 'loading'
              ? 'Signing in…'
              : 'Sign in to IQAC'}
        </button>
      </form>
    </LoginLayout>
  );
}
