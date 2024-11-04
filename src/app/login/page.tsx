"use client";
import './login.css';
// import React from 'react';
import { useState } from 'react';
// import Form from 'next/form';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
    return (
      <div className='login'>
      <header>
        <h1>Login Page</h1>
      </header>

      <main>
        <form action="/homepage">
        <div className="form-group">
          <label htmlFor="username">Enter Username:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="input"
            aria-label="Username"
            placeholder="Username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Enter Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input"
            aria-label="Password"
            placeholder="Password"
          />
        </div>

        <div className="button-group">
          {/* <a href="/HomePage"> */}
            {/* <button className="search-button" aria-label="Login Button">Login</button> */}
          {/* </a> */}
            <button type='submit'>Login</button>
        </div>


        {/* <div className="sign-up-section">
          <p>Not already a member?</p>
          <a href="/SignUp">
            <button className="search-button" aria-label="Sign Up Button">Sign Up</button>
          </a>
        </div> */}
        </form>
      </main>
    </div>
    )
};

export default LoginPage;