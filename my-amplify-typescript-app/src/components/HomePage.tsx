import React from 'react';
import {useState} from 'react';
import Package from './Package';

function HomePage() {
  const [search, setSearch] = useState('');

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <a className="sign-up" href="/"><button className="search-button">Log Out</button></a>
        <h1>Package Manager</h1> 
            <div className="search-container">
              <input 
                type="text" 
                value={search} 
                onChange={handleSearch}
                className="search-input"
                placeholder="Search for packages..."
              />
            <button className="search-button">Search</button>
          </div>
      </header>
      <body>
        <br />
        <Package />
        <Package />
        <Package />
      </body>
    </div>
  );
}

export default HomePage;