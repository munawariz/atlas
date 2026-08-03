<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ecc-rules -->
# Engineering rules

Standards for this project live in [.claude/rules/ecc/](.claude/rules/ecc/), copied from the ECC plugin (v2.1.0). Four packs are installed — `common`, `typescript`, `web`, `react` — which is the set ECC's stack mapping assigns to a Next.js + React + TypeScript project.

Read the file that covers the work you are about to do. Do not load the whole tree.

## Always apply — [common/](.claude/rules/ecc/common/)

| File | Covers |
|------|--------|
| [coding-style.md](.claude/rules/ecc/common/coding-style.md) | Immutability, KISS/DRY/YAGNI, file size limits, error handling, naming |
| [patterns.md](.claude/rules/ecc/common/patterns.md) | Reuse before writing; prefer proven implementations |
| [security.md](.claude/rules/ecc/common/security.md) | Pre-commit checklist: no hardcoded secrets, boundary validation |
| [testing.md](.claude/rules/ecc/common/testing.md) | Required test types and the 80% coverage target |
| [code-review.md](.claude/rules/ecc/common/code-review.md) | When to review and how to triage findings by severity |
| [development-workflow.md](.claude/rules/ecc/common/development-workflow.md) | Research → plan → TDD → review → commit pipeline |
| [git-workflow.md](.claude/rules/ecc/common/git-workflow.md) | Conventional commit format, PR process |
| [agents.md](.claude/rules/ecc/common/agents.md) | Delegation completion contract, parallel task rules |
| [performance.md](.claude/rules/ecc/common/performance.md) | Model selection and context management |
| [hooks.md](.claude/rules/ecc/common/hooks.md) | Claude Code hook types and conventions |

## Scoped by what you are editing

| Editing | Read |
|---------|------|
| Any `.ts` / `.tsx` | [typescript/](.claude/rules/ecc/typescript/) — types on public APIs, async correctness, TS-specific security and testing |
| React components and hooks | [react/](.claude/rules/ecc/react/) — component style, rules of hooks, server/client boundaries, XSS, RTL testing |
| Styling, layout, markup, PWA surface | [web/](.claude/rules/ecc/web/) — CSS conventions, design quality, Core Web Vitals, web security |

## Precedence

1. The Next.js 16 docs in `node_modules/next/dist/docs/` win over any rule file — the rules predate this Next.js version.
2. Language- and framework-specific rules override `common/` where idioms differ.
3. Existing patterns in this codebase override both when following a rule would mean a lone inconsistent file.

## Local notes

- Agents named in `common/agents.md` are ECC plugin agents here, so they carry an `ecc:` prefix (`ecc:planner`, `ecc:code-reviewer`, `ecc:security-reviewer`).
- `common/hooks.md`, `typescript/hooks.md`, and `web/hooks.md` are about Claude Code hooks. `react/hooks.md` is about React hooks.
- This project has no test runner installed. Treat `testing.md` coverage rules as targets for when one is added, not as gates that exist today.
<!-- END:ecc-rules -->
