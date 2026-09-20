# 🇮🇳 Parivar Pehchaan Patra (Family Identity Card)
> A Unified E-Governance Platform for Family-based Welfare Scheme Management

## 📖 Overview
Parivar Pehchaan Patra is a centralized, household-based identity and welfare distribution system. Unlike individual-based IDs (like Aadhaar), this platform tracks families as a single unit, automatically analyzing household income, demographics, and relationships to proactively enroll eligible citizens into government welfare schemes without requiring them to manually apply.
## 🌟 Key Features
- **Household Graph Architecture**: Tracks complex familial relationships and hierarchy (Head of Family, Spouse, Dependents).
- **Automated Scheme Eligibility**: A rules-engine evaluates scheme criteria (e.g., Household income < ₹3,00,000) against the entire family tree in real-time.
- **Role-Based Access Control (RBAC)**: Dedicated, secure portals for Citizens, Verification Officers, and System Admins.
- **Automated Verification Workflows**: Citizens upload documents (Aadhaar, Income Proofs) which are securely verified or rejected by regional officers.
- **Proactive Welfare Delivery**: Citizens instantly see which schemes they qualify for across all government departments.

## 🔐 Demo Credentials

Use the following credentials to explore the different portals of the application. *(Note: Make sure the database is seeded first).*

| Role | Mobile Number | Password | Portal Features |
| :--- | :--- | :--- | :--- |
| **System Admin** | `8888888888` | `Admin@123` | View all families, manage officers, add/edit/delete welfare schemes. |
| **Verification Officer** | `9999999999` | `Officer@123` | Review applications, verify documents, approve/reject family registrations. |
| **Citizen** | *Create your own* | *Create your own* | Register family, add members, upload documents, view eligible schemes. |

## 🛠️ Technology Stack
* **Frontend:** React.js, Vite, Axios, React Router, CSS Modules
* **Backend:** Node.js, Express.js, JWT Authentication, Multer
* **Database:** PostgreSQL (Neon Cloud)
* **ORM:** Prisma
* **File Storage:** Local Static Uploads (Expandable to AWS S3)

## 🗄️ Database Schema

The database relies on a highly relational model centered around the `Family` and `Citizen` entities, with an evaluation mapping to the `Scheme` entity.

![ER Diagram](./er_diagram.jpg)

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### 1. Clone & Install
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/family_id_db?schema=public"
JWT_SECRET="your_secret_key"
PORT=5000
```

### 3. Database Setup (Prisma)
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4. Run the Application
You will need two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

*The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:5000`.*

---

## 🔍 Detailed Project Overview

### The Problem
Currently, most e-governance systems and identity documents (like Aadhaar or PAN) are individual-centric. However, a significant portion of government welfare schemes (such as housing subsidies, ration cards, or health insurance) are delivered to the **household** rather than the individual. This disconnect forces citizens to manually compile documents from multiple family members, repeatedly prove their relationships, and run between different government departments to prove their eligibility.

### The Solution: Parivar Pehchaan Patra
This project introduces a **Family-First Data Architecture**. By registering families as a single, verified unit, the government can:
1. **Calculate True Household Income**: Aggregate the income of all working family members automatically.
2. **Verify Relationships Once**: Documents proving relationships (Birth Certificates, Marriage Certificates) are verified once by an officer and trusted across all departments.
3. **Proactive Scheme Delivery**: A built-in rules engine continuously scans the verified family data against the criteria of hundreds of welfare schemes. If a family becomes eligible for a scheme (e.g., due to a new birth, a drop in income, or a child reaching a certain age), the system proactively notifies them and pushes the benefit, eliminating the need for manual applications.

### How it Works (The Workflow)
1. **Self-Declaration**: The Head of Family registers, adding all family members and declaring their relationships, income, and caste.
2. **Document Upload**: Citizens upload supporting documents (Aadhaar, PAN, Income Certificates, Marriage Deeds).
3. **Officer Verification**: A government Verification Officer reviews the uploaded documents against the declared data and either approves or rejects them.
4. **Activation**: Once all members are verified, the `DRAFT` family profile becomes `ACTIVE` and receives an official, unique 12-digit Family ID Number.
5. **Auto-Enrollment**: The system instantly matches the active profile against all existing Welfare Schemes, marking them as eligible.

---

### What exactly does this project do?
It creates a centralized registry for all families in a state, rather than just individuals. By mapping out a family's structure (who is the head, spouse, children) and calculating their combined household income, the system automatically figures out which government welfare schemes the family or its individual members are eligible for. It eliminates the need for citizens to run around offices proving their eligibility for different schemes—if their Family ID profile is verified, the system automatically pushes the benefits to them!

### Architecture
![Architecture Diagram](./architecture_diagram.jpg)
