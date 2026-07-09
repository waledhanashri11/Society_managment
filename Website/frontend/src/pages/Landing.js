import React from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="landing-page" style={{ backgroundImage: "url('/assets/society.jpg')" }}>
      <div className="landing-background"></div>
      <div className="landing-glow landing-glow-left"></div>
      <div className="landing-glow landing-glow-right"></div>

      <header className="landing-header">
        <div className="landing-brand">Community Hive</div>
        <nav className="landing-actions">
          <Link to="/" className="landing-button landing-button-outline">
            Home
          </Link>
          <Link to="/login" className="landing-button landing-button-outline">
            Login
          </Link>
          <Link to="/register" className="landing-button landing-button-outline">
            Register
          </Link>
        </nav>
      </header>

      <main className="landing-hero">
        <section className="landing-copy">
          <span className="landing-badge">Welcome to your society hub</span>
          <h1>Manage community life with clarity, speed, and trust.</h1>
          <p>
            A polished entry point for notices, maintenance requests, resident support, and secure community coordination — before you even log in.
          </p>
          <div className="landing-cta-group">
            <Link to="/register" className="landing-button landing-button-hero">
              Create account
            </Link>
            <Link to="/login" className="landing-button landing-button-secondary">
              Have an account?
            </Link>
          </div>
        </section>

       
      </main>
    </div>
  );
};

export default Landing;
