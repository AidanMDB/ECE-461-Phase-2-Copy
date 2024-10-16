import React from 'react';
import './App.css';
import {useState} from 'react';
import Package from './components/Package';

function App() {
  const [search, setSearch] = useState('');

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
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

export default App;