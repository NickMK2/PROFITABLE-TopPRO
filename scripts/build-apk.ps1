$ErrorActionPreference = 'Stop'

$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.21.10002-hotspot'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"

Push-Location (Join-Path $PSScriptRoot '..\android')
try {
    .\gradlew.bat assembleDebug
} finally {
    Pop-Location
}

Write-Host 'APK: android\app\build\outputs\apk\debug\app-debug.apk'
