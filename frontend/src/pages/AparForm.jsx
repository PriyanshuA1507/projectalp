import React, { useState, useCallback } from 'react';
import { FiArrowLeft, FiPrinter, FiCheck, FiAlertCircle, FiFileText, FiGrid } from 'react-icons/fi';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import ProfileDropdown from '../components/ProfileDropdown.jsx';
import { toast, Toaster } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAparAcademicYear } from '../store/slices/aparAuthSlice.js';
import { AparFormGradedService } from '../services/apar_form_graded.services.js'
import { aparFormReportingService } from '../services/apar_form_reporting.service.js'
import AparLogin from '../components/AparLogin.jsx';
import PartIPersonal from './Apar/PartIPersonal.jsx';
import PartII from './Apar/PartII.jsx';
import PartIII from './Apar/PartIII.jsx';
import PartIV from './Apar/PartIV.jsx';
import PartV from './Apar/PartV.jsx';
import PartVIRemarks from './Apar/PartVIRemarks.jsx';
import AparTimeline from '../components/AparTimeline.jsx';
import { mergeNewEntry } from '../hooks/useAparRealTimeSync';
import NotificationBell from '../components/NotificationBell.jsx';
import { DepartmentService } from '../services/department.services.js';
import { useSocket } from '../context/SocketContext.jsx'; // Import the hook

const toTitle = (value) => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());

const sectionLabels = {
    personal: 'Part I - Personal Data',
    teaching: 'Part II - Self Appraisal & Teaching',
    research: 'Part III - Research & Development',
    corporate: 'Part IV - Corporate Life',
    assessment: 'Part V - Numerical Assessment',
    remarks: 'Part VI - Remarks',
    timeline: 'Timeline'
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const flattenRecord = (record, prefix = '') => {
    if (!isPlainObject(record)) {
        return { [prefix || 'Value']: toDisplayValue(record) };
    }

    return Object.entries(record).reduce((acc, [key, value]) => {
        const label = prefix ? `${prefix} - ${toTitle(key)}` : toTitle(key);
        if (isPlainObject(value)) {
            return { ...acc, ...flattenRecord(value, label) };
        }
        acc[label] = toDisplayValue(value);
        return acc;
    }, {});
};

const toDisplayValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) {
        if (!value.length) return '';
        return value.map((item, index) => {
            if (isPlainObject(item)) {
                const details = Object.entries(flattenRecord(item))
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(', ');
                return `${index + 1}. ${details}`;
            }
            return `${index + 1}. ${String(item)}`;
        }).join('\n');
    }
    if (isPlainObject(value)) {
        return Object.entries(flattenRecord(value))
            .map(([key, val]) => `${key}: ${val}`)
            .join('; ');
    }
    return String(value);
};

const sanitizeSheetName = (name) => {
    const sanitized = String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
    return (sanitized || 'Sheet').slice(0, 31);
};

const sanitizeFileName = (name) => String(name || 'APAR_Form')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');

const getAcademicYearFromDates = (start, end) => {
    if (!start || !end) return '';
    const startYear = new Date(start).getFullYear();
    const endYear = new Date(end).getFullYear();
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return '';
    return `${startYear}-${endYear}`;
};

const getColumns = (rows) => {
    const columns = [];
    rows.forEach(row => {
        Object.keys(row || {}).forEach(key => {
            if (!columns.includes(key)) columns.push(key);
        });
    });
    if (columns.includes('S. No.')) {
        return ['S. No.', ...columns.filter(column => column !== 'S. No.')];
    }
    if (columns.includes('Field') && columns.includes('Value')) {
        return ['Field', 'Value', ...columns.filter(column => column !== 'Field' && column !== 'Value')];
    }
    return columns.length ? columns : ['Message'];
};

const createExportTables = (data, sectionName = 'APAR Form') => {
    if (Array.isArray(data)) {
        const rows = data.length
            ? data.map((item, index) => ({ 'S. No.': index + 1, ...flattenRecord(item) }))
            : [{ Message: 'No entries' }];
        return [{
            title: sectionName,
            columns: getColumns(rows),
            rows
        }];
    }

    if (!isPlainObject(data)) {
        const rows = [{ Field: sectionName, Value: toDisplayValue(data) }];
        return [{ title: sectionName, columns: ['Field', 'Value'], rows }];
    }

    const fieldRows = [];
    const childTables = [];

    Object.entries(data).forEach(([key, value]) => {
        const label = toTitle(key);
        const nestedName = sectionName === 'APAR Form' ? (sectionLabels[key] || label) : `${sectionName} - ${label}`;

        if (Array.isArray(value)) {
            childTables.push(...createExportTables(value, nestedName));
            return;
        }

        if (isPlainObject(value)) {
            const hasChildTables = Object.values(value).some(item => Array.isArray(item));
            if (hasChildTables) {
                childTables.push(...createExportTables(value, nestedName));
                return;
            }
            Object.entries(flattenRecord(value, label)).forEach(([field, val]) => {
                fieldRows.push({ Field: field, Value: val });
            });
            return;
        }

        fieldRows.push({ Field: label, Value: toDisplayValue(value) });
    });

    const tables = [];
    if (fieldRows.length) {
        tables.push({
            title: sectionLabels[sectionName] || sectionName,
            columns: ['Field', 'Value'],
            rows: fieldRows
        });
    }

    return [...tables, ...childTables];
};

const createAparExportTables = (formData) => {
    if (!isPlainObject(formData)) return createExportTables(formData);
    return Object.entries(formData).flatMap(([key, value]) => {
        const sectionName = sectionLabels[key] || toTitle(key);
        return createExportTables(value, sectionName);
    });
};

const createWordCell = (text, bold = false, width = 50) => new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: String(text ?? '').split('\n').map(line => new Paragraph({
        children: [new TextRun({ text: line || ' ', bold })]
    }))
});

const createWordTable = (columns, rows) => {
    const safeRows = rows.length ? rows : [{ Message: 'No entries' }];
    const safeColumns = columns.length ? columns : getColumns(safeRows);
    const width = Math.max(8, Math.floor(100 / safeColumns.length));
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: safeColumns.map(column => createWordCell(column, true, width))
            }),
            ...safeRows.map(row => new TableRow({
                children: safeColumns.map(column => createWordCell(row[column], false, width))
            }))
        ]
    });
};

const createExcelWorksheet = (table) => {
    const rows = table.rows.length ? table.rows : [{ Message: 'No entries' }];
    const columns = table.columns.length ? table.columns : getColumns(rows);
    const data = [
        [table.title],
        [],
        columns,
        ...rows.map(row => columns.map(column => row[column] ?? ''))
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(columns.length - 1, 0) } }];
    worksheet['!cols'] = columns.map((column, index) => {
        const maxLength = rows.reduce((max, row) => Math.max(max, String(row[column] ?? '').length), String(column).length);
        return { wch: Math.min(Math.max(index === 0 ? 12 : maxLength + 2, 14), 50) };
    });
    return worksheet;
};

const createSummaryTable = (formData, aparUser, ay) => ({
    title: 'APAR Summary',
    columns: ['Field', 'Value'],
    rows: [
        { Field: 'Faculty Name', Value: formData?.personal?.name || aparUser?.name || '' },
        { Field: 'Faculty ID', Value: aparUser?.teacherId || aparUser?.faculty_id || aparUser?.userId || aparUser?.user_id || aparUser?.id || '' },
        { Field: 'Designation', Value: formData?.personal?.designation || aparUser?.designation || '' },
        { Field: 'Department', Value: formData?.personal?.department_id || aparUser?.departmentId || aparUser?.department || '' },
        { Field: 'Academic Year', Value: ay || '' },
        { Field: 'Report Period', Value: [formData?.personal?.report_start_date, formData?.personal?.report_end_date].filter(Boolean).join(' to ') }
    ]
});

export default function AparForm() {
    const { socket } = useSocket(); // Get socket from context
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState(1);
    // auth state moved up to use in totalSteps logic
    const [loginData, setLoginData] = useState({ id: '', password: '', role: 'Officer (Graded)' });
    const aparUser = useSelector((state) => state.aparAuth.user);
    const aparRole = useSelector((state) => state.aparAuth.role);
    const reduxAy = useSelector(selectAparAcademicYear);
    const activeRole = aparRole || loginData.role;
    const getSteps = () => {
        if (activeRole === 'Reporting Officer') return 6;
        if (activeRole === 'Reviewing Officer') return 7;
        return 5;
    };

    const handleSaveMonthly = async () => {
        if (isReadOnlyMode()) return;
        try {
            const ay = reduxAy || loginData.academic_year || (location.state?.ay) || (() => {
                const start = formData.personal.report_start_date
                const end = formData.personal.report_end_date
                return getAcademicYearFromDates(start, end)
            })()

            const facultyId = (aparUser && (aparUser.teacherId || aparUser.faculty_id || aparUser.id));
            if (!ay || !facultyId || ay === 'undefined') {
                toast.error("Invalid Academic Year or Faculty ID");
                return;
            }

            const payload = { ay, faculty_id: facultyId, formData };
            await AparFormGradedService.saveToMonthly(payload);
            toast.success('Saved Section III to monthly collections');
        } catch (e) {
            console.error('Save monthly failed:', e);
            const msg = e.response?.data?.message || 'Failed to save to monthly collections';
            toast.error(msg);
        }
    };

    // Prefill faculty profile info on user change (ensures prefill even if AY is not yet set)
    React.useEffect(() => {
        if (!aparUser) return;
        (async () => {
            try {
                const infoRes = await AparFormGradedService.getFacultyInfo();
                const info = infoRes?.data || infoRes;
                if (info) {
                    setFormData(prev => ({
                        ...prev,
                        personal: {
                            ...prev.personal,
                            name: info.name || prev.personal.name,
                            designation: info.designation || prev.personal.designation,
                            email: info.email || prev.personal.email,
                            phone: info.phone || prev.personal.phone,
                            department_id: info.department_id || prev.personal.department_id,
                            qualification: info.qualification || prev.personal.qualification,
                            joining_date: info.joining_date ? info.joining_date.substring(0, 10) : prev.personal.joining_date,
                            date_of_birth: info.date_of_birth ? info.date_of_birth.substring(0, 10) : prev.personal.date_of_birth,
                            sc_st_status: info.sc_st_status || prev.personal.sc_st_status,
                            grade: info.grade || prev.personal.grade
                        }
                    }));
                    console.log('Prefilled faculty information from /apar/mongo/info');
                }
            } catch (err) {
                console.error('Failed to prefill faculty information', err);
            }
        })();
    }, [aparUser]);
    const [viewMode, setViewMode] = useState('form');
    // Track form status for completion screen
    const [formStatus, setFormStatus] = useState('Draft');
    const [departments, setDepartments] = useState([]);

    console.log("Hello DTU!!!")

    // Ensure departments are available early for Part I rendering
    React.useEffect(() => {
        (async () => {
            try {
                if (!departments || departments.length === 0) {
                    const deptRes = await DepartmentService.getDepartments();
                    const depts = deptRes?.data || deptRes || [];
                    setDepartments(depts);
                }
            } catch (deptErr) {
                console.error('Failed to fetch departments', deptErr);
            }
        })();
    }, []);

    React.useEffect(() => {
        if (aparUser) {
            const roleToUse = aparRole || loginData.role;
            if (roleToUse === 'Reporting Officer' || roleToUse === 'Reviewing Officer') {
                setViewMode('list');
            } else {
                setViewMode('form');
            }
        }
    }, [aparUser, aparRole]);

    // Ensure department_id is set from user info if not already set after departments are loaded
    React.useEffect(() => {
        if (
            departments.length > 0 &&
            aparUser &&
            (!formData.personal.department_id || !departments.some(d => d.department_id === formData.personal.department_id))
        ) {
            // Try to set department_id from user info if available
            const userDeptId = aparUser.department_id || aparUser.departmentId;
            if (userDeptId && departments.some(d => d.department_id === userDeptId)) {
                setFormData(prev => ({
                    ...prev,
                    personal: {
                        ...prev.personal,
                        department_id: userDeptId
                    }
                }));
            }
        }
    }, [departments, aparUser]);





    // Reporting/Reviewing officer: fetch pending submissions for dashboard
    React.useEffect(() => {
        if (!aparUser) return;
        const role = aparRole || loginData.role;
        if (!(role === 'Reporting Officer' || role === 'Reviewing Officer')) return;
        if (viewMode !== 'list') return;
        (async () => {
            try {
                let rows = []
                if ((loginData.role === 'Reporting Officer' || aparRole === 'Reporting Officer')) {
                    // assignments are fixed; fetch assigned officers via reporting service
                    const resp = await aparFormReportingService.getAssigned()
                    rows = resp?.rows || resp?.data || resp || []
                } else if ((loginData.role === 'Reviewing Officer' || aparRole === 'Reviewing Officer')) {
                    const resp = await aparFormReportingService.getPendingReviews()
                    rows = resp?.rows || resp?.data || resp || []
                } else {
                    const ay = loginData.academic_year || ''
                    if (!ay) return
                    const res = await AparFormGradedService.listAllForms(ay)
                    rows = res.data || res || []
                }
                const mapped = (rows || []).map(r => ({ id: `${r.faculty_id}-${r.ay}`, name: r.name || r.title || r.faculty_id, designation: r.designation, department: r.dept_name || r.department || r.dept, submissionDate: r.date || null, raw: r }))
                setSubmittedForms(mapped)
            } catch (err) {
                console.error('failed to fetch pending submissions', err)
            }
        })()
    }, [aparUser, aparRole, viewMode, loginData.academic_year, reduxAy])

    // WebSocket Real-Time Sync - automatically updates form when IQAC adds new entries
    const handleNewEntry = useCallback((data) => {
        // console.log('📬 Real-time update received:', data);
        setFormData(prev => ({
            ...prev,
            research: mergeNewEntry(prev.research, data)
        }));
        // Optional: Set a flag to indicate unsaved changes
        // setHasUnsavedChanges(true);
    }, []);

    // (Logic moved to main useEffect)
    const gradedId = aparUser?.teacherId || aparUser?.faculty_id || aparUser?.id;
    // const currentAy = reduxAy || loginData.academic_year;
    // useAparRealTimeSync call removed to avoid double-joining/conditional issues

    const totalSteps = getSteps();
    const [personalOpen, setPersonalOpen] = useState(true);

    // Submitted forms (for Reporting/Reviewing Officer dashboard)
    const [submittedForms, setSubmittedForms] = useState([]);
    const [certified, setCertified] = useState(false);
    const [selectedFacultyRaw, setSelectedFacultyRaw] = useState(null);

    // Popup State
    const [queryModalOpen, setQueryModalOpen] = useState(false);
    const [queryComment, setQueryComment] = useState('');
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { type: 'reporting' | 'reviewing', status: string }
    const [deleteModal, setDeleteModal] = useState({ open: false, section: null, field: null, index: null });

    // Deduplication ref for socket events
    const lastEventRef = React.useRef(0);

    const requestDelete = (section, field, index) => {
        setDeleteModal({ open: true, section, field, index });
    };

    const confirmDelete = () => {
        if (deleteModal.section && deleteModal.field && deleteModal.index !== null) {
            removeItem(deleteModal.section, deleteModal.field, deleteModal.index);
            toast.success("Item deleted");
        }
        setDeleteModal({ open: false, section: null, field: null, index: null });
    };

    const confirmQuerySubmission = async () => {
        if (!queryComment.trim()) {
            toast.error("Please enter a reason for the query");
            return;
        }

        if (pendingAction?.type === 'reporting') {
            await finalizeReportingSubmit(pendingAction.status, queryComment);
        } else if (pendingAction?.type === 'reviewing') {
            await finalizeReviewingSubmit(pendingAction.status, queryComment);
        }
        setQueryModalOpen(false);
        setQueryComment('');
        setPendingAction(null);
    };


    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Faculty (Personal Data)
        personal: {
            name: '',
            designation: '',
            date_of_birth: '',
            email: '',
            phone: '',
            department_id: '',
            qualification: '',
            joining_date: '',
            report_start_date: '',
            report_end_date: '',
            section_officer: '',
            sc_st_status: '',
            absence_period: '',
            title: '',
            academics: '',
            caste: '',
            grade: ''
        },
        // Step 2: Self Appraisal & Teaching
        teaching: {
            immovable_property_return: '',
            health_checkup_file: null,
            description_of_duties: '',
            courses_taught: [
                { name_of_course: '', total_lectures_scheduled: '', total_lectures_engaged: '', tutorials_scheduled: '', tutorials_engaged: '', labs_scheduled: '', labs_engaged: '', reasons_not_engaged: '', degree_type: 'UG' }
            ],
            // total hours/periods provided in timetable vs actually taken
            time_table: {
                provided: { odd_semester: '', even_semester: '' },
                actual: { odd_semester: '', even_semester: '' }
            },
            // workload per week for odd/even semesters
            workload_week: {
                odd_semester: { lectures: '', tutorials: '', practicals: '', seminars: '' },
                even_semester: { lectures: '', tutorials: '', practicals: '', seminars: '' }
            },
            teaching_methods: '',
            ict_tools: '',
            student_centric_methods: '',
            tutorials_tests: {
                ug_odd: { number_of_tests: '', assignment_checked: '' },
                ug_even: { number_of_tests: '', assignment_checked: '' },
                pg_odd: { number_of_tests: '', assignment_checked: '' },
                pg_even: { number_of_tests: '', assignment_checked: '' }
            },
            academic_planning: ''
        },
        // Step 3: Research
        research: {
            journals: [],
            conferences: [],
            events: [], // Keep for now or rename to fdp_participation
            projects: [],
            phd_guidance: [], // legacy array
            phd_supervision: [], // New IQAC structure
            books: [],
            fdps: [],
            consultancy: [],
            patents: [],
            awards: [],
            e_content: [],
            collaborations: [],
            faculty_visits: [],
            memberships: [],
            // Text fields
            summer_institutes: '',
            ug_pg_guidance: '',
            phd_guidance_text: 'See PhD Supervision table above', // Helper text or default
            research_guidance: '',
            industry_interaction: '',
            memberships_text: '',
            other_activities: ''
        },
        // Step 4: Corporate Life
        corporate: {
            curriculum_development: '',
            course_development_details: '',
            lab_development: '',
            cultural_activities: '',
            sports_community: '',
            admin_assignment: '',
            any_other: '',
            certify: false
        },
        // Step 6: Numerical Assessment (Reporting Officer Only)
        assessment: {
            section_a: { q1: '', q2: '', q3: '', q4: '', overall_grading: '' },
            section_b: { q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7a: '', q7b: '', q8: '', q9: '', q10: '', q11: '', overall_grading: '' },
            section_c: { q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', overall_grading: '' },
            general: { q1: '', q2: '', q3: '', q4: '', q5: '', q6: '' }
        },
        // Step 7: Remarks (Reviewing Officer Only)
        remarks: {
            length_of_service: '',
            satisfied_with_reporting: '',
            agree_with_assessment: 'Yes',
            disagreement_reason: '',
            general_remarks: '',
            specific_characteristics: ''
        },
        timeline: {}
    });

    // --- Refactored Fetch Logic to be Reusable ---
    const fetchFormData = useCallback(async (gradedId, ay) => {
        if (!gradedId) return;
        try {
            // 1. FIRST: Fetch Faculty Info from Faculty table (baseline data)
            let facultyInfo = null;
            try {
                const infoRes = await AparFormGradedService.getFacultyInfo();
                facultyInfo = infoRes.data || infoRes;
                // console.log('📋 Faculty Info fetched:', facultyInfo);
            } catch (infoErr) {
                console.error('Failed to fetch faculty info:', infoErr);
            }

            // 2. Pre-fill form with faculty data first
            if (facultyInfo) {
                setFormData(prev => ({
                    ...prev,
                    personal: {
                        ...prev.personal,
                        name: facultyInfo.name || prev.personal.name,
                        designation: facultyInfo.designation || prev.personal.designation,
                        email: facultyInfo.email || prev.personal.email,
                        phone: facultyInfo.phone || prev.personal.phone,
                        department_id: facultyInfo.department_id || prev.personal.department_id,
                        qualification: facultyInfo.qualification || prev.personal.qualification,
                        joining_date: facultyInfo.joining_date ? facultyInfo.joining_date.substring(0, 10) : prev.personal.joining_date,
                        date_of_birth: facultyInfo.date_of_birth ? facultyInfo.date_of_birth.substring(0, 10) : prev.personal.date_of_birth,
                        sc_st_status: facultyInfo.sc_st_status || prev.personal.sc_st_status,
                        grade: facultyInfo.grade || prev.personal.grade
                    }
                }));
                // console.log('✅ Form pre-filled with faculty data');
            }

            // 3. Fetch Departments
            try {
                const deptRes = await DepartmentService.getDepartments();
                const depts = deptRes.data || deptRes || [];
                setDepartments(depts);
            } catch (deptErr) {
                console.error('Failed to fetch departments', deptErr);
            }

            // 4. THEN: Check Mongo Form and overlay it (mongo data takes precedence over faculty data)
            const mongoRes = await AparFormGradedService.getForm(gradedId, ay)
            const mongoData = mongoRes.data || mongoRes
            if (mongoData && mongoData.faculty_id) {
                // Found in Mongo! Populate state.
                if (mongoData.status) {
                    setFormStatus(mongoData.status);
                }

                // Restore AY if missing
                if (!ay && mongoData.ay) {
                    ay = mongoData.ay
                    setLoginData(prev => ({ ...prev, academic_year: ay }))
                }

                setFormData(prev => ({
                    ...prev,
                    timeline: mongoData.timeline || {},
                    personal: {
                        ...prev.personal,
                        ...(mongoData.personal || {}),
                        date_of_birth: mongoData.personal?.date_of_birth ? mongoData.personal.date_of_birth.substring(0, 10) : prev.personal.date_of_birth,
                        joining_date: mongoData.personal?.joining_date ? mongoData.personal.joining_date.substring(0, 10) : prev.personal.joining_date,
                    },
                    teaching: { ...prev.teaching, ...(mongoData.teaching || {}) },
                    research: { ...prev.research, ...(mongoData.research || {}) }, // Crucial: Updates Research Tables
                    corporate: { ...prev.corporate, ...(mongoData.corporate || {}) },
                    assessment: { ...prev.assessment, ...(mongoData.assessment || {}) },
                    remarks: { ...prev.remarks, ...(mongoData.remarks || {}) },
                    reporting_query: mongoData.reporting_query,
                    reviewing_query: mongoData.reviewing_query
                }))
                console.log('✅ Form overlaid with MongoDB data');
            } else {
                // console.log('ℹ️ No existing APAR form found in MongoDB');
            }

        } catch (e) {
            console.error("Auto-refresh failed", e);
        }
    }, []); // Empty deps - function is stable

    // --- Socket.IO Room Joining and Listener ---
    React.useEffect(() => {
        if (!socket || !aparUser) return;

        const facultyId = aparUser.teacherId || aparUser.faculty_id || aparUser.id;

        // Resolve AY
        let rawAy = reduxAy || loginData.academic_year || (location.state?.ay);
        // Fallback AY derivation
        if (!rawAy && formData.personal?.report_start_date && formData.personal?.report_end_date) {
            rawAy = getAcademicYearFromDates(formData.personal.report_start_date, formData.personal.report_end_date);
        }

        // Helper to normalize AY for consistent room names and API calls
        const normalizeAy = (val) => {
            if (!val || typeof val !== 'string') return '';
            const cleanVal = val.trim();
            const parts = cleanVal.split(/[\s-]+/);
            if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
                return `${parts[0]}-${parts[1].substring(2)}`;
            }
            return cleanVal;
        };

        const ay = normalizeAy(rawAy);

        if (facultyId && ay) {
            socket.emit('join_apar_room', { faculty_id: facultyId, ay });
            // console.log(`[FRONTEND] Requesting join APAR Room: ${facultyId}, ${ay}`);

            // Initial Fetch on Load
            fetchFormData(facultyId, ay);
        }

        const handleDataUpdate = (data) => {
            // console.log('[FRONTEND] Received Update:', data);
            // toast.info("New IQAC data received. Refreshing form...", { autoClose: 3000 }); // Removed to avoid double popup with NotificationBell
            fetchFormData(facultyId, ay);
        };

        const handleNewEntrySocket = (data) => {
            const now = Date.now();
            if (now - lastEventRef.current < 1000) return;
            lastEventRef.current = now;

            // console.log('[FRONTEND] 📬 Real-time NEW ENTRY received:', data);

            // Small delay to ensure DB write propagates
            setTimeout(() => {
                const facultyId = aparUser?.teacherId || aparUser?.faculty_id || aparUser?.id;
                if (facultyId && ay) {
                    fetchFormData(facultyId, ay);
                }
            }, 500);
        };

        const handleUpdateEntrySocket = (data) => {
            const now = Date.now();
            if (now - lastEventRef.current < 1000) return;
            lastEventRef.current = now;

            console.log('[FRONTEND] 📬 Real-time UPDATE ENTRY received:', data);

            setTimeout(() => {
                const facultyId = aparUser?.teacherId || aparUser?.faculty_id || aparUser?.id;
                if (facultyId && ay) {
                    fetchFormData(facultyId, ay);
                }
            }, 500);
        };

        const handleDeleteEntrySocket = (data) => {
            const now = Date.now();
            if (now - lastEventRef.current < 1000) return;
            lastEventRef.current = now;

            // console.log('[FRONTEND] 📬 Real-time DELETE ENTRY received:', data);

            setTimeout(() => {
                const facultyId = aparUser?.teacherId || aparUser?.faculty_id || aparUser?.id;
                if (facultyId && ay) {
                    fetchFormData(facultyId, ay);
                }
            }, 500);
        };

        const handleBulkEntries = (data) => {
            // console.log('[FRONTEND] 📬 Bulk entries received:', data);
            toast.success(`${data.count} new entries synced`);
            if (data.entries && Array.isArray(data.entries)) {
                data.entries.forEach(e => handleNewEntry(e));
            }
        };

        const handleRoomJoined = (data) => {
            // console.log('[FRONTEND] ✅ Successfully joined room:', data);
            // toast.success(`Connected to Sync Stream: ${data.roomName}`);
        };

        socket.on('apar_data_updated', handleDataUpdate);
        socket.on('new_entry', handleNewEntrySocket);
        socket.on('update_entry', handleUpdateEntrySocket);
        socket.on('delete_entry', handleDeleteEntrySocket);
        socket.on('bulk_entries', handleBulkEntries);
        socket.on('room_joined', handleRoomJoined);

        socket.on('connect_error', (err) => {
            console.error('[FRONTEND] Socket connection error:', err);
        });

        return () => {
            // Cleanup listener
            socket.off('apar_data_updated', handleDataUpdate);
            socket.off('new_entry', handleNewEntrySocket);
            socket.off('update_entry', handleUpdateEntrySocket);
            socket.off('delete_entry', handleDeleteEntrySocket);
            socket.off('bulk_entries', handleBulkEntries);
            socket.off('room_joined', handleRoomJoined);
            if (facultyId && ay) socket.emit('leave_apar_room', { faculty_id: facultyId, ay });
        };
    }, [socket, aparUser, reduxAy, loginData.academic_year, location.state?.ay, formData.personal.report_start_date, formData.personal.report_end_date, fetchFormData]);


    // authentication from redux (APAR)

    const handlePrint = () => window.print();

    const getExportFileBaseName = () => {
        const facultyId = aparUser?.teacherId || aparUser?.faculty_id || aparUser?.userId || aparUser?.user_id || aparUser?.id || 'faculty';
        const ay = reduxAy || loginData.academic_year || location.state?.ay || formData?.personal?.academic_year || 'apar';
        const name = formData?.personal?.name || aparUser?.name || 'APAR_Form';
        return sanitizeFileName(`${name}_${facultyId}_${ay}`);
    };

    const handleExportExcel = () => {
        try {
            const workbook = XLSX.utils.book_new();
            const usedNames = new Map();
            const ay = reduxAy || loginData.academic_year || location.state?.ay || getAcademicYearFromDates(formData.personal?.report_start_date, formData.personal?.report_end_date);
            const tables = [
                createSummaryTable(formData, aparUser, ay),
                ...createAparExportTables(formData)
            ];

            tables.forEach((table) => {
                const baseName = sanitizeSheetName(table.title);
                const count = usedNames.get(baseName) || 0;
                usedNames.set(baseName, count + 1);
                const suffix = count ? `_${count + 1}` : '';
                const sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
                const worksheet = createExcelWorksheet(table);
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            });

            XLSX.writeFile(workbook, `${getExportFileBaseName()}.xlsx`);
            toast.success('Excel file downloaded');
        } catch (error) {
            console.error('Excel export failed', error);
            toast.error('Excel export failed');
        }
    };

    const handleExportWord = async () => {
        try {
            const ay = reduxAy || loginData.academic_year || location.state?.ay || getAcademicYearFromDates(formData.personal?.report_start_date, formData.personal?.report_end_date);
            const tables = [
                createSummaryTable(formData, aparUser, ay),
                ...createAparExportTables(formData)
            ];
            const children = [
                new Paragraph({
                    text: 'Annual Performance Assessment Report Form',
                    heading: HeadingLevel.TITLE
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Faculty: ${formData?.personal?.name || aparUser?.name || ''}` }),
                        new TextRun({ text: ` | Academic Year: ${ay || ''}` })
                    ]
                })
            ];

            tables.forEach((table) => {
                children.push(
                    new Paragraph({ text: table.title, heading: HeadingLevel.HEADING_1 }),
                    createWordTable(table.columns, table.rows),
                    new Paragraph({ text: '' })
                );
            });

            const document = new Document({ sections: [{ children }] });
            const blob = await Packer.toBlob(document);
            saveAs(blob, `${getExportFileBaseName()}.docx`);
            toast.success('Word file downloaded');
        } catch (error) {
            console.error('Word export failed', error);
            toast.error('Word export failed');
        }
    };

    const isReadOnlyMode = () => {
        const role = aparRole || loginData.role;
        // Reporting/Reviewing are always read-only for Parts I-IV
        if (role === 'Reporting Officer' || role === 'Reviewing Officer') return true;

        // Officer (Graded) is read-only if status is Submitted or not in editable statuses
        if (formStatus === 'Submitted') return true;
        const isEditable = !formStatus || ['Draft', 'Query Raised', 'not_filled', 'Query Raised by Reporting officer', 'Query Raised by Reviewing officer'].includes(formStatus);
        return !isEditable;
    };
    // Always fetch form data when component mounts or when ay changes (from dashboard navigation)
    React.useEffect(() => {
        if (!gradedId) return;
        let ay = reduxAy || loginData.academic_year || (location.state?.ay);
        if (!ay && formData.personal?.report_start_date && formData.personal?.report_end_date) {
            ay = getAcademicYearFromDates(formData.personal.report_start_date, formData.personal.report_end_date);
        }
        if (gradedId && ay) {
            fetchFormData(gradedId, ay);
        }
    }, [gradedId, reduxAy, loginData.academic_year, location.state]);

    const handleSaveDraft = async (silent = false) => {
        // Only save if in editable mode
        if (isReadOnlyMode()) return true;

        setIsSavingDraft(true);
        try {
            const ay = reduxAy || loginData.academic_year || (location.state?.ay) || (() => {
                const start = formData.personal.report_start_date
                const end = formData.personal.report_end_date
                return getAcademicYearFromDates(start, end)
            })()

            const facultyId = (aparUser && (aparUser.teacherId || aparUser.faculty_id || aparUser.id));

            if (!ay || !facultyId || ay === 'undefined') {
                if (!silent) toast.error("Invalid Academic Year or Faculty ID. Please verify your selection.");
                console.error("[APAR SAVE] Validation Failed:", { ay, facultyId });
                return false;
            }

            const payload = {
                ay: ay,
                faculty_id: facultyId,
                formData: formData
            };

            // console.log('[APAR SAVE] Sending Draft Payload:', payload);

            await AparFormGradedService.saveDraft(payload);
            if (!silent) toast.success('Progress saved and synced to profile');
            return true;
        } catch (e) {
            console.error('Save draft failed:', e);
            if (!silent) {
                const msg = e.response?.data?.message || 'Failed to auto-save progress';
                toast.error(msg);
            }
            return false;
        } finally {
            setIsSavingDraft(false);
        }
    };



    const nextStep = async () => {
        // Validate current step before moving forward
        const validateCurrentStep = () => {
            try {
                const container = typeof document !== 'undefined' ? document.getElementById(`apar-step-${currentStep}`) : null;
                if (!container) return true;

                const nodes = Array.from(container.querySelectorAll('[required], [aria-required="true"]')).filter(el => !el.disabled);
                const missing = [];

                for (const el of nodes) {
                    let valid = true;
                    const tag = (el.tagName || '').toLowerCase();
                    const type = el.type || '';

                    if (type === 'checkbox') {
                        valid = el.checked;
                    } else if (tag === 'select') {
                        valid = el.value !== '' && el.value !== null && el.value !== undefined;
                    } else {
                        valid = el.value !== null && el.value !== undefined && String(el.value).trim() !== '';
                    }

                    if (!valid) {
                        let labelText = '';
                        const parent = el.closest('div') || el.parentElement;
                        if (parent) {
                            const label = parent.querySelector('label');
                            if (label) labelText = label.textContent.replace('*', '').trim();
                        }
                        if (!labelText) labelText = el.name || el.placeholder || 'Required field';
                        missing.push(labelText);
                    }
                }

                if (missing.length > 0) {
                    const firstInvalid = nodes.find(el => {
                        const tag = (el.tagName || '').toLowerCase();
                        const type = el.type || '';
                        if (type === 'checkbox') return !el.checked;
                        if (tag === 'select') return !(el.value !== '' && el.value !== null && el.value !== undefined);
                        return !(el.value !== null && el.value !== undefined && String(el.value).trim() !== '');
                    });
                    if (firstInvalid && typeof firstInvalid.reportValidity === 'function') firstInvalid.reportValidity();
                    else if (firstInvalid && firstInvalid.focus) firstInvalid.focus();

                    toast.error(`Please fill required fields: ${[...new Set(missing)].slice(0, 5).join(', ')}`);
                    return false;
                }

                return true;
            } catch (e) {
                console.error('Validation error:', e);
                return true;
            }
        };

        if (currentStep < totalSteps) {
            if (!validateCurrentStep()) return;
            // Auto-save on next
            const saved = await handleSaveDraft(true);
            if (saved) toast.success('Draft saved');
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        }
    };

    const validateFormData = () => {
        const errors = [];

        // Validate Personal Data (Part I)
        const personal = formData.personal || {};
        if (!personal.name || !personal.name.trim()) errors.push('Name is required');
        if (!personal.department_id || !personal.department_id.trim()) errors.push('Department is required');
        if (!personal.designation || !personal.designation.trim()) errors.push('Designation is required');
        if (!personal.date_of_birth) errors.push('Date of birth is required');
        if (!personal.qualification || !personal.qualification.trim()) errors.push('Qualification is required');
        if (!personal.sc_st_status || !personal.sc_st_status.trim()) errors.push('Caste category is required');
        if (!personal.joining_date) errors.push('Joining date is required');
        if (!personal.grade || !personal.grade.trim()) errors.push('Grade is required');
        if (!personal.absence_period || !personal.absence_period.trim()) errors.push('Absence period is required');

        // Validate email format if provided
        if (personal.email && personal.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(personal.email.trim())) {
                errors.push('Invalid email format');
            }
        }

        // Validate Assessment Scores (Part V) - must be between 1-10
        const assessment = formData.assessment || {};
        const validateScore = (value, fieldName) => {
            if (value && value.trim()) {
                const num = parseInt(value);
                if (isNaN(num) || num < 1 || num > 10) {
                    errors.push(`${fieldName} must be between 1 and 10`);
                }
            }
        };

        if (assessment.section_a) {
            validateScore(assessment.section_a.q1, 'Section A Q1');
            validateScore(assessment.section_a.q2, 'Section A Q2');
            validateScore(assessment.section_a.q3, 'Section A Q3');
            validateScore(assessment.section_a.q4, 'Section A Q4');
            validateScore(assessment.section_a.overall_grading, 'Section A Overall Grading');
        }

        if (assessment.section_b) {
            validateScore(assessment.section_b.q1, 'Section B Q1');
            validateScore(assessment.section_b.q2, 'Section B Q2');
            validateScore(assessment.section_b.q3, 'Section B Q3');
            validateScore(assessment.section_b.q4, 'Section B Q4');
            validateScore(assessment.section_b.q5, 'Section B Q5');
            validateScore(assessment.section_b.q6, 'Section B Q6');
            validateScore(assessment.section_b.q7a, 'Section B Q7a');
            validateScore(assessment.section_b.q7b, 'Section B Q7b');
            validateScore(assessment.section_b.q8, 'Section B Q8');
            validateScore(assessment.section_b.q9, 'Section B Q9');
            validateScore(assessment.section_b.q10, 'Section B Q10');
            validateScore(assessment.section_b.overall_grading, 'Section B Overall Grading');
        }

        if (assessment.section_c) {
            validateScore(assessment.section_c.q1, 'Section C Q1');
            validateScore(assessment.section_c.q2, 'Section C Q2');
            validateScore(assessment.section_c.q3, 'Section C Q3');
            validateScore(assessment.section_c.q4, 'Section C Q4');
            validateScore(assessment.section_c.q5, 'Section C Q5');
            validateScore(assessment.section_c.q6, 'Section C Q6');
            validateScore(assessment.section_c.overall_grading, 'Section C Overall Grading');
        }

        if (assessment.general) {
            validateScore(assessment.general.q6, 'Overall Numerical Grading');
        }

        // Validate Remarks (Part VI) - if disagree, reason is required
        const remarks = formData.remarks || {};
        if (remarks.agree_with_assessment === 'No' && (!remarks.disagreement_reason || !remarks.disagreement_reason.trim())) {
            errors.push('Please provide reason for disagreement with assessment');
        }

        return errors;
    };

    const handleSubmit = async () => {
        try {
            const ay = reduxAy || loginData.academic_year || (location.state?.ay) || (() => {
                const start = formData.personal.report_start_date
                const end = formData.personal.report_end_date
                return getAcademicYearFromDates(start, end)
            })()

            const facultyId = (aparUser && (aparUser.teacherId || aparUser.faculty_id || aparUser.id));
            if (!ay || !facultyId || ay === 'undefined') {
                toast.error("Invalid Academic Year or Faculty ID");
                return;
            }

            // Validate form data before submission
            const validationErrors = validateFormData();
            if (validationErrors.length > 0) {
                toast.error(`Validation errors: ${validationErrors.slice(0, 5).join(', ')}${validationErrors.length > 5 ? '...' : ''}`);
                return;
            }

            // Enforce final certification for editable submissions
            if (!isReadOnlyMode() && !certified) {
                toast.error('Please certify the form before submitting.');
                return;
            }

            const payload = {
                ay: ay,
                faculty_id: facultyId,
                formData: formData
            };

            await AparFormGradedService.submit(payload);
            toast.success('APAR Form Submitted Successfully!');
            navigate('/apar/dashboard');
        } catch (e) {
            console.error(e);
            const msg = e.response?.data?.message || 'Failed to submit form';
            toast.error(msg);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePersonalChange = (e) => {
        setFormData({ ...formData, personal: { ...formData.personal, [e.target.name]: e.target.value } });
    };

    // Generic handler for array fields
    const addItem = (section, field, initialItem) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: [...prev[section][field], initialItem]
            }
        }));
    };

    const removeItem = (section, field, index) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: prev[section][field].filter((_, i) => i !== index)
            }
        }));
    };

    const updateArrayField = (section, field, index, key, value) => {
        const updatedArray = [...formData[section][field]];
        updatedArray[index] = { ...updatedArray[index], [key]: value };
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: updatedArray
            }
        }));
    };

    const updateArrayItem = (section, field, index, newItem) => {
        const updatedArray = [...formData[section][field]];
        updatedArray[index] = newItem;
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: updatedArray
            }
        }));
    };

    const updateAssessment = (section, key, value) => {
        setFormData(prev => {
            const next = {
                ...prev,
                assessment: {
                    ...prev.assessment,
                    [section]: {
                        ...prev.assessment[section],
                        [key]: value
                    }
                }
            };

            // Auto-calculate per-section overall grading as average of numeric questions
            const numericKeys = {
                section_a: ['q1', 'q2', 'q3', 'q4'],
                section_b: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7a', 'q7b', 'q8', 'q9', 'q10'],
                section_c: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']
            };

            if (section in numericKeys) {
                const vals = numericKeys[section]
                    .map((k) => parseInt((next.assessment[section]?.[k] ?? '').toString(), 10))
                    .filter((n) => Number.isFinite(n));
                if (vals.length > 0) {
                    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                    next.assessment[section].overall_grading = String(avg);
                } else {
                    next.assessment[section].overall_grading = '';
                }
            }

            // Auto-calculate overall numerical grading (Weighted A+B+C) into general.q6
            const a = parseInt((next.assessment.section_a?.overall_grading ?? '').toString(), 10);
            const b = parseInt((next.assessment.section_b?.overall_grading ?? '').toString(), 10);
            const c = parseInt((next.assessment.section_c?.overall_grading ?? '').toString(), 10);

            const parts = [];
            if (Number.isFinite(a)) parts.push({ val: a, w: 0.4 });
            if (Number.isFinite(b)) parts.push({ val: b, w: 0.3 });
            if (Number.isFinite(c)) parts.push({ val: c, w: 0.3 });

            if (parts.length > 0) {
                const wsum = parts.reduce((s, p) => s + p.w, 0);
                const weighted = parts.reduce((s, p) => s + p.val * p.w, 0) / (wsum || 1);
                next.assessment.general = {
                    ...next.assessment.general,
                    q6: String(Math.round(weighted))
                };
            }

            // Auto-select Section B q11 (textual grade) based on Section B overall_grading
            const bOverall = parseInt((next.assessment.section_b?.overall_grading ?? '').toString(), 10);
            if (Number.isFinite(bOverall)) {
                let gradeText = '';
                if (bOverall >= 9) gradeText = 'Outstanding';
                else if (bOverall >= 8) gradeText = 'Very Good';
                else if (bOverall >= 6) gradeText = 'Good';
                else if (bOverall >= 4) gradeText = 'Average';
                else gradeText = 'Below Average';
                next.assessment.section_b = {
                    ...next.assessment.section_b,
                    q11: gradeText
                };
            } else {
                next.assessment.section_b = {
                    ...next.assessment.section_b,
                    q11: ''
                };
            }

            return next;
        });
    };

    // Generic updater for simple fields inside a named section (e.g., teaching.description_of_duties)
    const updateField = (section, key, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const updateRemarks = (key, value) => {
        setFormData(prev => ({
            ...prev,
            remarks: {
                ...prev.remarks,
                [key]: value
            }
        }));
    };

    const finalizeReportingSubmit = async (status, comment) => {
        try {
            const payload = {
                faculty_id: selectedFacultyRaw?.faculty_id || selectedFacultyRaw?.id?.split('-')[0],
                ay: selectedFacultyRaw?.ay || selectedFacultyRaw?.id?.split('-').slice(1).join('-'),
                assessment: formData.assessment,
                status: status,
                query_comment: comment
            };
            await aparFormReportingService.submit(payload);
            if (status === 'Query Raised' || status === 'Query Raised by Reporting officer') {
                toast.success('Form returned to faculty with query');
            } else if (status === 'Forwarded by Reporting officer') {
                toast.success('Form verified and forwarded successfully');
            } else {
                toast.success('Form status updated');
            }
            setFormStatus(status);
            navigate('/apar/reporting');
        } catch (err) {
            console.error(err);
            toast.error('Submission failed');
        }
    };

    const handleReportingSubmit = async (status) => {
        if (status === 'Query Raised' || status === 'Query Raised by Reporting officer') {
            setPendingAction({ type: 'reporting', status: 'Query Raised by Reporting officer' });
            setQueryModalOpen(true);
        } else {
            await finalizeReportingSubmit(status);
        }
    };

    const finalizeReviewingSubmit = async (status, comment) => {
        try {
            const payload = {
                faculty_id: selectedFacultyRaw?.faculty_id || selectedFacultyRaw?.id,
                ay: selectedFacultyRaw?.ay || selectedFacultyRaw?.id?.split('-').slice(1).join('-'),
                remarks: formData.remarks,
                status: status,
                query_comment: comment
            };
            await aparFormReportingService.submitReview(payload);
            if (status.includes('Query')) {
                toast.success('Query raised successfully');
            } else {
                toast.success('Review verified and forwarded successfully');
            }
            setFormStatus(status);
            navigate('/apar/reporting');
        } catch (err) {
            console.error(err);
            toast.error('Review submission failed');
        }
    };

    const handleReviewingSubmit = async (statusOverride = 'Accepted by Reviewing officer') => {
        if (statusOverride.includes('Query')) {
            setPendingAction({ type: 'reviewing', status: statusOverride });
            setQueryModalOpen(true);
        } else {
            finalizeReviewingSubmit(statusOverride);
        }
    };

    const handleLoadForm = async (faculty) => {
        try {
            // Fetch full form data
            // Prioritize raw data as string splitting is fragile
            const facultyId = faculty.raw?.faculty_id || faculty.faculty_id || faculty.id?.split('-')[0];
            const ay = faculty.raw?.ay || faculty.ay || faculty.id?.split('-').slice(1).join('-');

            if (!facultyId || !ay) {
                toast.error("Missing ID or AY");
                return;
            }

            const res = await aparFormReportingService.getForm(facultyId, ay);
            // API response structure: { statusCode, data, message, success }
            // So res is the JSON body. res.data is the form object.
            const mongoData = res.data || res;

            if (!mongoData) {
                toast.error("Form data not found");
                return;
            }

            setFormData(prev => ({
                ...prev,
                personal: {
                    ...prev.personal,
                    ...(mongoData.personal || {}),
                    date_of_birth: mongoData.personal?.date_of_birth ? mongoData.personal.date_of_birth.substring(0, 10) : prev.personal.date_of_birth,
                    joining_date: mongoData.personal?.joining_date ? mongoData.personal.joining_date.substring(0, 10) : prev.personal.joining_date,
                },
                teaching: { ...prev.teaching, ...(mongoData.teaching || {}) },
                research: { ...prev.research, ...(mongoData.research || {}) },
                corporate: { ...prev.corporate, ...(mongoData.corporate || {}) },
                assessment: { ...prev.assessment, ...(mongoData.assessment || {}) },
                remarks: { ...prev.remarks, ...(mongoData.remarks || {}) }
            }));

            if (mongoData.status) {
                setFormStatus(mongoData.status);
            }

            setViewMode('form');
            setCurrentStep(1);
            setSelectedFacultyRaw(faculty.raw || faculty);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load form data");
        }
    };

    // If navigated here with a selected faculty (from reporting dashboard), load it
    // const location = useLocation();
    React.useEffect(() => {
        const sf = location.state?.selectedFaculty;
        if (sf) {
            handleLoadForm(sf);
        }
    }, [location.state]);

    const getStepTitle = (step) => {
        switch (step) {
            case 1: return "Personal Data";
            case 2: return "Self Appraisal";
            case 3: return "Research & Development";
            case 4: return "Corporate Life";
            case 5: return (activeRole === 'Reporting Officer' || activeRole === 'Reviewing Officer') ? "Assessment (Part V)" : "Review & Submit";
            case 6: return activeRole === 'Reviewing Officer' ? "Remarks (Part VII)" : "Review & Submit";
            case 7: return "Review & Submit";
            default: return "";
        }
    };

    if (!aparUser) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="text-center">
                        <img src="/dtu_logo.jpeg" alt="DTU Logo" className="h-28 w-auto mx-auto object-contain mb-4" />
                        <h2 className="text-3xl font-extrabold text-gray-900">DTU APAR System</h2>
                        <p className="mt-2 text-sm text-gray-600">Please sign in to access the form</p>
                    </div>
                </div>

                <AparLogin loginData={loginData} setLoginData={setLoginData} />

                <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                            <button onClick={() => navigate('/')} className="text-indigo-600 hover:text-indigo-500">Back to Home</button>
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // console.log('DEBUG: Timeline Check', { viewMode, activeRole, formStatus, timeline: formData.timeline });

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
            <Toaster richColors position="top-right" />
            {/* Navigation & Actions - Hidden in Print */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex justify-between items-center print:hidden mb-4">
                    <button
                        onClick={() => {
                            if (activeRole === 'Officer (Graded)') {
                                navigate('/apar/dashboard');
                            } else {
                                navigate('/apar/reporting');
                            }
                        }}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <FiArrowLeft className="mr-2" /> Back to Dashboard
                    </button>
                    {(loginData.role === 'Reporting Officer' || loginData.role === 'Reviewing Officer') && viewMode === 'form' && (
                        <button
                            onClick={() => setViewMode('list')}
                            className="flex items-center text-indigo-600 hover:text-indigo-900 ml-4 font-semibold"
                        >
                            Dashboard
                        </button>
                    )}
                    <div className="flex items-center space-x-3">
                        <NotificationBell />
                        <button
                            onClick={handlePrint}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            <FiPrinter className="mr-2" /> Print Form
                        </button>
                        <button
                            type="button"
                            onClick={handleExportWord}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <FiFileText className="mr-2" /> Word
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                        >
                            <FiGrid className="mr-2" /> Excel
                        </button>
                        <ProfileDropdown />
                    </div>
                </div>


            </div>

            <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden p-8 print:shadow-none print:p-0">

                {viewMode === 'list' && (loginData.role === 'Reporting Officer' || loginData.role === 'Reviewing Officer') ? (
                    <>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                {loginData.role === 'Reporting Officer' ? "Pending Assessments" : "Pending Reviews"}
                            </h2>
                            <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted On</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {submittedForms.map((form) => (
                                            <tr key={form.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{form.designation}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{form.department}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{form.submissionDate}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button onClick={() => handleLoadForm(form)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200">Review Form</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Header - Always Visible */}
                        {/* Header - Always Visible */}
                        <div className="border-b-2 border-gray-200 pb-6 mb-8">
                            <div className="flex items-center justify-center gap-6 mb-6">
                                <img src="/dtu_logo.jpeg" alt="DTU Logo" className="h-28 w-auto object-contain" />
                                <div className="text-center">
                                    <h1 className="text-2xl font-bold text-gray-900 uppercase">Delhi Technological University</h1>
                                    <p className="text-sm text-gray-600 mt-1">Estd. By Govt. of NCT of Delhi vide Act 6 of 2009</p>
                                    <p className="text-sm text-gray-600">(Formerly: Delhi College of Engineering)</p>
                                    <p className="text-sm text-gray-600">Shahbad Daulatpur, Bawana Road, Delhi -110042</p>
                                </div>
                            </div>

                            <div className="text-center">
                                <h2 className="text-xl font-bold text-gray-800 uppercase">Annual Performance Assessment Report Form</h2>
                                <p className="text-md font-medium text-gray-700 mt-2">For Professor/ Associate Professor/ Assistant Professor</p>
                            </div>
                        </div>

                        {/* Progress Bar - Hidden in Print */}
                        <div className="mb-8 print:hidden">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                                    Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
                                </span>
                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase text-indigo-600">
                                    {Math.round(((currentStep - 1) / totalSteps) * 100)}% Completed
                                </span>
                            </div>
                            <div className="flex w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="flex flex-col justify-center overflow-hidden bg-indigo-500 text-xs text-white text-center whitespace-nowrap transition-all duration-500 ease-out"
                                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                                ></div>
                            </div>
                            <div className="hidden sm:flex justify-between mt-4">
                                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                                    <div key={step} className={`flex flex-col items-center ${step <= currentStep ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step <= currentStep ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                                            {step < currentStep ? <FiCheck /> : step}
                                        </div>
                                        <div className="text-xs mt-1 text-center font-medium">{getStepTitle(step)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>

                            {/* Step 1: Personal Data - Mapped to 'faculty' table */}
                            <div id="apar-step-1" className={currentStep === 1 ? 'block' : 'hidden print:block'}>
                                <div className="shadow-lg">
                                    {/* Import Part I component to render the personal data fields */}
                                    <div>
                                        <button onClick={() => setPersonalOpen(p => !p)} className="text-sm text-indigo-600 mb-3">{personalOpen ? 'Hide' : 'Show'} Personal Data</button>
                                        {personalOpen && <PartIPersonal personal={formData.personal} onChange={handlePersonalChange} readOnly={isReadOnlyMode()} departments={departments} />}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Self Appraisal */}
                            <div id="apar-step-2" className={currentStep === 2 ? 'block' : 'hidden print:block'}>
                                <PartII formData={formData} addItem={addItem} removeItem={requestDelete} updateArrayField={updateArrayField} updateAssessment={updateAssessment} updateField={updateField} readOnly={isReadOnlyMode()} />
                            </div>

                            {/* Step 3: Research - HEAVY Schema Mapping */}
                            <div id="apar-step-3" className={currentStep === 3 ? 'block' : 'hidden print:block'}>
                                <PartIII formData={formData} addItem={addItem} removeItem={requestDelete} updateArrayField={updateArrayField} updateArrayItem={updateArrayItem} updateField={updateField} readOnly={isReadOnlyMode()} onSaveMonthly={handleSaveMonthly} />
                            </div>

                            {/* Step 4: Corporate Life */}
                            <div id="apar-step-4" className={currentStep === 4 ? 'block' : 'hidden print:block'}>
                                <PartIV formData={formData} addItem={addItem} removeItem={requestDelete} updateArrayField={updateArrayField} updateField={updateField} readOnly={isReadOnlyMode()} />
                            </div>

                            {/* Step 5: Numerical Assessment (Reporting Officer Only - Read/Write, Reviewing Officer - Read Only) */}
                            {(activeRole === 'Reporting Officer' || activeRole === 'Reviewing Officer') && (
                                <div id="apar-step-5" className={currentStep === 5 ? 'block' : 'hidden print:block'}>
                                    <PartV formData={formData} updateAssessment={updateAssessment} activeRole={activeRole} formStatus={formStatus} />
                                </div>
                            )}


                            {/* Step 6: Remarks of the Reviewing Officer (Reviewing Officer Only) */}
                            {activeRole === 'Reviewing Officer' && (
                                <div id="apar-step-6" className={currentStep === 6 ? 'block' : 'hidden print:block'}>
                                    <PartVIRemarks formData={formData} updateRemarks={updateRemarks} formStatus={formStatus} />
                                </div>
                            )}

                            {/* Step 5/6/7: Review & Submit */}
                            <div id={`apar-step-${totalSteps}`} className={currentStep === totalSteps ? 'block' : 'hidden print:block'}>
                                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">One Final Check</h3>
                                    <p className="text-sm text-gray-600 mb-6">
                                        {loginData.role === 'Reporting Officer' || loginData.role === 'Reviewing Officer'
                                            ? "Please review your entries. By submitting, you confirm the details are final."
                                            : "Please review all the information provided. All data entered corresponds to the institutional IQAC standards."}
                                    </p>

                                    <div className="mt-8 pt-4 border-t border-gray-100">
                                        <div className="flex bg-gray-50 p-4 rounded-md">
                                            <input
                                                type="checkbox"
                                                id="certification"
                                                name="certification"
                                                disabled={isReadOnlyMode()}
                                                required={!isReadOnlyMode()}
                                                aria-required={!isReadOnlyMode()}
                                                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                checked={certified}
                                                onChange={(e) => setCertified(e.target.checked)}
                                            />
                                            <div className="ml-3">
                                                <label htmlFor="certification" className="text-sm font-medium text-gray-900 cursor-pointer">I certify that the information’s given above are correct and factual to the best of my knowledge.</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Buttons - Hidden in Print */}
                            {!((loginData.role === 'Reporting Officer') && currentStep === 5) && (
                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 print:hidden">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        disabled={currentStep === 1}
                                        className={`px-6 py-2 border rounded-md text-sm font-medium flex items-center shadow-sm ${currentStep === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <FiArrowLeft className="mr-2" /> Previous
                                    </button>

                                    <div className="flex gap-4">
                                        {/* Save Draft/Monthly Buttons */}
                                        {(activeRole === 'Officer (Graded)' && ['Draft', 'Query Raised', 'not_filled'].includes(formStatus || 'Draft')) && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveDraft(false)}
                                                    disabled={isSavingDraft}
                                                    className={`px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center ${isSavingDraft ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                                                </button>
                                            </>
                                        )}

                                        {/* {currentStep === 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setCurrentStep(totalSteps)}
                                                className="px-6 py-2 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center"
                                            >
                                                {/* Go to Last Page */}
                                        {/* </button>
                                        )}} */}

                                        {currentStep === totalSteps ? (
                                            <>
                                                {/* Case 1: Reporting Officer Actions */}
                                                {/* Only show actions if NOT already forwarded (or can re-verify if needed, but user requested NO changes) */}
                                                {activeRole === 'Reporting Officer' && formStatus !== 'Forwarded by Reporting officer' && (
                                                    <div className="flex gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    const payload = {
                                                                        faculty_id: selectedFacultyRaw?.faculty_id || selectedFacultyRaw?.id?.split('-')[0],
                                                                        ay: selectedFacultyRaw?.ay || selectedFacultyRaw?.id?.split('-').slice(1).join('-'),
                                                                        assessment: formData.assessment,
                                                                        status: 'Submitted' // Keep status as Submitted (Draft mode for RO)
                                                                    };
                                                                    await aparFormReportingService.submit(payload);
                                                                    toast.success('Assessment saved as draft');
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toast.error('Failed to save draft');
                                                                }
                                                            }}
                                                            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                                                        >
                                                            Save Draft
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReportingSubmit('Query Raised')}
                                                            className="px-6 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-600 transition-colors flex items-center"
                                                        >
                                                            Raise Query
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReportingSubmit('Forwarded by Reporting officer')}
                                                            className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors flex items-center"
                                                        >
                                                            <FiCheck className="mr-2" /> Verify & Forward
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Case 2: Reviewing Officer Actions */}
                                                {activeRole === 'Reviewing Officer' && formStatus !== 'Accepted by Reviewing officer' && (
                                                    <div className="flex gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReviewingSubmit('Query Raised by Reviewing officer')}
                                                            className="px-6 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-600 transition-colors flex items-center"
                                                        >
                                                            Raise Query
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReviewingSubmit('Accepted by Reviewing officer')}
                                                            className="px-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                                                        >
                                                            <FiCheck className="mr-2" /> Submit Review
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Case 3: Officer (Graded) - Standard Submit */}
                                                {activeRole === 'Officer (Graded)' && ['Draft', 'Query Raised', 'Query Raised by Reporting officer', 'not_filled'].includes(formStatus || 'Draft') && (
                                                    <button
                                                        type="button"
                                                        className="px-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                                                        onClick={handleSubmit}
                                                    >
                                                        <FiCheck className="mr-2" /> Submit APAR
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                className="px-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                                            >
                                                Next
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </form>
                    </>
                )} {/* End of viewMode check */}
            </div>

            {/* Query Comment Modal */}
            {queryModalOpen && (
                <div className="fixed inset-0 bg-transparent overflow-y-auto h-full w-full flex items-center justify-center z-50 backdrop-blur-md">
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full m-4 overflow-hidden transform transition-all border border-gray-100">
                        {/* Header */}
                        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <FiAlertCircle className="mr-2" /> Raise Query
                            </h3>
                            <button onClick={() => setQueryModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="text-gray-600 text-sm mb-4">
                                Please provide a detailed reason for raising this query. This comment will be visible to the Officer to help them address the issue.
                            </p>

                            <label className="block text-sm font-medium text-gray-700 mb-2">Query Remarks / Comments</label>
                            <textarea
                                className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 min-h-[120px] text-gray-800"
                                placeholder="Enter specific details about the corrections needed..."
                                value={queryComment}
                                onChange={(e) => setQueryComment(e.target.value)}
                                autoFocus
                            ></textarea>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100">
                            <button
                                onClick={confirmQuerySubmission}
                                className="inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                            >
                                Submit Query
                            </button>
                            <button
                                onClick={() => { setQueryModalOpen(false); setQueryComment(''); }}
                                className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Info */}
            <div className="max-w-7xl mx-auto mt-8 text-center text-gray-500 text-sm print:hidden">
                <p>Annual Performance Assessment Report System &copy; {new Date().getFullYear()} DTU</p>
            </div>
            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-[100] overflow-y-auto print:hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">

                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setDeleteModal({ ...deleteModal, open: false })}></div>

                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                        {/* Modal Panel */}
                        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <FiAlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">Delete Item</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">Are you sure you want to delete this item? This action cannot be undone.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="button"
                                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                    onClick={() => setDeleteModal({ ...deleteModal, open: false })}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
