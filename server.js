import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const saltRounds = 10;
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));
app.use(cookieParser());



const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

db.connect();


app.set("views", "./public/views");
app.set("view engine", "ejs");

function generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  }

  function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const tokenFromHeader = authHeader && authHeader.split(" ")[1];
    const token = tokenFromHeader || req.cookies.token;

    if(!token) {
        return res.redirect("/register");
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).send("Invalid token");
      req.user = decoded;
      next();
    });
  }
  

app.get("/", verifyToken, async (req, res) => {
    try{
        const userId = req.user.id;
        const result = await db.query("SELECT * FROM events WHERE user_id = $1 ORDER BY start_time",
            [userId]
        );
        res.render("index", { events: result.rows } );
    }
    catch(err) {
        console.log(err);
        res.send("Error loading dashboard");
    }
});

app.get("/register", (req, res) => {
    res.sendFile(__dirname+"/public/register.html");
});
app.post("/submit-register", async (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const data = await db.query("SELECT * FROM users WHERE email = $1",
        [email]
    );
    if(data.rows.length > 0) {
        res.redirect("/login");
    }
    else {
        try {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if(err) {
                    console.log("Error while hashing: ", err);
                }
                else {
                    const result =   await db.query(
                        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
                        [name, email, hash]
                    );
                    res.redirect("/login");
                }
            }); 
        }
        catch(err)  {
            console.log(err);
        }
    }
});

app.get("/login", (req, res) => {
    res.sendFile(__dirname+"/public/login.html");
});

app.post("/submit-login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const user = await db.query("SELECT * FROM users WHERE email = $1",
        [email]
    );
    if(user.rows.length === 0) {
        res.redirect("/register");
    }
    else {
        const userHash = user.rows[0].password;
        bcrypt.compare(password, userHash, (err, result) => {
            if(err) {
                res.send("Something went wrong");
            }
            if(result) {
                const token = generateToken(user.rows[0]);

                res
                .cookie("token", token, {
                            httpOnly: true, 
                            secure: process.env.NODE_ENV === "production",
                            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                            maxAge: 7 * 24 * 60 * 60 * 1000, 
                   })
                .redirect("/");
            }
            else {
                res.send("Incorrect passsword");
            }
        });
    }
});

app.get("/add-event", (req, res) => {
    res.sendFile(__dirname+"/public/add-event.html");
});

app.post("/submit-event", verifyToken, async (req, res) => {
    const title = req.body.title;
    const date = req.body.date;
    const startTime = req.body.start_time;
    const endTime = req.body.end_time;
    const userId =  req.user.id;
    console.log(userId);

    const startTimestamp = new Date(`${date}T${startTime}`);
    const endTimestamp = new Date(`${date}T${endTime}`);

    try {
        await db.query("INSERT INTO events (title, start_time, end_time,  user_id) VALUES ($1, $2, $3, $4)",
            [title, startTimestamp, endTimestamp, userId]
        );
        res.redirect("/");
    }
    catch(err) {
        console.log(err);
        res.send("Error while adding event.");
    }

});

app.post("/api/events/:id/make-swappable", verifyToken, async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.id;

    try {
        const result = await db.query("UPDATE events SET STATUS = 'SWAPPABLE' WHERE id = $1 AND user_id = $2",
            [eventId, userId]
        );
        res.redirect("/");
    }
    catch(err) {
        console.log(err);
        res.send("Error while updating the event status");
    }

});

app.get("/api/swappable-spots", verifyToken, async (req, res) => {
    try {
        const events = await db.query(`
            SELECT 
              e.id,
              e.title,
              e.start_time,
              e.end_time,
              e.status,
              u.name AS name
            FROM events e
            JOIN users u ON e.user_id = u.id
            WHERE e.status = 'SWAPPABLE'
            AND e.user_id != $1
            ORDER BY e.start_time;
          `, [req.user.id]);
        res.render("marketplace", { events: events.rows });

    }
    catch(err) {
        console.log(err);
    }
});

app.post("/api/swap-request", verifyToken, async(req, res) => {
    const theirSlotId = req.body.theirSlotId;
    try {
        const events = await db.query("SELECT * FROM events WHERE user_id = $1 AND status = 'SWAPPABLE'",
            [ req.user.id ]
        );
        console.log(`their slot id: ${theirSlotId}`);
        res.render("choose-slots", { myEvents: events.rows, theirSlotId });
    }
    catch(err) {
        console.log(err);
        res.send("Error while loading your swappable events");
    }
});

app.post("/api/request-swap", verifyToken, async(req, res) => {
    const mySlotId = req.body.mySlotId;
    const theirSlotId = req.body.theirSlotId;

    const requesterId = req.user.id;
    console.log(`my slot id: ${mySlotId}`);
    console.log(`their slot id: ${theirSlotId}`);
    console.log(`requester id: ${requesterId}`);

    try {
        const mySlot = await db.query("SELECT * FROM events WHERE id = $1 AND user_id = $2",
            [mySlotId, requesterId]
        );
        if(mySlot.rows.length === 0) {
            return res.status(400).send("You don't own this slot.");
        }

        const theirSlot = await db.query("SELECT * FROM events WHERE id = $1",
            [theirSlotId]
        );

        if(theirSlot.rows.length === 0) {
            return res.status(404).send("The requested slot doesn't exist.");
        }

        const theirSlotOwner = theirSlot.rows[0].user_id;

        if(theirSlotOwner === requesterId) {
            return res.status(400).send("You can't swap with yourself.");
        }

        if(mySlot.rows[0].status !== "SWAPPABLE" || theirSlot.rows[0].status !== "SWAPPABLE") {
            return res.status(400).send("One of the slots is not available for swap");
        }

        await db.query("INSERT INTO swap_requests (requester_id, receiver_id, my_slot_id, their_slot_id) VALUES ($1, $2, $3, $4)",
            [requesterId, theirSlotOwner, mySlotId, theirSlotId]
        );

        await db.query("UPDATE events SET status = 'SWAP_PENDING' WHERE id IN ($1, $2)",
            [mySlotId, theirSlotId]
        );
        console.log(`Slot requested created by the user ${requesterId}`);
        res.redirect("/requests");
    }
    catch(err) {
        console.log(err);
        res.status(500).send("Error creating swap request");
    }
});

app.get("/requests", verifyToken, async (req, res) => {
    const userId = req.user.id;
  
    try {
      const incoming = await db.query(`
        SELECT sr.id, u.name AS requester_name, 
               e1.title AS their_slot, 
               e2.title AS your_slot,
               sr.status
        FROM swap_requests sr
        JOIN users u ON sr.requester_id = u.id
        JOIN events e1 ON sr.my_slot_id = e1.id
        JOIN events e2 ON sr.their_slot_id = e2.id
        WHERE sr.receiver_id = $1
        ORDER BY sr.created_at DESC
      `, [userId]);
  
      const outgoing = await db.query(`
        SELECT sr.id, u.name AS receiver_name, 
               e1.title AS your_slot, 
               e2.title AS their_slot,
               sr.status
        FROM swap_requests sr
        JOIN users u ON sr.receiver_id = u.id
        JOIN events e1 ON sr.my_slot_id = e1.id
        JOIN events e2 ON sr.their_slot_id = e2.id
        WHERE sr.requester_id = $1
        ORDER BY sr.created_at DESC
      `, [userId]);
  
      res.render("requests", {
        incoming: incoming.rows,
        outgoing: outgoing.rows
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error loading requests");
    }
  });

  app.post("/api/swap-response/:id", verifyToken, async (req, res) => {
    const { accepted } = req.body;
    const requestId = req.params.id;
    const userId = req.user.id;
  
    try {
      const { rows } = await db.query("SELECT * FROM swap_requests WHERE id = $1", [requestId]);
      if (rows.length === 0) {
        return res.status(404).send("Swap request not found.");
      }
  
      const request = rows[0];
  
      if (request.receiver_id !== userId) {
        return res.status(403).send("You are not authorized to respond to this swap.");
      }

      if (accepted === "true") {
        await db.query("BEGIN");
  
        const mySlot = await db.query("SELECT * FROM events WHERE id = $1", [request.my_slot_id]);
        const theirSlot = await db.query("SELECT * FROM events WHERE id = $1", [request.their_slot_id]);
  
        if (mySlot.rows.length === 0 || theirSlot.rows.length === 0) {
          await db.query("ROLLBACK");
          return res.status(404).send("One or both events not found.");
        }
  
        const my = mySlot.rows[0];
        const their = theirSlot.rows[0];
  
        await db.query(
          "UPDATE events SET start_time = $1, end_time = $2, status = 'BUSY' WHERE id = $3",
          [their.start_time, their.end_time, my.id]
        );
  
        await db.query(
          "UPDATE events SET start_time = $1, end_time = $2, status = 'BUSY' WHERE id = $3",
          [my.start_time, my.end_time, their.id]
        );
  
        await db.query("UPDATE swap_requests SET status = 'ACCEPTED' WHERE id = $1", [requestId]);
  
        await db.query("COMMIT");
        console.log(`Swap ${requestId} accepted by user ${userId} (times exchanged)`);
        return res.redirect("/requests");
      }

      await db.query("BEGIN");
  
      await db.query("UPDATE swap_requests SET status = 'REJECTED' WHERE id = $1", [requestId]);
      await db.query(
        "UPDATE events SET status = 'SWAPPABLE' WHERE id = $1 OR id = $2",
        [request.my_slot_id, request.their_slot_id]
      );
  
      await db.query("COMMIT");
      console.log(`Swap ${requestId} rejected by user ${userId}`);
      return res.redirect("/requests");
  
    } catch (err) {
      console.error(err);
      try {
        await db.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
      res.status(500).send("Error while processing swap response.");
    }
  });  
  
  
  

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});