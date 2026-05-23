import { ROLES } from '../config/rolePermissions.js';

const FACULTY_FIELD_KEYS = new Set(['faculty_id', 'supervisor_id', 'co_supervisor_id']);
const FACULTY_ARRAY_KEYS = new Set(['faculty_ids']);

const normalizeId = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

export const extractFacultyIdsFromRecord = (record) => {
  const ids = new Set();

  const collect = (value) => {
    const id = normalizeId(value);
    if (id) ids.add(id);
  };

  const walk = (value, key = '', ancestors = []) => {
    if (value === null || value === undefined) return;

    if (FACULTY_FIELD_KEYS.has(key)) {
      collect(value);
      return;
    }

    if (key === 'member_id' && ancestors.includes('committee_members')) {
      collect(value);
      return;
    }

    if (Array.isArray(value)) {
      if (FACULTY_ARRAY_KEYS.has(key)) {
        value.forEach((item) => {
          if (typeof item === 'string' || typeof item === 'number') {
            collect(item);
          } else if (item && typeof item === 'object') {
            collect(item.faculty_id);
          }
        });
      }
      value.forEach((item) => walk(item, key, ancestors));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([childKey, childValue]) => {
        walk(childValue, childKey, [...ancestors, key].filter(Boolean));
      });
    }
  };

  walk(record);
  return [...ids];
};

export const resourceHasFacultyAssociation = (resource) => {
  if (!resource || resource.id === 'faculty') return false;

  return (resource.columns || []).some((column) => {
    if (column.entityType === 'faculty') return true;
    return (column.subFields || []).some((field) => field.entityType === 'faculty');
  });
};

export const shouldUseFacultyApproval = ({ resource, role, editMode, payload }) => {
  if (editMode) return false;
  if (![ROLES.IQAC_HEAD, ROLES.DEPARTMENT_HOD].includes(role)) return false;
  if (!resourceHasFacultyAssociation(resource)) return false;
  return extractFacultyIdsFromRecord(payload).length > 0;
};
