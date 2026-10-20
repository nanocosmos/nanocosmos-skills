---
id: live-captions
audience: customer
category: captions
triggers:
  - live captions
  - transcription
  - subtitles
  - closed captions
  - ASR
  - speech to text
  - multi-language captions
  - translate
  - accessibility
  - Deepgram
severity_default: LOW
---

## Live Captions and Transcription

### When to Use
A customer asks about enabling live captions, transcription, or multi-language translation on their stream.

### Feature Overview
- AI-driven ASR (Automatic Speech Recognition) via Deepgram
- Real-time captions synchronized with H5Live Player
- 40+ languages supported, with live translation between any source/target pair
- Enhances accessibility and comprehension in sound-off environments

### Requirements
- Feature must be explicitly enabled for the organization (may require additional pricing — contact sales)
- Secure playback must also be enabled for the organization (an organization-wide setting, not per stream)
- Requires custom integration (not built into default player UI)
- Stream must be re-ingested after enabling captions for settings to take effect
- Some ASR services require 24-hour advance notice before use
- Captions stop automatically when the stream ends
- Permissions: nanoAdmin and nanoUser roles can manage captions; nanoReadOnly cannot

### Enabling Captions
1. Contact https://www.nanocosmos.net/contact (or sales@nanocosmos.net) to enable the feature
2. Verify in Dashboard > Organization > Enabled Packages
3. Configure via bintu API:

```json
POST /stream/{id}/options
Headers: x-bintu-apikey: your-api-key

// Transcription only:
{ "name": "captions", "options": { "engine": "deepgram", "sourceLanguage": "en" } }

// With translation:
{ "name": "captions", "options": { "engine": "deepgram", "sourceLanguage": "en", "targetLanguages": "en,de,es" } }
```

4. Integrate captions display into the player UI

### Common Captions Issues

| Issue | Likely Cause | Fix |
|---|---|---|
| Captions not appearing | Feature not enabled | Verify in Org > Enabled Packages |
| Captions delayed | Network conditions or language config | Check sourceLanguage, network |
| Wrong language | Incorrect sourceLanguage | Update API configuration |
| Settings not applying | Stream not re-ingested | Stop and restart the stream |

### Supported Languages
English (US/UK/AU/IN/NZ), Spanish, German, French, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Turkish, Polish, Dutch, Swedish, and 25+ more.

### Customer Response Guidance
- If feature is not yet enabled, direct to sales/contact form
- For configuration questions, point to bintu API docs
- Remind that stream restart is needed after configuration changes

### Contact nanocosmos support when
- Feature is enabled but captions consistently fail to appear after re-ingest
