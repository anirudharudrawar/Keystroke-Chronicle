
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Keyboard, Play, Pause, Download, Trash2, BrainCircuit, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeKeystrokes, type AnalyzeKeystrokesOutput } from '@/ai/flows/analyze-keystrokes-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface KeystrokeEntry {
  key: string;
  timestamp: number;
  formattedTimestamp: string;
}

export default function KeystrokeChroniclePage() {
  const [keystrokes, setKeystrokes] = useState<KeystrokeEntry[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeKeystrokesOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent capturing keys if an input field is focused
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
    }

    // Basic filter for modifier keys themselves if needed, though often captured for context
    // if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

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
    // Add to the beginning of the array
    setKeystrokes((prev) => [newEntry, ...prev.slice(0, 499)]); // Keep last 500 keystrokes
  }, []);


  useEffect(() => {
    if (!isClient) return;

    if (isRecording) {
      // Attach listener to window for global capture
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }

    // Cleanup listener on component unmount or when isRecording changes
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
      // Clear analysis when recording starts/stops
      setAnalysisResult(null);
      setAnalysisError(null);
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
      .join('\n');

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
    setAnalysisResult(null); // Also clear analysis
    setAnalysisError(null);
    toast({
      title: "Logs Cleared",
      description: "All captured keystrokes and analysis have been cleared.",
      duration: 3000,
    });
  };

  // Format key display for UI and export/analysis
  const formatKeyDisplay = (key: string, forExportOrAI: boolean = false) => {
    const displayMap: { [key: string]: string } = {
      ' ': forExportOrAI ? '[Space]' : '␣',
      'Enter': '[Enter]',
      'Tab': '[Tab]',
      'Backspace': '[Backspace]',
      'Delete': '[Delete]',
      'ArrowUp': forExportOrAI ? '[ArrowUp]' : '↑',
      'ArrowDown': forExportOrAI ? '[ArrowDown]' : '↓',
      'ArrowLeft': forExportOrAI ? '[ArrowLeft]' : '←',
      'ArrowRight': forExportOrAI ? '[ArrowRight]' : '→',
      'Escape': '[Esc]',
      'Control': '[Ctrl]', // Generic Ctrl
      'Alt': '[Alt]',       // Generic Alt
      'Shift': '[Shift]',   // Generic Shift
      'Meta': '[Meta]',     // Generic Meta/Win/Cmd
      'CapsLock': '[CapsLock]',
      'NumLock': '[NumLock]',
      'ScrollLock': '[ScrollLock]',
      'Insert': '[Insert]',
      'Home': '[Home]',
      'End': '[End]',
      'PageUp': '[PageUp]',
      'PageDown': '[PageDown]',
      'PrintScreen': '[PrintScreen]',
      'Pause': '[Pause]',
      // Add common function keys
      ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `[F${i + 1}]`])),
    };

    // Handle specific versions like ControlLeft, ShiftRight etc.
    if (key.startsWith('Control') || key.startsWith('Alt') || key.startsWith('Shift') || key.startsWith('Meta') || key.startsWith('OS')) {
        return displayMap[key.replace(/Left|Right/, '')] ?? `[${key}]`;
    }

    return displayMap[key] ?? (key.length > 1 ? `[${key}]` : key);
  };

  const handleAnalyze = async () => {
    if (!isClient || keystrokes.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    // Get keys in chronological order and format for AI
    const keystrokeSequence = keystrokes
      .slice()
      .reverse()
      .map(entry => formatKeyDisplay(entry.key, true))
      .join(' '); // Use space as a simple separator

    try {
      const result = await analyzeKeystrokes({ keystrokeSequence });
      setAnalysisResult(result);
      toast({
        title: "Analysis Complete",
        description: "Keystroke patterns analyzed successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
      setAnalysisError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-secondary/30">
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b shadow-md backdrop-blur-md bg-card/80 border-border">
        <div className="flex items-center gap-3">
          <Keyboard className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Keystroke Chronicle</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "default" : "outline"}
            className="w-48 transition-colors duration-200 tabular-nums"
            disabled={!isClient}
            aria-live="polite"
          >
            {isRecording ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
           <Button
            onClick={handleAnalyze}
            variant="outline"
            disabled={!isClient || keystrokes.length === 0 || isAnalyzing || isRecording}
            aria-disabled={!isClient || keystrokes.length === 0 || isAnalyzing || isRecording}
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BrainCircuit className="w-4 h-4 mr-2" />
            )}
            Analyze Session
          </Button>
          <Button
            onClick={exportLogs}
            variant="outline"
            disabled={!isClient || keystrokes.length === 0}
            aria-disabled={!isClient || keystrokes.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
          <Button
            onClick={clearLogs}
            variant="destructive"
            disabled={!isClient || keystrokes.length === 0}
            aria-disabled={!isClient || keystrokes.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </header>

      <main className="flex-grow p-6 space-y-6 overflow-hidden">
        {/* Keystroke Monitor Card */}
        <Card className="h-[60vh] flex flex-col shadow-lg rounded-lg border-border overflow-hidden bg-card/90 backdrop-blur-sm">
           <CardHeader className="border-b border-border/80">
            <CardTitle className="text-2xl text-foreground">Live Keystroke Monitor</CardTitle>
            <CardDescription className="text-muted-foreground">
              {isRecording ? "Actively recording keystrokes..." : "Recording is paused. Press 'Start Recording' to begin."}
              {!isClient && " (Initializing...)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="p-6 space-y-2 text-sm font-mono">
                {keystrokes.length === 0 && (
                  <div className="flex items-center justify-center h-full pt-10 text-center">
                    <p className="text-muted-foreground text-lg">
                      {isRecording ? "Waiting for first keystroke..." : "No keystrokes recorded yet. Start recording to capture input."}
                    </p>
                  </div>
                )}
                {keystrokes.map((entry, index) => (
                  <div
                    key={`${entry.timestamp}-${index}-${entry.key}`} // More robust key
                    className="flex justify-between items-center p-2 rounded-md hover:bg-primary/10 transition-colors duration-100 ease-in-out border border-transparent hover:border-primary/20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 duration-300"
                    aria-label={`Keystroke: ${formatKeyDisplay(entry.key, true)} at ${entry.formattedTimestamp}`}
                  >
                    <span className="text-muted-foreground tabular-nums text-xs">{entry.formattedTimestamp}</span>
                    <span className="font-semibold text-base px-3 py-1 bg-secondary/80 rounded shadow-sm min-w-[60px] text-center border border-border/50 text-foreground">{formatKeyDisplay(entry.key)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Analysis Card */}
        <Card className="shadow-lg rounded-lg border-border overflow-hidden bg-card/90 backdrop-blur-sm">
          <CardHeader className="border-b border-border/80">
            <CardTitle className="text-2xl text-foreground">Session Analysis</CardTitle>
            <CardDescription className="text-muted-foreground">
              Insights based on the recorded keystroke patterns. Analysis runs on the current recorded session data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 min-h-[150px]">
            {isAnalyzing ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : analysisError ? (
                <div className="flex items-center text-destructive">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <div>
                        <p className="font-semibold">Analysis Error</p>
                        <p className="text-sm">{analysisError}</p>
                    </div>
                </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg mb-1 text-foreground">Summary</h4>
                  <p className="text-muted-foreground">{analysisResult.summary}</p>
                </div>
                {analysisResult.identifiedPatterns && analysisResult.identifiedPatterns.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">Identified Patterns</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.identifiedPatterns.map((pattern, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">{pattern}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center pt-8">
                {keystrokes.length > 0 ? "Click 'Analyze Session' to generate insights from the recorded keystrokes." : "Record some keystrokes first, then click 'Analyze Session'."}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
