import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

export default function FormPageHeader({ title, subtitle, backTo, backLabel = 'Back to list', badge }) {
  return (
    <div className="form-page-header mb-8">
      {backTo && (
        <Link to={backTo} className="form-back-link mb-4 inline-flex">
          <FiArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      {badge && (
        <span className="form-page-badge">{badge}</span>
      )}
      <h1 className="form-page-title">{title}</h1>
      {subtitle && <p className="form-page-subtitle">{subtitle}</p>}
    </div>
  );
}
