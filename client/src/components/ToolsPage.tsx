import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  FileText, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Search, 
  Globe, 
  MessageCircle, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  ExternalLink, 
  Sparkles, 
  RotateCcw,
  FolderPlus,
  File,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  Clock,
  Sparkle,
  PhoneCall
} from 'lucide-react';
import GlassIcons, { GlassIconsItem } from './GlassIcons';
import api from '../services/api';

interface NoteFile {
  id: string;
  title: string;
  content: string;
  updatedAt?: string | Date;
}

export const ToolsPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'calculator' | 'notepad' | 'todos' | 'calendar' | 'google' | 'developer'>('calculator');

  // --- Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<string | null>(null);
  const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

  // --- Multi-File Notepad State ---
  const [noteFiles, setNoteFiles] = useState<NoteFile[]>([
    { id: 'default-1', title: 'General Institute Notes', content: 'Welcome to Nitin Sir Classes Cloud Notepad.\nAll files and notes are synced directly to your database.', updatedAt: new Date() }
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('default-1');
  const [newFileTitle, setNewFileTitle] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedStatus, setNotesSavedStatus] = useState(false);

  // --- Todos State ---
  const [todos, setTodos] = useState<{ _id?: string; text: string; completed: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [savingTodos, setSavingTodos] = useState(false);

  // --- Full Interactive Calendar State ---
  const today = new Date();
  const [calYear, setCalYear] = useState<number>(today.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // --- Google & Sarkari Jobs Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeJobCategory, setActiveJobCategory] = useState<'all' | 'central' | 'railway' | 'defence' | 'state' | 'ssc_upsc'>('all');

  // --- Load Data from DB ---
  useEffect(() => {
    const loadToolsData = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.success && res.data.data) {
          const data = res.data.data;
          if (Array.isArray(data.adminNoteFiles) && data.adminNoteFiles.length > 0) {
            setNoteFiles(data.adminNoteFiles);
            setActiveFileId(data.adminNoteFiles[0].id);
          } else if (data.adminNotes) {
            // Backward compatibility with previous single-note format
            const initialFiles: NoteFile[] = [
              { id: 'migrated-1', title: 'Primary Notepad', content: data.adminNotes, updatedAt: new Date() }
            ];
            setNoteFiles(initialFiles);
            setActiveFileId(initialFiles[0].id);
          }
          if (Array.isArray(data.adminTodos)) {
            setTodos(data.adminTodos);
          }
        }
      } catch (err) {
        console.error('Failed to load tools data:', err);
      }
    };
    loadToolsData();
  }, []);

  // --- Notepad Actions ---
  const currentActiveFile = noteFiles.find(f => f.id === activeFileId) || noteFiles[0] || {
    id: 'temp',
    title: 'Untitled Note',
    content: ''
  };

  const handleUpdateActiveContent = (newContent: string) => {
    setNoteFiles(prev => prev.map(f => f.id === currentActiveFile.id ? { ...f, content: newContent, updatedAt: new Date() } : f));
  };

  const handleUpdateActiveTitle = (newTitle: string) => {
    setNoteFiles(prev => prev.map(f => f.id === currentActiveFile.id ? { ...f, title: newTitle, updatedAt: new Date() } : f));
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) return;
    const newFile: NoteFile = {
      id: 'file_' + Date.now(),
      title: newFileTitle.trim(),
      content: '',
      updatedAt: new Date()
    };
    const updatedList = [newFile, ...noteFiles];
    setNoteFiles(updatedList);
    setActiveFileId(newFile.id);
    setNewFileTitle('');
    setIsCreatingFile(false);
    
    // Auto-save to DB
    try {
      await api.put('/settings', { adminNoteFiles: updatedList, adminNotes: newFile.content });
    } catch (err) {
      console.error('Failed to auto-save new file:', err);
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (noteFiles.length <= 1) {
      alert('You must keep at least one note file in your notebook.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this file? This action is permanent.')) return;
    const updated = noteFiles.filter(f => f.id !== fileId);
    setNoteFiles(updated);
    if (activeFileId === fileId) {
      setActiveFileId(updated[0].id);
    }
    try {
      await api.put('/settings', { adminNoteFiles: updated });
    } catch (err) {
      console.error('Failed to sync deletion:', err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      setNotesSavedStatus(false);
      await api.put('/settings', { 
        adminNoteFiles: noteFiles,
        adminNotes: currentActiveFile.content 
      });
      setNotesSavedStatus(true);
      setTimeout(() => setNotesSavedStatus(false), 2500);
    } catch (err: any) {
      alert('Error saving note files to database: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // --- Todos Actions ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const updated = [...todos, { text: newTodo.trim(), completed: false }];
    setTodos(updated);
    setNewTodo('');
    try {
      setSavingTodos(true);
      await api.put('/settings', { adminTodos: updated });
    } catch (err: any) {
      console.error('Failed to sync todos:', err);
    } finally {
      setSavingTodos(false);
    }
  };

  const handleToggleTodo = async (index: number) => {
    const updated = todos.map((t, i) => i === index ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    try {
      await api.put('/settings', { adminTodos: updated });
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const handleDeleteTodo = async (index: number) => {
    const updated = todos.filter((_, i) => i !== index);
    setTodos(updated);
    try {
      await api.put('/settings', { adminTodos: updated });
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  // --- Calculator Operations ---
  const inputDigit = (digit: string) => {
    if (calcWaitingForOperand) {
      setCalcDisplay(digit);
      setCalcWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? digit : calcDisplay + digit);
    }
  };

  const inputDecimal = () => {
    if (calcWaitingForOperand) {
      setCalcDisplay('0.');
      setCalcWaitingForOperand(false);
    } else if (calcDisplay.indexOf('.') === -1) {
      setCalcDisplay(calcDisplay + '.');
    }
  };

  const clearCalc = () => {
    setCalcDisplay('0');
    setCalcMemory(null);
    setCalcOperator(null);
    setCalcWaitingForOperand(false);
  };

  const performOp = (nextOperator: string) => {
    const inputValue = parseFloat(calcDisplay);
    if (calcMemory == null) {
      setCalcMemory(inputValue);
    } else if (calcOperator) {
      const currentValue = calcMemory || 0;
      let newValue = currentValue;
      if (calcOperator === '+') newValue = currentValue + inputValue;
      else if (calcOperator === '-') newValue = currentValue - inputValue;
      else if (calcOperator === '*') newValue = currentValue * inputValue;
      else if (calcOperator === '/') newValue = inputValue !== 0 ? currentValue / inputValue : 0;
      setCalcMemory(newValue);
      setCalcDisplay(String(newValue));
    }
    setCalcWaitingForOperand(true);
    setCalcOperator(nextOperator);
  };

  // --- Calendar Math ---
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
  };

  // Generate Year Range (e.g. 2020 to 2035)
  const yearsList = Array.from({ length: 25 }, (_, i) => 2018 + i);

  // --- Sarkari & Government Job Portals Data ---
  interface GovJobPortal {
    name: string;
    category: 'central' | 'railway' | 'defence' | 'state' | 'ssc_upsc';
    url: string;
    description: string;
    badge: string;
    popularSearch?: string;
  }

  const govPortals: GovJobPortal[] = [
    {
      name: 'Sarkari Result',
      category: 'central',
      url: 'https://www.sarkariresult.com',
      description: 'India\'s #1 portal for latest online forms, exam results, admit cards, and answer keys.',
      badge: 'Most Popular',
      popularSearch: 'sarkari result latest jobs'
    },
    {
      name: 'SSC Official Portal',
      category: 'ssc_upsc',
      url: 'https://ssc.gov.in',
      description: 'Staff Selection Commission: CGL, CHSL, MTS, GD Constable & CPO notifications.',
      badge: 'Central SSC',
      popularSearch: 'ssc cgl exam notification'
    },
    {
      name: 'UPSC Official Portal',
      category: 'ssc_upsc',
      url: 'https://upsc.gov.in',
      description: 'Union Public Service Commission: Civil Services (IAS/IPS), NDA, CDS, CAPF.',
      badge: 'Union PSC',
      popularSearch: 'upsc civil services preliminary'
    },
    {
      name: 'Railway RRB Recruitment',
      category: 'railway',
      url: 'https://www.rrbapply.gov.in',
      description: 'Railway Recruitment Boards: NTPC, Group D, ALP, Technician, and Junior Engineer vacancies.',
      badge: 'Indian Railways',
      popularSearch: 'railway rrb ntpc notification'
    },
    {
      name: 'FreeJobAlert.com',
      category: 'central',
      url: 'https://www.freejobalert.com',
      description: 'Comprehensive daily alerts for all Central, State, Bank, Police, and Engineering vacancies.',
      badge: 'Daily Alerts',
      popularSearch: 'free job alert india'
    },
    {
      name: 'Indian Army Join Official',
      category: 'defence',
      url: 'https://joinindianarmy.nic.in',
      description: 'Indian Army Agniveer, Officer Selection, NDA, TES, and Technical Graduate entries.',
      badge: 'Indian Army',
      popularSearch: 'join indian army agniveer apply'
    },
    {
      name: 'Indian Air Force (IAF)',
      category: 'defence',
      url: 'https://afcat.cdac.in',
      description: 'Air Force Common Admission Test (AFCAT), Agniveer Vayu, and Commissioned Officer posts.',
      badge: 'Air Force',
      popularSearch: 'afcat airforce recruitment'
    },
    {
      name: 'IBPS Banking Recruitment',
      category: 'central',
      url: 'https://www.ibps.in',
      description: 'Institute of Banking Personnel Selection: PO, Clerk, SO, and Regional Rural Bank (RRB) exams.',
      badge: 'Bank Jobs',
      popularSearch: 'ibps po clerk vacancy'
    },
    {
      name: 'RPSC Rajasthan Portal',
      category: 'state',
      url: 'https://rpsc.rajasthan.gov.in',
      description: 'Rajasthan Public Service Commission: RAS, 1st & 2nd Grade Teachers, SI, and State exams.',
      badge: 'Rajasthan State',
      popularSearch: 'rpsc rajasthan latest recruitment'
    },
    {
      name: 'RSMSSB Rajasthan Board',
      category: 'state',
      url: 'https://rsmssb.rajasthan.gov.in',
      description: 'Staff Selection Board: REET, Patwari, VDO, Junior Accountant, and CET examinations.',
      badge: 'RSMSSB State',
      popularSearch: 'rsmssb rajasthan cet result'
    },
    {
      name: 'UPSSSC & UP Govt Jobs',
      category: 'state',
      url: 'http://upsssc.gov.in',
      description: 'Uttar Pradesh Subordinate Services Selection Commission: PET, Lekhpal, and VDO posts.',
      badge: 'UP State',
      popularSearch: 'upsssc pet exam latest update'
    },
    {
      name: 'NTA Exam Portal (JEE / NEET)',
      category: 'central',
      url: 'https://nta.ac.in',
      description: 'National Testing Agency: JEE Main, NEET UG, CUET, UGC NET examination circulars.',
      badge: 'National Exams',
      popularSearch: 'nta entrance exam updates'
    }
  ];

  const filteredGovPortals = activeJobCategory === 'all' 
    ? govPortals 
    : govPortals.filter(p => p.category === activeJobCategory);

  // --- GlassIcons items dock ---
  const toolItems: GlassIconsItem[] = [
    {
      icon: <Calculator className="w-6 h-6" />,
      color: 'blue',
      label: 'Calculator',
      onClick: () => setActiveTool('calculator')
    },
    {
      icon: <FileText className="w-6 h-6" />,
      color: 'purple',
      label: 'Notebook & Files',
      onClick: () => setActiveTool('notepad')
    },
    {
      icon: <CheckSquare className="w-6 h-6" />,
      color: 'green',
      label: 'Tasks & Todos',
      onClick: () => setActiveTool('todos')
    },
    {
      icon: <CalendarIcon className="w-6 h-6" />,
      color: 'orange',
      label: 'Smart Calendar',
      onClick: () => setActiveTool('calendar')
    },
    {
      icon: <Search className="w-6 h-6" />,
      color: 'indigo',
      label: 'Google & Sarkari',
      onClick: () => setActiveTool('google')
    },
    {
      icon: <Globe className="w-6 h-6" />,
      color: 'teal',
      label: 'Developer Hub',
      onClick: () => setActiveTool('developer')
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold tracking-wide uppercase">
              Google-Grade Suite
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live DB Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Admin Smart Utilities & Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cloud multi-file notepad, Sarkari job hub, year-matrix academic calendar, and developer desk
          </p>
        </div>

        {/* Quick Tool Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'calculator', label: 'Calc' },
            { id: 'notepad', label: 'Files & Notes' },
            { id: 'todos', label: 'Tasks' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'google', label: 'Gov Jobs & Search' },
            { id: 'developer', label: 'Developer' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveTool(p.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTool === p.id 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* React Bits GlassIcons Launcher Dock */}
      <div className="neu-card p-6 sm:p-8 relative overflow-hidden">
        <div className="text-center mb-5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Interactive Tools Dock
          </span>
        </div>
        <div className="py-2">
          <GlassIcons
            items={toolItems}
            size={76}
            gap={48}
            columns={6}
            roundness={0.65}
            plate="tilt"
            tilt={25}
            spread={0.45}
            hover="press"
            labels="always"
            theme="dark"
          />
        </div>
      </div>

      {/* Active Tool Viewport */}
      <div className="neu-card p-6 sm:p-8 min-h-[500px]">
        {/* ============================================================== */}
        {/* 1. SMART BUSINESS CALCULATOR */}
        {/* ============================================================== */}
        {activeTool === 'calculator' && (
          <div className="max-w-xs mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Smart Business Calculator
              </h2>
              <button
                type="button"
                onClick={clearCalc}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>

            {/* Display screen */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 text-right shadow-inner">
              <div className="text-[11px] text-slate-400 font-mono h-4">
                {calcMemory !== null && calcOperator ? `${calcMemory} ${calcOperator}` : ''}
              </div>
              <div className="text-3xl font-extrabold tracking-tight font-mono overflow-x-auto">
                {calcDisplay}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2.5 pt-2">
              {['C', '±', '%', '/'].map((op, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (op === 'C') clearCalc();
                    else if (op === '±') setCalcDisplay(String(-parseFloat(calcDisplay)));
                    else if (op === '%') setCalcDisplay(String(parseFloat(calcDisplay) / 100));
                    else performOp(op);
                  }}
                  className="py-3 rounded-xl bg-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-300 transition"
                >
                  {op}
                </button>
              ))}

              {['7', '8', '9', '*'].map((key, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => i < 3 ? inputDigit(key) : performOp(key)}
                  className={`py-3 rounded-xl font-bold text-sm transition ${
                    i < 3 ? 'neu-button text-slate-900' : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {key}
                </button>
              ))}

              {['4', '5', '6', '-'].map((key, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => i < 3 ? inputDigit(key) : performOp(key)}
                  className={`py-3 rounded-xl font-bold text-sm transition ${
                    i < 3 ? 'neu-button text-slate-900' : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {key}
                </button>
              ))}

              {['1', '2', '3', '+'].map((key, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => i < 3 ? inputDigit(key) : performOp(key)}
                  className={`py-3 rounded-xl font-bold text-sm transition ${
                    i < 3 ? 'neu-button text-slate-900' : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {key}
                </button>
              ))}

              <button
                type="button"
                onClick={() => inputDigit('0')}
                className="col-span-2 py-3 rounded-xl neu-button text-slate-900 font-bold text-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={inputDecimal}
                className="py-3 rounded-xl neu-button text-slate-900 font-bold text-sm"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => {
                  if (calcOperator && calcMemory !== null) {
                    performOp('=');
                    setCalcOperator(null);
                  }
                }}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md"
              >
                =
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. MULTI-FILE CLOUD NOTEPAD (SAVED IN DB) */}
        {/* ============================================================== */}
        {activeTool === 'notepad' && (
          <div className="space-y-4">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Admin Cloud Multi-File Notepad
                </h2>
                <p className="text-xs text-slate-500">
                  Organize notices, fee logs, parent records, and syllabus into distinct database-stored files
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {notesSavedStatus && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Check className="w-3.5 h-3.5" /> All Files Synced to DB
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(true)}
                  className="neu-button px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1 hover:text-slate-900"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
                  New File
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="neu-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNotes ? 'Saving...' : 'Save All to Cloud'}
                </button>
              </div>
            </div>

            {/* Modal / Inline input to create a new file */}
            {isCreatingFile && (
              <form onSubmit={handleCreateFile} className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row items-center gap-2 animate-fade-in">
                <File className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  placeholder="Enter file name (e.g., Class 10 Batch Timings, Fee Followup List)..."
                  className="flex-1 neu-input px-3 py-1.5 text-xs font-medium"
                />
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <button
                    type="submit"
                    className="neu-button-primary px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                  >
                    Create File
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingFile(false); setNewFileTitle(''); }}
                    className="neu-button px-3 py-1.5 text-xs font-bold text-slate-600 whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Dual Pane: Left File Tabs / Right Editor */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              {/* Files Explorer Pane */}
              <div className="md:col-span-1 space-y-1.5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Your Cloud Files ({noteFiles.length})</span>
                </div>
                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                  {noteFiles.map(file => {
                    const isActive = file.id === currentActiveFile.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => setActiveFileId(file.id)}
                        className={`group p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                          isActive 
                            ? 'bg-purple-600 text-white font-bold shadow-sm' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <File className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                          <span className="truncate">{file.title}</span>
                        </div>
                        {noteFiles.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded transition hover:text-red-500 ${
                              isActive ? 'text-white/80 hover:bg-white/20' : 'text-slate-400 hover:bg-slate-200'
                            }`}
                            title="Delete File"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editor Workspace Pane */}
              <div className="md:col-span-3 space-y-2">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400">File Title:</span>
                  <input
                    type="text"
                    value={currentActiveFile.title}
                    onChange={(e) => handleUpdateActiveTitle(e.target.value)}
                    className="flex-1 text-xs font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0"
                    placeholder="File Title..."
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentActiveFile.content.length} chars
                  </span>
                </div>

                <textarea
                  rows={16}
                  value={currentActiveFile.content}
                  onChange={(e) => handleUpdateActiveContent(e.target.value)}
                  placeholder={`Write notes for "${currentActiveFile.title}" here...\nChanges are stored in your cloud database when you click Save All.`}
                  className="w-full neu-input p-4 text-xs font-mono leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. TASK MANAGER & TO-DOS (SAVED IN DB) */}
        {/* ============================================================== */}
        {activeTool === 'todos' && (
          <div className="space-y-5 max-w-2xl mx-auto">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Admin Task Manager & To-Do List
              </h2>
              <p className="text-xs text-slate-500">
                Track pending errands, calls, fees follow-up, and library seat tasks
              </p>
            </div>

            <form onSubmit={handleAddTodo} className="flex gap-2">
              <input
                type="text"
                required
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a new task (e.g. Call Rahul's parent regarding library renewal)..."
                className="flex-1 neu-input px-3.5 py-2.5 text-xs font-medium"
              />
              <button
                type="submit"
                disabled={savingTodos}
                className="neu-button-primary px-4 py-2.5 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {todos.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-100/60 rounded-xl">
                  No pending tasks. Add your first reminder above!
                </div>
              ) : (
                todos.map((todo, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTodo(idx)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                          todo.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {todo.completed && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span className={`text-xs ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {todo.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTodo(idx)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. SMART FULL YEAR & MONTHS ACADEMIC CALENDAR */}
        {/* ============================================================== */}
        {activeTool === 'calendar' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Calendar Controls & Year Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-orange-600" />
                  Interactive Multi-Year & Monthly Academic Calendar
                </h2>
                <p className="text-xs text-slate-500">
                  Switch across any year and month to inspect admission cycles, exam dates, and batch schedules
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="neu-button px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  Jump to Today
                </button>

                {/* Year Select dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowYearDropdown(prev => !prev)}
                    className="neu-button px-3.5 py-1.5 text-xs font-bold text-slate-900 flex items-center gap-1.5"
                  >
                    <span>Year: {calYear}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {showYearDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-20 grid grid-cols-2 gap-1 animate-fade-in">
                      {yearsList.map(yr => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setCalYear(yr);
                            setShowYearDropdown(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
                            yr === calYear
                              ? 'bg-orange-600 text-white font-bold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick 12 Months Selector Bar */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 p-2 rounded-2xl bg-slate-100/80 border border-slate-200">
              {monthNames.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCalMonth(idx)}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center transition ${
                    calMonth === idx
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'hover:bg-white text-slate-600'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Month Card Visualizer */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-extrabold font-mono tracking-tight text-white">
                    {monthNames[calMonth]} {calYear}
                  </h3>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {daysInMonth(calYear, calMonth)} Days in Month
                  </span>
                </div>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <span key={i} className={`font-bold py-1 ${i === 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {d}
                  </span>
                ))}

                {/* Blank days before start of month */}
                {Array.from({ length: firstDayOfWeek(calYear, calMonth) }).map((_, i) => (
                  <div key={`blank-${i}`} className="py-2.5 rounded-xl text-xs opacity-20 text-slate-600">
                    -
                  </div>
                ))}

                {/* Actual Month Days */}
                {Array.from({ length: daysInMonth(calYear, calMonth) }).map((_, i) => {
                  const day = i + 1;
                  const isCurrentToday = 
                    day === today.getDate() && 
                    calMonth === today.getMonth() && 
                    calYear === today.getFullYear();

                  const dayOfWeek = new Date(calYear, calMonth, day).getDay();
                  const isSunday = dayOfWeek === 0;

                  return (
                    <div
                      key={day}
                      className={`py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition cursor-default ${
                        isCurrentToday
                          ? 'bg-blue-600 text-white font-extrabold shadow-lg shadow-blue-500/50 ring-2 ring-blue-400'
                          : isSunday
                            ? 'text-rose-300 bg-rose-950/20 hover:bg-rose-900/40'
                            : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span>{day}</span>
                      {isCurrentToday && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
                          Today
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. GOOGLE SEARCH + SARKARI RESULT & GOVT JOB HUB */}
        {/* ============================================================== */}
        {activeTool === 'google' && (
          <div className="space-y-7">
            {/* Top Google Search Bar */}
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Search className="w-3.5 h-3.5" />
                Live Web & Govt Notification Finder
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Google Search & Government Jobs Hub
              </h2>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Search official syllabus, exam dates, question banks, or launch verified links to Sarkari Result, SSC, UPSC, Railways, and Defense portals directly.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
                  }
                }}
                className="relative max-w-xl mx-auto"
              >
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Google for syllabus, notifications, or results..."
                  className="w-full neu-input py-3.5 pl-12 pr-28 text-sm font-medium"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 neu-button-primary px-4 py-2 text-xs font-bold"
                >
                  Search Web
                </button>
              </form>

              {/* Quick trending search tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {[
                  'Sarkari Result 2026',
                  'SSC CGL Notification',
                  'Railway RRB NTPC',
                  'UPSC CSE Syllabus',
                  'CBSE Class 10/12 Datesheet'
                ].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
                  >
                    <span>{q}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sarkari Job & Exam Portals Directory */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Verified Government Job & Result Portals
                  </h3>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: 'All Portals' },
                    { id: 'central', label: 'Central / Banking' },
                    { id: 'ssc_upsc', label: 'SSC & UPSC' },
                    { id: 'railway', label: 'Railways (RRB)' },
                    { id: 'defence', label: 'Army & Defence' },
                    { id: 'state', label: 'State Exams' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveJobCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        activeJobCategory === cat.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Govt Portals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredGovPortals.map((portal, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          {portal.badge}
                        </span>
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 group-hover:text-indigo-600 transition"
                          title="Open website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {portal.name}
                      </h4>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {portal.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={portal.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Visit Portal ↗
                      </a>
                      {portal.popularSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            window.open(`https://www.google.com/search?q=${encodeURIComponent(portal.popularSearch!)}`, '_blank');
                          }}
                          className="text-[10px] font-semibold text-slate-400 hover:text-slate-700"
                        >
                          Google Search
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. DEVELOPER HUB & WHATSAPP */}
        {/* ============================================================== */}
        {activeTool === 'developer' && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    Lead Fullstack Engineer
                  </span>
                  <h3 className="text-2xl font-extrabold text-white mt-0.5">Hardik Yadav</h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Globe className="w-6 h-6" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed relative z-10">
                Architect & developer behind the Nitin Sir Classes portal. For technical support, custom software upgrades, or feature enhancements, connect directly via WhatsApp or visit the portfolio website.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 relative z-10">
                <a
                  href="https://wa.me/919870772415?text=Hello%20Hardik,%20contacting%20regarding%20Nitin%20Sir%20Classes%20Portal"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat on WhatsApp (+91 9870772415)
                </a>

                <a
                  href="https://hardikyadav.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  hardikyadav.vercel.app
                </a>
              </div>
            </div>

            <div className="neu-card-sm p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800">Support & Inquiries:</p>
              <p>• Direct WhatsApp: <span className="font-mono font-bold text-slate-900">+91 9870772415</span></p>
              <p>• Portfolio & Works: <a href="https://hardikyadav.vercel.app" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">https://hardikyadav.vercel.app</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
