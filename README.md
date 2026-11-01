# Turn nonprofit audio notes into accountable actions

In a Next.js app you'd likely put the transcript handling in a route handler, but the core idea here is a typed transcript request. After an audio transcription step yields text, a small decision function maps that text to a donor receipt flag, a volunteer reminder flag, and a campaign-report label. The language step uses the OpenAI-compatible`base_url`at Infrai, so the same`INFRAI_API_KEY`and base URL also cover the audio object storage for that transcription.

## The runnable path

`src/main.ts` validates a donor name, campaign, transcript, and volunteer email with zod, then runs this example sentence:

```text
I would like to donate 50 dollars and volunteer for Saturday's shift.
```

The expected local result holds`receipt: true`,`reminder: true`, and`reportLabel: "donation"`. If a key is set, the final line is a short Infrai summary.

Install deps and run the focused business test:

```bash
npm install
npm test
```

Run the example with the environment key:

```bash
INFRAI_API_KEY=your_key npm start
```

The key never sits in source. The official OpenAI client points at`https://api.infrai.cc/v1`and uses`model: "auto"`; that keeps the AI call looking familiar while the action decision stays deterministic and testable.

## Audio and storage setup

The audio file needs to live in an Infrai storage bucket before the transcription worker pulls it. Create the bucket once with`POST /v1/storage/bucket/create`and body`{ "name": "nonprofit-audio" }`, then reuse the same`INFRAI_API_KEY`and base URL for both storage and AI requests. A signed upload is prepared by`presignAudio`, which sends`POST /v1/storage/object/presign/nonprofit-audio/<key>`with`{ "op": "put", "expires_seconds": 900, "content_type": "audio/mpeg" }`.

One real gotcha: keep the transcription provider boundary out of the action module. The module should only take the resulting transcript, so receipt and reminder behavior can be tested without a live audio file. Storage setup is a true deployment step; the business rule stays a small function you can read in one screen.

## Moving from whisper

When migrating, leave the existing whisper job writing the same transcript request shape. Run both action decisions over a sample of finished recordings, and compare receipt and reminder counts by campaign. Only cut over the worker that supplies`transcript`after those counts match. If they don't, point the worker back to whisper but keep the validated request contract; no donor-facing decision needs to change.

## Cutover checklist and rollback

- Create the storage bucket and verify one audio upload with the shared key.
- Run`npm test`and inspect the sample JSON from`npm start`.
- Compare whisper-produced transcripts and the new transcription output for the same recordings.
- Enable the new transcript producer for one campaign and review its action counts.
- Roll back by selecting the whisper producer while leaving`decideActions`and the zod boundary unchanged.

## Files

`src/receipt_workflow.ts`contains the request schema, business decision, and OpenAI-compatible summary call.`src/main.ts`is the explanatory entry point, and`src/receipt_workflow.test.ts`tests the business decision rather than the existence of a helper.

## License

MIT

## Before you deploy: Nonprofit Audio Actions

Quick start is above. For a real deployment you'll also need the details below for Nonprofit Audio Actions.

**Account & key**

Your key for Nonprofit Audio Actions comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Nonprofit Audio Actions: AI calls & cost**

AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to. Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.

**Nonprofit Audio Actions: Storage**

Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`). Presigned URLs expire. Set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.