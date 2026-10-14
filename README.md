🌐 Live Vercel Application: https://projects-ten-delta-70.vercel.app/

Project Summary
Dimension	Implementation Details
Project Theme	AI-Powered Smart Civic Automation & Issue Resolution
Primary Goal	Automate public-issue routing and improve resolution tracking with verifiable photo evidence.
Core Architecture	React + Vite frontend, Express + Node.js backend, SQLite database with WAL persistence, JWT auth, and Google Gemini AI verification.
Citizen Experience	Exact GPS location detection via Geolocation API, reverse geocoding, photo capture, and transparent timeline tracking.
Smart Routing	Dynamic categorization, Haversine formula distance calculation, and nearest municipal office assignment with fallback to UNASSIGNED.
Officer Workflow	Department-restricted officer dashboards (officer@demo.com, officer2@demo.com, etc.), status transitions (IN_PROGRESS, RESOLVED), and completion photo upload.
AI Verification	Before-and-after photo comparison powered by Gemini AI with human-in-the-loop citizen confirmation.
Source Control	Committed and pushed to main branch (ea725e5).
