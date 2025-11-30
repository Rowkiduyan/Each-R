import { useEmployeeUser } from "./layouts/EmployeeLayout";

function EmployeeRequirements() {
    const { userId, userEmail } = useEmployeeUser();
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Requirements</h1>
            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-700">Requirements content will be displayed here.</p>
            </div>
        </div>
    );
}

export default EmployeeRequirements;

