import { z } from 'zod';
import { isDateWithinSession } from '../utils/academicYear.util.js'; // Ensure you have this utility created

// --- REUSABLE REGEX PATTERNS ---
const phoneRegex = /^[6-9]\d{9}$/; // Standard 10-digit Indian mobile number
const alphaNumericRegex = /^[a-zA-Z0-9_-]+$/;
const academicYearRegex = /^20\d{2}-20\d{2}$|^20\d{2}-\d{2}$/; // e.g. 2025-2026 or 2025-26

// --- HELPER: Dropdown Validation ---
// Prevents submitting the default placeholder value like "default" or ""
const strictDropdown = (message) => z.string().trim().refine(val => val !== 'default' && val !== '', { message });

// ==========================================
// 1. COURSES
// ==========================================
export const courseSchema = z.object({
  body: z.object({
    course_id: z.string().trim().min(1, "Course ID is required"),
    course_code: z.string().trim().min(1, "Course code is required"),
    course_name: z.string().trim().min(1, "Course name is required"),
    department_id: strictDropdown("Please select a valid Department"),
    programme_id: strictDropdown("Please select a valid Programme").optional(),
    credits: z.number({ required_error: "Credits are required", invalid_type_error: "Credits must be a number" }).positive("Credits must be > 0"),
    semester_offered: z.number().int().min(1, "Semester must be at least 1").max(10, "Invalid semester"),
    type: strictDropdown("Course type must be selected"),
    year_of_introduction: z.string().min(4, "Enter a valid year")
  })
});

// ==========================================
// 2. DEPARTMENTS
// ==========================================
export const departmentSchema = z.object({
  body: z.object({
    department_id: z.string().trim().min(1, "Department ID is required").regex(alphaNumericRegex, "Invalid characters in ID"),
    department_name: z.string().trim().min(2, "Department name must be at least 2 characters"),
    head_of_department: z.string().optional()
  })
});

// ==========================================
// 3. FACULTY
// ==========================================
export const facultySchema = z.object({
  body: z.object({
    faculty_id: z.string().trim().min(1, "Faculty ID is required"),
    department_id: strictDropdown("Please select a valid Department"),
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    email: z.string().email("Please provide a valid email format"),
    phone: z.string().regex(phoneRegex, "Phone must be a valid 10-digit number"),
    designation: strictDropdown("Designation must be selected")
  })
});

// ==========================================
// 4. PROGRAMMES
// ==========================================
export const programmeSchema = z.object({
  body: z.object({
    programme_id: z.string().trim().min(1, "Programme ID is required"),
    department_id: strictDropdown("Please select a valid Department"),
    programme_name: z.string().trim().min(2, "Programme name is required"),
    programme_type: strictDropdown("Programme type is required")
  })
});

// ==========================================
// 5. STUDENTS
// ==========================================
export const studentSchema = z.object({
  body: z.object({
    student_id: z.string().trim().min(1, "Enrollment/Student ID is required"),
    department_id: strictDropdown("Please select a valid Department"),
    programme_id: strictDropdown("Please select a valid Programme"),
    first_name: z.string().trim().min(1, "First name is required"),
    email: z.string().email("Please provide a valid email format"),
    enrollment_year: z.number().int().min(2000).max(new Date().getFullYear())
  })
});

// ==========================================
// 6. TEACHERS USING ICT
// ==========================================
export const teachersUsingIctSchema = z.object({
  body: z.object({
    faculty_id: strictDropdown("Faculty selection is required"),
    academic_year: z.string().regex(academicYearRegex, "Invalid academic year format"),
    ict_tools_used: z.string().trim().min(1, "Please specify the ICT tools used"),
    number_of_students_benefited: z.number().int().nonnegative("Cannot be negative"),
  })
});

// ==========================================
// 7. STUDENT CENTRIC METHODS
// ==========================================
export const studentCentricMethodsSchema = z.object({
  body: z.object({
    department_id: strictDropdown("Please select a valid Department"),
    academic_year: z.string().regex(academicYearRegex, "Invalid academic year format"),
    method_type: strictDropdown("Method type must be selected"),
    description: z.string().trim().min(10, "Description must be at least 10 characters long"),
    evidence_document_url: z.string().url("Must be a valid URL").optional().or(z.literal(''))
  })
});

// ==========================================
// 8. MENTORS STRESS SUPPORT
// ==========================================
export const mentorsStressSupportSchema = z.object({
  body: z.object({
    faculty_id: strictDropdown("Mentor selection is required"),
    department_id: strictDropdown("Department selection is required"),
    academic_year: z.string().regex(academicYearRegex, "Invalid academic year format"),
    students_assigned: z.number().int().positive("Must assign at least 1 student"),
    issues_resolved: z.number().int().nonnegative("Cannot be negative"),
  }).refine(data => data.issues_resolved <= data.students_assigned, {
    message: "Issues resolved cannot exceed students assigned",
    path: ["issues_resolved"]
  })
});

// ==========================================
// 9. IT INFRASTRUCTURE STOCK
// ==========================================
export const itInfrastructureSchema = z.object({
  body: z.object({
    department_id: strictDropdown("Department selection is required"),
    academic_year: z.string().regex(academicYearRegex, "Invalid academic year format"),
    equipment_type: strictDropdown("Equipment type must be selected"),
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    date_of_purchase: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date format" })
  }).refine(data => isDateWithinSession(data.date_of_purchase, data.academic_year), {
    message: "Purchase date must fall within the selected academic session",
    path: ["date_of_purchase"]
  })
});

// ==========================================
// 10. DEPT LIBRARY BOOKS
// ==========================================
export const deptLibraryBooksSchema = z.object({
  body: z.object({
    department_id: strictDropdown("Department selection is required"),
    academic_year: z.string().regex(academicYearRegex, "Invalid academic year format"),
    book_title: z.string().trim().min(1, "Book title is required"),
    isbn: z.string().trim().min(10, "Valid ISBN is required"),
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    purchase_date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date format" })
  }).refine(data => isDateWithinSession(data.purchase_date, data.academic_year), {
    message: "Purchase date must fall within the selected academic session",
    path: ["purchase_date"]
  })
});