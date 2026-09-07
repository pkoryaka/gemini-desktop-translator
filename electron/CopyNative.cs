using System;
using System.Runtime.InteropServices;
using System.Threading;

public class CopyNative {
    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    private const int KEYEVENTF_KEYUP = 0x0002;
    private const byte VK_SHIFT = 0x10;
    private const byte VK_CONTROL = 0x11;
    private const byte VK_MENU = 0x12; // Alt key
    private const byte VK_LWIN = 0x5B;
    private const byte VK_RWIN = 0x5C;
    private const byte VK_C = 0x43;
    private const byte VK_V = 0x56;

    public static void Main(string[] args) {
        bool isPaste = (args.Length > 0 && args[0].ToLower() == "paste");

        // 1. Brief pause to ensure physical modifier state settling
        Thread.Sleep(20);

        // 2. Force release modifier keys
        keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_RWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(15);

        byte targetKey = isPaste ? VK_V : VK_C;

        // 3. Synthesize clean Ctrl + C or Ctrl + V keystroke
        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        Thread.Sleep(10);
        keybd_event(targetKey, 0, 0, UIntPtr.Zero);
        Thread.Sleep(25);
        keybd_event(targetKey, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(20);
    }
}

