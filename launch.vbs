Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath

args = ""
If WScript.Arguments.Count > 0 Then
  For i = 0 To WScript.Arguments.Count - 1
    args = args & " " & WScript.Arguments(i)
  Next
End If

WshShell.Run "cmd /c call """ & strPath & "\start.bat""" & args, 0, True
Set WshShell = Nothing
Set fso = Nothing
