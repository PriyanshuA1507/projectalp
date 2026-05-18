import { User } from '../models/user.model.js';
import { Faculty } from '../models/faculty.model.js';

const isMongoObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

const resolveToReadableId = async (input_id) => {
    if (!isMongoObjectId(input_id)) return input_id;

    try {
        const user = await User.findById(input_id);
        if (user && user.user_id) {
            return user.user_id;
        }

        const faculty = await Faculty.findById(input_id);
        if (faculty && faculty.faculty_id) {
            return faculty.faculty_id;
        }
    } catch (e) {
        console.error('APAR ID resolution error:', e);
    }

    return input_id;
};

export { resolveToReadableId };
