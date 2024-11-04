import './login.css';
import Form from 'next/form';

const LoginPage = () => {
    return (
      <div className='login'>
        <h1>LOGIN</h1>
        <Form action='/packages'>
          <label>
            Username:
            <input type='text' name='username' />
          </label>
          <label>
            Password:
            <input type='password' name='password' />
          </label>
          <button type='submit'>Login</button>
        </Form>
      </div>
    )
};

export default LoginPage;