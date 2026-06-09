---
name: flow-series-design
description: Design intent, references, and hard constraint for the "Flow" generative-art series
metadata:
  type: project
---

"Flow" is a layered laser-cut generative-art series (forked from the "Grids" project) where abstract shapes are placed along a Perlin **flow field** and cut as holes that recede into the layer stack.

**Hard constraint (never break):** shapes/ribbons must never overlap and must keep a solid `gap` of material around them, so every layer can be cut from a single connected piece. Verified geometrically (OBB SAT for discrete shapes; point-hash + half-step margin for ribbons) — re-run a pairwise non-overlap check after any placement change.

One **single shape type per output** (user requirement, 2026-06): Circles, Rectangles, Dashes, Ellipses, Triangles, Arrows, Chevrons, Squiggles. Never mix types in one piece.

**Reference aesthetics the user is targeting:**
- Squiggles → flowing streamline ribbons of varying length & thickness, i.e. Tyler Hobbs **Fidenza** and the method in https://damoonrashidi.me/articles/flow-field-methods (trace particle through field, keep full path, draw as a stroke, terminate on collision → varied lengths). Implemented as the `strokeMode` branch.
- Circles → dense flowing dots / bead-strings (classic dotted flow field).

Implementation lives in [[index.js]] (no separate file). Recession: discrete shapes scale whole; ribbons taper thickness per layer.
