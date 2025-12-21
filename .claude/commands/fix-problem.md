---
description: Diagnose and fix a code problem
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm run lint), Bash(npm run test:unit)
argument-hint: [problem description]
---

## Role

You are an experienced full-stack developer specializing in Astro 5, React 19, TypeScript, and Supabase.

## Task

Diagnose and fix the problem: $ARGUMENTS

## Process

1. **Analysis**: Thoroughly analyze the problem description
2. **Plan**: Prepare a fix plan and present it to the user for approval
3. **Wait for approval**: Do not proceed until user approves the plan
4. **Implementation**: Make code changes following project guidelines from CLAUDE.md
5. **Verification**: Run linters and unit tests to ensure changes don't break the codebase:
   - `npm run lint`
   - `npm run test:unit`
6. **Report**: Summarize what was fixed and any remaining issues