"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
// import "@aws-amplify/ui-react/styles.css";
import "./globals.css";
//import { useAuthenticator } from "@aws-amplify/ui-react";
import Link from "next/link";

// reference existing AWS cognito
Amplify.configure(outputs); 

const client = generateClient<Schema>();

export default function App() {
  //const { user, signOut } = useAuthenticator();
  const [packages, setPackages] = useState<Array<Schema["Package"]["type"]>>([]);

  function listPackages() {
    client.models.Package.observeQuery().subscribe({
      next: (data) => setPackages([...data.items]),
    });
  }

  //function listPackageData() {      Edit this so it will display the ratings on click

  //};

  useEffect(() => {
    listPackages();
  }, []);

  return (
    <main className="App">
      <title>Package Manager</title>
      <header className="App-header">
        <div className="login-container">
          <Link className="sign-up" href="/login"><button className="login-button">Login</button></Link>
        </div>
        <h1 className="title">Package Manager</h1>
      </header>
    </main>
    // <main>
    //   <div className="login-container">
    //     <Link className="sign-up" href="/login"><button className="login-button">Login</button></Link>
    //   </div>
    //   <h1>Packages</h1>
    //   <ul>
    //     {packages.map((pkg) => (
    //       <li key={pkg.ID}>{pkg.Name} : {pkg.Version}</li>
    //     ))}
    //   </ul>
    //   {/* <div>
    //     <Link href="/upload"><button>Go to Upload File Page</button></Link>
    //   </div> */}
    // </main>
  );
}

//<h1>{user?.signInDetails?.loginId}'s todos</h1>
//<button onClick={signOut}>Sign out</button>