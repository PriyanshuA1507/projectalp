import React, { useState } from 'react';
import {
    FiArrowLeft,
    FiUploadCloud,
    FiBookOpen,
    FiUserCheck,
    FiTarget,
    FiLoader,
    FiUsers,
    FiBriefcase,
    FiLogOut,
    FiHome,
    FiHeart,
    FiCpu,
    FiKey,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FEEDBACK_CONTEXTS, FEEDBACK_TYPE_MAP } from '../config/feedbackContexts.js';
import { parseFeedbackFile, summarizeFeedbackRows } from '../utils/parseFeedbackFile.js';
import {
    analyzeFeedbackWithHuggingFace,
    getConfiguredHfApiKey,
    hasConfiguredEnvHfApiKey,
} from '../services/huggingface.service.js';

const ANALYSIS_TYPES = [
    { id: 'alumni', apiType: 'alumni', title: 'Alumni Feedback', description: 'Program outcomes, campus experience, and career support.', icon: FiUsers, color: 'indigo' },
    { id: 'course', apiType: 'course', title: 'Course Feedback', description: 'Course content, difficulty, learning outcomes, and assessments.', icon: FiBookOpen, color: 'emerald' },
    { id: 'employer', apiType: 'employer', title: 'Employer Feedback', description: 'Graduate skills, employability, and curriculum alignment.', icon: FiBriefcase, color: 'blue' },
    { id: 'exit_survey', apiType: 'exit-survey', title: 'Exit Survey', description: 'Graduating student satisfaction and institutional support.', icon: FiLogOut, color: 'purple' },
    { id: 'infrastructure', apiType: 'infrastructure', title: 'Infrastructure & Facilities', description: 'Classrooms, labs, library, hostel, and campus facilities.', icon: FiHome, color: 'amber' },
    { id: 'parent', apiType: 'parent', title: 'Parent Feedback', description: 'Academics, safety, communication, and student welfare.', icon: FiHeart, color: 'rose' },
    { id: 'teacher_course', apiType: 'teacher-course', title: "Teacher's Course Feedback", description: 'Faculty views on course design, syllabus, and resources.', icon: FiUserCheck, color: 'cyan' },
];

const COLOR_CLASSES = {
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
};

const MarkdownReport = ({ content }) => (
    <div className="prose max-w-none text-gray-800">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ ...props }) => <h1 className="text-3xl font-extrabold text-gray-900 border-b-2 border-violet-100 pb-3 mb-6 mt-8 first:mt-0" {...props} />,
                h2: ({ ...props }) => <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-violet-500 pl-4 mb-5 mt-8 bg-violet-50/50 py-2 rounded-r-lg" {...props} />,
                h3: ({ ...props }) => <h3 className="text-xl font-bold text-violet-900 mb-4 mt-6" {...props} />,
                p: ({ ...props }) => <p className="mb-4 text-gray-700 text-base leading-relaxed" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700" {...props} />,
                ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-gray-700" {...props} />,
                table: ({ ...props }) => (
                    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm my-6">
                        <table className="min-w-full divide-y divide-gray-200" {...props} />
                    </div>
                ),
                thead: ({ ...props }) => <thead className="bg-violet-50 text-violet-900" {...props} />,
                th: ({ ...props }) => <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" {...props} />,
                td: ({ ...props }) => <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100" {...props} />,
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

export default function FeedbackAnalysis() {
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState(null);
    const [file, setFile] = useState(null);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);

    const selectedConfig = ANALYSIS_TYPES.find((t) => t.id === selectedType);
    const hasEnvKey = hasConfiguredEnvHfApiKey();

    const handleFileChange = async (e) => {
        const nextFile = e.target.files?.[0];
        setFile(nextFile || null);
        setRowCount(0);
        setAnalysisResult(null);

        if (nextFile) {
            try {
                const rows = await parseFeedbackFile(nextFile);
                setRowCount(rows.length);
            } catch (error) {
                setRowCount(0);
                toast.error(error.message || 'Could not read the selected file');
            }
        }
    };

    const handleAnalyze = async () => {
        if (!file || !selectedConfig) {
            toast.error('Please select a form type and upload a file first');
            return;
        }

        const key = getConfiguredHfApiKey();
        if (!key) {
            toast.error('Add VITE_HUGGINGFACE_API_KEY to frontend/.env and restart the dev server');
            return;
        }

        const contextKey = FEEDBACK_TYPE_MAP[selectedConfig.apiType];
        const context = FEEDBACK_CONTEXTS[contextKey];
        if (!context) {
            toast.error('Unknown feedback type');
            return;
        }

        setLoading(true);
        setAnalysisResult(null);
        setProgressMessage('Parsing spreadsheet...');

        try {
            const rows = await parseFeedbackFile(file);
            setRowCount(rows.length);
            setProgressMessage('Building anonymized feedback summary...');
            const dataString = summarizeFeedbackRows(rows);

            const analysis = await analyzeFeedbackWithHuggingFace({
                apiKey: key,
                context,
                dataString,
                onProgress: setProgressMessage,
            });

            setAnalysisResult(analysis);
            toast.success('Analysis completed successfully');
        } catch (error) {
            console.error('Analysis failed:', error);
            toast.error(error.message || 'Failed to analyze feedback. Please try again.');
        } finally {
            setLoading(false);
            setProgressMessage('');
        }
    };

    const resetSelection = () => {
        setSelectedType(null);
        setFile(null);
        setRowCount(0);
        setAnalysisResult(null);
    };

    return (
        <div className="feedback-page-bg min-h-screen p-6 md:p-12 relative">
            <div className="absolute top-4 left-4 z-20">
                <button
                    type="button"
                    onClick={() => (selectedType ? resetSelection() : navigate('/'))}
                    className="inline-flex items-center rounded-lg border border-violet-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-violet-50"
                >
                    <FiArrowLeft className="mr-2 h-4 w-4" />
                    {selectedType ? 'Change form type' : 'Back to Home'}
                </button>
            </div>

            <div className="relative z-10 mx-auto max-w-6xl pt-10">
                <header className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg">
                        <FiCpu className="h-7 w-7" />
                    </div>
                    <img src="/dtu_logo.jpeg" alt="DTU Logo" className="mx-auto mb-4 h-16 w-auto object-contain" />
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                        {selectedConfig ? selectedConfig.title : 'Feedback Analysis'}
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        {selectedConfig
                            ? 'Upload CSV/Excel - analysis runs in your browser via Hugging Face.'
                            : 'Select a feedback form. AI inference uses JavaScript only (no server upload).'}
                    </p>
                </header>

                {!selectedType ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {ANALYSIS_TYPES.map((type, index) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSelectedType(type.id)}
                                    className="feedback-card-enhanced portal-card group text-left p-6 animate-slide-up"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div
                                        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 ${COLOR_CLASSES[type.color]}`}
                                    >
                                        <Icon className="h-7 w-7 feedback-icon-glow" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-violet-700 transition-colors">{type.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{type.description}</p>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mx-auto flex max-w-4xl flex-col gap-8">
                        {/* API Key */}
                        <div className="feedback-section-card rounded-2xl border border-violet-200 bg-white/95 p-6 shadow-sm animate-slide-up">
                            <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900">
                                <FiKey className="mr-2 text-violet-600 feedback-icon-glow" />
                                Hugging Face Environment Key
                            </h3>
                            {hasEnvKey ? (
                                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 shadow-sm">
                                    <span className="flex items-center">
                                        <span className="mr-2">OK</span>
                                        Using key from <code className="font-mono text-xs bg-emerald-100 px-1 rounded">VITE_HUGGINGFACE_API_KEY</code> in your .env file.
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 shadow-sm">
                                    Add <code className="rounded bg-amber-100 px-1">VITE_HUGGINGFACE_API_KEY=hf_...</code> to{' '}
                                    <code className="rounded bg-amber-100 px-1">frontend/.env</code>, then restart the dev server.
                                </p>
                            )}
                        </div>

                        {/* Upload */}
                        <div className="feedback-section-card rounded-2xl border border-gray-100 bg-white p-8 shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
                            <h3 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                                <FiUploadCloud className="mr-3 text-violet-600 feedback-icon-glow" />
                                Upload Data
                            </h3>

                            <div className="feedback-upload-area relative rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-10 text-center transition">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                />
                                <div className="pointer-events-none flex flex-col items-center">
                                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${file ? 'bg-emerald-100 scale-110' : 'bg-gray-100'}`}>
                                        <FiUploadCloud className={`h-8 w-8 transition-colors ${file ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {file ? file.name : 'Drop Excel or CSV here'}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {rowCount > 0 ? (
                                            <span className="text-emerald-600 font-medium">{rowCount} rows detected</span>
                                        ) : 'Supported: .xlsx, .xls, .csv'}
                                    </p>
                                </div>
                            </div>

                            {progressMessage && (
                                <p className="mt-4 text-center text-sm font-medium text-violet-700">{progressMessage}</p>
                            )}

                            <button
                                type="button"
                                onClick={handleAnalyze}
                                disabled={!file || loading || !hasEnvKey}
                                className={`mt-6 feedback-button-primary flex w-full items-center justify-center rounded-xl py-4 text-lg font-bold text-white transition
                                    ${!file || loading || !hasEnvKey
                                        ? 'cursor-not-allowed opacity-50'
                                        : ''}`}
                            >
                                {loading ? (
                                    <>
                                        <FiLoader className="mr-3 h-6 w-6 animate-spin" />
                                        Running Hugging Face analysis...
                                    </>
                                ) : (
                                    <>
                                        <FiCpu className="mr-3 h-5 w-5" />
                                        Run AI Analysis
                                    </>
                                )}
                            </button>

                            <div className="mt-6 flex items-start rounded-xl border border-violet-200 bg-violet-50/80 p-4 backdrop-blur-sm">
                                <FiBookOpen className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-violet-600 feedback-icon-glow" />
                                <p className="text-sm text-violet-900">
                                    <strong>Tip:</strong> Use clear column headers. Data stays in your browser - only the anonymized summary is sent to Hugging Face for inference.
                                </p>
                            </div>
                        </div>

                        {analysisResult && (
                            <div className="feedback-report-container animate-fade-in overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                                <div className="flex items-center justify-between border-b border-violet-200 bg-gradient-to-r from-violet-50 to-white px-8 py-5">
                                    <h3 className="flex items-center text-2xl font-bold text-gray-900">
                                        <FiTarget className="mr-3 text-violet-600 feedback-icon-glow" />
                                        Analysis Report
                                    </h3>
                                    <span className="rounded-full border border-violet-300 bg-violet-100 px-4 py-1 text-xs font-bold uppercase tracking-wide text-violet-800 shadow-sm">
                                        Hugging Face
                                    </span>
                                </div>
                                <div className="p-8 md:p-10">
                                    <MarkdownReport content={analysisResult} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
