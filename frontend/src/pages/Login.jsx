import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ mobile_number: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validation
    if (!/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 1) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      const res = await authAPI.login(formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('family', JSON.stringify(res.data.family));
      
      // Role-based redirect
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else if (res.data.user.role === 'officer') {
        navigate('/officer');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="tricolor-strip" />
      <div className="bg-animated" />
      <div className="auth-container">
        <div className="auth-card">
          {/* Emblem & Flag */}
          <div className="auth-emblem">
            <div className="flag-row">
              <div className="india-flag india-flag-lg">
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
              <span className="emblem-text">Government of India</span>
              <div className="india-flag india-flag-lg">
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
            </div>
          </div>

          <div className="auth-logo">
            <div className="auth-logo-icon">🏛️</div>
            <h1><span>Parivar</span> Pehchaan</h1>
          </div>
          <p className="auth-subtitle">
            Family Identity Card — Citizen Portal
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="mobile_number">📱 Mobile Number</label>
              <input
                id="mobile_number"
                className={`form-input ${formData.mobile_number && !/^[6-9]\d{9}$/.test(formData.mobile_number) ? 'error' : ''}`}
                type="tel"
                name="mobile_number"
                placeholder="Enter your 10-digit mobile number"
                value={formData.mobile_number}
                onChange={handleChange}
                maxLength={10}
                required
              />
              {formData.mobile_number && !/^[6-9]\d{9}$/.test(formData.mobile_number) && (
                <div className="form-error">Must be a valid 10-digit number starting with 6, 7, 8, or 9</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">🔒 Password</label>
              <input
                id="password"
                className="form-input"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : '🔐 Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            New user? <Link to="/signup">Register for Family ID</Link>
          </div>

          {/* Government Footer */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e7e5e4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <div className="india-flag" style={{ width: 20, height: 14 }}>
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#a8a29e', fontWeight: 600 }}>Made in India 🇮🇳</span>
            </div>
            <p style={{ fontSize: '0.65rem', color: '#d6d3d1' }}>Parivar Pehchaan Patra — Digital India Initiative</p>
          </div>
        </div>
      </div>
    </>
  );
}
