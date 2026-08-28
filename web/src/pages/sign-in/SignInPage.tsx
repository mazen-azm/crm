import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/auth-context';

// Unstyled on purpose: the tokens and primitives arrive with PLATFORM-10-WEB,
// and inventing a colour here would be the first literal outside the file that
// is meant to own every one of them.
export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No network call. IDENTITY-1-API (CRM-41) replaces this with a token the
    // API issues; the context and the guard around it stay as they are.
    signIn('stub-token');
    navigate('/', { replace: true });
  }

  return (
    <main>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Sign in</button>
      </form>
      <p>Real sign-in is not implemented yet — IDENTITY-1-API replaces this stub.</p>
    </main>
  );
}
