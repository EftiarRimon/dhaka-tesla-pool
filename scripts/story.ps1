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
  $mine | Select-Object @{n="passenger";e={$who}}, status, seats, estimatedFarePaisa, discountPaisa, passengerFarePaisa | Format-Table -AutoSize
}

Step "Login"
$jashim = Login "jashim@example.com"
$nusrat = Login "nusrat@example.com"
$rafiq  = Login "rafiq@example.com"
$shirin = Login "shirin@example.com"

$zones = Api "GET" "/zones" $nusrat $null
if ($zones.zones) { $zones = $zones.zones }
$banani    = ($zones | Where-Object { $_.name -eq "Banani" }).id
$mohakhali = ($zones | Where-Object { $_.name -eq "Mohakhali" }).id
$gulshan1  = ($zones | Where-Object { $_.name -eq "Gulshan 1" }).id

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