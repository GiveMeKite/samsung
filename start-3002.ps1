$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot
$env:PORT = '3002'
npm start
