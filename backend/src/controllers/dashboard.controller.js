import { asyncHandler } from '../utils/async-handler.js';
import { ApiResponse } from '../utils/api-response.js';
import { ROLES } from '../config/roles.js';
import { AparForm } from '../models/aparForm.model.js';
import { Department } from '../models/department.model.js';
import { Student } from '../models/student.model.js';
import { Faculty } from '../models/faculty.model.js';
import { Programme } from '../models/programme.model.js';
import { Publication } from '../models/publication.model.js';
import { Patent } from '../models/patent.model.js';
import { StudentActivity } from '../models/studentActivity.model.js';
import { DepartmentResource } from '../models/departmentResource.model.js';
import { ResearchProject } from '../models/researchProject.model.js';
import { Notification } from '../models/notification.model.js';

const FEEDBACK_COLORS = {
    'Teaching Learning': '#2563eb',
    Curriculum: '#10b981',
    Infrastructure: '#f59e0b',
    'Support Services': '#8b5cf6'
};

const getAcademicYearVariants = (academicYear) => {
    if (!academicYear || academicYear === 'All') {
        return [];
    }

    const start = parseInt(String(academicYear).split('-')[0], 10);
    if (Number.isNaN(start)) {
        return [academicYear];
    }

    const endShort = String(start + 1).slice(-2);
    const endFull = String(start + 1);

    return [...new Set([
        academicYear,
        `${start}-${endShort}`,
        `${start}-${endFull}`,
        `${start}-${start + 1}`,
        String(start)
    ])];
};

const buildAcademicYearFilter = (academicYear) => {
    const variants = getAcademicYearVariants(academicYear);
    if (!variants.length) {
        return {};
    }
    return { academic_year: { $in: variants } };
};

const buildStudentYearFilter = (academicYear) => {
    if (!academicYear || academicYear === 'All') {
        return {};
    }

    const start = parseInt(String(academicYear).split('-')[0], 10);
    if (Number.isNaN(start)) {
        return {};
    }

    return { year_of_admission: { $in: [start, start + 1] } };
};

const buildFacultyYearFilter = (academicYear) => {
    if (!academicYear || academicYear === 'All') {
        return {};
    }

    const start = parseInt(String(academicYear).split('-')[0], 10);
    if (Number.isNaN(start)) {
        return {};
    }

    return {
        joining_date: {
            $gte: new Date(`${start}-07-01`),
            $lte: new Date(`${start + 1}-06-30`)
        }
    };
};

const resolveDashboardScope = (req) => {
    const role = req.user?.role;
    const requestedDept = req.query.department_id;
    const academicYear = req.query.academic_year || 'All';

    if (role === ROLES.DEPARTMENT_HOD) {
        const hodDept = req.user?.departmentId;
        if (!hodDept) {
            return { academicYear, departmentId: 'All', departmentLocked: true };
        }
        return { academicYear, departmentId: hodDept, departmentLocked: true };
    }

    const departmentId = requestedDept && requestedDept !== 'All' ? requestedDept : 'All';
    return { academicYear, departmentId, departmentLocked: false };
};

const withDepartment = (departmentId) => (
    departmentId && departmentId !== 'All' ? { department_id: departmentId } : {}
);

const buildFallbackAcademicYears = () => {
    const currentStart = new Date().getFullYear() - 1;
    const years = ['All'];
    for (let i = 6; i >= 0; i -= 1) {
        const start = currentStart - i;
        const end = String(start + 1).slice(-2);
        years.push(`${start}-${end}`);
    }
    return years;
};

const fetchDistinctAcademicYears = async () => {
    const collections = [
        Programme.distinct('academic_year'),
        Publication.distinct('academic_year'),
        Patent.distinct('academic_year'),
        StudentActivity.distinct('academic_year'),
        ResearchProject.distinct('academic_year'),
        AparForm.distinct('ay')
    ];

    const values = (await Promise.all(collections))
        .flat()
        .filter((value) => value && String(value).trim());

    const unique = [...new Set(values.map((value) => String(value).trim()))]
        .sort((a, b) => b.localeCompare(a));

    return unique.length ? ['All', ...unique] : buildFallbackAcademicYears();
};

const fetchDepartmentOptions = async (scopeDepartmentId) => {
    const query = scopeDepartmentId && scopeDepartmentId !== 'All'
        ? { department_id: scopeDepartmentId }
        : {};

    const departments = await Department.find(query)
        .select('department_id department_name')
        .sort({ department_name: 1 })
        .lean();

    return departments.map((dept) => ({
        id: dept.department_id,
        name: dept.department_name || dept.department_id
    }));
};

const aggregateAparMetrics = async (academicYear, departmentId) => {
    const queryFilter = { ...buildAcademicYearFilter(academicYear) };
    if (departmentId && departmentId !== 'All') {
        queryFilter['personal.department_id'] = departmentId;
    }

    const aggregateData = await AparForm.aggregate([
        { $match: queryFilter },
        {
            $project: {
                faculty_id: 1,
                status: 1,
                journalsCount: { $cond: { if: { $isArray: '$research.journals' }, then: { $size: '$research.journals' }, else: 0 } },
                conferencesCount: { $cond: { if: { $isArray: '$research.conferences' }, then: { $size: '$research.conferences' }, else: 0 } },
                booksCount: { $cond: { if: { $isArray: '$research.books' }, then: { $size: '$research.books' }, else: 0 } },
                patents: { $ifNull: ['$research.patents', []] }
            }
        },
        {
            $group: {
                _id: null,
                totalForms: { $sum: 1 },
                submittedForms: { $sum: { $cond: [{ $eq: ['$status', 'Submitted'] }, 1, 0] } },
                verifiedForms: { $sum: { $cond: [{ $eq: ['$status', 'Verified'] }, 1, 0] } },
                reviewedForms: { $sum: { $cond: [{ $eq: ['$status', 'Reviewed'] }, 1, 0] } },
                draftForms: { $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] } },
                uniqueFaculty: { $addToSet: '$faculty_id' },
                researchPapers: { $sum: { $add: ['$journalsCount', '$conferencesCount'] } },
                booksChapters: { $sum: '$booksCount' },
                allPatents: { $push: '$patents' }
            }
        }
    ]);

    const result = aggregateData[0] || {
        totalForms: 0,
        submittedForms: 0,
        verifiedForms: 0,
        reviewedForms: 0,
        draftForms: 0,
        uniqueFaculty: [],
        researchPapers: 0,
        booksChapters: 0,
        allPatents: []
    };

    let patentsFiled = 0;
    let patentsGranted = 0;

    if (Array.isArray(result.allPatents)) {
        result.allPatents.flat().forEach((patent) => {
            if (patent?.status === 'Filed') patentsFiled += 1;
            if (patent?.status === 'Granted') patentsGranted += 1;
        });
    }

    return {
        totalForms: result.totalForms,
        submittedForms: result.submittedForms,
        verifiedForms: result.verifiedForms,
        reviewedForms: result.reviewedForms,
        draftForms: result.draftForms,
        facultyFromApar: result.uniqueFaculty.length,
        researchPapers: result.researchPapers,
        booksChapters: result.booksChapters,
        patentsFiled,
        patentsGranted
    };
};

const buildAcademicPerformance = async (academicYear, departmentId, departments) => {
    const match = {
        type: 'exam',
        ...withDepartment(departmentId),
        ...buildAcademicYearFilter(academicYear)
    };

    const grouped = await StudentActivity.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$department_id',
                total: { $sum: 1 },
                passed: {
                    $sum: {
                        $cond: [
                            { $in: ['$result_status', ['Qualified', 'Passed']] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const passByDept = new Map(
        grouped.map((row) => [
            row._id,
            row.total > 0 ? Math.round((row.passed / row.total) * 100) : 0
        ])
    );

    const visibleDepartments = departmentId && departmentId !== 'All'
        ? departments.filter((dept) => dept.id === departmentId)
        : departments;

    return visibleDepartments.map((dept) => ({
        name: dept.id,
        pass: passByDept.get(dept.id) ?? 0
    }));
};

const buildInfrastructureScore = async (academicYear, departmentId) => {
    const match = {
        type: 'it_stock',
        ...withDepartment(departmentId)
    };

    const rows = await DepartmentResource.find(match).select('condition_status').lean();
    if (!rows.length) {
        return 0;
    }

    const workingCount = rows.filter((row) => row.condition_status === 'Working').length;
    const ratio = workingCount / rows.length;
    return Number(Math.min(5, 2 + ratio * 3).toFixed(2));
};

const buildStudentProgression = async (academicYear, departmentId, totalStudents) => {
    const baseFilter = {
        ...withDepartment(departmentId),
        ...buildAcademicYearFilter(academicYear)
    };

    const [higherEdCount, placedCount, examQualifiedCount, innovationCount] = await Promise.all([
        StudentActivity.countDocuments({ ...baseFilter, type: 'higher_ed' }),
        StudentActivity.countDocuments({ ...baseFilter, type: 'higher_ed', current_status: 'Placed' }),
        StudentActivity.countDocuments({
            ...baseFilter,
            type: 'exam',
            result_status: { $in: ['Qualified', 'Passed'] }
        }),
        StudentActivity.countDocuments({
            ...baseFilter,
            type: 'performance',
            type_of_activity: { $in: ['Innovation', 'Entrepreneurship'] }
        })
    ]);

    const denominator = totalStudents > 0 ? totalStudents : 1;
    const pct = (count) => `${((count / denominator) * 100).toFixed(1)}%`;

    return {
        placements: pct(placedCount),
        higherStudies: pct(higherEdCount),
        entrepreneurship: pct(innovationCount),
        competitiveExams: pct(examQualifiedCount)
    };
};

const buildAparProgress = (aparMetrics) => {
    const {
        totalForms,
        submittedForms,
        verifiedForms,
        reviewedForms,
        draftForms
    } = aparMetrics;

    const validatedCount = totalForms - draftForms;

    return [
        {
            label: 'Data Collection',
            status: totalForms > 0 ? 'Completed' : 'Pending'
        },
        {
            label: 'Data Validation',
            status: validatedCount > 0 ? 'Completed' : 'Pending'
        },
        {
            label: 'Report Drafting',
            status: submittedForms > 0 ? 'Completed' : 'Pending'
        },
        {
            label: 'Final Review',
            status: verifiedForms > 0 || reviewedForms > 0 ? 'In Progress' : 'Pending'
        },
        {
            label: 'Submitted',
            status: submittedForms > 0 ? 'Completed' : 'Pending'
        }
    ];
};

const fetchRecentActivities = async (role, departmentId, userId) => {
    const query = {};

    if (role === ROLES.DEPARTMENT_HOD && departmentId && departmentId !== 'All') {
        query.$or = [
            { 'metadata.department_id': departmentId },
            { recipient: userId },
            { recipient: 'HOD' }
        ];
    }

    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return notifications.map((item) => ({
        title: item.title,
        date: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '',
        type: item.type
    }));
};

export const getDashboardStats = asyncHandler(async (req, res) => {
    const { academicYear, departmentId, departmentLocked } = resolveDashboardScope(req);
    const deptFilter = withDepartment(departmentId);
    const ayFilter = buildAcademicYearFilter(academicYear);
    const studentYearFilter = buildStudentYearFilter(academicYear);
    const facultyYearFilter = buildFacultyYearFilter(academicYear);

    const [departments, academicYears, aparMetrics] = await Promise.all([
        fetchDepartmentOptions(departmentLocked ? departmentId : null),
        fetchDistinctAcademicYears(),
        aggregateAparMetrics(academicYear, departmentId)
    ]);

    const publicationFilter = { ...deptFilter, ...ayFilter };
    const studentFilter = { ...deptFilter, ...studentYearFilter };
    const facultyFilter = { ...deptFilter, ...facultyYearFilter };
    const programmeFilter = { ...deptFilter, ...ayFilter };

    const [
        totalStudents,
        totalFaculty,
        totalProgrammes,
        researchPapersCount,
        booksChaptersCount,
        patentsFiledCount,
        patentsGrantedCount,
        researchGrantsTotal,
        academicPerformance,
        infrastructureScore,
        recentActivities
    ] = await Promise.all([
        Student.countDocuments(studentFilter),
        Faculty.countDocuments(facultyFilter),
        Programme.countDocuments(programmeFilter),
        Publication.countDocuments({ ...publicationFilter, type: { $in: ['journal', 'conference'] } }),
        Publication.countDocuments({ ...publicationFilter, type: 'book' }),
        Patent.countDocuments({ ...publicationFilter, status: 'Filed' }),
        Patent.countDocuments({ ...publicationFilter, status: 'Granted' }),
        ResearchProject.aggregate([
            { $match: { ...deptFilter, ...ayFilter, type: 'funding' } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
        ]).then((rows) => rows[0]?.total ?? 0),
        buildAcademicPerformance(academicYear, departmentId, departments),
        buildInfrastructureScore(academicYear, departmentId),
        fetchRecentActivities(req.user?.role, departmentId, req.user?.userId)
    ]);

    const studentProgression = await buildStudentProgression(academicYear, departmentId, totalStudents);

    const researchPapers = Math.max(researchPapersCount, aparMetrics.researchPapers);
    const booksChapters = Math.max(booksChaptersCount, aparMetrics.booksChapters);
    const patentsFiled = Math.max(patentsFiledCount, aparMetrics.patentsFiled);
    const patentsGranted = Math.max(patentsGrantedCount, aparMetrics.patentsGranted);

    const feedback = [
        { name: 'Teaching Learning', value: 0, color: FEEDBACK_COLORS['Teaching Learning'] },
        { name: 'Curriculum', value: 0, color: FEEDBACK_COLORS.Curriculum },
        { name: 'Infrastructure', value: infrastructureScore, color: FEEDBACK_COLORS.Infrastructure },
        { name: 'Support Services', value: 0, color: FEEDBACK_COLORS['Support Services'] }
    ];

    const aparProgress = buildAparProgress(aparMetrics);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                students: totalStudents,
                faculty: totalFaculty,
                departments: totalProgrammes,
                programmes: totalProgrammes,
                researchPapers,
                booksChapters,
                patentsFiled,
                patentsGranted,
                aparSubmitted: aparMetrics.submittedForms,
                researchGrants: researchGrantsTotal,
                scope: {
                    academicYear,
                    departmentId,
                    departmentLocked
                },
                filters: {
                    academicYears,
                    departments,
                    departmentLocked
                },
                charts: {
                    academicPerformance,
                    feedback,
                    infrastructureScore,
                    studentProgression
                },
                aparProgress,
                recentActivities
            },
            'Dashboard stats fetched successfully'
        )
    );
});
