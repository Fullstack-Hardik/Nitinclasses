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
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import GlassIcons, { GlassIconsItem } from './GlassIcons';
import api from '../services/api';

export const ToolsPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'calculator' | 'notepad' | 'todos' | 'calendar' | 'google' | 'developer'>('calculator');

  // --- Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<string | null>(null);
  const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

  // --- Notepad State ---
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedStatus, setNotesSavedStatus] = useState(false);

  // --- Todos State ---
  const [todos, setTodos] = useState<{ _id?: string; text: string; completed: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [savingTodos, setSavingTodos] = useState(false);

  // --- Google Search State ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- Load Data from DB ---
  useEffect(() => {
    const loadToolsData = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.success && res.data.data) {
          if (res.data.data.adminNotes) {
            setNotes(res.data.data.adminNotes);
          }
          if (Array.isArray(res.data.data.adminTodos)) {
            setTodos(res.data.data.adminTodos);
          }
        }
      } catch (err) {
        console.error('Failed to load tools data:', err);
      }
    };
    loadToolsData();
  }, []);

  // --- Save Notes to DB ---
  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      setNotesSavedStatus(false);
      await api.put('/settings', { adminNotes: notes });
      setNotesSavedStatus(true);
      setTimeout(() => setNotesSavedStatus(false), 2500);
    } catch (err: any) {
      alert('Error saving notes: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // --- Save Todos to DB ---
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

  // GlassIcons items list
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
      label: 'Notepad',
      onClick: () => setActiveTool('notepad')
    },
    {
      icon: <CheckSquare className="w-6 h-6" />,
      color: 'green',
      label: 'To-Do List',
      onClick: () => setActiveTool('todos')
    },
    {
      icon: <CalendarIcon className="w-6 h-6" />,
      color: 'orange',
      label: 'Calendar',
      onClick: () => setActiveTool('calendar')
    },
    {
      icon: <Search className="w-6 h-6" />,
      color: 'indigo',
      label: 'Google Search',
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Admin Power Tools
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Integrated smart utilities, persistent database notepad, tasks, and developer hub
        </p>
      </div>

      {/* React Bits GlassIcons Launcher Grid */}
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
      <div className="neu-card p-6 sm:p-8 min-h-[460px]">
        {/* 1. SMART CALCULATOR */}
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

        {/* 2. NOTEPAD (SAVED IN DB) */}
        {activeTool === 'notepad' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Admin Persistent Cloud Notepad
                </h2>
                <p className="text-xs text-slate-500">
                  Notes are stored directly in your database. Access them anywhere from any device.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notesSavedStatus && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved to DB
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="neu-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNotes ? 'Saving...' : 'Save Notepad'}
                </button>
              </div>
            </div>

            <textarea
              rows={14}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type your coaching memos, pending fee reminders, batch timings, or contact notes here..."
              className="w-full neu-input p-4 text-xs font-mono leading-relaxed"
            />
          </div>
        )}

        {/* 3. TO-DO LIST (SAVED IN DB) */}
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

        {/* 4. CALENDAR */}
        {activeTool === 'calendar' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-orange-600" />
                Institute Schedule & Academic Calendar
              </h2>
              <p className="text-xs text-slate-500">
                Today is {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                  Live View
                </span>
              </div>

              {/* Simple Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                  <span key={i} className="font-bold text-slate-400 py-1">{d}</span>
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === new Date().getDate();
                  return (
                    <div
                      key={i}
                      className={`py-2 rounded-xl text-xs font-semibold ${
                        isToday
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. GOOGLE SEARCH PAGE */}
        {activeTool === 'google' && (
          <div className="space-y-5 max-w-xl mx-auto text-center py-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Google Search</h2>
              <p className="text-xs text-slate-500 mt-1">
                Search academic syllabi, board exam notices, formulas, and references
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
                }
              }}
              className="relative max-w-md mx-auto"
            >
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google for study materials..."
                className="w-full neu-input py-3 pl-12 pr-24 text-sm font-medium"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 neu-button-primary px-4 py-1.5 text-xs font-bold"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[
                'NCERT Solutions',
                'CBSE Syllabus 2026',
                'JEE Main Updates',
                'NEET UG Notices'
              ].map((query, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                  }}
                  className="px-3 py-1 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[11px] font-medium transition"
                >
                  {query} ↗
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. DEVELOPER HUB & WHATSAPP */}
        {activeTool === 'developer' && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    Lead Fullstack Engineer
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-0.5">Hardik Yadav</h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Globe className="w-6 h-6" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Architect & developer behind the Nitin Sir Classes portal. For technical support, custom software upgrades, or feature enhancements, connect directly via WhatsApp or visit the portfolio website.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
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

            <div className="neu-card-sm p-4 text-xs text-slate-600 space-y-1">
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
