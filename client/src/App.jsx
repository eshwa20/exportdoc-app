import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSettings, FiLogOut, FiHome, FiFileText } from 'react-icons/fi';

import AuthPage                from './login';
import SetupMasterEntries      from './setup_master_entries';
import Home                    from './Home';
import Inquiry                 from './inquiry';

// All modules now live in the master-entries folder
import PartyPage               from './master-entries/customer';
import Supplier                from './master-entries/supplier';
import ShippingAgent           from './master-entries/shipping-agent';
import Agent                   from './master-entries/agent';
import InsuranceAgency         from './master-entries/insurance-agency';
import InspectionAgency        from './master-entries/inspection-agency';
import Transporter             from './master-entries/transporter';
import CustomHouseAgent        from './master-entries/custom-house-agent';
import JobWorker               from './master-entries/job-worker';
import Banks                   from './master-entries/banks';
import Products                from './master-entries/products';
import ExportPromotionCouncil  from './master-entries/export-promotion-council';
import Ports                   from './master-entries/ports';
import Forwarder               from './master-entries/forwarder';
import CarrierAgent            from './master-entries/carrier-agent';
import ShippingLine            from './master-entries/shipping-line';

import './MasterStyles.css';

const App = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn]               = useState(false);
  const [activePage, setActivePage]               = useState('home');
  const [showMasterEntries, setShowMasterEntries] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) setIsLoggedIn(true);
  }, []);

  const handleLogin  = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setActivePage('home');
    navigate('/');
  };

  const handleMenuClick = (pageId) => {
    console.log('Navigating to:', pageId);
    setActivePage(pageId);
  };

  if (!isLoggedIn) return <AuthPage onLogin={handleLogin} />;

  const renderPage = () => {
    console.log('Rendering page:', activePage);
    switch (activePage) {
      case 'home':           return <Home onNavigate={handleMenuClick} />;
      case 'inquiry':        return <Inquiry />;
      case 'customer':       return <PartyPage             partyType="CUSTOMER" />;
      case 'supplier':       return <Supplier              partyType="SUPPLIER" />;
      case 'shipping':       return <ShippingAgent         partyType="SHIPPING AGENT" />;
      case 'agent':          return <Agent                 partyType="AGENT" />;
      case 'insurance':      return <InsuranceAgency       partyType="INSURANCE AGENCY" />;
      case 'inspection':     return <InspectionAgency      partyType="INSPECTION AGENCY" />;
      case 'transporter':    return <Transporter           partyType="TRANSPORTER" />;
      case 'customs':        return <CustomHouseAgent      partyType="CUSTOM HOUSE AGENT" />;
      case 'jobworker':      return <JobWorker             partyType="JOB WORKER" />;
      case 'banks':          return <Banks                 partyType="BANK" />;
      case 'products':       return <Products              partyType="PRODUCT" />;
      case 'export':         return <ExportPromotionCouncil partyType="EXPORT PROMOTION COUNCIL" />;
      case 'ports':          return <Ports                 partyType="PORT" />;
      case 'forwarder':      return <Forwarder             partyType="FORWARDER" />;
      case 'carrieragent':   return <CarrierAgent          partyType="CARRIER AGENT" />;
      case 'shippingline':   return <ShippingLine          partyType="SHIPPING LINE" />;
      default:
        return (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#f8f9fa', flexDirection: 'column', gap: '20px', padding: '40px'
          }}>
            <div style={{ fontSize: '64px' }}>📄</div>
            <h2 style={{ color: '#2c3e50', margin: 0 }}>Module Under Development</h2>
            <p style={{ color: '#6c757d', textAlign: 'center', maxWidth: '500px' }}>
              This module is coming soon.
            </p>
            <button onClick={() => handleMenuClick('home')} style={{
              padding: '12px 24px', backgroundColor: '#0d6efd', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px',
              fontWeight: '500', cursor: 'pointer'
            }}>
              Go to Home
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <div className="main-sidebar">
        <div className="sidebar-header">
          <h2>ExportDoc</h2>
          <p>Document Management System</p>
        </div>

        <div className="sidebar-section">
          <div className="section-title">MAIN MENU</div>
          <div className={`menu-item ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => handleMenuClick('home')}>
            <span className="icon"><FiHome size={16} /></span>
            <span className="text">Home</span>
          </div>
          <div className={`menu-item ${activePage === 'inquiry' ? 'active' : ''}`}
            onClick={() => handleMenuClick('inquiry')}>
            <span className="icon"><FiFileText size={16} /></span>
            <span className="text">Inquiry</span>
          </div>
        </div>

        <SetupMasterEntries
          show={showMasterEntries}
          onToggle={() => setShowMasterEntries(!showMasterEntries)}
          onSelect={handleMenuClick}
          activePage={activePage}
        />

        <div style={{ flex: 1 }} />

        <div className="sidebar-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="menu-item">
            <span className="icon"><FiSettings size={16} /></span>
            <span className="text">Settings</span>
          </div>
          <div className="menu-item" onClick={handleLogout}>
            <span className="icon"><FiLogOut size={16} /></span>
            <span className="text">Logout</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default App;