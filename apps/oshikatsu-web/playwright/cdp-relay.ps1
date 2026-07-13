param(
  [Parameter(Mandatory = $true)]
  [string]$ListenAddress,
  [Parameter(Mandatory = $true)]
  [int]$ListenPort,
  [int]$TargetPort = 9222,
  [int]$AcceptTimeoutSeconds = 30
)

$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Parse($ListenAddress),
  $ListenPort
)
$client = $null
$target = $null

try {
  $listener.Start()

  # Do not leave the listener open forever if the parent exits before connecting.
  # NOTE: Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI, so keep this file ASCII-only.
  $deadline = [DateTime]::UtcNow.AddSeconds($AcceptTimeoutSeconds)

  while (-not $listener.Pending()) {
    if ([DateTime]::UtcNow -ge $deadline) {
      throw "CDP relay: no connection within $AcceptTimeoutSeconds seconds, exiting."
    }

    Start-Sleep -Milliseconds 100
  }

  $client = $listener.AcceptTcpClient()
  $target = [System.Net.Sockets.TcpClient]::new("127.0.0.1", $TargetPort)

  $clientStream = $client.GetStream()
  $targetStream = $target.GetStream()
  $clientToTarget = $clientStream.CopyToAsync($targetStream)
  $targetToClient = $targetStream.CopyToAsync($clientStream)

  [System.Threading.Tasks.Task]::WhenAny(
    $clientToTarget,
    $targetToClient
  ).GetAwaiter().GetResult() | Out-Null
}
finally {
  if ($client) {
    $client.Dispose()
  }

  if ($target) {
    $target.Dispose()
  }

  $listener.Stop()
}
