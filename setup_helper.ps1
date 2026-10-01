# setup_helper.ps1 - Download and extract portable Node.js
# Called by setup.bat, do not run directly.

$ErrorActionPreference = 'Stop'

$NodeVersion = "22.22.3"
$ProjectDir  = Split-Path -Parent $MyInvocation.MyCommand.Path

$zipName     = "node-v${NodeVersion}-win-x64.zip"
$downloadUrl = "https://nodejs.org/dist/v${NodeVersion}/${zipName}"
$zipPath     = Join-Path $ProjectDir $zipName
$extractDir  = Join-Path $ProjectDir "node-v${NodeVersion}-win-x64"
$runtimeDir  = Join-Path $ProjectDir "runtime"

try {
    # Step 1: Download
    Write-Host "[1/3] Downloading Node.js v${NodeVersion}..."
    Write-Host "      URL: $downloadUrl"
    Write-Host ""

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

    $fileSizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-Host "[OK] Download complete. File size: ${fileSizeMB} MB"
    Write-Host ""

    # Step 2: Extract
    Write-Host "[2/3] Extracting to runtime folder..."

    if (Test-Path $extractDir) {
        Remove-Item $extractDir -Recurse -Force
    }
    if (Test-Path $runtimeDir) {
        Remove-Item $runtimeDir -Recurse -Force
    }

    Expand-Archive -Path $zipPath -DestinationPath $ProjectDir -Force

    # Rename extracted folder to 'runtime'
    if (Test-Path $extractDir) {
        Rename-Item -Path $extractDir -NewName "runtime"
        Write-Host "[OK] Extracted to runtime folder."
    } else {
        Write-Host "[ERROR] Expected folder not found after extraction: $extractDir"
        exit 1
    }

    # Step 3: Cleanup
    Write-Host ""
    Write-Host "[3/3] Cleaning up temporary files..."
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Cleanup complete."

    exit 0
}
catch {
    Write-Host ""
    Write-Host "[ERROR] $($_.Exception.Message)"

    # Cleanup on failure
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    }

    exit 1
}
