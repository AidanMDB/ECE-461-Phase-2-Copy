"use client";
import { useState } from 'react';
import './homepage.css';
import Link from 'next/link';

const HomePage = () => {
    const [search, setSearch] = useState('');
    const [fileNames, setFileNames] = useState<string[]>([]);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    }

    async function displayS3Files() {
        // setFileNames(await listFiles()); // integrate frontend with backend here
        setFileNames(["file1", "file2", "file3"]);
        console.log(fileNames);
    }
  return (
    <div className="App">
      <header className="App-header">
        <Link className="sign-up" href="/"><button className="search-button">Log Out</button></Link>
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
            <button onClick={displayS3Files} className="search-button">Search</button>
          </div>
      </header>
      <body>
        <br />
        {fileNames.map((item, index) => (
          <p key={index}><Link href='/package'>{item}</Link></p> //will be <Package data={item}/>
        ))}
      </body>
    </div>
  );
}

export default HomePage;