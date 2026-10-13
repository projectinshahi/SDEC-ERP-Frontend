import { redirect } from 'next/navigation';

// Sign-up is part of the login form now (unknown email + password creates the account).
export default function RegisterPage() {
  redirect('/login');
}
