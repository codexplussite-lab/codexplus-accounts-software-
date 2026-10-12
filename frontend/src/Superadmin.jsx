import React, { useState, useEffect, useMemo } from 'react';
import axiosOriginal from 'axios';
import { 
  Users, Star, Ban, Search, Calendar, Phone, Mail, Building, RefreshCw, 
  Activity, Settings, CreditCard, LayoutDashboard, Database
} from 'lucide-react';

const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api');

const axios = axiosOriginal.create();
axios.interceptors.request.use((config) => {
  const jwtToken = localStorage.getItem('jwt_token');
  if (jwtToken) {
    config.headers.Authorization = `Bearer ${jwtToken}`;
  }
  return config;
});

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // States for sub-components
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);

  // Load data based on active tab
  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchTabData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'dashboard') {
        const res = await axios.get(`${apiBase}/admin/dashboard`, { withCredentials: true });
        setStats(res.data);
      } else if (activeTab === 'companies') {
        const res = await axios.get(`${apiBase}/admin/companies`, { withCredentials: true });
        setCompanies(res.data);
      } else if (activeTab === 'subscriptions') {
        const res = await axios.get(`${apiBase}/admin/subscriptions`, { withCredentials: true });
        setSubscriptions(res.data);
      } else if (activeTab === 'logs') {
        const res = await axios.get(`${apiBase}/admin/logs`, { withCredentials: true });
        setLogs(res.data);
      } else if (activeTab === 'settings') {
        const res = await axios.get(`${apiBase}/admin/settings`, { withCredentials: true });
        setSettings(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || `Failed to load ${activeTab} data`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'companies', label: 'Companies', icon: Building },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Superadmin Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid var(--panel-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
              border: activeTab === tab.id ? `1px solid var(--primary-color)` : '1px solid transparent',
              background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-text)' : 'var(--text-color)',
              fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
        
        <button 
          onClick={fetchTabData}
          title="Refresh Current Tab"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)', cursor: 'pointer' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="notice error" style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '6px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && !stats && !companies.length && !subscriptions.length && !logs.length && !settings ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.7 }}>Loading {activeTab} data...</div>
      ) : (
        <div className="superadmin-content">
          {activeTab === 'dashboard' && stats && <DashboardTab stats={stats} />}
          {activeTab === 'companies' && <CompaniesTab companies={companies} setCompanies={setCompanies} reload={fetchTabData} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} reload={fetchTabData} />}
          {activeTab === 'logs' && <LogsTab logs={logs} />}
          {activeTab === 'settings' && <SettingsTab settings={settings} reload={fetchTabData} />}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub-components for Tabs
// ----------------------------------------------------------------------

function DashboardTab({ stats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="statsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="metric blue" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Total Companies</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.totalCompanies}</strong>
          </div>
        </div>
        
        <div className="metric green" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Active Companies</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.activeCompanies}</strong>
          </div>
        </div>

        <div className="metric amber" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Trial Companies</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.trialCompanies}</strong>
          </div>
        </div>

        <div className="metric red" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ban size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Expired/Suspended</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{(stats.expiredCompanies || 0) + (stats.suspendedCompanies || 0)}</strong>
          </div>
        </div>

        <div className="metric purple" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Total Users</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.totalUsers}</strong>
          </div>
        </div>

        <div className="metric indigo" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Today's Logins</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.todaysLogins || 0}</strong>
          </div>
        </div>

        <div className="metric teal" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Database Size</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.dbSizeMB || 0} MB</strong>
          </div>
        </div>

        <div className="metric emerald" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--panel-shadow)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7, display: 'block' }}>Est. Revenue</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-color)' }}>{stats.revenuePlaceholder}</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '20px', boxShadow: 'var(--panel-shadow)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-color)', fontSize: '16px' }}>Recent Activity</h3>
        {stats.recentActivity?.length > 0 ? (
          <div className="tableWrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '10px 8px' }}>Date</th>
                  <th style={{ padding: '10px 8px' }}>Company</th>
                  <th style={{ padding: '10px 8px' }}>User</th>
                  <th style={{ padding: '10px 8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map(act => (
                  <tr key={act.id} style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-color)' }}>
                    <td style={{ padding: '10px 8px', opacity: 0.7 }}>{new Date(act.date).toLocaleString()}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{act.company || '-'}</td>
                    <td style={{ padding: '10px 8px' }}>{act.user || '-'}</td>
                    <td style={{ padding: '10px 8px' }}>{act.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0, opacity: 0.6, color: 'var(--text-color)' }}>No recent activity to display.</p>
        )}
      </section>
    </div>
  );
}

function CompaniesTab({ companies, setCompanies, reload }) {
  const [search, setSearch] = useState('');
  
  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.ownerEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (id, currentStatus) => {
    let nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await axios.post(`${apiBase}/admin/companies/${id}/status`, { status: nextStatus }, { withCredentials: true });
      reload();
    } catch (e) {
      alert('Failed to change status: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleBackup = async (id, name) => {
    try {
      window.open(`${apiBase}/admin/backups/company/${id}`, '_blank');
    } catch (e) {
      alert('Failed to trigger backup.');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!userId) {
      alert("No owner user ID found for this company.");
      return;
    }
    
    const newPassword = window.prompt("Enter new password for this user (leave blank to auto-generate a random one):");
    if (newPassword === null) return; // User cancelled the prompt
    
    try {
      const payload = newPassword.trim() !== '' ? { newPassword: newPassword.trim() } : {};
      const res = await axios.post(`${apiBase}/admin/users/${userId}/reset_password`, payload, { withCredentials: true });
      
      if (res.data.tempPassword) {
        alert(`Temporary Password Generated:\n\n${res.data.tempPassword}\n\nPlease share this securely with the user.`);
      } else {
        alert('Password updated successfully.');
      }
    } catch (e) {
      alert('Failed to reset password: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--panel-bg)', border: 'var(--panel-border)', padding: '10px 15px', borderRadius: '8px' }}>
        <Search size={18} style={{ color: 'var(--text-color)', opacity: 0.6 }} />
        <input 
          type="text" 
          placeholder="Search companies by name, owner, or email..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-color)', fontSize: '14px' }}
        />
        <button onClick={() => window.open(`${apiBase}/admin/backups/full`, '_blank')} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '6px', background: 'var(--primary-color)', color: 'var(--primary-text)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
          Download Full DB
        </button>
      </div>

      <div className="tableWrap" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', overflowX: 'auto', boxShadow: 'var(--panel-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-color)', opacity: 0.8, fontSize: '13px' }}>
              <th style={{ padding: '15px 12px' }}>Company Details</th>
              <th style={{ padding: '15px 12px' }}>Owner</th>
              <th style={{ padding: '15px 12px' }}>Dates</th>
              <th style={{ padding: '15px 12px' }}>Status</th>
              <th style={{ padding: '15px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--panel-border)', fontSize: '14px', color: 'var(--text-color)' }}>
                <td style={{ padding: '12px' }}>
                  <strong style={{ display: 'block' }}>{c.name}</strong>
                  <span style={{ fontSize: '12px', opacity: 0.6 }}>{c.subscriptionPlan?.name || 'No Plan'}</span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ display: 'block' }}>{c.ownerName}</span>
                  <span style={{ fontSize: '12px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12}/> {c.ownerEmail}</span>
                  {c.phone && <span style={{ fontSize: '12px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12}/> {c.phone}</span>}
                </td>
                <td style={{ padding: '12px', fontSize: '12px', opacity: 0.8 }}>
                  <div>Joined: {new Date(c.createdAt).toLocaleDateString()}</div>
                  {c.expiryDate && <div>Expires: {new Date(c.expiryDate).toLocaleDateString()}</div>}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    background: c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : c.status === 'TRIAL' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: c.status === 'ACTIVE' ? '#10b981' : c.status === 'TRIAL' ? '#f59e0b' : '#ef4444', 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleStatus(c.id, c.status)} style={{ background: c.status === 'ACTIVE' ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      {c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                    <button onClick={() => handleBackup(c.id, c.name)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      Backup
                    </button>
                    <button onClick={() => handleResetPassword(c.users?.[0]?.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6 }}>No companies found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { Plus, X } from 'lucide-react'; // Need to make sure Plus/X are imported, wait they are imported at top? Yes, Plus was at bottom. X might not be. I will just use text or a simple span if X is missing. Let me add state.

function SubscriptionsTab({ subscriptions, reload }) {
  const [editingPlan, setEditingPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan({ ...plan });
    } else {
      setEditingPlan({
        name: '', description: '', price: 0, durationDays: 30, maxUsers: 1, maxTransactions: 100, storageLimit: 1024
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan.id) {
        await axios.put(`${apiBase}/admin/subscriptions/${editingPlan.id}`, editingPlan, { withCredentials: true });
      } else {
        await axios.post(`${apiBase}/admin/subscriptions`, editingPlan, { withCredentials: true });
      }
      setIsModalOpen(false);
      reload();
    } catch (e) {
      alert('Failed to save plan: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {subscriptions.map(sub => (
          <div key={sub.id} style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '25px', boxShadow: 'var(--panel-shadow)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-color)', fontSize: '20px' }}>{sub.name}</h3>
            <p style={{ margin: '0 0 20px 0', opacity: 0.7, fontSize: '14px', color: 'var(--text-color)', minHeight: '40px' }}>{sub.description}</p>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '20px' }}>
              PKR {sub.price.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.6 }}>/ {sub.durationDays} days</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-color)' }}>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--panel-border)' }}><strong>{sub.maxUsers}</strong> Max Users</li>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--panel-border)' }}><strong>{sub.maxTransactions}</strong> Transactions/mo</li>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--panel-border)' }}><strong>{sub.storageLimit}</strong> Storage (MB)</li>
            </ul>
            <button onClick={() => handleOpenModal(sub)} style={{ width: '100%', padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: 'var(--panel-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Edit Plan
            </button>
          </div>
        ))}
        <div onClick={() => handleOpenModal()} style={{ background: 'var(--panel-bg)', border: '2px dashed var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', cursor: 'pointer', color: 'var(--primary-color)' }}>
          <span style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}>+</span>
          <strong style={{ fontSize: '16px' }}>Create New Plan</strong>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-color)', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>
              {editingPlan?.id ? 'Edit Plan' : 'Create New Plan'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Plan Name</label>
                <input required value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Description</label>
                <textarea required value={editingPlan.description} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)', minHeight: '80px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Price (PKR)</label>
                  <input required type="number" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Duration (Days)</label>
                  <input required type="number" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Max Users</label>
                  <input required type="number" value={editingPlan.maxUsers} onChange={e => setEditingPlan({...editingPlan, maxUsers: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Max Trx</label>
                  <input required type="number" value={editingPlan.maxTransactions} onChange={e => setEditingPlan({...editingPlan, maxTransactions: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Storage (MB)</label>
                  <input required type="number" value={editingPlan.storageLimit} onChange={e => setEditingPlan({...editingPlan, storageLimit: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-color)' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--panel-border)', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--primary-color)', color: 'var(--primary-text)', cursor: 'pointer', fontWeight: 'bold' }}>Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function LogsTab({ logs }) {
  const [search, setSearch] = useState('');
  const filtered = logs.filter(l => 
    (l.action && l.action.toLowerCase().includes(search.toLowerCase())) || 
    (l.user && l.user.toLowerCase().includes(search.toLowerCase())) ||
    (l.company && l.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--panel-bg)', border: 'var(--panel-border)', padding: '10px 15px', borderRadius: '8px' }}>
        <Search size={18} style={{ color: 'var(--text-color)', opacity: 0.6 }} />
        <input 
          type="text" 
          placeholder="Search logs by action, user, or company..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-color)', fontSize: '14px' }}
        />
      </div>
      <div className="tableWrap" style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', overflowX: 'auto', boxShadow: 'var(--panel-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-color)', opacity: 0.8, fontSize: '13px' }}>
              <th style={{ padding: '12px' }}>Date</th>
              <th style={{ padding: '12px' }}>Company</th>
              <th style={{ padding: '12px' }}>User</th>
              <th style={{ padding: '12px' }}>Action</th>
              <th style={{ padding: '12px' }}>IP / Device</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--panel-border)', fontSize: '13px', color: 'var(--text-color)' }}>
                <td style={{ padding: '12px', opacity: 0.8 }}>{new Date(l.date).toLocaleString()}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{l.company || 'System'}</td>
                <td style={{ padding: '12px' }}>
                  {l.user || 'Unknown'} 
                  <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '10px', padding: '2px 6px', background: 'var(--bg-color)', borderRadius: '10px' }}>{l.role}</span>
                </td>
                <td style={{ padding: '12px' }}>{l.action}</td>
                <td style={{ padding: '12px', opacity: 0.6, fontSize: '11px' }}>
                  <div>{l.ip}</div>
                  <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.device}</div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6 }}>No logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ settings, reload }) {
  const [formData, setFormData] = useState({
    appLogo: settings?.appLogo || '',
    newSuperadminPassword: ''
  });
  const [saving, setSaving] = useState(false);

  const getThemeKey = (key) => {
    const uid = localStorage.getItem('userId') || 'default';
    return `${key}_${uid}`;
  };

  // Theme states
  const [themeStyle, setThemeStyle] = useState(() => localStorage.getItem(getThemeKey('themeStyle')) || 'original');
  const [customColors, setCustomColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem(getThemeKey('customColors'))) || { primary: '', bg: '', text: '' } }
    catch { return { primary: '', bg: '', text: '' } }
  });

  const themesList = [
    { id: 'original', name: 'Original Blue', desc: 'The default clean, professional look.', color1: '#1e40af', color2: '#2563eb' },
    { id: 'dark', name: 'Dark Mode', desc: 'Easy on the eyes for night time use.', color1: '#1e293b', color2: '#0f172a' },
    { id: 'nature', name: 'Nature Green', desc: 'Fresh and vibrant green hues.', color1: '#065f46', color2: '#10b981' },
    { id: 'sunset', name: 'Sunset Orange', desc: 'Warm and energetic colors.', color1: '#9a3412', color2: '#f97316' },
    { id: 'purple', name: 'Royal Purple', desc: 'Elegant and luxurious feel.', color1: '#5b21b6', color2: '#8b5cf6' },
    { id: 'minimal', name: 'Minimalist Gray', desc: 'Clean, distraction-free grayscale.', color1: '#3f3f46', color2: '#71717a' },
    { id: 'ocean', name: 'Deep Ocean', desc: 'Calming deep blue aquatic tones.', color1: '#0369a1', color2: '#0ea5e9' },
    { id: 'pastel', name: 'Soft Pastel', desc: 'Cozy and sweet pastel theme.', color1: '#fda4af', color2: '#fafaf9' },
  ];

  // Apply theme instantly on selection
  useEffect(() => {
    localStorage.setItem(getThemeKey('themeStyle'), themeStyle);
    localStorage.setItem(getThemeKey('customColors'), JSON.stringify(customColors));
    // Dispatch a custom event so App.jsx can pick it up immediately if needed
    window.dispatchEvent(new Event('themeChanged'));
  }, [themeStyle, customColors]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { appLogo: formData.appLogo };
      if (formData.newSuperadminPassword.trim()) {
        payload.newSuperadminPassword = formData.newSuperadminPassword.trim();
      }

      await axios.put(`${apiBase}/admin/settings`, payload, { withCredentials: true });
      alert('Settings and Theme saved successfully. Refreshing to apply changes globally.');
      setFormData({ ...formData, newSuperadminPassword: '' });
      reload();
      window.location.reload(); // Reload to ensure theme applies everywhere
    } catch (err) {
      alert('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Core Settings: Logo & Password */}
        <div style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '25px', boxShadow: 'var(--panel-shadow)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-color)', fontSize: '18px' }}>Admin Configuration</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-color)' }}>Application Logo</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {formData.appLogo ? (
                  <img src={formData.appLogo} alt="Logo Preview" style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '4px', background: '#fff', border: '1px solid #ddd' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>No Logo</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, appLogo: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ fontSize: '13px', color: 'var(--text-color)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-color)' }}>Change Superadmin Password</label>
              <input 
                type="password" 
                placeholder="Leave blank to keep current password"
                value={formData.newSuperadminPassword} 
                onChange={(e) => setFormData({...formData, newSuperadminPassword: e.target.value})}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-color)', maxWidth: '300px' }}
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', padding: '25px', boxShadow: 'var(--panel-shadow)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-color)', fontSize: '18px' }}>Theme & Customization</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            {themesList.map(t => (
              <div 
                key={t.id}
                onClick={() => {
                  setThemeStyle(t.id);
                  setCustomColors({ primary: '', bg: '', text: '' });
                }}
                style={{
                  border: themeStyle === t.id ? '2px solid var(--primary-color)' : '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  background: 'var(--bg-color)',
                  boxShadow: themeStyle === t.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.color1 }}></div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.color2 }}></div>
                </div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-color)' }}>{t.name}</strong>
                <span style={{ fontSize: '11px', opacity: 0.6, color: 'var(--text-color)', display: 'block' }}>{t.desc}</span>
              </div>
            ))}
          </div>

          <h4 style={{ margin: '20px 0 10px 0', color: 'var(--text-color)', fontSize: '15px' }}>Custom Theme Colors</h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', opacity: 0.8, color: 'var(--text-color)' }}>Primary Color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="color" value={customColors.primary || '#3b82f6'} onChange={e => {
                  setThemeStyle('custom');
                  setCustomColors({...customColors, primary: e.target.value});
                }} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                <input type="text" value={customColors.primary} placeholder="#HEX" onChange={e => {
                  setThemeStyle('custom');
                  setCustomColors({...customColors, primary: e.target.value});
                }} style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-color)' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', opacity: 0.8, color: 'var(--text-color)' }}>Background Color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="color" value={customColors.bg || '#ffffff'} onChange={e => {
                  setThemeStyle('custom');
                  setCustomColors({...customColors, bg: e.target.value});
                }} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                <input type="text" value={customColors.bg} placeholder="#HEX" onChange={e => {
                  setThemeStyle('custom');
                  setCustomColors({...customColors, bg: e.target.value});
                }} style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-color)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', opacity: 0.8, color: 'var(--text-color)' }}>Text Color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="color" value={customColors.text || '#1f2937'} onChange={e => {
                  setThemeStyle('custom');
                  setCustomColors({...customColors, text: e.target.value});
                }} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                <input type="text" value={customColors.text} placeholder="#HEX" onChange={e => {
                  setThemeStyle('custom');
                  setCustomColors({...customColors, text: e.target.value});
                }} style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-color)' }} />
              </div>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={() => {
              setThemeStyle('original');
              setCustomColors({ primary: '', bg: '', text: '' });
            }}
            style={{ marginTop: '15px', background: 'transparent', border: '1px solid var(--panel-border)', color: 'var(--text-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Reset to Default Theme
          </button>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'var(--primary-text)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          {saving ? 'Saving Configurations...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
