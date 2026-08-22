Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\samie\source\repos\quran\public\favicon.png"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$densities = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}
foreach ($d in $densities.Keys) {
    $dir = "C:\Users\samie\source\repos\quran\android\app\src\main\res\" + $d
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $size = $densities[$d]
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $bmp.Save($dir + "\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($dir + "\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}
$srcImg.Dispose()
Write-Host "Icons generated successfully"
