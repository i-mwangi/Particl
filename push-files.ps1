# Script to push each file individually to GitHub

$repoPath = "C:\Users\Administrator\Music\latexv"
Set-Location $repoPath

# Get all untracked and modified files
$gitStatus = git status --porcelain

if ($null -eq $gitStatus -or $gitStatus.Count -eq 0) {
    Write-Host "No files to push" -ForegroundColor Green
    exit 0
}

# Process each file
$files = @($gitStatus) | Where-Object { $_.Trim() -ne "" }

foreach ($line in $files) {
    $status = $line.Substring(0, 2).Trim()
    $filePath = $line.Substring(3).Trim()

    if ([string]::IsNullOrWhiteSpace($filePath)) {
        continue
    }

    Write-Host ("Processing: " + $filePath) -ForegroundColor Cyan

    # Add the file
    git add $filePath

    # Create a descriptive commit message
    if ($status -eq "??") {
        $message = "Add " + $filePath
    } else {
        $message = "Update " + $filePath
    }

    # Commit
    git commit -m $message

    # Push
    git push

    Write-Host ("Pushed: " + $filePath) -ForegroundColor Green
    Write-Host ""
}

Write-Host "All files pushed successfully!" -ForegroundColor Green
