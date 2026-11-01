import { decideActions, transcriptRequest, classifyWithInfrai } from "./receipt_workflow.ts";

const input = transcriptRequest.parse({
  donorName: "Mina Chen",
  campaign: "Community Garden",
  transcript: "I would like to donate 50 dollars and volunteer for Saturday's shift.",
  volunteerEmail: "mina@example.org"
});

const actions = decideActions(input);
console.log(JSON.stringify({ input: input.donorName, actions }, null, 2));

if (process.env.INFRAI_API_KEY) {
  console.log(await classifyWithInfrai(input));
} else {
  console.log("Set INFRAI_API_KEY to run the Infrai summary step.");
}
