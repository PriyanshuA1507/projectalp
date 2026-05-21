import { Router } from 'express';
import multer from 'multer';
import {
    analyzeAlumniFeedback,
    analyzeCourseFeedback,
    analyzeEmployerFeedback,
    analyzeExitSurveyFeedback,
    analyzeInfrastructureFeedback,
    analyzeParentFeedback,
    analyzeTeacherCourseFeedback,
    analyzeFacultyFeedback,
    analyzeProgramFeedback,
} from '../controllers/feedback.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze/alumni', upload.single('file'), analyzeAlumniFeedback);
router.post('/analyze/course', upload.single('file'), analyzeCourseFeedback);
router.post('/analyze/employer', upload.single('file'), analyzeEmployerFeedback);
router.post('/analyze/exit-survey', upload.single('file'), analyzeExitSurveyFeedback);
router.post('/analyze/infrastructure', upload.single('file'), analyzeInfrastructureFeedback);
router.post('/analyze/parent', upload.single('file'), analyzeParentFeedback);
router.post('/analyze/teacher-course', upload.single('file'), analyzeTeacherCourseFeedback);

// Legacy routes kept for backward compatibility
router.post('/analyze/faculty', upload.single('file'), analyzeFacultyFeedback);
router.post('/analyze/program', upload.single('file'), analyzeProgramFeedback);

export default router;
