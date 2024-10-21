import React from 'react';
import './Login.css';

function Login() {
  return (
    <div className='login'>
      <header>
        <h1>Login Page</h1>
      </header>
      <body>
        <p>Enter Username:</p>
        <p>Enter Password:</p>
        <button className="search-button">Login</button>
        <p>Not already a member?</p>
        <a href="/SignUp"><button className="search-button">Sign Up</button></a>
      </body>
    </div>
  );
}

export default Login;
