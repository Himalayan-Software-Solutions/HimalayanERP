[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "Downloading font..."
Invoke-WebRequest -Uri "https://fonts.gstatic.com/s/notosansdevanagari/v27/xJB-fylD11W9KAsyYl04M8Fm12K2nQYWeE8.ttf" -OutFile "font.ttf" -TimeoutSec 15
if (Test-Path "font.ttf") {
    Write-Host "Font downloaded. Encoding..."
    $bytes = [System.IO.File]::ReadAllBytes("font.ttf")
    $base64 = [System.Convert]::ToBase64String($bytes)
    $js = "export const NotoSansDevanagari = `"$base64`";"
    [System.IO.File]::WriteAllText("d:\NoVA\Himalayan ERP\Jhabe Ram & Sons\Code\frontend\src\utils\NotoSansDevanagari.js", $js)
    Write-Host "Success! File generated."
    Remove-Item "font.ttf"
} else {
    Write-Host "Failed to download font.ttf"
}
