# Implemented navy theme

These files capture the running application, not generated mockups:

- [Mobile screenshot](navy-phone.png)
- [Desktop screenshot](navy-desktop.png)
- [Short recording of real play, answer feedback and next-hand dealing](navy-interface-demo.mp4)

The recording uses the existing full-hand trainer and supplied scripts with deterministic browser randomness for reproducibility. It includes real grading and continuation, without substituting mock game state or modifying simulator logic. The clip is H.264, 390×844, 25fps, approximately 20 seconds, with no audio. It is intended as a browser/device-friendly demonstration, not evidence of native iPhone testing.

The MP4 was decoded with FFmpeg and played in Chromium; frames were also inspected. See [scope and preservation checks](../../THEME.md).

Optional developer reproduction, after `npm run build`:

```sh
node scripts/record-interface.cjs
```

This recording tool requires a system Chromium and FFmpeg; `CHROMIUM_PATH` and `FFMPEG_PATH` can specify their locations. It starts its own local server and uses a temporary tool directory. Neither tool is needed to run or use the app normally.
