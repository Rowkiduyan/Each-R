import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

function HrEval() {
  // Tab and filter state
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 8;

  // Data state
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees from database (HR sees all employees)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("employees")
          .select("id, fname, lname, mname, position");

        if (error) {
          console.error("Error loading employees for evaluations:", error);
          setEmployees([]);
          return;
        }

        const mapped = (data || []).map((emp) => {
          const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
          const fullName = [lastFirst, emp.mname].filter(Boolean).join(" ");

          return {
            id: emp.id || "",
            name: fullName || "Unnamed employee",
            position: emp.position || "Not set",
            depot: "-", // Placeholder, adjust if you have depot/location in your schema
            employmentType: "regular", // Default; adjust if you have an employment type field
            hireDate: null,
            lastEvaluation: null,
            nextEvaluation: null,
            evaluations: [],
          };
        });

        setEmployees(mapped);
      } catch (err) {
        console.error("Unexpected error loading employees for evaluations:", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Helper: calculate status based on nextEvaluation date
  const calculateStatus = (nextEvaluation) => {
    if (!nextEvaluation) return "uptodate";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(nextEvaluation);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate.getTime() === today.getTime()) return "duetoday";
    if (dueDate < today) return "overdue";
    return "uptodate";
  };

  // Add status to employees
  const employeesWithStatus = employees.map((emp) => ({
    ...emp,
    status: calculateStatus(emp.nextEvaluation),
  }));

  // Calculate stats
  const stats = {
    totalEmployees: employeesWithStatus.length,
    dueForEval: employeesWithStatus.filter(
      (e) => e.status === "duetoday" || e.status === "overdue"
    ).length,
    overdueCount: employeesWithStatus.filter((e) => e.status === "overdue").length,
    probationaryCount: employeesWithStatus.filter(
      (e) => e.employmentType === "probationary"
    ).length,
  };

  // Get current data based on active tab, filters, and search
  const getCurrentData = () => {
    let data = [...employeesWithStatus];

    // Filter by tab
    switch (activeTab) {
      case "due":
        data = data.filter((e) => e.status === "duetoday" || e.status === "overdue");
        break;
      case "all":
        break;
      case "history":
        data = data.filter((e) => e.evaluations.length > 0);
        break;
      default:
        break;
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) =>
        [item.name, item.id, item.position, item.depot]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query))
      );
    }

    // Employment filter (placeholder; all are "regular" for now)
    if (employmentFilter !== "all") {
      data = data.filter((item) => item.employmentType === employmentFilter);
    }

    return data;
  };

  const filteredData = getCurrentData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helpers for UI
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "from-red-500 to-red-600",
      "from-blue-500 to-blue-600",
      "from-green-500 to-green-600",
      "from-purple-500 to-purple-600",
      "from-orange-500 to-orange-600",
      "from-pink-500 to-pink-600",
      "from-teal-500 to-teal-600",
      "from-indigo-500 to-indigo-600",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      overdue: { text: "text-red-600", label: "Overdue" },
      duetoday: { text: "text-orange-600", label: "Due Today" },
      uptodate: { text: "text-green-600", label: "Up to Date" },
    };
    return styles[status] || styles.uptodate;
  };

  const getRatingColor = (rating) => {
    if (!rating) return "text-gray-600";
    if (rating.includes("Outstanding") || rating.includes("Exceeds"))
      return "text-green-600";
    if (rating.includes("Meets") || rating.includes("On Track"))
      return "text-blue-600";
    if (rating.includes("Needs")) return "text-orange-600";
    return "text-gray-600";
  };

  const getDaysUntilDue = (nextEvalDate) => {
    if (!nextEvalDate) return null;
    const today = new Date();
    const dueDate = new Date(nextEvalDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
        
        /* Modern sleek scrollbar */
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
        
        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Employee Evaluations
          </h1>
          <p className="text-gray-500 mt-1">
            Browse and manage evaluation readiness across all employees
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.totalEmployees}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium">
              Listed in evaluation directory
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Due for Evaluation
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.dueForEval}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">
              Requires attention
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.overdueCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3 font-medium">
              Past due date
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => {
                  setActiveTab("all");
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "all"
                    ? "border-red-600 text-red-600 bg-red-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  All Employees
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab("due");
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "due"
                    ? "border-red-600 text-red-600 bg-red-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Due / Overdue
                  {stats.dueForEval > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                      {stats.dueForEval}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab("history");
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-red-600 text-red-600 bg-red-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  Evaluation History
                </div>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by employee name, ID, or position..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                />
              </div>

              <select
                value={employmentFilter}
                onChange={(e) => {
                  setEmploymentFilter(e.target.value);
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[180px]"
              >
                <option value="all">All Employment Types</option>
                <option value="regular">Regular</option>
                <option value="probationary">Probationary</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Loading employees...
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Position / Depot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Last Evaluation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Next Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((employee) => {
                      const statusStyle = getStatusBadge(employee.status);
                      const daysUntilDue = getDaysUntilDue(employee.nextEvaluation);

                      return (
                        <React.Fragment key={employee.id || employee.name}>
                          <tr
                            className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                              expandedRow === employee.id ? "bg-blue-50/30" : ""
                            }`}
                            onClick={() =>
                              setExpandedRow(
                                expandedRow === employee.id ? null : employee.id
                              )
                            }
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                                    employee.name
                                  )} flex items-center justify-center text-white text-sm font-medium shadow-sm`}
                                >
                                  {getInitials(employee.name)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {employee.name}
                                  </p>
                                  {employee.id && (
                                    <p className="text-xs text-gray-500">
                                      {employee.id}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-800">
                                {employee.position}
                              </p>
                              <p className="text-xs text-gray-500">
                                {employee.depot}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p
                                className={`text-sm font-medium ${
                                  employee.employmentType === "regular"
                                    ? "text-blue-600"
                                    : "text-purple-600"
                                }`}
                              >
                                {employee.employmentType === "regular"
                                  ? "Regular"
                                  : "Probationary"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {employee.employmentType === "regular"
                                  ? "Yearly eval"
                                  : "Monthly eval"}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-800">
                                {formatDate(employee.lastEvaluation)}
                              </p>
                              {employee.evaluations.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {employee.evaluations.length} record
                                  {employee.evaluations.length !== 1 ? "s" : ""}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-800">
                                {formatDate(employee.nextEvaluation)}
                              </p>
                              {daysUntilDue !== null &&
                                employee.status !== "uptodate" && (
                                  <p
                                    className={`text-xs ${
                                      daysUntilDue < 0
                                        ? "text-red-600"
                                        : daysUntilDue <= 7
                                        ? "text-orange-600"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {daysUntilDue < 0
                                      ? `${Math.abs(daysUntilDue)} days overdue`
                                      : daysUntilDue === 0
                                      ? "Due today"
                                      : `${daysUntilDue} days left`}
                                  </p>
                                )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-semibold ${statusStyle.text}`}
                                >
                                  {statusStyle.label}
                                </span>
                                <svg
                                  className={`w-4 h-4 text-gray-400 transition-transform ${
                                    expandedRow === employee.id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row: placeholder for evaluation history */}
                          {expandedRow === employee.id && (
                            <tr>
                              <td
                                colSpan="6"
                                className="px-6 py-4 bg-gray-50/80"
                              >
                                <div className="ml-12">
                                  <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-semibold text-gray-700">
                                      Evaluation History
                                    </p>
                                  </div>

                                  <div className="bg-white rounded-lg p-6 border border-gray-100 text-center">
                                    <svg
                                      className="w-10 h-10 text-gray-300 mx-auto mb-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                      />
                                    </svg>
                                    <p className="text-sm text-gray-500">
                                      No evaluation records yet
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Upload and manage evaluations for this
                                      employee here once your evaluation module
                                      is connected.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <svg
                          className="w-12 h-12 text-gray-300 mx-auto mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="font-medium">No employees found</p>
                        <p className="text-sm mt-1">
                          Try adjusting your search or filter criteria
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredData.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export default HrEval;