[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$version = $env:NODE_VERSION
if (-not $version) { $version = '22.14.0' }
Write-Host "Telechargement de Node.js v$version..."
$url = "https://nodejs.org/dist/v$version/node-v$version-win-x64.zip"
Invoke-WebRequest -Uri $url -OutFile C:\node.zip
Write-Host "Extraction de archive Node.js..."
Expand-Archive -Path C:\node.zip -DestinationPath C:\
Rename-Item -Path "C:\node-v$version-win-x64" -NewName C:\nodejs
Remove-Item -Force C:\node.zip
Write-Host "Node.js v$version installe avec succes."
