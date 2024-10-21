import React from 'react';
import './SignUp.css'

function SignUp() {
  return (
    <div className="signUp">
      <header>
        <h1>Sign Up Page</h1>
      </header>
      <body>
        <p>Enter Username:</p>
        <p>Enter Password:</p>
        <p>Re-enter Password:</p>
        <p>Enter Email:</p>
        <a href="/"><button className="search-button">Sign Up</button></a>
      </body>
    </div>
  );
}

export default SignUp;