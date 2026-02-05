import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export default function AdminDepot() {
  const [depotLocationsList, setDepotLocationsList] = useState([]);
  const [editingDepotLocation, setEditingDepotLocation] = useState(null);
  const [depotLocationForm, setDepotLocationForm] = useState({ depot: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load depot locations from database
  const loadDepotLocations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('depot_locations')
        .select('*')
        .order('depot', { ascending: true });

      if (error) {
        console.error('Error loading depot locations:', error);
        return;
      }

      setDepotLocationsList(data || []);
    } catch (err) {
      console.error('Error loading depot locations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepotLocations();
  }, [loadDepotLocations]);

  // Filter locations based on search term
  const filteredLocations = depotLocationsList.filter(location => {
    const search = searchTerm.toLowerCase();
    return location.depot.toLowerCase().includes(search) || 
           (location.address && location.address.toLowerCase().includes(search));
  });

  const handleSaveClick = () => {
    if (!depotLocationForm.depot.trim()) {
      setErrorMessage('Depot name is required');
      setShowErrorModal(true);
      return;
    }
    setShowSaveConfirmModal(true);
  };

  const handleSave = async () => {
    setShowSaveConfirmModal(false);
    setSaving(true);
    try {
      if (editingDepotLocation) {
        // Update
        const { error } = await supabase
          .from('depot_locations')
          .update({ address: depotLocationForm.address })
          .eq('id', editingDepotLocation.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('depot_locations')
          .insert([{ depot: depotLocationForm.depot.toUpperCase(), address: depotLocationForm.address }]);

        if (error) throw error;
      }

      await loadDepotLocations();
      setDepotLocationForm({ depot: '', address: '' });
      setEditingDepotLocation(null);
      setShowModal(false);
      setSuccessMessage(editingDepotLocation ? 'Location updated successfully!' : 'Location added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving depot location:', err);
      setErrorMessage('Error saving location: ' + err.message);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      const { error } = await supabase
        .from('depot_locations')
        .delete()
        .eq('id', locationToDelete.id);

      if (error) throw error;
      await loadDepotLocations();
      setShowDeleteModal(false);
      setLocationToDelete(null);
      setSuccessMessage('Location deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting depot location:', err);
      setShowDeleteModal(false);
      setLocationToDelete(null);
      setErrorMessage('Error deleting location: ' + err.message);
      setShowErrorModal(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search and Add Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by depot name or address..."
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setEditingDepotLocation(null);
                setDepotLocationForm({ depot: '', address: '' });
                setShowModal(true);
              }}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Depot
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Table Header with Count */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{filteredLocations.length}</span> depot{filteredLocations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Locations Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading depot locations...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                {searchTerm ? 'No results found' : 'No depot locations'}
              </div>
              <div className="text-gray-500 text-sm">
                {searchTerm ? 'Try adjusting your search' : 'Click "Add Depot" to create your first location'}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Depot Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {location.depot}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {location.address || <span className="text-gray-400 italic">No address provided</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDepotLocation(location);
                            setDepotLocationForm({ depot: location.depot, address: location.address || '' });
                            setShowModal(true);
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setLocationToDelete(location);
                            setShowDeleteModal(true);
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-green-50 border border-green-200 text-green-800 px-5 py-3 rounded-lg shadow-lg animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => {
          setShowModal(false);
          setEditingDepotLocation(null);
          setDepotLocationForm({ depot: '', address: '' });
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingDepotLocation ? 'Edit Depot Location' : 'Add Depot Location'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingDepotLocation(null);
                    setDepotLocationForm({ depot: '', address: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Depot Name {!editingDepotLocation && <span className="text-red-600">*</span>}
                  </label>
                  <input
                    type="text"
                    value={depotLocationForm.depot}
                    onChange={(e) => setDepotLocationForm({ ...depotLocationForm, depot: e.target.value.toUpperCase() })}
                    placeholder="e.g., MANILA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={!!editingDepotLocation}
                  />
                  {editingDepotLocation && (
                    <p className="text-xs text-gray-500 mt-1.5">Depot name cannot be changed</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={depotLocationForm.address}
                    onChange={(e) => setDepotLocationForm({ ...depotLocationForm, address: e.target.value })}
                    placeholder="Enter the full address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingDepotLocation(null);
                  setDepotLocationForm({ depot: '', address: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                disabled={saving || !depotLocationForm.depot.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : editingDepotLocation ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDepotLocation ? 'Confirm Update' : 'Confirm Add'}
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-3">
                {editingDepotLocation 
                  ? `Are you sure you want to update ${depotLocationForm.depot}?` 
                  : `Are you sure you want to add ${depotLocationForm.depot}?`}
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-semibold text-gray-700">Depot: {depotLocationForm.depot}</div>
                <div className="text-sm text-gray-600 mt-1">Address: {depotLocationForm.address || 'No address'}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && locationToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{locationToDelete.depot}</span>?
              </p>
              {locationToDelete.address && (
                <p className="text-sm text-gray-500 mt-2">{locationToDelete.address}</p>
              )}
              <p className="text-sm text-red-600 mt-3">This action cannot be undone.</p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setLocationToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Error</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700">{errorMessage}</p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
