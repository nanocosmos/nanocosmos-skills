---
id: unity-webgl-player
audience: customer
category: player
triggers:
  - Unity WebGL
  - Unity player
  - Unity game engine
  - embed in Unity
  - Unity H5Live
  - Unity nanoPlayer
  - WebGL build player
  - video texture Unity
  - stream in Unity game
  - Unity iframe
  - game engine streaming
severity_default: LOW
---

## Unity WebGL Support for the H5Live Player

### When to Use
A customer asks whether/how to show a nanoStream stream inside a Unity WebGL build — e.g. a live video feed in a browser-based game or interactive experience built with Unity.

### What's Available
The player team has an initial integration approach for embedding H5Live inside a Unity WebGL build — implemented by overriding and patching hooks into Unity's render functions via a `.jslib` (JavaScript interop) extension. This is shareable with customers on request:

1. Readme: https://files.nanocosmos.de/index.php/s/rXGtGgC2GcbFTGt
2. Sample Unity project: https://files.nanocosmos.de/index.php/s/ZDmss5CHdF5wM7N
3. Screen recording: https://files.nanocosmos.de/index.php/s/HYD68Xa48rrFSpy
4. Online demo: https://demo1.nanocosmos.de/nanoplayer-unity/v1/


### Suggested Reply
Adapt to the actual conversation, but the core content is:

> Thank you for your interest in Unity WebGL support for the H5Live player. Our player team has released an initial implementation and can share an integration approach. Please refer to:
> 1) Readme: [link]
> 2) Sample project: [link]
> 3) Screen video: [link]
> and online demo: [link]
>
> We'd appreciate your feedback after you've tested it.

### Customer Response Guidance
- Share all four links together (readme, sample project, screen video, online demo) — don't send just one on its own.
- Ask for feedback after they test, matching the established reply pattern.
- Frame this as an integration approach/sample to build from, not a guaranteed drop-in plugin. If pressed for an official roadmap commitment or ongoing dedicated Unity support, don't improvise one — escalate instead.

### Contact nanocosmos support when
- Customer needs help beyond what's in the readme/sample project (implementation questions, bugs in the sample)
- Customer asks for an official roadmap commitment or ongoing dedicated support for Unity integration
- Any of the shared links are broken or inaccessible
