import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import Login from './components/Login'
import SignUp from './components/SignUp';
import ViewPackage from './components/ViewPackage';
import Package from './components/Package';

test('renders home page', () => {
  render(<App />);
  const titleElement = screen.getByText(/Package Manager/i);
  expect(titleElement).toBeInTheDocument();
  const loginElement = screen.getByRole("button")
  expect(loginElement).toBeInTheDocument();
});

test('renders login page', () => {
  render(<Login />);
  const titleElement = screen.getByText(/Login Page/i);
  expect(titleElement).toBeInTheDocument();
  const signUpElement = screen.getByText(/Not already a member?/i)
  expect(signUpElement).toBeInTheDocument();
  const usernameElement = screen.getByText(/Username/i)
  expect(usernameElement).toBeInTheDocument();
  const passwordElement = screen.getByText(/Password/i)
  expect(passwordElement).toBeInTheDocument();
});

test('renders view package page', () => {
  render(<ViewPackage />);
  const titleElement = screen.getByText(/View Package/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders sign up page', () => {
  render(<SignUp />);
  const titleElement = screen.getByText(/Sign Up Page/i);
  expect(titleElement).toBeInTheDocument();
  const usernameElement = screen.getByText(/Enter Username:/i)
  expect(usernameElement).toBeInTheDocument();
  const rePasswordElement = screen.getByText(/Re-enter Password:/i)
  expect(rePasswordElement).toBeInTheDocument();
  const emailElement = screen.getByText(/Enter Email:/i)
  expect(emailElement).toBeInTheDocument();
});

test('renders package page', () => {
  render(<Package />);
  const titleElement = screen.getByText(/Package Name/i);
  expect(titleElement).toBeInTheDocument();
});