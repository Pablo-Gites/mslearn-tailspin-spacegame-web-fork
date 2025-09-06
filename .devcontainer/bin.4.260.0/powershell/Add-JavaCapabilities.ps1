[CmdletBinding()]
param()

# Define the JRE/JDK key names.
$jre6KeyName = "Software\JavaSoft\Java Runtime Environment\1.6"
$jre7KeyName = "Software\JavaSoft\Java Runtime Environment\1.7"
$jre8KeyName = "Software\JavaSoft\Java Runtime Environment\1.8"
$jdk6KeyName = "Software\JavaSoft\Java Development Kit\1.6"
$jdk7KeyName = "Software\JavaSoft\Java Development Kit\1.7"
$jdk8KeyName = "Software\JavaSoft\Java Development Kit\1.8"

# JRE/JDK keys for major version >= 9
$jdk9AndGreaterNameOracle = "Software\JavaSoft\JDK"
$jre9AndGreaterNameOracle = "Software\JavaSoft\JRE"
$jre9AndGreaterName = "Software\JavaSoft\Java Runtime Environment"
$jdk9AndGreaterName = "Software\JavaSoft\Java Development Kit"
$minimumMajorVersion9 = 9

# JRE/JDK keys for AdoptOpenJDK
$jdk9AndGreaterNameAdoptOpenJDK = "Software\AdoptOpenJDK\JDK"
$jdk9AndGreaterNameAdoptOpenJRE = "Software\AdoptOpenJDK\JRE"

# These keys required for several previous versions of AdoptOpenJDK that were published under the name Eclipse Foundation
$jdk9AndGreaterNameAdoptOpenJDKEclipseFoundation = "Software\Eclipse Foundation\JDK"
$jdk9AndGreaterNameAdoptOpenJREEclipseFoundation = "Software\Eclipse Foundation\JRE"

# These keys required for latest versions of AdoptOpenJDK since they started to publish under Eclipse Adoptium name from 22th October 2021 https://blog.adoptopenjdk.net/2021/03/transition-to-eclipse-an-update/ 
$jdk9AndGreaterNameAdoptOpenJDKEclipseAdoptium = "Software\Eclipse Adoptium\JDK"
$jdk9AndGreaterNameAdoptOpenJREEclipseAdoptium = "Software\Eclipse Adoptium\JRE"

# JRE/JDK keys for AdoptOpenJDK with openj9 runtime
$jdk9AndGreaterNameAdoptOpenJDKSemeru = "Software\Semeru\JDK"
$jdk9AndGreaterNameAdoptOpenJRESemeru = "Software\Semeru\JRE"

# JVM subdirectories for AdoptOpenJDK, since it could be ditributed with two different JVM versions, which are located in different subdirectories inside version directory
$jvmHotSpot = "hotspot\MSI"
$jvmOpenj9 = "openj9\MSI"

# Check for JRE.
$latestJre = $null
$null = Add-CapabilityFromRegistry -Name 'java_6' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jre6KeyName -ValueName 'JavaHome' -Value ([ref]$latestJre)
$null = Add-CapabilityFromRegistry -Name 'java_7' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jre7KeyName -ValueName 'JavaHome' -Value ([ref]$latestJre)
$null = Add-CapabilityFromRegistry -Name 'java_8' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jre8KeyName -ValueName 'JavaHome' -Value ([ref]$latestJre)
$null = Add-CapabilityFromRegistry -Name 'java_6_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jre6KeyName -ValueName 'JavaHome' -Value ([ref]$latestJre)
$null = Add-CapabilityFromRegistry -Name 'java_7_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jre7KeyName -ValueName 'JavaHome' -Value ([ref]$latestJre)
$null = Add-CapabilityFromRegistry -Name 'java_8_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jre8KeyName -ValueName 'JavaHome' -Value ([ref]$latestJre)

if  (-not (Test-Path env:DISABLE_JAVA_CAPABILITY_HIGHER_THAN_9)) {
    try {
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jre9AndGreaterName -ValueName 'JavaHome' -Value ([ref]$latestJre) -MinimumMajorVersion $minimumMajorVersion9
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jre9AndGreaterNameOracle -ValueName 'JavaHome' -Value ([ref]$latestJre) -MinimumMajorVersion $minimumMajorVersion9
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jre9AndGreaterName -ValueName 'JavaHome' -Value ([ref]$latestJre) -MinimumMajorVersion $minimumMajorVersion9
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jre9AndGreaterNameOracle -ValueName 'JavaHome' -Value ([ref]$latestJre) -MinimumMajorVersion $minimumMajorVersion9
    } catch {
        Write-Host "An error occured while trying to check if there are JRE >= 9"
        Write-Host $_
    }
}

# Check default reg keys for AdoptOpenJDK in case we didn't find JRE in JavaSoft
if (-not $latestJre) {
    # AdoptOpenJDK section
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJRE -ValueName 'Path' -Value ([ref]$latestJre) -VersionSubdirectory $jvmHotSpot -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJRE -ValueName 'Path' -Value ([ref]$latestJre) -VersionSubdirectory $jvmOpenj9 -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJREEclipseAdoptium -ValueName 'Path' -Value ([ref]$latestJre) -VersionSubdirectory $jvmHotSpot -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJREEclipseFoundation -ValueName 'Path' -Value ([ref]$latestJre) -VersionSubdirectory $jvmHotSpot -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'java_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJRESemeru -ValueName 'Path' -Value ([ref]$latestJre) -VersionSubdirectory $jvmOpenj9 -MinimumMajorVersion $minimumMajorVersion9
}

if ($latestJre) {
    # Favor x64.
    Write-Capability -Name 'java' -Value $latestJre
}

# Check for JDK.
$latestJdk = $null
$null = Add-CapabilityFromRegistry -Name 'jdk_6' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jdk6KeyName -ValueName 'JavaHome' -Value ([ref]$latestJdk)
$null = Add-CapabilityFromRegistry -Name 'jdk_7' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jdk7KeyName -ValueName 'JavaHome' -Value ([ref]$latestJdk)
$null = Add-CapabilityFromRegistry -Name 'jdk_8' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jdk8KeyName -ValueName 'JavaHome' -Value ([ref]$latestJdk)
$null = Add-CapabilityFromRegistry -Name 'jdk_6_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk6KeyName -ValueName 'JavaHome' -Value ([ref]$latestJdk)
$null = Add-CapabilityFromRegistry -Name 'jdk_7_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk7KeyName -ValueName 'JavaHome' -Value ([ref]$latestJdk)
$null = Add-CapabilityFromRegistry -Name 'jdk_8_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk8KeyName -ValueName 'JavaHome' -Value ([ref]$latestJdk)

if  (-not (Test-Path env:DISABLE_JAVA_CAPABILITY_HIGHER_THAN_9)) {
    try {
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jdk9AndGreaterName -ValueName 'JavaHome' -Value ([ref]$latestJdk) -MinimumMajorVersion $minimumMajorVersion9
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -Hive 'LocalMachine' -View 'Registry32' -KeyName $jdk9AndGreaterNameOracle -ValueName 'JavaHome' -Value ([ref]$latestJdk) -MinimumMajorVersion $minimumMajorVersion9
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterName -ValueName 'JavaHome' -Value ([ref]$latestJdk) -MinimumMajorVersion $minimumMajorVersion9
        $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameOracle -ValueName 'JavaHome' -Value ([ref]$latestJdk) -MinimumMajorVersion $minimumMajorVersion9
    } catch {
        Write-Host "An error occured while trying to check if there are JDK >= 9"
        Write-Host $_
    }
}

# Check default reg keys for AdoptOpenJDK in case we didn't find JDK in JavaSoft
if (-not $latestJdk) {
    # AdoptOpenJDK section
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJDK -ValueName 'Path' -Value ([ref]$latestJdk) -VersionSubdirectory $jvmHotSpot -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJDK -ValueName 'Path' -Value ([ref]$latestJdk) -VersionSubdirectory $jvmOpenj9 -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJDKEclipseAdoptium -ValueName 'Path' -Value ([ref]$latestJdk) -VersionSubdirectory $jvmHotSpot -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJDKEclipseFoundation -ValueName 'Path' -Value ([ref]$latestJdk) -VersionSubdirectory $jvmHotSpot -MinimumMajorVersion $minimumMajorVersion9
    $null = Add-CapabilityFromRegistryWithLastVersionAvailable -PrefixName 'jdk_' -PostfixName '_x64' -Hive 'LocalMachine' -View 'Registry64' -KeyName $jdk9AndGreaterNameAdoptOpenJDKSemeru -ValueName 'Path' -Value ([ref]$latestJdk) -VersionSubdirectory $jvmOpenj9 -MinimumMajorVersion $minimumMajorVersion9
}

if ($latestJdk) {
    # Favor x64.
    Write-Capability -Name 'jdk' -Value $latestJdk

    if (!($latestJre)) {
        Write-Capability -Name 'java' -Value $latestJdk
    }
}

# SIG # Begin signature block
# MIIoPAYJKoZIhvcNAQcCoIIoLTCCKCkCAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQH8w7YFlLCE63JNLG
# KX7zUQIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCDtdx6W3IWm4NNZ
# Y+FJnGe/lQhtti2MiuGIweZgtnCL46CCDYUwggYDMIID66ADAgECAhMzAAAEhJji
# EuB4ozFdAAAAAASEMA0GCSqGSIb3DQEBCwUAMH4xCzAJBgNVBAYTAlVTMRMwEQYD
# VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01pY3Jvc29mdCBDb2RlIFNpZ25p
# bmcgUENBIDIwMTEwHhcNMjUwNjE5MTgyMTM1WhcNMjYwNjE3MTgyMTM1WjB0MQsw
# CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
# ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMR4wHAYDVQQDExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
# AQDtekqMKDnzfsyc1T1QpHfFtr+rkir8ldzLPKmMXbRDouVXAsvBfd6E82tPj4Yz
# aSluGDQoX3NpMKooKeVFjjNRq37yyT/h1QTLMB8dpmsZ/70UM+U/sYxvt1PWWxLj
# MNIXqzB8PjG6i7H2YFgk4YOhfGSekvnzW13dLAtfjD0wiwREPvCNlilRz7XoFde5
# KO01eFiWeteh48qUOqUaAkIznC4XB3sFd1LWUmupXHK05QfJSmnei9qZJBYTt8Zh
# ArGDh7nQn+Y1jOA3oBiCUJ4n1CMaWdDhrgdMuu026oWAbfC3prqkUn8LWp28H+2S
# LetNG5KQZZwvy3Zcn7+PQGl5AgMBAAGjggGCMIIBfjAfBgNVHSUEGDAWBgorBgEE
# AYI3TAgBBggrBgEFBQcDAzAdBgNVHQ4EFgQUBN/0b6Fh6nMdE4FAxYG9kWCpbYUw
# VAYDVR0RBE0wS6RJMEcxLTArBgNVBAsTJE1pY3Jvc29mdCBJcmVsYW5kIE9wZXJh
# dGlvbnMgTGltaXRlZDEWMBQGA1UEBRMNMjMwMDEyKzUwNTM2MjAfBgNVHSMEGDAW
# gBRIbmTlUAXTgqoXNzcitW2oynUClTBUBgNVHR8ETTBLMEmgR6BFhkNodHRwOi8v
# d3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2NybC9NaWNDb2RTaWdQQ0EyMDExXzIw
# MTEtMDctMDguY3JsMGEGCCsGAQUFBwEBBFUwUzBRBggrBgEFBQcwAoZFaHR0cDov
# L3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNDb2RTaWdQQ0EyMDEx
# XzIwMTEtMDctMDguY3J0MAwGA1UdEwEB/wQCMAAwDQYJKoZIhvcNAQELBQADggIB
# AGLQps1XU4RTcoDIDLP6QG3NnRE3p/WSMp61Cs8Z+JUv3xJWGtBzYmCINmHVFv6i
# 8pYF/e79FNK6P1oKjduxqHSicBdg8Mj0k8kDFA/0eU26bPBRQUIaiWrhsDOrXWdL
# m7Zmu516oQoUWcINs4jBfjDEVV4bmgQYfe+4/MUJwQJ9h6mfE+kcCP4HlP4ChIQB
# UHoSymakcTBvZw+Qst7sbdt5KnQKkSEN01CzPG1awClCI6zLKf/vKIwnqHw/+Wvc
# Ar7gwKlWNmLwTNi807r9rWsXQep1Q8YMkIuGmZ0a1qCd3GuOkSRznz2/0ojeZVYh
# ZyohCQi1Bs+xfRkv/fy0HfV3mNyO22dFUvHzBZgqE5FbGjmUnrSr1x8lCrK+s4A+
# bOGp2IejOphWoZEPGOco/HEznZ5Lk6w6W+E2Jy3PHoFE0Y8TtkSE4/80Y2lBJhLj
# 27d8ueJ8IdQhSpL/WzTjjnuYH7Dx5o9pWdIGSaFNYuSqOYxrVW7N4AEQVRDZeqDc
# fqPG3O6r5SNsxXbd71DCIQURtUKss53ON+vrlV0rjiKBIdwvMNLQ9zK0jy77owDy
# XXoYkQxakN2uFIBO1UNAvCYXjs4rw3SRmBX9qiZ5ENxcn/pLMkiyb68QdwHUXz+1
# fI6ea3/jjpNPz6Dlc/RMcXIWeMMkhup/XEbwu73U+uz/MIIHejCCBWKgAwIBAgIK
# YQ6Q0gAAAAAAAzANBgkqhkiG9w0BAQsFADCBiDELMAkGA1UEBhMCVVMxEzARBgNV
# BAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jv
# c29mdCBDb3Jwb3JhdGlvbjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3QgQ2VydGlm
# aWNhdGUgQXV0aG9yaXR5IDIwMTEwHhcNMTEwNzA4MjA1OTA5WhcNMjYwNzA4MjEw
# OTA5WjB+MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UE
# BxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSgwJgYD
# VQQDEx9NaWNyb3NvZnQgQ29kZSBTaWduaW5nIFBDQSAyMDExMIICIjANBgkqhkiG
# 9w0BAQEFAAOCAg8AMIICCgKCAgEAq/D6chAcLq3YbqqCEE00uvK2WCGfQhsqa+la
# UKq4BjgaBEm6f8MMHt03a8YS2AvwOMKZBrDIOdUBFDFC04kNeWSHfpRgJGyvnkmc
# 6Whe0t+bU7IKLMOv2akrrnoJr9eWWcpgGgXpZnboMlImEi/nqwhQz7NEt13YxC4D
# dato88tt8zpcoRb0RrrgOGSsbmQ1eKagYw8t00CT+OPeBw3VXHmlSSnnDb6gE3e+
# lD3v++MrWhAfTVYoonpy4BI6t0le2O3tQ5GD2Xuye4Yb2T6xjF3oiU+EGvKhL1nk
# kDstrjNYxbc+/jLTswM9sbKvkjh+0p2ALPVOVpEhNSXDOW5kf1O6nA+tGSOEy/S6
# A4aN91/w0FK/jJSHvMAhdCVfGCi2zCcoOCWYOUo2z3yxkq4cI6epZuxhH2rhKEmd
# X4jiJV3TIUs+UsS1Vz8kA/DRelsv1SPjcF0PUUZ3s/gA4bysAoJf28AVs70b1FVL
# 5zmhD+kjSbwYuER8ReTBw3J64HLnJN+/RpnF78IcV9uDjexNSTCnq47f7Fufr/zd
# sGbiwZeBe+3W7UvnSSmnEyimp31ngOaKYnhfsi+E11ecXL93KCjx7W3DKI8sj0A3
# T8HhhUSJxAlMxdSlQy90lfdu+HggWCwTXWCVmj5PM4TasIgX3p5O9JawvEagbJjS
# 4NaIjAsCAwEAAaOCAe0wggHpMBAGCSsGAQQBgjcVAQQDAgEAMB0GA1UdDgQWBBRI
# bmTlUAXTgqoXNzcitW2oynUClTAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTAL
# BgNVHQ8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBRyLToCMZBD
# uRQFTuHqp8cx0SOJNDBaBgNVHR8EUzBRME+gTaBLhklodHRwOi8vY3JsLm1pY3Jv
# c29mdC5jb20vcGtpL2NybC9wcm9kdWN0cy9NaWNSb29DZXJBdXQyMDExXzIwMTFf
# MDNfMjIuY3JsMF4GCCsGAQUFBwEBBFIwUDBOBggrBgEFBQcwAoZCaHR0cDovL3d3
# dy5taWNyb3NvZnQuY29tL3BraS9jZXJ0cy9NaWNSb29DZXJBdXQyMDExXzIwMTFf
# MDNfMjIuY3J0MIGfBgNVHSAEgZcwgZQwgZEGCSsGAQQBgjcuAzCBgzA/BggrBgEF
# BQcCARYzaHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9kb2NzL3ByaW1h
# cnljcHMuaHRtMEAGCCsGAQUFBwICMDQeMiAdAEwAZQBnAGEAbABfAHAAbwBsAGkA
# YwB5AF8AcwB0AGEAdABlAG0AZQBuAHQALiAdMA0GCSqGSIb3DQEBCwUAA4ICAQBn
# 8oalmOBUeRou09h0ZyKbC5YR4WOSmUKWfdJ5DJDBZV8uLD74w3LRbYP+vj/oCso7
# v0epo/Np22O/IjWll11lhJB9i0ZQVdgMknzSGksc8zxCi1LQsP1r4z4HLimb5j0b
# pdS1HXeUOeLpZMlEPXh6I/MTfaaQdION9MsmAkYqwooQu6SpBQyb7Wj6aC6VoCo/
# KmtYSWMfCWluWpiW5IP0wI/zRive/DvQvTXvbiWu5a8n7dDd8w6vmSiXmE0OPQvy
# CInWH8MyGOLwxS3OW560STkKxgrCxq2u5bLZ2xWIUUVYODJxJxp/sfQn+N4sOiBp
# mLJZiWhub6e3dMNABQamASooPoI/E01mC8CzTfXhj38cbxV9Rad25UAqZaPDXVJi
# hsMdYzaXht/a8/jyFqGaJ+HNpZfQ7l1jQeNbB5yHPgZ3BtEGsXUfFL5hYbXw3MYb
# BL7fQccOKO7eZS/sl/ahXJbYANahRr1Z85elCUtIEJmAH9AAKcWxm6U/RXceNcbS
# oqKfenoi+kiVH6v7RyOA9Z74v2u3S5fi63V4GuzqN5l5GEv/1rMjaHXmr/r8i+sL
# gOppO6/8MO0ETI7f33VtY5E90Z1WTk+/gFcioXgRMiF670EKsT/7qMykXcGhiJtX
# cVZOSEXAQsmbdlsKgEhr/Xmfwb1tbWrJUnMTDXpQzTGCGg0wghoJAgEBMIGVMH4x
# CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRt
# b25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01p
# Y3Jvc29mdCBDb2RlIFNpZ25pbmcgUENBIDIwMTECEzMAAASEmOIS4HijMV0AAAAA
# BIQwDQYJYIZIAWUDBAIBBQCgga4wGQYJKoZIhvcNAQkDMQwGCisGAQQBgjcCAQQw
# HAYKKwYBBAGCNwIBCzEOMAwGCisGAQQBgjcCARUwLwYJKoZIhvcNAQkEMSIEIIrd
# MDE2ulW85JcpVHAlHy107l9gBeuxbWNBJsVcDX6kMEIGCisGAQQBgjcCAQwxNDAy
# oBSAEgBNAGkAYwByAG8AcwBvAGYAdKEagBhodHRwOi8vd3d3Lm1pY3Jvc29mdC5j
# b20wDQYJKoZIhvcNAQEBBQAEggEAPsjXxBU/RHusnYkuAbaL8i7RwM/aUwFgi6bm
# RtKRQ84q8gwSFpdnaErNe5IHK+72SShVpQimV1Ew5gg3hnvPvnVXbxydyFFC0r2x
# 7RWwmeH9zXk2/KA7n39h3w8jTAFbfy77ecVeQ45e+kCElMCl1oPDaqfqiSDJGLzk
# EcPOJuKPC0ubWv1apKbFE8YJsES59n4yeuh9n+EgcAilIrc6qQqo6FSzDbtHRKqb
# t4kgMgvAStY5CUfT5ztZ1hV+KuLOZcgtbunrcSMHSRxnaGKdB0nKWRqVSQArHZNy
# sUfoCTlFxfKTrXajMOFAxSjJjsCbG2qhsnirN3erRrUWeP7L7qGCF5cwgheTBgor
# BgEEAYI3AwMBMYIXgzCCF38GCSqGSIb3DQEHAqCCF3AwghdsAgEDMQ8wDQYJYIZI
# AWUDBAIBBQAwggFSBgsqhkiG9w0BCRABBKCCAUEEggE9MIIBOQIBAQYKKwYBBAGE
# WQoDATAxMA0GCWCGSAFlAwQCAQUABCB28mVZbp7PSkPLU654P2+0fK/GH8KaFcUD
# vGVlOXmlhQIGaEsHK4cdGBMyMDI1MDcyOTA5MzYyNy41MjdaMASAAgH0oIHRpIHO
# MIHLMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
# UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQL
# ExxNaWNyb3NvZnQgQW1lcmljYSBPcGVyYXRpb25zMScwJQYDVQQLEx5uU2hpZWxk
# IFRTUyBFU046REMwMC0wNUUwLUQ5NDcxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1l
# LVN0YW1wIFNlcnZpY2WgghHtMIIHIDCCBQigAwIBAgITMwAAAgO7HlwAOGx0ygAB
# AAACAzANBgkqhkiG9w0BAQsFADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2Fz
# aGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENv
# cnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAx
# MDAeFw0yNTAxMzAxOTQyNDZaFw0yNjA0MjIxOTQyNDZaMIHLMQswCQYDVQQGEwJV
# UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UE
# ChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3NvZnQgQW1l
# cmljYSBPcGVyYXRpb25zMScwJQYDVQQLEx5uU2hpZWxkIFRTUyBFU046REMwMC0w
# NUUwLUQ5NDcxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Uw
# ggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQChl0MH5wAnOx8Uh8RtidF0
# J0yaFDHJYHTpPvRR16X1KxGDYfT8PrcGjCLCiaOu3K1DmUIU4Rc5olndjappNuOg
# zwUoj43VbbJx5PFTY/a1Z80tpqVP0OoKJlUkfDPSBLFgXWj6VgayRCINtLsUasy0
# w5gysD7ILPZuiQjace5KxASjKf2MVX1qfEzYBbTGNEijSQCKwwyc0eavr4Fo3X/+
# sCuuAtkTWissU64k8rK60jsGRApiESdfuHr0yWAmc7jTOPNeGAx6KCL2ktpnGegL
# Dd1IlE6Bu6BSwAIFHr7zOwIlFqyQuCe0SQALCbJhsT9y9iy61RJAXsU0u0TC5YYm
# TSbEI7g10dYx8Uj+vh9InLoKYC5DpKb311bYVd0bytbzlfTRslRTJgotnfCAIGML
# qEqk9/2VRGu9klJi1j9nVfqyYHYrMPOBXcrQYW0jmKNjOL47CaEArNzhDBia1wXd
# JANKqMvJ8pQe2m8/cibyDM+1BVZquNAov9N4tJF4ACtjX0jjXNDUMtSZoVFQH+Fk
# WdfPWx1uBIkc97R+xRLuPjUypHZ5A3AALSke4TaRBvbvTBYyW2HenOT7nYLKTO4j
# w5Qq6cw3Z9zTKSPQ6D5lyiYpes5RR2MdMvJS4fCcPJFeaVOvuWFSQ/EGtVBShhmL
# B+5ewzFzdpf1UuJmuOQTTwIDAQABo4IBSTCCAUUwHQYDVR0OBBYEFLIpWUB+EeeQ
# 29sWe0VdzxWQGJJ9MB8GA1UdIwQYMBaAFJ+nFV0AXmJdg/Tl0mWnG1M1GelyMF8G
# A1UdHwRYMFYwVKBSoFCGTmh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMv
# Y3JsL01pY3Jvc29mdCUyMFRpbWUtU3RhbXAlMjBQQ0ElMjAyMDEwKDEpLmNybDBs
# BggrBgEFBQcBAQRgMF4wXAYIKwYBBQUHMAKGUGh0dHA6Ly93d3cubWljcm9zb2Z0
# LmNvbS9wa2lvcHMvY2VydHMvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUy
# MDIwMTAoMSkuY3J0MAwGA1UdEwEB/wQCMAAwFgYDVR0lAQH/BAwwCgYIKwYBBQUH
# AwgwDgYDVR0PAQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4ICAQCQEMbesD6TC08R
# 0oYCdSC452AQrGf/O89GQ54CtgEsbxzwGDVUcmjXFcnaJSTNedBKVXkBgawRonP1
# LgxH4bzzVj2eWNmzGIwO1FlhldAPOHAzLBEHRoSZ4pddFtaQxoabU/N1vWyICiN6
# 0It85gnF5JD4MMXyd6pS8eADIi6TtjfgKPoumWa0BFQ/aEzjUrfPN1r7crK+qkmL
# ztw/ENS7zemfyx4kGRgwY1WBfFqm/nFlJDPQBicqeU3dOp9hj7WqD0Rc+/4VZ6wQ
# jesIyCkv5uhUNy2LhNDi2leYtAiIFpmjfNk4GngLvC2Tj9IrOMv20Srym5J/Fh7y
# WAiPeGs3yA3QapjZTtfr7NfzpBIJQ4xT/ic4WGWqhGlRlVBI5u6Ojw3ZxSZCLg3v
# RC4KYypkh8FdIWoKirjidEGlXsNOo+UP/YG5KhebiudTBxGecfJCuuUspIdRhStH
# AQsjv/dAqWBLlhorq2OCaP+wFhE3WPgnnx5pflvlujocPgsN24++ddHrl3O1FFab
# W8m0UkDHSKCh8QTwTkYOwu99iExBVWlbYZRz2qOIBjL/ozEhtCB0auKhfTLLeuNG
# BUaBz+oZZ+X9UAECoMhkETjb6YfNaI1T7vVAaiuhBoV/JCOQT+RYZrgykyPpzpmw
# MNFBD1vdW/29q9nkTWoEhcEOO0L9NzCCB3EwggVZoAMCAQICEzMAAAAVxedrngKb
# SZkAAAAAABUwDQYJKoZIhvcNAQELBQAwgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQI
# EwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
# ZnQgQ29ycG9yYXRpb24xMjAwBgNVBAMTKU1pY3Jvc29mdCBSb290IENlcnRpZmlj
# YXRlIEF1dGhvcml0eSAyMDEwMB4XDTIxMDkzMDE4MjIyNVoXDTMwMDkzMDE4MzIy
# NVowfDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcT
# B1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UE
# AxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTAwggIiMA0GCSqGSIb3DQEB
# AQUAA4ICDwAwggIKAoICAQDk4aZM57RyIQt5osvXJHm9DtWC0/3unAcH0qlsTnXI
# yjVX9gF/bErg4r25PhdgM/9cT8dm95VTcVrifkpa/rg2Z4VGIwy1jRPPdzLAEBjo
# YH1qUoNEt6aORmsHFPPFdvWGUNzBRMhxXFExN6AKOG6N7dcP2CZTfDlhAnrEqv1y
# aa8dq6z2Nr41JmTamDu6GnszrYBbfowQHJ1S/rboYiXcag/PXfT+jlPP1uyFVk3v
# 3byNpOORj7I5LFGc6XBpDco2LXCOMcg1KL3jtIckw+DJj361VI/c+gVVmG1oO5pG
# ve2krnopN6zL64NF50ZuyjLVwIYwXE8s4mKyzbnijYjklqwBSru+cakXW2dg3viS
# kR4dPf0gz3N9QZpGdc3EXzTdEonW/aUgfX782Z5F37ZyL9t9X4C626p+Nuw2TPYr
# bqgSUei/BQOj0XOmTTd0lBw0gg/wEPK3Rxjtp+iZfD9M269ewvPV2HM9Q07BMzlM
# jgK8QmguEOqEUUbi0b1qGFphAXPKZ6Je1yh2AuIzGHLXpyDwwvoSCtdjbwzJNmSL
# W6CmgyFdXzB0kZSU2LlQ+QuJYfM2BjUYhEfb3BvR/bLUHMVr9lxSUV0S2yW6r1AF
# emzFER1y7435UsSFF5PAPBXbGjfHCBUYP3irRbb1Hode2o+eFnJpxq57t7c+auIu
# rQIDAQABo4IB3TCCAdkwEgYJKwYBBAGCNxUBBAUCAwEAATAjBgkrBgEEAYI3FQIE
# FgQUKqdS/mTEmr6CkTxGNSnPEP8vBO4wHQYDVR0OBBYEFJ+nFV0AXmJdg/Tl0mWn
# G1M1GelyMFwGA1UdIARVMFMwUQYMKwYBBAGCN0yDfQEBMEEwPwYIKwYBBQUHAgEW
# M2h0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvRG9jcy9SZXBvc2l0b3J5
# Lmh0bTATBgNVHSUEDDAKBggrBgEFBQcDCDAZBgkrBgEEAYI3FAIEDB4KAFMAdQBi
# AEMAQTALBgNVHQ8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBTV
# 9lbLj+iiXGJo0T2UkFvXzpoYxDBWBgNVHR8ETzBNMEugSaBHhkVodHRwOi8vY3Js
# Lm1pY3Jvc29mdC5jb20vcGtpL2NybC9wcm9kdWN0cy9NaWNSb29DZXJBdXRfMjAx
# MC0wNi0yMy5jcmwwWgYIKwYBBQUHAQEETjBMMEoGCCsGAQUFBzAChj5odHRwOi8v
# d3d3Lm1pY3Jvc29mdC5jb20vcGtpL2NlcnRzL01pY1Jvb0NlckF1dF8yMDEwLTA2
# LTIzLmNydDANBgkqhkiG9w0BAQsFAAOCAgEAnVV9/Cqt4SwfZwExJFvhnnJL/Klv
# 6lwUtj5OR2R4sQaTlz0xM7U518JxNj/aZGx80HU5bbsPMeTCj/ts0aGUGCLu6WZn
# OlNN3Zi6th542DYunKmCVgADsAW+iehp4LoJ7nvfam++Kctu2D9IdQHZGN5tggz1
# bSNU5HhTdSRXud2f8449xvNo32X2pFaq95W2KFUn0CS9QKC/GbYSEhFdPSfgQJY4
# rPf5KYnDvBewVIVCs/wMnosZiefwC2qBwoEZQhlSdYo2wh3DYXMuLGt7bj8sCXgU
# 6ZGyqVvfSaN0DLzskYDSPeZKPmY7T7uG+jIa2Zb0j/aRAfbOxnT99kxybxCrdTDF
# NLB62FD+CljdQDzHVG2dY3RILLFORy3BFARxv2T5JL5zbcqOCb2zAVdJVGTZc9d/
# HltEAY5aGZFrDZ+kKNxnGSgkujhLmm77IVRrakURR6nxt67I6IleT53S0Ex2tVdU
# CbFpAUR+fKFhbHP+CrvsQWY9af3LwUFJfn6Tvsv4O+S3Fb+0zj6lMVGEvL8CwYKi
# excdFYmNcP7ntdAoGokLjzbaukz5m/8K6TT4JDVnK+ANuOaMmdbhIurwJ0I9JZTm
# dHRbatGePu1+oDEzfbzL6Xu/OHBE0ZDxyKs6ijoIYn/ZcGNTTY3ugm2lBRDBcQZq
# ELQdVTNYs6FwZvKhggNQMIICOAIBATCB+aGB0aSBzjCByzELMAkGA1UEBhMCVVMx
# EzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoT
# FU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJp
# Y2EgT3BlcmF0aW9uczEnMCUGA1UECxMeblNoaWVsZCBUU1MgRVNOOkRDMDAtMDVF
# MC1EOTQ3MSUwIwYDVQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNloiMK
# AQEwBwYFKw4DAhoDFQDNrxRX/iz6ss1lBCXG8P1LFxD0e6CBgzCBgKR+MHwxCzAJ
# BgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25k
# MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jv
# c29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMA0GCSqGSIb3DQEBCwUAAgUA7DLPTDAi
# GA8yMDI1MDcyOTA0NDA0NFoYDzIwMjUwNzMwMDQ0MDQ0WjB3MD0GCisGAQQBhFkK
# BAExLzAtMAoCBQDsMs9MAgEAMAoCAQACAg9qAgH/MAcCAQACAhIaMAoCBQDsNCDM
# AgEAMDYGCisGAQQBhFkKBAIxKDAmMAwGCisGAQQBhFkKAwKgCjAIAgEAAgMHoSCh
# CjAIAgEAAgMBhqAwDQYJKoZIhvcNAQELBQADggEBADZdeDFbTKN86FYxM7AXFw7d
# K18aQDG6+mnW3dhEVymlC4W2kRyuhufhi5xYwBTXaCW3o/dmFo5hJp8EvP2sSdmH
# 69UiLm6widCRKy/cCf/0FV8Yqlm8PXVKkgddR4fUli3o5kz22WF8hUiZZmp32Zx7
# 0JNpLlR6JW+QrTSr/swhBBnE894kgKlikvFKRCtbvQTsf2o/GKHBRi2HPnROqWcp
# xfpwgM4B6poapS1Y5Ty3VUDdGIiz9v3L/7KxignlZNMX+gX3pFttgIpp90aAC0xv
# OUliQ9pcqbco2BhIQ0WbNHA8OG+ZL8VRGy+7/4ogi0VBPBYiLxq3wB3bPGeiyp8x
# ggQNMIIECQIBATCBkzB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
# bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0
# aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAA
# AgO7HlwAOGx0ygABAAACAzANBglghkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkD
# MQ0GCyqGSIb3DQEJEAEEMC8GCSqGSIb3DQEJBDEiBCCfFZReMNB874F3Xz2rFJU8
# XReAWq91qW4BZQpSl5yYtjCB+gYLKoZIhvcNAQkQAi8xgeowgecwgeQwgb0EIEsD
# 3RtxlvaTxFOZZnpQw0DksPmVduo5SyK9h9w++hMtMIGYMIGApH4wfDELMAkGA1UE
# BhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
# BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0
# IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAIDux5cADhsdMoAAQAAAgMwIgQgGwlj
# V7t/i44eaKTgXmgdAFHJz4ug9Yg7HnNDEpMPriowDQYJKoZIhvcNAQELBQAEggIA
# F6allJNF6OnCYi2Z8APj7X4UukxtTYUA32V7YYSZFNuGM7fvKFBWYMzNWYHIYchp
# hwVJTGxInZjtw2Ajr6vFeeaHawTz0f+bbnsUClUTb5qSL4P+UDum+dT18moXtQpm
# 4aVpPI4Wa5N22arJJCXaMPzHcylwzCJeux3eX84pTO16xcbI4OjEIkQQO9uvBwI5
# E6y+blPtWJag5tpiluqIGbtMY5DtweiMX9mtUO3iST9GdIdMvhMC2Y4PVdRvDEOB
# 4I8d1PLa48kEIgBEsztnDiRi9MsZixbzSjsj9Spwd/LDib3bEJcJ4LwR562g2CB7
# vZIqp/l4hW0JEpD/Wz4kQ8/KhAfjfpGwg4PKEo4/FmFOxzrR09dQFAP+wQ7X93sb
# rHkDhDPQOPX6Q6lbA9fqlU8Cc9uksIZmscZhPdbQ4/QJc2X8q1uXu/lL2CmXk6vU
# 59LapSXtcLaII1cqYXu1nStYWPRW5eOVDUVlrsZ0NZgOdQ1/gmRRKUfdmQgTybXC
# Ihgep1UI5JoUkxuxqlywyAT4bkdc3KX8J0LCRjOhPo1Chf1Xc4XFK9bRNtzN+uwk
# HRgBHJKwfUidBb/hXYTy/Rb8GhwbAqVVCDpVJznENphlLmXu5Wu448dQPxqaOXfZ
# Zmjp9UGVrSKbfBhqUCoKVqe8zRPUX2V8+ijLWoCMMS0=
# SIG # End signature block
