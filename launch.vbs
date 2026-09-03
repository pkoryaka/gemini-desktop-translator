Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath

nodeExe = "node"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
  nodeExe = """C:\Program Files\nodejs\node.exe"""
End If

args = ""
If WScript.Arguments.Count > 0 Then
  For i = 0 To WScript.Arguments.Count - 1
    args = args & " " & WScript.Arguments(i)
  Next
Else
  args = " --hidden"
End If

cmdLine = nodeExe & " """ & strPath & "\node_modules\electron\cli.js"" """ & strPath & """" & args
WshShell.Run cmdLine, 0, True
Set WshShell = Nothing
Set fso = Nothing
