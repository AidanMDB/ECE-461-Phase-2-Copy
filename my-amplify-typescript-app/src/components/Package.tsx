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
        <h1>Package Name by Author</h1>
        <div className="view">
        <a href="/ViewPackage"><button className="search-button">View Package</button></a>
        </div>
      </header>
      <hr className="package-divider" />
    </div>
  );
}
export default Package;