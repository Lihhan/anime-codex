using System;
using System.Runtime.InteropServices;
using System.Threading;

// Only event counts cross the process boundary. Never dereference event data.
public static class AnimeInputPulse {
    private delegate IntPtr Hook(int code, IntPtr message, IntPtr data);
    private static Hook keyboardCallback = Keyboard;
    private static Hook mouseCallback = Mouse;
    private static IntPtr keyboard, mouse;
    private static int keys, clicks;
    private static uint thread;
    [StructLayout(LayoutKind.Sequential)] private struct Message {
        public IntPtr window; public uint message; public UIntPtr wParam;
        public IntPtr lParam; public uint time; public int x, y; public uint extra;
    }
    [DllImport("user32.dll", SetLastError=true)] private static extern IntPtr SetWindowsHookEx(int id, Hook callback, IntPtr module, uint threadId);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr handle);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr handle, int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] private static extern int GetMessage(out Message message, IntPtr window, uint min, uint max);
    [DllImport("user32.dll")] private static extern bool PeekMessage(out Message message, IntPtr window, uint min, uint max, uint remove);
    [DllImport("user32.dll")] private static extern bool TranslateMessage(ref Message message);
    [DllImport("user32.dll")] private static extern IntPtr DispatchMessage(ref Message message);
    [DllImport("user32.dll")] private static extern bool PostThreadMessage(uint id, uint message, UIntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string name);
    private static IntPtr Keyboard(int code, IntPtr message, IntPtr data) {
        long kind = message.ToInt64();
        if (code >= 0 && (kind == 0x100 || kind == 0x104)) Interlocked.Increment(ref keys);
        return CallNextHookEx(keyboard, code, message, data);
    }
    private static IntPtr Mouse(int code, IntPtr message, IntPtr data) {
        long kind = message.ToInt64();
        if (code >= 0 && (kind == 0x201 || kind == 0x204 || kind == 0x207 || kind == 0x20B)) Interlocked.Increment(ref clicks);
        return CallNextHookEx(mouse, code, message, data);
    }
    public static void Run() {
        thread = GetCurrentThreadId();
        Message message;
        PeekMessage(out message, IntPtr.Zero, 0, 0, 0);
        Timer timer = null;
        try {
            IntPtr module = GetModuleHandle(null);
            keyboard = SetWindowsHookEx(13, keyboardCallback, module, 0);
            mouse = SetWindowsHookEx(14, mouseCallback, module, 0);
            if (keyboard == IntPtr.Zero || mouse == IntPtr.Zero) throw new Exception("Input counter could not start: " + Marshal.GetLastWin32Error());
            Console.WriteLine("{\"ready\":true}");
            timer = new Timer(delegate(object ignored) {
                int k = Math.Min(100, Interlocked.Exchange(ref keys, 0));
                int c = Math.Min(20, Interlocked.Exchange(ref clicks, 0));
                try { Console.WriteLine("{\"keys\":" + k + ",\"clicks\":" + c + "}"); } catch { PostThreadMessage(thread, 0x12, UIntPtr.Zero, IntPtr.Zero); }
            }, null, 250, 250);
            // EOF means the owning app exited. Release both hooks immediately.
            ThreadPool.QueueUserWorkItem(delegate(object ignored) {
                try { while (Console.ReadLine() != null) {} } finally { PostThreadMessage(thread, 0x12, UIntPtr.Zero, IntPtr.Zero); }
            });
            while (GetMessage(out message, IntPtr.Zero, 0, 0) > 0) {
                TranslateMessage(ref message);
                DispatchMessage(ref message);
            }
        } finally {
            if (timer != null) timer.Dispose();
            if (keyboard != IntPtr.Zero) UnhookWindowsHookEx(keyboard);
            if (mouse != IntPtr.Zero) UnhookWindowsHookEx(mouse);
        }
    }
}
