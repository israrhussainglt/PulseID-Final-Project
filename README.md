PulseID — Universal Digital Medical Identity System

PulseID is a secure digital medical identity and health-record platform designed to provide patients, doctors, hospitals, emergency responders, and public-health analysts with the right information at the right level of access.

Each patient has a single digital medical identity linked to their National ID, with role-based access controls, emergency QR access, appointment management, medical records, audit trails, risk scoring, proactive follow-ups, and aggregate public-health analytics.

The system is designed around one core principle:

Expose only the information required for the specific user and situation.

✨ Key Features
👨‍⚕️ Doctor Portal

Doctors can:

Log in securely using email and password
Search patients by name or National ID
Scan patient QR codes
Register new patients
View patient medical records
Add visits, vitals, and prescriptions
Update permitted patient demographic information
View patient risk indicators
Manage appointments
View weekly calendar/agenda
Manage waitlists
Create recurring appointments
Start proactive patient follow-ups
Generate detailed medical reports
View patient access/audit history
🏥 Hospital Admin Console

Hospital administrators have a separate authentication and authorization boundary.

They can:

View hospital-level operational statistics
Create doctor accounts
Edit doctor specializations
Activate/deactivate doctors
Import multiple doctors using CSV
View doctor activity logs
Correct patient registration information
Manage hospital appointments
Export filtered appointment data
Generate aggregate operational summaries

Hospital administrators cannot access clinical history, including:

Diagnoses
Symptoms
Clinical notes
Visit history
Prescriptions
Other clinical content

All hospital-admin operations are scoped server-side to the administrator's own hospital.

👤 Patient Portal

Patients authenticate using:

National ID → OTP verification → Patient Portal

Patients can:

View their medical records
View visit history
View prescriptions
Download medical reports
View appointments
Request appointments
Cancel appointments
Manage dependents
View proactive follow-ups
Submit follow-up check-ins
View their risk score
View their audit/access history
Preview emergency information
Access emergency scanning functionality

Patients cannot:

Register themselves
Assign themselves to a doctor
Choose appointment times
Modify their legal National ID
Access another patient's information
🚨 Emergency Access

PulseID provides a dedicated emergency-access workflow for situations where a patient cannot authenticate normally.

A responder can scan a:

CNIC
B-Form
PulseID QR code

The emergency view exposes only critical information:

Blood group
Allergies
Chronic conditions
Emergency contacts

It does not expose:

Diagnoses
Visit history
Prescriptions
Clinical notes
Full medical records
QR Security

Emergency QR tokens are rotated after every use.

This prevents a previously photographed or leaked QR code from being reused indefinitely.

Emergency access is also:

Rate-limited
Audit-logged
Server-side authorized
Limited to life-critical information
📅 Appointment Management

PulseID separates appointment requests from appointment scheduling.

Patient

A patient can:

Select a doctor
Optionally provide a reason
Submit an appointment request

The patient cannot select the date or time.

Doctor

The doctor can:

Review requests
Select a date/time
Confirm appointments
Reschedule appointments
Complete appointments
Cancel appointments

This restriction is enforced by the backend API rather than only by the frontend.

🔁 Recurring Appointments

Doctors can create recurring follow-ups with:

Weekly cadence
Every-two-weeks cadence
Monthly cadence
2–26 occurrences

Each appointment receives its own record while sharing a recurrence_group_id.

Individual appointments can later be:

Rescheduled
Cancelled
Completed
⏳ Waitlist

Patients can join a doctor's waitlist when they need an earlier appointment.

Doctors can:

Offer a Slot

This converts a waitlist entry directly into a confirmed appointment at a doctor-selected time.

📆 Calendar

Doctors have a dedicated weekly calendar at:

/doctor/calendar

The calendar displays appointments with assigned dates and times, making it easier to understand a doctor's schedule than a traditional status-based appointment list.

🩺 Rule-Based Risk Scoring

PulseID includes an explainable clinical risk-flagging system based on recorded vitals.

It evaluates:

Blood pressure
Blood glucose
Body temperature
Heart rate
Age
Optional maternal context

The system produces:

Low
Medium
High

Each result includes the factors that triggered the flag.

Important Design Decision

This is not a machine-learning diagnosis system.

It uses deterministic clinical thresholds so that every result can be:

Explained
Audited
Reproduced
Tested

Every risk response includes the following disclaimer:

Automated, rule-based flag from recorded vitals only — not a diagnosis. Always use clinical judgement.

🔄 Proactive Patient Follow-Ups

Doctors can create recurring follow-up programs for patients.

Supported use cases include:

Postpartum monitoring
Post-operative monitoring
Chronic-condition monitoring
Custom follow-ups

Each follow-up can contain structured questions such as:

0–10 scale questions
Yes/No questions
Free-text questions

The system includes predefined question templates while also allowing custom questions.

Automated Follow-Up Scheduler

A standalone scheduler:

Runs hourly
Finds due follow-ups
Sends email/SMS prompts
Advances the follow-up schedule
Flags concerning responses

Risk flagging is deterministic and does not depend on AI.

AI-generated summaries are optional and only provide a short doctor-facing explanation of a patient's responses.

🧾 Medical Reports

PulseID uses a shared report-generation engine for different audiences.

Patient Report

Patients receive a readable report containing their medical information.

Doctor Report

Doctors can generate a more formal medical report containing:

Patient information
Visit history
Current medications
Prescription history
Risk/allergy alerts
Emergency contacts
Record-access audit history

Reports can be printed or saved as PDF.

📱 Progressive Web App

PulseID is implemented as an installable Progressive Web App (PWA).

Users can install it through supported browsers without an app store.

Supported capabilities include:

Installable application
Custom application icon
Home-screen installation
Standalone application experience
Offline fallback page
Privacy-Focused Caching

The service worker caches only public/static application assets.

It never caches API responses or medical records.

This prevents stale medical information from being presented as current information while offline.

📊 Public Health Analytics

PulseID includes a completely separate analytics application designed for:

Public-health analysts
Regional administrators
Ministry of Health users

The analytics system operates on aggregate data only.

It cannot access:

Patient names
National IDs
Individual medical records
Clinical notes
Individual prescriptions
Analytics Dashboard
Overview

Displays:

National visit totals
Patient totals
Hospital totals
Active regions
Busiest regions
Common conditions
Regions

Provides:

Region → Hospital → Doctor

aggregate hierarchy.

Hospital-level statistics include:

Doctor count
Visit count
Patient count
Map

A Leaflet-based geographical visualization showing regional case volumes.

Trends

Users can analyze condition trends over time and optionally view a simple forecast projection.

Benchmark

Compares a region's share of visits for a condition against its national share.

Alerts

Identifies regions and conditions with unusually high activity compared with their recent baseline.

Ask

Provides a natural-language interface for querying aggregate public-health data.

Bulletins

Automatically generates weekly/monthly epidemiological bulletins containing:

AI-generated narrative
National trends
Regional activity
Top conditions
Alert magnitude

Bulletins enter a:

pending_review

state.

An analyst must explicitly approve or reject them.

Nothing is automatically published.

Resources

Provides AI-generated suggestions for areas that may deserve additional human investigation.

These are informational pointers, not automated decisions.

Data Quality

Identifies unusual reporting-volume changes that may indicate data-pipeline problems rather than genuine changes in disease activity.

🔐 Small-Cell Suppression

To reduce re-identification risk, analytics uses a minimum cell size of 5.

Any aggregate count below five is displayed as:

<5

rather than exposing the exact number.

This rule applies across:

Regions
Hospitals
Conditions
Other aggregate views

This prevents combinations of geographic and clinical information from exposing individual patients.

🏛️ Regional Hierarchy

PulseID models healthcare organizations using:

Region
└── Hospital
    └── Doctor
        └── Patients

Supported Pakistani administrative regions include:

Punjab
Sindh
Khyber Pakhtunkhwa
Balochistan
Gilgit-Baltistan
Azad Jammu & Kashmir
Islamabad Capital Territory

The seed data demonstrates this structure with multiple hospitals and doctors across the regions.

🔑 Role-Based Access Control

PulseID uses separate security boundaries for different user types.

Role	Authentication	Access
Patient	National ID + OTP	Own record, dependents and appointments
Doctor	Email + Password	Own patients and clinical operations
Hospital Admin	Email + Password	Own hospital administration
Analytics Analyst	Separate analytics login	Aggregate public-health data
Security Principle

Authorization is enforced at the API layer, not only in the frontend.

For example:

requireDoctor
requireHospitalAdmin

are used to protect sensitive backend routes.

Hospital-admin requests are additionally scoped using the administrator's hospitalId from the signed session.

A client cannot simply submit another hospital_id to access another hospital.

🔒 Security Architecture

PulseID implements multiple security controls.

Authentication
bcrypt password hashing
Signed JWT sessions
HTTP-only cookies
Short-lived sessions
Dummy password-hash comparison for unknown accounts
OTP-based patient authentication
Session Security
HTTP-only cookies
Secure production cookies
CSRF double-submit-cookie protection
Separate session types for different applications
Rate Limiting

Rate limiting is applied to sensitive endpoints including:

Authentication
OTP requests
Emergency lookups
QR lookups
Analytics AI queries
Audit Logging

The system records sensitive actions such as:

Patient-record access
Patient-detail edits
Emergency scans
Doctor activity
Hospital-admin changes
Analytics actions
Bulletin approvals
Analyst account changes

Patients can view the access history associated with their own records.

🧠 AI Architecture

AI is intentionally used only where it provides value without becoming the source of truth for critical decisions.

AI features include:

Hospital appointment-load summaries
Patient follow-up summaries
Public-health natural-language queries
Epidemiological bulletins
Alert narratives
Resource suggestions

Supported providers:

OpenRouter
Anthropic

If no AI provider is configured, the application gracefully falls back to a clear:

AI not configured

message.

AI Trust Boundary

AI-generated content operates on already-computed data.

For example, analytics percentages and counts are calculated by backend code first. The AI does not generate the underlying statistics.

🏗️ System Architecture

PulseID is divided into three independently deployable services:

                         ┌─────────────────────┐
                         │       Patient       │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Frontend       │
                         │      Next.js        │
                         │       PWA           │
                         └──────────┬──────────┘
                                    │
                                    │ API
                                    ▼
                         ┌─────────────────────┐
                         │       Backend       │
                         │ Express + TypeScript│
                         │ Auth / Records / QR │
                         │ Appointments / Audit│
                         └──────────┬──────────┘
                                    │
                              SQLite Database
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                                           │
     ┌────────▼─────────┐                       ┌─────────▼────────┐
     │ Analytics Service│                       │ Background Jobs  │
     │     Next.js      │                       │ Reminders        │
     │ Aggregate Only   │                       │ Follow-ups       │
     └──────────────────┘                       │ Bulletins        │
                                                └──────────────────┘
📁 Project Structure
pulseid/
│
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   └── lib/
│   │       ├── db.ts
│   │       ├── repo.ts
│   │       ├── auth.ts
│   │       ├── report.ts
│   │       ├── pdf-report.ts
│   │       ├── sms.ts
│   │       ├── email.ts
│   │       ├── reminders.ts
│   │       ├── risk-scoring.ts
│   │       ├── followup-agent.ts
│   │       └── ai.ts
│   │
│   └── scripts/
│       ├── seed.js
│       ├── reminder-scheduler.ts
│       └── followup-scheduler.ts
│
├── frontend/
│   ├── app/
│   │   ├── doctor/
│   │   ├── patient/
│   │   ├── hospital-admin/
│   │   └── emergency/
│   ├── components/
│   ├── public/
│   │   ├── sw.js
│   │   ├── offline.html
│   │   └── site.webmanifest
│   └── middleware.ts
│
├── analytics/
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── ai.ts
│   │   ├── auth.ts
│   │   ├── bulletin-db.ts
│   │   ├── bulletin-generator.ts
│   │   └── geo.ts
│   ├── scripts/
│   │   └── scheduler.ts
│   └── middleware.ts
│
├── docker-compose.yml
└── README.md
⚙️ Technology Stack
Backend
Node.js
Express
TypeScript
SQLite
better-sqlite3
bcrypt
JWT
Vitest
Frontend
Next.js
React
TypeScript
Progressive Web App
Service Worker
Analytics
Next.js
React
Leaflet
SQLite
OpenRouter / Anthropic
Infrastructure
Docker
Docker Compose
GitHub Actions
External Services
Twilio — SMS/OTP
SMTP — Email notifications
OpenRouter / Anthropic — Optional AI features
🚀 Running Locally
1. Backend
cd backend
cp .env.example .env
npm install
npm run dev

Backend:

http://localhost:4000

The development server automatically initializes the database and seed data when required.

2. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev

Frontend:

http://localhost:3000

For the frontend, make sure SESSION_SECRET matches the backend configuration.

3. Analytics

Analytics is optional.

cd analytics
cp .env.example .env
npm install
npm run dev

Analytics:

http://localhost:3100

Configure:

ANALYTICS_SERVICE_KEY=...
ANALYTICS_ADMIN_EMAIL=...
ANALYTICS_ADMIN_PASSWORD=...

AI functionality is optional.

🐳 Docker Deployment

For a complete local deployment:

cp .env.example .env
docker compose up --build -d

This starts:

Backend API
Appointment reminder scheduler
Follow-up scheduler
Analytics application
Analytics bulletin scheduler

SQLite data is stored in persistent Docker volumes.

Useful commands:

docker compose logs -f backend
docker compose logs -f backend-reminders
docker compose logs -f backend-followups
docker compose logs -f analytics
docker compose logs -f analytics-scheduler

Reset demo data:

docker compose exec backend node scripts/seed.js --force

Stop services:

docker compose down

Remove services and persistent volumes:

docker compose down -v
🧪 Testing

The backend includes automated tests covering the patient OTP lifecycle:

OTP generation
OTP verification
OTP expiration
Invalid-code handling
Wrong-code lockout
Daily OTP sending limits

Run:

cd backend
npm test

Tests use an isolated SQLite database and do not modify the development database.

GitHub Actions also runs:

Backend tests
Backend build
Frontend build

on pushes and pull requests.

📱 Demo Credentials
Doctor
Email: ayesha.raza@pulseid.dev
Password: doctor123
Hospital Admin
Email: admin.lahoregeneral@pulseid.dev
Password: hospitaladmin123

Additional hospital-admin credentials are printed by the seed script.

Patient
National ID: 35202-1234567-1
OTP: Displayed in demo mode
Analytics
Email: admin@health.gov
Password: change-this-password

Demo credentials are for local development only. Change all credentials and secrets before any real deployment.

📲 SMS and Email Configuration

By default, patient OTP delivery runs in demo mode.

For real SMS delivery:

DEMO_MODE=false

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

Twilio is also used for:

Appointment reminders
Follow-up notifications

Email reminders can be configured using SMTP:

SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...

Without SMS/email credentials, scheduler processes log what would have been sent rather than sending real messages.

🗄️ Database Architecture

PulseID currently uses SQLite for simplicity and portability.

The backend isolates database access through:

backend/src/lib/db.ts
backend/src/lib/repo.ts

This creates a clear migration path to PostgreSQL when scaling to larger deployments.

A future production architecture can use:

PostgreSQL Primary
        │
        ├── Clinical API
        │
        └── Read Replica
                │
                └── Analytics

This keeps analytics workloads from competing with clinical write operations.

🚀 Production Scaling Strategy

For a nationwide deployment, the recommended evolution is:

Current
SQLite
   ↓
Single deployment
Production
PostgreSQL
   ↓
Primary + Read Replica
   ↓
Backend API + Analytics

Additional improvements can include:

Nightly/streaming aggregate tables
Managed backups
Database replication
Network-level analytics access control
VPN/IP allowlisting
SSO for analysts
Centralized logging
Monitoring and alerting
🔐 Production Security Requirements

Before real-world deployment:

Replace all demo credentials
Generate strong random secrets
Disable demo OTP mode
Configure real SMS/email providers
Enable HTTPS
Configure PUBLIC_APP_URL
Configure CORS_ORIGIN
Protect analytics with network-level access controls
Use production-grade database infrastructure
Configure database backups
Rotate service keys regularly
Review authorization policies
Perform security and privacy testing

PulseID is a software project/demo architecture and should undergo appropriate clinical, security, privacy, regulatory, and infrastructure review before handling real patient data.

🛡️ Security & Privacy Principles

PulseID follows several core principles:

Least Privilege

Users only receive access required for their role.

API-Level Authorization

Security boundaries are enforced on the backend rather than relying on frontend visibility.

Data Minimization

Emergency responders receive only life-critical information.

Access Transparency

Patient-record access is audit logged and visible to the patient.

Separation of Trust

Clinical applications and analytics operate under separate authentication and service credentials.

No Individual Analytics Exposure

Analytics operates exclusively on aggregate data with small-cell suppression.

Explainable Automation

Critical risk and alerting logic remains deterministic and auditable.

🎯 Project Goals

PulseID is designed to demonstrate how a modern digital healthcare platform can combine:

Digital medical identity
Secure medical records
Emergency access
Role-based authorization
Hospital administration
Appointment workflows
QR-based identification
Explainable risk scoring
Proactive patient monitoring
Public-health analytics
Privacy-preserving aggregation
AI-assisted reporting
PWA deployment
Background automation
Auditable system design

The architecture intentionally separates clinical data, administrative operations, and public-health analytics so that each user receives only the information appropriate to their role.

📌 Project Status

Status: Active Development / Demonstration System

PulseID currently provides an end-to-end demonstration of the core medical identity, clinical workflow, hospital administration, emergency access, and aggregate analytics architecture.

The system is designed so individual components can evolve independently as the project moves toward a production-ready architecture.

in one markdown

Yes — here is the complete README as one single Markdown block, ready to copy directly into README.md.

# PulseID — Universal Digital Medical Identity System

PulseID is a secure digital medical identity and health-record platform designed to provide patients, doctors, hospitals, emergency responders, and public-health analysts with the right information at the right level of access.

Each patient has a single digital medical identity linked to their National ID, with role-based access controls, emergency QR access, medical records, appointments, audit trails, risk scoring, proactive follow-ups, and aggregate public-health analytics.

> **Core principle:** Expose only the information required for the specific user and situation.

---

## 🚀 Overview

PulseID is organized into three independently deployable services:

```text
pulseid/
├── backend/       Express + TypeScript API
├── frontend/      Next.js PWA
└── analytics/     Next.js public-health analytics
Backend

The backend is the single source of truth for:

Authentication and authorization
Patient records
Doctor accounts
Hospital administration
Appointments
Emergency access
QR tokens
Risk scoring
Follow-ups
Audit logs
Analytics aggregates

The backend owns the SQLite database and contains the application's core business logic.

Frontend

The frontend is a Next.js Progressive Web App providing:

Patient portal
Doctor portal
Hospital admin console
Emergency scanning
Medical reports
Appointment management
Follow-up management

It never directly accesses the database.

Analytics

The analytics application is a completely separate trust boundary designed for public-health analysts.

It only receives aggregate information such as:

Regional case counts
Hospital statistics
Trends
Conditions
Alerts
Data-quality indicators

It never receives individual patient records, names, or National IDs.

✨ Features
👨‍⚕️ Doctor Portal

Doctors can:

Log in securely using email and password
Search patients by name or National ID
Scan patient QR codes
Register new patients
View patient medical records
Add medical visits
Record vital signs
Add prescriptions
Update permitted patient information
View risk indicators
Manage appointments
Reschedule appointments
Complete or cancel appointments
View a weekly calendar
Manage waitlists
Create recurring appointments
Start proactive patient follow-ups
Generate detailed medical reports
View patient access history

Doctors only have access to their own patients and appointments.

🏥 Hospital Admin Console

Hospital administrators have a separate authentication and authorization boundary.

They can:

View hospital-level statistics
Create doctor accounts
Edit doctor specializations
Activate or deactivate doctors
Import doctors through CSV
View doctor activity logs
Correct patient registration information
Manage hospital appointments
Filter appointments
Export appointment data
Generate aggregate operational summaries

Hospital administrators cannot access clinical history.

They cannot view:

Diagnoses
Symptoms
Clinical notes
Visit history
Prescriptions
Other clinical content

All hospital-admin operations are scoped server-side to the administrator's own hospital.

👤 Patient Portal

Patients authenticate using:

National ID
    ↓
OTP Verification
    ↓
Patient Portal

Patients can:

View their medical records
View visit history
View prescriptions
Download medical reports
View appointments
Request appointments
Cancel appointments
View dependents
Complete follow-up check-ins
View risk indicators
View their audit/access history
Preview emergency information
Access emergency scanning

Patients cannot:

Register themselves
Choose their own doctor account
Choose appointment times
Modify their National ID
Access another patient's information
🚨 Emergency Access

PulseID provides a dedicated emergency-access workflow for situations where a patient cannot authenticate normally.

A responder can scan:

CNIC
B-Form
PulseID QR code

The emergency page exposes only life-critical information:

Blood group
Allergies
Chronic conditions
Emergency contacts

It does not expose:

Diagnoses
Visit history
Prescriptions
Clinical notes
Full medical records
QR Security

Emergency QR tokens rotate after every use.

This prevents a previously photographed or leaked QR code from being reused indefinitely.

Emergency access is also:

Rate limited
Audit logged
Server-side authorized
Restricted to emergency information
📅 Appointment Management

PulseID deliberately separates appointment requests from appointment scheduling.

Patient Side

Patients can:

Select a doctor
Optionally provide a reason
Submit an appointment request

Patients cannot select the date or time.

Doctor Side

Doctors can:

Review appointment requests
Select the date and time
Confirm appointments
Reschedule appointments
Complete appointments
Cancel appointments

This restriction is enforced by the backend API, not just by the frontend UI.

🔁 Recurring Appointments

Doctors can create recurring follow-up appointments.

Supported cadences:

Weekly
Every 2 weeks
Monthly

Doctors can create between:

2–26 occurrences

Each appointment is stored independently while sharing a recurrence_group_id.

Individual appointments can later be:

Rescheduled
Cancelled
Completed
⏳ Waitlist

Patients can join a doctor's waitlist when they need an earlier appointment.

Doctors can use:

Offer a Slot

to convert a waitlist entry directly into a confirmed appointment at a doctor-selected time.

📆 Doctor Calendar

Doctors have a dedicated weekly calendar:

/doctor/calendar

The calendar displays appointments with assigned dates and times.

This provides a schedule-oriented view that is different from the status-based appointment queue.

Backend endpoint:

GET /api/doctor/calendar?start=&end=
🩺 Rule-Based Risk Scoring

PulseID includes an explainable risk-flagging system based on recorded vitals.

It evaluates:

Blood pressure
Blood glucose
Body temperature
Heart rate
Age
Optional maternal context

The system produces:

Low
Medium
High

Every risk result includes a factors array explaining which readings triggered the flag.

Important Design Decision

This is not a trained machine-learning model.

The system uses deterministic clinical thresholds so that each result can be:

Explained
Audited
Reproduced
Tested

Every risk response includes:

Automated, rule-based flag from recorded vitals only — not a diagnosis. Always use clinical judgement.

🔄 Proactive Patient Follow-Ups

Doctors can create recurring follow-up programs for patients.

Supported use cases include:

Postpartum monitoring
Post-operative monitoring
Chronic-condition monitoring
Custom follow-ups

Follow-ups can contain:

0–10 scale questions
Yes/No questions
Free-text questions

The system provides default question templates while allowing custom questions.

Follow-Up Scheduler

A standalone scheduler:

Runs hourly
Finds due follow-ups
Sends email/SMS prompts
Advances the schedule
Evaluates submitted responses
Flags concerning responses

Risk flagging is deterministic and does not depend on AI.

AI-generated summaries are optional and provide a short doctor-facing summary of patient responses.

🧾 Medical Reports

PulseID uses a shared report-generation system for different audiences.

Patient Report

Patients can generate a readable report containing their medical information.

Doctor Report

Doctors can generate an official medical report containing:

Patient information
Visit history
Current medications
Prescription history
Risk/allergy alerts
Emergency contacts
Record-access audit history

Reports can be printed or saved as PDF.

📱 Progressive Web App

PulseID is implemented as an installable Progressive Web App (PWA).

Users can install it without an app store.

Supported features include:

Installable application
Custom application icon
Home-screen installation
Standalone application experience
Offline fallback screen
Privacy-Focused Caching

The service worker caches only static public application assets.

It never caches:

API responses
Patient records
Medical data

This prevents stale medical information from being presented as current while offline.

📊 Public Health Analytics

PulseID includes a separate analytics application for:

Public-health analysts
Regional administrators
Ministry of Health users

The analytics application operates on aggregate data only.

It cannot access:

Patient names
National IDs
Individual medical records
Clinical notes
Individual prescriptions
Analytics Dashboard
Overview

Displays:

National visit totals
Patient totals
Hospital totals
Active regions
Busiest regions
Common conditions
Regions

Provides a hierarchical view:

Region
└── Hospital
    └── Doctor

Hospital-level statistics include:

Doctor count
Visit count
Patient count
Map

A Leaflet-based map visualizes regional case volumes.

Trends

Users can analyze condition trends over time and optionally view a simple forecast projection.

Benchmark

Compares a region's share of visits for a condition against the national share.

Alerts

Identifies regions and conditions with unusually high activity compared with their recent baseline.

Ask

Provides a natural-language interface for querying aggregate public-health data.

Bulletins

Generates weekly and monthly epidemiological bulletins containing:

AI-generated narrative
National trends
Regional activity
Top conditions
Alert magnitude
Charts

Generated bulletins enter:

pending_review

An analyst must explicitly approve or reject a bulletin.

Nothing is automatically published.

Resources

Provides AI-generated suggestions for areas that may deserve further human investigation.

These are informational suggestions and not automated decisions.

Data Quality

Identifies unusual reporting-volume changes that may indicate:

Broken reporting pipelines
Data ingestion problems
Unexpected reporting spikes
Unexpected reporting drops
🔐 Small-Cell Suppression

To reduce patient re-identification risk, analytics uses a minimum cell size of:

5

Any count below five is returned as:

<5

instead of exposing the exact value.

This applies across:

Regions
Hospitals
Conditions
Other aggregate analytics

This helps prevent combinations of geographic and clinical information from exposing individual patients.

🏛️ Regional Hierarchy

PulseID models healthcare organizations using:

Region
└── Hospital
    └── Doctor
        └── Patients

Supported regions include:

Punjab
Sindh
Khyber Pakhtunkhwa
Balochistan
Gilgit-Baltistan
Azad Jammu & Kashmir
Islamabad Capital Territory

The demo seed data includes multiple hospitals and doctors across these regions.

Example:

Gilgit-Baltistan
├── DHQ Gilgit
│   ├── Dr. Amina Baig — Child Specialist
│   └── Dr. Karim Hunzai — General Medicine
│
└── Skardu Civil Hospital
    ├── Dr. Fatima Sheikh — General Medicine
    └── Dr. Zubair Baltistani — Cardiologist

Punjab
└── Lahore General Hospital
    ├── Dr. Ayesha Raza — Internal Medicine
    └── Dr. Bilal Ahmed — Emergency Medicine

Each hospital has its own hospital-admin account.

🔑 Role-Based Access Control

PulseID uses separate security boundaries for different user types.

Role	Authentication	Access
Patient	National ID + OTP	Own records, dependents, appointments
Doctor	Email + Password	Own patients and clinical operations
Hospital Admin	Email + Password	Own hospital administration
Analytics Analyst	Separate analytics login	Aggregate public-health data
Authorization

Security is enforced at the backend API layer.

Examples:

requireDoctor
requireHospitalAdmin

Hospital-admin requests are additionally scoped using the administrator's hospitalId from the signed session.

Clients cannot simply submit another hospital_id to access another hospital.

🔒 Security Architecture
Authentication

PulseID uses:

bcrypt password hashing
Signed JWT sessions
HTTP-only cookies
Short-lived sessions
OTP-based patient authentication
Dummy password-hash comparison for unknown accounts

The dummy hash helps prevent account enumeration through login timing differences.

Session Security

Sessions use:

HTTP-only cookies
Secure cookies in production
SameSite protections
CSRF double-submit-cookie protection
Separate session types for different applications
Rate Limiting

Sensitive endpoints are rate limited, including:

Authentication
OTP requests
Emergency lookups
QR lookups
Analytics AI queries
Audit Logging

Sensitive operations are audit logged, including:

Patient-record access
Patient-detail edits
Emergency scans
Doctor activity
Hospital-admin actions
Analytics actions
Bulletin approvals
Analyst account changes

Patients can view the access history associated with their records.

🧠 AI Architecture

AI is intentionally used only where it provides value without becoming the source of truth for critical decisions.

AI features include:

Hospital appointment-load summaries
Patient follow-up summaries
Public-health natural-language queries
Epidemiological bulletins
Alert narratives
Resource suggestions

Supported providers:

OpenRouter
Anthropic

If no AI provider is configured, AI functionality gracefully falls back to a clear configuration message.

AI Trust Boundary

AI operates on data that has already been computed by deterministic backend logic.

For example:

Raw medical/aggregate data
        ↓
Backend calculations
        ↓
Verified statistics
        ↓
AI narrative generation

The AI does not generate the underlying statistical counts or percentages.

🏗️ System Architecture
                         ┌─────────────────────┐
                         │       Patient       │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Frontend       │
                         │      Next.js        │
                         │       PWA           │
                         └──────────┬──────────┘
                                    │
                                    │ API
                                    ▼
                         ┌─────────────────────┐
                         │       Backend       │
                         │ Express + TypeScript│
                         │                     │
                         │ Auth                │
                         │ Medical Records     │
                         │ Appointments        │
                         │ Emergency Access    │
                         │ Risk Scoring        │
                         │ Audit Logs          │
                         │ Analytics API       │
                         └──────────┬──────────┘
                                    │
                              SQLite Database
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
        ┌─────────▼─────────┐               ┌─────────▼─────────┐
        │ Analytics Service │               │ Background Jobs   │
        │      Next.js      │               │                   │
        │ Aggregate Only    │               │ Reminders         │
        │                   │               │ Follow-ups        │
        │                   │               │ Bulletins         │
        └───────────────────┘               └───────────────────┘
📁 Project Structure
pulseid/
│
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   └── lib/
│   │       ├── db.ts
│   │       ├── repo.ts
│   │       ├── auth.ts
│   │       ├── report.ts
│   │       ├── pdf-report.ts
│   │       ├── sms.ts
│   │       ├── email.ts
│   │       ├── reminders.ts
│   │       ├── risk-scoring.ts
│   │       ├── followup-agent.ts
│   │       └── ai.ts
│   │
│   └── scripts/
│       ├── seed.js
│       ├── reminder-scheduler.ts
│       └── followup-scheduler.ts
│
├── frontend/
│   ├── app/
│   │   ├── doctor/
│   │   ├── patient/
│   │   ├── hospital-admin/
│   │   └── emergency/
│   ├── components/
│   ├── public/
│   │   ├── sw.js
│   │   ├── offline.html
│   │   └── site.webmanifest
│   └── middleware.ts
│
├── analytics/
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── ai.ts
│   │   ├── auth.ts
│   │   ├── bulletin-db.ts
│   │   ├── bulletin-generator.ts
│   │   └── geo.ts
│   ├── scripts/
│   │   └── scheduler.ts
│   └── middleware.ts
│
├── docker-compose.yml
└── README.md
⚙️ Technology Stack
Backend
Node.js
Express
TypeScript
SQLite
better-sqlite3
bcrypt
JWT
Vitest
Frontend
Next.js
React
TypeScript
Progressive Web App
Service Worker
Analytics
Next.js
React
Leaflet
SQLite
OpenRouter
Anthropic
Infrastructure
Docker
Docker Compose
GitHub Actions
External Services
Twilio — SMS and OTP delivery
SMTP — Email notifications
OpenRouter / Anthropic — Optional AI functionality
🚀 Running Locally
1. Backend
cd backend
cp .env.example .env
npm install
npm run dev

Backend:

http://localhost:4000

The development server initializes the database and seed data when required.

2. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev

Frontend:

http://localhost:3000

Make sure the frontend SESSION_SECRET matches the backend configuration.

3. Analytics

Analytics is optional.

cd analytics
cp .env.example .env
npm install
npm run dev

Analytics:

http://localhost:3100

Configure:

ANALYTICS_SERVICE_KEY=...
ANALYTICS_ADMIN_EMAIL=...
ANALYTICS_ADMIN_PASSWORD=...

AI functionality is optional.

⏰ Background Schedulers
Appointment Reminders

Run:

cd backend
npm run reminders

Run an immediate test sweep:

npm run reminders -- --run-now

The reminder scheduler checks confirmed appointments approximately 20–28 hours ahead and sends reminders when configured.

Proactive Follow-Ups

Run:

cd backend
npm run followups

Run an immediate test sweep:

npm run followups -- --run-now

The scheduler checks for due patient follow-ups and sends the appropriate notifications.

🐳 Docker Deployment

For a complete local deployment:

cp .env.example .env
docker compose up --build -d

This starts:

Backend API
Appointment reminder scheduler
Follow-up scheduler
Analytics application
Analytics bulletin scheduler

SQLite data is stored in persistent Docker volumes.

Useful Commands

View backend logs:

docker compose logs -f backend

View reminder logs:

docker compose logs -f backend-reminders

View follow-up logs:

docker compose logs -f backend-followups

View analytics logs:

docker compose logs -f analytics

View analytics scheduler logs:

docker compose logs -f analytics-scheduler

Reset demo data:

docker compose exec backend node scripts/seed.js --force

Stop services:

docker compose down

Stop services and delete persistent volumes:

docker compose down -v
🧪 Testing

The backend includes automated tests covering the patient OTP lifecycle.

Tests include:

OTP generation
OTP verification
OTP expiration
Invalid-code handling
Wrong-code lockout
Daily OTP limits

Run:

cd backend
npm test

Tests use an isolated SQLite database and do not modify the development database.

GitHub Actions runs:

Backend tests
Backend build
Frontend build

on pushes and pull requests.

🌱 Database Seeding

To seed the database:

cd backend
npm run seed

To wipe and reseed the demo database:

node scripts/seed.js --force

The seed creates:

Hospitals
Doctors
Hospital administrators
Patients
Demo medical data
Regional hierarchy

Hospital-admin credentials are printed to the terminal during seeding.

🔑 Demo Credentials
Doctor
Email: ayesha.raza@pulseid.dev
Password: doctor123
Hospital Admin
Email: admin.lahoregeneral@pulseid.dev
Password: hospitaladmin123

Additional hospital-admin credentials are printed by the seed script.

Patient
National ID: 35202-1234567-1
OTP: Displayed on screen in demo mode
Analytics
Email: admin@health.gov
Password: change-this-password

These credentials are intended for local demonstration only. Replace all credentials and secrets before production deployment.

📲 SMS and Email Configuration

By default, patient OTP delivery operates in demo mode.

For real SMS delivery:

DEMO_MODE=false

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

Twilio can also be used for:

Appointment reminders
Follow-up notifications

Email reminders can be configured using SMTP:

SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...

If neither SMS nor email is configured, the schedulers log what they would have sent instead of sending real messages.

🗄️ Database Architecture

PulseID currently uses SQLite for portability and simple deployments.

Database access is isolated through:

backend/src/lib/db.ts
backend/src/lib/repo.ts

This provides a clear migration path to PostgreSQL.

The intended production architecture is:

PostgreSQL Primary
       │
       ├── Clinical API
       │
       └── Read Replica
              │
              └── Analytics

This prevents analytics queries from competing directly with clinical write operations.

📈 Production Scaling Strategy
Current Architecture
SQLite
  ↓
Single Deployment
Future Production Architecture
PostgreSQL
  ↓
Primary + Read Replica
  ↓
Backend + Analytics

Potential improvements include:

Managed PostgreSQL
Read replicas
Database backups
Aggregate rollup tables
Centralized logging
Monitoring
Alerting
Network-level analytics access
VPN/IP allowlisting
SSO for analysts
🔐 Production Configuration

Before real-world deployment:

Replace all demo credentials
Generate strong random secrets
Disable demo OTP mode
Configure SMS/email providers
Enable HTTPS
Configure PUBLIC_APP_URL
Configure CORS_ORIGIN
Configure secure cookies
Protect analytics with network-level access controls
Use production-grade database infrastructure
Configure automated backups
Rotate service keys
Review authorization policies
Perform security testing
Perform privacy and compliance reviews
🛡️ Security & Privacy Principles

PulseID follows several security principles.

Least Privilege

Users only receive access required for their role.

API-Level Authorization

Security boundaries are enforced by backend middleware and data-access rules rather than relying on frontend visibility.

Data Minimization

Emergency responders receive only life-critical information.

Access Transparency

Sensitive patient-record access is audit logged and exposed to the patient.

Separation of Trust

Clinical applications and analytics operate under separate authentication and service credentials.

Privacy-Preserving Analytics

Analytics operates exclusively on aggregate data and applies small-cell suppression.

Explainable Automation

Critical risk and alerting logic remains deterministic and auditable.

🔍 Additional Security Controls

PulseID includes additional protections such as:

OTP rate limiting per IP
Per-National-ID OTP limits
QR token rotation
CSRF protection
HTTP-only session cookies
Secure production cookies
Audit logging
Server-side role enforcement
Hospital-level authorization boundaries
Formula-injection protection for CSV exports
Production PUBLIC_APP_URL validation
Separate analytics service authentication
Separate analytics analyst sessions
AI query rate limiting
Admin-only bulletin approval
Admin-only analyst management
No individual records exposed through analytics routes
🧠 AI Safety Design

AI is not responsible for core authorization or critical deterministic decisions.

For example:

Patient Vitals
      ↓
Deterministic Risk Rules
      ↓
Risk Flag
      ↓
Optional AI Explanation

Similarly:

Raw Analytics Data
      ↓
Backend Aggregation
      ↓
Suppression + Validation
      ↓
AI Narrative

This keeps the underlying data and critical system logic deterministic.

🌐 Deployment
Backend

Build and start:

npm run build
npm run start

The backend requires persistent storage for the SQLite database.

Frontend

Build and start:

npm run build
npm run start

Configure:

NEXT_PUBLIC_API_URL=https://your-api-domain

Configure the backend:

CORS_ORIGIN=https://your-frontend-domain

Production PWA installation requires HTTPS.

Analytics

Build and start:

npm run build
npm run start

Configure:

API_INTERNAL_URL=https://your-api-domain
ANALYTICS_SERVICE_KEY=...
ANALYTICS_SESSION_SECRET=...

Analytics does not share authentication cookies with the clinical frontend.

🔄 Environment Configuration

Environment files are read at process startup.

If you change:

backend/.env
analytics/.env
frontend/.env

restart the corresponding development process.

For example, after changing:

ANALYTICS_SERVICE_KEY=...

restart both backend and analytics.

The key must match exactly between the two services.

📦 Service Communication

The architecture separates responsibilities:

Frontend
   │
   │ Clinical Session
   ▼
Backend API
   │
   ├── Patient Records
   ├── Doctors
   ├── Hospitals
   ├── Appointments
   ├── Emergency
   ├── Risk
   └── Audit

Analytics uses a different trust relationship:

Analytics
   │
   │ ANALYTICS_SERVICE_KEY
   ▼
Backend Analytics API
   │
   └── Aggregate Data Only

Analytics never uses:

Doctor Session
Patient Session
Hospital Admin Session
🎯 Project Goals

PulseID demonstrates how a modern digital healthcare platform can combine:

Digital medical identity
Secure medical records
Emergency access
QR-based identification
Role-based authorization
Hospital administration
Appointment management
Recurring appointments
Waitlists
Explainable risk scoring
Proactive patient monitoring
Public-health analytics
Privacy-preserving aggregation
AI-assisted reporting
PWA deployment
Background automation
Auditability
Service separation

The architecture intentionally separates:

Clinical Data
     +
Hospital Administration
     +
Public Health Analytics

so that each user receives only the information appropriate to their role.

📌 Project Status

Status: Active Development / Demonstration System

PulseID currently provides an end-to-end demonstration of:

Digital medical identity
Patient management
Doctor workflows
Hospital administration
Emergency access
Appointment management
Risk scoring
Proactive follow-ups
Medical reporting
Public-health analytics
AI-assisted analytics
Privacy-focused data access

The architecture is designed so individual services can evolve independently as the project moves toward a production-ready healthcare platform.

⚠️ Disclaimer

PulseID is a software project and demonstration architecture.

It is not a substitute for professional medical judgement and should not be deployed with real patient data without appropriate:

Clinical validation
Security assessment
Privacy review
Regulatory/compliance review
Infrastructure assessment
Data-protection controls
Operational monitoring

The automated risk-scoring system is rule-based and informational only; it is not a medical diagnosis.

📄 License

Add your preferred project license here.

For example:

MIT License
👨‍💻 Author

Israr Hussain

AI Engineer / Data Scientist
GitHub: IsrarHussain747
