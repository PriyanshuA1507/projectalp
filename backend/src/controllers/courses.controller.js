// // // import { asyncHandler } from "../utils/async-handler.js"
// // // import { ApiError } from "../utils/api-error.js"
// // // import { ApiResponse } from "../utils/api-response.js"
// // // import { set, get, getByCourseId, getByProgrammeId, getByDepartmentId, update, deleteCourse } from "../data-access/courses.data-access.js"

// // // const enterData = asyncHandler(async (req, res) => {
// // //     const data = req.body

// // //     // Validation based on tableConfig required fields
// // //     const requiredFields = ['course_name', 'course_code', 'department_id', 'credits', 'semester_offered', 'type', 'year_of_introduction'];
// // //     const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);
// // //     if (missingFields.length > 0) {
// // //         throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
// // //     }

// // //     const loggedInUser = {
// // //         id: req.user?.id,
// // //         userId: req.user?.userId || req.user?.id,
// // //         role: req.user?.role
// // //     }

// // //     await set(data, loggedInUser)

// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, {}, "data entry done successfully !")
// // //         )
// // // })

// // // const getData = asyncHandler(async (req, res) => {
// // //     const { role, departmentId } = req.user || {};
// // //     let response;
// // //     if (role === 'Department HOD' && departmentId) {
// // //         response = await getByDepartmentId(departmentId);
// // //     } else {
// // //         response = await get();
// // //     }

// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, response, "data sent successfully !")
// // //         )
// // // })

// // // const updateData = asyncHandler(async (req, res) => {
// // //     const { id } = req.params
// // //     const data = req.body
// // //     if (!id) {
// // //         throw new ApiError(400, "id is required")
// // //     }
// // //     const loggedInUser = {
// // //         id: req.user?.id,
// // //         userId: req.user?.userId || req.user?.id,
// // //         role: req.user?.role
// // //     }
// // //     const result = await update(id, data, loggedInUser)
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, result, "data updated successfully !")
// // //         )
// // // })

// // // const deleteData = asyncHandler(async (req, res) => {
// // //     const { id } = req.params
// // //     if (!id) {
// // //         throw new ApiError(400, "id is required")
// // //     }
// // //     await deleteCourse(id)
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, {}, "data deleted successfully !")
// // //         )
// // // })

// // // const getById = asyncHandler(async (req, res) => {
// // //     const { id } = req.params
// // //     if (!id) {
// // //         throw new ApiError(400, "id is required")
// // //     }
// // //     const response = await getByCourseId(id)
// // //     if (!response) {
// // //         throw new ApiError(404, "record not found")
// // //     }
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, response, "data sent successfully !")
// // //         )
// // // })

// // // const getByDepartment = asyncHandler(async (req, res) => {
// // //     const { department_id } = req.params
// // //     if (!department_id) {
// // //         throw new ApiError(400, "department_id is required")
// // //     }
// // //     const response = await getByDepartmentId(department_id)
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, response, "data sent successfully !")
// // //         )
// // // })

// // // export {
// // //     enterData,
// // //     getData,
// // //     updateData,
// // //     deleteData,
// // //     getById,
// // //     getByDepartment
// // // }

// // // import { asyncHandler } from "../utils/async-handler.js"
// // // import { ApiError } from "../utils/api-error.js"
// // // import { ApiResponse } from "../utils/api-response.js"
// // // import { set, get, getByCourseId, getByProgrammeId, getByDepartmentId, update, deleteCourse } from "../data-access/courses.data-access.js"

// // // // --- NEW IMPORTS FOR DATA INTEGRITY CHECKS ---
// // // import { Department } from '../models/department.model.js';
// // // import { Programme } from '../models/programme.model.js';
// // // import { Course } from '../models/course.model.js';
// // // import { ensureRecordExists } from '../utils/db-validation.util.js';
// // // // ---------------------------------------------

// // // const enterData = asyncHandler(async (req, res) => {
// // //     const data = req.body

// // //     // Validation based on tableConfig required fields
// // //     const requiredFields = ['course_name', 'course_code', 'department_id', 'credits', 'semester_offered', 'type', 'year_of_introduction'];
// // //     const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);
// // //     if (missingFields.length > 0) {
// // //         throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
// // //     }

// // //     // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
// // //     // 1. Check for Duplicate Course Code
// // //     if (data.course_code) {
// // //         const courseExists = await Course.exists({ course_code: data.course_code });
// // //         if (courseExists) throw new ApiError(400, "A Course with this course code already exists.");
// // //     }

// // //     // 2. Verify Department Exists
// // //     if (data.department_id) {
// // //         await ensureRecordExists(
// // //             Department, 
// // //             { _id: data.department_id }, 
// // //             `The selected Department does not exist in the system.`
// // //         );
// // //     }

// // //     // 3. Verify Programme Exists (If provided)
// // //     if (data.programme_id) {
// // //         await ensureRecordExists(
// // //             Programme, 
// // //             { _id: data.programme_id }, 
// // //             `The selected Programme does not exist in the system.`
// // //         );
// // //     }
// // //     // -------------------------------------------

// // //     const loggedInUser = {
// // //         id: req.user?.id,
// // //         userId: req.user?.userId || req.user?.id,
// // //         role: req.user?.role
// // //     }

// // //     await set(data, loggedInUser)

// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, {}, "data entry done successfully !")
// // //         )
// // // })

// // // const getData = asyncHandler(async (req, res) => {
// // //     const { role, departmentId } = req.user || {};
// // //     let response;
// // //     if (role === 'Department HOD' && departmentId) {
// // //         response = await getByDepartmentId(departmentId);
// // //     } else {
// // //         response = await get();
// // //     }

// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, response, "data sent successfully !")
// // //         )
// // // })

// // // const updateData = asyncHandler(async (req, res) => {
// // //     const { id } = req.params
// // //     const data = req.body
// // //     if (!id) {
// // //         throw new ApiError(400, "id is required")
// // //     }

// // //     // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
// // //     // Only query the DB if the user is actively attempting to change the FK fields
// // //     if (data.department_id) {
// // //         await ensureRecordExists(
// // //             Department, 
// // //             { _id: data.department_id }, 
// // //             `The selected Department does not exist in the system.`
// // //         );
// // //     }

// // //     if (data.programme_id) {
// // //         await ensureRecordExists(
// // //             Programme, 
// // //             { _id: data.programme_id }, 
// // //             `The selected Programme does not exist in the system.`
// // //         );
// // //     }
// // //     // -------------------------------------------

// // //     const loggedInUser = {
// // //         id: req.user?.id,
// // //         userId: req.user?.userId || req.user?.id,
// // //         role: req.user?.role
// // //     }
// // //     const result = await update(id, data, loggedInUser)
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, result, "data updated successfully !")
// // //         )
// // // })

// // // const deleteData = asyncHandler(async (req, res) => {
// // //     const { id } = req.params
// // //     if (!id) {
// // //         throw new ApiError(400, "id is required")
// // //     }
// // //     await deleteCourse(id)
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, {}, "data deleted successfully !")
// // //         )
// // // })

// // // const getById = asyncHandler(async (req, res) => {
// // //     const { id } = req.params
// // //     if (!id) {
// // //         throw new ApiError(400, "id is required")
// // //     }
// // //     const response = await getByCourseId(id)
// // //     if (!response) {
// // //         throw new ApiError(404, "record not found")
// // //     }
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, response, "data sent successfully !")
// // //         )
// // // })

// // // const getByDepartment = asyncHandler(async (req, res) => {
// // //     const { department_id } = req.params
// // //     if (!department_id) {
// // //         throw new ApiError(400, "department_id is required")
// // //     }
// // //     const response = await getByDepartmentId(department_id)
// // //     res.status(200)
// // //         .json(
// // //             new ApiResponse(200, response, "data sent successfully !")
// // //         )
// // // })

// // // export {
// // //     enterData,
// // //     getData,
// // //     updateData,
// // //     deleteData,
// // //     getById,
// // //     getByDepartment
// // // }

// // import { asyncHandler } from "../utils/async-handler.js"
// // import { ApiError } from "../utils/api-error.js"
// // import { ApiResponse } from "../utils/api-response.js"
// // import { set, get, getByCourseId, getByProgrammeId, getByDepartmentId, update, deleteCourse } from "../data-access/courses.data-access.js"

// // // --- NEW IMPORTS FOR DATA INTEGRITY CHECKS ---
// // import { Department } from '../models/department.model.js';
// // import { Programme } from '../models/programme.model.js';
// // import { Course } from '../models/course.model.js';
// // import { ensureRecordExists } from '../utils/db-validation.util.js';
// // // ---------------------------------------------

// // const enterData = asyncHandler(async (req, res) => {
// //     const data = req.body

// //     // Validation based on tableConfig required fields
// //     const requiredFields = ['course_name', 'course_code', 'department_id', 'credits', 'semester_offered', 'type', 'year_of_introduction'];
// //     const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);
// //     if (missingFields.length > 0) {
// //         throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
// //     }

// //     // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
// //     // 1. Verify Department Exists
// //     if (data.department_id) {
// //         await ensureRecordExists(
// //             Department, 
// //             { _id: data.department_id }, 
// //             `The selected Department does not exist in the system.`
// //         );
// //     }

// //     // 2. Verify Programme Exists (If provided)
// //     if (data.programme_id) {
// //         await ensureRecordExists(
// //             Programme, 
// //             { _id: data.programme_id }, 
// //             `The selected Programme does not exist in the system.`
// //         );
// //     }
// //     // -------------------------------------------

// //     const loggedInUser = {
// //         id: req.user?.id,
// //         userId: req.user?.userId || req.user?.id,
// //         role: req.user?.role
// //     }

// //     try {
// //         await set(data, loggedInUser);
// //         res.status(200).json(new ApiResponse(200, {}, "data entry done successfully !"));
// //     } catch (error) {
// //         // 🚀 USER-FRIENDLY DUPLICATE KEY HANDLING
// //         if (error.code === 11000) {
// //             throw new ApiError(400, "A Course with this course code already exists. Please use a unique code.");
// //         }
// //         throw error;
// //     }
// // })

// // const getData = asyncHandler(async (req, res) => {
// //     const { role, departmentId } = req.user || {};
// //     let response;
// //     if (role === 'Department HOD' && departmentId) {
// //         response = await getByDepartmentId(departmentId);
// //     } else {
// //         response = await get();
// //     }

// //     res.status(200).json(new ApiResponse(200, response, "data sent successfully !"));
// // })

// // const updateData = asyncHandler(async (req, res) => {
// //     const { id } = req.params
// //     const data = req.body
// //     if (!id) {
// //         throw new ApiError(400, "id is required")
// //     }

// //     // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
// //     if (data.department_id) {
// //         await ensureRecordExists(Department, { _id: data.department_id }, `The selected Department does not exist.`);
// //     }
// //     if (data.programme_id) {
// //         await ensureRecordExists(Programme, { _id: data.programme_id }, `The selected Programme does not exist.`);
// //     }
// //     // -------------------------------------------

// //     const loggedInUser = {
// //         id: req.user?.id,
// //         userId: req.user?.userId || req.user?.id,
// //         role: req.user?.role
// //     }

// //     try {
// //         const result = await update(id, data, loggedInUser);
// //         res.status(200).json(new ApiResponse(200, result, "data updated successfully !"));
// //     } catch (error) {
// //         if (error.code === 11000) {
// //             throw new ApiError(400, "This Course Code is already in use by another course.");
// //         }
// //         throw error;
// //     }
// // })

// // const deleteData = asyncHandler(async (req, res) => {
// //     const { id } = req.params
// //     if (!id) {
// //         throw new ApiError(400, "id is required")
// //     }
// //     await deleteCourse(id)
// //     res.status(200).json(new ApiResponse(200, {}, "data deleted successfully !"))
// // })

// // const getById = asyncHandler(async (req, res) => {
// //     const { id } = req.params
// //     if (!id) {
// //         throw new ApiError(400, "id is required")
// //     }
// //     const response = await getByCourseId(id)
// //     if (!response) {
// //         throw new ApiError(404, "record not found")
// //     }
// //     res.status(200).json(new ApiResponse(200, response, "data sent successfully !"))
// // })

// // const getByDepartment = asyncHandler(async (req, res) => {
// //     const { department_id } = req.params
// //     if (!department_id) {
// //         throw new ApiError(400, "department_id is required")
// //     }
// //     const response = await getByDepartmentId(department_id)
// //     res.status(200).json(new ApiResponse(200, response, "data sent successfully !"))
// // })

// // export {
// //     enterData,
// //     getData,
// //     updateData,
// //     deleteData,
// //     getById,
// //     getByDepartment
// // }

// import { asyncHandler } from "../utils/async-handler.js"
// import { ApiError } from "../utils/api-error.js"
// import { ApiResponse } from "../utils/api-response.js"
// import { set, get, getByCourseId, getByProgrammeId, getByDepartmentId, update, deleteCourse } from "../data-access/courses.data-access.js"

// // --- NEW IMPORTS FOR DATA INTEGRITY CHECKS ---
// import { Department } from '../models/department.model.js';
// import { Programme } from '../models/programme.model.js';
// import { Course } from '../models/course.model.js';
// import { ensureRecordExists } from '../utils/db-validation.util.js';
// // ---------------------------------------------

// const enterData = asyncHandler(async (req, res) => {
//     const data = req.body

//     // Validation based on tableConfig required fields
//     const requiredFields = ['course_name', 'course_code', 'department_id', 'credits', 'semester_offered', 'type', 'year_of_introduction'];
//     const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);
//     if (missingFields.length > 0) {
//         throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
//     }

//     // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
//     // 1. Verify Department Exists
//     if (data.department_id) {
//         await ensureRecordExists(
//             Department, 
//             { _id: data.department_id }, 
//             `The selected Department does not exist in the system.`
//         );
//     }

//     // 2. Verify Programme Exists (If provided)
//     if (data.programme_id) {
//         await ensureRecordExists(
//             Programme, 
//             { _id: data.programme_id }, 
//             `The selected Programme does not exist in the system.`
//         );
//     }
//     // -------------------------------------------

//     const loggedInUser = {
//         id: req.user?.id,
//         userId: req.user?.userId || req.user?.id,
//         role: req.user?.role
//     }

//     try {
//         await set(data, loggedInUser);
//         res.status(200).json(new ApiResponse(200, {}, "data entry done successfully !"));
//     } catch (error) {
//         // 🚀 USER-FRIENDLY DUPLICATE KEY HANDLING
//         if (error.code === 11000) {
//             throw new ApiError(400, "A Course with this course code already exists. Please use a unique code.");
//         }
//         throw error;
//     }
// })

// const getData = asyncHandler(async (req, res) => {
//     const { role, departmentId } = req.user || {};
//     let response;
//     if (role === 'Department HOD' && departmentId) {
//         response = await getByDepartmentId(departmentId);
//     } else {
//         response = await get();
//     }

//     res.status(200).json(new ApiResponse(200, response, "data sent successfully !"));
// })

// const updateData = asyncHandler(async (req, res) => {
//     const { id } = req.params
//     const data = req.body
//     if (!id) {
//         throw new ApiError(400, "id is required")
//     }

//     // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
//     if (data.department_id) {
//         await ensureRecordExists(Department, { _id: data.department_id }, `The selected Department does not exist.`);
//     }
//     if (data.programme_id) {
//         await ensureRecordExists(Programme, { _id: data.programme_id }, `The selected Programme does not exist.`);
//     }
//     // -------------------------------------------

//     const loggedInUser = {
//         id: req.user?.id,
//         userId: req.user?.userId || req.user?.id,
//         role: req.user?.role
//     }

//     try {
//         const result = await update(id, data, loggedInUser);
//         res.status(200).json(new ApiResponse(200, result, "data updated successfully !"));
//     } catch (error) {
//         if (error.code === 11000) {
//             throw new ApiError(400, "This Course Code is already in use by another course.");
//         }
//         throw error;
//     }
// })

// const deleteData = asyncHandler(async (req, res) => {
//     const { id } = req.params
//     if (!id) {
//         throw new ApiError(400, "id is required")
//     }
//     await deleteCourse(id)
//     res.status(200).json(new ApiResponse(200, {}, "data deleted successfully !"))
// })

// const getById = asyncHandler(async (req, res) => {
//     const { id } = req.params
//     if (!id) {
//         throw new ApiError(400, "id is required")
//     }
//     const response = await getByCourseId(id)
//     if (!response) {
//         throw new ApiError(404, "record not found")
//     }
//     res.status(200).json(new ApiResponse(200, response, "data sent successfully !"))
// })

// const getByDepartment = asyncHandler(async (req, res) => {
//     const { department_id } = req.params
//     if (!department_id) {
//         throw new ApiError(400, "department_id is required")
//     }
//     const response = await getByDepartmentId(department_id)
//     res.status(200).json(new ApiResponse(200, response, "data sent successfully !"))
// })

// export {
//     enterData,
//     getData,
//     updateData,
//     deleteData,
//     getById,
//     getByDepartment
// }
import { asyncHandler } from "../utils/async-handler.js"
import { ApiError } from "../utils/api-error.js"
import { ApiResponse } from "../utils/api-response.js"
import { set, get, getByCourseId, getByProgrammeId, getByDepartmentId, update, deleteCourse } from "../data-access/courses.data-access.js"

// --- NEW IMPORTS FOR DATA INTEGRITY CHECKS ---
import { Department } from '../models/department.model.js';
import { Programme } from '../models/programme.model.js';
import { Course } from '../models/course.model.js';
import { ensureRecordExists } from '../utils/db-validation.util.js';
// ---------------------------------------------

const enterData = asyncHandler(async (req, res) => {
    const data = req.body

    // Validation based on tableConfig required fields
    const requiredFields = ['course_name', 'course_code', 'department_id', 'credits', 'semester_offered', 'type', 'year_of_introduction'];
    const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);
    if (missingFields.length > 0) {
        throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
    // Using { department_id: data.department_id } instead of { _id: ... }
    // This assumes your Department model stores the "CSE" string in 'department_id'
    if (data.department_id) {
        await ensureRecordExists(
            Department, 
            { department_id: data.department_id }, 
            `The selected Department (${data.department_id}) does not exist.`
        );
    }

    if (data.programme_id) {
        await ensureRecordExists(
            Programme, 
            { programme_id: data.programme_id }, // Adjusted to match your schema key
            `The selected Programme (${data.programme_id}) does not exist.`
        );
    }
    // -------------------------------------------

    const loggedInUser = {
        id: req.user?.id,
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role
    }

    try {
        await set(data, loggedInUser);
        res.status(200).json(new ApiResponse(200, {}, "data entry done successfully !"));
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(400, "A Course with this course code already exists. Please use a unique code.");
        }
        throw error;
    }
})

const getData = asyncHandler(async (req, res) => {
    const { role, departmentId } = req.user || {};
    let response;
    if (role === 'Department HOD' && departmentId) {
        response = await getByDepartmentId(departmentId);
    } else {
        response = await get();
    }

    res.status(200).json(new ApiResponse(200, response, "data sent successfully !"));
})

const updateData = asyncHandler(async (req, res) => {
    const { id } = req.params
    const data = req.body
    if (!id) {
        throw new ApiError(400, "id is required")
    }

    // --- STEP 2: RELATIONAL INTEGRITY CHECKS ---
    if (data.department_id) {
        await ensureRecordExists(Department, { department_id: data.department_id }, `The selected Department does not exist.`);
    }
    if (data.programme_id) {
        await ensureRecordExists(Programme, { programme_id: data.programme_id }, `The selected Programme does not exist.`);
    }
    // -------------------------------------------

    const loggedInUser = {
        id: req.user?.id,
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role
    }

    try {
        const result = await update(id, data, loggedInUser);
        res.status(200).json(new ApiResponse(200, result, "data updated successfully !"));
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(400, "This Course Code is already in use by another course.");
        }
        throw error;
    }
})

const deleteData = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) {
        throw new ApiError(400, "id is required")
    }
    await deleteCourse(id)
    res.status(200).json(new ApiResponse(200, {}, "data deleted successfully !"))
})

const getById = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) {
        throw new ApiError(400, "id is required")
    }
    const response = await getByCourseId(id)
    if (!response) {
        throw new ApiError(404, "record not found")
    }
    res.status(200).json(new ApiResponse(200, response, "data sent successfully !"))
})

const getByDepartment = asyncHandler(async (req, res) => {
    const { department_id } = req.params
    if (!department_id) {
        throw new ApiError(400, "department_id is required")
    }
    const response = await getByDepartmentId(department_id)
    res.status(200).json(new ApiResponse(200, response, "data sent successfully !"))
})

export {
    enterData,
    getData,
    updateData,
    deleteData,
    getById,
    getByDepartment
}