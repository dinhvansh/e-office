import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
const root=path.resolve(__dirname,"..",".."); const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
test("archive lifecycle preserves history, excludes operational queries, and restores to cancelled",()=>{
 const docs=read("src/modules/documents/documents.service.ts"), lifecycle=read("src/modules/documents/documentLifecycle.service.ts"), repo=read("src/modules/documents/documents.repository.ts"), signs=read("src/modules/signRequests/signRequests.repository.ts"), approvals=read("src/modules/approvals/approvals.repository.ts"), routes=read("src/modules/archive/archive.routes.ts");
 assert.match(docs,/hasWorkflowHistory/); assert.match(docs,/documentLifecycleService\.archive/);
 assert.match(lifecycle,/status: "archived"/); assert.match(lifecycle,/DOCUMENT_ARCHIVED/); assert.match(lifecycle,/status: "cancelled"/); assert.match(lifecycle,/DOCUMENT_RESTORED/);
 assert.match(repo,/status: \{ not: 'archived' \}/); assert.match(signs,/status: \{ not: "archived" \}/); assert.match(approvals,/status: 'pending_approval'/);
 assert.match(routes,/requirePermission\("archive", "view"\)/); assert.match(routes,/requirePermission\("archive", "restore"\)/); assert.doesNotMatch(routes,/delete_permanently/);
});
