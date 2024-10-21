import React from 'react';
import './ViewPackage.css';

function ViewPackage() {
  return (
    <div className="view-package-container">
      <header>
        <h1>View Package</h1>
      </header>

      <div className="package-content">
        <div className="package-title-block">
          <h2>Package Name: Example Package</h2>
        </div>

        <div className="button-container">
          <button className="package-button download">Download Package</button>
          <button className="package-button update">Update Package</button>
          <button className="package-button upload">Upload New Package</button>
        </div>
      </div>

      <div className="package-info-block">
        <div className="package-info">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Description:</strong> Add me on roblox im looking for a cactus friend :D.</p>
          <p><strong>Author:</strong> Bill Nye the Science Guy</p>
        </div>
      </div>
    </div>
  );
}

export default ViewPackage;

