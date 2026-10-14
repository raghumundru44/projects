# PublicFix AI — AI-Powered Public Issue Resolution

PublicFix AI is a smart civic issue reporting, automated routing, and resolution-tracking platform connecting citizens directly with authorized municipal departments. It features accurate problem-location detection, nearest responsible office assignment, live complaint tracking, and AI-assisted photo verification powered by Google Gemini.

---

## 1. Project Overview

- **Project Name:** PublicFix AI
- **Project Theme:** AI-Powered Smart Civic Automation
- **Primary Goal:** Automate public-issue routing and improve resolution tracking with verifiable photo evidence.
- **Frontend Live URL:** [https://projects-ten-delta-70.vercel.app/](https://projects-ten-delta-70.vercel.app/)

---

## 2. Problem Statement

Citizens routinely experience delays and lack of transparency when reporting civic problems such as road damage, potholes, uncollected garbage, water pipeline leaks, blocked drainage, and defunct streetlights. Traditional grievance systems often suffer from:
- Manual paper or telephone logging prone to backlog.
- Misrouted complaints sent to incorrect or distant municipal offices.
- Lack of real-time progress updates for citizens.
- Inability to objectively verify whether the issue has actually been fixed on the ground.

---

## 3. Proposed Solution

PublicFix AI addresses these challenges with a centralized digital platform:
- **Citizens** report issues with high-accuracy GPS coordinates, photo evidence, and detailed descriptions, tracking progress in real time.
- **Smart Engine** automatically categorizes the complaint and calculates distances using the Haversine formula to assign it to the nearest responsible municipal division (with an unassigned fallback if no matching office exists).
- **Municipal Officers** access an authenticated dashboard filtered strictly to complaints within their department jurisdiction, update statuses, dispatch crews, and submit completion photos.
- **AI-Assisted Photo Verification** uses Google Gemini to compare initial complaint photos against officer completion photos, advising citizens and administrators with objective visual verdicts.

---

## 4. Key Features

### Citizen Module
- **Secure Authentication:** JWT-based signup and login with hashed passwords.
- **Geolocated Issue Reporting:** High-accuracy GPS location capture via the browser Geolocation API with reverse geocoding to exact street addresses.
- **Photo Upload:** Attach image evidence of the reported civic issue.
- **Live Complaint Tracking:** View status milestones, officer response notes, and assigned office details.
- **Human Confirmation:** Citizens review AI verification results and provide final resolution sign-off.

### Municipal Officer Module
- **Role-Based Access Control:** Strict departmental and office authorization; officers only access complaints assigned to their department/office.
- **Filtered Dashboard:** Filter by Active, Overdue, Awaiting Verification, or All Complaints with real-time refresh.
- **Progress Updates:** Update complaint status (`IN_PROGRESS`, `RESOLVED`) and append official notes with dispatch details.
- **Resolution Evidence:** Upload post-work completion photos for AI comparison.

### Smart Automation
- **Issue Classification:** Categorizes complaints into Roads, Sanitation, Water/Drainage, Electrical, and Civic Infrastructure.
- **Proximity & Jurisdiction Routing:** Evaluates verified office coordinates against complaint GPS location to assign the nearest eligible facility.
- **Graceful Fallback:** Routes unmapped or non-matching issues to `UNASSIGNED` for administrative review.
- **Overdue Tracking:** Flags stalled or delayed cases automatically based on SLA windows.

### AI-Assisted Verification
- **Dual-Image Analysis:** Compares original vs. completion photos using Google Gemini AI.
- **Visual Confidence Score:** Evaluates whether physical defects have been remediated.
- **Decision Support:** Serves as decision intelligence to assist human verification rather than replacing responsible inspectors.

---

## 5. Technology Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Lucide Icons, Leaflet / OpenStreetMap.
- **Backend:** Node.js, Express.js.
- **Database:** SQLite (persisted with WAL mode).
- **AI Integration:** Google Gemini API (`@google/genai`).
- **Security & Auth:** JSON Web Tokens (JWT), bcrypt.js, parameterized SQL queries, CORS configuration.
- **Geolocation:** Browser Geolocation API (`navigator.geolocation`) & OpenStreetMap Nominatim.
- **Deployment:** Vercel (Frontend), Render (Backend).

---

## 6. Project Architecture & Workflow

```
[ Citizen ] ──> Submits Photo, Address & GPS ──> [ Express API ]
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
       [ Smart Assignment Engine ]                                             [ SQLite Database ]
  (Haversine Distance & Office Matrix)                                    (Stores complaints, offices, users)
                      │
                      ▼
   [ Nearest Municipal Office Assigned ]
                      │
                      ▼
  [ Officer Dashboard (Strict RBAC) ] ──> Updates Status & Submits Resolution Photo
                                                        │
                                                        ▼
                                        [ Gemini AI Photo Verification ]
                                                        │
                                                        ▼
                                       [ Citizen Confirms Resolution ]
```

---

## 7. Demo Accounts

| Role | Email | Password | Department / Office |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@demo.com` | `demo1234` | Citizen Reporter |
| **Officer (Roads)** | `officer@demo.com` | `demo1234` | Road Maintenance (GMC Road Infrastructure Division) |
| **Officer (Sanitation)** | `officer2@demo.com` | `demo1234` | Sanitation (GMC Public Health & Sanitation Wing) |
| **Officer (Water)** | `water.officer@demo.com` | `demo1234` | Water and Sewerage Division |
| **Officer (Electrical)**| `electric.officer@demo.com` | `demo1234` | Electrical Maintenance Division |
| **Admin** | `admin@demo.com` | `demo1234` | System Administrator |

---

## 8. Local Setup & Execution

### Backend
```bash
cd backend
npm install
node database/seed.js   # Seed demo offices, categories, users, and routing rules
node server.js          # Starts server on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # Starts Vite development server
```

### Production Build
```bash
cd frontend
npm run build           # Compiles production assets into dist/
```
