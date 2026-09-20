import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('officers'); // 'officers', 'families', 'schemes'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [officers, setOfficers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [schemes, setSchemes] = useState([]);

  // Modals & Selections
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [officerForm, setOfficerForm] = useState({ account_id: '', full_name: '', mobile_number: '', password: '' });
  
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeForm, setSchemeForm] = useState({ scheme_id: '', scheme_name: '', department: '', description: '', income_threshold: '', evaluation_scope: 'INDIVIDUAL', redirect_link: '' });

  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [familyDetails, setFamilyDetails] = useState(null);
  const [viewDocUrl, setViewDocUrl] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    // Check role
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/login');
      return;
    }

    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'officers') {
        const res = await adminAPI.getOfficers();
        setOfficers(res.data);
      } else if (activeTab === 'families') {
        const res = await adminAPI.getFamilies();
        setFamilies(res.data);
      } else if (activeTab === 'schemes') {
        const res = await adminAPI.getSchemes();
        setSchemes(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // --- Officer Management ---
  const handleSaveOfficer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (officerForm.account_id) {
        await adminAPI.updateOfficer(officerForm.account_id, officerForm);
        setSuccessMsg('Officer updated successfully.');
      } else {
        await adminAPI.createOfficer(officerForm);
        setSuccessMsg('Officer created successfully.');
      }
      setShowOfficerModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save officer.');
    }
  };

  const deleteOfficer = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Officer',
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await adminAPI.deleteOfficer(id);
          setSuccessMsg('Officer deleted.');
          fetchData();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete officer.');
        }
      }
    });
  };

  // --- Scheme Management ---
  const handleSaveScheme = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (schemeForm.scheme_id) {
        await adminAPI.updateScheme(schemeForm.scheme_id, schemeForm);
        setSuccessMsg('Scheme updated successfully.');
      } else {
        await adminAPI.createScheme(schemeForm);
        setSuccessMsg('Scheme created successfully.');
      }
      setShowSchemeModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save scheme.');
    }
  };

  const deleteScheme = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Scheme',
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await adminAPI.deleteScheme(id);
          setSuccessMsg('Scheme deleted.');
          fetchData();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete scheme.');
        }
      }
    });
  };

  // --- Family Browser ---
  const viewFamilyDetails = async (id) => {
    setSelectedFamilyId(id);
    setLoading(true);
    try {
      const res = await adminAPI.getFamilyDetails(id);
      setFamilyDetails(res.data);
    } catch (err) {
      setError('Failed to load family details.');
      setSelectedFamilyId(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT': return 'DRAFT';
      case 'PENDING_VERIFICATION': return 'PENDING VERIFICATION';
      case 'ACTIVE': return 'ACTIVE';
      case 'REJECTED': return 'REJECTED';
      default: return status;
    }
  };

  return (
    <div className="layout">
      {/* Navigation */}
      <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="nav-brand">
          <div className="brand-icon">⚙️</div>
          <h2>Admin Portal</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)', fontWeight: 500 }}>👤 Admin</span>
          <button 
            onClick={handleLogout}
            style={{
              padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer',
              background: 'none', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)',
              color: 'var(--gray-600)', fontWeight: 500, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.background = '#fee2e2'; e.target.style.borderColor = '#fca5a5'; e.target.style.color = '#dc2626'; }}
            onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.borderColor = 'var(--gray-300)'; e.target.style.color = 'var(--gray-600)'; }}
          >
            🚪 Sign Out
          </button>
        </div>
      </nav>

      <div className="main-content">
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          
          <div className="card">
            <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid var(--gray-200)', marginBottom: '2rem' }}>
              <button 
                onClick={() => { setActiveTab('officers'); setSelectedFamilyId(null); }}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 0.5rem 0.75rem 0.5rem',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  color: activeTab === 'officers' ? 'var(--primary-color)' : 'var(--gray-500)',
                  borderBottom: activeTab === 'officers' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  marginBottom: '-2px', transition: 'all 0.2s'
                }}
              >
                👮 Officers
              </button>
              <button 
                onClick={() => { setActiveTab('families'); setSelectedFamilyId(null); }}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 0.5rem 0.75rem 0.5rem',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  color: activeTab === 'families' ? 'var(--primary-color)' : 'var(--gray-500)',
                  borderBottom: activeTab === 'families' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  marginBottom: '-2px', transition: 'all 0.2s'
                }}
              >
                👨‍👩‍👧‍👦 Families
              </button>
              <button 
                onClick={() => { setActiveTab('schemes'); setSelectedFamilyId(null); }}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 0.5rem 0.75rem 0.5rem',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  color: activeTab === 'schemes' ? 'var(--primary-color)' : 'var(--gray-500)',
                  borderBottom: activeTab === 'schemes' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  marginBottom: '-2px', transition: 'all 0.2s'
                }}
              >
                📋 Schemes
              </button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner spinner-dark" />
              </div>
            ) : (
              <>
                {/* OFFICERS TAB */}
                {activeTab === 'officers' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3>Verification Officers</h3>
                      <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => {
                        setOfficerForm({ account_id: '', full_name: '', mobile_number: '', password: '' });
                        setShowOfficerModal(true);
                      }}>➕ Add Officer</button>
                    </div>
                    
                    {officers.length === 0 ? (
                      <p>No officers found.</p>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Mobile Number</th>
                              <th>Created At</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {officers.map(off => (
                              <tr key={off.account_id}>
                                <td>{off.citizen?.full_name}</td>
                                <td>{off.mobile_number}</td>
                                <td>{new Date(off.created_at).toLocaleDateString()}</td>
                                <td>
                                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => {
                                    setOfficerForm({
                                      account_id: off.account_id,
                                      full_name: off.citizen?.full_name,
                                      mobile_number: off.mobile_number,
                                      password: ''
                                    });
                                    setShowOfficerModal(true);
                                  }}>✏️ Edit</button>
                                  <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => deleteOfficer(off.account_id, off.citizen?.full_name)}>🗑️</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* SCHEMES TAB */}
                {activeTab === 'schemes' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3>Welfare Schemes</h3>
                      <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => {
                        setSchemeForm({ scheme_id: '', scheme_name: '', department: '', description: '', income_threshold: '', evaluation_scope: 'INDIVIDUAL', redirect_link: '' });
                        setShowSchemeModal(true);
                      }}>➕ Add Scheme</button>
                    </div>

                    {schemes.length === 0 ? (
                      <p>No schemes found.</p>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Scheme Name</th>
                              <th>Department</th>
                              <th>Scope</th>
                              <th>Income Limit</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schemes.map(sch => (
                              <tr key={sch.scheme_id}>
                                <td>{sch.scheme_name}</td>
                                <td>{sch.department || '—'}</td>
                                <td>{sch.evaluation_scope}</td>
                                <td>{sch.income_threshold ? `₹${parseFloat(sch.income_threshold).toLocaleString()}` : 'None'}</td>
                                <td>
                                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => {
                                    setSchemeForm({
                                      scheme_id: sch.scheme_id,
                                      scheme_name: sch.scheme_name,
                                      department: sch.department || '',
                                      description: sch.description || '',
                                      income_threshold: sch.income_threshold || '',
                                      evaluation_scope: sch.evaluation_scope,
                                      redirect_link: sch.redirect_link || ''
                                    });
                                    setShowSchemeModal(true);
                                  }}>✏️ Edit</button>
                                  <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => deleteScheme(sch.scheme_id, sch.scheme_name)}>🗑️</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* FAMILIES TAB */}
                {activeTab === 'families' && (
                  <div>
                    {selectedFamilyId && familyDetails ? (
                      <div>
                        <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => setSelectedFamilyId(null)}>← Back to List</button>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                          <div className="info-row"><span className="info-key">Tracking ID</span><span className="info-value">{familyDetails.tracking_number}</span></div>
                          <div className="info-row"><span className="info-key">Family ID</span><span className="info-value">{familyDetails.family_id_number || '—'}</span></div>
                          <div className="info-row"><span className="info-key">Status</span><span className="info-value">{getStatusLabel(familyDetails.status)}</span></div>
                          <div className="info-row"><span className="info-key">Address</span><span className="info-value">{familyDetails.current_address || '—'}</span></div>
                          <div className="info-row"><span className="info-key">District</span><span className="info-value">{familyDetails.district || '—'}</span></div>
                          <div className="info-row"><span className="info-key">State</span><span className="info-value">{familyDetails.state || '—'}</span></div>
                        </div>

                        <h4>Members</h4>
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Name & Role</th>
                                <th>Aadhaar</th>
                                <th>Details</th>
                                <th>Documents</th>
                              </tr>
                            </thead>
                            <tbody>
                              {familyDetails.citizens.map(c => (
                                <tr key={c.citizen_id}>
                                  <td>
                                    <strong>{c.full_name}</strong><br/>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                      {c.is_head_of_family ? 'Head' : c.relationship || 'Member'}
                                    </span>
                                  </td>
                                  <td style={{ fontFamily: 'monospace' }}>{c.aadhaar_id}</td>
                                  <td style={{ fontSize: '0.85rem' }}>
                                    DOB: {c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : '—'}<br/>
                                    Gender: {c.gender || '—'}<br/>
                                    Income: ₹{c.annual_income || '0'}<br/>
                                    Caste: {c.caste || '—'}
                                  </td>
                                  <td>
                                    {c.document_mappings.length === 0 ? <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>None</span> : (
                                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem' }}>
                                        {c.document_mappings.map(dm => (
                                          <li key={dm.mapping_id} style={{ marginBottom: '0.2rem' }}>
                                            {dm.document.document_type} 
                                            {dm.is_verified ? ' ✅' : dm.reject_reason ? ' ❌' : ' ⏳'}
                                            <button 
                                              className="btn btn-secondary" 
                                              style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem', marginLeft: '0.5rem', background: 'none', border: '1px solid var(--gray-300)' }} 
                                              onClick={() => setViewDocUrl(`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api','') : 'http://localhost:5000'}${dm.document.document_url}`)}
                                            >
                                              View
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ marginBottom: '1rem' }}>All Registered Families</h3>
                        {families.length === 0 ? (
                          <p>No families found.</p>
                        ) : (
                          <div className="table-container">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Tracking ID</th>
                                  <th>Family ID</th>
                                  <th>Status</th>
                                  <th>Members</th>
                                  <th>Created At</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {families.map(fam => (
                                  <tr key={fam.family_id}>
                                    <td style={{ fontFamily: 'monospace' }}>{fam.tracking_number}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: fam.family_id_number ? '#166534' : 'inherit' }}>{fam.family_id_number || '—'}</td>
                                    <td>
                                      <span className={`status-badge status-${fam.status.toLowerCase()}`}>
                                        {getStatusLabel(fam.status)}
                                      </span>
                                    </td>
                                    <td>{fam._count.citizens}</td>
                                    <td>{new Date(fam.created_at).toLocaleDateString()}</td>
                                    <td>
                                      <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => viewFamilyDetails(fam.family_id)}>👁️ View Details</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Officer Modal */}
      {showOfficerModal && (
        <div className="modal-overlay" onClick={() => setShowOfficerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{officerForm.account_id ? 'Edit Officer' : 'Add Officer'}</h3>
            <form onSubmit={handleSaveOfficer}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" type="text" required value={officerForm.full_name} onChange={e => setOfficerForm({...officerForm, full_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input className="form-input" type="text" required value={officerForm.mobile_number} onChange={e => setOfficerForm({...officerForm, mobile_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{officerForm.account_id ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input className="form-input" type="password" required={!officerForm.account_id} value={officerForm.password} onChange={e => setOfficerForm({...officerForm, password: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOfficerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Officer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scheme Modal */}
      {showSchemeModal && (
        <div className="modal-overlay" onClick={() => setShowSchemeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{schemeForm.scheme_id ? 'Edit Scheme' : 'Add Scheme'}</h3>
            <form onSubmit={handleSaveScheme}>
              <div className="form-group">
                <label className="form-label">Scheme Name *</label>
                <input className="form-input" type="text" required value={schemeForm.scheme_name} onChange={e => setSchemeForm({...schemeForm, scheme_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" type="text" value={schemeForm.department} onChange={e => setSchemeForm({...schemeForm, department: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Evaluation Scope *</label>
                <select className="form-select" required value={schemeForm.evaluation_scope} onChange={e => setSchemeForm({...schemeForm, evaluation_scope: e.target.value})}>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="HOUSEHOLD">Household</option>
                  <option value="PARENTS_ONLY">Parents Only</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Income Threshold (₹)</label>
                <input className="form-input" type="number" value={schemeForm.income_threshold} onChange={e => setSchemeForm({...schemeForm, income_threshold: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" value={schemeForm.description} onChange={e => setSchemeForm({...schemeForm, description: e.target.value})}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Redirect Link (URL)</label>
                <input className="form-input" type="url" placeholder="https://example.gov.in/apply" value={schemeForm.redirect_link} onChange={e => setSchemeForm({...schemeForm, redirect_link: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSchemeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Scheme</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDocUrl && (
        <div className="modal-overlay" onClick={() => setViewDocUrl(null)}>
          <div className="modal" style={{ maxWidth: '90vw', maxHeight: '90vh', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
              <h3 style={{ margin: 0 }}>Document Viewer</h3>
              <button className="btn btn-secondary" onClick={() => setViewDocUrl(null)}>✕ Close</button>
            </div>
            <div style={{ height: 'calc(90vh - 60px)', background: '#fff' }}>
              <iframe src={viewDocUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Viewer" />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ isOpen: false })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#991b1b' }}>⚠️ {confirmDialog.title}</h3>
            <p style={{ margin: '1rem 0' }}>{confirmDialog.message}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDialog({ isOpen: false })}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDialog.onConfirm}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
