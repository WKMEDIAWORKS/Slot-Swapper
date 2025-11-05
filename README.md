# SlotSwapper - A Peer-to-Peer Time Slot Swapping App

**SlotSwapper** is a full-stack web application that allows users to manage their personal events and swap time slots with other users.  
It simulates a collaborative scheduling system where users can mark busy slots as swappable, view other users' available swap slots, and request a mutual exchange.

---

## Tech Stack

| **Layer** | **Technology** |
|------------|----------------|
| Frontend | EJS Templates (HTML, CSS, JS) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT (JSON Web Token) with Cookies |
| Deployment | Railway (Backend), Neon.tech (PostgreSQL Cloud) |

---

## Core Idea

Each user has a personal calendar of events.  
Events can be marked as **swappable**, allowing users to exchange time slots with others.

---

## Key Design Choices

- **JWT + Cookies**: For secure and persistent authentication across sessions.  
- **Status-based Event System**: Each event has a status (`BUSY`, `SWAPPABLE`, `SWAP_PENDING`).  
- **Transaction-based Swap Logic**: Database transactions ensure proper swap operations.  
- **EJS Views**: Simple and server-rendered, making it easy to maintain.  
- **Neon + Railway**: Cloud database and hosting stack for seamless deployment.

---

## Local Setup Instructions

### 1. Clone the Repository

git clone https://github.com/WKMEDIAWORKS/Slot-Swapper.git

### 2. Navigate into the Project

cd Slot-Swapper

### 3. Install Dependencies

npm install

### 4. Set Up Environment Variables

Create a .env file in the root directory and add: 

DATABASE_URL=<your_neon_connection_string>
JWT_SECRET=your_secret_key
NODE_ENV=development

## Create PostgreSQL Tables

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'BUSY' CHECK (status IN ('BUSY', 'SWAPPABLE', 'SWAP_PENDING')),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE swap_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    my_slot_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    their_slot_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## Start the Application

node server.js

**Now open your browser and visit: http://localhost:3000

## API Endpoints Summary

| **Method** | **Endpoint** | **Description** |
|------------|----------------|---------------|
| POST | submit-register | Register a new user |
| POST | /submit-login | Login and generate a JWT token |
| GET | / | Load user dashboard |
| POST | /api/events/:id/make-swappable | Mark an event as swappable |
| GET | /api/swappable-spots | Fetch all swappable events from other users |
| POST | /submit-event | Add an event |
| POST | /api/request-swap | Initiate a swap request |
| POST | /api/swap-response/:id | Accept or reject a swap request |
| GET | /requests | View incoming and outgoing swap requests |

---

## Challenges Faced

- Handling JWT cookies in both local (HTTP) and production (HTTPS) environments.
- Managing foreign key relationships between multiple PostgreSQL tables.


## Live App

https://slot-swapper-production.up.railway.app/


