import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
const root=path.resolve(__dirname,"..",".."); const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
test("both cancellation entry points delegate to the unified cancellation command",()=>{
 const documentLifecycle=read("src/modules/documents/documentLifecycle.service.ts"); const requestLifecycle=read("src/modules/signRequests/signRequestLifecycle.service.ts"); const shared=read("src/modules/workflows/workflowCancellation.service.ts");
 assert.match(documentLifecycle,/workflowCancellationService\.cancel\(/);
 assert.match(requestLifecycle,/workflowCancellationService\.cancel\(/);
 assert.match(shared,/status: "cancelled"/);
 assert.match(shared,/workflow_instances\.findMany\(\{ where: \{ document_id: document\.id, status: "in_progress"/);
 assert.match(shared,/otp: null, otp_expire: null, signing_token: null/);
 assert.match(shared,/status: \{ in: \["draft", "pending", "waiting_approval", "waiting_signing", "otp_sent"\] \}/);
});
test("cancellation scopes workflow mutation to active runs and preserves historical signers",()=>{
 const shared=read("src/modules/workflows/workflowCancellation.service.ts");
 assert.match(shared,/status: "in_progress"/);
 assert.match(shared,/runIds/);
 assert.doesNotMatch(shared,/workflow_instances\.delete/);
 assert.doesNotMatch(shared,/status: \{ in: \["signed", "completed"\] \}/);
});
