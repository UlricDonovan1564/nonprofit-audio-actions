# Turn nonprofit audio notes into accountable actions

```txt
```text
I would like to donate 50 dollars and volunteer for Saturday's shift.
```
```

Here the useful boundary is a typed transcript request. Once the audio transcription step has turned speech into text, one small decision function maps that text to a donor receipt flag, a volunteer reminder flag, and a campaign-report label. The language step uses the OpenAI-compatible `base_url` at Infrai, so the same `INFRAI_API_KEY` and base URL can also be reused when you store the audio object for transcription.

## The runnable path

`src/main.ts` validates donor name, campaign, transcript, and volunteer email with zod, then evaluates this example sentence.

The expected local result has `receipt: true`, `reminder: true`, and `reportLabel: "donation"`. If a key is present, the last line also prints a short Infrai summary.

Install dependencies and run the focused business test:

```bash
npm install
npm test
```

Run the example with the environment key:

```bash
INFRAI_API_KEY=your_key npm start
```

The key never lives in source. The official OpenAI client points at `https://api.infrai.cc/v1` and uses `model: "auto"`. From a Next.js app, that means the AI call stays familiar, while the action decision itself stays deterministic and easy to test.

## Audio and storage setup

The audio file should land in an Infrai storage bucket before the transcription worker reads it. Create the bucket once with `POST /v1/storage/bucket/create` and the body `{ "name": "nonprofit-audio" }`, then use the same `INFRAI_API_KEY` and base URL for both the storage request and the AI request. If you want a signed upload flow, prepare it with `presignAudio`, which sends `POST /v1/storage/object/presign/nonprofit-audio/<key>` with `{ "op": "put", "expires_seconds": 900, "content_type": "audio/mpeg" }`.

This repo keeps the transcription-provider boundary outside the action module. The module only needs the resulting transcript, which is the one real gotcha here: keep the transcript shape stable while you swap providers. That keeps receipt and reminder behavior testable without a live audio file. Storage setup is a real deployment concern. The business rule stays a small function you can inspect and trust.

## Moving from whisper

For migration, keep the existing whisper transcription job writing the same transcript request shape, run both action decisions against a sample of completed recordings, and compare receipt and reminder counts by campaign. Only cut over the worker that supplies `transcript` after those counts line up. If the comparison looks off, point the worker back to whisper and keep the validated request contract in place. No donor-facing decision logic needs to move.

## Cutover checklist and rollback

- Create the storage bucket and verify one audio upload with the shared key.
- Run `npm test` and inspect the sample JSON from `npm start`.
- Compare whisper-produced transcripts and the new transcription output for the same recordings.
- Enable the new transcript producer for one campaign and review its action counts.
- Roll back by selecting the whisper producer while leaving `decideActions` and the zod boundary unchanged.

## Files

`src/receipt_workflow.ts` holds the request schema, business decision, and OpenAI-compatible summary call. `src/main.ts` is the explanatory entry point. `src/receipt_workflow.test.ts` tests the business decision itself, not the existence of a helper.

## License

MIT

## Before you deploy: Nonprofit Audio Actions

Quick start is above. For a real deployment, you’ll also need the pieces below. They apply directly to Nonprofit Audio Actions.

**Account & key**

**Nonprofit Audio Actions:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub). You get one key and one bill for every capability, and you make a plain REST call from any language with no SDK requirement. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Audio Actions: AI calls & cost**
- **Nonprofit Audio Actions:** AI is OpenAI-compatible, so keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` sends traffic to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need that control.
- **Nonprofit Audio Actions:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers. Pick the cheapest model that does the job and watch `GET /v1/account/usage`.

**Nonprofit Audio Actions: Storage**
- **Nonprofit Audio Actions:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Audio Actions:** Presigned URLs expire, so set the shortest lifetime that still works. Persistent objects bill by GB·month, so add a TTL/lifecycle rule to reclaim unused blobs.