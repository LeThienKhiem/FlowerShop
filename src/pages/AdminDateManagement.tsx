import React, { useState, useEffect } from 'react';
import { useShopDates } from '../hooks/useShopDates';
import { DateConfig } from '../lib/dateConfig';
import { Calendar, Plus, Trash2, Save } from 'lucide-react';

const AdminDateManagement: React.FC = () => {
  const { dateConfig, isLoading, updateDateConfig } = useShopDates();
  const [localConfig, setLocalConfig] = useState<DateConfig>(dateConfig);
  const [newSeasonalDate, setNewSeasonalDate] = useState('');
  const [newClosedDate, setNewClosedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLocalConfig(dateConfig);
  }, [dateConfig]);

  const handleAddSeasonalDate = () => {
    if (newSeasonalDate && !localConfig.seasonal.includes(newSeasonalDate)) {
      setLocalConfig({
        ...localConfig,
        seasonal: [...localConfig.seasonal, newSeasonalDate].sort(),
      });
      setNewSeasonalDate('');
    }
  };

  const handleRemoveSeasonalDate = (date: string) => {
    setLocalConfig({
      ...localConfig,
      seasonal: localConfig.seasonal.filter((d) => d !== date),
    });
  };

  const handleAddClosedDate = () => {
    if (newClosedDate && !localConfig.closed.includes(newClosedDate)) {
      setLocalConfig({
        ...localConfig,
        closed: [...localConfig.closed, newClosedDate].sort(),
      });
      setNewClosedDate('');
    }
  };

  const handleRemoveClosedDate = (date: string) => {
    setLocalConfig({
      ...localConfig,
      closed: localConfig.closed.filter((d) => d !== date),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    const success = await updateDateConfig(localConfig);
    
    if (success) {
      setSaveMessage({ type: 'success', text: 'Date configuration saved successfully!' });
    } else {
      setSaveMessage({ type: 'error', text: 'Failed to save date configuration.' });
    }
    
    setIsSaving(false);
    
    // Clear message after 3 seconds
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading date configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">
          Date Management
        </h1>
        <p className="text-gray-600 font-sans">
          Manage seasonal dates (with $5 surcharge) and closed dates (no delivery available).
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mb-6 p-4 rounded-lg font-sans ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seasonal Dates Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-semibold text-stone-900 font-sans">
              Seasonal Dates
            </h2>
            <span className="ml-auto text-sm text-gray-500 font-sans">
              (+$5 surcharge)
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-4 font-sans">
            Dates with high demand. Customers will pay an additional $5 surcharge.
          </p>

          {/* Add New Seasonal Date */}
          <div className="flex gap-2 mb-4">
            <input
              type="date"
              value={newSeasonalDate}
              onChange={(e) => setNewSeasonalDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 p-2 border border-gray-300 rounded focus:border-stone-900 outline-none font-sans"
              placeholder="Select date"
            />
            <button
              onClick={handleAddSeasonalDate}
              disabled={!newSeasonalDate}
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors font-sans disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {/* Seasonal Dates List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {localConfig.seasonal.length === 0 ? (
              <p className="text-sm text-gray-400 font-sans italic">No seasonal dates configured</p>
            ) : (
              localConfig.seasonal.map((date) => (
                <div
                  key={date}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded"
                >
                  <div>
                    <span className="font-medium text-stone-900 font-sans">{formatDateDisplay(date)}</span>
                    <span className="ml-2 text-xs text-gray-500 font-sans">({date})</span>
                  </div>
                  <button
                    onClick={() => handleRemoveSeasonalDate(date)}
                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                    title="Remove date"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Closed Dates Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-stone-900 font-sans">
              Closed Dates
            </h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4 font-sans">
            Dates when the store is closed. Delivery will not be available on these dates.
          </p>

          {/* Add New Closed Date */}
          <div className="flex gap-2 mb-4">
            <input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 p-2 border border-gray-300 rounded focus:border-stone-900 outline-none font-sans"
              placeholder="Select date"
            />
            <button
              onClick={handleAddClosedDate}
              disabled={!newClosedDate}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-sans disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {/* Closed Dates List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {localConfig.closed.length === 0 ? (
              <p className="text-sm text-gray-400 font-sans italic">No closed dates configured</p>
            ) : (
              localConfig.closed.map((date) => (
                <div
                  key={date}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded"
                >
                  <div>
                    <span className="font-medium text-stone-900 font-sans">{formatDateDisplay(date)}</span>
                    <span className="ml-2 text-xs text-gray-500 font-sans">({date})</span>
                  </div>
                  <button
                    onClick={() => handleRemoveClosedDate(date)}
                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                    title="Remove date"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors font-sans disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-stone-50 border border-stone-200 rounded-lg">
        <h3 className="font-semibold text-stone-900 mb-2 font-sans">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm font-sans">
          <div>
            <span className="text-gray-600">Seasonal Dates:</span>
            <span className="ml-2 font-medium text-stone-900">{localConfig.seasonal.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Closed Dates:</span>
            <span className="ml-2 font-medium text-stone-900">{localConfig.closed.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDateManagement;
