import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

const FEEDBACK_CONTEXTS = {
    alumni: `
You are an expert academic quality assurance analyst.

Analyze ALUMNI FEEDBACK FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names (institutions, departments, individuals, companies).
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Program Value, Curriculum Relevance, Faculty Quality, Campus Experience, Career Outcomes, Alumni Engagement
`,
    course: `
You are an expert academic curriculum analyst.

Analyze COURSE FEEDBACK FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names.
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Content Relevance, Difficulty Level, Learning Outcomes, Practical Exposure, Assessment Design, Teaching Support
`,
    employer: `
You are an expert industry-academia collaboration analyst.

Analyze EMPLOYER FEEDBACK FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names.
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Graduate Employability, Technical Skills, Soft Skills, Industry Readiness, Curriculum Alignment, Training Effectiveness
`,
    exit_survey: `
You are an expert student outcomes analyst.

Analyze EXIT SURVEY FEEDBACK FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names.
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Overall Satisfaction, Program Quality, Support Services, Infrastructure, Career Preparation, Improvement Areas
`,
    infrastructure: `
You are an expert campus facilities analyst.

Analyze INFRASTRUCTURE & FACILITY FEEDBACK FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names.
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Classrooms, Laboratories, Library, Hostel, Sports Facilities, IT Infrastructure, Maintenance, Accessibility
`,
    parent: `
You are an expert stakeholder engagement analyst.

Analyze PARENT FEEDBACK FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names.
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Academic Quality, Student Safety, Communication, Discipline, Facilities, Value for Money, Overall Satisfaction
`,
    teacher_course: `
You are an expert teaching quality analyst.

Analyze TEACHER'S FEEDBACK ON COURSE FORM data.

Instructions:
- First provide ANALYSIS, then SUGGESTIONS.
- Use only the provided information.
- Do not mention any names.
- Keep the response concise and professionally formatted.
- Use Markdown with clear metric-based headings.

Focus Metrics:
Course Design, Syllabus Coverage, Resource Adequacy, Assessment Alignment, Student Preparedness, Coordination & Support
`,
};

const getGeminiModel = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new ApiError(500, 'Gemini API Key is not configured');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
};

const parseExcelFile = (buffer) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet);
    } catch (error) {
        throw new ApiError(400, 'Invalid file format. Please upload a valid Excel or CSV file.');
    }
};

const analyzeFeedback = async (req, res, promptContext) => {
    if (!req.file) {
        throw new ApiError(400, 'No file uploaded');
    }

    const data = parseExcelFile(req.file.buffer);
    if (!data || data.length === 0) {
        throw new ApiError(400, 'File is empty or could not be parsed');
    }

    const dataString = JSON.stringify(data).substring(0, 1000000);

    const model = getGeminiModel();
    const prompt = `
        Context: ${promptContext}
        
        Data:
        ${dataString}

        Please analyze the provided feedback data and give a detailed report containing:
        1. Key Strengths
        2. Areas for Improvement
        3. Specific Recommendations
        4. Sentiment/Mood Analysis (Overall sentiment)

        Format the output in clean Markdown.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json(
            new ApiResponse(200, { analysis: text }, 'Analysis completed successfully')
        );
    } catch (error) {
        console.error('Gemini API Error:', error);

        if (error.status === 429) {
            throw new ApiError(429, 'Quota exceeded. Please wait a moment and try again.');
        }

        throw new ApiError(502, 'Failed to generate analysis from AI service');
    }
};

const createAnalyzer = (type) => asyncHandler(async (req, res) => {
    const context = FEEDBACK_CONTEXTS[type];
    if (!context) {
        throw new ApiError(400, 'Invalid feedback type');
    }
    await analyzeFeedback(req, res, context);
});

export const analyzeAlumniFeedback = createAnalyzer('alumni');
export const analyzeCourseFeedback = createAnalyzer('course');
export const analyzeEmployerFeedback = createAnalyzer('employer');
export const analyzeExitSurveyFeedback = createAnalyzer('exit_survey');
export const analyzeInfrastructureFeedback = createAnalyzer('infrastructure');
export const analyzeParentFeedback = createAnalyzer('parent');
export const analyzeTeacherCourseFeedback = createAnalyzer('teacher_course');

// Legacy aliases (faculty/program mapped to closest form types)
export const analyzeFacultyFeedback = analyzeTeacherCourseFeedback;
export const analyzeProgramFeedback = analyzeAlumniFeedback;
