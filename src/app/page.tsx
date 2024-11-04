import Link from "next/link";

const IndexPage = () => {
  return (
    // <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
    //   <h1 className="text-4xl mb-8">Package Manager</h1>
    //   <Link href="/login">      
    //     <button className="px-4 py-2 bg-foreground text-background rounded">Go to Login</button>
    //   </Link>
    // </div>
    <div className="App">
      <header className="App-header">
        <h1>Package Manager</h1>
        <Link className="sign-up" href="/login"><button className="search-button">Login</button></Link>
      </header>
      <body>
      </body>
    </div>
  );
}

export default IndexPage;
