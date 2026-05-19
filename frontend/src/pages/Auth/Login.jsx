import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
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

export default function Login() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authStatus = useSelector(selectAuthStatus);
  const initializeStatus = useSelector(selectInitializeStatus);
  const globalError = useSelector(selectAuthError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES.DEPARTMENT_HOD);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app';
  const roleOptions = [ROLES.IQAC_HEAD, ROLES.DEPARTMENT_HOD];

  if (initializeStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <span className="text-sm font-medium text-gray-600">Preparing sign-in…</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    // Client-side: validate presence and basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    const action = await dispatch(loginThunk({ email: normalizedEmail, password, role: selectedRole }));

    if (loginThunk.fulfilled.match(action)) {
      navigate(from, { replace: true });
    } else {
      const message = action.payload || 'Invalid credentials. Please try again.';
      setError(message);
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim().toLowerCase());


  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
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

      <div className="relative z-10 max-w-md w-full space-y-5 bg-white/90 shadow-xl rounded-2xl p-8">
        <div className="text-center space-y-2">
          <img src="/dtu_logo.jpeg" alt="DTU Logo" className="h-20 w-auto mx-auto object-contain mb-2" />
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500">Sign in with your institutional email and password.</p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError('');
                }}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="name@college.edu"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Sign in as
              </label>
              <select
                id="role"
                name="role"
                value={selectedRole}
                disabled={!isEmailValid}
                title={!isEmailValid ? 'Enter a valid email to select role' : ''}
                onChange={(event) => {
                  setSelectedRole(event.target.value);
                  if (error) setError('');
                }}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {roleOptions.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError('');
                }}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Password"
              />
            </div>
          </div>

          {(error || globalError) && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {error || globalError}
            </p>
          )}

          <button
            type="submit"
            disabled={authStatus === 'loading'}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {authStatus === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>

        </form>
      </div>
    </div>
  );
}
