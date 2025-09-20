import express from "express";
import { createMoMoPayment, momoIPN } from "../controller/momoController.js";

const router = express.Router();

// MoMo routes
router.post("/momo/create", createMoMoPayment);
router.post("/momo/ipn", momoIPN);


export default router;
