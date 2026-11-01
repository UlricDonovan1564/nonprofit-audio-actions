import test from "node:test";
import assert from "node:assert/strict";
import { decideActions, transcriptRequest } from "./receipt_workflow.ts";

test("a transcript containing a gift and a shift creates both actions", () => {
  const request = transcriptRequest.parse({
    donorName: "Mina Chen",
    campaign: "Community Garden",
    transcript: "I can donate and volunteer for the Saturday shift.",
    volunteerEmail: "mina@example.org"
  });
  assert.deepEqual(decideActions(request), {
    receipt: true,
    reminder: true,
    reportLabel: "donation"
  });
});
