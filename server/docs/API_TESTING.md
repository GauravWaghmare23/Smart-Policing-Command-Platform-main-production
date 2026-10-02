# Smart Police Station — Complete API Testing Reference

> **Generated from actual code inspection of the implemented backend.**
> Endpoints not in the codebase are marked `NOT IMPLEMENTED`.

---

## Global Information

| Property | Value |
|---|---|
| Base URL | `http://localhost:8000/api` |
| Static Files URL | `http://localhost:8000/uploads/<folder>/<filename>` |
| Default Content-Type | `application/json` |
| Auth Header | `Authorization: Bearer <ACCESS_TOKEN>` |
| Multipart Endpoints | `Content-Type: multipart/form-data` |
| Refresh Token | Stored in HTTP-Only cookie `refreshToken` (7-day expiry) |

### Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

### Roles Reference

| Role | Description |
|---|---|
| `CITIZEN` | Self-registered civilian user |
| `CONTROL_ROOM_ADMIN` | Highest authority, manages everything |
| `STATION_HEAD` | Head of a specific police station |
| `INVESTIGATING_OFFICER` | Handles complaint investigations and FIRs |
| `FIELD_OFFICER` | Field deployment, responds to SOS and patrols |

---

## Authentication Flows

### Citizen Flow

```
POST /api/auth/register  (creates CITIZEN account)
        ↓
POST /api/auth/login     (email + password)
        ↓
{ accessToken, refreshToken cookie }
        ↓
GET /api/auth/me
```

### Police Officer Flow

> Police officers do **NOT** self-register. Their accounts are created by `CONTROL_ROOM_ADMIN`.

```
Admin → POST /api/officers  (creates officer account with admin-supplied email + password)
        ↓
Admin returns loginId/credentials to officer out-of-band
        ↓
Officer → POST /api/auth/login  (email + password supplied by admin)
        ↓
Normal access + refresh tokens issued
```

> **NOTE:** The `mustChangePassword` / `loginId` / `change-password` flow described in project specification is **NOT IMPLEMENTED** in the current codebase. The `User` model has the `loginId` and `mustChangePassword` fields added to the schema, but:
> - `POST /api/auth/login` still only accepts `email` + `password` (not `loginId`).
> - `POST /api/auth/change-password` route **does not exist**.
> - Officer creation does **not** auto-generate a `loginId` or temporary password.
> - The `mustChangePassword` flag is never set during officer creation.
>
> **Current actual flow:** Admin supplies a plain password when calling `POST /api/officers`. The officer logs in with that admin-set `email` + `password`.

### Admin Password Reset Flow

`NOT IMPLEMENTED` — No `PATCH /api/officers/:id/reset-password` endpoint exists in the codebase.

---

## 1. Authentication

### POST /api/auth/register

**Purpose:** Register a new citizen account. Role is always forced to `CITIZEN` regardless of any input.

**Authentication:** Not required (Public)

**Validation:** `name`, `email`, `phone`, `password` are all required.

**Request Body:**

```json
{
  "name": "Ramesh Kumar",
  "email": "ramesh@gmail.com",
  "phone": "9881112223",
  "password": "password123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Full name |
| `email` | string | Yes | Must be unique, stored lowercase |
| `phone` | string | Yes | Mobile number |
| `password` | string | Yes | Min 6 characters |

**Response 201:**
```json
{
  "success": true,
  "message": "Citizen registered successfully",
  "data": {
    "user": {
      "_id": "64fb...",
      "name": "Ramesh Kumar",
      "email": "ramesh@gmail.com",
      "phone": "9881112223",
      "role": "CITIZEN",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "createdAt": "2026-08-15T05:00:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Missing required fields |
| 400 | Email already registered (duplicate key) |

---

### POST /api/auth/login

**Purpose:** Authenticate any user (Citizen, Admin, or Police Officer). Sets a `refreshToken` HTTP-Only cookie on success.

**Authentication:** Not required (Public)

**Validation:** `email` and `password` are required. Currently only `email`-based login is supported.

> **Important:** `loginId`-based login is **NOT IMPLEMENTED** despite the `loginId` field existing on the User model.

**Request Body:**
```json
{
  "email": "admin@smartpolice.local",
  "password": "admin123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Registered email address |
| `password` | string | Yes | Account password |

**Response 200:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "_id": "64fb...",
      "name": "Control Room Admin",
      "email": "admin@smartpolice.local",
      "role": "CONTROL_ROOM_ADMIN",
      "status": "ACTIVE",
      "lastLoginAt": "2026-08-15T05:20:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

*A `refreshToken` HTTP-Only cookie is also set automatically (7-day expiry).*

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Missing email or password |
| 401 | Invalid email or password |
| 403 | Account is inactive or suspended |

---

### POST /api/auth/logout

**Purpose:** Clear the refresh token cookie. No request body needed.

**Authentication:** Not required (but typically called when authenticated)

**Request Body:** None

**Response 200:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

---

### POST /api/auth/refresh

**Purpose:** Get a new access token using the refresh token. Reads from the `refreshToken` cookie, or accepts `refreshToken` in request body as fallback.

**Authentication:** Not required

**Request Body (optional fallback):**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "accessToken": "eyJhbGci..."
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 401 | No refresh token provided |
| 401 | Invalid or expired refresh token |
| 403 | User account inactive or suspended |

---

### GET /api/auth/me

**Purpose:** Get the currently authenticated user's profile.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Response 200:**
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "user": {
      "_id": "64fb...",
      "name": "Ramesh Kumar",
      "email": "ramesh@gmail.com",
      "phone": "9881112223",
      "role": "CITIZEN",
      "status": "ACTIVE",
      "avatar": "",
      "lastLoginAt": "2026-08-15T05:20:00.000Z",
      "mustChangePassword": false,
      "createdAt": "2026-08-15T05:00:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 401 | Missing or invalid access token |

---

### POST /api/auth/change-password

`NOT IMPLEMENTED` — This route does not exist in the current codebase.

---

## 2. Police Stations

All station routes require authentication. All mutating operations require `CONTROL_ROOM_ADMIN`.

### POST /api/stations

**Purpose:** Create a new police station.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Validation:** `name`, `stationCode`, `address`, `phone`, `location` are required.

**Request Body:**
```json
{
  "name": "Kothrud Police Station",
  "stationCode": "KOT-PN",
  "address": "Ideal Colony, Kothrud, Pune",
  "phone": "020-25443311",
  "location": {
    "latitude": 18.5074,
    "longitude": 73.8077
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Station display name |
| `stationCode` | string | Yes | Must be unique |
| `address` | string | Yes | Physical address |
| `phone` | string | Yes | Contact number |
| `location.latitude` | number | Yes | GPS latitude |
| `location.longitude` | number | Yes | GPS longitude |

**Response 201:**
```json
{
  "success": true,
  "message": "Police station created successfully",
  "data": {
    "station": {
      "_id": "64fb...",
      "name": "Kothrud Police Station",
      "stationCode": "KOT-PN",
      "address": "Ideal Colony, Kothrud, Pune",
      "phone": "020-25443311",
      "location": { "latitude": 18.5074, "longitude": 73.8077 },
      "stationHeadId": null,
      "status": "ACTIVE",
      "createdAt": "2026-08-15T05:00:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Missing required fields |
| 400 | Duplicate stationCode |
| 403 | Not CONTROL_ROOM_ADMIN |

---

### GET /api/stations

**Purpose:** List all police stations.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Query Parameters:** None defined (no filtering implemented in `getStations` — passes `req.query` directly to service but service accepts a plain filter object, so query params may not function as expected)

**Response 200:**
```json
{
  "success": true,
  "message": "Police stations retrieved successfully",
  "data": {
    "stations": [
      {
        "_id": "64fb...",
        "name": "Kothrud Police Station",
        "stationCode": "KOT-PN",
        "address": "Ideal Colony, Kothrud, Pune",
        "phone": "020-25443311",
        "location": { "latitude": 18.5074, "longitude": 73.8077 },
        "stationHeadId": {
          "_id": "64fc...",
          "name": "Inspector Rajesh Patil",
          "email": "kothrud.head@smartpolice.local",
          "phone": "9876543210"
        },
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### GET /api/stations/:id

**Purpose:** Get a single police station by MongoDB ObjectId.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Path Parameter:** `:id` — MongoDB ObjectId of the station

**Response 200:** Returns single station object with populated `stationHeadId`.

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Invalid ObjectId format |
| 404 | Station not found |

---

### PATCH /api/stations/:id

**Purpose:** Update station fields (name, address, phone, etc.).

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Path Parameter:** `:id` — MongoDB ObjectId

**Request Body:** Any combination of updatable fields:
```json
{
  "name": "Updated Station Name",
  "phone": "020-99998888",
  "address": "New Address, Pune"
}
```

**Response 200:** Returns updated station object.

---

### DELETE /api/stations/:id

**Purpose:** Deactivates a station (soft delete — sets `status` to `INACTIVE`). Does NOT remove from MongoDB.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Response 200:**
```json
{
  "success": true,
  "message": "Police station deactivated successfully",
  "data": {
    "station": { "status": "INACTIVE", "..." }
  }
}
```

---

### PATCH /api/stations/:id/status

**Purpose:** Change a station's status directly.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Validation:** `status` is required.

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

| Field | Type | Required | Enum |
|---|---|---|---|
| `status` | string | Yes | `ACTIVE`, `INACTIVE` |

**Response 200:** Returns updated station.

---

### PATCH /api/stations/:id/assign

**Purpose:** Assign a Station Head officer to this station. Updates both the station's `stationHeadId` and the officer's `role` to `STATION_HEAD`.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Validation:** `officerUserId` is required.

**Request Body:**
```json
{
  "officerUserId": "64fc..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `officerUserId` | string | Yes | MongoDB ObjectId of the User (not PoliceOfficer) |

**Response 200:** Returns updated station with `stationHeadId` populated.

**Error Responses:**

| Status | Scenario |
|---|---|
| 404 | Station not found |
| 404 | Officer user not found |
| 400 | User is not registered as a police officer |

---

## 3. Police Officers

### POST /api/officers

**Purpose:** Create a new police officer account. Admin provides the credentials directly. No automatic loginId or temporary password generation (see auth flow notes above).

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Validation:** `name`, `email`, `phone`, `password`, `badgeNumber`, `rank`, `role` are all required.

**Request Body:**
```json
{
  "name": "Sub-Inspector Amit Shinde",
  "email": "amit.shinde@smartpolice.local",
  "phone": "9876543211",
  "password": "TempPass123!",
  "badgeNumber": "BADGE002",
  "rank": "SUB_INSPECTOR",
  "role": "INVESTIGATING_OFFICER",
  "stationId": "64fb..."
}
```

| Field | Type | Required | Enum / Notes |
|---|---|---|---|
| `name` | string | Yes | Full name |
| `email` | string | Yes | Must be unique |
| `phone` | string | Yes | Contact number |
| `password` | string | Yes | Admin sets initial password |
| `badgeNumber` | string | Yes | Must be unique |
| `rank` | string | Yes | `COMMISSIONER`, `INSPECTOR`, `SUB_INSPECTOR`, `ASSISTANT_SUB_INSPECTOR`, `HEAD_CONSTABLE`, `CONSTABLE` |
| `role` | string | Yes | `STATION_HEAD`, `INVESTIGATING_OFFICER`, `FIELD_OFFICER` |
| `stationId` | string | No | MongoDB ObjectId of station |

**Response 201:**
```json
{
  "success": true,
  "message": "Police officer created successfully",
  "data": {
    "user": {
      "_id": "64fc...",
      "name": "Sub-Inspector Amit Shinde",
      "email": "amit.shinde@smartpolice.local",
      "role": "INVESTIGATING_OFFICER",
      "status": "ACTIVE"
    },
    "officerDetails": {
      "_id": "64fd...",
      "userId": "64fc...",
      "stationId": "64fb...",
      "badgeNumber": "BADGE002",
      "rank": "SUB_INSPECTOR",
      "role": "INVESTIGATING_OFFICER",
      "dutyStatus": "AVAILABLE"
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Missing required fields |
| 400 | Email already exists |
| 400 | Badge number already assigned |
| 404 | Station not found (if stationId supplied) |
| 403 | Not CONTROL_ROOM_ADMIN |

---

### GET /api/officers

**Purpose:** List police officers with optional filtering.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Query Parameters:**

| Parameter | Type | Notes |
|---|---|---|
| `stationId` | string | Filter by station ObjectId |
| `role` | string | Filter by role enum |
| `dutyStatus` | string | Filter by duty status |

**Response 200:**
```json
{
  "success": true,
  "message": "Officers retrieved successfully",
  "data": {
    "officers": [
      {
        "_id": "64fd...",
        "userId": {
          "_id": "64fc...",
          "name": "Sub-Inspector Amit Shinde",
          "email": "amit.shinde@smartpolice.local",
          "phone": "9876543211",
          "status": "ACTIVE",
          "avatar": ""
        },
        "stationId": {
          "_id": "64fb...",
          "name": "Kothrud Police Station",
          "stationCode": "KOT-PN"
        },
        "badgeNumber": "BADGE002",
        "rank": "SUB_INSPECTOR",
        "role": "INVESTIGATING_OFFICER",
        "dutyStatus": "AVAILABLE",
        "currentLocation": { "latitude": 18.5074, "longitude": 73.8077 },
        "lastLocationUpdate": "2026-08-15T05:00:00.000Z"
      }
    ]
  }
}
```

---

### GET /api/officers/:id

**Purpose:** Get a single officer profile by PoliceOfficer ObjectId (not User ObjectId).

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Path Parameter:** `:id` — MongoDB ObjectId of the **PoliceOfficer** document

**Response 200:** Returns single officer with populated `userId` and `stationId`.

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Invalid ObjectId format |
| 404 | Officer not found |

---

### PATCH /api/officers/:id

**Purpose:** Update officer profile fields. Updates both `User` and `PoliceOfficer` documents.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Path Parameter:** `:id` — PoliceOfficer ObjectId

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "phone": "9876543299",
  "status": "ACTIVE",
  "rank": "INSPECTOR",
  "role": "STATION_HEAD",
  "dutyStatus": "ON_DUTY"
}
```

| Field | Type | Updates | Enum |
|---|---|---|---|
| `name` | string | User.name | — |
| `phone` | string | User.phone | — |
| `status` | string | User.status | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `rank` | string | PoliceOfficer.rank | See rank enum above |
| `role` | string | PoliceOfficer.role | `STATION_HEAD`, `INVESTIGATING_OFFICER`, `FIELD_OFFICER` |
| `dutyStatus` | string | PoliceOfficer.dutyStatus | `ON_DUTY`, `OFF_DUTY`, `BUSY`, `AVAILABLE` |

**Response 200:** Returns updated PoliceOfficer document.

---

### PATCH /api/officers/:id/transfer

**Purpose:** Transfer an officer to a different police station.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Path Parameter:** `:id` — PoliceOfficer ObjectId

**Validation:** `stationId` is required.

**Request Body:**
```json
{
  "stationId": "64fb..."
}
```

**Response 200:** Returns updated PoliceOfficer with new `stationId`.

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | stationId missing |
| 404 | Officer not found |
| 404 | Destination station not found |

---

### PATCH /api/officers/:id/assign

**Purpose:** Assign an officer to a station (functionally identical to `/transfer` — uses the same controller function internally).

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Request Body:**
```json
{
  "stationId": "64fb..."
}
```

**Response 200:** Returns updated PoliceOfficer.

---

### PATCH /api/officers/:id/status

**Purpose:** Update an officer's duty status.

**Authentication:** Required

**Allowed Roles:** All authenticated roles (no role restriction in middleware)

> **Note:** The `:id` here is treated as a **User ObjectId** (looked up via `findOne({ userId })`) not the PoliceOfficer ObjectId.

**Validation:** `dutyStatus` is required.

**Request Body:**
```json
{
  "dutyStatus": "ON_DUTY"
}
```

| Field | Type | Required | Enum |
|---|---|---|---|
| `dutyStatus` | string | Yes | `ON_DUTY`, `OFF_DUTY`, `BUSY`, `AVAILABLE` |

**Response 200:** Returns updated PoliceOfficer.

---

### PATCH /api/officers/:id/location

**Purpose:** Update an officer's current GPS location. Emits `officer:location` Socket.IO event.

**Authentication:** Required

**Allowed Roles:** All authenticated roles (no role restriction in middleware)

> **Note:** The `:id` here is treated as a **User ObjectId**.

**Validation:** `latitude` and `longitude` must be present (validated by `validateCoordinates` middleware).

**Request Body:**
```json
{
  "latitude": 18.5098,
  "longitude": 73.8112
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `latitude` | number | Yes | Between -90 and 90 |
| `longitude` | number | Yes | Between -180 and 180 |

**Response 200:**
```json
{
  "success": true,
  "message": "Officer location updated successfully",
  "data": {
    "officer": {
      "currentLocation": { "latitude": 18.5098, "longitude": 73.8112 },
      "lastLocationUpdate": "2026-08-15T05:30:00.000Z"
    }
  }
}
```

**Socket.IO side effect:** Emits `officer:location` to `control-room` and `station:<stationId>` rooms.

**Officer Password Reset:** `NOT IMPLEMENTED`

---

## 4. Complaints

### POST /api/complaints

**Purpose:** Submit a new complaint. The backend automatically finds the nearest active police station using Haversine distance and assigns `policeStationId`. Citizens do not supply the station.

**Authentication:** Required

**Allowed Roles:** `CITIZEN` only

**Validation:** `title`, `description`, `latitude`, `longitude`, `address`, `crimeType` are all required.

**Request Body:**
```json
{
  "title": "Bike stolen from parking",
  "description": "My motorcycle was stolen from the college parking lot between 2pm–4pm.",
  "latitude": 18.5074,
  "longitude": 73.8077,
  "address": "Ideal Colony, Kothrud, Pune",
  "crimeType": "THEFT"
}
```

| Field | Type | Required | Enum / Notes |
|---|---|---|---|
| `title` | string | Yes | Short complaint title |
| `description` | string | Yes | Detailed description |
| `latitude` | number | Yes | GPS latitude of crime location |
| `longitude` | number | Yes | GPS longitude of crime location |
| `address` | string | Yes | Human-readable address |
| `crimeType` | string | Yes | `THEFT`, `ASSAULT`, `FRAUD`, `CYBER_CRIME`, `HARASSMENT`, `MISSING_PERSON`, `VANDALISM`, `TRAFFIC`, `OTHER` |

**Backend Automatically Sets:**
- `complaintId` — Unique ID generated as `CMP-YYYY-XXXX`
- `citizenId` — From authenticated user
- `policeStationId` — Nearest active station (Haversine calculation)
- `status` — Defaults to `SUBMITTED`
- `priority` — Defaults to `MEDIUM`

**Response 201:**
```json
{
  "success": true,
  "message": "Complaint registered successfully",
  "data": {
    "complaint": {
      "_id": "64fe...",
      "complaintId": "CMP-2026-7312",
      "citizenId": "64fb...",
      "crimeType": "THEFT",
      "title": "Bike stolen from parking",
      "description": "...",
      "location": {
        "latitude": 18.5074,
        "longitude": 73.8077,
        "address": "Ideal Colony, Kothrud, Pune"
      },
      "policeStationId": "64fc...",
      "assignedOfficerId": null,
      "status": "SUBMITTED",
      "priority": "MEDIUM",
      "evidence": [],
      "createdAt": "2026-08-15T06:00:00.000Z"
    }
  }
}
```

**Socket.IO side effects:**
- `complaint:new` emitted to `control-room`
- `complaint:new` emitted to `station:<nearestStationId>`

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Missing required fields |
| 403 | Not CITIZEN role |
| 500 | No active police stations found |

---

### GET /api/complaints

**Purpose:** List complaints. Results are automatically filtered by the caller's role.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Data returned depends on role:**

| Role | Data Returned |
|---|---|
| `CITIZEN` | Only complaints submitted by this citizen |
| `STATION_HEAD` | Only complaints belonging to their station |
| `INVESTIGATING_OFFICER` | Only complaints assigned to them |
| `CONTROL_ROOM_ADMIN` | All complaints |
| `FIELD_OFFICER` | All complaints (no filter applied) |

**Response 200:**
```json
{
  "success": true,
  "message": "Complaints retrieved successfully",
  "data": {
    "complaints": [ { "..." } ]
  }
}
```

---

### GET /api/complaints/:id

**Purpose:** Get a single complaint by ObjectId.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Ownership Check:** Citizens are denied access if the complaint does not belong to them (403).

**Response 200:** Returns populated complaint with `citizenId`, `policeStationId`, and `assignedOfficerId`.

---

### PATCH /api/complaints/:id/status

**Purpose:** Update a complaint's status. Triggers an in-app notification and Socket.IO event to the citizen.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD`, `INVESTIGATING_OFFICER`

**Validation:** `status` is required.

**Request Body:**
```json
{
  "status": "INVESTIGATION"
}
```

| Field | Type | Required | Enum |
|---|---|---|---|
| `status` | string | Yes | `SUBMITTED`, `UNDER_REVIEW`, `ASSIGNED`, `INVESTIGATION`, `FIR_REGISTERED`, `RESOLVED`, `REJECTED` |

**Response 200:** Returns updated complaint.

**Socket.IO side effect:** `complaint:updated` emitted to `citizen:<citizenId>`

---

### PATCH /api/complaints/:id/assign

**Purpose:** Assign an investigating officer to a complaint. Sets status to `ASSIGNED`. Sends notifications to the officer and citizen.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD`

**Validation:** `officerUserId` is required.

**Request Body:**
```json
{
  "officerUserId": "64fc..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `officerUserId` | string | Yes | User ObjectId of the officer |

**Response 200:** Returns updated complaint.

---

### POST /api/complaints/:id/evidence

**Purpose:** Upload a single evidence file to a complaint. Stores file locally in `uploads/evidence/`.

**Authentication:** Required

**Allowed Roles:** All authenticated roles (no role restriction on this endpoint)

**Content-Type:** `multipart/form-data`

**Form Field:**

| Field Name | Type | Notes |
|---|---|---|
| `evidence` | file | Single file upload. Field name MUST be `evidence`. |

**Supported MIME Types:**
- Images: `image/jpeg`, `image/png`, `image/jpg`, `image/gif`, `image/webp`
- Videos: `video/mp4`, `video/mpeg`, `video/quicktime`, `video/x-matroska`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

**Maximum file size:** 50 MB

**Response 200:**
```json
{
  "success": true,
  "message": "Evidence uploaded successfully",
  "data": {
    "complaint": {
      "evidence": [
        {
          "type": "IMAGE",
          "originalName": "crime_scene.jpg",
          "filename": "evidence-1723700000000-123456789.jpg",
          "path": "http://localhost:8000/uploads/evidence/evidence-1723700000000-123456789.jpg",
          "uploadedAt": "2026-08-15T06:05:00.000Z"
        }
      ]
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | No file uploaded |
| 400 | Unsupported file format |
| 400 | File exceeds 50MB size limit |
| 404 | Complaint not found |

---

## 5. FIRs (First Information Reports)

### POST /api/firs

**Purpose:** Register a formal FIR from an existing complaint. Generates FIR number as `FIR-YYYY-XXXX`. Updates complaint status to `FIR_REGISTERED`. Sends citizen notification.

**Authentication:** Required

**Allowed Roles:** `INVESTIGATING_OFFICER`, `STATION_HEAD`, `CONTROL_ROOM_ADMIN`

**Validation:** `complaintId` is required.

**Request Body:**
```json
{
  "complaintId": "64fe..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `complaintId` | string | Yes | ObjectId of the existing complaint |

**Backend Automatically Sets:**
- `firNumber` — Generated as `FIR-YYYY-XXXX`
- `investigatingOfficerId` — The authenticated user's ID
- `citizenId`, `policeStationId`, `crimeType`, `description` — Copied from the complaint

**Response 201:**
```json
{
  "success": true,
  "message": "FIR registered successfully",
  "data": {
    "fir": {
      "_id": "64ff...",
      "firNumber": "FIR-2026-3821",
      "complaintId": "64fe...",
      "citizenId": "64fb...",
      "policeStationId": "64fc...",
      "investigatingOfficerId": "64fd...",
      "crimeType": "THEFT",
      "description": "...",
      "status": "REGISTERED",
      "registeredAt": "2026-08-15T06:10:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | complaintId missing |
| 400 | FIR already registered for this complaint |
| 404 | Complaint not found |
| 403 | Not authorized role |

---

### GET /api/firs

**Purpose:** List FIRs. Results are automatically filtered by role.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

| Role | Data Returned |
|---|---|
| `CITIZEN` | Only FIRs for their complaints |
| `STATION_HEAD` | Only FIRs for their station |
| `INVESTIGATING_OFFICER` | Only FIRs where they are the investigating officer |
| `CONTROL_ROOM_ADMIN` | All FIRs |
| `FIELD_OFFICER` | All FIRs (no filter applied) |

**Response 200:** Returns array of FIRs with populated `complaintId`, `citizenId`, `policeStationId`, `investigatingOfficerId`.

---

### GET /api/firs/:id

**Purpose:** Get a single FIR by ObjectId.

**Authentication:** Required

**Ownership Check:** Citizens are denied access (403) if the FIR does not belong to them.

**Response 200:** Returns fully populated FIR document.

---

### PATCH /api/firs/:id/status

**Purpose:** Update a FIR's status. Sends citizen notification.

**Authentication:** Required

**Allowed Roles:** `INVESTIGATING_OFFICER`, `STATION_HEAD`, `CONTROL_ROOM_ADMIN`

**Validation:** `status` is required.

**Request Body:**
```json
{
  "status": "UNDER_INVESTIGATION"
}
```

| Field | Type | Required | Enum |
|---|---|---|---|
| `status` | string | Yes | `REGISTERED`, `UNDER_INVESTIGATION`, `CLOSED` |

**Response 200:** Returns updated FIR.

---

## 6. SOS (Emergency Alerts)

### POST /api/sos

**Purpose:** Trigger an emergency SOS alert. Authentication is **optional** — can be called by anonymous users. The backend automatically finds the nearest active station and an available Field Officer.

**Authentication:** Optional (supports anonymous trigger)

**Content-Type:** `application/json`

**Validation:** `latitude` and `longitude` are required.

**Request Body:**
```json
{
  "latitude": 18.5085,
  "longitude": 73.8115,
  "address": "Ideal Colony Metro Station, Kothrud, Pune"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `latitude` | number | Yes | GPS latitude |
| `longitude` | number | Yes | GPS longitude |
| `address` | string | No | Human-readable description |

**Backend Automatically Sets:**
- `sosId` — Generated as `SOS-YYYY-XXXX`
- `citizenId` — From authenticated user or `null` if anonymous
- `nearestStationId` — Computed via Haversine distance
- `assignedOfficerId` — Nearest available `FIELD_OFFICER` at the nearest station (if found). Officer's `dutyStatus` is set to `BUSY`.
- `status` — Defaults to `ACTIVE`

**Response 201:**
```json
{
  "success": true,
  "message": "SOS Alert triggered successfully",
  "data": {
    "sos": {
      "_id": "6500...",
      "sosId": "SOS-2026-4912",
      "citizenId": "64fb...",
      "location": {
        "latitude": 18.5085,
        "longitude": 73.8115,
        "address": "Ideal Colony Metro Station, Kothrud, Pune"
      },
      "nearestStationId": "64fc...",
      "assignedOfficerId": "64fd...",
      "status": "ACTIVE",
      "acknowledgedAt": null,
      "dispatchedAt": null,
      "resolvedAt": null,
      "createdAt": "2026-08-15T06:15:00.000Z"
    }
  }
}
```

**Socket.IO side effects:**
- `sos:new` emitted to `control-room`
- `sos:new` emitted to `station:<nearestStationId>`
- `sos:new` emitted to `officer:<assignedOfficerId>`
- In-app notification created for assigned officer

---

### GET /api/sos

**Purpose:** List SOS alerts. Results filtered by role.

**Authentication:** Required

| Role | Data Returned |
|---|---|
| `CITIZEN` | Only their own SOS alerts |
| `STATION_HEAD` | SOS alerts for their station |
| `FIELD_OFFICER` | SOS alerts assigned to them |
| `CONTROL_ROOM_ADMIN` | All SOS alerts |
| `INVESTIGATING_OFFICER` | All SOS alerts (no filter applied) |

**Response 200:**
```json
{
  "success": true,
  "message": "SOS alerts retrieved successfully",
  "data": {
    "sosList": [ { "..." } ]
  }
}
```

---

### GET /api/sos/:id

**Purpose:** Get a single SOS alert by ObjectId.

**Authentication:** Required

**Response 200:** Returns fully populated SOS document.

---

### PATCH /api/sos/:id/acknowledge

**Purpose:** Acknowledge an active SOS alert. Sets status to `ACKNOWLEDGED`, records `acknowledgedAt`. If no officer was auto-assigned, assigns the authenticated user.

**Authentication:** Required

**Allowed Roles:** All authenticated roles (no role restriction)

**Request Body:** None required

**Response 200:**
```json
{
  "success": true,
  "message": "SOS alert acknowledged successfully",
  "data": {
    "sos": {
      "status": "ACKNOWLEDGED",
      "acknowledgedAt": "2026-08-15T06:16:00.000Z"
    }
  }
}
```

**Socket.IO side effects:** `sos:updated` emitted to `control-room` and `station:<stationId>`

---

### PATCH /api/sos/:id/dispatch

**Purpose:** Dispatch an officer to the SOS. Sets status to `DISPATCHED`, records `dispatchedAt`, marks officer as `BUSY`.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Request Body (optional):**
```json
{
  "officerUserId": "64fd..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `officerUserId` | string | No | If omitted, the authenticated user is used as dispatcher |

**Response 200:** Returns updated SOS.

**Socket.IO side effects:** `sos:updated` emitted to `control-room`, `station:<stationId>`, and `officer:<officerUserId>`

---

### PATCH /api/sos/:id/resolve

**Purpose:** Resolve an SOS alert. Sets status to `RESOLVED`, records `resolvedAt`. Sets assigned officer's `dutyStatus` back to `AVAILABLE`.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Request Body:** None required

**Response 200:** Returns updated SOS with `status: "RESOLVED"`.

**Socket.IO side effects:** `sos:updated` emitted to `control-room` and `station:<stationId>`

---

### PATCH /api/sos/:id/escalate

**Purpose:** Escalate an unresolved SOS to the control room and all other active police stations.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Request Body:** None required

**Response 200:** Returns updated SOS with `status: "ESCALATED"`.

**Socket.IO side effects:**
- `sos:updated` emitted to `control-room`
- `sos:updated` emitted to all other `station:<id>` rooms (excluding the nearest station)

---

## 7. Announcements

### GET /api/announcements

**Purpose:** List all **active** announcements. Public route — no authentication required.

**Authentication:** Not required (Public)

**Query Parameters:**

| Parameter | Type | Notes |
|---|---|---|
| `type` | string | Filter by announcement type |
| `severity` | string | Filter by severity |

**Response 200:**
```json
{
  "success": true,
  "message": "Announcements retrieved successfully",
  "data": {
    "announcements": [
      {
        "_id": "6501...",
        "title": "High Crime Area Alert",
        "message": "Citizens are advised to remain alert around Kothrud Market.",
        "type": "CRIME_ALERT",
        "severity": "HIGH",
        "targetArea": { "name": "Kothrud" },
        "stationId": {
          "_id": "64fc...",
          "name": "Kothrud Police Station",
          "stationCode": "KOT-PN"
        },
        "createdBy": { "_id": "64fb...", "name": "Inspector Rajesh Patil" },
        "expiresAt": null,
        "status": "ACTIVE",
        "createdAt": "2026-08-15T06:00:00.000Z"
      }
    ]
  }
}
```

---

### GET /api/announcements/:id

**Purpose:** Get a single announcement by ObjectId.

**Authentication:** Not required (Public)

**Response 200:** Returns single announcement document.

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Invalid ObjectId format |
| 404 | Announcement not found |

---

### POST /api/announcements

**Purpose:** Create a new public safety announcement. Emits `announcement:new` to control-room and station rooms.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD`

**Validation:** `title`, `message`, `targetAreaName` are required.

**Request Body:**
```json
{
  "title": "Missing Child Alert",
  "message": "8-year-old Rahul was last seen near Kothrud Bus Stand. Contact 100 if found.",
  "type": "MISSING_PERSON",
  "severity": "CRITICAL",
  "targetAreaName": "Kothrud",
  "expiresAt": "2026-08-20T23:59:00.000Z"
}
```

| Field | Type | Required | Enum / Notes |
|---|---|---|---|
| `title` | string | Yes | Announcement title |
| `message` | string | Yes | Full announcement text |
| `targetAreaName` | string | Yes | Area name (e.g. `Kothrud`) |
| `type` | string | No | `CRIME_ALERT`, `ROAD_ALERT`, `MISSING_PERSON`, `PUBLIC_SAFETY`, `GENERAL` (default: `GENERAL`) |
| `severity` | string | No | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` (default: `LOW`) |
| `expiresAt` | ISO date string | No | Expiry datetime, `null` if no expiry |

**Backend Automatically Sets:**
- `stationId` — Set automatically if user is `STATION_HEAD` (from their assigned station). `null` for `CONTROL_ROOM_ADMIN`.
- `createdBy` — Authenticated user's ID
- `status` — Defaults to `ACTIVE`

**Response 201:** Returns created announcement document.

---

### PATCH /api/announcements/:id

**Purpose:** Update an existing announcement. `CONTROL_ROOM_ADMIN` can update any announcement. `STATION_HEAD` can only update announcements they created.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD`

**Request Body (all optional):**
```json
{
  "title": "Updated Title",
  "message": "Updated message text",
  "type": "PUBLIC_SAFETY",
  "severity": "MEDIUM",
  "targetAreaName": "Baner",
  "status": "EXPIRED",
  "expiresAt": null
}
```

**Response 200:** Returns updated announcement.

---

### DELETE /api/announcements/:id

**Purpose:** Archive an announcement (soft delete — sets `status` to `ARCHIVED`). Does NOT remove from MongoDB.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD` (only own announcements for Station Head)

**Response 200:**
```json
{
  "success": true,
  "message": "Announcement archived successfully",
  "data": {
    "announcement": { "status": "ARCHIVED", "..." }
  }
}
```

---

## 8. Daily Reports

### POST /api/reports/daily/generate

**Purpose:** Generate (or regenerate) a daily safety report for a specific date from live MongoDB data. If `AI_API_KEY` is configured, uses Gemini to write a professional summary; otherwise uses a local text summary.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD`

**Validation:** `date` is required.

**Request Body:**
```json
{
  "date": "2026-08-15"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | string | Yes | Date in `YYYY-MM-DD` format |

**Response 201:**
```json
{
  "success": true,
  "message": "Daily safety report generated successfully",
  "data": {
    "report": {
      "_id": "6502...",
      "date": "2026-08-15T00:00:00.000Z",
      "totalComplaints": 12,
      "crimeBreakdown": {
        "THEFT": 5,
        "FRAUD": 3,
        "ASSAULT": 2,
        "OTHER": 2
      },
      "activeSOS": 1,
      "resolvedCases": 3,
      "highRiskAreas": ["Kothrud", "Baner"],
      "summary": "On 2026-08-15, the Smart Police Station recorded 12 incidents across Pune...",
      "createdBy": "64fb...",
      "createdAt": "2026-08-15T06:30:00.000Z"
    }
  }
}
```

> Calling this endpoint for the same date a second time **updates** the existing report instead of creating a duplicate.

---

### GET /api/reports/daily

**Purpose:** List all generated daily reports.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Response 200:** Returns array of DailyReport documents sorted by date descending.

---

### GET /api/reports/daily/:id

**Purpose:** Get a single daily report by ObjectId.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Response 200:** Returns single DailyReport document.

**Error Responses:**

| Status | Scenario |
|---|---|
| 404 | Report not found |

---

## 9. Crime Intelligence

### GET /api/crime/hotspots

**Purpose:** Dynamically calculate crime hotspots from all complaint location data. Groups complaints by coordinates rounded to 3 decimal places (~110m grid), assigns severity by incident count.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Severity Thresholds:**

| Severity | Incident Count |
|---|---|
| `LOW` | 1–2 |
| `MEDIUM` | 3–7 |
| `HIGH` | 8–14 |
| `CRITICAL` | 15+ |

**Response 200:**
```json
{
  "success": true,
  "message": "Crime hotspots retrieved successfully",
  "data": {
    "hotspots": [
      {
        "name": "Kothrud Depot",
        "latitude": 18.502,
        "longitude": 73.802,
        "incidentCount": 8,
        "severity": "HIGH",
        "crimeTypes": ["THEFT", "ASSAULT"]
      },
      {
        "name": "Baner Rd",
        "latitude": 18.552,
        "longitude": 73.785,
        "incidentCount": 3,
        "severity": "MEDIUM",
        "crimeTypes": ["FRAUD"]
      }
    ]
  }
}
```

---

### GET /api/crime/statistics

**Purpose:** Get aggregate crime statistics — total complaints, breakdown by crime type, and breakdown by status.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Response 200:**
```json
{
  "success": true,
  "message": "Crime statistics retrieved successfully",
  "data": {
    "statistics": {
      "totalComplaints": 42,
      "crimeBreakdown": {
        "THEFT": 15,
        "FRAUD": 10,
        "ASSAULT": 8,
        "CYBER_CRIME": 5,
        "OTHER": 4
      },
      "statusBreakdown": {
        "SUBMITTED": 12,
        "ASSIGNED": 8,
        "INVESTIGATION": 10,
        "FIR_REGISTERED": 5,
        "RESOLVED": 7
      }
    }
  }
}
```

---

## 10. Patrols

### POST /api/patrols/generate

**Purpose:** Generate an AI-assisted patrol plan for a station. Fetches hotspots from crime data, calls Gemini AI (or deterministic fallback), builds waypoints, calls Google Maps for routing (or Haversine fallback). Creates a Patrol record and notifies assigned officers.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`, `STATION_HEAD`

**Request Body:**
```json
{
  "stationId": "64fc..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `stationId` | string | Conditional | Required for `CONTROL_ROOM_ADMIN`. Automatically resolved for `STATION_HEAD`. |

**Backend Automatically:**
- Fetches available `FIELD_OFFICER` records for the station
- Calls AI service for priority area recommendations
- Resolves waypoints from hotspot data
- Calls Maps service for routing details
- Sets officers' `dutyStatus` to `BUSY`
- Creates in-app notifications for each assigned officer

**Response 201:**
```json
{
  "success": true,
  "message": "Patrol plan generated successfully",
  "data": {
    "patrol": {
      "_id": "6503...",
      "patrolId": "PTR-2026-5521",
      "stationId": "64fc...",
      "officerIds": ["64fd...", "64fe..."],
      "route": {
        "waypoints": [
          { "name": "Kothrud Depot", "latitude": 18.502, "longitude": 73.802 },
          { "name": "Baner Rd", "latitude": 18.552, "longitude": 73.785 }
        ],
        "distance": 7.4,
        "duration": 15,
        "encodedPolyline": "..."
      },
      "priority": "HIGH",
      "status": "PLANNED",
      "aiGenerated": true,
      "reason": "High incident density was detected in Kothrud and Baner...",
      "createdBy": "64fb...",
      "createdAt": "2026-08-15T06:45:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | No available officers in station |
| 400 | stationId missing (for Admin) |
| 404 | Station not found |

---

### GET /api/patrols

**Purpose:** List patrol routes filtered by role.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

| Role | Data Returned |
|---|---|
| `STATION_HEAD` | Only patrols for their station |
| `FIELD_OFFICER` | Only patrols they are assigned to |
| `CONTROL_ROOM_ADMIN` | All patrols |
| Others | All patrols |

**Response 200:** Returns array of Patrol documents with populated `stationId` and `officerIds`.

---

### PATCH /api/patrols/:id/status

**Purpose:** Update a patrol's status. If set to `COMPLETED` or `CANCELLED`, sets all assigned officers' `dutyStatus` back to `AVAILABLE`.

**Authentication:** Required

**Allowed Roles:** All authenticated roles (no role restriction)

**Validation:** `status` is required.

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

| Field | Type | Required | Enum |
|---|---|---|---|
| `status` | string | Yes | `PLANNED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |

**Response 200:** Returns updated Patrol.

---

### POST /api/patrols/route

**Purpose:** Calculate road directions for a set of waypoints. Uses Google Maps Directions API if `GOOGLE_MAPS_API_KEY` is configured, otherwise uses Haversine-based distance calculation with 30 km/h average speed estimate.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Validation:** `origin` and `waypoints` are required.

**Request Body:**
```json
{
  "origin": {
    "latitude": 18.5074,
    "longitude": 73.8077
  },
  "waypoints": [
    { "latitude": 18.5590, "longitude": 73.7797 },
    { "latitude": 18.5987, "longitude": 73.7686 }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Directions calculated successfully",
  "data": {
    "route": {
      "distance": 12.4,
      "duration": 25,
      "encodedPolyline": "..."
    }
  }
}
```

> When Google Maps is unavailable, `encodedPolyline` returns `"mock_polyline_fallback_data_points"`.

---

## 11. Notifications

### GET /api/notifications

**Purpose:** Get all in-app notifications for the authenticated user, sorted newest first.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Response 200:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "_id": "6504...",
        "recipientId": "64fb...",
        "type": "COMPLAINT",
        "title": "Officer Assigned to Complaint",
        "message": "An officer has been assigned to investigate your complaint CMP-2026-7312",
        "referenceType": "COMPLAINT",
        "referenceId": "64fe...",
        "isRead": false,
        "createdAt": "2026-08-15T06:05:00.000Z"
      }
    ]
  }
}
```

---

### PATCH /api/notifications/read-all

**Purpose:** Mark all unread notifications as read for the authenticated user.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Request Body:** None

**Response 200:**
```json
{
  "success": true,
  "message": "All notifications marked as read successfully",
  "data": {
    "success": true,
    "message": "All notifications marked as read"
  }
}
```

---

### PATCH /api/notifications/:id/read

**Purpose:** Mark a single notification as read.

**Authentication:** Required

**Allowed Roles:** All authenticated roles

**Ownership Check:** Returns 404 if the notification doesn't belong to the authenticated user.

**Response 200:**
```json
{
  "success": true,
  "message": "Notification marked as read successfully",
  "data": {
    "notification": { "isRead": true, "..." }
  }
}
```

---

## 12. Dashboards

### GET /api/dashboard/admin

**Purpose:** Admin overview — system-wide statistics and recent activity.

**Authentication:** Required

**Allowed Roles:** `CONTROL_ROOM_ADMIN`

**Response 200 data fields:**

| Field | Type | Description |
|---|---|---|
| `totalStations` | number | All stations |
| `activeStations` | number | Stations with status ACTIVE |
| `totalOfficers` | number | All officer profiles |
| `activeOfficers` | number | Officers with dutyStatus AVAILABLE |
| `totalComplaints` | number | All complaints |
| `pendingComplaints` | number | Complaints with status SUBMITTED |
| `totalFIRs` | number | All FIRs |
| `activeSOS` | number | SOS with status ACTIVE/ACKNOWLEDGED/DISPATCHED/ESCALATED |
| `activeHotspots` | number | Hotspots with severity HIGH or CRITICAL |
| `recentSOS` | array | Last 5 SOS alerts (populated) |
| `recentComplaints` | array | Last 5 complaints (populated) |

---

### GET /api/dashboard/station

**Purpose:** Station-specific overview for the logged-in Station Head.

**Authentication:** Required

**Allowed Roles:** `STATION_HEAD`

**Automatically resolves the caller's station from their PoliceOfficer profile.**

**Response 200 data fields:**

| Field | Type | Description |
|---|---|---|
| `stationId` | ObjectId | Current station ID |
| `complaints` | array | All complaints for station |
| `firs` | array | All FIRs for station |
| `sos` | array | All SOS for station |
| `officers` | array | All officers assigned to station |
| `activePatrols` | array | Active patrols for station |

**Error Responses:**

| Status | Scenario |
|---|---|
| 400 | Station Head not assigned to any station |

---

### GET /api/dashboard/officer

**Purpose:** Officer-specific dashboard.

**Authentication:** Required

**Allowed Roles:** `STATION_HEAD`, `INVESTIGATING_OFFICER`, `FIELD_OFFICER`

**Response 200 data fields:**

| Field | Type | Description |
|---|---|---|
| `officerProfile` | object | PoliceOfficer record with station |
| `assignedComplaints` | array | Complaints assigned to this officer |
| `assignedFIRs` | array | FIRs where this officer is investigating |
| `SOSAssignments` | array | Active SOS assigned to this officer |
| `patrolAssignments` | array | PLANNED or ACTIVE patrols |
| `dutyStatus` | string | Current duty status |

---

### GET /api/dashboard/citizen

**Purpose:** Citizen personal overview — their complaints, FIRs, SOS, notifications, and active announcements.

**Authentication:** Required

**Allowed Roles:** `CITIZEN`

**Response 200 data fields:**

| Field | Type | Description |
|---|---|---|
| `myComplaints` | array | All complaints submitted by citizen |
| `myFIRs` | array | All FIRs for citizen's complaints |
| `activeSOS` | array | Active SOS triggered by citizen |
| `notifications` | array | Last 10 notifications |
| `announcements` | array | Last 5 active announcements |

---

## 13. Health Check

### GET /api/health

**Purpose:** Server and database health check.

**Authentication:** Not required (Public)

**Response 200:**
```json
{
  "success": true,
  "message": "Smart Police backend is healthy",
  "data": {
    "status": "UP",
    "database": "connected",
    "timestamp": "2026-08-15T06:00:00.000Z",
    "uptime": 342.156
  }
}
```

---

## Socket.IO Events

### Connection

**URL:** `ws://localhost:8000`

**Authentication:** Pass the access token in the handshake:
```js
const socket = io('http://localhost:8000', {
  auth: { token: 'eyJhbGci...' }
});
```

Token is optional — anonymous connections are allowed.

### Automatic Room Assignment

On connection, authenticated users are automatically placed into rooms:

| Role | Room |
|---|---|
| `CONTROL_ROOM_ADMIN` | `control-room` |
| `CITIZEN` | `citizen:<userId>` |
| `STATION_HEAD` | `officer:<userId>` + `station:<stationId>` |
| `INVESTIGATING_OFFICER` | `officer:<userId>` + `station:<stationId>` |
| `FIELD_OFFICER` | `officer:<userId>` + `station:<stationId>` |

---

### Client → Server Events

#### `officer:location:update`

**Direction:** Client → Server

**Who sends it:** Police officers (`STATION_HEAD`, `INVESTIGATING_OFFICER`, `FIELD_OFFICER`)

**Purpose:** Real-time location push from officer's device.

**Payload:**
```json
{
  "latitude": 18.5098,
  "longitude": 73.8112
}
```

**Side effect:** Server saves to DB and re-emits `officer:location` to `control-room` and `station:<stationId>`.

---

### Server → Client Events

#### `sos:new`

**Direction:** Server → Client

**Rooms:** `control-room`, `station:<stationId>`, `officer:<officerId>`

**Trigger:** When a new SOS alert is created via `POST /api/sos`

**Payload:**
```json
{
  "message": "EMERGENCY: SOS Active near Ideal Colony Metro Station",
  "sos": {
    "_id": "6500...",
    "sosId": "SOS-2026-4912",
    "location": { "latitude": 18.5085, "longitude": 73.8115, "address": "..." },
    "status": "ACTIVE",
    "nearestStationId": "...",
    "assignedOfficerId": "..."
  }
}
```

---

#### `sos:updated`

**Direction:** Server → Client

**Rooms:** `control-room`, `station:<stationId>`, optionally `officer:<officerId>` and `citizen:<citizenId>`

**Trigger:** On acknowledge, dispatch, resolve, or escalate SOS operations

**Payload:**
```json
{
  "message": "SOS status updated to DISPATCHED",
  "sos": {
    "_id": "6500...",
    "status": "DISPATCHED",
    "dispatchedAt": "2026-08-15T06:17:00.000Z"
  }
}
```

---

#### `complaint:new`

**Direction:** Server → Client

**Rooms:** `control-room`, `station:<nearestStationId>`

**Trigger:** When a new complaint is submitted via `POST /api/complaints`

**Payload:**
```json
{
  "message": "New complaint submitted: Bike stolen from parking",
  "complaint": {
    "_id": "64fe...",
    "complaintId": "CMP-2026-7312",
    "crimeType": "THEFT",
    "status": "SUBMITTED"
  }
}
```

---

#### `complaint:updated`

**Direction:** Server → Client

**Rooms:** `citizen:<citizenId>`, `officer:<officerId>`

**Trigger:** On status update or officer assignment

**Payload:**
```json
{
  "message": "Complaint CMP-2026-7312 status updated to INVESTIGATION",
  "complaint": { "status": "INVESTIGATION", "..." }
}
```

---

#### `officer:location`

**Direction:** Server → Client

**Rooms:** `control-room`, `station:<stationId>`

**Trigger:** When officer location is updated via HTTP `PATCH /api/officers/:id/location` or via Socket `officer:location:update`

**Payload:**
```json
{
  "officerId": "64fd...",
  "userId": "64fc...",
  "name": "Sub-Inspector Amit Shinde",
  "currentLocation": { "latitude": 18.5098, "longitude": 73.8112 },
  "lastLocationUpdate": "2026-08-15T06:20:00.000Z"
}
```

---

#### `announcement:new`

**Direction:** Server → Client

**Rooms:** `control-room`, `citizen:*` (broadcast key — not a real room), `station:<stationId>` (if from station head)

**Trigger:** When a new announcement is created via `POST /api/announcements`

**Payload:**
```json
{
  "announcement": {
    "_id": "6501...",
    "title": "Missing Child Alert",
    "message": "...",
    "severity": "CRITICAL",
    "type": "MISSING_PERSON"
  }
}
```

---

#### `notification:new`

**Direction:** Server → Client

**Rooms:** `citizen:<recipientId>`, `officer:<recipientId>`

**Trigger:** When an in-app notification is created (complaint assignment, FIR registration, SOS dispatch, patrol assignment)

**Payload:**
```json
{
  "notification": {
    "_id": "6504...",
    "type": "COMPLAINT",
    "title": "Officer Assigned to Complaint",
    "message": "You have been assigned to investigate complaint CMP-2026-7312",
    "isRead": false
  }
}
```

---

## Recommended Testing Order

Follow this sequence in Postman or Thunder Client to test the complete end-to-end system:

```
1.  GET  /api/health                        — Verify server is running
2.  POST /api/auth/register                 — Register citizen (ramesh@gmail.com / password123)
3.  POST /api/auth/login (admin)            — Login as admin@smartpolice.local / admin123
4.  POST /api/stations                      — Create Kothrud Police Station (save stationId)
5.  POST /api/officers                      — Create Station Head for Kothrud (save userId)
6.  PATCH /api/stations/:id/assign          — Assign station head using officerUserId
7.  POST /api/officers                      — Create Investigating Officer (save userId)
8.  POST /api/officers                      — Create Field Officer (save userId)
9.  POST /api/auth/login (citizen)          — Login as ramesh@gmail.com
10. POST /api/complaints                    — Submit complaint (Kothrud coords, THEFT)
11. GET  /api/complaints                    — Citizen sees only their complaint
12. POST /api/auth/login (station head)     — Login as station head
13. GET  /api/complaints                    — Station head sees station complaints
14. PATCH /api/complaints/:id/assign        — Assign to investigating officer
15. PATCH /api/complaints/:id/status        — Update to INVESTIGATION
16. POST /api/auth/login (investigator)     — Login as investigating officer
17. POST /api/complaints/:id/evidence       — Upload evidence image (multipart, field: evidence)
18. POST /api/firs                          — Register FIR from complaint
19. GET  /api/firs/:id                      — View FIR details
20. PATCH /api/firs/:id/status              — Update FIR to UNDER_INVESTIGATION
21. POST /api/sos                           — Citizen triggers SOS (no auth or citizen auth)
22. GET  /api/sos                           — Police views SOS list
23. PATCH /api/sos/:id/acknowledge          — Acknowledge SOS
24. PATCH /api/sos/:id/dispatch             — Dispatch officer
25. PATCH /api/sos/:id/resolve              — Resolve SOS
26. GET  /api/crime/hotspots                — View calculated crime hotspots
27. GET  /api/crime/statistics              — View crime breakdown statistics
28. POST /api/patrols/generate              — Generate AI patrol plan (as admin, supply stationId)
29. PATCH /api/patrols/:id/status           — Set patrol to ACTIVE
30. POST /api/patrols/route                 — Calculate directions for custom waypoints
31. POST /api/announcements                 — Create CRIME_ALERT announcement (as station head or admin)
32. GET  /api/announcements                 — Citizen retrieves active announcements
33. POST /api/reports/daily/generate        — Generate today's daily report (as admin)
34. GET  /api/reports/daily                 — List all reports
35. GET  /api/dashboard/admin               — Admin summary dashboard
36. GET  /api/dashboard/station             — Station Head dashboard
37. GET  /api/dashboard/officer             — Officer dashboard
38. GET  /api/dashboard/citizen             — Citizen dashboard
39. GET  /api/notifications                 — View citizen notifications
40. PATCH /api/notifications/read-all       — Mark all as read
```

---

## Environment Variables

### Required for Local Backend

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `PORT` | Server port (default: 8000) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | CORS allowed origin (e.g. `http://localhost:5173`) |
| `API_BASE_URL` | Used to construct file URLs (e.g. `http://localhost:8000`) |

### Optional Integrations

| Variable | Purpose | Fails Gracefully? |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Road routing for patrol plans | ✅ Returns Haversine distance fallback |
| `AI_API_KEY` | Gemini AI patrol recommendations and report summaries | ✅ Uses deterministic hotspot-ranking fallback |
| `TWILIO_ACCOUNT_SID` | Twilio SMS service | ✅ Logs "SMS skipped" and continues |
| `TWILIO_AUTH_TOKEN` | Twilio SMS service | ✅ Same as above |
| `TWILIO_PHONE_NUMBER` | Twilio SMS service | ✅ Same as above |
| `ADMIN_NAME` | Seed script admin name | — Only used by seed scripts |
| `ADMIN_EMAIL` | Seed script admin email | — Only used by seed scripts |
| `ADMIN_PASSWORD` | Seed script admin password | — Only used by seed scripts |

---

## Postman Collection

A Postman collection at `docs/postman/Smart-Police.postman_collection.json` is **NOT CREATED** in this documentation run. Import the endpoints manually using the variables below:

**Recommended Postman Environment Variables:**

| Variable | Example Value |
|---|---|
| `baseUrl` | `http://localhost:8000/api` |
| `adminToken` | *(set after admin login)* |
| `citizenToken` | *(set after citizen login)* |
| `policeToken` | *(set after officer login)* |
| `stationId` | *(set after station creation)* |
| `officerId` | *(PoliceOfficer ObjectId)* |
| `officerUserId` | *(User ObjectId of officer)* |
| `complaintId` | *(set after complaint creation)* |
| `firId` | *(set after FIR registration)* |
| `sosId` | *(set after SOS trigger)* |
| `patrolId` | *(set after patrol generation)* |
| `announcementId` | *(set after announcement creation)* |

---

## Documentation Summary

| Category | Count |
|---|---|
| **Total HTTP endpoints documented** | 40 |
| **Not Implemented endpoints** | 3 (`POST /api/auth/change-password`, `loginId`-based login, Officer password reset) |
| **Total Socket.IO events documented** | 7 (1 Client→Server, 6 Server→Client) |
| **Postman collection created** | No |
| **External credentials needed for full functionality** | `GOOGLE_MAPS_API_KEY`, `AI_API_KEY`, `TWILIO_*` |
| **Backend works without external credentials** | ✅ Yes — all external services have fallbacks |
| **Known limitations** | `mustChangePassword` / `loginId` / `change-password` flow is schema-only; not yet wired in controllers. Officer `/status` and `/location` routes take User ObjectId as `:id` parameter (not PoliceOfficer ObjectId) — document this carefully in Postman. |
