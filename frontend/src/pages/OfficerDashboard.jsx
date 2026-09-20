import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { officerAPI } from '../api';

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState('PENDING_VERIFICATION');
  const [showDropdown, setShowDropdown] = useState(false);

  // Document viewer
  const [viewDocUrl, setViewDocUrl] = useState(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // 'application' or mapping_id

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(storedUser);
    if (u.role !== 'officer' && u.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    setUser(u);
    fetchApplications();
  }, []);

  const fetchApplications = async (status) => {
    setLoading(true);
    try {
      const res = await officerAPI.getApplications(status || filter);
      setApplications(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedApp(null);
    fetchApplications(newFilter);
  };

  const openApplicationDetail = async (familyId) => {
    setDetailLoading(true);
    setError('');
    try {
      const res = await officerAPI.getApplicationDetail(familyId);
      setSelectedApp(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load application details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVerifyDocument = async (mappingId, action, reason) => {
    setError('');
    try {
      await officerAPI.verifyDocument(mappingId, action, reason);
      setSuccessMsg(`Document ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      // Refresh the detail
      openApplicationDetail(selectedApp.family_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify document.');
    }
  };

  const handleApproveApplication = async () => {
    setError('');
    try {
      const res = await officerAPI.approveApplication(selectedApp.family_id);
      setSuccessMsg(res.data.message);
      setSelectedApp(null);
      fetchApplications();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve application.');
    }
  };

  const handleRejectApplication = async () => {
    setError('');
    try {
      await officerAPI.rejectApplication(selectedApp.family_id, rejectReason);
      setSuccessMsg('Application rejected.');
      setSelectedApp(null);
      setShowRejectModal(false);
      setRejectReason('');
      fetchApplications();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject application.');
    }
  };

  const openRejectDocModal = (mappingId) => {
    setRejectTarget(mappingId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectDocSubmit = () => {
    handleVerifyDocument(rejectTarget, 'reject', rejectReason);
    setShowRejectModal(false);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const stats = {
    pending: applications.length,
  };

  // Group documents by citizen
  const getDocsByCitizen = () => {
    if (!selectedApp) return {};
    const grouped = {};
    selectedApp.citizens.forEach(c => {
      grouped[c.citizen_id] = {
        citizen: c,
        docs: selectedApp.document_mappings.filter(d => d.citizen_id === c.citizen_id),
      };
    });
    return grouped;
  };

  const allDocsVerified = selectedApp?.document_mappings?.every(d => d.is_verified);

  return (
    <>
      <div className="tricolor-strip" />
      <div className="bg-animated" />
      <div className="dashboard-wrapper">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <div className="auth-logo" style={{ margin: 0 }}>
              <div className="auth-logo-icon" style={{ fontSize: '1.5rem' }}>🛡️</div>
              <h2 style={{ fontSize: '1.1rem' }}>Verification Officer Portal</h2>
            </div>
          </div>
          <div className="dashboard-header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="dashboard-user-info">
              <div className="name">🛡️ {user?.full_name}</div>
              <div className="role">Verification Officer</div>
            </div>
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
        </header>

        <main className="dashboard-content">
          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'PENDING_VERIFICATION', label: '⏳ Pending', color: '#f59e0b' },
              { key: 'ACTIVE', label: '✅ Approved', color: '#22c55e' },
              { key: 'REJECTED', label: '❌ Rejected', color: '#ef4444' },
            ].map(f => (
              <button key={f.key}
                onClick={() => handleFilterChange(f.key)}
                style={{
                  padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-md)',
                  border: filter === f.key ? `2px solid ${f.color}` : '1px solid var(--gray-300)',
                  background: filter === f.key ? `${f.color}15` : '#fff',
                  color: filter === f.key ? f.color : 'var(--gray-600)',
                  fontWeight: filter === f.key ? 700 : 500,
                  cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Applications List (Left Panel) */}
            <div style={{ flex: '1 1 320px', minWidth: 300 }}>
              <div className="card">
                <div className="card-header">
                  <h3>📋 Applications ({applications.length})</h3>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner spinner-dark" style={{ width: 30, height: 30 }} />
                  </div>
                ) : applications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    No applications found.
                  </div>
                ) : (
                  <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {applications.map(app => {
                      const head = app.citizens.find(c => c.is_head_of_family);
                      const isSelected = selectedApp?.family_id === app.family_id;
                      return (
                        <div key={app.family_id}
                          onClick={() => openApplicationDetail(app.family_id)}
                          style={{
                            padding: '1rem', cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-200)',
                            background: isSelected ? 'var(--saffron-50)' : 'transparent',
                            borderLeft: isSelected ? '3px solid var(--saffron-500)' : '3px solid transparent',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafaf9' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{head?.full_name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                App No: <strong style={{ color: '#ea580c', fontFamily: 'monospace' }}>{app.tracking_number}</strong>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.1rem' }}>
                                {app.citizens.length} member{app.citizens.length > 1 ? 's' : ''} • {app.district || 'No district'}
                              </div>
                            </div>
                            <span style={{ fontSize: '1.2rem' }}>→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Application Detail (Right Panel) */}
            <div style={{ flex: '2 1 500px', minWidth: 400 }}>
              {detailLoading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
                  <p style={{ marginTop: '1rem', color: 'var(--gray-500)' }}>Loading application...</p>
                </div>
              ) : !selectedApp ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                  <p>Select an application from the left panel to review.</p>
                </div>
              ) : (
                <>
                  {/* Application Header */}
                  <div className="card" style={{ marginBottom: '1rem' }}>
                    <div className="card-header">
                      <h3>📋 Application #{selectedApp.tracking_number}</h3>
                      <span className={`status-badge ${selectedApp.status === 'ACTIVE' ? 'active' : selectedApp.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                        {selectedApp.status === 'ACTIVE' ? '✅ Approved' : selectedApp.status === 'REJECTED' ? '❌ Rejected' : '⏳ Pending'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div className="info-row"><span className="info-key">Address</span><span className="info-value">{selectedApp.current_address || '—'}</span></div>
                      <div className="info-row"><span className="info-key">District</span><span className="info-value">{selectedApp.district || '—'}</span></div>
                      <div className="info-row"><span className="info-key">State</span><span className="info-value">{selectedApp.state || '—'}</span></div>
                      <div className="info-row"><span className="info-key">Ration Card</span><span className="info-value">{selectedApp.ration_card_no || '—'}</span></div>
                      <div className="info-row"><span className="info-key">Income</span><span className="info-value">{selectedApp.household_total_income ? `₹${parseFloat(selectedApp.household_total_income).toLocaleString('en-IN')}` : '—'}</span></div>
                    </div>
                    {selectedApp.family_id_number && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#166534', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          Family ID: {selectedApp.family_id_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Members & Documents Table */}
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name & Role</th>
                          <th>Aadhaar</th>
                          <th>Details</th>
                          <th>Documents for Verification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(getDocsByCitizen()).map(({ citizen, docs }) => (
                          <tr key={citizen.citizen_id}>
                            <td>
                              <strong style={{ fontSize: '0.95rem' }}>{citizen.full_name}</strong>
                              {citizen.is_head_of_family && <span className="head-badge" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>HEAD</span>}
                              <br/>
                              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                                {citizen.is_head_of_family ? 'Self' : (citizen.relationship_custom || citizen.relationship || '—')}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>
                              {citizen.aadhaar_id.replace(/(.{4})/g, '$1 ').trim()}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>
                              DOB: {citizen.date_of_birth ? new Date(citizen.date_of_birth).toLocaleDateString('en-IN') : '—'}<br/>
                              Gender: {citizen.gender || '—'}<br/>
                              Income: {citizen.annual_income ? `₹${parseFloat(citizen.annual_income).toLocaleString('en-IN')}` : '₹0'}<br/>
                              Aadhaar Verified: {citizen.is_aadhaar_verified ? '✅' : '❌'}
                            </td>
                            <td>
                              {docs.length === 0 ? (
                                <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ No docs uploaded</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {docs.map(dm => (
                                    <div key={dm.mapping_id} style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '0.4rem', fontSize: '0.8rem',
                                      background: dm.is_verified ? '#f0fdf4' : dm.reject_reason ? '#fef2f2' : '#fafaf9',
                                      border: `1px solid ${dm.is_verified ? '#bbf7d0' : dm.reject_reason ? '#fecaca' : '#e7e5e4'}`,
                                      borderRadius: 'var(--radius-md)',
                                    }}>
                                      <div style={{ flex: 1 }}>
                                        <strong>{dm.document.document_type === 'OTHER' ? (dm.document.file_name || 'Other Document') : dm.document.document_type}</strong>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }} onClick={() => setViewDocUrl(`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api','') : 'http://localhost:5000'}${dm.document.document_url}`)}>👁️ View</button>
                                        
                                        {dm.is_verified ? (
                                          <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 700 }}>✅</span>
                                        ) : dm.reject_reason ? (
                                          <span style={{ color: '#991b1b', fontSize: '0.75rem', fontWeight: 700 }}>❌</span>
                                        ) : selectedApp.status === 'PENDING_VERIFICATION' ? (
                                          <>
                                            <button className="btn btn-success" style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }} onClick={() => handleVerifyDocument(dm.mapping_id, 'approve')}>✅</button>
                                            <button className="btn btn-danger" style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }} onClick={() => openRejectDocModal(dm.mapping_id)}>❌</button>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>



                  {/* Final Actions */}
                  {selectedApp.status === 'PENDING_VERIFICATION' && (
                    <div className="card" style={{
                      textAlign: 'center', padding: '1.5rem',
                      borderTop: '3px solid var(--saffron-500)',
                    }}>
                      <h3 style={{ marginBottom: '0.5rem' }}>📝 Final Decision</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
                        {allDocsVerified
                          ? '✅ All documents have been verified. You can now approve this application.'
                          : `⚠️ ${selectedApp.document_mappings.filter(d => !d.is_verified).length} document(s) still need verification.`}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <button
                          className="btn btn-success"
                          style={{
                            padding: '0.6rem 1.5rem', fontSize: '0.95rem',
                            opacity: allDocsVerified ? 1 : 0.5,
                          }}
                          disabled={!allDocsVerified}
                          onClick={handleApproveApplication}
                        >
                          ✅ Approve Application & Issue Family ID
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
                          onClick={() => {
                            setRejectTarget('application');
                            setRejectReason('');
                            setShowRejectModal(true);
                          }}
                        >
                          ❌ Reject Application
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Government Footer */}
          <div className="gov-footer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <div className="india-flag" style={{ width: 20, height: 14 }}>
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#a8a29e', fontWeight: 600 }}>Made in India 🇮🇳</span>
            </div>
            <p style={{ fontSize: '0.65rem', color: '#d6d3d1' }}>Parivar Pehchaan Patra — Verification Officer Portal</p>
          </div>
        </main>
      </div>

      {/* Document Viewer Modal */}
      {viewDocUrl && (
        <div className="modal-overlay" onClick={() => setViewDocUrl(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', width: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3>📄 Document Viewer</h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setViewDocUrl(null)}>✕ Close</button>
            </div>
            {viewDocUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={viewDocUrl} alt="Document" style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
            ) : (
              <iframe src={viewDocUrl} style={{ width: '100%', height: '75vh', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }} title="Document" />
            )}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <a href={viewDocUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                🔗 Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
            <h3>Rejection Reason</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {rejectTarget === 'application' ? 'Please provide a reason for rejecting this application.' : 'Please provide a reason for rejecting this document.'}
            </p>
            <div className="form-group">
              <textarea
                className="form-input"
                rows={3}
                placeholder="Enter the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={!rejectReason.trim()}
                onClick={() => {
                  if (rejectTarget === 'application') {
                    handleRejectApplication();
                  } else {
                    handleRejectDocSubmit();
                  }
                }}
              >
                ❌ Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
