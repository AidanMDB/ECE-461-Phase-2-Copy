"use client";
import './login.css';
import { useState } from 'react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
    return (
      <div className='login'>
        <title>Package Manager</title>
        <header className="App-header">
          <h1>Login Page</h1>
        </header>

        <main>
          <form action="/homepage" className='input-section'>
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
              <button className="search-button" type='submit'>Login</button>
          </div>
          </form>
        <div className="sign-up-section">
          <p>Not already a member?</p>
          <a href="/signup">
            <button className="search-button" aria-label="Sign Up Button">Sign Up</button>
          </a>
        </div>
      </main>
    </div>
    )
};

export default LoginPage;