import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiArchive, FiCheckCircle, FiClock, FiLoader, FiSearch, FiUsers } from 'react-icons/fi';
import { aparFormReportingService } from '../../services/apar_form_reporting.service.js';
import { aparLogout } from '../../store/slices/aparAuthSlice.js';
import AparShellHeader from '../../components/AparShellHeader.jsx';

const normalizeAY = (value) => String(value || '').replace(/\s+/g, '').replace(/\//g, '-').trim();

const getCurrentAcademicYear = () => {
  const start = new Date().getFullYear();
  return `${start}-${String(start + 1).slice(-2)}`;
};

const getStatusColor = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'not filled') return 'bg-red-100 text-red-800';
  if (normalized === 'draft') return 'bg-gray-100 text-gray-800';
  if (normalized.includes('query')) return 'bg-yellow-100 text-yellow-800';
  if (normalized.includes('accepted') || normalized.includes('review')) return 'bg-green-100 text-green-800';
  if (normalized.includes('forwarded')) return 'bg-purple-100 text-purple-800';
  if (normalized.includes('submitted')) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

export default function DeanDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.aparAuth);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalFaculty: 0, submittedCount: 0, notSubmittedCount: 0 });
  const [currentAY, setCurrentAY] = useState(getCurrentAcademicYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState('');

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, index) => {
      const start = currentYear - index;
      return `${start}-${String(start + 1).slice(-2)}`;
    });
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await aparFormReportingService.getDeanStatus(normalizeAY(currentAY));
      setRows(Array.isArray(response?.rows) ? response.rows : []);
      setSummary({
        totalFaculty: response?.totalFaculty || 0,
        submittedCount: response?.submittedCount || 0,
        notSubmittedCount: response?.notSubmittedCount || 0
      });
    } catch (err) {
      console.error('failed to load dean apar status', err);
      setError(err?.response?.data?.message || 'Failed to load APAR status');
      setRows([]);
      setSummary({ totalFaculty: 0, submittedCount: 0, notSubmittedCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentAY]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [
      row.name,
      row.faculty_id,
      row.email,
      row.designation,
      row.status
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [rows, searchTerm]);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await dispatch(aparLogout());
      window.location.href = '/apar/login';
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="apar-page-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AparShellHeader
          title="Dean APAR Dashboard"
          subtitle="Track APAR submission status for faculty in your mapped department"
          backTo="/"
          actions={
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
            >
              {logoutLoading ? 'Logging out...' : 'Logout'}
            </button>
          }
        />

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <FiUsers className="text-emerald-600" />
              Faculty
            </div>
            <div className="mt-3 text-3xl font-bold text-gray-900">{summary.totalFaculty}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <FiCheckCircle className="text-green-600" />
              Submitted
            </div>
            <div className="mt-3 text-3xl font-bold text-gray-900">{summary.submittedCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <FiClock className="text-red-600" />
              Not Submitted
            </div>
            <div className="mt-3 text-3xl font-bold text-gray-900">{summary.notSubmittedCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <FiArchive className="text-indigo-600" />
              Academic Year
            </div>
            <select
              value={currentAY}
              onChange={(event) => setCurrentAY(event.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 max-w-md">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search faculty, ID, email, or status..."
              className="form-field-input-iqac w-full pl-9"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
              <FiLoader className="h-5 w-5 animate-spin text-emerald-600" />
              Loading APAR status...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {rows.length === 0 ? 'No faculty records found for your mapped department.' : 'No matching faculty records found.'}
            </div>
          ) : (
            <div className="data-table-wrapper">
              <div className="data-table-scroll">
                <table className="data-table data-table-apar text-left">
                  <thead>
                    <tr>
                      <th className="!text-left">Faculty</th>
                      <th className="!text-left">Designation</th>
                      <th className="!text-left">Submitted</th>
                      <th className="!text-left">APAR Status</th>
                      <th className="!text-left">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.faculty_id}>
                        <td className="!text-left">
                          <div className="font-semibold text-gray-900">{row.name}</div>
                          <div className="text-xs text-gray-500">{row.faculty_id}</div>
                          {row.email && <div className="text-xs text-gray-400">{row.email}</div>}
                        </td>
                        <td className="!text-left text-sm text-gray-600">{row.designation || '-'}</td>
                        <td className="!text-left">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.hasSubmitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {row.hasSubmitted ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="!text-left">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(row.status)}`}>
                            {row.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="!text-left text-sm text-gray-500">{formatDate(row.updatedAt || row.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {user?.departmentId && (
          <p className="mt-4 text-xs text-gray-500">Mapped department/faculty: {user.departmentId}</p>
        )}
      </div>
    </div>
  );
}
