
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Package, 
  User, 
  MapPin, 
  ClipboardList, 
  Info, 
  Loader2, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink, 
  Check, 
  ListChecks, 
  Copy, 
  LogOut, 
  Lock, 
  UserCircle, 
  Camera, 
  ImagePlus, 
  XCircle, 
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  ChevronRight,
  Filter,
  Github,
  Globe,
  QrCode,
  Maximize2,
  Minimize2,
  Activity,
  TrendingUp,
  Users,
  PieChart,
  RotateCcw,
  Scan,
  Mail,
  ShieldCheck,
  BadgeCheck,
  Send,
  Calendar,
  Phone,
  Settings,
  Pencil,
  Download,
  Share2
} from 'lucide-react';
import { Assignment, Station, GroupedAssignment } from './types';
import { STATIONS } from './data';
import { getLogisticsInsights } from './services/geminiService';
import { fetchSpreadsheetData, updateSpreadsheetTask } from './services/spreadsheetService';
import { QRCodeSVG } from 'qrcode.react';

const GITHUB_REPO_URL = "https://github.com/Ndiioo/SPX-Assigment-Task";
const AUTO_REFRESH_INTERVAL = 60000;
const DEFAULT_PASSWORD = "123456";
const MASTER_ADMIN_ID = "Admin";

const ADMIN_REGISTRY = [
  { id: 'Ops186909', name: 'SAFRIWANDI', position: 'PIC' },
  { id: 'Ops1187094', name: 'MUCHLIS MUSTARI', position: 'Daily Worker' },
  { id: 'Ops1187093', name: 'ANGGA', position: 'Daily Worker' },
  { id: 'Ops1180047', name: 'ILHAM SILVA ROYANTO', position: 'Daily Worker' },
  { id: 'Ops1152905', name: 'SURYA SAPUTRA', position: 'Daily Worker' },
  { id: 'Ops1034226', name: 'Akbar', position: 'Shift Lead' },
  { id: 'Ops991421', name: 'HENDRI RAMADAN', position: 'Daily Worker' },
  { id: 'Ops968087', name: 'AGUNG', position: 'Shift Worker' },
  { id: 'Ops890915', name: 'MUH.ARYADIN', position: 'Operator Dedicated' },
  { id: 'Ops620808', name: 'Dicky Wahyudi Bakri', position: 'Admin Tracer' },
];

interface UserProfile {
  email: string;
  phone: string;
  dob: string;
  photoUrl: string;
  isComplete: boolean;
}

interface UserSession {
  id: string;
  role: 'admin' | 'operator' | 'courier';
  name: string;
  position?: string;
  profile?: UserProfile;
}

// Fixed Error: Define StatType for state management
type StatType = 'none' | 'packages' | 'couriers' | 'completed' | 'ongoing';

const getAvatarColor = (name: string) => {
  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-cyan-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const extractIdFromBrackets = (name: string): string | null => {
  const match = name.match(/\[(.*?)\]/);
  if (!match) return null;
  let id = match[1].trim();
  if (id.toLowerCase().startsWith('ops')) {
    return 'Ops' + id.substring(3);
  }
  return id;
};

const getInitials = (name: string) => {
  const cleanName = name.replace(/\[.*?\]/, '').trim();
  return cleanName.length > 0 ? cleanName.charAt(0).toUpperCase() : name.trim().charAt(0).toUpperCase();
};

const downloadQRCode = (taskId: string) => {
  const svg = document.getElementById(`qr-${taskId}`);
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `QR_${taskId}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(svgData);
};

const StatCard: React.FC<{ 
  title: string, value: string | number, icon: any, colorClass: string, isActive: boolean, onClick: () => void 
}> = ({ title, value, icon: Icon, colorClass, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left p-4 rounded-2xl shadow-md border transition-all relative overflow-hidden group ${
      isActive ? 'bg-white border-[#EE4D2D] ring-2 ring-orange-100 scale-[1.02]' : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-lg'
    }`}
  >
    <div className="flex items-center gap-4 relative z-10">
      <div className={`p-3 rounded-xl ${colorClass} shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">{title}</p>
        <p className="text-xl font-black text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
    {isActive && <div className="absolute top-0 right-0 w-8 h-8 bg-[#EE4D2D] text-white flex items-center justify-center rounded-bl-xl"><TrendingUp size={12} /></div>}
  </button>
);

const AssignmentCard: React.FC<{ group: GroupedAssignment, onClick: () => void }> = ({ group, onClick }) => {
  const avatarBg = getAvatarColor(group.courierName);
  return (
    <div onClick={onClick} className="group bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-14 h-14 rounded-2xl ${avatarBg} flex items-center justify-center text-white font-black text-2xl shadow-md ring-4 ring-gray-50 shrink-0`}>
             {getInitials(group.courierName)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight truncate">{group.courierName}</h3>
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 font-medium italic"><MapPin size={10} /> {group.station} Station</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase ${group.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{group.status}</span>
          <span className="text-[10px] font-bold text-gray-400">{group.tasks.length} AT</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-3xl font-black text-gray-800 tracking-tighter">{group.totalPackages}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Paket</span>
        </div>
        <div className="flex items-center gap-1 text-[#EE4D2D] font-bold text-xs group-hover:gap-2 transition-all">Lihat Tugas <ArrowRight size={14} /></div>
      </div>
    </div>
  );
};

const ProfileForm: React.FC<{ session: UserSession, onSave: (profile: UserProfile) => void, onClose?: () => void, title: string }> = ({ session, onSave, onClose, title }) => {
  const [email, setEmail] = useState(session.profile?.email || "");
  const [phone, setPhone] = useState(session.profile?.phone || "");
  const [dob, setDob] = useState(session.profile?.dob || "");
  const [photoUrl, setPhotoUrl] = useState(session.profile?.photoUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ email, phone, dob, photoUrl, isComplete: true });
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="bg-[#EE4D2D] p-8 text-white relative">
          {onClose && <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full"><XCircle size={20} /></button>}
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="text-[10px] font-black uppercase opacity-80 mt-1 tracking-widest">Pusat Informasi Pengguna Hub</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="flex flex-col items-center mb-6">
            <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-gray-50 shadow-xl flex items-center justify-center bg-gray-50 group-hover:border-orange-100 transition-all">
                {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><Camera size={32} /><span className="text-[8px] font-black mt-1 uppercase">Upload Foto</span></div>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#EE4D2D] text-white p-2 rounded-xl shadow-lg"><ImagePlus size={16} /></div>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-4">
              <Mail className="text-gray-400" size={18} />
              <div className="flex-1"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email</p><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@spx.id" className="w-full bg-transparent text-sm font-black outline-none" required /></div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-4">
              <Phone className="text-gray-400" size={18} />
              <div className="flex-1"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">WhatsApp</p><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." className="w-full bg-transparent text-sm font-black outline-none" required /></div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-4">
              <Calendar className="text-gray-400" size={18} />
              <div className="flex-1"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tanggal Lahir</p><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-transparent text-sm font-black outline-none" required /></div>
            </div>
          </div>
          <button type="submit" className="w-full bg-[#EE4D2D] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-[#d73d1d] transition-all flex items-center justify-center gap-2"><Check size={20} /> Simpan Data</button>
        </form>
      </div>
    </div>
  );
};

const Modal: React.FC<{ group: GroupedAssignment, onClose: () => void, onCompleteTask: (taskId: string) => void }> = ({ group, onClose, onCompleteTask }) => {
  const [zoomedTaskId, setZoomedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Ongoing' | 'Completed'>('All');

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'All') return group.tasks;
    return group.tasks.filter(t => t.status === statusFilter);
  }, [group.tasks, statusFilter]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      
      {/* Zoom Modal */}
      {zoomedTaskId && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300" onClick={() => setZoomedTaskId(null)}>
          <div className="bg-white p-8 rounded-[60px] shadow-[0_0_150px_rgba(238,77,45,0.4)] relative">
            <QRCodeSVG value={zoomedTaskId} size={400} level="H" includeMargin={true} />
            <button onClick={() => setZoomedTaskId(null)} className="absolute -top-12 right-0 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:text-orange-400 transition-all"><Minimize2 size={24} /> Close Preview</button>
          </div>
          <p className="mt-12 text-3xl font-black text-white tracking-tighter">{zoomedTaskId}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); downloadQRCode(zoomedTaskId); }}
            className="mt-6 bg-[#EE4D2D] text-white px-10 py-5 rounded-[28px] font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:bg-white hover:text-black transition-all"
          >
            <Download size={24} /> Download Image
          </button>
        </div>
      )}

      <div className="bg-white rounded-[48px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col transform transition-all animate-in zoom-in duration-500 border border-white/20">
        <div className="bg-[#EE4D2D] p-10 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tighter">{group.courierName}</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mt-1 italic flex items-center gap-2"><MapPin size={10} /> Hub {group.station} Operational Task</p>
          </div>
          <button onClick={onClose} className="p-4 bg-white/20 hover:bg-white/30 rounded-[28px] transition-all relative z-10"><XCircle size={28} /></button>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10"><ClipboardList size={200} /></div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-gray-50/50">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['All', 'Pending', 'Ongoing', 'Completed'].map((s) => (
              <button 
                key={s} 
                onClick={() => setStatusFilter(s as any)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap shadow-sm ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'}`}
              >
                {s === 'All' ? 'Semua Task' : s === 'Completed' ? 'Selesai' : s}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-8 hover:border-orange-200 transition-all group/at">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative shrink-0 flex flex-col items-center gap-3">
                    <div 
                      onClick={() => setZoomedTaskId(task.taskId)}
                      className="p-5 bg-white rounded-[32px] border-2 border-gray-50 shadow-md group-hover/at:border-orange-100 transition-all cursor-zoom-in relative overflow-hidden"
                    >
                      <QRCodeSVG id={`qr-${task.taskId}`} value={task.taskId} size={180} level="H" includeMargin={true} />
                      <div className="absolute inset-0 bg-black/0 group-hover/at:bg-black/5 flex items-center justify-center transition-all opacity-0 group-hover/at:opacity-100">
                        <Maximize2 size={32} className="text-[#EE4D2D] drop-shadow-md" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setZoomedTaskId(task.taskId)} className="p-3 bg-gray-50 text-gray-400 hover:text-[#EE4D2D] hover:bg-orange-50 rounded-xl transition-all"><Maximize2 size={16} /></button>
                      <button onClick={() => downloadQRCode(task.taskId)} className="p-3 bg-gray-50 text-gray-400 hover:text-[#EE4D2D] hover:bg-orange-50 rounded-xl transition-all"><Download size={16} /></button>
                      <button onClick={() => { navigator.clipboard.writeText(task.taskId); }} className="p-3 bg-gray-50 text-gray-400 hover:text-[#EE4D2D] hover:bg-orange-50 rounded-xl transition-all"><Copy size={16} /></button>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assignment Task ID</p>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tighter truncate leading-none">{task.taskId}</h4>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {task.status === 'Completed' ? 'SELESAI' : task.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paket</span>
                        <span className="text-xl font-black text-gray-800 tracking-tight">{task.packageCount} Pkt</span>
                      </div>
                      <div className="w-[1px] h-8 bg-gray-100"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sync Terakhir</span>
                        <span className="text-sm font-bold text-gray-600 tracking-tight flex items-center gap-1"><Clock size={12} /> {task.lastUpdated}</span>
                      </div>
                    </div>

                    {task.status !== 'Completed' ? (
                      <button 
                        onClick={() => onCompleteTask(task.id)}
                        className="w-full bg-[#EE4D2D] text-white py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                        <Scan size={18} /> Selesaikan Tugas (Finish Scan)
                      </button>
                    ) : (
                      <div className="w-full py-4 rounded-[24px] bg-green-50 border border-green-100 text-green-700 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Verifikasi Selesai
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                <ClipboardList size={64} className="mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">Tidak ada tugas dalam kategori ini</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-white border-t border-gray-100 shrink-0 text-center">
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] mb-4">LOGISTICS TASK MANAGEMENT SYSTEM • 2026</p>
          <button onClick={onClose} className="w-full py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] transition-all">Tutup Dashboard</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [selectedGroup, setSelectedGroup] = useState<GroupedAssignment | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  // Fixed Error: Use StatType instead of unknown type
  const [activeStat, setActiveStat] = useState<StatType>('none');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showManualProfile, setShowManualProfile] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [forgotMsg, setForgotMsg] = useState<{title: string, msg: string, status: 'prompt' | 'sending' | 'success'} | null>(null);

  useEffect(() => {
    fetchData(true).then(() => setLoading(false));
  }, []);

  const fetchData = async (isInitial = false) => {
    if (refreshing) return;
    try {
      if (!isInitial) setRefreshing(true);
      const allData: Assignment[] = [];
      for (const station of STATIONS) {
        try {
          const stationData = await fetchSpreadsheetData(station);
          allData.push(...stationData);
        } catch (e) { console.error(e); }
      }
      setAssignments(allData);
      if (session && allData.length > 0 && (!insights || !isInitial)) {
        const insightText = await getLogisticsInsights(allData);
        setInsights(insightText);
      }
    } catch (err) { console.error(err); } finally {
      if (!isInitial) setRefreshing(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (session && autoRefreshEnabled) interval = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [session, autoRefreshEnabled]);

  const filteredAssignmentsData = useMemo(() => {
    if (!session) return [];
    let result = assignments;
    if (session.role === 'courier') result = assignments.filter(a => extractIdFromBrackets(a.courierName) === session.id);
    if (selectedStation !== 'All') result = result.filter(a => a.station === selectedStation);
    if (activeStat === 'completed') result = result.filter(a => a.status === 'Completed');
    else if (activeStat === 'ongoing') result = result.filter(a => a.status !== 'Completed');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.courierName.toLowerCase().includes(q) || a.taskId.toLowerCase().includes(q));
    }
    return result;
  }, [assignments, session, selectedStation, activeStat, searchQuery]);

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, GroupedAssignment> = {};
    filteredAssignmentsData.forEach(a => {
      const key = `${a.courierName}-${a.station}`;
      if (!groups[key]) groups[key] = { courierName: a.courierName, station: a.station, totalPackages: 0, tasks: [], status: 'Ongoing', lastUpdated: a.lastUpdated };
      groups[key].totalPackages += a.packageCount;
      groups[key].tasks.push(a);
    });
    return Object.values(groups).map((g): GroupedAssignment => ({
      ...g,
      status: (g.tasks.every(t => t.status === 'Completed') ? 'Completed' : g.tasks.every(t => t.status === 'Pending') ? 'Pending' : 'Ongoing') as any
    }));
  }, [filteredAssignmentsData]);

  const stats = useMemo(() => ({
    totalPackages: filteredAssignmentsData.reduce((sum, a) => sum + a.packageCount, 0),
    totalCouriers: new Set(filteredAssignmentsData.map(a => a.courierName)).size,
    completedTasks: filteredAssignmentsData.filter(a => a.status === 'Completed').length,
    pendingTasks: filteredAssignmentsData.filter(a => a.status !== 'Completed').length,
  }), [filteredAssignmentsData]);

  const handleSelectGroup = (group: GroupedAssignment) => {
    const updated = assignments.map(a => {
      if (a.courierName === group.courierName && a.station === group.station && a.status === 'Pending') {
        updateSpreadsheetTask(a.taskId, 'Ongoing', a.station);
        return { ...a, status: 'Ongoing' as const, lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return a;
    });
    setAssignments(updated);
    setSelectedGroup({ ...group, tasks: group.tasks.map(t => t.status === 'Pending' ? { ...t, status: 'Ongoing' as const } : t) });
  };

  const handleCompleteTask = (taskId: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.id === taskId) {
        updateSpreadsheetTask(a.taskId, 'Completed', a.station);
        return { ...a, status: 'Completed' as const, lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return a;
    }));
    if (selectedGroup) {
      const tasks = selectedGroup.tasks.map(t => t.id === taskId ? { ...t, status: 'Completed' as const } : t);
      setSelectedGroup({ ...selectedGroup, tasks });
    }
  };

  const loadUserProfile = (id: string): UserProfile | undefined => {
    const saved = localStorage.getItem(`spx_profile_${id}`);
    return saved ? JSON.parse(saved) : undefined;
  };

  const saveUserProfile = (id: string, profile: UserProfile) => {
    localStorage.setItem(`spx_profile_${id}`, JSON.stringify(profile));
    if (session && session.id === id) setSession({ ...session, profile });
    setShowProfileSetup(false);
    setShowManualProfile(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false); setErrorMsg("");
    const normalized = username.trim();
    if (!normalized || !password.trim()) { setLoginError(true); setErrorMsg("Isi semua data."); return; }
    setIsLoggingIn(true);
    setTimeout(() => {
      let s: UserSession | null = null;
      if (normalized === MASTER_ADMIN_ID && password === DEFAULT_PASSWORD) s = { id: MASTER_ADMIN_ID, role: 'admin', name: 'Master Admin Hub', position: 'Administrator' };
      if (!s) {
        const ae = ADMIN_REGISTRY.find(a => a.id === normalized);
        if (ae && password === DEFAULT_PASSWORD) s = { id: ae.id, role: 'operator', name: ae.name, position: ae.position };
      }
      if (!s) {
        const match = assignments.map(a => ({ id: extractIdFromBrackets(a.courierName), name: a.courierName })).filter(i => i.id !== null).find(m => m.id === normalized);
        if (match && password === DEFAULT_PASSWORD) s = { id: normalized, role: normalized.startsWith('Ops') ? 'operator' : 'courier', name: match.name, position: 'Operational Member' };
      }
      if (s) {
        const p = loadUserProfile(s.id);
        s.profile = p;
        setSession(s);
        if (!p || !p.isComplete) setShowProfileSetup(true);
      } else { setLoginError(true); setErrorMsg("ID atau Password salah."); }
      setIsLoggingIn(false);
    }, 1000);
  };

  // Fixed Error: Define handleLogout to fix missing name error on line 604
  const handleLogout = () => {
    setSession(null);
    setSelectedGroup(null);
    setActiveStat('none');
    setSearchQuery("");
  };

  if (loading) return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-16 rounded-[60px] shadow-2xl flex flex-col items-center border border-orange-100">
        <Loader2 className="animate-spin text-[#EE4D2D] mb-8" size={80} />
        <h2 className="text-3xl font-black text-gray-800 tracking-tighter italic">SPX Systems Syncing</h2>
        <p className="text-[10px] text-gray-400 mt-4 font-black uppercase tracking-[0.4em]">Connecting to Hub Master Database...</p>
      </div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/40 rounded-full blur-[120px] animate-pulse"></div>
      <div className="max-w-md w-full bg-white rounded-[60px] shadow-2xl p-12 flex flex-col items-center relative z-10 border border-orange-100 animate-in fade-in zoom-in duration-700">
        {forgotMsg && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[100] p-12 flex flex-col items-center justify-center text-center rounded-[60px] animate-in fade-in zoom-in">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${forgotMsg.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {forgotMsg.status === 'sending' ? <Loader2 className="animate-spin" size={32} /> : forgotMsg.status === 'success' ? <Check size={40} /> : <Mail size={40} />}
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-4">{forgotMsg.title}</h3>
            <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">{forgotMsg.msg}</p>
            <div className="flex flex-col gap-4 w-full">
              {forgotMsg.status === 'prompt' && <button onClick={() => { setForgotMsg({ ...forgotMsg, status: 'sending', title: 'Mengirim...' }); setTimeout(() => setForgotMsg({ status: 'success', title: 'Berhasil!', msg: 'Instruksi reset telah dikirim ke email.' }), 1500); }} className="w-full bg-[#EE4D2D] text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Send size={18} /> Kirim Email</button>}
              <button onClick={() => setForgotMsg(null)} className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg">{forgotMsg.status === 'success' ? 'Kembali' : 'Batal'}</button>
            </div>
          </div>
        )}
        <div className="bg-[#EE4D2D] px-10 py-6 rounded-[32px] shadow-2xl mb-12 flex items-center justify-center"><div className="flex items-center gap-1.5"><span className="text-white font-[900] text-4xl italic tracking-tighter leading-none">SPX</span><span className="text-white font-light text-4xl tracking-tighter leading-none">Express</span></div></div>
        <h1 className="text-3xl font-black text-gray-800 tracking-tighter text-center italic">Hub Access Portal</h1>
        <p className="text-gray-400 text-[10px] font-black mt-2 mb-12 text-center uppercase tracking-[0.4em]">Logistics Management System</p>
        <form onSubmit={handleLogin} className="w-full space-y-6">
          {errorMsg && <div className="bg-red-50 p-4 rounded-2xl flex items-center gap-3 border border-red-100"><AlertCircle className="text-red-500" size={18} /><p className="text-red-600 text-[10px] font-black uppercase tracking-tight">{errorMsg}</p></div>}
          <div className="group bg-gray-50 p-5 rounded-[28px] border border-gray-100 focus-within:bg-white focus-within:border-[#EE4D2D] transition-all flex items-center gap-4">
            <UserCircle className="text-gray-300 group-focus-within:text-[#EE4D2D]" size={24} />
            <div className="flex-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">User ID</p><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Courier / Ops ID" className="w-full bg-transparent text-sm font-black outline-none" required /></div>
          </div>
          <div className="group bg-gray-50 p-5 rounded-[28px] border border-gray-100 focus-within:bg-white focus-within:border-[#EE4D2D] transition-all flex items-center gap-4 relative">
            <Lock className="text-gray-300 group-focus-within:text-[#EE4D2D]" size={24} />
            <div className="flex-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Password</p><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent text-sm font-black outline-none" required /></div>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-300 hover:text-black">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
          </div>
          <div className="flex justify-end px-2"><button type="button" onClick={() => { if (!username) { alert("Masukkan ID Anda!"); return; } setForgotMsg({ title: "Reset Password", msg: `Reset password untuk ID ${username}?`, status: 'prompt' }); }} className="text-[10px] font-black text-[#EE4D2D] uppercase tracking-widest hover:underline">Lupa Password?</button></div>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-[#EE4D2D] text-white py-6 rounded-[32px] font-black text-xl shadow-2xl hover:bg-[#d73d1d] transition-all flex items-center justify-center gap-4 disabled:opacity-70">
            {isLoggingIn ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={28} />} Buka Dashboard
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {showProfileSetup && session && <ProfileForm session={session} title="Selamat Datang! Lengkapi Profil" onSave={(p) => saveUserProfile(session.id, p)} />}
      {showManualProfile && session && <ProfileForm session={session} title="Update Profile Hub" onSave={(p) => saveUserProfile(session.id, p)} onClose={() => setShowManualProfile(false)} />}
      <div className="sticky top-0 z-50 bg-gray-50/90 backdrop-blur-xl border-b border-gray-100">
        <header className="bg-[#EE4D2D] text-white pt-6 pb-16 px-10 rounded-b-[60px] shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-row items-center justify-between gap-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="bg-black px-5 py-3 rounded-2xl border border-white/20"><div className="flex items-center gap-1.5"><span className="text-white font-[900] text-2xl italic tracking-tighter">SPX</span><span className="text-white font-light text-2xl tracking-tighter">Express</span></div></div>
              <div className="hidden lg:flex flex-col">
                <h1 className="text-2xl font-black italic tracking-tighter leading-none uppercase">Dashboard Assignment task Tompobulu Hub + MH</h1>
                <div className="flex items-center gap-2 mt-1 opacity-80"><BadgeCheck size={12} className="text-green-400" /><p className="text-[10px] font-black uppercase tracking-widest">{session.role} OPERATIONAL MODE</p></div>
              </div>
            </div>
            <button onClick={() => setShowManualProfile(true)} className="flex items-center bg-black/20 backdrop-blur-md px-5 py-3 rounded-[28px] border border-white/10 group hover:bg-black/30 transition-all">
              <div className="w-12 h-12 rounded-2xl overflow-hidden mr-4 border-2 border-white/20 bg-white/10 flex items-center justify-center shadow-lg">
                {session.profile?.photoUrl ? <img src={session.profile.photoUrl} className="w-full h-full object-cover" /> : <span className="font-black text-xl">{getInitials(session.name)}</span>}
              </div>
              <div className="flex flex-col items-start pr-6"><p className="text-[9px] font-black uppercase tracking-widest text-orange-200">{session.position || 'HUB STAFF'}</p><p className="text-sm font-black truncate max-w-[150px] uppercase tracking-tighter">{session.name || session.id}</p></div>
              <Settings size={16} className="text-white/40 group-hover:text-white transition-all" />
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => fetchData()} className={`p-4 rounded-[24px] bg-white/10 hover:bg-white/25 backdrop-blur-md transition-all border border-white/10 ${refreshing ? 'animate-spin' : ''}`}><RefreshCw size={24} /></button>
              <button onClick={handleLogout} className="p-4 rounded-[24px] bg-white/10 hover:bg-white/25 backdrop-blur-md transition-all border border-white/10"><LogOut size={24} /></button>
            </div>
          </div>
          <div className="absolute right-[-10%] bottom-[-20%] opacity-5 rotate-12"><Package size={400} /></div>
        </header>
        <div className="max-w-7xl mx-auto px-10 -mt-10 pb-8"><div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard title="Total Paket" value={stats.totalPackages} icon={Package} colorClass="bg-orange-600" isActive={activeStat === 'packages'} onClick={() => setActiveStat(activeStat === 'packages' ? 'none' : 'packages')} />
          <StatCard title="Kurir Aktif" value={stats.totalCouriers} icon={Users} colorClass="bg-blue-600" isActive={activeStat === 'couriers'} onClick={() => setActiveStat(activeStat === 'couriers' ? 'none' : 'couriers')} />
          <StatCard title="AT Selesai" value={stats.completedTasks} icon={CheckCircle2} colorClass="bg-emerald-600" isActive={activeStat === 'completed'} onClick={() => setActiveStat(activeStat === 'completed' ? 'none' : 'completed')} />
          <StatCard title="AT Tertunda" value={stats.pendingTasks} icon={Clock} colorClass="bg-gray-500" isActive={activeStat === 'ongoing'} onClick={() => setActiveStat(activeStat === 'ongoing' ? 'none' : 'ongoing')} />
        </div></div>
      </div>

      <main className="max-w-7xl mx-auto px-10 mt-10 space-y-10 relative z-10">
        {activeStat !== 'none' && (
          <div className="bg-white p-10 rounded-[50px] border border-orange-100 shadow-2xl animate-in slide-in-from-top duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5"><PieChart size={240} /></div>
            <div className="flex justify-between items-center mb-10 relative z-10">
              <h3 className="text-3xl font-black text-gray-800 tracking-tighter italic flex items-center gap-4">
                {activeStat === 'packages' ? <Package className="text-orange-600" size={32} /> : activeStat === 'couriers' ? <Users className="text-blue-600" size={32} /> : activeStat === 'completed' ? <CheckCircle2 className="text-emerald-600" size={32} /> : <Clock size={32} />}
                Detail Analitik Operasional
              </h3>
              <button onClick={() => setActiveStat('none')} className="bg-gray-50 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Clear Breakdown</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {STATIONS.map(s => {
                const tasks = filteredAssignmentsData.filter(a => a.station === s);
                const progress = tasks.length > 0 ? (tasks.filter(a => a.status === 'Completed').length / tasks.length) * 100 : 0;
                return (
                  <div key={s} className="bg-gray-50 p-8 rounded-[36px] border border-gray-100 space-y-4">
                    <div className="flex justify-between items-baseline"><span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">{s} HUB</span><span className="text-xl font-black">{Math.round(progress)}%</span></div>
                    <div className="h-4 bg-white rounded-full overflow-hidden border border-gray-100 p-0.5"><div className={`h-full rounded-full transition-all duration-1000 ${activeStat === 'packages' ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tasks.length} Total Penugasan</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {insights && (
          <div className="bg-white p-6 rounded-[32px] border border-orange-100 shadow-xl flex gap-6 items-center relative overflow-hidden group">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0"><AlertCircle className="text-[#EE4D2D]" size={28} /></div>
            <div><span className="text-[10px] font-black text-[#EE4D2D] uppercase tracking-[0.3em] mb-1 block">AI Operational Insight (Gemini-3)</span><p className="text-gray-600 font-medium text-xs leading-relaxed italic">"{insights}"</p></div>
            <div className="absolute right-[-10px] top-[-10px] text-orange-50 opacity-[0.05] group-hover:scale-110 transition-all"><Globe size={100} /></div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#EE4D2D]" size={24} />
            <input type="text" placeholder="Cari nama kurir atau AT ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-16 pr-8 py-6 rounded-[32px] bg-white border border-gray-100 shadow-lg shadow-gray-200/50 focus:border-[#EE4D2D] outline-none text-sm font-bold placeholder:text-gray-300 transition-all" />
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            <button onClick={() => setSelectedStation('All')} className={`px-10 py-6 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-lg transition-all border shrink-0 ${selectedStation === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100'}`}>Semua Hub</button>
            {STATIONS.map(s => (<button key={s} onClick={() => setSelectedStation(s)} className={`px-10 py-6 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-lg transition-all border shrink-0 ${selectedStation === s ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' : 'bg-white text-gray-400 border-gray-100'}`}>{s}</button>))}
          </div>
        </div>

        {groupedAssignments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
            {groupedAssignments.map((g, i) => (<AssignmentCard key={`${g.courierName}-${i}`} group={g} onClick={() => handleSelectGroup(g)} />))}
          </div>
        ) : (
          <div className="bg-white rounded-[60px] p-24 text-center border-4 border-dashed border-gray-100 flex flex-col items-center">
            <ClipboardList size={80} className="text-gray-100 mb-8" />
            <h3 className="text-3xl font-black text-gray-800 tracking-tighter">Tidak Ada Penugasan Terdata</h3>
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Database Logistik Saat Ini Kosong</p>
          </div>
        )}
      </main>

      {selectedGroup && <Modal group={selectedGroup} onClose={() => setSelectedGroup(null)} onCompleteTask={handleCompleteTask} />}
      
      <footer className="max-w-7xl mx-auto px-10 mt-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-3"><div className="px-4 py-2 bg-green-50 rounded-full border border-green-100 flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Real-time Cloud Node Active</span></div></div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.6em]">Powered by Shopee Xpress Operation Technology • Tompobulu Cluster</p>
      </footer>
    </div>
  );
};

export default App;
