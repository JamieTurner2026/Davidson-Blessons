# Template for the bridge launcher. Copy to %USERPROFILE%\notebooklm-mcp\run_server.ps1,
# fill in the values, and NEVER commit the filled-in copy: it holds the secrets.
#
# Launches the bridge server (code in this repo, data in the private folder)
# and keeps it running. Started at sign-in by a .vbs in the Startup folder.
# Uses Start-Process with real file redirection rather than PowerShell's
# `*>>`/`2>&1`: in Windows PowerShell 5.1 those wrap every stderr line of a
# native process as a NativeCommandError, and uvicorn logs to stderr.

$dir = "$env:USERPROFILE\notebooklm-mcp"                          # private data folder
$code = "$env:USERPROFILE\OneDrive\Documents\Claude\davison-blesson\bridge"   # this folder
$logPath = "$dir\task_run.log"

function Log($msg) {
    "$(Get-Date -Format o)  $msg" | Out-File -FilePath $logPath -Append -Encoding utf8
}

# Single-instance guard: if something is already serving on 8484, don't
# start a second copy (it would just fail to bind and loop forever).
if (Get-NetTCPConnection -LocalPort 8484 -State Listen -ErrorAction SilentlyContinue) {
    Log "port 8484 already in use - another instance is running, exiting"
    exit 0
}

$env:NOTEBOOKLM_DATA_DIR = $dir
$env:NOTEBOOKLM_NOTEBOOK_ID = "<your NotebookLM notebook id>"
# Private edition (full chapters) and public edition secrets. Generate each with
#   python -c "import secrets; print(secrets.token_urlsafe(32))"
$env:NOTEBOOKLM_BRIDGE_SECRET = "<private-edition secret>"
$env:NOTEBOOKLM_PUBLIC_SECRET = "<public-edition secret>"
# The bridge's public HTTPS address from `tailscale funnel --bg 8484`.
$env:NOTEBOOKLM_PUBLIC_URL = "https://<your-pc>.<your-tailnet>.ts.net"
$env:NOTEBOOKLM_ALLOWED_ORIGINS = "http://localhost:5174,https://davison-blesson.vercel.app"
$env:NOTEBOOKLM_ALLOWED_ORIGIN_REGEX = "^https://davison-blesson-[a-z0-9]+-<your-vercel-team>\.vercel\.app$"

Log "launcher started as $env:USERNAME"

while ($true) {
    try {
        $proc = Start-Process -FilePath "$dir\.venv\Scripts\python.exe" `
            -ArgumentList "`"$code\server.py`"" `
            -WorkingDirectory $dir `
            -RedirectStandardOutput "$dir\task_stdout.log" `
            -RedirectStandardError "$dir\task_stderr.log" `
            -WindowStyle Hidden -PassThru -Wait
        Log "server exited with code $($proc.ExitCode); restarting in 10s"
    } catch {
        Log "launch failed: $_ ; retrying in 10s"
    }
    Start-Sleep -Seconds 10
}
