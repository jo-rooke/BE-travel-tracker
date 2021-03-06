import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
// import calcTripLength from "utils/calcTripLength";

config();
const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://right-track.netlify.app",
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

app.use(express.json()); //add body parser to each following route handler
// app.use(cors()); //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.get("/", async (req, res) => {
  const dbres = await client.query("select * from categories");
  res.json(dbres.rows);
});

app.get("/users", async (req, res) => {
  const dbres = await client.query("select * from users");
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.get("/contacts/trips/:tripId", async (req, res) => {
  const { tripId } = req.params;
  const dbres = await client.query(
    "select name, email from contacts join trip_contacts on trip_contacts.contact = contacts.id where trip_contacts.trip = $1",
    [tripId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.get("/contacts/:userId", async (req, res) => {
  const { userId } = req.params;
  const dbres = await client.query(
    "select * from contacts where contacts.contact_of = $1",
    [userId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.post("/contacts/:userId", async (req, res) => {
  const { userId } = req.params;
  const { contactName, contactEmail } = req.body;
  const dbres = await client.query(
    "INSERT INTO contacts (contact_of, name, email, activated) values ($1, $2, $3, true) returning * ",
    [userId, contactName, contactEmail]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.put("/contacts/:contactId", async (req, res) => {
  const { contactId } = req.params;
  const dbres = await client.query(
    "UPDATE contacts SET activated = not activated WHERE id = $1 RETURNING *",
    [contactId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.delete("/contacts/:contactId", async (req, res) => {
  const { contactId } = req.params;
  const dbres = await client.query(
    "delete from contacts WHERE id = $1 returning *",
    [contactId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.get("/trips/:userId", async (req, res) => {
  const { userId } = req.params;
  const tripNames = await client.query(
    "select id, name from trips where user_id = $1 ",
    [userId]
  );
  for (let i = 0; i < tripNames.rowCount; i++) {
    const trip = tripNames.rows[i];
    const stopCount = await client.query(
      "SELECT count(*) FROM stops where trip = $1",
      [trip.id]
    );
    trip.stops = stopCount.rows;
    const tripFirstLast = await client.query(
      "(SELECT exp_arrival FROM stops WHERE trip = $1 ORDER BY exp_arrival ASC LIMIT 1) UNION ALL (SELECT exp_departure FROM stops WHERE trip = $1 ORDER BY exp_departure DESC LIMIT 1)",
      [trip.id]
    );
    trip.dateRange = tripFirstLast.rows;
    const contacts = await client.query(
      "Select name, activated from contacts join trip_contacts on contacts.id = trip_contacts.contact where trip_contacts.trip = $1",
      [trip.id]
    );
    trip.contacts = contacts.rows;
  }

  res.json({
    status: "success",
    data: tripNames.rows,
  });
});

app.post("/trips/:userId", async (req, res) => {
  const { userId } = req.params;
  const { tripName, contactIds } = req.body;
  const createTrip = await client.query(
    "insert into trips (user_id, name) values ($1, $2) returning *",
    [userId, tripName]
  );
  createTrip.rows[0].contacts = [];
  for (let contact of contactIds) {
    const createContacts = await client.query(
      "insert into trip_contacts (trip, contact) values ($1, $2) returning *",
      [createTrip.rows[0].id, contact]
    );
    createTrip.rows[0].contacts.push(createContacts.rows[0]);
  }
  res.json({
    status: "success",
    data: createTrip.rows,
  });
});

app.put("/stops/departure/:stopId", async (req, res) => {
  const { stopId } = req.params;
  const dbres = await client.query(
    "UPDATE stops SET actual_departure = current_timestamp WHERE id = $1 RETURNING *",
    [stopId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.put("/stops/arrived/:stopId", async (req, res) => {
  const { stopId } = req.params;
  const dbres = await client.query(
    "UPDATE stops SET actual_arrival = current_timestamp WHERE id = $1 RETURNING *",
    [stopId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.delete("/stops/:stopId", async (req, res) => {
  const { stopId } = req.params;
  const deleteDependents = await client.query(
    " DELETE FROM trip_companions WHERE stop = $1",
    [stopId]
  );
  const dbres = await client.query(
    "DELETE FROM stops WHERE id = $1 RETURNING *",
    [stopId]
  );
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

app.get("/stops/:tripId", async (req, res) => {
  const { tripId } = req.params;
  const stops = await client.query(
    " SELECT * from stops where stops.trip = $1 ORDER BY exp_arrival ASC ",
    [tripId]
  );
  for (let stop of stops.rows) {
    const companions = await client.query(
      "SELECT name, contact from trip_companions where trip_companions.stop = $1",
      [stop.id]
    );
    stop.companions = companions.rows;
  }
  res.json({
    status: "success",
    data: stops.rows,
  });
});

app.post("/stops/:tripId", async (req, res) => {
  const { tripId } = req.params;
  const {
    stopName,
    stopLink,
    stopArrival,
    stopDeparture,
    stopEmail,
    stopPhone,
    stopDetails,
    companions,
  } = req.body;
  const createStop = await client.query(
    "INSERT INTO stops (trip, name, location_link, exp_arrival, exp_departure, actual_arrival, actual_departure, best_email, best_phone, details) values ($1, $2, $3, $4, $5, null, null, $6, $7, $8) RETURNING *",
    [
      tripId,
      stopName,
      stopLink,
      stopArrival,
      stopDeparture,
      stopEmail,
      stopPhone,
      stopDetails,
    ]
  );
  for (let companion of companions) {
    const addCompanions = await client.query(
      "insert into trip_companions (stop, name, contact) values ($1, $2, $3) returning *",
      [createStop.rows[0].id, companion.name, companion.contact]
    );
    createStop.rows[0].companions = [...companions, addCompanions.rows[0]];
  }
  res.json({
    status: "success",
    data: createStop.rows,
  });
});

app.get("/lastseen/:userId", async (req, res) => {
  const { userId } = req.params;
  const lastArrived = await client.query(
    " SELECT contacts.email as contact_email, users.name as from_name, contacts.name as to_name, stops.name as stop_name, stops.location_link as stop_location_link, stops.actual_arrival as stop_last_seen, stops.best_phone as stop_phone, stops.best_email as stop_email, trips.name as trip_name FROM trips INNER JOIN stops on trips.id = stops.trip INNER JOIN users on trips.user_id = users.id INNER JOIN contacts on contacts.contact_of = users.id where users.id = $1 AND contacts.activated = true AND stops.actual_arrival = (SELECT MAX (actual_arrival) FROM stops);",
    [userId]
  );
  lastArrived.rows[0].arr_or_dep = "arrived at";
  const lastDeparted = await client.query(
    " SELECT contacts.email as contact_email, users.name as from_name, contacts.name as to_name, stops.name as stop_name, stops.location_link as stop_location_link, stops.actual_departure as stop_last_seen, stops.best_phone as stop_phone, stops.best_email as stop_email, trips.name as trip_name FROM trips INNER JOIN stops on trips.id = stops.trip INNER JOIN users on trips.user_id = users.id INNER JOIN contacts on contacts.contact_of = users.id where users.id = $1 AND contacts.activated = true AND stops.actual_departure = (SELECT MAX (actual_departure) FROM stops);",
    [userId]
  );
  lastDeparted.rows[0].arr_or_dep = "departed from";
  let dbres =
    lastArrived.rows[0].stop_last_seen.getTime() >=
    lastDeparted.rows[0].stop_last_seen.getTime()
      ? lastArrived
      : lastDeparted;
  res.json({
    status: "success",
    data: dbres.rows,
  });
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
