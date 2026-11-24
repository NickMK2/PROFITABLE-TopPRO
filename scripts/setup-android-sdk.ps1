$ErrorActionPreference = 'Stop'

$sdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$cmdlineDir = Join-Path $sdkRoot 'cmdline-tools\latest'
$sdkmanager = Join-Path $cmdlineDir 'bin\sdkmanager.bat'
$zip = Join-Path $env:TEMP 'commandlinetools.zip'
$extract = Join-Path $env:TEMP 'cmdline-extract'
$url = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'

$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'jdk-17*' } |
    Select-Object -First 1
if (-not $jdk) {
    throw 'No se encontró JDK 17. Instalá Eclipse Temurin 17 antes de correr este script.'
}

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

if (-not (Test-Path $sdkmanager)) {
    Write-Host 'Descargando Android Command-line Tools...'
    Invoke-WebRequest -Uri $url -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineDir) | Out-Null
    if (Test-Path $cmdlineDir) { Remove-Item $cmdlineDir -Recurse -Force }
    Move-Item (Join-Path $extract 'cmdline-tools') $cmdlineDir
}

Write-Host 'Aceptando licencias...'
(1..40 | ForEach-Object { 'y' }) | & $sdkmanager --licenses | Out-Null

Write-Host 'Instalando platform-tools, Android 35 y build-tools 35.0.0...'
& $sdkmanager 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'

Write-Host "SDK listo en $sdkRoot"
