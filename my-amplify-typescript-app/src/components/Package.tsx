import React from 'react';
import './Package.css';
import { useNavigate } from 'react-router-dom';

function Package() {
  const navigate = useNavigate();

async function viewPackage() {
    console.log("viewing package");
    navigate('/ViewPackage');
}

  return (
    <div className="Package">
      <header>
        <div className="Package-text">
          <h1>Package Name by Author</h1>
        </div>
        <div className="header">
          <button className="view-button" onClick={viewPackage}>View Package</button>
        </div>
      </header>
      <hr className="package-divider" />
    </div>
  );
}
export default Package;
