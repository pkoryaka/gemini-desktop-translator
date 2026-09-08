Set WshShell = CreateObject("WScript.Shell")
WScript.Sleep 40
If WScript.Arguments.Count > 0 And LCase(WScript.Arguments(0)) = "paste" Then
  WshShell.SendKeys "^v"
Else
  WshShell.SendKeys "^c"
End If
