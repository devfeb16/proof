
# ⚡ Proof Response — Funding Intelligence Engine  


>  
> Migration of core automations and backend logic from *Global Assist* to the new *Proof Response* platform — with stable API routing, Mongo integration, and foundational data structures for funding intelligence.

---

## 🚀 Current Focus  

### **Objective:**
Establish the backend foundation for the Proof Response system and migrate existing automation endpoints from **FVG Global Assist** into this unified repository.

### **Scope:**
Keep all existing MongoDB and Next.js setup **intact**, while adding foundational APIs, CORS configuration, controllers, and utility layers for later data automation and ProofScore logic.

---

## 🔗 API Endpoints (Phase 1 Deliverables)

| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/api/newCandidate` | **POST** | Add a new candidate profile via automation scripts |
| `/api/requestIntro` | **POST** | Handle introduction requests between candidates and recruiters |
| `/api/jobComplete` | **POST** | Update job completion status and push to analytics |
| `/api/auth/signup` | **POST** | Register a new user |
| `/api/auth/login` | **POST** | Authenticate user credentials |
| `/api/auth/logout` | **POST** | Terminate user session |
| `/api/auth/me` | **GET** | Fetch logged-in user profile |
| `/api/setup/create-superadmin` | **POST** | One-time superadmin bootstrap (requires setup token) |
| `/api/roles/create` | **POST** | Create a new role definition (admin/superadmin) |
| `/api/roles/list` | **GET** | List all available roles |
| `/api/roles/:id` | **DELETE** | Remove an existing role (admin/superadmin) |
| `/api/funding-opportunity/create` | **POST** | Create or dump new funding data |
| `/api/funding-opportunity/list` | **GET** | Retrieve structured funding opportunities |
| `/api/funding-opportunity/:id` | **GET** | Fetch a specific opportunity by ID |

### **City + Service URLs**
Dynamic routes for city and service pages:
```

/ab/calgary/electrician/high-voltage-electrician/

````

---

## 🧩 Purpose & Overview  

This repository powers the **Funding Intelligence Engine** — the upstream automation layer for the Proof Response ecosystem.  

It enables automated data ingestion, scoring, and access for funding, grants, RFPs, and incentive programs — all structured under a scalable Next.js + MongoDB architecture.

**Key Goals:**
- Move and stabilize automation endpoints from FVG Global Assist  
- Maintain MongoDB connection and schemas  
- Create reusable backend controllers and middleware  
- Prepare for future ProofScore integration and upstream automation  

---

## 🧠 Week 1 Focus  

| Component | Description |
|------------|--------------|
| **Database Connection** | MongoDB setup retained; caching and connection helpers |
| **Core Models** | `User` and `FundingOpportunity` schemas |
| **Controllers** | Modular business logic for each API route |
| **CORS Middleware** | Pre-configured for cross-origin automation |
| **Response Utilities** | Unified success/error formatting |
| **Base Routes** | Auth and funding APIs functional |
| **Structure Base** | Ready for automation and ProofScore logic |

---

## 📡 API Overview  

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|-----------|-------------|
| **POST** | `/api/auth/signup` | Register a new user |
| **POST** | `/api/auth/login` | Log in and issue JWT cookie |
| **POST** | `/api/auth/logout` | Log out and clear session |
| **GET** | `/api/auth/me` | Fetch logged-in user data |

All JWTs now embed the authenticated user's `role`, and every signup is assigned the default `base_user` role unless elevated by an administrator.

---

### 💰 Funding Opportunities  

| Method | Endpoint | Description |
|--------|-----------|-------------|
| **GET** | `/api/funding-opportunity/list` | Get all available opportunities |
| **GET** | `/api/funding-opportunity/:id` | Fetch opportunity by ID |
| **POST** | `/api/funding-opportunity/create` | Add new funding opportunity |

#### Example Payload  
```json
{
  "title": "Clean Energy Grant 2025",
  "description": "Funding support for renewable energy startups.",
  "source": "Government of Alberta",
  "url": "https://example.com/grant",
  "deadline": "2025-12-31",
  "amountMin": 5000,
  "amountMax": 25000,
  "currency": "USD",
  "eligibility": "SMEs working in renewable energy",
  "tags": ["energy", "green", "sustainability"],
  "status": "open"
}
````

---

## 🧱 Project Structure

```
proof-response/
├── pages/
│   ├── api/
│   │   ├── auth/                    # Auth endpoints
│   │   ├── roles/                   # Role management endpoints
│   │   ├── setup/                   # Bootstrap/setup routes
│   │   ├── funding-opportunity/     # Funding endpoints
│   │   ├── newCandidate.js          # Candidate API
│   │   ├── requestIntro.js          # Intro API
│   │   ├── jobComplete.js           # Job completion API
│   │   └── test.js                  # Health check route
│   ├── index.js                     # Home page
│   ├── dashboard.js                 # Protected dashboard
│   └── _app.js                      # App wrapper
│
├── controllers/
│   ├── authController.js
│   ├── fundingController.js
│   └── roleController.js
│
├── middlewares/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── models/
│   ├── Role.js
│   ├── User.js
│   └── FundingOpportunity.js
│
├── utils/
│   ├── asyncHandler.js
│   ├── cors.js
│   ├── index.js
│   ├── logger.js
│   └── proofscore.js
├── lib/
│   ├── auth.js
│   ├── config.js
│   ├── db.js
│   └── response.js
│
├── .env.example
├── next.config.js
└── package.json
```

---

### 🛡️ Role-Based Access Control

- Core roles seeded by default: `superadmin`, `admin`, `hr`, `marketing`, `developer`, and `base_user`.
- `/api/setup/create-superadmin` bootstraps the first superadmin when called with `SUPERADMIN_SETUP_TOKEN`.
- Role management endpoints live under `/api/roles/**` and are protected by admin or superadmin privileges.
- New signups inherit the `base_user` role automatically; roles can be reassigned later via user management flows.

---

## ⚙️ Setup & Installation

### Prerequisites

* Node.js 18+
* MongoDB (local or cloud instance)

### Installation

```bash
npm install
```

Create `.env` file from the example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/proofresponse
JWT_SECRET=your_secret_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SUPERADMIN_SETUP_TOKEN=bootstrap_token_for_first_superadmin
```

Run server:

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 🌐 API Conventions

* **Content-Type:** `application/json`
* **Success Response:** `{ success: true, message?, data? }`
* **Error Response:** `{ success: false, message, error? }`
* **Pagination:** `limit` + `offset` query params
* **Validation:** handled at controller level

---

## 📈 Week 1 Summary

✅ **Base foundation ready**

* Core structure + routes + DB connection stable
* Mongo connection working locally
* Authentication + JWT cookies tested
* Funding endpoints validated
* Phase 1 APIs created (`newCandidate`, `requestIntro`, `jobComplete`)
* Utilities prepped for ProofScore

🧭 **Next Steps**

1. Extend ProofScore logic integration
2. Connect automation scripts to new endpoints
3. Add schema validation and error tracing
4. Implement frontend forms for `/api/newCandidate` etc.

---

## 📄 License

**Private Project — All Rights Reserved**

