import { login } from "./actions";
import styles from "./login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.brand}>
        <img src="/stitch-logo.png" alt="STITCH Fashion ERP" />
        <h1>STITCH</h1>
        <p>Fashion ERP</p>
      </section>

      <section className={styles.card}>
        <h2>Welkom terug</h2>
        <p>Log in om verder te gaan naar je administratie.</p>

        {params.error && (
          <div className={styles.error}>{params.error}</div>
        )}

        <form action={login}>
          <label>
            <span>E-mailadres</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Wachtwoord</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit">Inloggen</button>
        </form>
      </section>
    </main>
  );
}
