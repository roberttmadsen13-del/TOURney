# Build Request: GKS AI Trio Local App

I need a real local Windows desktop app, not a PowerShell shortcut and not just Windows Terminal panes.

## Goal

Create a local app called **GKS AI Trio** for managing three Claude CLI sessions against the TOURney repo.

Canonical repo:

```text
C:\Users\Rob\Greenskeeper Studios\01 Repos\TOURney
```

Claude executable:

```text
C:\Users\Rob\.local\bin\claude.exe
```

## What I Actually Want

A desktop app window with a vertical file/menu sidebar on the far left, like Antigravity, Cursor, or VS Code.

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Vertical Sidebar     â”‚ Planner Claude CLI           â”‚ Execution Audit Claude CLI   â”‚
â”‚                      â”‚                              â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Files                â”‚                              â”‚ Bug Review Claude CLI        â”‚
â”‚ Changed              â”‚                              â”‚                              â”‚
â”‚ Recent               â”‚                              â”‚                              â”‚
â”‚ Collapsible folders  â”‚                              â”‚                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

The left side should be real app UI, not a terminal pane.

## Important: What Has Been Done Wrong Before

Do **not** solve this by:

- making a `.lnk` shortcut to PowerShell
- launching plain Windows Terminal panes and calling it an app
- using PowerShell as the visible shell UI
- making the file menu a top menu or horizontal toolbar
- making the file menu a Windows Terminal split pane
- passing role instructions as the first user message to Claude
- letting the Planner start generating immediately on app load
- auto-pasting anything into Planner on startup
- using the wrong repo path

The repeated mistake has been confusing â€œa launcher that opens terminalsâ€ with â€œa local app that contains terminals.â€ I want the app to own the window layout and embed terminal sessions inside the app UI.

## App Requirements

### 1. Real Desktop App

Build a real Windows local app.

Acceptable approaches:

- Electron app
- Tauri app
- WPF/.NET app with embedded terminal controls
- WinUI app
- any reliable Windows desktop shell that can host terminal processes

The final user-facing launcher should be an `.exe` and should be pinnable to the Windows taskbar.

### 2. Embedded Terminals

The app must spawn and display three Claude CLI terminal sessions inside the app:

1. **Planner**
2. **Execution Audit**
3. **Bug Review**

Each terminal should run:

```text
C:\Users\Rob\.local\bin\claude.exe
```

Each should start in:

```text
C:\Users\Rob\Greenskeeper Studios\01 Repos\TOURney
```

Do not use generic `claude` from PATH. Use the exact executable.

### 3. Planner Behavior

Planner should not act on app startup.

Planner should launch idle.

Planner role instructions must be passed as system/append-system prompt, not as a user prompt.

Use something like:

```powershell
C:\Users\Rob\.local\bin\claude.exe --name "Planner" --dangerously-skip-permissions --permission-mode bypassPermissions --append-system-prompt "<planner instructions>"
```

Do not append a normal user prompt at the end.

Planner should only respond when:

- Rob types into Planner, or
- a worker terminal finishes a task and emits a handoff block.

### 4. Worker Behavior

Execution Audit and Bug Review should also launch idle.

Their role instructions must be system/append-system prompt only.

They should not start tasks automatically on app load.

### 5. Worker Handoff Protocol

Workers should end completed work with:

```text
GKS_HANDOFF_BEGIN
role: execution-audit | bug-review
status: done
summary: <one-line result>
evidence: <short evidence list>
next_steps: <next executable steps>
planner_note: <what Planner should know>
GKS_HANDOFF_END
```

The app should watch worker output for these blocks.

When a complete handoff block appears:

- paste/send it to Planner automatically
- do not send anything else
- never send anything on startup

### 6. Context Control

When Planner delegates a new unrelated task to a worker, it should start the worker message with:

```text
/clear
```

Only skip `/clear` when continuing/debugging directly related prior work.

### 7. Auto Rate-Limit Resume

If any embedded Claude CLI outputs a message like:

```text
You've hit your limit Â· resets 10:50pm
(America/New_York)
```

the app should schedule a send to that same CLI for 1 minute after the reset time.

The message to send is:

```text
1
```

Do not send it immediately. Send it at reset time + 1 minute.

### 8. Left File Sidebar

The file/menu area must be a **vertical sidebar on the far left of the app**, like Antigravity, Cursor, or VS Code.

It should not be:

- a top menu
- a horizontal toolbar
- a terminal pane
- a PowerShell text list
- a Windows Terminal split pane

The sidebar should show:

- collapsible TOURney repo file tree
- changed files from git status
- recently modified files
- current repo path
- badges for modified/untracked files

Use:

```text
C:\Users\Rob\Greenskeeper Studios\01 Repos\TOURney
```

### 9. Layout

Default layout:

- left collapsible vertical file/sidebar
- center Planner terminal
- right column split vertically:
  - top Execution Audit terminal
  - bottom Bug Review terminal

Resizable splitters preferred.

### 10. Trust Prompt

Avoid Claude workspace trust prompts if possible.

Use flags:

```text
--dangerously-skip-permissions
--permission-mode bypassPermissions
```

The app should not get stuck at:

```text
Security guide
1. Yes, I trust this folder
2. No, exit
```

### 11. Logging

Write logs to:

```text
C:\Users\Rob\.claude\ai-trio\logs
```

Suggested logs:

- launcher.log
- handoffs.log
- auto-resume.log
- terminal-errors.log

### 12. Current Scripts Are Not Sufficient

Existing scripts under:

```text
C:\Users\Rob\.claude\scripts
C:\Users\Rob\.claude\ai-trio
```

may contain useful role prompts and partial logic, but they are not the final solution. They still rely too much on PowerShell/Windows Terminal.

Use them only as reference.

## Deliverable

Create a working local app project and installer/launcher.

Final result should be something Rob can pin and launch like a real app:

```text
GKS AI Trio.exe
```

Opening it should show the app UI with the vertical file sidebar and embedded Claude CLI terminals. It should not start burning tokens until Rob or a worker handoff sends a message.

