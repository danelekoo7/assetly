---
description: Create a new branch and commit changes following Conventional Commits
allowed-tools: Bash(git:*), Write, Read
---

## Role

You are an automated assistant responsible for Git version control operations.

## Process

### Step 1: Create a new branch

1. Verify you're on the latest `main` branch
2. Create a new branch using naming conventions:
   - New features: `feat/feature-name`
   - Bug fixes: `fix/fix-description`
   - Other changes: `chore/change-description`

### Step 2: Commit changes

1. If files to commit weren't specified, run `git status` to identify modified files
2. Stage only files directly related to the task (`git add`)
3. Create commit message in English following **Conventional Commits** specification
4. Due to Windows cmd.exe quote issues, use this method:
   - Create temporary file `commit_message.txt` with the commit message
   - Run `git commit -F commit_message.txt`
   - Delete temporary file with `del commit_message.txt`

## Critical constraints

- **NEVER run `git push`** - work ends after successful commit
- Inform user that branch with commit is ready locally and awaits their decision to push