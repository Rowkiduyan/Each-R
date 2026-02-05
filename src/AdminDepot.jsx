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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depot Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage depot locations for interview scheduling</p>
        </div>
        <button
          onClick={() => {
            setEditingDepotLocation(null);
            setDepotLocationForm({ depot: '', address: '' });
            setShowModal(true);
          }}
          className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Location
        </button>
      </div>

      {/* Locations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Locations</h3>
              <p className="text-sm text-gray-600 mt-1">{filteredLocations.length} depot(s)</p>
            </div>
            <div className="relative w-64">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search depot or address..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No depots match your search' : 'No depot locations found'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((location) => (
                <div key={location.id} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{location.depot}</div>
                    <div className="text-sm text-gray-600 mt-1">{location.address || 'No address'}</div>
                  </div>
                  <div className="flex gap-3 ml-4">
                    <button
                      onClick={() => {
                        setEditingDepotLocation(location);
                        setDepotLocationForm({ depot: location.depot, address: location.address || '' });
                        setShowModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setLocationToDelete(location);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => {
          setShowModal(false);
          setEditingDepotLocation(null);
          setDepotLocationForm({ depot: '', address: '' });
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {editingDepotLocation ? 'Edit Location Address' : 'Add New Location'}
                    </h3>
                    <p className="text-sm text-white/90">
                      {editingDepotLocation ? 'Update the depot address' : 'Create a new depot location'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingDepotLocation(null);
                    setDepotLocationForm({ depot: '', address: '' });
                  }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Depot Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={depotLocationForm.depot}
                    onChange={(e) => setDepotLocationForm({ ...depotLocationForm, depot: e.target.value.toUpperCase() })}
                    placeholder="e.g., MANILA"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={!!editingDepotLocation}
                  />
                  {editingDepotLocation && (
                    <p className="text-xs text-gray-500 mt-1">Depot name cannot be changed</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={depotLocationForm.address}
                    onChange={(e) => setDepotLocationForm({ ...depotLocationForm, address: e.target.value })}
                    placeholder="Full address"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                disabled={saving || !depotLocationForm.depot.trim()}
                className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {editingDepotLocation ? 'Confirm Update' : 'Confirm Add'}
                  </h3>
                </div>
              </div>
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
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
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
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                </div>
              </div>
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
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
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
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Error</h3>
                </div>
              </div>
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
                className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
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
