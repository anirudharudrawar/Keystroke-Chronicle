
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Keyboard, Play, Pause, Download, Trash2, BrainCircuit, Loader2, AlertCircle, Gauge, Delete, ListOrdered, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeKeystrokes, type AnalyzeKeystrokesOutput } from '@/ai/flows/analyze-keystrokes-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';


interface KeystrokeEntry {
  key: string;
  timestamp: number;
  formattedTimestamp: string;
}

type KeystrokeCategory =
  | 'Letter'
  | 'Number'
  | 'Symbol'
  | 'Whitespace'
  | 'Navigation'
  | 'Modifier'
  | 'Function'
  | 'Editing'
  | 'System'
  | 'Other';

const ALL_CATEGORIES: KeystrokeCategory[] = [
  'Letter', 'Number', 'Symbol', 'Whitespace', 'Navigation', 'Modifier', 'Function', 'Editing', 'System', 'Other'
];

function getKeyCategory(key: string): KeystrokeCategory {
  // Modifiers (check first as they can be part of other keys like Ctrl+C)
  if (key.startsWith('Shift') || key.startsWith('Control') || key.startsWith('Alt') || key.startsWith('Meta') || key.startsWith('OS')) return 'Modifier';

  // Letters
  if (key.length === 1 && /^[a-zA-Z]$/.test(key)) return 'Letter';

  // Numbers (top row and numpad keys that report as digits)
  if (key.length === 1 && /^[0-9]$/.test(key)) return 'Number';

  if (/^Numpad[0-9]$/.test(key)) return 'Number';
  if (key === 'NumpadDecimal') return 'Symbol'; // Or 'Number' depending on preference
  if (key === 'NumpadEnter') return 'Whitespace';
  if (['NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide'].includes(key)) return 'Symbol';


  // Whitespace
  if (key === ' ' || key === 'Spacebar' || key === 'Enter' || key === 'Tab') return 'Whitespace';

  // Navigation
  if (key.startsWith('Arrow') || ['Home', 'End', 'PageUp', 'PageDown'].includes(key)) return 'Navigation';

  // Function Keys
  if (/^F([1-9]|1[0-2])$/.test(key)) return 'Function'; // F1-F12

  // Editing Keys
  if (['Backspace', 'Delete', 'Insert'].includes(key)) return 'Editing';

  // System Keys
  if (['Escape', 'PrintScreen', 'Pause', 'CapsLock', 'NumLock', 'ScrollLock'].includes(key)) return 'System';

  // Symbols & Punctuation
  if (key.length === 1 && /[~`!@#$%^&*()_\-+=[\]{}|\\;:'",<.>/?]/.test(key)) return 'Symbol';

  return 'Other';
}


const TOP_N_KEYS = 5;

export default function KeystrokeChroniclePage() {
  const [keystrokes, setKeystrokes] = useState<KeystrokeEntry[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeKeystrokesOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Metrics State
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalKeys, setTotalKeys] = useState<number>(0);
  const [backspaceCount, setBackspaceCount] = useState<number>(0);
  const [kpm, setKpm] = useState<number>(0);

  // Frequent Keys State
  const [keyFrequencies, setKeyFrequencies] = useState<Record<string, number>>({});
  const [topKeys, setTopKeys] = useState<{ key: string; count: number }[]>([]);

  // Filter State
  const [selectedCategories, setSelectedCategories] = useState<Set<KeystrokeCategory>>(new Set(ALL_CATEGORIES));


  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update KPM periodically
  useEffect(() => {
    if (isRecording && startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const durationMinutes = (now - startTime) / (1000 * 60);
        if (durationMinutes > 0) {
          setKpm(Math.round(totalKeys / durationMinutes));
        }
      }, 2000); // Update every 2 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isRecording && startTime && totalKeys > 0) {
          const finalDurationMinutes = (Date.now() - startTime) / (1000 * 60);
          if (finalDurationMinutes > 0.01) { // Avoid division by zero or tiny numbers
              setKpm(Math.round(totalKeys / finalDurationMinutes));
          } else {
               setKpm(0); // Or calculate based on a minimum duration
          }
      } else if (!isRecording) { // If stopped and no keys or never started
          setKpm(0);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, startTime, totalKeys]);

  // Calculate top keys when frequencies change
  useEffect(() => {
    const sortedKeys = Object.entries(keyFrequencies)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
    setTopKeys(sortedKeys.slice(0, TOP_N_KEYS));
  }, [keyFrequencies]);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore input if focus is on an input element, button, or inside a dialog
     if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLButtonElement || (event.target as HTMLElement)?.closest('[role="dialog"]')) {
        return;
    }
    // Ignore modifier keys themselves if they are the only key pressed (allow Ctrl+C etc.)
    if (['Control', 'Shift', 'Alt', 'Meta', 'OS'].includes(event.key)) {
        // Check if it's part of a combo - this is complex, basic check for now
        // A more robust solution might track modifier state separately
        return;
    }

    const now = Date.now();
    const newEntry: KeystrokeEntry = {
      key: event.key, // Store raw event.key
      timestamp: now,
      formattedTimestamp: new Date(now).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      }),
    };

    setTotalKeys((prev) => prev + 1);
    if (event.key === 'Backspace') {
      setBackspaceCount((prev) => prev + 1);
    }

    setKeystrokes((prev) => [newEntry, ...prev.slice(0, 499)]); // Keep max 500 entries

    const displayKey = formatKeyDisplay(event.key, false); // Use formatted key for display frequency
    setKeyFrequencies((prevFrequencies) => ({
      ...prevFrequencies,
      [displayKey]: (prevFrequencies[displayKey] || 0) + 1,
    }));

  }, []); // No dependencies needed here


  useEffect(() => {
    if (!isClient) return;

    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
      if (!startTime) { // Only set startTime if it's null (e.g. first start or after clear)
          setStartTime(Date.now());
      }
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, isClient, handleKeyDown, startTime]);

  const toggleRecording = () => {
    if (!isClient) return;
    const nextRecordingState = !isRecording;
    setIsRecording(nextRecordingState);

    if (nextRecordingState) {
      // Reset metrics only if starting fresh or after a clear
      if (!startTime || totalKeys === 0) {
        setStartTime(Date.now());
        setTotalKeys(0);
        setBackspaceCount(0);
        setKpm(0);
        setKeyFrequencies({});
        setTopKeys([]);
        // Do not clear keystrokes or analysis results here, let clearLogs handle that
      }
      toast({
        title: "Recording Started",
        description: "Capturing keystrokes and metrics...",
        duration: 3000,
      });
    } else {
      // Calculate final KPM when stopping
      if (startTime && totalKeys > 0) {
        const finalDurationMinutes = (Date.now() - startTime) / (1000 * 60);
        if (finalDurationMinutes > 0.01) {
          setKpm(Math.round(totalKeys / finalDurationMinutes));
        }
      }
      toast({
        title: "Recording Stopped",
        description: "Keystroke capture paused.",
        duration: 3000,
      });
    }
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

    // Export ALL keystrokes, not filtered ones
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
    setAnalysisResult(null);
    setAnalysisError(null);
    // Reset metrics
    setStartTime(null); // Reset start time so it's fresh for next recording
    setTotalKeys(0);
    setBackspaceCount(0);
    setKpm(0);
    setKeyFrequencies({});
    setTopKeys([]);
    toast({
      title: "Logs & Metrics Cleared",
      description: "All captured data has been cleared.",
      duration: 3000,
    });
  };

  const formatKeyDisplay = (key: string, forExportOrAI: boolean = false) => {
    const displayMap: { [key: string]: string } = {
      ' ': forExportOrAI ? '[Space]' : '␣',
      'Spacebar': forExportOrAI ? '[Space]' : '␣', // Handle Spacebar variant
      'Enter': '[Enter]',
      'Tab': '[Tab]',
      'Backspace': '[Backspace]',
      'Delete': '[Delete]',
      'ArrowUp': forExportOrAI ? '[ArrowUp]' : '↑',
      'ArrowDown': forExportOrAI ? '[ArrowDown]' : '↓',
      'ArrowLeft': forExportOrAI ? '[ArrowLeft]' : '←',
      'ArrowRight': forExportOrAI ? '[ArrowRight]' : '→',
      'Escape': '[Esc]',
      'Control': '[Ctrl]',
      'Alt': '[Alt]',
      'Shift': '[Shift]',
      'Meta': '[Meta]', // Meta key (Windows key/Command key)
      'OS': '[OS]', // OS specific key, often same as Meta
      'CapsLock': '[CapsLock]',
      'NumLock': '[NumLock]',
      'ScrollLock': '[ScrollLock]',
      'Insert': '[Insert]',
      'Home': '[Home]',
      'End': '[End]',
      'PageUp': '[PageUp]',
      'PageDown': '[PageDown]',
      'PrintScreen': '[PrtSc]',
      'Pause': '[Pause]',
      // Function keys F1-F12
      ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `[F${i + 1}]`])),
      // Numpad keys
      'Numpad0': '[Num0]', 'Numpad1': '[Num1]', 'Numpad2': '[Num2]', 'Numpad3': '[Num3]',
      'Numpad4': '[Num4]', 'Numpad5': '[Num5]', 'Numpad6': '[Num6]', 'Numpad7': '[Num7]',
      'Numpad8': '[Num8]', 'Numpad9': '[Num9]',
      'NumpadDecimal': '[Num.]', 'NumpadEnter': '[NumEnter]',
      'NumpadAdd': '[Num+]', 'NumpadSubtract': '[Num-]',
      'NumpadMultiply': '[Num*]', 'NumpadDivide': '[Num/]',
    };

    // Handle modifier keys that might have Left/Right suffix (e.g., ShiftLeft, ControlRight)
    if (key.startsWith('Control') || key.startsWith('Alt') || key.startsWith('Shift') || key.startsWith('Meta') || key.startsWith('OS')) {
        // Normalize to base modifier name for display map
        const baseModifier = key.replace(/Left|Right/, '');
        return displayMap[baseModifier] ?? `[${key}]`; // Fallback to raw if not in map
    }

    // For dead keys, event.key can be "Dead" or specific like "Dead^".
    if (key.startsWith('Dead')) return '[Dead]';


    return displayMap[key] ?? (key.length > 1 ? `[${key}]` : key);
  };

  const handleAnalyze = async () => {
    if (!isClient || keystrokes.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    toast({
      title: "Analysis Started",
      description: "Sending keystroke data for analysis...",
      duration: 3000, // Shorter duration, as it's just an indicator
    });


    // Use ALL keystrokes for analysis, not filtered ones
    const keystrokeSequence = keystrokes
      .slice()
      .reverse() // Chronological order for analysis
      .map(entry => formatKeyDisplay(entry.key, true)) // Format for AI
      .join(' ');

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

  const MetricCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card className="bg-secondary/50 shadow-inner border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );

  const filteredKeystrokes = keystrokes.filter(entry =>
    selectedCategories.has(getKeyCategory(entry.key))
  );


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-secondary/30">
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b shadow-md backdrop-blur-md bg-card/80 border-border">
        <div className="flex items-center gap-3">
          <Keyboard className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Keystroke Chronicle</h1>
          {!isClient && <Badge variant="outline">Initializing...</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {/* Prominent Start/Stop Button */}
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"} // Use destructive variant for stop action
            className="w-48 transition-colors duration-200 tabular-nums"
            disabled={!isClient}
            aria-live="polite"
            aria-label={isRecording ? 'Stop recording keystrokes' : 'Start recording keystrokes'}
          >
            {isRecording ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!isClient} aria-label="Filter displayed keystrokes by category">
                <ListFilter className="w-4 h-4 mr-2" />
                Filter ({selectedCategories.size}/{ALL_CATEGORIES.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedCategories.size === ALL_CATEGORIES.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedCategories(new Set(ALL_CATEGORIES));
                  } else {
                    setSelectedCategories(new Set());
                  }
                }}
                aria-label={selectedCategories.size === ALL_CATEGORIES.length && selectedCategories.size > 0 ? 'Deselect all categories' : 'Select all categories'}
              >
                {selectedCategories.size === ALL_CATEGORIES.length && selectedCategories.size > 0 ? 'Deselect All' : 'Select All'}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {ALL_CATEGORIES.map(category => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.has(category)}
                  onCheckedChange={(checked) => {
                    setSelectedCategories(prev => {
                      const next = new Set(prev);
                      if (checked) {
                        next.add(category);
                      } else {
                        next.delete(category);
                      }
                      return next;
                    });
                  }}
                  aria-label={`Toggle filter for ${category} keystrokes`}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Analyze Button */}
           <Button
            onClick={handleAnalyze}
            variant="outline"
            disabled={!isClient || keystrokes.length === 0 || isAnalyzing || isRecording}
            aria-disabled={!isClient || keystrokes.length === 0 || isAnalyzing || isRecording}
            title={isRecording ? "Stop recording to analyze" : (keystrokes.length === 0 ? "Record keystrokes to analyze" : "Analyze the current session")}
            aria-label="Analyze recorded keystroke session"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <BrainCircuit className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Session'}
          </Button>
          {/* Export Button */}
          <Button
            onClick={exportLogs}
            variant="outline"
            disabled={!isClient || keystrokes.length === 0}
            aria-disabled={!isClient || keystrokes.length === 0}
            aria-label="Export recorded keystrokes to a text file"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export Logs
          </Button>
          {/* Clear Button */}
          <Button
            onClick={clearLogs}
            variant="outline" // Changed from destructive to outline for less emphasis, but keep icon
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={!isClient || (keystrokes.length === 0 && totalKeys === 0)} // Disable if no data at all
            aria-disabled={!isClient || (keystrokes.length === 0 && totalKeys === 0)}
            aria-label="Clear all recorded keystrokes, metrics, and analysis results"
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Clear Data
          </Button>
        </div>
      </header>

      <main className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">

        <Card className="lg:col-span-2 h-[75vh] flex flex-col shadow-lg rounded-lg border-border overflow-hidden bg-card/90 backdrop-blur-sm">
           <CardHeader className="border-b border-border/80">
            <CardTitle className="text-2xl text-foreground">Live Keystroke Monitor</CardTitle>
            <CardDescription className="text-muted-foreground" aria-live="polite">
              {isRecording ? "Actively recording keystrokes..." : "Recording is paused. Press 'Start Recording' to begin."}
              {!isClient && " (Initializing...)"}
              {isClient && keystrokes.length > 0 && ` Displaying ${filteredKeystrokes.length} of ${keystrokes.length} recorded keystrokes based on filter.`}
              {isClient && keystrokes.length === 0 && !isRecording && " Ready to record."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="p-6 space-y-2 text-sm font-mono">
                {keystrokes.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full pt-10 text-center">
                    <Keyboard size={48} className="text-muted-foreground mb-4" aria-hidden="true"/>
                    <p className="text-muted-foreground text-lg">
                      {isRecording ? "Waiting for first keystroke..." : "No keystrokes recorded yet. Press 'Start Recording' to capture input."}
                    </p>
                  </div>
                )}
                {filteredKeystrokes.length === 0 && keystrokes.length > 0 && (
                  <div className="flex flex-col items-center justify-center h-full pt-10 text-center">
                    <ListFilter size={48} className="text-muted-foreground mb-4" aria-hidden="true"/>
                    <p className="text-muted-foreground text-lg">
                      No keystrokes match the current filter criteria.
                    </p>
                    <p className="text-muted-foreground text-sm">Adjust filters or record more data.</p>
                  </div>
                )}
                {filteredKeystrokes.map((entry, index) => (
                  <div
                    key={`${entry.timestamp}-${index}-${entry.key}`} // index is from filteredKeystrokes, timestamp and key provide uniqueness
                    className="flex justify-between items-center p-2 rounded-md hover:bg-primary/10 transition-colors duration-100 ease-in-out border border-transparent hover:border-primary/20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
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

        <div className="flex flex-col gap-6 lg:col-span-1 h-[75vh] overflow-y-auto pr-2 pb-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent scrollbar-webkit">
            <Card className="shadow-lg rounded-lg border-border bg-card/90 backdrop-blur-sm">
              <CardHeader className="border-b border-border/80 pb-4">
                <CardTitle className="text-xl text-foreground">Live Session Metrics</CardTitle>
                <CardDescription className="text-muted-foreground" aria-live="polite">
                  {isRecording ? "Real-time statistics for the current recording session." : "Statistics from the last recording session."} Based on all captured keystrokes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {isClient ? (
                    <>
                        <MetricCard title="Keystrokes Per Minute (KPM)" value={isRecording || totalKeys > 0 ? kpm : '--'} icon={Gauge} />
                        <MetricCard title="Total Keystrokes" value={isRecording || totalKeys > 0 ? totalKeys : '--'} icon={Keyboard} />
                        <MetricCard title="Backspace Count" value={isRecording || totalKeys > 0 ? backspaceCount : '--'} icon={Delete} />
                    </>
                ) : (
                   <div className="space-y-3">
                       <Skeleton className="h-20 w-full" />
                       <Skeleton className="h-20 w-full" />
                       <Skeleton className="h-20 w-full" />
                   </div>
                )}
                 {!isRecording && totalKeys > 0 && (
                     <p className="text-xs text-center text-muted-foreground pt-2" aria-live="polite">Metrics from the last session. Start recording for live updates.</p>
                 )}
                 {!isRecording && totalKeys === 0 && !analysisResult && !analysisError && ( // Only show if no analysis result/error either
                      <p className="text-xs text-center text-muted-foreground pt-2" aria-live="polite">Start recording to see live metrics.</p>
                 )}
              </CardContent>
            </Card>

            {/* Most Frequent Keys Card */}
            <Card className="shadow-lg rounded-lg border-border bg-card/90 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/80">
                <div className="space-y-1">
                    <CardTitle className="text-xl text-foreground">Most Frequent Keys</CardTitle>
                    <CardDescription className="text-muted-foreground">
                    Top {TOP_N_KEYS} pressed keys this session (all types).
                    </CardDescription>
                </div>
                <ListOrdered className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent className="p-4">
                {!isClient ? (
                  <div className="space-y-3 pt-2">
                    {Array.from({ length: TOP_N_KEYS }).map((_, i) => ( // Show skeletons for top N keys
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-7 w-16 rounded-md" />
                        <Skeleton className="h-5 w-28 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : topKeys.length > 0 ? (
                  <ul className="space-y-3 pt-2">
                    {topKeys.map((item, index) => (
                      <li key={index} className="flex justify-between items-center text-sm" aria-label={`${item.key} pressed ${item.count} times`}>
                        <Badge variant="outline" className="text-sm font-mono px-2 py-1 min-w-[50px] text-center shadow-sm border-primary/30 bg-primary/10 text-primary-foreground">{item.key}</Badge>
                        <div className="text-right">
                          <span className="font-semibold text-lg text-foreground tabular-nums">{item.count}</span>
                          <span className="text-xs text-muted-foreground ml-1">presses</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-6" aria-live="polite">
                    {totalKeys === 0 && !isRecording ? "No key data recorded. Start recording." : "Start typing to see frequent keys."}
                  </p>
                )}
              </CardContent>
            </Card>


            <Card className="shadow-lg rounded-lg border-border bg-card/90 backdrop-blur-sm">
              <CardHeader className="border-b border-border/80">
                <CardTitle className="text-xl text-foreground">AI Session Analysis</CardTitle>
                <CardDescription className="text-muted-foreground">
                 AI-powered insights based on all recorded keystroke patterns.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 min-h-[150px]">
                {isAnalyzing ? (
                  <div className="space-y-4" aria-live="polite">
                    <p className="text-center text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true"/>
                        Analyzing patterns...
                    </p>
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                    <Skeleton className="h-4 w-5/6 mx-auto" />
                    <Skeleton className="h-4 w-4/6 mx-auto" />
                  </div>
                ) : analysisError ? (
                    <div role="alert" className="flex items-start text-destructive p-4 bg-destructive/10 rounded-md border border-destructive/30">
                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                            <p className="font-semibold mb-1">Analysis Error</p>
                            <p className="text-sm">{analysisError}</p>
                        </div>
                    </div>
                ) : analysisResult ? (
                  <div className="space-y-4" aria-live="polite">
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
                  <p className="text-muted-foreground text-center pt-8" aria-live="polite">
                     {isRecording
                        ? "Stop recording before analyzing the session."
                        : keystrokes.length > 0
                            ? "Click 'Analyze Session' to generate insights."
                            : "Record keystrokes first, then click 'Analyze Session'."}
                  </p>
                )}
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
