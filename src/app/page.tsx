import Link from "next/link";

const IndexPage = () => {
  return (
    <div className="App">
      <header className="App-header">
        <div className="login-container">
          <Link className="sign-up" href="/login"><button className="login-button">Login</button></Link>
        </div>
        <h1>Package Manager</h1>
      </header>
      <body></body>
    </div>
  );
}

export default IndexPage;
