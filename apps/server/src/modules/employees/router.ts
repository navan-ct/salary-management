import { Router } from "express";

export function createEmployeesRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ employees: [] });
  });

  return router;
}
