import express from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import {
  triggerAlert,
  updateAlertLocation,
  updateAlertStatus,
} from "../controllers/alert.controller.js";

const router = express.Router();

router.post("/trigger", protect, triggerAlert);
router.patch("/:id/location-update", protect, updateAlertLocation);
router.patch("/:id/status", protect, restrictTo("admin"), updateAlertStatus);

export default router;
