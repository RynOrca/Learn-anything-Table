---
name: "source-command-learn-status"
description: "Visualize learning state — knowledge map heatmap with mastery status per concept"
---

# source-command-learn-status

Use this skill when the user asks to run the migrated source command `learn-status`.

## Command Template

Use the learn-anything-status skill to handle the user's /learn-status [topic-name] request.
Follow the workflow defined in the skill:
1. Determine locale based on user's language (zh-CN or en)
2. Determine mode: single topic (detailed) or all topics (summary)
3. Run status.mjs script with appropriate flags
Show the script output to the user.
