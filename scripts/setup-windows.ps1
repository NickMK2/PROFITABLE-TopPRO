$ErrorActionPreference = 'Stop'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'Necesitás winget (App Installer de Windows). Actualizá Microsoft Store e intentá de nuevo.'
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
}

# Node 22
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    winget install --id OpenJS.NodeJS.22 -e --accept-source-agreements --accept-package-agreements
}
$env:Path = "C:\Program Files\nodejs;$env:Path"
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) {
    throw "Se requiere Node 22 o superior (encontrado $nodeMajor)."
}

# JDK 17
$jdk17 = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $jdk17) {
    winget install --id EclipseAdoptium.Temurin.17.JDK -e --accept-source-agreements --accept-package-agreements
    $jdk17 = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-17*' |
        Select-Object -First 1
}
$env:JAVA_HOME = $jdk17.FullName
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# SDK de Android
& (Join-Path $PSScriptRoot 'setup-android-sdk.ps1')

# Dependencias y proyecto nativo
& 'C:\Program Files\nodejs\npm.cmd' install
& 'C:\Program Files\nodejs\npm.cmd' run prebuild

# APK
& (Join-Path $PSScriptRoot 'build-apk.ps1')
