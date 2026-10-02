import React, { useState } from 'react';
import {
  FiUser, FiTruck, FiShield, FiSearch, FiBox,
  FiGlobe, FiCreditCard, FiAnchor, FiNavigation,
  FiUsers, FiHome as FiHomeIcon, FiGrid, FiPackage,
  FiMapPin, FiSend, FiClock, FiTrendingUp,
  FiFileText, FiDollarSign
} from 'react-icons/fi';
import { MdDirectionsBoat } from 'react-icons/md';
import './Home.css';

const masterEntries = [
  { id: 'customer',     icon: FiUser,           name: 'Customer',                  color: '#3b82f6' },
  { id: 'supplier',     icon: FiTruck,           name: 'Supplier / Vendor',         color: '#8b5cf6' },
  { id: 'shipping',     icon: MdDirectionsBoat,  name: 'Shipping Agent',            color: '#06b6d4' },
  { id: 'agent',        icon: FiUsers,           name: 'Agent',                     color: '#f59e0b' },
  { id: 'insurance',    icon: FiShield,          name: 'Insurance Agency',          color: '#10b981' },
  { id: 'inspection',   icon: FiSearch,          name: 'Inspection Agency',         color: '#ec4899' },
  { id: 'transporter',  icon: FiNavigation,      name: 'Transporter',               color: '#f97316' },
  { id: 'customs',      icon: FiHomeIcon,        name: 'Custom House Agent',        color: '#6366f1' },
  { id: 'jobworker',    icon: FiGrid,            name: 'Job Worker',                color: '#14b8a6' },
  { id: 'banks',        icon: FiCreditCard,      name: 'Banks',                     color: '#84cc16' },
  { id: 'products',     icon: FiBox,             name: 'Products',                  color: '#f43f5e' },
  { id: 'export',       icon: FiGlobe,           name: 'Export Promotion Council',  color: '#0ea5e9' },
  { id: 'ports',        icon: FiAnchor,          name: 'Ports',                     color: '#64748b' },
  { id: 'forwarder',    icon: FiPackage,         name: 'Forwarder',                 color: '#a855f7' },
  { id: 'carrieragent', icon: FiSend,            name: 'Carrier Agent',             color: '#22c55e' },
  { id: 'shippingline', icon: FiMapPin,          name: 'Shipping Line',             color: '#ef4444' },
];

const recentActivities = [
  { icon: FiUser,       text: 'New customer added: ADITI JEWELS PVT LTD', time: '5 minutes ago',  status: 'completed' },
  { icon: FiFileText,   text: 'Invoice #INV-2024-001 created',             time: '1 hour ago',     status: 'completed' },
  { icon: MdDirectionsBoat, text: 'Shipment #SHIP-1234 dispatched',        time: '3 hours ago',    status: 'pending'   },
  { icon: FiDollarSign, text: 'Payment received from XYZ LTD',             time: '5 hours ago',    status: 'completed' },
  { icon: FiBox,        text: 'Product stock updated: 50 units added',     time: '1 day ago',      status: 'completed' },
];

const stats = [
  { label: 'Total Customers', value: '—', icon: FiUser,        color: '#3b82f6', bg: '#eff6ff' },
  { label: 'Active Shipments', value: '—', icon: MdDirectionsBoat, color: '#06b6d4', bg: '#ecfeff' },
  { label: 'Pending Invoices', value: '—', icon: FiFileText,   color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Monthly Revenue',  value: '—', icon: FiTrendingUp, color: '#10b981', bg: '#f0fdf4' },
];

const Home = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = masterEntries.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userName = localStorage.getItem('userName') || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="home-root">

      {/* ── Hero banner ── */}
      <div className="home-hero">
        <div className="home-hero-text">
          <p className="home-greeting">{greeting},</p>
          <h1 className="home-username">{userName}!</h1>
          <p className="home-sub">Here's an overview of your export operations today.</p>
        </div>
        <div className="home-hero-graphic">
          <MdDirectionsBoat size={96} />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="home-stats">
        {stats.map(s => (
          <div key={s.label} className="home-stat-card" style={{ '--stat-color': s.color, '--stat-bg': s.bg }}>
            <div className="home-stat-icon"><s.icon size={20} /></div>
            <div className="home-stat-info">
              <span className="home-stat-value">{s.value}</span>
              <span className="home-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="home-grid">

        {/* Master entries card */}
        <div className="home-card home-card-entries">
          <div className="home-card-head">
            <div className="home-card-title">
              <FiGrid size={16} />
              <span>Setup Master Entries</span>
            </div>
            <div className="home-search">
              <FiSearch size={13} className="home-search-icon" />
              <input
                type="text"
                placeholder="Search modules…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="home-entries-grid">
            {filtered.map(({ id, icon: Icon, name, color }) => (
              <button
                key={id}
                className="home-entry-btn"
                style={{ '--entry-color': color }}
                onClick={() => onNavigate && onNavigate(id)}
              >
                <div className="home-entry-icon"><Icon size={20} /></div>
                <span className="home-entry-name">{name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="home-entries-empty">No modules match "{searchTerm}"</div>
            )}
          </div>
        </div>

        {/* Recent activity card */}
        <div className="home-card home-card-activity">
          <div className="home-card-head">
            <div className="home-card-title">
              <FiClock size={16} />
              <span>Recent Activity</span>
            </div>
          </div>
          <div className="home-activity-list">
            {recentActivities.map((a, i) => (
              <div key={i} className={`home-activity-item home-activity-${a.status}`}>
                <div className="home-activity-dot" />
                <div className="home-activity-icon"><a.icon size={14} /></div>
                <div className="home-activity-body">
                  <p className="home-activity-text">{a.text}</p>
                  <span className="home-activity-time">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;