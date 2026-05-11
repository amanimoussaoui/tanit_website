$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$py = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
  Write-Host "Creer le venv: python -m venv .venv" -ForegroundColor Yellow
  Write-Host "puis: .\.venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
  exit 1
}
& $py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
