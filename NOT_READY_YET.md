# This repo is not ready for Claude Code yet

Two files are still missing before a Project Governor session can produce
CLAUDE.md and PROGRESS.md for this tool:

1. **docs/supabase-setup.md from Tool A's build.** This tool's Supabase project
   is marked "existing" (it shares Tool A's project) — the Project Governor skill
   requires the real supabase-setup.md, produced automatically by Claude Code at
   the end of Tool A's first build session. Copy that file into docs/ here once
   it exists.
2. Once step 1 is done, run the Project Governor skill again in a fresh
   conversation, uploading docs/product-spec.md and the supabase-setup.md from
   step 1. It will produce this repo's CLAUDE.md and PROGRESS.md.

Delete this file once both are in place.
