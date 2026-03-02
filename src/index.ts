import "dotenv/config";
import express from "express";
import { identifyRouter } from "./routes/identify.js";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Bitespeed Identity Reconciliation Service" });
});

app.get("/contacts", async (_req, res) => {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "asc" },
  });
  res.json({ count: contacts.length, contacts });
});

app.use("/identify", identifyRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
