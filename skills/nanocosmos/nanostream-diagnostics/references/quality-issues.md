---
id: quality-issues
audience: customer
category: ingest
triggers:
  - low quality
  - pixelation
  - blurry
  - audio crackling
  - audio dropout
  - color issues
  - bad quality
  - poor video
severity_default: MEDIUM
---

## Video / Audio Quality Issues

### When to Use
A customer reports degraded visual or audio quality in their stream output.

### Steps
1. Check encoder output quality and bitrate in Analytics
2. Verify ABR (Adaptive Bitrate) settings are configured correctly
3. Review ingest quality metrics in Analytics
4. Confirm encoder is using recommended settings:
   - Video codec: H.264
   - Audio codec: AAC
   - Keyframe interval: 2 seconds
   - B-frames: disabled (for lowest latency)

### Customer Response Guidance
- Guide through recommended encoder settings
- Suggest checking Analytics > Ingest Metrics for bitrate stability
- For audio issues, check AAC encoding and sample rate settings

### Contact nanocosmos support when
- Quality issues persist after encoder settings are corrected
- Issue is reproducible across multiple streams or accounts
