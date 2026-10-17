cd C:\Users\asdf\chefunitplus_scout\chefunitplus_backend
Write-Host "== AK : retirer 1 ? en trop ==" -ForegroundColor Cyan
Write-Host ""

$f = "src\controllers\auth.controller.js"
$bk = "_backup_AK_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $bk | Out-Null
Copy-Item $f "$bk\auth.controller.js.bak" -Force
Write-Host "[BACKUP] $bk" -ForegroundColor Green
Write-Host ""

# Voir le bloc INSERT actuel
Write-Host "--- Bloc INSERT user_details ACTUEL ---" -ForegroundColor Yellow
$lines = Get-Content $f
$startIdx = -1
$valuesStart = -1
$valuesEnd = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "INSERT INTO user_details") { $startIdx = $i }
    if ($startIdx -ge 0 -and $lines[$i] -match "\) VALUES \(") { $valuesStart = $i }
    if ($valuesStart -ge 0 -and $lines[$i] -match "^\s*\)\s*$") { $valuesEnd = $i; break }
}

for ($i = $startIdx; $i -le $valuesEnd; $i++) {
    $color = "Gray"
    if ($lines[$i] -match "INSERT|VALUES|\)\s*$") { $color = "Yellow" }
    if ($lines[$i] -match "\?") { $color = "Cyan" }
    Write-Host (" {0,4} | {1}" -f ($i+1), $lines[$i]) -ForegroundColor $color
}
Write-Host ""

Write-Host " Cols : $(([regex]::Match((($lines[$startIdx..$valuesStart]) -join ' '), 'INSERT INTO user_details\s*\(([^)]+)\)')).Groups[1].Value -split ',').Count" -ForegroundColor Yellow
Write-Host " ? : $(([regex]::Matches((($lines[$valuesStart..$valuesEnd]) -join ' '), '\?')).Count)" -ForegroundColor Yellow
Write-Host ""

# Trouver la ligne avec le '?' en trop
# Ligne 191 : totem, fonctions_camps, personnes_prevenir, conditions_engagement, qr_code_data  (5 colonnes)
# Ligne 201 : ?, ?, ?, ?, ?  (5 ?)
# Ligne 192 : created_at, updated_at  (2 colonnes)
# Ligne 202 : ?, ?  (2 ?)

# Le '?' en trop est sur la ligne 200
# Chercher la ligne avec exactement '        ?, ?,' (sans 3e ?)
$targetLine = -1
for ($i = $valuesStart; $i -le $valuesEnd; $i++) {
    if ($lines[$i] -match "^\s*\?,\s*\?,\s*$" -and $lines[$i] -notmatch "\?,\s*\?,\s*\?") {
        # Cette ligne a 2 ?
        # La ligne AVANT a 5 ? et APRES a 2 ?
        # On a besoin de 2 + 5 + 2 = 9 ? sur les 3 dernieres lignes (engagement_accepte, engagement_date, totem, fonctions_camps, personnes_prevenir, conditions_engagement, qr_code_data, created_at, updated_at)
        $targetLine = $i
    }
}

# Afficher les 4 dernieres lignes de VALUES
Write-Host "--- 4 dernieres lignes de VALUES ---" -ForegroundColor Yellow
for ($i = $valuesEnd - 4; $i -le $valuesEnd; $i++) {
    Write-Host (" {0,4} | {1}" -f ($i+1), $lines[$i]) -ForegroundColor Gray
}
Write-Host ""
Read-Host " Entree pour fermer"