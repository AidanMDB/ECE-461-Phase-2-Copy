import React from 'react';
import './SignUp.css'
// import { useNavigate } from 'react-router-dom';

function SignUp() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rePassword, setRePassword] = React.useState('');
  const [email, setEmail] = React.useState('');
  // const navigate = useNavigate();

  async function handleSubmit() {
    console.log("user sign up!")
    console.log(username)
    console.log(password)
    console.log(rePassword)
    console.log(email)
    // navigate('/HomePage')
  }

  return (
    <div className="signUp">
      <header>
        <h1>Sign Up Page</h1>
      </header>
      <body>
        <form className='signUp-form' onSubmit={handleSubmit}>
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
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          className="input"
          placeholder=""
        ></input>
        <p>Re-enter Password:</p>
        <input
          type="password" 
          value={rePassword} 
          onChange={e => setRePassword(e.target.value)}
          className="input"
          placeholder=""
        ></input>
        <p>Enter Email:</p>
        <input
          type="text" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
          className="input"
          placeholder=""
        ></input>
        <br />
        <br />
        <button type="submit" className="search-button" >Sign Up</button>
        </form>
        <a href="/HomePage"><button className="search-button">Go to Search Package Page</button></a>
      </body>
    </div>
  );
}

export default SignUp;