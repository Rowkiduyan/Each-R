
function EmHome() {
    return(
     <>
        <nav className="w-full bg-white shadow-md mb-6 ">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-start items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl">
                Roadwise HRIS
            </div>
            <div className="flex space-x-15 ml-0 md:ml-32 lg:ml-24">
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Home</a>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Notifications</a>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Seperation</a>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Profile</a>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Logout</a>
            </div>
            </div>
        </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 w-full">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-black-600 mb-2">Welcome to your Homepage!</h2>
                <p className="text-gray-700">Here you can manage your Documents!</p>
            </div>
            </div>
        </div>
     </>

    );
} export default EmHome;