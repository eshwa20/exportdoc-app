import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MasterStyles.css';

const PartyPage = ({ partyType = 'CUSTOMER' }) => {
    const [list, setList] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [details, setDetails] = useState({ master: null, addresses: [], communications: [] });

    useEffect(() => {
        axios.get(`http://localhost:5000/api/parties?type=${partyType}&search=${search}`)
            .then(res => {
                setList(res.data);
                if (res.data.length > 0 && !selectedId) {
                    loadParty(res.data[0].party_id);
                }
            })
            .catch(err => console.error('Error fetching parties:', err));
    }, [search, partyType]);

    const loadParty = (id) => {
        axios.get(`http://localhost:5000/api/parties/${id}`)
            .then(res => {
                setDetails(res.data);
                setSelectedId(id);
            })
            .catch(err => console.error('Error loading party details:', err));
    };

    return (
        <div className="party-page">
            {/* Sidebar */}
            <div className="sidebar-list">
                <div className="list-header">
                    <h3>Customer List</h3>
                    <div className="search-container">
                        <input 
                            type="text" 
                            placeholder="Search customers..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="list-scroll">
                    {list.length > 0 ? (
                        list.map(item => (
                            <div key={item.party_id} 
                                 className={`party-row ${selectedId === item.party_id ? 'active' : ''}`} 
                                 onClick={() => loadParty(item.party_id)}>
                                <h4>{item.party_name}</h4>
                                <p>
                                    <span>{item.party_type}</span>
                                    <span>•</span>
                                    <span>{item.country}</span>
                                </p>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                            No customers found
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="details-view">
                <div className="view-header">
                    <h2>CUSTOMER SETUP</h2>
                    <button className="btn-create">+ Create New</button>
                </div>

                {details.master ? (
                    <div className="content-wrapper">
                        {/* Customer Header */}
                        <div className="customer-header-card">
                            <div className="customer-title">
                                <h1>{details.master.party_name}</h1>
                                <p>{partyType} | {details.master.country}</p>
                            </div>
                            <div className="customer-badge">
                                ACTIVE
                            </div>
                        </div>

                        {/* Master Information */}
                        <div className="master-info-card">
                            <div className="section-header">
                                <span>Customer Master</span>
                                <div className="section-actions">
                                    <button className="btn-icon">Edit</button>
                                    <button className="btn-icon">More</button>
                                </div>
                            </div>
                            <div className="master-info-grid">
                                <div className="info-item">
                                    <span className="label">Party Name</span>
                                    <span className="value">{details.master.party_name}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Party Type</span>
                                    <span className="value">{partyType}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Country</span>
                                    <span className="value">{details.master.country}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">GST No</span>
                                    <span className="value">{details.master.gstno || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">PAN</span>
                                    <span className="value">{details.master.pan || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">CIN</span>
                                    <span className="value">{details.master.cin || 'N/A'}</span>
                                </div>
                            </div>
                            
                            {/* Quick Links */}
                            <div className="quick-links">
                                <button className="quick-link">Show All</button>
                                <button className="quick-link">Add Point</button>
                                <button className="quick-link">Communication Point</button>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="address-section">
                            <div className="address-header">
                                <h3>Address Points</h3>
                                <button className="btn-add">+ Add Address</button>
                            </div>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Type Of Address</th>
                                            <th>Owner Name</th>
                                            <th>Department</th>
                                            <th>Address Line 1</th>
                                            <th>Address Line 2</th>
                                            <th>City</th>
                                            <th>State</th>
                                            <th>Country</th>
                                            <th>Postal Code</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {details.addresses.length > 0 ? (
                                            details.addresses.map(addr => (
                                                <tr key={addr.addr_point_id}>
                                                    <td>{addr.type_of_addr || 'REGISTERED OFFICE'}</td>
                                                    <td>{addr.addr_owner_name || 'ADITI SHAH'}</td>
                                                    <td>{addr.department_name || 'PURCHASE'}</td>
                                                    <td>{addr.add_line1 || 'UNIT NO. 8'}</td>
                                                    <td>{addr.add_line2 || 'SDF II'}</td>
                                                    <td>{addr.city || 'MUMBAI'}</td>
                                                    <td>{addr.state_province || 'MAHARASHTRA'}</td>
                                                    <td>{addr.country_name || 'INDIA'}</td>
                                                    <td>{addr.postal_code || '400096'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                                                    No address points found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Communication Section */}
                        <div className="communication-section">
                            <div className="communication-header">
                                <h3>Communication Points</h3>
                                <button className="btn-add">+ Add</button>
                            </div>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Value</th>
                                            <th>Primary</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {details.communications.length > 0 ? (
                                            details.communications.map(comm => (
                                                <tr key={comm.comm_point_id}>
                                                    <td>{comm.comm_type}</td>
                                                    <td>{comm.comm_value}</td>
                                                    <td>{comm.is_primary ? 'Yes' : 'No'}</td>
                                                    <td>Active</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                                                    No communication points added
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            <div className="pagination">
                                <span>Page 1 of 40</span>
                                <button>◀</button>
                                <button>▶</button>
                            </div>
                        </div>

                        {/* Session Bar */}
                        <div className="session-bar">
                            <span>Session: Admin User</span>
                            <div className="session-actions">
                                <span>Debug</span>
                                <span>Quick Edit</span>
                                <span>Customize</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="action-bar">
                            <button className="action-btn">Install App</button>
                            <button className="action-btn">Tearal</button>
                            <button className="action-btn">Reset</button>
                            <button className="action-btn primary">Create</button>
                        </div>
                    </div>
                ) : (
                    <div className="content-wrapper">
                        <div className="empty-state">
                            <h3>Select a customer from the list to view details</h3>
                            <p>Click on any customer in the sidebar to see their information</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartyPage;