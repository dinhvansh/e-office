import { Router } from "express";
import { auditRouter } from "../modules/audit/audit.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { documentsRouter } from "../modules/documents/documents.routes";
import { signersRouter } from "../modules/signers/signers.routes";
import { signRequestsRouter } from "../modules/signRequests/signRequests.routes";
import { tenantsRouter } from "../modules/tenants/tenants.routes";
import { webhooksRouter } from "../modules/webhooks/webhooks.routes";
import departmentsRouter from "../modules/departments/departments.routes";
import rolesRouter from "../modules/roles/roles.routes";
import usersRouter from "../modules/users/users.routes";
import documentTypesRouter from "../modules/documentTypes/documentTypes.routes";
import numberingRouter from "../modules/numbering/numbering.routes";

export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/tenants", tenantsRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/departments", departmentsRouter);
v1Router.use("/roles", rolesRouter);
v1Router.use("/document-types", documentTypesRouter);
v1Router.use("/numbering-rules", numberingRouter);
v1Router.use("/documents", documentsRouter);
v1Router.use("/sign-requests", signRequestsRouter);
v1Router.use("/signers", signersRouter);
v1Router.use("/audit", auditRouter);
v1Router.use("/webhooks", webhooksRouter);
