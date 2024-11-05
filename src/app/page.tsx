import Link from "next/link";

const IndexPage = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Package Manager</h1>
        <Link className="sign-up" href="/login"><button className="search-button">Login</button></Link>
      </header>
      <body></body>
    </div>
  );
}

export default IndexPage;
