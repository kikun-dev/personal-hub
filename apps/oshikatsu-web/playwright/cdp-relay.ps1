param(
  [Parameter(Mandatory = $true)]
  [string]$ListenAddress,
  [Parameter(Mandatory = $true)]
  [int]$ListenPort,
  [int]$TargetPort = 9222
)

$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Parse($ListenAddress),
  $ListenPort
)
$client = $null
$target = $null

try {
  $listener.Start()
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
