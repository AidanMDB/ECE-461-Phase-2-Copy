"use client";
import './signup.css';
// import React from 'react';
import { useState } from 'react';
// import Form from 'next/form';

const SignUp = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');

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

        <div className="form-group">
          <label htmlFor="password">Re-enter Password:</label>
          <input
            id="repassword"
            type="password"
            value={repassword}
            onChange={e => setRepassword(e.target.value)}
            className="input"
            aria-label="Password"
            placeholder="Password"
          />
        </div>

        <div className="button-group">
            <button type='submit'>Sign Up</button>
        </div>
        </form>
      </main>
    </div>
    )
};

export default SignUp;