import { useAuth } from '../../app/auth-context';

// The authenticated landing. Feature screens arrive in their own stories and
// mount around this; today it exists so the guard has somewhere to let a
// visitor through to.
export function HomePage() {
  const { signOut } = useAuth();

  return (
    <main>
      <h1>Support Desk</h1>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  );
}
