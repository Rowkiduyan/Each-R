import { Link } from "react-router-dom";
import { useState } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";

function  EmployeeSeparation () {
  const { userId, userEmail } = useEmployeeUser();
  const [status1, setStatus1] = useState("Validated");
  const [status2, setStatus2] = useState("None");
  const [status3, setStatus3] = useState("None");
    return(
    <>
        <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Separation</h1>
        <div className="bg-white shadow-md rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Submit</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Remove</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><a href="resignation_letter.pdf" download>resignation_letter.pdf</a></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900">Resignation Letter</td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus1("Submitted")} className="bg-green-500 text-white rounded cursor-pointer px-4 py-2">Submit</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus1("None")} className="bg-red-500 text-white rounded cursor-pointer px-4 py-2">Remove</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900" style={status1 === "Validated" ? {backgroundColor: 'green', color: 'white'} : status1 === "Submitted" ? {backgroundColor: 'orange', color: 'white'} : {backgroundColor: 'white', color: 'black'}}>{status1}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden mt-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Download</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Submit</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Remove</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><a href="interviewform.pdf" download>interviewform.pdf</a></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><input type="file" /></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900">Interview Form</td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus2("Submitted")} className="bg-green-500 text-white rounded cursor-pointer px-4 py-2">Submit</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus2("None")} className="bg-red-500 text-white rounded cursor-pointer px-4 py-2">Remove</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900" style={status2 === "None" ? {backgroundColor: 'white', color: 'black'} : {backgroundColor: 'orange', color: 'white'}}>{status2}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><a href="exitform.pdf" download>exitform.pdf</a></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><input type="file" /></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900">Exit Clearance Form</td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus3("Submitted")} className="bg-green-500 text-white rounded cursor-pointer px-4 py-2">Submit</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus3("None")} className="bg-red-500 text-white rounded cursor-pointer px-4 py-2">Remove</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900" style={status3 === "None" ? {backgroundColor: 'white', color: 'black'} : {backgroundColor: 'orange', color: 'white'}}>{status3}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {status1 === "Validated" && status2 === "Submitted" && status3 === "Submitted" && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Download</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900">Additional Document</td>
                  <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><a href="additional.pdf" download>additional.pdf</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
    );
}
export default EmployeeSeparation