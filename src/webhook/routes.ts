import { Router, Request, Response } from "express";
import {
  onDiscover,
  onSearch,
  onSelect,
  onInit,
  onConfirm,
  onStatus,
  onCancel,
  onUpdate,
  onRating,
  onRate,
  onSupport,
  onTrack,
  triggerOnStatus,
  triggerOnCancel,
  triggerOnUpdate
} from "./controller";

export const webhookRoutes = () => {
  const router = Router();

  router.post("/discover", onDiscover);
  router.post("/search", onSearch); // compatibility alias
  router.post("/select", onSelect);
  router.post("/init", onInit);
  router.post("/confirm", onConfirm);
  router.post("/status", onStatus);
  router.post("/cancel", onCancel);
  router.post("/update", onUpdate);
  router.post("/rating", onRating);
  router.post("/rate", onRate);
  router.post("/support", onSupport);
  router.post("/track", onTrack);

  // Unsolicited triggering routes
  router.post("/trigger/on_status", triggerOnStatus);
  router.post("/trigger/on_cancel", triggerOnCancel);
  router.post("/trigger/on_update", triggerOnUpdate);

  return router;
};
