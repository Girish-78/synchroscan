import React, { useState, useEffect, useRef } from 'react';
import { Activity, Microscope, Waves, Database, Zap, Download, Target, ChevronRight, AlertTriangle, BarChart3, Fingerprint, Info, X, BookOpen } from 'lucide-react';

// --- MOCK DATA GENERATORS ---
const generateSpectrogram = (polymerType, noiseLevel) => {
  const points = [];
  const baseNoise = () => (Math.random() * noiseLevel);
  
  for (let i = 0; i < 100; i++) {
    let y = baseNoise();
    // Simulate specific chemical peaks based on polymer
    if (polymerType === 'PE' && (i > 25 && i < 35)) y += 60 * Math.sin((i - 25) / 10 * Math.PI);
    if (polymerType === 'PP' && (i > 45 && i < 55)) y += 75 * Math.sin((i - 45) / 10 * Math.PI);
    if (polymerType === 'PS' && (i > 70 && i < 80)) y += 85 * Math.sin((i - 70) / 10 * Math.PI);
    
    // Add secondary peaks for realism
    if (polymerType === 'PE' && (i > 75 && i < 80)) y += 30;
    
    points.push(Math.max(0, y));
  }
  return points;
};

const POLYMERS = [
  { id: 'PE', name: 'Polyethylene', hazard: 'High', color: 'text-blue-400' },
  { id: 'PP', name: 'Polypropylene', hazard: 'Medium', color: 'text-green-400' },
  { id: 'PS', name: 'Polystyrene', hazard: 'Critical', color: 'text-red-400' },
  { id: 'PET', name: 'Polyethylene Terephthalate', hazard: 'High', color: 'text-yellow-400' }
];

const LOCATIONS = ['Pacific Garbage Patch', 'Mariana Trench Surface', 'Mediterranean Sea', 'Arctic Ice Core', 'Coastal India'];

const INITIAL_DATA = [
  { id: 'SCAN-8432', date: new Date(Date.now() - 3600000).toLocaleTimeString(), location: 'Pacific Garbage Patch', particleCount: 42, avgSize: '340 nm', primaryType: 'Polystyrene', beamConfig: '12.5 keV' },
  { id: 'SCAN-1194', date: new Date(Date.now() - 7200000).toLocaleTimeString(), location: 'Mediterranean Sea', particleCount: 18, avgSize: '610 nm', primaryType: 'Polyethylene', beamConfig: '15.0 keV' }
];

const App = () => {
  // --- STATE ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [beamEnergy, setBeamEnergy] = useState(12.5); // keV
  const [location, setLocation] = useState(LOCATIONS[0]);
  
  const [currentParticles, setCurrentParticles] = useState([]);
  const [spectrogramData, setSpectrogramData] = useState(Array(100).fill(0));
  const [dominantPolymer, setDominantPolymer] = useState(null);
  
  const [researchDatabase, setResearchDatabase] = useState(INITIAL_DATA);
  const [showGuide, setShowGuide] = useState(false);
  
  // Interactive Spectrogram State
  const [hoverPoint, setHoverPoint] = useState(null);

  // We use a ref to hold the absolute latest state so the completion watcher never sees stale data
  const latestState = useRef({ currentParticles, location, dominantPolymer, beamEnergy });
  useEffect(() => {
    latestState.current = { currentParticles, location, dominantPolymer, beamEnergy };
  }, [currentParticles, location, dominantPolymer, beamEnergy]);

  // --- SIMULATION LOGIC ---
  // 1. Timer logic
  useEffect(() => {
    let interval;
    if (isScanning) {
      interval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 2, 100)); // Tick up to 100
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // 2. Action logic tied directly to progress ticks
  useEffect(() => {
    if (!isScanning) return;

    if (scanProgress >= 100) {
      // SCAN COMPLETE! Stop scanning and save to DB
      setIsScanning(false);
      const { currentParticles: parts, location: loc, dominantPolymer: dom, beamEnergy: beam } = latestState.current;
      
      if (parts.length > 0) {
        const avgSize = Math.round(parts.reduce((acc, p) => acc + p.size, 0) / parts.length);
        const newEntry = {
          id: `SCAN-${Math.floor(Math.random()*10000)}`,
          date: new Date().toLocaleTimeString(),
          location: loc,
          particleCount: parts.length,
          avgSize: `${avgSize} nm`,
          primaryType: dom?.name || 'Mixed',
          beamConfig: `${beam.toFixed(1)} keV`
        };
        // Explicitly prepend the new data
        setResearchDatabase(prev => [newEntry, ...prev]);
      }
    } else {
      // PARTICLE DISCOVERY DURING SCAN
      if (Math.random() > 0.7) {
        const size = Math.floor(Math.random() * 950) + 50; // 50nm to 1000nm (<1µm)
        const type = POLYMERS[Math.floor(Math.random() * POLYMERS.length)];
        const conf = (85 + Math.random() * 14).toFixed(1);
        
        setCurrentParticles(curr => [...curr, { id: Math.random().toString(), size, type, confidence: conf, x: Math.random()*100, y: Math.random()*100 }]);
        
        setSpectrogramData(generateSpectrogram(type.id, 15 - (latestState.current.beamEnergy/2)));
        setDominantPolymer(type);
      }
    }
  }, [scanProgress, isScanning]);

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentParticles([]);
    setDominantPolymer(null);
    setSpectrogramData(Array(100).fill(0));
  };

  const exportData = () => {
    alert("Simulation Note: In a production environment, this would export a CSV/JSON of the Research Database along with raw spectrogram vectors for IAEA or research partners.");
  };

  // --- RENDER HELPERS ---
  const handleGraphHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const index = Math.min(Math.floor((percentage / 100) * spectrogramData.length), spectrogramData.length - 1);
    
    setHoverPoint({
      x: percentage,
      index: index,
      value: spectrogramData[index]
    });
  };

  const renderSpectrogram = () => {
    const maxVal = Math.max(...spectrogramData, 100);
    const points = spectrogramData.map((val, idx) => `${idx},${100 - (val / maxVal * 100)}`).join(' ');
    
    // Identify if the hovered area falls within known polymer signature peaks
    let peakLabel = null;
    if (hoverPoint) {
      if (hoverPoint.index > 25 && hoverPoint.index < 35) peakLabel = "PE Signature Match";
      if (hoverPoint.index > 45 && hoverPoint.index < 55) peakLabel = "PP Signature Match";
      if (hoverPoint.index > 70 && hoverPoint.index < 80) peakLabel = "PS Signature Match";
    }
    
    return (
      <div 
        className="relative w-full h-40 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex items-end cursor-crosshair group"
        onMouseMove={handleGraphHover}
        onMouseLeave={() => setHoverPoint(null)}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-4 opacity-20 pointer-events-none">
          {Array(40).fill(0).map((_, i) => <div key={i} className="border-[0.5px] border-cyan-500/30"></div>)}
        </div>
        
        {/* Interactive Tooltip Label */}
        {hoverPoint && (
          <div 
            className="absolute top-2 bg-gray-950/90 border border-gray-700 p-2 rounded text-[10px] pointer-events-none backdrop-blur-md z-20 shadow-lg"
            style={{ 
              left: hoverPoint.x > 50 ? 'auto' : `${hoverPoint.x}%`, 
              right: hoverPoint.x > 50 ? `${100 - hoverPoint.x}%` : 'auto',
              marginLeft: hoverPoint.x > 50 ? 0 : '12px',
              marginRight: hoverPoint.x > 50 ? '12px' : 0
            }}
          >
            <div className="flex flex-col gap-1">
              <div className="text-gray-400 flex justify-between gap-4">
                <span>Energy Loss:</span> 
                <span className="text-gray-200 font-mono">{(hoverPoint.index * 5 + 100).toFixed(0)} eV</span>
              </div>
              <div className="text-gray-400 flex justify-between gap-4">
                <span>Intensity:</span> 
                <span className="text-cyan-400 font-mono">{hoverPoint.value.toFixed(1)} a.u.</span>
              </div>
              {peakLabel && (
                <div className="mt-1 pt-1 border-t border-gray-700 text-green-400 font-bold flex items-center">
                   <Target className="w-3 h-3 mr-1" /> {peakLabel}
                </div>
              )}
            </div>
          </div>
        )}

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10">
          <polyline
            points={points}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          {/* Hover Crosshair Overlay */}
          {hoverPoint && (
            <>
              <line 
                x1={hoverPoint.x} y1="0" 
                x2={hoverPoint.x} y2="100" 
                stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" 
              />
              <circle 
                cx={hoverPoint.x} 
                cy={100 - (hoverPoint.value / maxVal * 100)} 
                r="1.5" 
                fill="#22d3ee" 
                className="drop-shadow-[0_0_5px_#22d3ee]"
              />
            </>
          )}

          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>
        
        {/* Y-Axis Label */}
        <div className="absolute left-2 top-2 text-[10px] text-gray-400 rotate-90 origin-left pointer-events-none">Intensity (a.u.)</div>
        <div className="absolute right-2 bottom-1 text-[10px] text-gray-400 pointer-events-none">Energy Loss (eV)</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans flex flex-col selection:bg-cyan-900">
      {/* HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-800">
            <Waves className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              SynchroScan Nano-Detect
            </h1>
            <p className="text-xs text-gray-400 font-mono">X-Ray Spectroscopy & AI Classification Platform | IAEA Node</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowGuide(true)}
            className="flex items-center text-xs bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4 mr-1.5" /> User Guide & Info
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Beamline Active</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-[500px]">
        
        {/* LEFT COLUMN: Controls & Settings */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          {/* Core Controls */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-sm flex flex-col">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
              <Target className="w-4 h-4 mr-2" /> Beamline Configuration
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Monitoring Location</label>
                <select 
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isScanning}
                >
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <label>Synchrotron Beam Energy</label>
                  <span>{beamEnergy.toFixed(1)} keV</span>
                </div>
                <input 
                  type="range" 
                  min="5" max="30" step="0.5"
                  value={beamEnergy}
                  onChange={(e) => setBeamEnergy(parseFloat(e.target.value))}
                  disabled={isScanning}
                  className="w-full accent-cyan-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">Higher energy improves deep-tissue resolution but increases noise for surface scanning.</p>
              </div>

              <button 
                onClick={startScan}
                disabled={isScanning}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex justify-center items-center ${
                  isScanning 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                }`}
              >
                {isScanning ? (
                  <><Activity className="w-4 h-4 mr-2 animate-spin" /> Scanning Sample...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Initiate Nano-Scan</>
                )}
              </button>
            </div>
          </div>

          {/* AI Live Stats */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-sm flex-1">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" /> AI Classification Engine
            </h2>
            
            <div className="space-y-3 mt-4">
              {POLYMERS.map(poly => {
                const count = currentParticles.filter(p => p.type.id === poly.id).length;
                const total = Math.max(1, currentParticles.length);
                const percent = (currentParticles.length > 0 || isScanning) ? Math.round((count / total) * 100) : 0;
                
                return (
                  <div key={poly.id} className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-bold ${poly.color}`}>{poly.name} ({poly.id})</span>
                      <span className="text-xs text-gray-400">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-current ${poly.color} transition-all duration-300`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Visualizer */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-1 shadow-sm flex-1 flex flex-col relative overflow-hidden group">
            
            {/* Visualizer Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
              <div className="bg-gray-950/80 backdrop-blur px-3 py-1.5 rounded-md border border-gray-800 text-xs text-cyan-400 font-mono flex items-center">
                <Microscope className="w-3 h-3 mr-2" /> 
                Resolution: &lt;1 µm (Nanoscale)
              </div>
              <div className="bg-gray-950/80 backdrop-blur px-3 py-1.5 rounded-md border border-gray-800 text-xs text-gray-400 font-mono">
                Depth: 0.5mm
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-black rounded-lg relative overflow-hidden border border-gray-800">
              
              {/* Background Texture/Grid */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              {/* Scanning Laser Effect */}
              {isScanning && (
                <div 
                  className="absolute top-0 bottom-0 w-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent border-t border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-75"
                  style={{ top: `${scanProgress}%`, height: '2px' }}
                ></div>
              )}

              {/* Rendered Particles */}
              {currentParticles.map(p => (
                <div 
                  key={p.id}
                  className="absolute rounded-full animate-in zoom-in duration-300"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${Math.max(4, p.size / 50)}px`, 
                    height: `${Math.max(4, p.size / 50)}px`,
                    backgroundColor: p.type.id === 'PE' ? '#60a5fa' : p.type.id === 'PP' ? '#4ade80' : p.type.id === 'PS' ? '#f87171' : '#facc15',
                    boxShadow: '0 0 10px currentColor',
                    opacity: p.y > scanProgress ? 0 : 0.8
                  }}
                  title={`${p.type.name} - ${p.size}nm`}
                >
                  <div className="absolute inset-0 rounded-full border border-current animate-ping opacity-50"></div>
                </div>
              ))}
              
              {/* Idle State / Crosshair */}
              {!isScanning && currentParticles.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-32 h-32 border border-gray-800 rounded-full flex items-center justify-center">
                     <div className="w-16 h-16 border border-gray-700 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                     </div>
                   </div>
                </div>
              )}
            </div>

            {/* Scan Progress Bar */}
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-gray-950/80 backdrop-blur p-2 rounded-lg border border-gray-800">
              <div className="flex justify-between text-[10px] text-gray-400 uppercase mb-1 font-mono">
                <span>Scan Progress</span>
                <span>{scanProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-1.5">
                <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-75" style={{ width: `${scanProgress}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Spectroscopy & Fingerprinting */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
              <Fingerprint className="w-4 h-4 mr-2" /> Chemical Fingerprinting
            </h2>
            
            {/* Spectroscopy Chart Component */}
            {renderSpectrogram()}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-950 p-2 rounded border border-gray-800">
                <span className="text-gray-500 block">Current Dominant</span>
                <span className={`font-bold ${dominantPolymer ? dominantPolymer.color : 'text-gray-400'}`}>
                  {dominantPolymer ? dominantPolymer.name : 'Standby'}
                </span>
              </div>
              <div className="bg-gray-950 p-2 rounded border border-gray-800">
                <span className="text-gray-500 block">AI Match Confidence</span>
                <span className="font-mono text-gray-200">
                  {currentParticles.length > 0 ? currentParticles[currentParticles.length-1].confidence + '%' : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-sm flex-1 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" /> Recent Detections
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar max-h-[250px]">
              {currentParticles.length === 0 && !isScanning ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-600 text-center">
                  Initiate scan to detect<br/>nano-pollutants
                </div>
              ) : (
                [...currentParticles].reverse().slice(0, 15).map(p => (
                  <div key={p.id} className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 flex justify-between items-center group hover:border-gray-700 transition-colors">
                    <div>
                      <div className={`text-xs font-bold flex items-center ${p.type.color}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></div>
                        {p.type.id}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Size: <span className="text-gray-300">{p.size} nm</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500">AI Conf.</div>
                      <div className="text-xs font-mono text-cyan-400">{p.confidence}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* BOTTOM SECTION: Research Database Table */}
      <section className="h-64 bg-gray-900 border-t border-gray-800 p-4 shrink-0 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
            <Database className="w-4 h-4 mr-2" /> Global Research Database Log
          </h2>
          <button 
            onClick={exportData}
            className="flex items-center text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors border border-gray-700"
          >
            <Download className="w-3 h-3 mr-1.5" /> Export DataSet
          </button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border border-gray-800 bg-gray-950">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase bg-gray-900 text-gray-500 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Scan ID</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Ocean Region</th>
                <th className="px-4 py-3 font-medium text-right">Particles Detected</th>
                <th className="px-4 py-3 font-medium text-right">Avg Nano-Size</th>
                <th className="px-4 py-3 font-medium">Primary Pollutant</th>
                <th className="px-4 py-3 font-medium">Beam Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {researchDatabase.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-600 text-xs">
                    No data collected yet. Run a simulation to populate the database.
                  </td>
                </tr>
              ) : (
                researchDatabase.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-2 font-mono text-cyan-500 text-xs">{row.id}</td>
                    <td className="px-4 py-2 text-xs">{row.date}</td>
                    <td className="px-4 py-2 text-gray-300">{row.location}</td>
                    <td className="px-4 py-2 text-right font-mono">{row.particleCount}</td>
                    <td className="px-4 py-2 text-right text-yellow-500 font-mono">{row.avgSize}</td>
                    <td className="px-4 py-2">
                      <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded text-xs border border-gray-700">
                        {row.primaryType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{row.beamConfig}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* EDUCATIONAL MODAL / USER GUIDE */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h2 className="text-xl font-bold text-gray-200 flex items-center">
                <Info className="w-5 h-5 mr-2 text-cyan-400" /> System Guide & Educational Reference
              </h2>
              <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-300 custom-scrollbar">
              
              <section>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">How to Use the Simulator</h3>
                <ol className="list-decimal list-inside space-y-2 bg-gray-950 p-4 rounded-lg border border-gray-800">
                  <li>Select a <strong>Monitoring Location</strong> from the dropdown menu.</li>
                  <li>Adjust the <strong>Synchrotron Beam Energy (keV)</strong> based on your target depth and particle size.</li>
                  <li>Click <strong>Initiate Nano-Scan</strong> to simulate the particle detection process.</li>
                  <li>Watch the live AI classifier and spectrogram to identify pollutants.</li>
                  <li>Review the newly appended data in the Global Research Database once the scan completes.</li>
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Role of Beam Energy (keV)</h3>
                <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-2">
                  <p>The beam energy dictates how X-rays interact with the sample:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-400">
                    <li><strong className="text-gray-300">Lower Energy (5 - 10 keV):</strong> Highly sensitive to smaller surface nanoparticles. Less noise, but poor penetration into thick organic tissue or dense water samples.</li>
                    <li><strong className="text-gray-300">Higher Energy (15 - 30 keV):</strong> High penetration depth, allowing scanning through thick sample matrices (e.g., fish tissue, deep ice cores). However, this increases background noise (scattering), making it slightly harder to detect ultra-small surface plastics.</li>
                  </ul>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Chemical Fingerprinting</h3>
                  <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 text-gray-400 h-full">
                    <p className="mb-2">The live graph represents an <strong>X-ray absorption spectrum</strong>.</p>
                    <p>When synchrotron light hits a nano-plastic, the polymer's unique molecular bonds absorb specific energies of light. This absorption creates peaks and valleys—a "fingerprint." The AI compares this live spectrogram against known polymer profiles to classify the pollutant in real-time.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Polymer Abbreviations</h3>
                  <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 h-full">
                    <ul className="space-y-3">
                      <li className="flex justify-between items-center"><span className="text-blue-400 font-bold">PE</span> <span>Polyethylene (Bags, bottles)</span></li>
                      <li className="flex justify-between items-center"><span className="text-green-400 font-bold">PP</span> <span>Polypropylene (Caps, gear)</span></li>
                      <li className="flex justify-between items-center"><span className="text-red-400 font-bold">PS</span> <span>Polystyrene (Styrofoam)</span></li>
                      <li className="flex justify-between items-center"><span className="text-yellow-400 font-bold">PET</span> <span>Polyethylene Terephthalate</span></li>
                    </ul>
                  </div>
                </section>
              </div>

            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-xl flex justify-end">
               <button onClick={() => setShowGuide(false)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg font-medium transition-colors">
                 Got it, start scanning
               </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS for custom scrollbar hidden in Tailwind base */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}} />
    </div>
  );
};

export default App;