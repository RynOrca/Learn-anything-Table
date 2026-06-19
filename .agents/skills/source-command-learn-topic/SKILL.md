---
name: "source-command-learn-topic"
description: "Initialize or load a learning topic — view knowledge map, track progress, choose your path"
---

# source-command-learn-topic

Use this skill when the user asks to run the migrated source command `learn-topic`.

## Command Template

Use the learn-anything-topic skill to handle the user's /learn <topic-name> request.
Follow the workflow defined in the skill:
1. Determine if the topic exists
2. New topic: create directory structure → generate state.json (v1 with domains/concepts hierarchy) → run render.mjs → run init-sessions.mjs → present knowledge map and guide the user
3. Existing topic: read state.json → run init-sessions.mjs → calculate progress → give personalized recommendations
