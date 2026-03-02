import { Router, Request, Response } from "express";
import { identifyContact } from "../services/contact.service.js";

export const identifyRouter = Router();

identifyRouter.post("/", async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  const emailVal = email ? String(email) : null;
  const phoneVal = phoneNumber ? String(phoneNumber) : null;

  if (!emailVal && !phoneVal) {
    res.status(400).json({
      error: "At least one of email or phoneNumber must be provided",
    });
    return;
  }

  try {
    const result = await identifyContact(emailVal, phoneVal);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error in /identify:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
