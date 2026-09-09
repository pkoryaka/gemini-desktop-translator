using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public class CopyNative {
    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("psapi.dll")]
    private static extern int EmptyWorkingSet(IntPtr hwProc);

    [DllImport("kernel32.dll")]
    private static extern bool SetProcessWorkingSetSize(IntPtr proc, int min, int max);

    private const int KEYEVENTF_KEYUP = 0x0002;
    private const byte VK_SHIFT = 0x10;
    private const byte VK_CONTROL = 0x11;
    private const byte VK_MENU = 0x12; // Alt key
    private const byte VK_LWIN = 0x5B;
    private const byte VK_RWIN = 0x5C;
    private const byte VK_C = 0x43;
    private const byte VK_V = 0x56;

    public static void Main(string[] args) {
        if (args.Length > 0 && args[0].ToLower() == "trim") {
            TrimProcessMemory();
            return;
        }

        bool isPaste = (args.Length > 0 && args[0].ToLower() == "paste");

        if (!isPaste) {
            // 1. When capturing (Copy), pause slightly to ensure physical modifier key settling (e.g. user pressing Alt+A)
            Thread.Sleep(25);
        }

        // 2. Force release modifier keys
        keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_RWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

        if (!isPaste) {
            Thread.Sleep(15);
        } else {
            Thread.Sleep(5);
        }

        byte targetKey = isPaste ? VK_V : VK_C;

        // 3. Synthesize clean Ctrl + C or Ctrl + V keystroke
        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        Thread.Sleep(10);
        keybd_event(targetKey, 0, 0, UIntPtr.Zero);
        Thread.Sleep(isPaste ? 15 : 25);
        keybd_event(targetKey, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    private static void TrimProcessMemory() {
        string[] targetNames = new string[] { "electron", "nativelingo" };
        foreach (string name in targetNames) {
            try {
                Process[] procs = Process.GetProcessesByName(name);
                foreach (Process p in procs) {
                    try {
                        EmptyWorkingSet(p.Handle);
                        SetProcessWorkingSetSize(p.Handle, -1, -1);
                    } catch {}
                }
            } catch {}
        }
    }
}
