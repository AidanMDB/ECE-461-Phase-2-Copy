// "use client";
import './package.css';
//import Form from 'next/form';
//import { useState } from 'react';

const Package = async () => {

    return (
    <div className="Package">
      <header>
        <h1>Package Name by Package Author</h1>
        <div className="view">
        <a href="/ViewPackage"><button className="search-button">View Package</button></a>
        </div>
      </header>
      <hr className="package-divider" />
    </div>
    )
};

export default Package;