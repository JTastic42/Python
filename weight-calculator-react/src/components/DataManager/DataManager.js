import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { dataServiceFactory } from '../../services/dataServiceFactory';
import './DataManager.css';

const DataManager = React.memo(({ onDataChange }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setImportError('');
      setSuccessMessage('');

      const backup = await dataServiceFactory.createBackup();
      
      // Create download link
      const link = document.createElement('a');
      link.href = backup.url;
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      URL.revokeObjectURL(backup.url);
      
      setSuccessMessage('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      setImportError('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportError('');
      setSuccessMessage('');

      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Please select a valid JSON backup file');
      }

      // Read file content
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      // Parse JSON
      let importData;
      try {
        importData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error('Invalid JSON format in backup file');
      }

      // Import data
      await dataServiceFactory.restoreFromBackup(importData);
      
      setSuccessMessage(`Data imported successfully! Imported ${importData.workouts?.length || 0} workouts.`);
      
      // Notify parent component of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportError('Failed to import data: ' + error.message);
    } finally {
      setIsImporting(false);
      // Clear file input
      event.target.value = '';
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    try {
      setImportError('');
      setSuccessMessage('');

      const dataService = dataServiceFactory.getService();
      await dataService.clearAllData();
      
      setSuccessMessage('All data cleared successfully!');
      
      // Notify parent component of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Clear data failed:', error);
      setImportError('Failed to clear data: ' + error.message);
    }
  };

  const getServiceInfo = () => {
    try {
      return dataServiceFactory.getServiceInfo();
    } catch (error) {
      return { type: 'unknown', initialized: false };
    }
  };

  const serviceInfo = getServiceInfo();

  return (
    <div className="data-manager">
      <h3>Data Management</h3>
      
      {/* Service Information */}
      <div className="service-info">
        <p><strong>Storage:</strong> {serviceInfo.type}</p>
        {serviceInfo.usage && (
          <p><strong>Usage:</strong> {serviceInfo.usage.percentage}% ({Math.round(serviceInfo.usage.used / 1024)} KB)</p>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="success-message">
          <p>✅ {successMessage}</p>
        </div>
      )}
      
      {importError && (
        <div className="error-message">
          <p>❌ {importError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="data-actions">
        <div className="action-group">
          <h4>Backup & Restore</h4>
          
          <button 
            className="action-btn export-btn"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : '📁 Export Data'}
          </button>
          
          <label className="action-btn import-btn">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              style={{ display: 'none' }}
            />
            {isImporting ? 'Importing...' : '📂 Import Data'}
          </label>
        </div>
        
        <div className="action-group danger-zone">
          <h4>Danger Zone</h4>
          <button 
            className="action-btn clear-btn"
            onClick={handleClearData}
          >
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h4>Instructions</h4>
        <ul>
          <li><strong>Export:</strong> Downloads a JSON backup file with all your workouts and preferences</li>
          <li><strong>Import:</strong> Restores data from a previously exported backup file</li>
          <li><strong>Clear:</strong> Permanently removes all stored data (cannot be undone)</li>
        </ul>
      </div>
    </div>
  );
});

DataManager.displayName = 'DataManager';

DataManager.propTypes = {
  onDataChange: PropTypes.func
};

export default DataManager;