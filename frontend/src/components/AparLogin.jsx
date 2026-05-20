import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { aparLogin, aparChangePassword } from '../store/slices/aparAuthSlice.js';
import { aparAuthService } from '../services/aparAuth.service.js';

export default function AparLogin({ loginData, setLoginData }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => Boolean(state.aparAuth.user));
  const aparRole = useSelector((state) => state.aparAuth.role);
  const mustChangePassword = useSelector((state) => Boolean(state.aparAuth.user?.mustChangePassword));
  const status = useSelector((state) => state.aparAuth.status);
  const authError = useSelector((state) => state.aparAuth.error);
  const [localError, setLocalError] = useState('');

  // support standalone usage: if parent doesn't provide loginData, manage locally
  const [localLoginData, setLocalLoginData] = useState({ id: '', password: '', role: 'Officer (Graded)' });
  const effectiveLoginData = loginData ?? localLoginData;
  const effectiveSetLoginData = setLoginData ?? setLocalLoginData;
  const normalizedIdLive = effectiveLoginData.id?.trim().toLowerCase();
  const isEmailValidLive = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdLive || '');
  const [aparRoleOptions, setAparRoleOptions] = useState(["Officer (Graded)", "Reporting Officer", "Reviewing Officer"]);

  const fetchAparAllowedRoles = async (emailValue) => {
    const normalized = emailValue?.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    try {
      const resp = await aparAuthService.getAllowedRoles(normalized);
      const allowed = resp?.allowedRoles ?? [];
      if (allowed && allowed.length > 0) {
        setAparRoleOptions(allowed);
      }
    } catch (e) {
      // ignore
    }
  };
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeStatus, setChangeStatus] = useState('idle');

  useEffect(() => {
    if (authError) setLocalError(authError);
  }, [authError]);

  useEffect(() => {
    if (isAuthenticated && !mustChangePassword) {
      const from = location.state?.from?.pathname;
      const roleToUse = aparRole || effectiveLoginData.role;
      if (roleToUse === 'Reporting Officer' || roleToUse === 'Reviewing Officer') {
        navigate('/apar/reporting', { replace: true });
        return;
      }
      navigate('/apar/dashboard', { replace: true });
    }
  }, [isAuthenticated, mustChangePassword, navigate, aparRole, effectiveLoginData.role, location.state]);

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

    dispatch(aparLogin({ email: normalizedEmail, password: effectiveLoginData.password, role: effectiveLoginData.role }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setLocalError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setLocalError('New password must be at least 12 characters and include letters and numbers');
      return;
    }

    setChangeStatus('loading');
    try {
      await dispatch(aparChangePassword({ oldPassword, newPassword })).unwrap();
      setChangeStatus('succeeded');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLocalError('Password updated. Please sign in with your new password.');
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : 'Unable to change password');
      setChangeStatus('failed');
    }
  };

  const showPasswordChange = isAuthenticated && mustChangePassword;

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Back to Home Button at Top Left */}
      <div className="absolute top-4 left-4 z-20">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white px-3 py-2 rounded-md shadow-sm border border-gray-200">
          <span className="mr-1">←</span> Back to Home
        </Link>
      </div>

      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/1703710559423.jpeg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/70 z-0" />

      <div className="relative z-10 mt-4 sm:mx-auto sm:w-full sm:max-w-md font-sans">
        <div className="text-center mb-4">
          <img src="/dtu_logo.jpeg" alt="DTU Logo" className="h-20 w-auto mx-auto object-contain mb-1" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">DTU APAR Login</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to access the Annual Performance Appraisal Report system</p>
        </div>
        <div className="bg-white/90 py-5 px-8 shadow-2xl sm:rounded-2xl sm:px-12 border border-gray-100">
          {showPasswordChange ? (
            <>

              <h2 className="text-lg font-bold text-indigo-700 mb-2">Change your password</h2>
              <p className="text-sm text-gray-600 mb-4">For security, set a new password before using APAR.</p>
              <form className="space-y-4" onSubmit={handlePasswordChange}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                  <input type="password" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                  <input type="password" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                  <input type="password" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                {localError && (<div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{localError}</div>)}
                <button type="submit" disabled={changeStatus === 'loading'} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70">
                  {changeStatus === 'loading' ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1"> Login ID </label>
              <div className="mt-1">
                <input id="id" name="id" type="text" required className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-200" value={effectiveLoginData.id} onChange={(e) => { effectiveSetLoginData({ ...effectiveLoginData, id: e.target.value }); if (localError) setLocalError(''); }} onBlur={() => fetchAparAllowedRoles(effectiveLoginData.id)} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1"> Password </label>
              <div className="mt-1">
                <input id="password" name="password" type="password" required className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-200" value={effectiveLoginData.password} onChange={(e) => { effectiveSetLoginData({ ...effectiveLoginData, password: e.target.value }); if (localError) setLocalError(''); }} />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1"> Role </label>
              <div className="mt-1">
                <select id="role" name="role" disabled={!isEmailValidLive} title={!isEmailValidLive ? 'Enter a valid email to select role' : ''} className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm transition-all duration-200" value={effectiveLoginData.role} onChange={(e) => { effectiveSetLoginData({ ...effectiveLoginData, role: e.target.value }); if (localError) setLocalError(''); }}>
                  {aparRoleOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {(localError) && (<div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">{localError}</div>)}

            <div>
              <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:-translate-y-0.5" disabled={status === 'loading'}>
                {status === 'loading' ? 'Signing in...' : 'Sign in to APAR'}
              </button>
            </div>

          </form>
          )}
        </div>
      </div>
    </div>
  );
}
