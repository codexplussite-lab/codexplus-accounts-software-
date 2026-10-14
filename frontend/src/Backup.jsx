import React, { useState } from 'react';
import axios from 'axios';
import { HardDrive, Download, Upload, AlertCircle, Database, CheckCircle2 } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api');

function Panel({ title, icon: Icon, children }) { 
    return <section className="panel"><div className="panelTitle"><div><Icon size={19} /><h2>{title}</h2></div></div>{children}</section> 
}

export default function BackupPanel() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await axios.get(`${apiBase}/backup/download`, { withCredentials: true });
      if (res.data.success) {
          alert(`Success: ${res.data.message}`);
      }
    } catch (error) {
      console.error('Backup failed', error);
      alert(`Backup failed: ${error.response?.data?.error || error.message}`);
    }
    setIsBackingUp(false);
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();

    const confirmed = window.confirm("WARNING: This will completely replace your current database with the local backup. All recent unsaved changes will be lost. Do you want to continue?");
    if (!confirmed) return;

    setIsRestoring(true);
    
    try {
      const res = await axios.post(`${apiBase}/backup/restore`, {}, {
        withCredentials: true
      });
      
      if (res.data.success) {
        alert("Database Restored Successfully! The application will now reload.");
        window.location.reload();
      } else {
        alert("Restore failed: " + (res.data.error || "Unknown error"));
        setIsRestoring(false);
      }
    } catch (err) {
      alert(`Restore failed: ${err.response?.data?.error || err.message}`);
      setIsRestoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '14px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)' }}>
         <Database size={24} style={{ verticalAlign: 'middle', marginRight: '14px', color: '#2563eb', flexShrink: 0 }} />
         <div>
           <strong style={{ fontSize: '15px', color: '#1e3a8a' }}>Local Secure Backup System</strong>
           <div style={{ fontSize: '13px', marginTop: '4px', color: '#3b82f6', lineHeight: '1.4' }}>
             Your data is backed up securely to your PC's local drive (<code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>C:\codexplus_accounts_backups</code>). You can easily restore it anytime.
           </div>
         </div>
      </div>

      <div className="contentGrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Panel title="Create Backup" icon={Download}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Generate an encrypted backup snapshot of your entire database and store it on your local drive (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>C:\codexplus_accounts_backups</code>).</p>
            
            <button 
              className="primary" 
              onClick={handleDownloadBackup} 
              disabled={isBackingUp || isRestoring}
              style={{ width: 'fit-content' }}
            >
              <Download size={16} />
              {isBackingUp ? 'Generating Secure Backup...' : 'Create Local Backup'}
            </button>
          </div>
        </Panel>

        <Panel title="Restore Backup" icon={Upload}>
          <form onSubmit={handleRestoreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Restore your database from the latest local backup (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>C:\codexplus_accounts_backups</code>). <strong style={{ color: '#ef4444' }}>This will overwrite current data.</strong></p>
            
            <button 
              type="submit"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content', fontWeight: 600, boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)', opacity: (isBackingUp || isRestoring) ? 0.6 : 1, transition: 'all 0.18s ease' }} 
              disabled={isBackingUp || isRestoring}
            >
              <AlertCircle size={16} />
              {isRestoring ? 'Restoring Database...' : 'Restore Local Backup'}
            </button>
          </form>
        </Panel>
      </div>

    </div>
  );
}
