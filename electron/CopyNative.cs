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

    public static void Main() {
        // 1. Force-release modifier keys so they don't corrupt Ctrl+C
        keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_RWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(30);

        // 2. Synthesize clean Ctrl + C
        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        Thread.Sleep(20);
        keybd_event(VK_C, 0, 0, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_C, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(40);
    }
}
