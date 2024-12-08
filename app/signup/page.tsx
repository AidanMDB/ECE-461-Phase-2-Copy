/**
 * This file handles the signup page of the Package Manager.
**/

"use client";
import './signup.css';
// import React from 'react';
import { useState } from 'react';
// import Form from 'next/form';e
import '../globals.css';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');

    return (
      <div className='login'>
        <title>Package Manager</title>
        <header className="App-header">
          <h1>SignUp Page</h1>
        </header>

        <main>
          <form action="/homepage" className='input-section'>
          <div className="form-group">
            <label htmlFor="username">Enter Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              aria-label="Email"
              placeholder="Email"
            />
          </div>

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
            <label htmlFor="password">Re-Enter Password:</label>
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
              <button className="search-button" type='submit'>Sign Up</button>
          </div>
          </form>
      </main>
    </div>
    )
};

export default SignUp;