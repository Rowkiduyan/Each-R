Param(
  [Parameter(Mandatory=$true)]
  [string]$ApplicationId,

  [string]$Date = '2026-01-21',
  [string]$Time = '20:12',
  [string]$Location = 'ghcjk ghnb'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-DotEnv([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }

  foreach ($raw in Get-Content $Path) {
    $line = $raw.Trim()
    if (-not $line) { continue }
    if ($line.StartsWith('#')) { continue }

    $parts = $line -split '=', 2
    if ($parts.Count -lt 2) { continue }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim()

    if ($value.Length -ge 2) {
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    $map[$key] = $value
  }

  return $map
}

Write-Host "PWD:" (Get-Location)
$envMap = Read-DotEnv (Join-Path (Get-Location) '.env')

$supabaseUrl = $envMap['SUPABASE_URL']
if (-not $supabaseUrl) { $supabaseUrl = $envMap['VITE_SUPABASE_URL'] }

$key = $envMap['SUPABASE_SERVICE_ROLE_KEY']
if (-not $key) { $key = $envMap['SUPABASE_ANON_KEY'] }
if (-not $key) { $key = $envMap['VITE_SUPABASE_ANON_KEY'] }

if (-not $supabaseUrl) { throw 'Missing SUPABASE_URL or VITE_SUPABASE_URL in .env' }
if (-not $key) { throw 'Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in .env' }

$uri = ($supabaseUrl.TrimEnd('/') + '/functions/v1/schedule-agreement-signing-with-notification')

$bodyObj = @{ 
  applicationId = $ApplicationId
  appointment = @{ date = $Date; time = $Time; location = $Location }
}
$bodyJson = $bodyObj | ConvertTo-Json -Depth 10 -Compress

Write-Host "POST:" $uri
Write-Host "ApplicationId:" $ApplicationId

try {
  $res = Invoke-WebRequest -Method Post -Uri $uri -Headers @{ apikey = $key; Authorization = "Bearer $key" } -ContentType 'application/json' -Body $bodyJson -ErrorAction Stop
  Write-Host "HTTP" $res.StatusCode $res.StatusDescription
  Write-Output $res.Content
} catch {
  if ($_.Exception.Response) {
    $r = $_.Exception.Response
    Write-Host "HTTP" $r.StatusCode.value__ $r.StatusDescription
    $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
    Write-Output ($sr.ReadToEnd())
    Write-Host "--- curl.exe (for full response) ---"
    curl.exe -i -sS -X POST $uri -H "Content-Type: application/json" -H "apikey: $key" -H "Authorization: Bearer $key" --data-binary $bodyJson
  } else {
    throw
  }
}
