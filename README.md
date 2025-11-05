# SlotSwapper - A Peer-to-Peer Time Slot Swapping App

SlotSwapper is a full-stack web application that allows users to manage their personal events and swap time slots with other users.  
It simulates a collaborative scheduling system where users can mark busy slots as swappable, view other users' available swap slots, and request a mutual exchange.

---

## Tech Stack

| Layer | Technology |
|:------|:------------|
| Frontend | EJS Templates (HTML, CSS, JS) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT (JSON Web Token) with Cookies |
| Deployment | Railway (Backend), Neon.tech (PostgreSQL Cloud) |

---

## Core Idea

Each user has a personal calendar of events. Events can be marked as swappable, allowing users to exchange time slots with others.

---

## Key Design Choices

- JWT + Cookies: For secure and persistent authentication across sessions.  
- Status-based Event System: Each event has a status (`BUSY`, `SWAPPABLE`, `SWAP_PENDING`).  
- Transaction-based Swap Logic: Database transactions ensure proper swap operations.  
- EJS Views: Simple and server-rendered, making it easy to maintain.  
- Neon and Railway: Cloud database and hosting stack for deployment.

---

## Local Setup Instructions

### Clone the repository
```bash
git clone https://github.com/WKMEDIAWORKS/Slot-Swapper.git

