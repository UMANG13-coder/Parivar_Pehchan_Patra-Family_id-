import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#1f2937',
      color: '#f3f4f6',
      padding: '2rem 1rem 1rem 1rem',
      marginTop: 'auto',
      borderTop: '4px solid #ea580c', // Saffron accent
      fontSize: '0.9rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        
        <div>
          <h4 style={{ color: '#fb923c', marginBottom: '1rem' }}>Parivar Pehchaan Patra</h4>
          <p style={{ color: '#d1d5db', lineHeight: '1.5' }}>
            A unified citizen identity management system designed to streamline welfare delivery and e-governance services.
          </p>
        </div>

        <div>
          <h4 style={{ color: '#fb923c', marginBottom: '1rem' }}>Important Links</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={e => e.target.style.color='#f3f4f6'} onMouseOut={e => e.target.style.color='#9ca3af'}>Privacy Policy</a></li>
            <li><a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={e => e.target.style.color='#f3f4f6'} onMouseOut={e => e.target.style.color='#9ca3af'}>Terms of Service</a></li>
            <li><a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={e => e.target.style.color='#f3f4f6'} onMouseOut={e => e.target.style.color='#9ca3af'}>Citizen Charter</a></li>
            <li><a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={e => e.target.style.color='#f3f4f6'} onMouseOut={e => e.target.style.color='#9ca3af'}>Accessibility Statement</a></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#fb923c', marginBottom: '1rem' }}>Help & Support</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#d1d5db' }}>
            <li>📞 <strong>Toll Free:</strong> 1800-180-XXXX</li>
            <li>📞 <strong>CM Helpline:</strong> 1076</li>
            <li>✉️ <strong>Email:</strong> support@ppp.gov.in</li>
            <li>🏢 <strong>Headquarters:</strong> State Secretariat, Block B</li>
          </ul>
        </div>

      </div>
      
      <div style={{ maxWidth: '1200px', margin: '2rem auto 0 auto', paddingTop: '1rem', borderTop: '1px solid #374151', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
        <p>© {new Date().getFullYear()} Government of India / State Government. All rights reserved.</p>
        <p style={{ marginTop: '0.5rem' }}>Designed and Developed by NIC / State IT Department.</p>
      </div>
    </footer>
  );
}
