"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const sp = useSearchParams();
  const next = sp.get("next") || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data?.error || "Login failed");
        return;
      }

      if (next) window.location.href = next;
      else window.location.href = data.role === "admin" ? "/admin" : "/guest";
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.h1}>URME</h1>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {err ? <div style={styles.err}>{err}</div> : null}

          <button style={styles.btn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "#f6f7f9",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  },
  h1: { margin: 0, fontSize: 22 },
  p: { margin: "8px 0 16px", color: "rgba(0,0,0,.65)" },
  form: { display: "grid", gap: 12 },
  label: { display: "grid", gap: 6, fontSize: 14 },
  input: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
  },
  btn: {
    marginTop: 6,
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    background: "#276678",
    color: "#fff",
    fontWeight: 700,
  },
  err: {
    background: "rgba(220, 38, 38, .08)",
    border: "1px solid rgba(220, 38, 38, .25)",
    color: "rgb(185, 28, 28)",
    padding: 10,
    borderRadius: 12,
    fontSize: 13,
  },
};
