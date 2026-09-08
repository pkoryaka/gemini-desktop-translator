Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath

electronExe = strPath & "\node_modules\electron\dist\electron.exe"

args = ""
isHidden = False
If WScript.Arguments.Count > 0 Then
  For i = 0 To WScript.Arguments.Count - 1
    args = args & " """ & WScript.Arguments(i) & """"
    If InStr(LCase(WScript.Arguments(i)), "hidden") > 0 Or InStr(LCase(WScript.Arguments(i)), "minimized") > 0 Then
      isHidden = True
    End If
  Next
End If

windowStyle = 1
If isHidden Then
  windowStyle = 0
End If

If fso.FileExists(electronExe) Then
  WshShell.Run """" & electronExe & """ """ & strPath & """" & args, windowStyle, False
Else
  WshShell.Run "cmd /c call """ & strPath & "\start.bat""" & args, windowStyle, False
End If

Set WshShell = Nothing
Set fso = Nothing
