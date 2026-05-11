# Lance la stack Tanit Talent avec Docker Compose (Windows PowerShell).
# Prérequis : Docker Desktop installé et démarré ; exécuter depuis la racine du dépôt :
#   .\scripts\docker-stack.ps1
# Options :
#   -Seed   Exécute aussi le seed Prisma après démarrage

param(
    [switch]$Seed
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "docker-compose.yml"))) {
    $root = (Get-Location).Path
}

Set-Location $root

function Require-Docker {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $docker) {
        Write-Error "Docker n'est pas dans le PATH. Installez Docker Desktop pour Windows et redémarrez le terminal."
    }
}

Require-Docker

Write-Host "Construction et démarrage (docker compose up --build -d)..." -ForegroundColor Cyan
docker compose up --build -d

Write-Host "Attente du backend (health)..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $ok = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ok) {
    Write-Warning "Health check backend non OK après attente. Voir : docker compose logs backend"
} else {
    Write-Host "Backend OK : http://localhost:3001/health" -ForegroundColor Green
}

Write-Host "Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host "FastAPI  : http://localhost:8000/docs" -ForegroundColor Green

if ($Seed) {
    Write-Host "Seed base de données..." -ForegroundColor Cyan
    docker compose exec -T backend npx --yes tsx prisma/seed.ts
}

Write-Host "Terminé." -ForegroundColor Green
