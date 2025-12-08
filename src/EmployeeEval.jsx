import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from "./supabaseClient";

function EmployeeEval() {
    const navigate = useNavigate();
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [loading, setLoading] = useState(true);
    const [expandedEval, setExpandedEval] = useState(null);
    const [evaluations, setEvaluations] = useState([]);
    const [employeeInfo, setEmployeeInfo] = useState(null);
    const [showDismissedModal, setShowDismissedModal] = useState(false);
    const [dismissedEvaluation, setDismissedEvaluation] = useState(null);

    useEffect(() => {
        if (userEmail) {
            fetchEmployeeData();
        }
    }, [userEmail]);

    const fetchEmployeeData = async () => {
        try {
            setLoading(true);

            // Fetch employee info including status
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('id, fname, lname, position, depot, hired_at, status')
                .eq('email', userEmail)
                .single();

            if (empError) {
                console.error('Error fetching employee data:', empError);
                setLoading(false);
                return;
            }

            setEmployeeInfo(empData);

            // Fetch evaluations for this employee
            const { data: evalData, error: evalError } = await supabase
                .from('evaluations')
                .select('*')
                .eq('employee_id', empData.id)
                .order('date_evaluated', { ascending: false });

            if (evalError) {
                console.error('Error fetching evaluations:', evalError);
                setEvaluations([]);
            } else {
                setEvaluations(evalData || []);
                
                // Check if the most recent evaluation has "Dismissed" remark
                if (evalData && evalData.length > 0) {
                    const mostRecent = evalData[0];
                    if (mostRecent.remarks === 'Dismissed') {
                        setDismissedEvaluation(mostRecent);
                        setShowDismissedModal(true);
                    }
                }
            }

        } catch (error) {
            console.error('Error in fetchEmployeeData:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate employment type from employees.status (same as HrEval.jsx)
    const getEmploymentType = () => {
        if (!employeeInfo) return 'regular';
        
        // Map status from database to lowercase for UI
        if (employeeInfo.status === "Probationary") {
            return "probationary";
        } else if (employeeInfo.status === "Regular") {
            return "regular";
        }
        return 'regular'; // default
    };

    const getNextEvaluationDate = () => {
        const mostRecent = evaluations.length > 0 ? evaluations[0] : null;
        
        // Find the latest Annual evaluation date for next_due calculation
        let nextEvaluation = mostRecent?.next_due || null;
        const annualEvals = evaluations.filter(e => e.reason === 'Annual');
        if (annualEvals.length > 0) {
            // Get the latest Annual evaluation date
            const latestAnnualDate = annualEvals[0].date_evaluated;
            const nextDueDate = new Date(latestAnnualDate);
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            nextEvaluation = nextDueDate.toISOString().split('T')[0];
        }
        
        // Auto-set next_due for probationary employees with no evaluations (same as HrEval.jsx)
        const employmentType = getEmploymentType();
        if (!nextEvaluation && employmentType === "probationary") {
            const baseDate = employeeInfo?.hired_at ? new Date(employeeInfo.hired_at) : new Date();
            const threeMonthsLater = new Date(baseDate);
            threeMonthsLater.setMonth(baseDate.getMonth() + 3);
            nextEvaluation = threeMonthsLater.toISOString().split('T')[0];
        }
        
        // Auto-set next_due for regular employees with no evaluations (same as HrEval.jsx)
        if (!nextEvaluation && employmentType === "regular") {
            const baseDate = employeeInfo?.hired_at ? new Date(employeeInfo.hired_at) : new Date();
            const oneYearLater = new Date(baseDate);
            oneYearLater.setFullYear(baseDate.getFullYear() + 1);
            nextEvaluation = oneYearLater.toISOString().split('T')[0];
        }
        
        return nextEvaluation;
    };

    // Prepare employee data object
    const employeeData = {
        id: employeeInfo?.id || 'N/A',
        name: employeeInfo ? `${employeeInfo.fname} ${employeeInfo.lname}` : 'Loading...',
        position: employeeInfo?.position || 'N/A',
        depot: employeeInfo?.depot || 'N/A',
        employmentType: getEmploymentType(),
        hireDate: employeeInfo?.hired_at || null,
        lastEvaluation: evaluations.length > 0 ? evaluations[0].date_evaluated : null,
        nextEvaluation: getNextEvaluationDate(),
        evaluations: evaluations
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
        if (!rating || typeof rating !== 'string') return 'text-gray-600';
        if (rating.includes('Outstanding') || rating.includes('Exceeds')) return 'text-green-600';
        if (rating.includes('Meets') || rating.includes('On Track')) return 'text-blue-600';
        if (rating.includes('Needs')) return 'text-orange-600';
        return 'text-gray-600';
    };

    const getRatingBadgeStyle = (rating) => {
        if (!rating || typeof rating !== 'string') return 'bg-gray-100 text-gray-700 border-gray-200';
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading evaluations...</p>
                </div>
            </div>
        );
    }

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
                <div className="w-full py-8">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-800">My Performance Evaluations</h1>
                        <p className="text-gray-500 mt-1">View your evaluation history and upcoming assessment schedule</p>
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
                                    {employeeData.evaluations[0]?.remarks && (
                                        <p className={`text-sm mt-1 font-medium ${
                                            employeeData.evaluations[0].remarks === 'Retained' ? 'text-green-600' :
                                            employeeData.evaluations[0].remarks === 'Observe' ? 'text-orange-600' :
                                            employeeData.evaluations[0].remarks === 'Dismissed' ? 'text-red-600' :
                                            'text-gray-600'
                                        }`}>
                                            {employeeData.evaluations[0].remarks}
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
                                employeeData.evaluations.map((evaluation) => {
                                    const evalYear = new Date(evaluation.date_evaluated).getFullYear();
                                    return (
                                    <div key={evaluation.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Collapsed View */}
                                        <div
                                            onClick={() => setExpandedEval(expandedEval === evaluation.id ? null : evaluation.id)}
                                            className="px-6 py-4 cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-semibold text-gray-800">{evalYear} - {evaluation.reason || 'Performance Review'}</h4>
                                                        {evaluation.remarks && (
                                                            <span className={`text-xs px-2 py-1 rounded-full border ${
                                                                evaluation.remarks === 'Retained' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                evaluation.remarks === 'Observe' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                                evaluation.remarks === 'Dismissed' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                'bg-gray-100 text-gray-700 border-gray-200'
                                                            }`}>
                                                                {evaluation.remarks}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            {formatDate(evaluation.date_evaluated)}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            {evaluation.evaluator_name}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                            </svg>
                                                            <span className={`font-semibold ${getScoreColor(evaluation.total_score?.toString() || '0')}`}>
                                                                {evaluation.total_score ? `${evaluation.total_score}%` : 'N/A'}
                                                            </span>
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
                                                {/* Evaluation File Download */}
                                                {evaluation.file_path && (
                                                    <div className="mb-4">
                                                        <a
                                                            href={supabase.storage.from('evaluations').getPublicUrl(evaluation.file_path).data.publicUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            View Evaluation Document
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Evaluation Details */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-500 mb-1">Reason</p>
                                                        <p className="text-sm font-medium text-gray-800">{evaluation.reason || 'N/A'}</p>
                                                    </div>
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-500 mb-1">Score</p>
                                                        <p className={`text-sm font-bold ${getScoreColor(evaluation.total_score?.toString() || '0')}`}>
                                                            {evaluation.total_score ? `${evaluation.total_score}%` : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                                        <p className="text-sm font-medium text-gray-800">{evaluation.remarks || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })
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

            {/* Dismissed Modal */}
            {showDismissedModal && dismissedEvaluation && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 border border-black">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-red-800 mb-2">Evaluation Result: Dismissed</h3>
                                <p className="text-sm text-gray-700 mb-3">
                                    Your recent evaluation conducted on <strong>{formatDate(dismissedEvaluation.date_evaluated)}</strong> has resulted in a dismissal decision.
                                </p>
                                <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-100">
                                    <p className="text-sm text-red-800">
                                        <strong>What happens next:</strong>
                                    </p>
                                    <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                                        <li>You are required to submit a resignation letter</li>
                                        <li>Navigate to the Separation section to complete the process</li>
                                        <li>HR will guide you through the exit procedures</li>
                                    </ul>
                                </div>
                                <p className="text-xs text-gray-600">
                                    If you have any questions or concerns about this decision, please contact HR immediately.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDismissedModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowDismissedModal(false);
                                    navigate('/employee/separation');
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Go to Separation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default EmployeeEval;

