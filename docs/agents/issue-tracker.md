# Issue tracker: GitHub (en rentals-be)

This repo does **not** use its own issues. Product tickets live in **`Enzo-cam/rentals-be`** and carry the label
`repo:fe` when they touch this repo. Always pass `-R Enzo-cam/rentals-be` to `gh issue` commands.

## Conventions

- **Create an issue**: `gh issue create -R Enzo-cam/rentals-be --label repo:fe --title "..." --body "..."`.
- **Read an issue**: `gh issue view <number> -R Enzo-cam/rentals-be --json number,title,body,labels,comments`.
- **List issues for this repo**: `gh issue list -R Enzo-cam/rentals-be --label repo:fe --state open --json number,title,body,labels`.
- **Comment / labels / close**: same as above, always with `-R Enzo-cam/rentals-be`.
- **PRs** of this repo live here (`Enzo-cam/rentals-fe`) and reference their ticket as `Enzo-cam/rentals-be#N`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `Enzo-cam/rentals-be` with the label `repo:fe`.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Maps and tickets live in `Enzo-cam/rentals-be`; follow `../rentals-be/docs/agents/issue-tracker.md`.
