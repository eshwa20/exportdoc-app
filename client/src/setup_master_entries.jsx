import React from 'react';
import {
  FiUser, FiTruck, FiAnchor, FiShield, FiSearch,
  FiPackage, FiGlobe, FiCreditCard, FiBox,
  FiNavigation, FiUsers, FiHome, FiChevronDown,
  FiGrid, FiMapPin, FiSend
} from 'react-icons/fi';
import { MdDirectionsBoat } from 'react-icons/md';

const entries = [
  { id: 'customer',     label: 'Customer',                icon: FiUser        },
  { id: 'supplier',     label: 'Supplier/Vendor',         icon: FiTruck       },
  { id: 'shipping',     label: 'Shipping Agent',          icon: MdDirectionsBoat },
  { id: 'agent',        label: 'Agent',                   icon: FiUsers       },
  { id: 'insurance',    label: 'Insurance Agency',        icon: FiShield      },
  { id: 'inspection',   label: 'Inspection Agency',       icon: FiSearch      },
  { id: 'transporter',  label: 'Transporter',             icon: FiNavigation  },
  { id: 'customs',      label: 'Custom House Agent',      icon: FiHome        },
  { id: 'jobworker',    label: 'Job Worker',              icon: FiGrid        },
  { id: 'banks',        label: 'Banks',                   icon: FiCreditCard  },
  { id: 'products',     label: 'Products',                icon: FiBox         },
  { id: 'export',       label: 'Export Promotion Council',icon: FiGlobe       },
  { id: 'ports',        label: 'Ports',                   icon: FiAnchor      },
  { id: 'forwarder',    label: 'Forwarder',               icon: FiPackage     },
  { id: 'carrieragent', label: 'Carrier Agent',           icon: FiSend        },
  { id: 'shippingline', label: 'Shipping Line',           icon: FiMapPin      },
];

const SetupMasterEntries = ({ show, onToggle, onSelect, activePage }) => {
  return (
    <div className="sidebar-section">
      <div className="section-title">SETUP MASTER ENTRIES</div>

      <div className="master-entries-container">
        <div className="master-entries-header" onClick={onToggle}>
          <div className="header-left">
            <FiGrid className="icon" size={18} />
            <span>Master Entries</span>
          </div>
          <FiChevronDown
            className={`dropdown-icon ${show ? 'open' : ''}`}
            size={14}
          />
        </div>

        {show && (
          <div className="master-entries-grid">
            {entries.map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                className={`master-entry-item ${activePage === id ? 'active' : ''}`}
                onClick={() => onSelect(id)}
              >
                <Icon className="entry-icon" size={16} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupMasterEntries;