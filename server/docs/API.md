# Smart Police Station — API Contract Documentation

This document defines the complete backend API endpoints, payload bodies, and responses. All APIs are prefixed with `/api`.

---

## 1. Authentication

### Register Citizen
- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@gmail.com",
    "phone": "9876543210",
    "password": "password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Citizen registered successfully",
    "data": {
      "user": {
        "_id": "64fb...",
        "name": "John Doe",
        "email": "john.doe@gmail.com",
        "phone": "9876543210",
        "role": "CITIZEN",
        "status": "ACTIVE"
      }
    }
  }
  ```

### Login
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "email": "john.doe@gmail.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "data": {
      "user": {
        "_id": "64fb...",
        "name": "John Doe",
        "email": "john.doe@gmail.com",
        "role": "CITIZEN",
        "status": "ACTIVE"
      },
      "accessToken": "eyJhbG..."
    }
  }
  ```
  *(A HTTP-Only refresh token cookie is set automatically with the key `refreshToken`)*

### Get Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Authentication:** Access Token (Bearer or Cookie)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User profile fetched successfully",
    "data": {
      "user": { ... }
    }
  }
  ```

---

## 2. Stations

### Create Station
- **Method:** `POST`
- **Endpoint:** `/api/stations`
- **Authentication:** Access Token
- **Allowed Roles:** `CONTROL_ROOM_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "Kothrud Police Station",
    "stationCode": "KOT-PN",
    "address": "Kothrud Depot Road, Pune",
    "phone": "020-25443311",
    "location": {
      "latitude": 18.5074,
      "longitude": 73.8077
    }
  }
  ```

### List Stations
- **Method:** `GET`
- **Endpoint:** `/api/stations`
- **Authentication:** Access Token
- **Response (200 OK):** returns all police stations.

---

## 3. Officers

### Create Officer Profile
- **Method:** `POST`
- **Endpoint:** `/api/officers`
- **Authentication:** Access Token
- **Allowed Roles:** `CONTROL_ROOM_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "Amit Shinde",
    "email": "amit.shinde@smartpolice.local",
    "phone": "9876543211",
    "password": "password123",
    "badgeNumber": "BADGE002",
    "rank": "SUB_INSPECTOR",
    "role": "INVESTIGATING_OFFICER",
    "stationId": "64fb..."
  }
  ```

### Update Officer Location
- **Method:** `PATCH`
- **Endpoint:** `/api/officers/:id/location`
- **Authentication:** Access Token
- **Request Body:**
  ```json
  {
    "latitude": 18.5098,
    "longitude": 73.8112
  }
  ```

---

## 4. Complaints

### Submit Complaint
- **Method:** `POST`
- **Endpoint:** `/api/complaints`
- **Authentication:** Access Token
- **Allowed Roles:** `CITIZEN`
- **Request Body:**
  ```json
  {
    "title": "Bike Theft",
    "description": "My motorcycle was stolen from the parking lot.",
    "latitude": 18.5050,
    "longitude": 73.8090,
    "address": "Kothrud Parking, Pune",
    "crimeType": "THEFT"
  }
  ```
  *(Automatically routes to the nearest police station via Haversine calculations)*

### Upload Evidence
- **Method:** `POST`
- **Endpoint:** `/api/complaints/:id/evidence`
- **Authentication:** Access Token
- **Form Data:**
  - File under key `evidence`
- **Response (200 OK):** Returns updated complaint schema with uploaded evidence URL.

---

## 5. SOS (Emergency Alerts)

### Trigger SOS
- **Method:** `POST`
- **Endpoint:** `/api/sos`
- **Authentication:** Optional (Supports anonymous citizen/guest triggering)
- **Request Body:**
  ```json
  {
    "latitude": 18.5085,
    "longitude": 73.8115,
    "address": "Ideal Colony Metro Stop"
  }
  ```
  *(Instantly sends a `sos:new` alert to the Control Room and nearest Station Head)*

---

## 6. Dashboards

- Admin: `/api/dashboard/admin`
- Station Head: `/api/dashboard/station`
- Officer: `/api/dashboard/officer`
- Citizen: `/api/dashboard/citizen`

All dashboard endpoints return specialized summaries tailored to user authorization privileges to improve frontend rendering speeds.
