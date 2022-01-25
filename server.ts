import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

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

app.get("/contacts/stops/:stopId", async (req, res) => {
  const { stopId } = req.params;
  const dbres = await client.query(
    "select name, email from contacts join trip_contacts on trip_contacts.contact = contacts.id where trip_contacts.stop = $1",
    [stopId]
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
  const dbres = await client.query("delete from contacts WHERE id = $1", [
    contactId,
  ]);
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
