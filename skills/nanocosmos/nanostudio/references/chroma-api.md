---
id: chroma-api
audience: customer
category: setup
triggers:
  - chroma api
  - chroma_key
  - automate chroma
  - chroma key api
  - branded outputs api
  - add a brand
  - chroma background upload
  - play a branded output
severity_default: LOW
---

## nanoStudio Chroma — API automation

### When to Use

Someone wants to script a nanoStudio Chroma setup instead of clicking through the Chroma Setup Tool: create the streams, upload backgrounds, switch keying on, tune it, add or drop a brand, or play a branded output on their own page. Everything the setup tool does goes through these calls (see `chroma-onboarding.md` for the tool itself).

### The model

- One **ingest stream** (the green/blue-screen feed) carries a stream option named `chroma_key`.
- Each **brand** (target, output) is a regular nanoStream stream of its own, with its own stream group, ABR renditions, tags and security.
- The `chroma_key` option lists the targets: per target its `streamId`, its `background`, and optionally an overlay (`foreground`).

### Authentication

All bintu calls (`https://bintu.nanocosmos.de`) take the organisation API key in `x-bintu-apikey`, or the token a login returns in `x-bintu-token`. Creating streams and writing options needs a write-capable role; a read-only login can read streams but is refused on `GET /stream/{id}/options`. Keep keys on the server, never in a page.

### 1. Create the ingest stream

```bash
curl -X POST "https://bintu.nanocosmos.de/stream" \
  -H "x-bintu-apikey: $BINTU_API_KEY" -H "content-type: application/json" \
  -d '{"tags":["ingestStream","multichroma","chroma"]}'
```

Keep the returned `id` (the ingest stream id) and `ingest.rtmp.streamname` (the stream key). The encoder publishes to the **studio ingest server**, not to the `ingest.rtmp.url` in the response: as of 2026-10 that is `rtmp://bintu-studio.nanocosmos.de/live` (the Chroma Setup Tool shows the current one).

### 2. Create one stream per brand

```bash
curl -X POST "https://bintu.nanocosmos.de/stream" \
  -H "x-bintu-apikey: $BINTU_API_KEY" -H "content-type: application/json" \
  -d '{"tags":["targetStream1","multichroma"],"transcodes":[{"profile":"vtrans2-1280x720x2000x30"},{"profile":"vtrans2-640x360x400x25"}]}'
```

Repeat per brand (`targetStream2`, `targetStream3`, …). A brand's ABR renditions are set here, on its own stream (profile names: `GET /transcoding_profiles`). The default supports up to 15 targets per ingest; more on request.

### 3. Upload backgrounds and overlays

```bash
curl -X POST "https://studio-api.nanostream.cloud/upload/chromakey/ORG_HASH" \
  -H "x-bintu-apikey: $BINTU_API_KEY" \
  -F "file=@brand_1_1080.mp4"
```

- `ORG_HASH` is the organisation hash: the first five characters of any of its stream names (`XXXXX` in `XXXXX-YYYYY`).
- Backgrounds: MP4, PNG or JPG. Overlays: PNG with transparency. Uploaded once, usable by any number of brands.
- File names are stored in lower case; refer to a file by its name in the next call.

### 4. Switch the chroma key on

```bash
curl -X POST "https://bintu.nanocosmos.de/stream/INGEST_STREAM_ID/options" \
  -H "x-bintu-apikey: $BINTU_API_KEY" -H "content-type: application/json" \
  -d '{
    "name": "chroma_key",
    "options": {
      "color": "#00FF00", "similarity": 0.25, "blend": 0.1, "filter": "chromakey",
      "targets": [
        { "streamId": "BRAND_1_STREAM_ID", "background": "brand_1_1080.mp4",
          "foreground": "brand_1_logo.png", "foreground_position": "x=40:y=40", "foreground_size": "320:120" },
        { "streamId": "BRAND_2_STREAM_ID", "background": "brand_2_1080.jpg" }
      ]
    }
  }'
```

- Every `targets[].streamId` must be an existing stream (step 2).
- `foreground_position` is `x=<px>:y=<px>`, `foreground_size` is `<width>:<height>` in pixels.
- Keep the returned `optionGroup` (for example `chroma_key-1`): saving changes needs it. Read it back any time with `GET /stream/INGEST_STREAM_ID/options?name=chroma_key`.

### 5. Tune the key while live

```bash
curl -X PATCH "https://bintu.nanocosmos.de/stream/INGEST_STREAM_ID/filter" \
  -H "x-bintu-apikey: $BINTU_API_KEY" -H "content-type: application/json" \
  -d '{"processName":"chroma_key","filterOptions":{"chromakey":{"similarity":0.3,"blend":0.05}}}'
```

Applies to the running key at once, on every brand, but is **not saved**. Save the values you settle on with step 6.

### 6. Save the setup, add or drop a brand

```bash
curl -X PUT "https://bintu.nanocosmos.de/stream/INGEST_STREAM_ID/options" \
  -H "x-bintu-apikey: $BINTU_API_KEY" -H "content-type: application/json" \
  -d '{"name":"chroma_key","group":"chroma_key-1","options":{ ...same shape as step 4... }}'
```

The PUT replaces the whole option: always send the complete `targets` list. To add a brand, create its stream (step 2), then PUT the list with it appended; to drop one, PUT the list without it.

### Playing the branded outputs

- **One brand per page, one player, that brand's stream group.** Each operator/partner plays only their own output:

  ```js
  player.setup({
    source: {
      group: { id: "BRAND_1_STREAM_GROUP" },   // streamgroup from GET /stream/BRAND_1_STREAM_ID
      options: { adaption: { rule: "deviationOfMean2" } }
    },
    playback: { autoplay: true, automute: true }
  });
  ```

- **Never put two brands into one player's `source.entries`.** Entries are qualities of one stream that the player switches between (ABR or manual switching), so brand 2 would appear as a "quality" of brand 1.
- To **monitor** every output (an operator view, never a viewer page): one independent player per stream, ingest plus each brand, side by side.
- With secure playback on, each brand gets its own playback token scoped to its stream group (`security.jwtoken`), so one operator's access can be revoked without touching the others.

### Escalate When

- The upload or option calls return errors the steps above don't explain
- More than 15 targets per ingest are needed
- Keying quality problems that tuning doesn't resolve
