'use client';

import { useState } from 'react';
import './homepage.css';
import '../globals.css';
import Link from 'next/link';

const HomePage = () => {
  const [search, setSearch] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  async function displayS3Files() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://wdyoiqbu66.execute-api.us-east-1.amazonaws.com/dev/packages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': 'static-token', // Replace with actual token
          },
          body: JSON.stringify({
            Name: search || '*', // Fetch all packages if no search term is provided
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status}`);
      }

      const data = await response.json();

      // Assuming the response is an array of file names
      setFileNames(data.map((pkg: { Name: string }) => pkg.Name));
    } catch (err: any) {
      console.error('Error fetching file names:', err);
      setError(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <title>Package Manager</title>
      <header className="App-header">
        <div className="login-container">
          <Link className="sign-up" href="/upload">
            <button className="login-button">Upload Package</button>
          </Link>
          <Link className="sign-up" href="/">
            <button className="login-button">Log Out</button>
          </Link>
        </div>
        <div className="title-container">
          <h1>Package Manager</h1>
        </div>
        <div className="search-container">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            className="search-input"
            placeholder="Search for packages..."
          />
          <button onClick={displayS3Files} className="search-button">
            Search
          </button>
        </div>
      </header>
      <br />
      {loading && <p>Loading packages...</p>}
      {error && <p className="error-message">{error}</p>}
      {fileNames.length > 0 ? (
        fileNames.map((item, index) => (
          <div key={index}>
            <div className="Package">
              <header>
                <h1>{item} by Package Author</h1>
                <div className="view">
                  <Link
                    href={{
                      pathname: '/package',
                      query: {
                        name: item,
                      },
                    }}
                  >
                    <button className="search-button">View Package</button>
                  </Link>
                </div>
              </header>
              <hr className="package-divider" />
            </div>
          </div>
        ))
      ) : (
        !loading && <p>No packages found.</p>
      )}
    </div>
  );
};

export default HomePage;
