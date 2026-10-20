---
id: diagnose-playback
audience: customer
category: playback
triggers:
  - buffering
  - freezing
  - player not loading
  - high latency
  - video stuttering
  - audio video sync
  - black screen
  - player error
  - can't watch
  - stream not playing
severity_default: MEDIUM
---

## Diagnose Playback Issues (Buffering, Latency, Freezing)

### When to Use
A viewer or customer reports problems watching a stream: buffering, freezing, high latency, or the player not loading.

### Steps
1. Test with the official demo player. **Check whether the stream is secure first** (secure playback is an organization-wide setting, so all streams of a secure organization need a token) — since the demo player URL is different for each, and pointing a secure stream at the non-secure URL fails to load or throws an auth error that looks like a player/buffering problem but isn't one:
   - Non-secure account:
     `https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=XXXXX-YYYYY`
   - Secure account (JWT token required — generated server-side with the organization API key):
     `https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=XXXXX-YYYYY&group.security.jwtoken=[jwtoken]`

   (replace `XXXXX-YYYYY` with the stream name or UID)

   If this step itself fails with a security/auth error rather than a buffering/loading symptom, this isn't a playback issue — see `security-tokens.md` instead.
2. Check browser console for JavaScript errors
3. Verify H5Live player configuration
4. Run a speed test to check viewer network conditions
5. Review Analytics > Troubleshooting for the specific stream

**Buffering diagnostic questions to ask the customer:**
- How can we replicate the issue? (steps, and whether it happens every time or intermittently)
- What is the exact web page/URL where you're viewing the stream (your embed page or app)? We need this to check playback directly on our side.
- What encoder and settings are being used?
- Is the upstream internet connection stable?
- What network is the viewer using? (WiFi, cellular, wired)
- Where is the encoder located, and where are the viewers?
- Does buffering happen on **all** player instances or only **some**?

**Always ask for the replication steps and the page URL, even when the customer's account or organisation cannot be located** — don't let a failed account lookup block gathering this; it's often enough to check the issue directly regardless of whether the account was matched. Once the account/stream **is** identified, also proactively share our own demo player URL for their stream (see Customer Response Guidance) — the two aren't a substitute for each other: their page URL lets us see the actual embedding/integration, our demo URL isolates whether the platform stream itself plays cleanly outside their integration.

**Quick diagnosis flow:**
```
Buffering reported
├── Happens on ALL players? → Check encoder settings & upstream connection (ingest side)
└── Happens on SOME players? → Check those viewers' network (WiFi/mobile), location, device
```

### Customer Response Guidance
- Ask the multi-player diagnostic question first — it quickly narrows ingest vs. viewer-side
- Recommend Analytics > Troubleshooting for self-service diagnosis
- **Once the customer's account/stream is identified (authenticated)**, proactively provide our own demo player link for isolated testing — the secure or non-secure variant, matching the stream (see Step 1); don't hand out the non-secure form to a secure-account customer, it will fail for an unrelated reason and confuse the diagnosis. This is in addition to, not instead of, asking for their page URL and replication steps above — do that regardless of whether the account is identified

### Contact nanocosmos support when
- Buffering affects all viewers and encoder is confirmed healthy
- Issue is persistent across multiple stream sessions
