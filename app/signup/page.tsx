/**
 * This file handles the signup page of the Package Manager.
**/

"use client";
import './signup.css';
import { useState } from 'react';
import '../globals.css';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !username || !password || !repassword) {
      setError('Please enter all fields');
    } else if (!validateEmail(email)) {
      setError('Please enter a valid email');
    } else if (password !== repassword) {
      setError('Passwords do not match');
    } else {
      setError('');
      window.location.href = '/homepage';
    }
  };

    return (
      <div className='login'>
        <title>Package Manager</title>
        <header className="App-header">
          <h1>SignUp Page</h1>
        </header>

        <main>
          <form onSubmit={handleSubmit} className='input-section'>
          <div className="form-group">
            <label htmlFor="email">Enter Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
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
              placeholder="Password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="repassword">Re-Enter Password:</label>
            <input
              id="repassword"
              type="password"
              value={repassword}
              onChange={e => setRepassword(e.target.value)}
              className="input"
              placeholder="Re-enter Password"
            />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="button-group">
              <button className="search-button" type='submit'>Sign Up</button>
          </div>
          </form>
      </main>
    </div>
    )
};

export default SignUp;