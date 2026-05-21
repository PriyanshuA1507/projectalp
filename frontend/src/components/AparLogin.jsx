import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { aparLogin } from '../store/slices/aparAuthSlice.js';
import { aparAuthService } from '../services/aparAuth.service.js';
import LoginLayout, { LoginField } from './LoginLayout.jsx';

export default function AparLogin({ loginData, setLoginData }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => Boolean(state.aparAuth.user));
  const aparRole = useSelector((state) => state.aparAuth.role);
  const status = useSelector((state) => state.aparAuth.status);
  const authError = useSelector((state) => state.aparAuth.error);
  const [localError, setLocalError] = useState('');

  const [localLoginData, setLocalLoginData] = useState({ id: '', password: '', role: 'Officer (Graded)' });
  const effectiveLoginData = loginData ?? localLoginData;
  const effectiveSetLoginData = setLoginData ?? setLocalLoginData;
  const normalizedIdLive = effectiveLoginData.id?.trim().toLowerCase();
  const isEmailValidLive = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdLive || '');
  const [aparRoleOptions, setAparRoleOptions] = useState(['Officer (Graded)', 'Reporting Officer', 'Reviewing Officer']);

  const fetchAparAllowedRoles = async (emailValue) => {
    const normalized = emailValue?.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    try {
      const resp = await aparAuthService.getAllowedRoles(normalized);
      const allowed = resp?.allowedRoles ?? [];
      if (allowed.length > 0) setAparRoleOptions(allowed);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (authError) setLocalError(authError);
  }, [authError]);

  useEffect(() => {
    if (isAuthenticated) {
      const roleToUse = aparRole || effectiveLoginData.role;
      if (roleToUse === 'Reporting Officer' || roleToUse === 'Reviewing Officer') {
        navigate('/apar/reporting', { replace: true });
        return;
      }
      navigate('/apar/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, aparRole, effectiveLoginData.role, location.state]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    const normalizedEmail = effectiveLoginData.id?.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!effectiveLoginData.password || !effectiveLoginData.role) {
      setLocalError('Password and role are required');
      return;
    }

    dispatch(aparLogin({
      email: normalizedEmail,
      password: effectiveLoginData.password,
      role: effectiveLoginData.role,
    }));
  };

  return (
    <LoginLayout
      variant="apar"
      subtitle="Annual Performance Appraisal — sign in with your institutional email."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <LoginField label="Email address" htmlFor="email" variant="apar">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@college.edu"
            value={effectiveLoginData.id}
            onChange={(e) => {
              effectiveSetLoginData({ ...effectiveLoginData, id: e.target.value });
              if (localError) setLocalError('');
            }}
            onBlur={() => fetchAparAllowedRoles(effectiveLoginData.id)}
          />
        </LoginField>

        <LoginField label="Password" htmlFor="password" variant="apar">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={effectiveLoginData.password}
            onChange={(e) => {
              effectiveSetLoginData({ ...effectiveLoginData, password: e.target.value });
              if (localError) setLocalError('');
            }}
          />
        </LoginField>

        <LoginField label="Sign in as" htmlFor="role" variant="apar">
          <select
            id="role"
            name="role"
            disabled={!isEmailValidLive}
            title={!isEmailValidLive ? 'Enter a valid email to select role' : ''}
            value={effectiveLoginData.role}
            onChange={(e) => {
              effectiveSetLoginData({ ...effectiveLoginData, role: e.target.value });
              if (localError) setLocalError('');
            }}
          >
            {aparRoleOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </LoginField>

        {localError && <p className="login-error">{localError}</p>}

        <button
          type="submit"
          disabled={status === 'loading' || !isEmailValidLive}
          className="login-submit bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:ring-emerald-500"
        >
          {status === 'loading' ? 'Signing in…' : 'Sign in to APAR'}
        </button>
      </form>
    </LoginLayout>
  );
}
