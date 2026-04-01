param(
  [string]$BaseUrl = 'http://127.0.0.1:8080',
  [int]$TimeoutSec = 20,
  [int]$MaxAttempts = 20,
  [int]$RetryDelaySec = 2
)

$ErrorActionPreference = 'Stop'
$routes = @(
  '/healthz',
  '/',
  '/login',
  '/signup',
  '/icmp-ping',
  '/tcp-ping',
  '/port-scan',
  '/dns-lookup',
  '/history',
  '/alerts',
  '/settings',
  '/profile',
  '/api/healthz'
)

function Invoke-SmokeRequest {
  param(
    [string]$Url
  )

  $lastError = $null

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return $response
      }
      $lastError = "status $($response.StatusCode)"
    } catch {
      $lastError = $_
    }

    if ($attempt -lt $MaxAttempts) {
      Start-Sleep -Seconds $RetryDelaySec
    }
  }

  throw "Smoke test failed for $Url after $MaxAttempts attempts: $lastError"
}

foreach ($route in $routes) {
  $url = "{0}{1}" -f $BaseUrl.TrimEnd('/'), $route
  $response = Invoke-SmokeRequest -Url $url
  Write-Host "$url -> $($response.StatusCode)"
}
