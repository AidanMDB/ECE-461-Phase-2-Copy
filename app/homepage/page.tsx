/**
 * This file handles the homepage of the Package Manager.
**/

"use client";
import { useState } from 'react';
import './homepage.css';
import '../globals.css';
import Link from 'next/link';

const HomePage = () => {
    const [search, setSearch] = useState('');
    const [fileNames, setFileNames] = useState<string[]>([]);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    }

    async function displayS3Files() {
        setFileNames(["file1", "file2", "file3"]);
        console.log(fileNames);
    }
  return (
    <div className="App">
      <title>Package Manager</title>
      <header className="App-header">
        <div className="login-container">
          <Link className="sign-up" href="/upload"><button className="login-button">Upload Package</button></Link>
          <Link className="sign-up" href="/"><button className="login-button">Log Out</button></Link>
        </div>
        <div className="title-container">
        <h1>Package Manager</h1> 
        </div>
            <div className="search-container">
            <label htmlFor="search" className="sr-only">Search for packages:</label>
              <input 
                id="search"
                type="text" 
                value={search} 
                onChange={handleSearch}
                className="search-input"
                placeholder="Search for packages..."
              />
            <button onClick={displayS3Files} className="search-button">Search</button>
          </div>
      </header>
        <br />
        {fileNames.map((item, index) => (
          <div key={index}>
            <div className="Package">
              <header>
                <h1>{item} by Package Author</h1>
                <div className="view">
                  <Link href={{
                      pathname: '/package',
                      query: {
                        name: item
                      }
                      }}>
                    <button className="search-button">View Package</button>
                  </Link>
                </div>
              </header>
              <hr className="package-divider" />
            </div>
          </div>
        ))}
    </div>
  );
}

export default HomePage;