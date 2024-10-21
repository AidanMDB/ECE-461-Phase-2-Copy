import React, { useState } from 'react';
import './Login.css';

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className='login'>
      <header>
        <h1>Login Page</h1>
      </header>
      <body>
        <p>Enter Username:</p>
        <input
          type="text" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          className="input"
          placeholder=""
        ></input>
        <p>Enter Password:</p>
        <input
          type={showPassword ? "text" : "password"}
          value={password} 
          onChange={e => setPassword(e.target.value)}
          className="input"
          placeholder=""
        ></input>
        <button className="show-password" onClick={()=> setShowPassword(!showPassword)}>
          {showPassword ? "Hide Password" : "Show Password"}
        </button>
        <br />
        <button className="search-button">Login</button>
        <p>Not already a member?</p>
        <a href="/SignUp"><button className="search-button">Sign Up</button></a>
      </body>
    </div>
  );
}

export default Login;

