$base = "http://localhost:4000"
$password = "password123"

function Api($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $headers; ContentType = "application/json" }
  if ($body) { $params["Body"] = ($body | ConvertTo-Json) }
  Invoke-RestMethod @params
}

function Login($email) {
  $r = Api "POST" "/auth/login" $null @{ email = $email; password = $password }
  if ($r.token) { return $r.token }
  if ($r.accessToken) { return $r.accessToken }
  throw "No token in login response: $($r | ConvertTo-Json -Depth 5)"
}

function Step($title) { Write-Host "`n== $title" -ForegroundColor Cyan }

function Show-Fares($who, $token) {
  $mine = Api "GET" "/rides/me" $token $null
  $mine | Select-Object @{n="who";e={$who}}, status, @{n="solo";e={$_.estimatedFarePaisa}}, @{n="disc";e={$_.discountPaisa}}, @{n="fare";e={$_.passengerFarePaisa}} | Format-Table -AutoSize}

Step "Login"
$jashim = Login "jashim@example.com"
$nusrat = Login "nusrat@example.com"
$rafiq  = Login "rafiq@example.com"
$shirin = Login "shirin@example.com"

$zones = @(Api "GET" "/zones" $nusrat $null)
if ($zones.Count -eq 1 -and $zones[0] -is [array]) { $zones = $zones[0] }

function ZoneId($name) {
  $z = $zones | Where-Object { $_.name -eq $name } | Select-Object -First 1
  if (-not $z) { throw "Zone '$name' not found. Got: $($zones | ConvertTo-Json -Compress)" }
  return [int]$z.id
}

$banani    = ZoneId "Banani"
$mohakhali = ZoneId "Mohakhali"
$gulshan1  = ZoneId "Gulshan 1"
Write-Host "Zone ids: Banani=$banani Mohakhali=$mohakhali Gulshan1=$gulshan1"

Step "Jashim takes Bullet online"
Api "PATCH" "/vehicles/me/status" $jashim @{ online = $true } | Format-List

Step "Nusrat (Banani -> Mohakhali) and Rafiq (Banani -> Gulshan 1) request rides"
$nRide = Api "POST" "/rides" $nusrat @{ pickupZoneId = $banani; destinationZoneId = $mohakhali; seats = 1 }
$rRide = Api "POST" "/rides" $rafiq  @{ pickupZoneId = $banani; destinationZoneId = $gulshan1;  seats = 1 }
Write-Host "Solo estimates: Nusrat $($nRide.estimatedFarePaisa), Rafiq $($rRide.estimatedFarePaisa) (expect 7000 and 8500)"

Step "Jashim accepts both"
Api "POST" "/rides/$($nRide.id)/accept" $jashim $null | Out-Null
Api "POST" "/rides/$($rRide.id)/accept" $jashim $null | Out-Null
Show-Fares "Nusrat" $nusrat
Show-Fares "Rafiq" $rafiq
Write-Host "Expect pooled fares: Nusrat 5600, Rafiq 6800"

Step "Shirin asks for 2 seats, only 1 is left (expect 409)"
$sRide = Api "POST" "/rides" $shirin @{ pickupZoneId = $banani; destinationZoneId = $gulshan1; seats = 2 }
try {
  Api "POST" "/rides/$($sRide.id)/accept" $jashim $null | Out-Null
  Write-Host "UNEXPECTED: accept succeeded" -ForegroundColor Red
} catch {
  Write-Host "HTTP $($_.Exception.Response.StatusCode.value__): $($_.ErrorDetails.Message)" -ForegroundColor Green
}
function Expect-Fail($label, $block) {
  try {
    & $block | Out-Null
    Write-Host "UNEXPECTED success: $label" -ForegroundColor Red
  } catch {
    Write-Host "$label -> HTTP $($_.Exception.Response.StatusCode.value__) $($_.ErrorDetails.Message)" -ForegroundColor Green
  }
}

Step "Lifecycle: invalid moves are rejected"
Expect-Fail "Jashim starts Nusrat before she is marked arrived" { Api "POST" "/rides/$($nRide.id)/start" $jashim $null }
Expect-Fail "Nusrat tries to cancel Rafiq's ride" { Api "POST" "/rides/$($rRide.id)/cancel" $nusrat $null }
Expect-Fail "Nusrat tries the driver-only arrive action" { Api "POST" "/rides/$($nRide.id)/arrive" $nusrat $null }

Step "Shirin cancels her own request"
Api "POST" "/rides/$($sRide.id)/cancel" $shirin $null | Select-Object status | Format-Table

Step "Jashim drives Nusrat and Rafiq to the end"
foreach ($id in @($nRide.id, $rRide.id)) { Api "POST" "/rides/$id/arrive" $jashim $null | Out-Null }
foreach ($id in @($nRide.id, $rRide.id)) { Api "POST" "/rides/$id/start" $jashim $null | Out-Null }
Expect-Fail "Rafiq cancels after the trip started" { Api "POST" "/rides/$($rRide.id)/cancel" $rafiq $null }
foreach ($id in @($nRide.id, $rRide.id)) { Api "POST" "/rides/$id/complete" $jashim $null | Out-Null }

Step "Final fares (history)"
$n = Api "GET" "/rides/me" $nusrat $null
$n | Select-Object @{n="who";e={"Nusrat"}}, status, finalFarePaisa | Format-Table -AutoSize
$r = Api "GET" "/rides/me" $rafiq $null
$r | Select-Object @{n="who";e={"Rafiq"}}, status, finalFarePaisa | Format-Table -AutoSize