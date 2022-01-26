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

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

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
  // interface ITripLength {
  //   exp_time: string;
  // }
  // function calcTripLength(startAndEnd: ITripLength[]) {
  //   const start = startAndEnd[0].exp_time;
  //   const end = startAndEnd[1].exp_time;
  //   const startDate = start.slice(0, 10).split("-");
  //   const endDate = end.slice(0, 10).split("-");
  //   console.log(start, end, startAndEnd);
  //   return `${startDate} - ${endDate}`;
  // }
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
      "Select name from contacts join trip_contacts on contacts.id = trip_contacts.trip where trip_contacts.trip = $1",
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
    companionName,
    companionContact,
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
  const addCompanions = await client.query(
    "insert into trip_companions (stop, name, contact) values ($1, $2, $3) returning *",
    [createStop.rows[0].id, companionName, companionContact]
  );
  createStop.rows[0].companions = addCompanions.rows;
  res.json({
    status: "success",
    data: createStop.rows,
  });
});

app.get("/lastSeen/:userId", async (req, res) => {
  const { userId } = req.params;
  const lastArrived = await client.query(
    "SELECT * FROM stops join trips on stops.trip = trips.id where trips.user_id = $1 AND stops.actual_arrival = (SELECT MAX (actual_arrival) FROM stops );",
    [userId]
  );
  const lastDeparted = await client.query(
    "SELECT * FROM stops join trips on stops.trip = trips.id where trips.user_id = $1 AND stops.actual_departure= (SELECT MAX (actual_arrival) FROM stops );",
    [userId]
  );
  let dbres =
    lastArrived.rows[0] >= lastDeparted.rows[0] ? lastArrived : lastDeparted;
  res.json({
    status: "success",
    data: lastArrived.rows,
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
