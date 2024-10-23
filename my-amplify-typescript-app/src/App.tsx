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
        <a className="sign-up" href="/Login"><button className="search-button">Login</button></a>
        <h1>Package Manager</h1>
      </header>
      <body>
      </body>
    </div>
  );
}

export default App;