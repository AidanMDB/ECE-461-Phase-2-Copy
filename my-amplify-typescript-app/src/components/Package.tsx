import React from 'react';
import './Package.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ViewPackage from './ViewPackage';

function Package() {
async function viewPackage() {
    console.log("viewing package");
}

  return (
    <div className="Package">
      <header>
        <div className="Package-text">
          <h1>Package Name by Author</h1>
        </div>
        <div className="header">
          <button className="view-button">View Package</button>
        </div>
      </header>
      <hr className="package-divider" />
    </div>
  );
}
export default Package;
