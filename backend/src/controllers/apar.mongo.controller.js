import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { resolveToReadableId } from "../utils/apar-helpers.js";
import { assertFacultyAccess, buildListFormsQuery } from "../utils/apar-access.js";
import { AparForm } from "../models/aparForm.model.js";
import { findUsersByOfficerMapping } from "../data-access/users.data-access.js";
import { findById as findFacultyById, syncAparToFaculty } from "../data-access/faculty.data-access.js";
import { Publication } from "../models/publication.model.js";
import { ResearchProject } from "../models/researchProject.model.js";
import { FacultyActivity } from "../models/facultyActivity.model.js";
import { Patent } from "../models/patent.model.js";
import { PhdDefence } from "../models/phdDefence.model.js";
import { Collaboration } from "../models/collaboration.model.js";
import { Department } from "../models/department.model.js";
import { User } from "../models/user.model.js";
import { Faculty } from "../models/faculty.model.js";
import { createNotification, notifyHeads } from "./notification.controller.js";
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available or use generic ID generator

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Helper to safely parse dates (handle empty strings)
const parseDate = (val) => {
    if (!val) return undefined;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
};

// Helper to safely parse numbers
const parseNumber = (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
};

// Helper to normalize department_id (resolve name to ID if needed)
const normalizeDepartmentId = async (deptIdInput) => {
    let deptId = deptIdInput;

    // If department_id looks like a name (contains spaces or is very long), try to find the actual ID
    if (deptId && (deptId.includes(' ') || deptId.length > 20)) {
        console.warn(`department_id appears to be a name: "${deptId}". Looking up actual ID...`);
        try {
            const dept = await Department.findOne({ department_name: deptId });
            if (dept) {
                deptId = dept.department_id;
                console.log(`Resolved department "${deptId}" from name "${deptIdInput}"`);
            } else {
                console.warn(`Could not find department with name "${deptId}". Using as-is.`);
            }
        } catch (err) {
            console.error('Department lookup failed:', err);
        }
    }

    // Fallback if still no valid department
    if (!deptId) {
        deptId = "UNKNOWN";
        console.warn(`No department_id provided. Using "UNKNOWN"`);
    }

    return deptId;
};

// Recursive function to remove empty strings from object
const cleanEmptyStrings = (obj) => {
    if (obj !== Object(obj)) return obj; // Primitive
    if (Array.isArray(obj)) {
        return obj.map(item => cleanEmptyStrings(item));
    }
    const newObj = {};
    for (const key in obj) {
        const val = obj[key];
        if (val === '') {
            newObj[key] = undefined;
        } else if (val && typeof val === 'object') {
            newObj[key] = cleanEmptyStrings(val);
        } else {
            newObj[key] = val;
        }
    }
    return newObj;
};

// Helper to compute changes between existing document and update data
const computeChanges = (existingDoc, updateData) => {
    const changes = [];
    const fieldsToIgnore = [
        'metadata', 'faculty_members', 'faculty_involved', 'faculty_associations',
        'faculty_ids', 'student_ids', 'students', 'students_involved'
    ];
    if (!existingDoc) return 'Synced from APAR (created)';
    for (const key of Object.keys(updateData || {})) {
        if (fieldsToIgnore.includes(key)) continue;
        const oldVal = existingDoc[key];
        const newVal = updateData[key];
        const s1 = (oldVal === undefined || oldVal === null) ? '' : String(oldVal);
        const s2 = (newVal === undefined || newVal === null) ? '' : String(newVal);
        if (s1 !== s2) {
            changes.push(`${key}: "${s1}" -> "${s2}"`);
        }
    }
    return changes.length > 0 ? changes.join(', ') : 'Synced from APAR (No field changes detected)';
};


        // saveToMonthlyData is disabled temporarily to avoid parse/runtime issues.
        const saveToMonthlyData = asyncHandler(async (req, res) => {
            return res.status(501).json(new ApiResponse(501, {}, "saveToMonthlyData is temporarily disabled"));
        });

// === Faculty Actions ===



// Helper to sync IQAC data into APAR Form
// Helper to normalize Academic Year to YYYY-YY format
// Helper to normalize Academic Year to YYYY-YY format
const normalizeAY = (ay) => {
    if (!ay || typeof ay !== 'string') return ay;
    const cleanAy = ay.trim();
    const parts = cleanAy.split(/[\s-]+/); // Split by space or dash
    if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
        return `${parts[0]}-${parts[1].substring(2)}`;
    }
    return cleanAy;
};

// Helper to sync IQAC data into APAR Form
const syncIqacToAparForm = async (form, faculty_id, ay) => {
    // Normalization logic for IQAC sync
    // IQAC might use 2024-2025 or 2024-25. We need to handle variants.
    const startYear = ay.split('-')[0];
    const endYear = ay.split('-')[1];

    // Create variants to query IQAC (IQAC might store as YYYY-YYYY or YYYY-YY or Number)
    // We assume current AY is the canonical one stored in form (normalized).
    // ... logic continues ...

    // Log the ID being used for sync to help user verify
    console.log(`[APAR SYNC] DEBUG: Pre-fetching IQAC data for Faculty ID: "${faculty_id}" (AY: ${ay})`);


    if (!form.research) form.research = {};
    const research = form.research;
    let modified = false;

    // Years for Publication matching (e.g. 2023, 2024)
    let years = ay ? ay.split('-').map(y => parseInt(y)).filter(n => !isNaN(n)) : [];
    // Normalize short years in filtering (e.g. "27" -> 2027)
    years = years.map(y => (y < 100 ? 2000 + y : y));
    // Remove duplicates
    years = [...new Set(years)];

    // Academic Year Variants for string matching (e.g. "2026-2027" vs "2026-27")
    let ayVariants = [ay]; // Start with the requested format
    if (years.length >= 2) {
        const start = years[0];
        const end = years[years.length - 1]; // Use last parsed year as end
        const endShort = end % 100;

        const longFormat = `${start}-${end}`;     // "2026-2027"
        const shortFormat = `${start}-${endShort}`; // "2026-27"

        ayVariants = [longFormat, shortFormat];
    }
    // Remove duplicates
    ayVariants = [...new Set(ayVariants)];



    const queryAy = { academic_year: { $in: ayVariants } }; // Flexible AY query

    // ... inside the try block
    // We will inject logs specifically around the queries

    /* 
       Note: The original code defined 'merge' function here. 
       I am injecting logs before the try block starts essentially. 
       But I need to Replace the block carefully.
    */

    // ... redefine merge to include logging if helpful, or just log query results below.

    // Generic Merger with Enhanced Matching
    const merge = (sectionKey, iqacList, idField, type) => {
        if (!typeof research[sectionKey] === 'object') research[sectionKey] = [];
        const oldSection = research[sectionKey] || [];

        // Map valid IQAC items to clean POJOs
        const newSection = iqacList.map(iqacItem => {
            const iqacId = iqacItem[idField];
            // Destructure to remove Mongoose internals
            const { _id, metadata, __v, ...cleanItem } = iqacItem;

            // Ensure ID is present
            cleanItem[idField] = iqacId;

            return cleanItem;
        });

        // Determine modification status
        // If lengths differ, or if we have content (assuming updates), mark as modified
        if (oldSection.length !== newSection.length) {
            modified = true;
        } else if (newSection.length > 0) {
            // Optimization: Could check deep equality, but assuming sync update is intended
            modified = true;
        }

        // Direct replacement with POJO array
        research[sectionKey] = newSection;
    };

    // Create case-insensitive ID query
    const idQuery = { $regex: new RegExp(`^${faculty_id}$`, 'i') };

    try {
        // 1. Journals
        // 1. Journals
        const journals = await Publication.find({
            type: 'journal',
            $or: [{ 'faculty_members.faculty_id': idQuery }, { 'faculty_ids': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        // pre-map to ensure common fields exist for matcher
        const journalsMapped = journals.map(j => ({
            ...j,
            title: j.title || j.name_of_journal,
            paper_id: j.paper_id || j.publication_id
        }));
        merge('journals', journalsMapped, 'paper_id', 'journals');

        // 2a. Conferences (Paper Publishing)
        // 2a. Conferences (Paper Publishing)
        const conferences = await Publication.find({
            type: 'conference',
            $or: [{ 'faculty_members.faculty_id': idQuery }, { 'faculty_ids': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        const confMapped = conferences.map(c => ({
            ...c,
            title_of_paper: c.title || c.title_of_paper, // Ensure keys match frontend expectation
            paper_id: c.paper_id || c.publication_id
        }));
        merge('conferences', confMapped, 'paper_id', 'conferences');

        // 2b. Participation in Conferences (Paper Presentation)
        // This is distinct from just publishing. Checking for 'Presentation' nature if available, 
        // or assuming all conference papers imply presentation for now as per user request context.
        // The frontend expects this in 'conference_participation' key probably?
        // Checking APAR form structure... usually it's separate. 
        // For now, I will reuse the conference list but map it to 'conference_participation' 
        // if user has a separate section for it.
        const presentationMapped = conferences.map(c => ({
            ...c,
            title_of_paper: c.title || c.title_of_paper,
            name_of_conference: c.name_of_conference,
            date: c.date || c.year_of_publication,
            organizing_agency: c.organizer || c.publisher,
            level: c.conference_level
        }));
        merge('conference_participation', presentationMapped, 'paper_id', 'default');

        // 3. Books
        const books = await Publication.find({
            type: 'book',
            $or: [{ 'faculty_members.faculty_id': idQuery }, { 'faculty_ids': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        const booksMapped = books.map(b => ({
            ...b,
            faculty_ids: b.faculty_members ? b.faculty_members : [],
            student_ids: b.students ? b.students : []
        }));
        merge('books', booksMapped, 'publication_id', 'books');

        // 4. Projects (Funding)
        const projects = await ResearchProject.find({
            type: 'funding',
            $or: [{ 'faculty_involved.faculty_id': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        merge('projects', projects, 'project_id', 'projects');

        // 5. Consultancy
        const consultancy = await ResearchProject.find({
            type: 'consultancy',
            $or: [{ 'faculty_involved.faculty_id': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        const consMapped = consultancy.map(c => ({
            ...c,
            title: c.title || c.name_of_project,
            consultancy_id: c.project_id
        }));
        merge('consultancy', consMapped, 'consultancy_id', 'consultancy');

        // console.log(`[PATENT DEBUG] Querying with:`, {
        //     idQuery,
        //     startYear,
        //     endYear,
        //     ayVariants
        // });

        const patents = await Patent.find({
            $or: [{ 'faculty_members.faculty_id': idQuery }],
            status: { $in: ['Filed', 'Published', 'Granted'] },
            academic_year: { $in: ayVariants }
        }).lean();

        console.log(`[PATENT DEBUG] Found ${patents.length} patents:`, JSON.stringify(patents, null, 2));

        merge('patents', patents, 'patent_id', 'patents');

        // 7. Awards
        const awards = await FacultyActivity.find({
            type: 'award',
            $or: [{ faculty_id: idQuery }, { 'faculty_recipients.faculty_id': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        const awdMapped = awards.map(a => ({ ...a, award_id: a.activity_id }));
        merge('awards', awdMapped, 'award_id', 'awards');

        // 8. FDPs
        const fdps = await FacultyActivity.find({
            type: 'fdp',
            $or: [{ faculty_id: idQuery }, { 'faculty_participants.faculty_id': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        // FDP matcher falls back to default Title match
        merge('fdps', fdps, 'activity_id', 'default');

        // 9. E-Content
        const econtent = await FacultyActivity.find({ type: 'econtent', faculty_id: idQuery, academic_year: { $in: ayVariants } }).lean();
        const econtMapped = econtent.map(e => ({ ...e, econtent_id: e.activity_id }));
        merge('e_content', econtMapped, 'econtent_id', 'default');

        // 10. Visits
        const visits = await FacultyActivity.find({ type: 'visit', faculty_id: idQuery, academic_year: { $in: ayVariants } }).lean();
        const visitsMapped = visits.map(v => ({ ...v, visit_id: v.activity_id }));
        merge('faculty_visits', visitsMapped, 'visit_id', 'default');

        // 11. Collaborations
        const collaborations = await Collaboration.find({ type: 'activity', 'faculty_associations.faculty_id': idQuery, academic_year: { $in: ayVariants } }).lean();
        const collMapped = collaborations.map(c => ({ ...c, activity_id: c.collaboration_id }));
        merge('collaborations', collMapped, 'activity_id', 'default');

        // 12. PhDs
        const phds = await PhdDefence.find({
            $or: [{ supervisor_id: idQuery }, { 'co_supervisors.co_supervisor_id': idQuery }],
            academic_year: { $in: ayVariants }
        }).lean();
        // PhD fallback uses thesis title by default logic
        merge('phd_supervision', phds, 'defence_id', 'default');

        // 13. MoUs
        const mous = await Collaboration.find({ type: 'mou', 'faculty_associations.faculty_id': idQuery, academic_year: { $in: ayVariants } }).lean();
        const mousMapped = mous.map(m => ({ ...m, mou_id: m.collaboration_id }));
        merge('mous', mousMapped, 'mou_id', 'default');

    } catch (e) {
        console.error("Error syncing IQAC to APAR:", e);
    }

    return modified;
};

const getForm = asyncHandler(async (req, res) => {
    let faculty_id = req.query.faculty_id || req.user?.userId || req.user?.faculty_id || req.user?.id;
    console.log(`[GET FORM] Input Faculty ID: ${faculty_id}`);
    faculty_id = await resolveToReadableId(faculty_id);
    console.log(`[GET FORM] Resolved Faculty ID: ${faculty_id}`);
    await assertFacultyAccess(req.user, faculty_id);

    let ay = req.query.ay || req.user?.academicYear;
    if (ay) ay = normalizeAY(ay);

    if (!faculty_id) {
        throw new ApiError(400, "Faculty ID is required");
    }

    let form;
    if (ay) {
        // Fetch user/faculty details for auto-population (needed for creation)
        const facultyProfile = await Faculty.findOne({ faculty_id });
        const userProfile = await User.findOne({ user_id: faculty_id });

        // Check if form exists first (User request)
        form = await AparForm.findOne({ faculty_id, ay });

        // IF form doesn't exist, create it + sync
        if (!form) {
            console.log(`[APAR] No form found for Faculty=${faculty_id}, AY=${ay}. Creating new draft.`);

            const newForm = new AparForm({
                faculty_id,
                ay,
                status: 'Draft',
                reporting_officer_id: userProfile?.reporting_officer_id,
                reviewing_officer_id: userProfile?.reviewing_officer_id,
                research: {},
                personal: {
                    department_id: req.user?.departmentId || '',
                    name: facultyProfile?.name,
                    email: facultyProfile?.email,
                    designation: facultyProfile?.designation,
                    date_of_birth: facultyProfile?.date_of_birth,
                    phone: facultyProfile?.phone,
                    qualification: facultyProfile?.qualification,
                    joining_date: facultyProfile?.joining_date
                }
            });

            // Sync data immediately
            await syncIqacToAparForm(newForm, faculty_id, ay);

            try {
                form = await newForm.save();
                console.log(`[APAR] New form created and saved for ${faculty_id} ${ay}`);
            } catch (err) {
                if (err.code === 11000) {
                    console.warn(`[APAR] Race condition detected for ${faculty_id} ${ay}. Fetching existing form.`);
                    form = await AparForm.findOne({ faculty_id, ay });
                    if (!form) throw err; // Should not happen if 11000
                } else {
                    throw err;
                }
            }
        }

        // Fetch it again if needed? No, new:true returns the doc.
        // Check if it was just created? 
        // With upsert, we don't know if it was inserted or found unless we check via rawResult (which mongoose wraps).
        // However, we generally want to sync IQAC data if it's new OR draft.

        if (form.status === 'Draft' || form.status === 'check_submit_status' || !form.status) {
            // ... strict sync logic below applies to both new and existing drafts ...
            // Just ensure we call sync.
            const modified = await syncIqacToAparForm(form, faculty_id, ay);

            // Check if personal info needs update (for existing drafts that missed it)
            if (facultyProfile) {
                if (!form.personal) form.personal = {};
                let pChanged = false;
                if (!form.personal.name && facultyProfile.name) { form.personal.name = facultyProfile.name; pChanged = true; }
                if (!form.personal.email && facultyProfile.email) { form.personal.email = facultyProfile.email; pChanged = true; }
                if (!form.personal.designation && facultyProfile.designation) { form.personal.designation = facultyProfile.designation; pChanged = true; }
                if (!form.personal.date_of_birth && facultyProfile.date_of_birth) { form.personal.date_of_birth = facultyProfile.date_of_birth; pChanged = true; }
                if (!form.personal.phone && facultyProfile.phone) { form.personal.phone = facultyProfile.phone; pChanged = true; }
                if (!form.personal.qualification && facultyProfile.qualification) { form.personal.qualification = facultyProfile.qualification; pChanged = true; }
                if (!form.personal.joining_date && facultyProfile.joining_date) { form.personal.joining_date = facultyProfile.joining_date; pChanged = true; }

                // Backfill Officers
                if (!form.reporting_officer_id && userProfile?.reporting_officer_id) { form.reporting_officer_id = userProfile.reporting_officer_id; pChanged = true; }
                if (!form.reviewing_officer_id && userProfile?.reviewing_officer_id) { form.reviewing_officer_id = userProfile.reviewing_officer_id; pChanged = true; }

                if (pChanged) form.markModified('personal');
            }

            if (modified || form.isModified('personal')) {
                form.markModified('research');
                await form.save();
            }
        }

    } else {
        // Find latest
        form = await AparForm.findOne({ faculty_id }).sort({ ay: -1, updatedAt: -1 });
    }

    return res.status(200).json(
        new ApiResponse(200, form ? form.toObject() : {}, "Form fetched successfully")
    );
});

const getFacultyHistory = asyncHandler(async (req, res) => {
    let faculty_id = req.user?.userId || req.user?.faculty_id || req.user?.id;
    faculty_id = await resolveToReadableId(faculty_id);
    await assertFacultyAccess(req.user, faculty_id);

    if (!faculty_id) throw new ApiError(400, "Faculty ID is required");

    const forms = await AparForm.find({ faculty_id }).sort({ ay: -1 }).lean();
    const list = forms.map(f => ({
        faculty_id: f.faculty_id,
        ay: normalizeAY(f.ay), // Ensure output is normalized
        status: f.status,
        timeline: f.timeline,
        history: f.history, // Include history array
        query_comment: f.query_comment || (f.remarks && f.remarks.query_comment),
        reporting_query: f.reporting_query,
        reviewing_query: f.reviewing_query,
        updatedAt: f.updatedAt
    }));

    return res.status(200).json(new ApiResponse(200, list, "Faculty APAR history fetched"));
});

const checkDraftDuplicates = (data) => {
    const research = data.research || {};
    const sections = [
        { key: 'journals', title: 'title_of_paper' }, // APAR keys might vary, checking possible fields
        { key: 'conferences', title: 'title_of_paper' },
        { key: 'books', title: 'title_of_book' },
        { key: 'projects', title: 'title' },
        { key: 'consultancy', title: 'title' },
        { key: 'patents', title: 'title' },
        { key: 'awards', title: 'name_of_award' },
        { key: 'fdps', title: 'program_title' }
    ];

    for (const sec of sections) {
        const list = research[sec.key];
        if (Array.isArray(list) && list.length > 1) {
            const seen = new Set();
            for (const item of list) {
                const t = item[sec.title] || item.title || item.name_of_journal || item.program_title || item.name_of_award || item.title_of_book;
                if (t) {
                    const lower = t.toString().toLowerCase().trim();
                    if (seen.has(lower)) {
                        throw new ApiError(400, `Duplicate entry found in ${sec.key}: "${t}". Please remove duplicates.`);
                    }
                    seen.add(lower);
                }
            }
        }
    }
};

const saveForm = asyncHandler(async (req, res) => {
    let ay = req.body.ay || req.user?.academicYear;
    if (ay) ay = normalizeAY(ay);
    let formData = req.body.formData;
    let faculty_id = req.body.faculty_id || req.user?.userId || req.user?.faculty_id || req.user?.id;
    faculty_id = await resolveToReadableId(faculty_id);
    await assertFacultyAccess(req.user, faculty_id);

    if (!faculty_id) {
        throw new ApiError(400, "Faculty ID is required. Please sign in again.");
    }
    if (!ay) {
        throw new ApiError(400, "Academic Year (Ay) is required. Please ensure it is selected or filled in Part I.");
    }

    // Clean formData to replace "" with undefined for Dates/Numbers to avoid CastError
    if (formData) {
        console.log('[SAVE FORM DEBUG] Received Research Keys:', Object.keys(formData.research || {}));
        if (formData.research?.journals) {
            console.log('[SAVE FORM DEBUG] Raw Journals:', JSON.stringify(formData.research.journals, null, 2));
        }

        formData = cleanEmptyStrings(formData);

        if (formData.research?.journals) {
            console.log('[SAVE FORM DEBUG] Cleaned Journals:', JSON.stringify(formData.research.journals, null, 2));
        }

        // Check for internal duplicates in the draft data being saved
        checkDraftDuplicates({ research: formData.research });
    }

    // Check if form exists first to check status restrictions?
    const existing = await AparForm.findOne({ faculty_id, ay });
    if (existing && (existing.status === 'Submitted' || existing.status === 'Verified' || existing.status === 'Reviewed')) {
        if (existing.status !== 'Query Raised') {
            // Logic for submitted forms
        }
    }

    let form;
    try {
        form = await AparForm.findOneAndUpdate(
            { faculty_id, ay },
            {
                $set: {
                    personal: formData.personal,
                    teaching: formData.teaching,
                    research: formData.research,
                    corporate: formData.corporate,
                },
                $setOnInsert: {
                    status: 'Draft', // Ensure status is Draft on creation
                    "timeline.created_at": new Date()
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // If validation passed and it wasn't submitted, ensure it's Draft (for updates where status might be missing)
        if (form && !form.status) {
            form.status = 'Draft';
            await form.save();
        }
    } catch (dbError) {
        console.error("Save Draft DB Error:", dbError);
        throw new ApiError(400, `Failed to save draft: ${dbError.message}`);
    }

    // Sync with Faculty model
    try {
        await syncAparToFaculty(faculty_id, { ...formData, ay });
    } catch (syncError) {
        console.error("Sync to Faculty failed during saveForm:", syncError);
    }

    return res.status(200).json(
        new ApiResponse(200, form, "Form saved successfully")
    );
});

const submitForm = asyncHandler(async (req, res) => {
    const ay = req.body.ay || req.user?.academicYear;
    const formData = req.body.formData;
    let faculty_id = req.body.faculty_id || req.user?.userId || req.user?.faculty_id || req.user?.id;
    faculty_id = await resolveToReadableId(faculty_id);
    await assertFacultyAccess(req.user, faculty_id);

    if (!faculty_id) throw new ApiError(400, "Faculty ID is required");
    if (!ay) throw new ApiError(400, "Academic Year (Ay) is required");

    const form = await AparForm.findOneAndUpdate(
        { faculty_id, ay },
        {
            $set: {
                personal: formData.personal,
                teaching: formData.teaching,
                research: formData.research,
                corporate: formData.corporate,
                status: "Submitted",
                "timeline.submitted_at": new Date()
            },
            $push: {
                history: {
                    action: "Submitted",
                    by: "Faculty",
                    date: new Date(),
                    comment: "Form submitted by faculty"
                }
            }
        },
        { new: true, upsert: true }
    );

    // Sync with Faculty model
    try {
        await syncAparToFaculty(faculty_id, { ...formData, ay });
    } catch (syncError) {
        console.error("Sync to Faculty failed during submitForm:", syncError);
    }

    // Notifications
    try {
        const user = await User.findOne({ user_id: faculty_id });
        if (user && user.reporting_officer_id) {
            // await createNotification({
            //     recipient: user.reporting_officer_id,
            //     sender: faculty_id,
            //     type: 'APAR_SUBMISSION',
            //     title: 'New APAR Submission',
            //     message: `Faculty ${user.name || faculty_id} has submitted their APAR for AY ${ay}.`,
            //     link: '/apar/reporting'
            // });
        }

        // 🚀 Notify IQAC HEAD as well - DISABLED
        // await notifyHeads({
        //     sender: faculty_id,
        //     type: 'APAR_SUBMISSION',
        //     title: 'APAR Form Submitted',
        //     message: `Faculty ${user?.name || faculty_id} (${user?.department_id || ''}) has submitted their APAR for Academic Year ${ay}.`,
        //     link: `/apar/dashboard`, // Adjust link as needed for IQAC head to view status
        //     department_id: user?.department_id
        // });
    } catch (notifErr) {
        console.error("APAR submission notification failed:", notifErr);
    }

    return res.status(200).json(
        new ApiResponse(200, form, "Form submitted successfully")
    );
});

// === Reporting Officer Actions ===

const getPendingReporting = asyncHandler(async (req, res) => {
    const { ay } = req.query;
    let reportingOfficerId = req.user.userId || req.user.faculty_id || req.user.id;
    reportingOfficerId = await resolveToReadableId(reportingOfficerId);

    // Use both readable and Mongo ID to catch any inconsistent data
    const possibleOfficerIds = [reportingOfficerId];
    if (req.user?.id && req.user.id !== reportingOfficerId) possibleOfficerIds.push(req.user.id);
    if (req.user?.sub && req.user.sub !== reportingOfficerId) possibleOfficerIds.push(req.user.sub);

    console.log(`[REPORTING VIEW] Checking assignments for Officer IDs: ${possibleOfficerIds.join(', ')}`);

    // Direct query to User model instead of helper to support multiple IDs
    const assignedUsers = await User.find({ reporting_officer_id: { $in: possibleOfficerIds } });
    const assignedUserIds = assignedUsers.map(u => u.user_id);
    console.log(`[REPORTING VIEW] Found ${assignedUsers.length} assigned users: ${assignedUserIds.join(', ')}`);


    if (!assignedUserIds.length) {
        console.log(`[REPORTING VIEW] No assigned officers found for ${reportingOfficerId}`);
        return res.status(200).json(new ApiResponse(200, [], "No assigned officers found"));
    }

    const query = {
        faculty_id: { $in: assignedUserIds }
    };

    if (req.query.archive === 'true') {
        // Archive: Show all forms regardless of status (or maybe just completed ones?)
        // User said: "make it availabel to him as archive and only in view form"
        // Let's show everything for now, or maybe filter out 'Draft' if we want strictly submitted history.
        // But typically archive implies past/completed.
        // Let's include everything except maybe 'Draft' if they haven't submitted?
        // Actually, if it's assigned, they should see what's submitted.
        query.status = { $ne: 'Draft' };
    } else {
        // Pending Action: Only forms needing attention
        query.status = { $in: ['Submitted', 'Verified', 'Reviewed', 'Query Raised', 'Forwarded by Reporting officer', 'Query Raised by Reviewing officer'] };
    }

    if (ay) query.ay = ay;

    console.log(`[REPORTING VIEW] Querying Forms:`, JSON.stringify(query));
    const forms = await AparForm.find(query).sort({ updatedAt: -1 }).lean();
    console.log(`[REPORTING VIEW] Forms found: ${forms.length}`);

    const list = forms.map(f => ({
        faculty_id: f.faculty_id,
        ay: f.ay,
        name: f.personal?.name || 'Unknown',
        designation: f.personal?.designation || '',
        dept_name: f.personal?.department_id || '',
        status: f.status,
        query_comment: f.query_comment || (f.remarks && f.remarks.query_comment),
        reviewing_query: f.reviewing_query,
        date: f.updatedAt
    }));

    return res.status(200).json(new ApiResponse(200, list, "Fetched all pending forms"));
});

const submitReportingAssessment = asyncHandler(async (req, res) => {
    // reporting_officer_id comes from the authenticated user (req.user)
    // assuming auth middleware populates req.user
    const reportingKey = req.user?.id;

    const { faculty_id, ay, assessment, status } = req.body;
    // status can be 'Verified', 'Reporting Officer Forwarded', 'Query Raised'

    const updateFields = {
        assessment: assessment,
        status: status,
        "timeline.reporting_reviewed_at": new Date()
    };

    // If a query comment is provided, store it
    if (req.body.query_comment) {
        updateFields.query_comment = req.body.query_comment;
        updateFields.reporting_query = req.body.query_comment;
    }

    // Logic to reset timeline if Query Raised
    if (status && status.includes('Query')) {
        // If Reporting Officer raises query, it goes back to faculty (step 1 redo?)
        // The user said "db timeline shoulds to initiated value". 
        // We will clear reporting_reviewed_at and reviewing_reviewed_at 
        // so it looks like it hasn't passed this stage yet.
        updateFields["timeline.reporting_reviewed_at"] = null;
        updateFields["timeline.reviewing_reviewed_at"] = null;
        // Ideally we might keep submitted_at so we know when it started, 
        // but if it's "initiated value", maybe they want that cleared too?
        // Usually 'initiated' means started, so submitted_at should stay or just be there.
        // Let's assume we clear the *approval* flow steps.
    } else {
        // Only set this if NOT a query (i.e. successful forward)
        updateFields["timeline.reporting_reviewed_at"] = new Date();
    }

    if (reportingKey) {
        updateFields.reporting_officer_id = reportingKey;
    }

    const historyEvent = {
        action: status,
        by: "Reporting Officer",
        date: new Date(),
        comment: req.body.query_comment || (status === 'Verified' ? 'Verified by Reporting Officer' : status)
    };

    const form = await AparForm.findOneAndUpdate(
        { faculty_id, ay },
        {
            $set: updateFields,
            $push: { history: historyEvent }
        },
        { new: true }
    );

    if (!form) {
        throw new ApiError(404, "APAR Form not found for the given Faculty ID and Academic Year");
    }

    // Sync with Faculty model using the stored form data
    await syncAparToFaculty(faculty_id, {
        ...form.toObject(),
        ay: form.ay,
        formData: {
            personal: form.personal,
            teaching: form.teaching,
            research: form.research,
            corporate: form.corporate
        }
    });

    // Notifications
    try {
        const facultyUser = await User.findOne({ user_id: faculty_id });

        // 1. Notify Faculty (Officer Graded) that verification or query happened
        await createNotification({
            recipient: faculty_id,
            sender: reportingKey,
            type: status === 'Query Raised' ? 'APAR_SUBMISSION' : 'APAR_REVIEW_REQUEST',
            title: status === 'Query Raised' ? 'Query Raised on APAR' : 'APAR Verified by Reporting Officer',
            message: status === 'Query Raised'
                ? `Reporting Officer has raised a query on your APAR for AY ${ay}.`
                : `Your APAR for AY ${ay} has been verified by the Reporting Officer.`,
            link: '/apar-form'
        });

        // 2. Notify Reviewing Officer only if assessment is successfully forwarded
        // if (status !== 'Query Raised' && facultyUser?.reviewing_officer_id) {
        //     await createNotification({
        //         recipient: facultyUser.reviewing_officer_id,
        //         sender: reportingKey,
        //         type: 'APAR_REVIEW_REQUEST',
        //         title: 'APAR Review Pending',
        //         message: `APAR for ${facultyUser.name || faculty_id} (AY ${ay}) is verified and pending your review.`,
        //         link: '/apar/reviewing'
        //     });
        // }
    } catch (notifErr) {
        console.error("Reporting assessment notification failed:", notifErr);
    }

    return res.status(200).json(new ApiResponse(200, form, "Assessment submitted"));
});

// === Reviewing Officer Actions ===

const getPendingReviewing = asyncHandler(async (req, res) => {
    const { ay } = req.query;
    let reviewingOfficerId = req.user.userId || req.user.faculty_id || req.user.id;
    reviewingOfficerId = await resolveToReadableId(reviewingOfficerId);

    if (!reviewingOfficerId) throw new ApiError(400, 'Reviewing officer identifier not found');

    // Use both readable and Mongo ID to catch any inconsistent data
    const possibleOfficerIds = [reviewingOfficerId];
    if (req.user?.id && req.user.id !== reviewingOfficerId) possibleOfficerIds.push(req.user.id);
    if (req.user?.sub && req.user.sub !== reviewingOfficerId) possibleOfficerIds.push(req.user.sub);

    console.log(`[REVIEWING VIEW] Checking assignments for Officer IDs: ${possibleOfficerIds.join(', ')}`);

    // Direct query to User model
    const assignedUsers = await User.find({ reviewing_officer_id: { $in: possibleOfficerIds } });
    const assignedUserIds = assignedUsers.map(u => u.user_id);
    console.log(`[REVIEWING VIEW] Found ${assignedUsers.length} assigned users: ${assignedUserIds.join(', ')}`);


    if (!assignedUserIds.length) {
        return res.status(200).json(new ApiResponse(200, [], "No assigned officers found for review"));
    }

    const query = {
        faculty_id: { $in: assignedUserIds }
    };

    if (req.query.archive === 'true') {
        query.status = { $ne: 'Draft' };
    } else {
        query.status = {
            $in: [
                'Forwarded by Reporting officer',
                'Accepted by Reviewing officer'
            ]
        };
    }

    if (ay) query.ay = ay;

    console.log(`[REVIEWING VIEW] Querying Forms:`, JSON.stringify(query));
    const forms = await AparForm.find(query).lean();
    console.log(`[REVIEWING VIEW] Forms found: ${forms.length}`);
    const list = forms.map(f => ({
        faculty_id: f.faculty_id,
        ay: f.ay,
        name: f.personal?.name,
        designation: f.personal?.designation,
        dept_name: f.personal?.department_id,
        status: f.status,
        date: f.updatedAt
    }));

    return res.status(200).json(new ApiResponse(200, list, "Fetched verified forms for review"));
});

const submitReviewingRemarks = asyncHandler(async (req, res) => {
    // Extract query_comment from request body
    const { faculty_id, ay, remarks, status, query_comment } = req.body;
    await assertFacultyAccess(req.user, faculty_id);

    const updateData = {
        remarks: remarks,
        status: status || "Accepted by Reviewing officer", // Final status or Query
    };

    if (status && status.includes('Query')) {
        updateData["timeline.reviewing_reviewed_at"] = null;
        // Optionally reset reporting officer time if it goes ALL the way back? 
        // Typically if Reviewing Officer queries, it might go to Reporting Officer.
        // But simply clearing reviewing time effectively 'un-checks' the reviewing step.
    } else {
        updateData["timeline.reviewing_reviewed_at"] = new Date();
    }

    if (query_comment) {
        updateData.query_comment = query_comment;
        updateData.reviewing_query = query_comment;
    }

    const historyEvent = {
        action: status || "Accepted by Reviewing officer",
        by: "Reviewing Officer",
        date: new Date(),
        comment: query_comment || (status === 'Accepted by Reviewing officer' ? 'Accepted by Reviewing Officer' : status)
    };

    const form = await AparForm.findOneAndUpdate(
        { faculty_id, ay },
        {
            $set: updateData,
            $push: { history: historyEvent }
        },
        { new: true }
    );

    if (form) {
        // Sync with Faculty model
        await syncAparToFaculty(faculty_id, {
            ...form.toObject(),
            ay: form.ay,
            formData: {
                personal: form.personal,
                teaching: form.teaching,
                research: form.research,
                corporate: form.corporate
            }
        });
    }

    // Notifications
    try {
        const facultyUser = await User.findOne({ user_id: faculty_id });

        // 1. Notify Faculty (Officer Graded)
        await createNotification({
            recipient: faculty_id,
            sender: req.user?.id,
            type: status?.includes('Query') ? 'APAR_SUBMISSION' : 'APAR_COMPLETED',
            title: status?.includes('Query') ? 'Query Raised by Reviewing Officer' : 'APAR Review Completed',
            message: status?.includes('Query')
                ? `Reviewing Officer has raised a query on your APAR for AY ${ay}.`
                : `Your APAR for AY ${ay} has been successfully reviewed and accepted.`,
            link: '/apar-form'
        });

        // 2. Notify Reporting Officer (since they already verified it)
        // if (facultyUser?.reporting_officer_id) {
        //     await createNotification({
        //         recipient: facultyUser.reporting_officer_id,
        //         sender: req.user?.id,
        //         type: status?.includes('Query') ? 'APAR_REVIEW_REQUEST' : 'APAR_COMPLETED',
        //         title: status?.includes('Query') ? 'Query Raised by Reviewing Officer' : 'APAR Flow Completed',
        //         message: status?.includes('Query')
        //             ? `Reviewing Officer has raised a query on ${facultyUser.name || faculty_id}'s APAR (AY ${ay}), which you previously verified.`
        //             : `The APAR for ${facultyUser.name || faculty_id} (AY ${ay}) has been finalized and accepted by the Reviewing Officer.`,
        //         link: '/apar/reporting'
        //     });
        // }
    } catch (notifErr) {
        console.error("Review remarks notification failed:", notifErr);
    }

    return res.status(200).json(new ApiResponse(200, form, "Review remarks submitted"));
});


const listAllForms = asyncHandler(async (req, res) => {
    const { ay } = req.query;
    if (!ay) throw new ApiError(400, "Academic year (ay) is required");

    const query = await buildListFormsQuery(req.user, ay);
    const forms = await AparForm.find(query).sort({ updatedAt: -1 });
    const list = forms.map(f => ({
        faculty_id: f.faculty_id,
        ay: f.ay,
        name: f.personal?.name,
        designation: f.personal?.designation,
        dept_name: f.personal?.department_id,
        status: f.status,
        date: f.updatedAt
    }));

    return res.status(200).json(new ApiResponse(200, list, "All forms for AY fetched"));
});

const getFacultyInfo = asyncHandler(async (req, res) => {
    let faculty_id = req.user?.userId || req.user?.faculty_id || req.user?.id;
    faculty_id = await resolveToReadableId(faculty_id);
    await assertFacultyAccess(req.user, faculty_id);

    if (!faculty_id) throw new ApiError(401, "Not logged in or missing faculty ID");

    let faculty = await findFacultyById(faculty_id);

    // If no faculty record, try fetching from User model (for administrative roles)
    if (!faculty) {
        const user = await User.findOne({ user_id: faculty_id });
        if (user) {
            faculty = {
                faculty_id: user.user_id,
                name: user.name,
                email: user.email,
                designation: user.designation,
                department_id: user.department_id,
                // Add empty defaults for other fields to prevent frontend issues
                qualification: '',
                joining_date: null,
                date_of_birth: null,
                sc_st_status: '',
                phone: '',
                grade: ''
            };
        }
    }

    return res.status(200).json(new ApiResponse(200, faculty || {}, "Faculty info fetched"));
});



/**
 * Prevent duplicates across faculty APARs
 * When Faculty A saves a collaborative entry, sync to Faculty B's APAR
 */
const preventCrossFacultyDuplicates = async (submittingFacultyId, academicYear, researchData) => {
    if (!researchData) return;

    const entriesToCheck = [
        { type: 'journals', data: researchData.journals || [] },
        { type: 'conferences', data: researchData.conferences || [] },
        { type: 'books', data: researchData.books || [] },
        { type: 'patents', data: researchData.patents || [] },
        { type: 'projects', data: researchData.projects || [] }
    ];

    for (const { type, data } of entriesToCheck) {
        for (const entry of data) {
            // Check if entry has multiple faculty members
            const facultyMembers = entry.faculty_members || entry.faculty_involved || [];

            // Should be more than 1 member to be collaborative
            // And ensure it's an array and has items
            if (Array.isArray(facultyMembers) && facultyMembers.length > 1) {
                // Get other faculty IDs (excluding the one who submitted)
                const otherFacultyIds = facultyMembers
                    .map(f => f.faculty_id || f)
                    .filter(id => id && id !== submittingFacultyId);

                // Process each other faculty member
                for (const otherFacultyId of otherFacultyIds) {
                    await handleCrossFacultyEntry(
                        otherFacultyId,
                        academicYear,
                        type, // e.g., 'journals'
                        entry,
                        submittingFacultyId
                    );
                }
            }
        }
    }
};

/**
 * Handle cross-faculty entry
 * Options: 1) Auto-remove duplicate, 2) Mark as synced, 3) Notify
 */
const handleCrossFacultyEntry = async (
    otherFacultyId,
    academicYear,
    entryType, // plural, e.g. 'journals'
    entry,
    submittedBy
) => {
    // Find other faculty's APAR form
    const otherAparForm = await AparForm.findOne({
        faculty_id: otherFacultyId,
        ay: academicYear, // Use 'ay' consistent with schema
        status: 'Draft' // Only modify drafts
    });

    if (!otherAparForm) return; // No form or not in draft, skip

    // Get current research section
    // Check if research object exists, if not create/ignore
    if (!otherAparForm.research) return;

    const researchSection = otherAparForm.research || {};
    const entries = researchSection[entryType] || [];

    if (entries.length === 0) return;

    // Find duplicate entry in other faculty's draft
    const duplicateIndex = entries.findIndex(e =>
        isDuplicateEntry(e, entry, entryType)
    );

    if (duplicateIndex !== -1) {
        // OPTION 1: Auto-remove duplicate
        const removedEntry = entries[duplicateIndex];
        entries.splice(duplicateIndex, 1);

        // Update the specific section
        researchSection[entryType] = entries;

        // Save form with minimize false to ensure empty arrays are saved if needed
        // But better to use findOneAndUpdate to be safe with concurrent edits?
        // Since we loaded generic form, let's use the instance save
        otherAparForm.research = researchSection;
        otherAparForm.markModified('research');
        await otherAparForm.save();

        // Emit Socket event to notify other faculty
        const { emitCrossFacultyUpdate } = await import('../config/socket.js');

        const entryTitle = entry.title || entry.title_of_paper || entry.title_of_book || entry.patent_title || entry.title_research || 'Entry';

        emitCrossFacultyUpdate(otherFacultyId, academicYear, {
            type: entryType.slice(0, -1), // 'journals' -> 'journal'
            action: 'removed_duplicate',
            submittedBy,
            entryTitle: entryTitle
        });

        console.log(`✅ Removed duplicate ${entryType} from ${otherFacultyId}'s draft`);
    }
};

/**
 * Check if two entries are duplicates
 */
const isDuplicateEntry = (entry1, entry2, type) => {
    if (!entry1 || !entry2) return false;

    // Helper to normalize strings: lowercase, trim
    const normalize = (str) => String(str || '').trim().toLowerCase();

    // Helper: compares if ALL keys match
    // But entries structure might differ slightly, so we stick to key fields

    switch (type) {
        case 'journals':
            // Check Title AND Journal Name AND Year
            return normalize(entry1.title || entry1.title_of_paper) === normalize(entry2.title || entry2.title_of_paper) &&
                normalize(entry1.name_of_journal) === normalize(entry2.name_of_journal) &&
                normalize(entry1.year_of_publication) === normalize(entry2.year_of_publication || entry2.year);

        case 'conferences':
            // Check Title AND Conference Name
            return normalize(entry1.title || entry1.title_of_paper) === normalize(entry2.title || entry2.title_of_paper) &&
                normalize(entry1.name_of_conference) === normalize(entry2.name_of_conference);

        case 'books':
            // Check Book Title OR ISBN (if available)
            if (entry1.isbn_number && entry2.isbn_number) {
                return normalize(entry1.isbn_number) === normalize(entry2.isbn_number);
            }
            return normalize(entry1.title_of_book) === normalize(entry2.title_of_book) &&
                normalize(entry1.title_of_chapter) === normalize(entry2.title_of_chapter);

        case 'patents':
            return normalize(entry1.patent_title) === normalize(entry2.patent_title) &&
                normalize(entry1.application_number) === normalize(entry2.application_number);

        case 'projects':
            return normalize(entry1.title_research) === normalize(entry2.title_research) &&
                normalize(entry1.funding_agency_name) === normalize(entry2.funding_agency_name);

        default:
            return false;
    }
};

export {
    getForm,
    getFacultyHistory,
    saveForm,
    submitForm,
    getPendingReporting,
    submitReportingAssessment,
    getPendingReviewing,
    submitReviewingRemarks,
    listAllForms,
    getFacultyInfo,
    saveToMonthlyData,
    syncIqacToAparForm  // Export for auto-sync utility
};
