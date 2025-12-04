import React, { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";

function EmployeeEval() {
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [loading, setLoading] = useState(true);
    const [expandedEval, setExpandedEval] = useState(null);

    // Mock employee evaluation data (will be replaced with real data from Supabase)
    const employeeData = {
        id: 'EMP-001',
        name: employeeUser ? `${employeeUser.fname} ${employeeUser.lname}` : 'Loading...',
        position: employeeUser?.position || 'Driver',
        depot: 'Makati Depot',
        employmentType: 'regular', // regular or probationary
        hireDate: '2022-03-15',
        lastEvaluation: '2024-03-18',
        nextEvaluation: '2025-03-15',
        evaluations: [
            {
                id: 1,
                period: '2024',
                type: 'Annual Performance Review',
                date: '2024-03-18',
                rating: 'Exceeds Expectations',
                score: '4.5/5',
                evaluator: 'Maria Santos (HR Manager)',
                remarks: 'Excellent attendance and performance throughout the year. Demonstrates strong commitment to safety protocols and customer service. Recommended for salary increase.',
                categories: [
                    { name: 'Job Knowledge', score: 4.5, description: 'Demonstrates excellent understanding of job requirements' },
                    { name: 'Quality of Work', score: 4.8, description: 'Consistently delivers high-quality work' },
                    { name: 'Attendance', score: 5.0, description: 'Perfect attendance record' },
                    { name: 'Teamwork', score: 4.2, description: 'Works well with colleagues' },
                    { name: 'Communication', score: 4.3, description: 'Clear and effective communication' },
                ]
            },
            {
                id: 2,
                period: '2023',
                type: 'Annual Performance Review',
                date: '2023-03-16',
                rating: 'Meets Expectations',
                score: '3.8/5',
                evaluator: 'Maria Santos (HR Manager)',
                remarks: 'Good overall performance. Maintains punctuality and follows company policies. Needs improvement in documentation and reporting procedures.',
                categories: [
                    { name: 'Job Knowledge', score: 4.0, description: 'Good understanding of responsibilities' },
                    { name: 'Quality of Work', score: 3.8, description: 'Meets quality standards' },
                    { name: 'Attendance', score: 4.5, description: 'Excellent attendance' },
                    { name: 'Teamwork', score: 3.5, description: 'Adequate collaboration with team' },
                    { name: 'Communication', score: 3.2, description: 'Needs improvement in documentation' },
                ]
            },
            {
                id: 3,
                period: '2022',
                type: 'Annual Performance Review',
                date: '2022-03-20',
                rating: 'Meets Expectations',
                score: '3.5/5',
                evaluator: 'Roberto Cruz (HR)',
                remarks: 'Solid first year performance. Shows promise and willingness to learn. Continue developing skills in route planning and customer relations.',
                categories: [
                    { name: 'Job Knowledge', score: 3.5, description: 'Learning job requirements' },
                    { name: 'Quality of Work', score: 3.8, description: 'Satisfactory work quality' },
                    { name: 'Attendance', score: 4.0, description: 'Good attendance' },
                    { name: 'Teamwork', score: 3.5, description: 'Works well with team' },
                    { name: 'Communication', score: 3.0, description: 'Basic communication skills' },
                ]
            },
        ]
    };

    // Calculate status dynamically
    const calculateStatus = (nextEvaluation) => {
        if (!nextEvaluation) return 'uptodate';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dueDate = new Date(nextEvaluation);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate.getTime() === today.getTime()) {
            return 'duetoday';
        }
        
        if (dueDate < today) {
            return 'overdue';
        }
        
        return 'uptodate';
    };

    const status = calculateStatus(employeeData.nextEvaluation);

    const getDaysUntilDue = (nextEvalDate) => {
        if (!nextEvalDate) return null;
        const today = new Date();
        const dueDate = new Date(nextEvalDate);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not set';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
        const styles = {
            overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Evaluation Overdue', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
            duetoday: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Evaluation Due Today', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            uptodate: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Up to Date', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        };
        return styles[status] || styles.uptodate;
    };

    const getRatingColor = (rating) => {
        if (rating.includes('Outstanding') || rating.includes('Exceeds')) return 'text-green-600';
        if (rating.includes('Meets') || rating.includes('On Track')) return 'text-blue-600';
        if (rating.includes('Needs')) return 'text-orange-600';
        return 'text-gray-600';
    };

    const getRatingBadgeStyle = (rating) => {
        if (rating.includes('Outstanding') || rating.includes('Exceeds')) return 'bg-green-100 text-green-700 border-green-200';
        if (rating.includes('Meets') || rating.includes('On Track')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (rating.includes('Needs')) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getScoreColor = (score) => {
        const numScore = parseFloat(score);
        if (numScore >= 4.5) return 'text-green-600';
        if (numScore >= 4.0) return 'text-blue-600';
        if (numScore >= 3.0) return 'text-orange-600';
        return 'text-red-600';
    };

    const statusStyle = getStatusBadge(status);
    const daysUntilDue = getDaysUntilDue(employeeData.nextEvaluation);

    useEffect(() => {
        // Simulate loading
        setTimeout(() => setLoading(false), 500);
    }, []);

    return (
        <>
            <style>{`
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                
                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 3px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db transparent;
                }
            `}</style>

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-800">My Performance Evaluations</h1>
                        <p className="text-gray-500 mt-1">View your evaluation history and upcoming assessment schedule</p>
                    </div>

                    {/* Employee Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                    {employeeUser ? `${employeeUser.fname[0]}${employeeUser.lname[0]}` : 'EM'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{employeeData.name}</h2>
                                    <p className="text-sm text-gray-500">{employeeData.position} • {employeeData.depot}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500">Hired: {formatDate(employeeData.hireDate)}</span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${employeeData.employmentType === 'regular' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {employeeData.employmentType === 'regular' ? 'Regular Employee' : 'Probationary'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Next Evaluation */}
                        <div className={`rounded-xl shadow-sm border p-5 ${statusStyle.bg} ${statusStyle.border}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className={`w-5 h-5 ${statusStyle.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={statusStyle.icon} />
                                        </svg>
                                        <p className={`text-sm font-semibold ${statusStyle.text}`}>Next Evaluation</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800">{formatDate(employeeData.nextEvaluation)}</p>
                                    {daysUntilDue !== null && (
                                        <p className={`text-sm mt-1 ${statusStyle.text} font-medium`}>
                                            {daysUntilDue > 0 ? `${daysUntilDue} days remaining` : daysUntilDue === 0 ? 'Due today' : `${Math.abs(daysUntilDue)} days overdue`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Last Evaluation */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-semibold text-gray-600">Last Evaluation</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800">{formatDate(employeeData.lastEvaluation)}</p>
                                    {employeeData.evaluations[0] && (
                                        <p className={`text-sm mt-1 font-medium ${getRatingColor(employeeData.evaluations[0].rating)}`}>
                                            {employeeData.evaluations[0].rating}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Total Evaluations */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        <p className="text-sm font-semibold text-gray-600">Total Evaluations</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800">{employeeData.evaluations.length}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {employeeData.employmentType === 'regular' ? 'Annual reviews' : 'Monthly reviews'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Evaluation History */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <h3 className="text-lg font-bold text-gray-800">Evaluation History</h3>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Complete record of your performance evaluations</p>
                        </div>

                        {/* Evaluation List */}
                        <div className="divide-y divide-gray-100">
                            {employeeData.evaluations.length > 0 ? (
                                employeeData.evaluations.map((evaluation) => (
                                    <div key={evaluation.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Collapsed View */}
                                        <div
                                            onClick={() => setExpandedEval(expandedEval === evaluation.id ? null : evaluation.id)}
                                            className="px-6 py-4 cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-semibold text-gray-800">{evaluation.period} {evaluation.type}</h4>
                                                        <span className={`text-xs px-2 py-1 rounded-full border ${getRatingBadgeStyle(evaluation.rating)}`}>
                                                            {evaluation.rating}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            {formatDate(evaluation.date)}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            {evaluation.evaluator}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                            </svg>
                                                            <span className={`font-semibold ${getScoreColor(evaluation.score)}`}>{evaluation.score}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <svg
                                                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedEval === evaluation.id ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Expanded View */}
                                        {expandedEval === evaluation.id && (
                                            <div className="px-6 pb-6 pt-2 bg-gray-50/50">
                                                {/* Remarks */}
                                                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                                                    <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                        </svg>
                                                        Evaluator's Remarks
                                                    </h5>
                                                    <p className="text-sm text-gray-700">{evaluation.remarks}</p>
                                                </div>

                                                {/* Performance Categories */}
                                                {evaluation.categories && evaluation.categories.length > 0 && (
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Performance Categories</h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {evaluation.categories.map((category, idx) => (
                                                                <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-medium text-gray-700">{category.name}</span>
                                                                        <span className={`text-sm font-bold ${getScoreColor(category.score.toString())}`}>
                                                                            {category.score}/5.0
                                                                        </span>
                                                                    </div>
                                                                    {/* Progress Bar */}
                                                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                                        <div
                                                                            className={`h-2 rounded-full ${
                                                                                category.score >= 4.5 ? 'bg-green-600' :
                                                                                category.score >= 4.0 ? 'bg-blue-600' :
                                                                                category.score >= 3.0 ? 'bg-orange-600' : 'bg-red-600'
                                                                            }`}
                                                                            style={{ width: `${(category.score / 5) * 100}%` }}
                                                                        />
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{category.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="px-6 py-12 text-center text-gray-500">
                                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="font-medium">No Evaluation Records Yet</p>
                                    <p className="text-sm mt-1">Your evaluation history will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-800">About Your Evaluations</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    {employeeData.employmentType === 'regular' ? (
                                        <>Performance evaluations are conducted <strong>annually</strong> on your hire date anniversary. These reviews assess your overall performance, contributions, and areas for development. Your next evaluation is scheduled for <strong>{formatDate(employeeData.nextEvaluation)}</strong>.</>
                                    ) : (
                                        <>As a probationary employee, you will receive <strong>monthly evaluations</strong> to track your progress and integration. These frequent reviews help ensure you're adapting well to your role. Your next evaluation is scheduled for <strong>{formatDate(employeeData.nextEvaluation)}</strong>.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default EmployeeEval;

