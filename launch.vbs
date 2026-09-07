Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath

electronExe = strPath & "\node_modules\electron\dist\electron.exe"

args = ""
If WScript.Arguments.Count > 0 Then
  For i = 0 To WScript.Arguments.Count - 1
    args = args & " """ & WScript.Arguments(i) & """"
  Next
End If

If fso.FileExists(electronExe) Then
  WshShell.Run """" & electronExe & """ """ & strPath & """" & args, 0, False
Else
  WshShell.Run "cmd /c call """ & strPath & "\start.bat""" & args, 0, False
End If

Set WshShell = Nothing
Set fso = Nothing

