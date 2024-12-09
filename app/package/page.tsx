/**
 * This file handles the packages in the Package Manager.
**/

"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './package.css';
import '../globals.css';
import { handler } from '../../amplify/functions/api-package-list/handler';

const Package = ({ searchParams }: any) => {
  const [packageData, setPackageData] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the handler function
        const data = await handler(
          { body: JSON.stringify({ name: searchParams.name }) } as any,
          {} as any, // context
          () => {} // callback
        );

        // Fetch packages from the backend
        const response = await fetch(
          'https://wdyoiqbu66.execute-api.us-east-1.amazonaws.com/dev/packages', 
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': 'static-token', // Replace with actual token
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        setPackageData(result);
        setPackages(result.packages || []); // Ensure packages is an array
      } catch (error) {
        console.error('Error fetching package data:', error);
      }
    };

    fetchData();
  }, [searchParams]); 

  return (
    <div className="view-package-container">
      <title>Package Manager</title>
      <header className="App-header">
        <div className="back-button">
          <Link href="/homepage">
            <button className="package-button">Back</button>
          </Link>
        </div>
        <div className="button-container">
          <Link href="/homepage">
            <button className="package-button">Download Package</button>
          </Link>
          <form action="/action_page.php">
            <input type="file" id="myFile" name="filename"></input>
            <Link href="/update">
              <button className="package-button" type="submit">Update Package</button>
            </Link>
          </form>
        </div>
        {packageData ? (
          <h1>{packageData.name} by {packageData.author}</h1>
        ) : (
          <h1>Loading...</h1>
        )}
      </header>
      <div className="package-info-block">
        {packages.map((pkg: any, index: number) => (
          <div className="package-info" key={index}>
            <p>
              <strong>Version:</strong> {pkg.Version}
            </p>
            <p>
              <strong>Name:</strong> {pkg.Name}
            </p>
          </div>
           ))}
           </div>
         </div>
       );
     };
     
     export default Package;