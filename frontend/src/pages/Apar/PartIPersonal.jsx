import React, { useState, useEffect } from 'react';
import { validateDateOfBirth, validateJoiningDate, getFieldError } from '../../utils/personal.validation.util.js';
import { FiAlertCircle } from 'react-icons/fi';

export default function PartIPersonal({ personal, onChange, readOnly, departments = [], validationErrors = [] }) {
  const [dateErrors, setDateErrors] = useState({});

  // Validate dates whenever they change
  useEffect(() => {
    const errors = {};

    if (personal.date_of_birth) {
      const dobValidation = validateDateOfBirth(personal.date_of_birth);
      if (!dobValidation.valid) {
        errors.date_of_birth = dobValidation.error;
      }
    }

    if (personal.joining_date) {
      const joiningValidation = validateJoiningDate(personal.joining_date, personal.date_of_birth);
      if (!joiningValidation.valid) {
        errors.joining_date = joiningValidation.error;
      }
    }

    setDateErrors(errors);
  }, [personal.date_of_birth, personal.joining_date]);

  const renderFieldError = (fieldName) => {
    const error = dateErrors[fieldName];
    if (!error) return null;
    return (
      <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
        <FiAlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">PART I - PERSONAL DATA</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">1) Enter your name <span className="text-red-500">*</span></label>
          <input required aria-required="true" type="text" name="name" value={personal.name} onChange={onChange} disabled={readOnly} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">2) Enter the name of the department <span className="text-red-500">*</span></label>
          <select
            required
            aria-required="true"
            name="department_id"
            value={personal.department_id}
            onChange={onChange}
            disabled={true}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 bg-gray-50 text-gray-500 transition-colors"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.department_id || dept.department_name} value={dept.department_id || dept.department_name}>
                {dept.department_name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Department is auto-filled from your profile and cannot be changed here.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">3) Select the designation <span className="text-red-500">*</span></label>
          <select required aria-required="true" name="designation" value={personal.designation} onChange={onChange} disabled={readOnly} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors">
            <option value="">Select Designation</option>
            <option value="Professor">Professor</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Assistant Professor">Assistant Professor</option>
            <option value="Lecturer">Lecturer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">4) Enter your date of birth <span className="text-red-500">*</span></label>
          <input 
            required 
            aria-required="true" 
            type="date" 
            name="date_of_birth" 
            value={personal.date_of_birth} 
            onChange={onChange} 
            disabled={readOnly} 
            className={`w-full border rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors ${
              dateErrors.date_of_birth ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
            }`}
          />
          {renderFieldError('date_of_birth')}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">5) Enter the Academic Qualifications <span className="text-red-500">*</span></label>
          <textarea required aria-required="true" name="qualification" value={personal.qualification} onChange={onChange} rows={4} disabled={readOnly} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-4 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
            
        </div>
        

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">6) Select the caste <span className="text-red-500">*</span></label>
          <select required aria-required="true" name="sc_st_status" value={personal.sc_st_status} onChange={onChange} disabled={readOnly} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors">
            <option value="">Select Caste</option>
            <option value="General">General</option>
            <option value="SC">Scheduled Caste(SC)</option>
            <option value="ST">Scheduled Tribe(ST)</option>
            <option value="OBC">OBC</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">7) Date of continuous employment <span className="text-red-500">*</span></label>
          <input 
            required 
            aria-required="true" 
            type="date" 
            name="joining_date" 
            value={personal.joining_date} 
            onChange={onChange} 
            disabled={readOnly} 
            className={`w-full border rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors ${
              dateErrors.joining_date ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
            }`}
          />
          {renderFieldError('joining_date')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">8) Present Grade <span className="text-red-500">*</span></label>
          <input required aria-required="true" type="text" name="grade" value={personal.grade || ''} onChange={onChange} disabled={readOnly} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">9) Period of absence from duty <span className="text-red-500">*</span></label>
          <input required aria-required="true" type="text" name="absence_period" value={personal.absence_period || ''} onChange={onChange} disabled={readOnly} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}
