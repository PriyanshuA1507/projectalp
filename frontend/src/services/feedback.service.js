import { Api } from '../api/Api.js';

class FeedbackService {
    constructor() {
        this.api = new Api(import.meta.env.VITE_BASEURL);
    }

    async analyze(type, file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.api.post(`/feedback/analyze/${type}`, formData, {
            'Content-Type': 'multipart/form-data',
        });
    }

    // Legacy helpers
    async analyzeFacultyFeedback(file) {
        return this.analyze('teacher-course', file);
    }

    async analyzeCourseFeedback(file) {
        return this.analyze('course', file);
    }

    async analyzeProgramFeedback(file) {
        return this.analyze('alumni', file);
    }
}

export const feedbackService = new FeedbackService();
