"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Keyboard, Play, Pause, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KeystrokeEntry {
  key: string;
  timestamp: number;
  formattedTimestamp: string;
}

export default function KeystrokeChroniclePage() {
  const [keystrokes, setKeystrokes] = useState<KeystrokeEntry[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const now = Date.now();
    const newEntry: KeystrokeEntry = {
      key: event.key,
      timestamp: now,
      formattedTimestamp: new Date(now).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        fractionalSecondDigits: 3 
      }),
    };
    setKeystrokes((prev) => [newEntry, ...prev.slice(0, 499)]); // Keep last 500 keystrokes
  }, []); // setKeystrokes is stable

  useEffect(() => {
    if (!isClient) return;

    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, isClient, handleKeyDown]);

  const toggleRecording = () => {
    if (!isClient) return;
    setIsRecording((prev) => {
      const newState = !prev;
      toast({
        title: newState ? "Recording Started" : "Recording Stopped",
        description: newState ? "Capturing keystrokes..." : "Keystroke capture paused.",
        duration: 3000,
      });
      return newState;
    });
  };

  const exportLogs = () => {
    if (!isClient || keystrokes.length === 0) {
      toast({
        title: "Export Failed",
        description: "No keystrokes to export or client not ready.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    const logData = keystrokes
      .slice() 
      .reverse() // Chronological order for export
      .map(entry => `${entry.formattedTimestamp} - Key: ${formatKeyDisplay(entry.key, true)}`)
      .join('\n'); // Use \n for newline characters in the text file
    
    const blob = new Blob([logData], { type: 'text/plain;charset=utf-8' });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `keystrokes-${dateStr}.txt`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({
      title: "Export Successful",
      description: `Logs saved to ${filename}`,
      duration: 3000,
    });
  };

  const clearLogs = () => {
    if (!isClient) return;
    setKeystrokes([]);
    toast({
      title: "Logs Cleared",
      description: "All captured keystrokes have been cleared.",
      duration: 3000,
    });
  };

  const formatKeyDisplay = (key: string, forExport: boolean = false) => {
    // For better readability in live monitor
    const displayMap: { [key: string]: string } = {
      ' ': forExport ? '[Space]' : '␣',
      'Enter': '[Enter]',
      'Tab': '[Tab]',
      'Backspace': '[Backspace]',
      'Delete': '[Delete]',
      'ArrowUp': '[↑]',
      'ArrowDown': '[↓]',
      'ArrowLeft': '[←]',
      'ArrowRight': '[→]',
      'Escape': '[Esc]',
      'ControlLeft': '[Ctrl]',
      'ControlRight': '[Ctrl]',
      'AltLeft': '[Alt]',
      'AltRight': '[Alt]',
      'ShiftLeft': '[Shift]',
      'ShiftRight': '[Shift]',
      'MetaLeft': '[Meta]', // Cmd/Windows key
      'MetaRight': '[Meta]',
      'OSLeft': '[OS]', // Some systems report OS key
      'OSRight': '[OS]',
    };

    if (displayMap[key]) {
      return displayMap[key];
    }

    // For function keys or other named keys not in map
    if (key.length > 1 && (key.match(/F[0-9]+/) || ['CapsLock', 'ScrollLock', 'NumLock', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'PrintScreen', 'Pause'].includes(key))) {
        return `[${key}]`;
    }
    
    return key; // For printable characters
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b shadow-md bg-card">
        <div className="flex items-center gap-3">
          <Keyboard className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">Keystroke Chronicle</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={toggleRecording} variant={isRecording ? "default" : "outline"} className="w-48 tabular-nums">
            {isRecording ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          <Button onClick={exportLogs} variant="outline" disabled={!isClient || keystrokes.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
          <Button onClick={clearLogs} variant="destructive" disabled={!isClient || keystrokes.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </header>

      <main className="flex-grow p-6 overflow-hidden">
        <Card className="h-full flex flex-col shadow-xl rounded-lg border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-2xl">Live Keystroke Monitor</CardTitle>
            <CardDescription>
              {isRecording ? "Actively recording keystrokes from your keyboard." : "Recording is paused. Press 'Start Recording' to begin."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full w-full">
              <div className="p-6 space-y-2 text-sm">
                {keystrokes.length === 0 && (
                  <div className="flex items-center justify-center h-full pt-10">
                    <p className="text-muted-foreground text-lg">
                      {isRecording ? "Waiting for keystrokes..." : "No keystrokes recorded yet. Start recording to see live input."}
                    </p>
                  </div>
                )}
                {keystrokes.map((entry, index) => (
                  <div 
                    key={`${entry.timestamp}-${index}-${entry.key}`} 
                    className="flex justify-between items-center p-2 rounded-md hover:bg-secondary/50 transition-colors duration-100 ease-in-out border border-transparent hover:border-primary/30"
                    aria-label={`Keystroke: ${formatKeyDisplay(entry.key, true)} at ${entry.formattedTimestamp}`}
                  >
                    <span className="text-muted-foreground tabular-nums">{entry.formattedTimestamp}</span>
                    <span className="font-semibold text-base px-3 py-1 bg-muted rounded shadow-sm min-w-[80px] text-center border border-border">{formatKeyDisplay(entry.key)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
