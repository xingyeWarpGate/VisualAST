# Limitations

- Mock output proves control flow only.
- The local image CLI cannot currently complete: its default cache path is denied, while a writable Hermes Home reports missing Codex OAuth.
- Five external comparison images were generated with Codex built-in imagegen, not the project image-cli adapter or exact RenderIntent.
- Holdout and a model-backed visual evaluator are still missing.
- The full Node unit suite result is not verified in the current audit.