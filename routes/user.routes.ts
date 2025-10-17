import { Router } from "../deps.ts";
import * as ctrl from "../controllers/user.controller.ts";

const router = new Router({ prefix: "/users" });

router
  .get("/", ctrl.getUsers)
  .post("/", ctrl.createUser)
  .get("/:id", ctrl.getUser)
  .put("/:id", ctrl.updateUser)
  .delete("/:id", ctrl.deleteUser);

export default router;
