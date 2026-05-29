import { ApiError } from './api-error.js';

/**
 * Checks if a record exists in the database.
 * @param {Model} Model - The Mongoose Model to check against.
 * @param {Object} query - The query object (e.g., { department_id: req.body.department_id }).
 * @param {String} errorMessage - The error message to throw if not found.
 */
export const ensureRecordExists = async (Model, query, errorMessage) => {
    const exists = await Model.exists(query);
    if (!exists) {
        throw new ApiError(400, errorMessage);
    }
};