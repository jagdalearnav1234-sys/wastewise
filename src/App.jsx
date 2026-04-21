import { useState, useEffect, useRef } from "react";
import "./App.css";

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;

const LEVELS = [
  { name: "Eco Newbie", min: 0, max: 50, emoji: "🌱" },
  { name: "Recycler", min: 50, max: 150, emoji: "♻️" },
  { name: "Green Guard", min: 150, max: 300, emoji: "🌿" },
  { name: "Eco Warrior", min: 300, max: 500, emoji: "⚡" },
  { name: "Planet Hero", min: 500, max: Infinity, emoji: "🌍" },
];

const TIPS = [
  "♻️ Rinse containers before recycling to avoid contamination.",
  "🔋 Never throw batteries in regular trash — they leak toxic chemicals.",
  "🛍️ One reusable bag saves 700 plastic bags per year.",
  "🌿 Food waste in landfills produces methane — compost instead!",
  "📱 E-waste contains gold, silver and copper — always recycle electronics.",
  "💧 Making recycled paper uses 70% less water than new paper.",
];

const LEADERBOARD = [
  { name: "Priya S.", points: 980, emoji: "🌍", badge: "Planet Hero" },
  { name: "Arjun M.", points: 750, emoji: "🌍", badge: "Planet Hero" },
  { name: "Sneha R.", points: 620, emoji: "🌍", badge: "Planet Hero" },
  { name: "Rohan K.", points: 480, emoji: "⚡", badge: "Eco Warrior" },
  { name: "Ananya T.", points: 390, emoji: "⚡", badge: "Eco Warrior" },
  { name: "Dev P.", points: 270, emoji: "🌿", badge: "Green Guard" },
  { name: "Meera L.", points: 180, emoji: "🌿", badge: "Green Guard" },
  { name: "Kabir J.", points: 90, emoji: "♻️", badge: "Recycler" },
  { name: "Zara N.", points: 60, emoji: "♻️", badge: "Recycler" },
  { name: "You", points: 0, emoji: "🌱", badge: "Eco Newbie", isYou: true },
];

function getLevel(points) {
  return LEVELS.find((l) => points >= l.min && points < l.max) || LEVELS[0];
}

export default function App() {
  const [page, setPage] = useState("home");
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [points, setPoints] = useState(() => Number(localStorage.getItem("ww_points") || 0));
  const [totalScans, setTotalScans] = useState(() => Number(localStorage.getItem("ww_scans") || 0));
  const [streak, setStreak] = useState(() => Number(localStorage.getItem("ww_streak") || 0));
  const [pointsPopup, setPointsPopup] = useState(false);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem("ww_history") || "[]"));
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hi! I'm WasteWise AI 🌱 Ask me anything about recycling, composting or waste disposal!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);

  const categories = ["All","Plastic","Organic","E-Waste","Metal","Glass","Paper","Hazardous","Battery"];

  useEffect(() => { localStorage.setItem("ww_points", points); }, [points]);
  useEffect(() => { localStorage.setItem("ww_scans", totalScans); }, [totalScans]);
  useEffect(() => { localStorage.setItem("ww_streak", streak); }, [streak]);
  useEffect(() => { localStorage.setItem("ww_history", JSON.stringify(history)); }, [history]);
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function awardPoints(item) {
    setPoints(p => p + 10);
    setTotalScans(s => s + 1);
    setPointsPopup(true);
    setTimeout(() => setPointsPopup(false), 2000);
    const today = new Date().toDateString();
    if (localStorage.getItem("ww_lastScan") !== today) {
      localStorage.setItem("ww_lastScan", today);
      setStreak(s => s + 1);
    }
    const entry = {
      id: Date.now(),
      name: item.name,
      category: item.category,
      confidence: item.confidence,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      icon: item.tutorials?.[0]?.icon || "♻️"
    };
    setHistory(h => [entry, ...h].slice(0, 50));
  }

  async function analyzeImage(base64Data, mediaType) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64Data}` } },
            {
              type: "text",
              text: `You are a waste identification expert. Analyze this image.
Reply ONLY in this exact JSON format, no markdown, no backticks:
{
  "name": "waste item name",
  "desc": "one line material description",
  "confidence": 90,
  "category": "Plastic",
  "wasteScore": 7,
  "chemistryNote": "brief chemical breakdown explanation",
  "tutorials": [
    { "icon": "♻️", "label": "Recycle", "title": "How to recycle", "desc": "specific steps" },
    { "icon": "🌱", "label": "Decompose", "title": "Decomposition timeline", "desc": "breakdown timeline" },
    { "icon": "🛠️", "label": "Upcycle", "title": "DIY ideas", "desc": "creative reuse" },
    { "icon": "⚠️", "label": "Warning", "title": "Hazard info", "desc": "safety info" }
  ]
}`
            }
          ]
        }]
      })
    });
    if (!response.ok) throw new Error("API failed");
    const data = await response.json();
    const text = data.choices[0].message.content;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return JSON.parse(match[0]);
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(m => [...m, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          max_tokens: 512,
          messages: [
            { role: "system", content: "You are WasteWise AI, an expert in recycling, composting and waste management. Keep answers short, friendly and practical." },
            ...chatMessages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "Sorry, try again!";
      setChatMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch {
      setChatMessages(m => [...m, { role: "assistant", text: "Sorry, something went wrong. Try again!" }]);
    }
    setChatLoading(false);
  }

  function processImage(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const full = e.target.result;
      setPreview(full);
      setScanning(true);
      setResult(null);
      setError(null);
      try {
        const analyzed = await analyzeImage(full.split(",")[1], file.type);
        setResult(analyzed);
        awardPoints(analyzed);
      } catch {
        setError("Analysis failed — please try again.");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFile(e) { const f = e.target.files[0]; if (f) processImage(f); }
  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) processImage(f);
  }

  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel ? ((points - level.min) / (nextLevel.min - level.min)) * 100 : 100;
  const categoryHistory = activeCategory === "All" ? history : history.filter(h => h.category === activeCategory);

  const categoryCounts = categories.slice(1).map(cat => ({
    cat,
    count: history.filter(h => h.category === cat).length
  })).filter(x => x.count > 0);

  const leaderboardWithYou = LEADERBOARD.map(l => l.isYou ? { ...l, points, emoji: level.emoji, badge: level.name } : l)
    .sort((a, b) => b.points - a.points);

  function navTo(p) { setPage(p); setMobileMenuOpen(false); }

  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <span className="nav-logo-icon">♻</span>
          <span className="nav-logo-text">WasteWise</span>
        </div>
        <div className={`nav-links ${mobileMenuOpen ? "open" : ""}`}>
          {["home","dashboard","history","chat","leaderboard","map"].map(p => (
            <button key={p} className={`nav-btn ${page === p ? "active" : ""}`} onClick={() => navTo(p)}>
              {p === "home" && "🏠 Home"}
              {p === "dashboard" && "📊 Dashboard"}
              {p === "history" && "📋 History"}
              {p === "chat" && "🤖 AI Chat"}
              {p === "leaderboard" && "🏆 Leaderboard"}
              {p === "map" && "🗺️ Map"}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <div className="nav-points">
            <span>{level.emoji}</span>
            <span className="nav-pts">{points} pts</span>
          </div>
          <button className="hamburger" onClick={() => setMobileMenuOpen(o => !o)}>☰</button>
        </div>
      </nav>

      {/* Tip Banner */}
      <div className="tip-banner">
        <span className="tip-dot"></span>
        <span className="tip-text">{TIPS[tipIndex]}</span>
      </div>

      {/* ===== HOME ===== */}
      {page === "home" && (
        <div className="page">
          <div className="hero-section">
            <div className="hero-label">Powered by Groq AI ⚡</div>
            <h1 className="hero-title">Identify waste.<br /><span>Recycle smarter.</span></h1>
            <p className="hero-sub">Upload any waste photo and get instant AI-powered recycling guidance. Earn green points every scan! 🌱</p>
            <div className="hero-stats">
              <div className="hero-stat"><span className="hero-stat-num">{totalScans}</span><span className="hero-stat-label">Scans</span></div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat"><span className="hero-stat-num">{points}</span><span className="hero-stat-label">Points</span></div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat"><span className="hero-stat-num">{streak}🔥</span><span className="hero-stat-label">Streak</span></div>
            </div>
          </div>

          <div
            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {scanning && (
              <div className="scanning-overlay">
                <div className="scan-ring"></div>
                <div className="scan-text">🔍 Analyzing waste with AI...</div>
              </div>
            )}
            {preview && <img className="preview-img" src={preview} alt="preview" />}
            {!preview && (
              <div className="upload-content">
                <div className="upload-icon">📷</div>
                <div className="upload-title">Drop your waste image here</div>
                <div className="upload-hint">PNG, JPG, WEBP · Max 10MB · Drag & drop supported</div>
                <label className="btn-primary">
                  📂 Choose File
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
                </label>
              </div>
            )}
            {preview && !scanning && (
              <label className="btn-secondary" style={{ marginTop: "1rem", display: "inline-block" }}>
                🔄 Try Another Image
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              </label>
            )}
            {pointsPopup && <div className="points-popup">+10 pts! 🎉</div>}
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

          {result && (
            <>
              <div className="result-card">
                <div className="result-top">
                  <div className="result-left">
                    <div className="result-badge">✓ Identified</div>
                    <div className="result-name">{result.name}</div>
                    <div className="result-desc">{result.desc}</div>
                    <div className="result-category-tag">{result.category}</div>
                  </div>
                  <div className="waste-score-wrap">
                    <div className="waste-score" style={{
                      background: result.wasteScore > 7 ? "#fee2e2" : result.wasteScore > 4 ? "#fef9c3" : "#f0fdf4",
                      color: result.wasteScore > 7 ? "#b91c1c" : result.wasteScore > 4 ? "#854d0e" : "#15803d",
                      borderColor: result.wasteScore > 7 ? "#fca5a5" : result.wasteScore > 4 ? "#fde68a" : "#bbf7d0"
                    }}>
                      {result.wasteScore}<span style={{fontSize:"11px"}}>/10</span>
                    </div>
                    <div className="waste-score-label">Hazard Score</div>
                  </div>
                </div>
                <div className="confidence-label">
                  <span>AI Confidence</span><span>{result.confidence}%</span>
                </div>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${result.confidence}%` }}></div>
                </div>
                {result.chemistryNote && (
                  <div className="chemistry-note">
                    🔬 <strong>Chemistry:</strong> {result.chemistryNote}
                  </div>
                )}
              </div>

              <div className="section-title">Recycling & Disposal Guide</div>
              <div className="tutorial-cards">
                {result.tutorials.map((t, i) => (
                  <div className="tutorial-card" key={i}>
                    <div className="tutorial-icon">{t.icon}</div>
                    <div className="tutorial-label">{t.label}</div>
                    <div className="tutorial-title">{t.title}</div>
                    <div className="tutorial-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-title">Waste Categories</div>
          <div className="categories">
            {categories.map(cat => (
              <div key={cat} className={`cat-chip ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}>{cat}</div>
            ))}
          </div>
        </div>
      )}

      {/* ===== DASHBOARD ===== */}
      {page === "dashboard" && (
        <div className="page">
          <h2 className="page-title">📊 Dashboard</h2>

          <div className="points-card">
            <div className="points-left">
              <div className="level-emoji">{level.emoji}</div>
              <div>
                <div className="level-name">{level.name}</div>
                <div className="level-sub">{totalScans} scans · {streak} day streak 🔥</div>
              </div>
            </div>
            <div className="points-right">
              <div className="points-number">{points}</div>
              <div className="points-label">green points</div>
            </div>
          </div>

          <div className="level-progress-wrap">
            <div className="level-progress-bar">
              <div className="level-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="level-progress-label">
              <span>{level.name}</span>
              {nextLevel && <span>Next: {nextLevel.name} at {nextLevel.min} pts</span>}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon">🔍</div><div className="stat-number">{totalScans}</div><div className="stat-label">Total Scans</div></div>
            <div className="stat-card"><div className="stat-icon">🌱</div><div className="stat-number">{points}</div><div className="stat-label">Green Points</div></div>
            <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-number">{streak}</div><div className="stat-label">Day Streak</div></div>
            <div className="stat-card"><div className="stat-icon">♻️</div><div className="stat-number">{history.filter(h => h.category === "Plastic").length}</div><div className="stat-label">Plastics Found</div></div>
          </div>

          {categoryCounts.length > 0 && (
            <>
              <div className="section-title">Waste Breakdown</div>
              <div className="chart-wrap">
                {categoryCounts.map(({ cat, count }) => (
                  <div key={cat} className="chart-row">
                    <div className="chart-label">{cat}</div>
                    <div className="chart-bar-wrap">
                      <div className="chart-bar" style={{ width: `${(count / totalScans) * 100}%` }}></div>
                    </div>
                    <div className="chart-count">{count}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-title">Levels</div>
          <div className="levels-grid">
            {LEVELS.map(l => (
              <div key={l.name} className={`level-card ${level.name === l.name ? "active" : ""}`}>
                <div className="level-card-emoji">{l.emoji}</div>
                <div className="level-card-name">{l.name}</div>
                <div className="level-card-pts">{l.min}+ pts</div>
              </div>
            ))}
          </div>

          <div className="section-title">Recent Scans</div>
          {history.length === 0 ? (
            <div className="empty-state">No scans yet — go identify some waste! 🌱</div>
          ) : (
            <div className="history-list">
              {history.slice(0, 5).map(h => (
                <div key={h.id} className="history-item">
                  <div className="history-icon">{h.icon}</div>
                  <div className="history-info">
                    <div className="history-name">{h.name}</div>
                    <div className="history-meta">{h.category} · {h.date}</div>
                  </div>
                  <div className="history-confidence">{h.confidence}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {page === "history" && (
        <div className="page">
          <h2 className="page-title">📋 Scan History</h2>
          <div className="categories" style={{ marginBottom: "1.5rem" }}>
            {categories.map(cat => (
              <div key={cat} className={`cat-chip ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}>{cat}</div>
            ))}
          </div>
          {categoryHistory.length === 0 ? (
            <div className="empty-state">No scans in this category yet! 🌱</div>
          ) : (
            <div className="history-list">
              {categoryHistory.map(h => (
                <div key={h.id} className="history-item">
                  <div className="history-icon">{h.icon}</div>
                  <div className="history-info">
                    <div className="history-name">{h.name}</div>
                    <div className="history-meta">{h.category} · {h.date} at {h.time}</div>
                  </div>
                  <div className="history-confidence">{h.confidence}%</div>
                </div>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <button className="btn-danger" onClick={() => { setHistory([]); localStorage.removeItem("ww_history"); }}>
              🗑️ Clear All History
            </button>
          )}
        </div>
      )}

      {/* ===== AI CHAT ===== */}
      {page === "chat" && (
        <div className="page">
          <h2 className="page-title">🤖 AI Chat</h2>
          <p style={{ color: "#6b6b6b", fontSize: "14px", marginBottom: "1.5rem" }}>
            Ask anything about recycling, composting, or waste disposal!
          </p>
          <div className="chat-box">
            {chatMessages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === "assistant" && <div className="chat-avatar">🌱</div>}
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-msg assistant">
                <div className="chat-avatar">🌱</div>
                <div className="chat-bubble chat-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-row" onSubmit={sendChat}>
            <input className="chat-input" value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about recycling..." />
            <button className="btn-primary" type="submit" disabled={chatLoading}>Send ↗</button>
          </form>
        </div>
      )}

      {/* ===== LEADERBOARD ===== */}
      {page === "leaderboard" && (
        <div className="page">
          <h2 className="page-title">🏆 Leaderboard</h2>
          <p style={{ color: "#6b6b6b", fontSize: "14px", marginBottom: "1.5rem" }}>
            Top recyclers in the WasteWise community!
          </p>
          <div className="leaderboard-list">
            {leaderboardWithYou.map((l, i) => (
              <div key={l.name} className={`leaderboard-item ${l.isYou ? "you" : ""}`}>
                <div className="lb-rank">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </div>
                <div className="lb-emoji">{l.emoji}</div>
                <div className="lb-info">
                  <div className="lb-name">{l.name} {l.isYou && <span className="you-tag">You</span>}</div>
                  <div className="lb-badge">{l.badge}</div>
                </div>
                <div className="lb-points">{l.points} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== MAP ===== */}
      {page === "map" && (
        <div className="page">
          <h2 className="page-title">🗺️ Recycling Centers</h2>
          <p style={{ color: "#6b6b6b", fontSize: "14px", marginBottom: "1.5rem" }}>
            Find recycling and waste disposal centers near you.
          </p>
          <div className="map-embed">
            <iframe
  title="Recycling Centers"
  width="100%"
  height="450"
  style={{ border: 0, borderRadius: "14px" }}
  loading="lazy"
  allowFullScreen
  src="https://www.openstreetmap.org/export/embed.html?bbox=73.7,18.4,74.1,18.7&layer=mapnik&marker=18.5204,73.8567"
            ></iframe>
          </div>
          <div className="section-title">Common Recycling Centers</div>
          <div className="centers-list">
            {[
              { name: "Municipal Recycling Facility", type: "General Waste", distance: "2.1 km", icon: "🏭" },
              { name: "E-Waste Collection Point", type: "Electronics", distance: "3.4 km", icon: "📱" },
              { name: "Organic Composting Center", type: "Organic Waste", distance: "1.8 km", icon: "🌱" },
              { name: "Hazardous Waste Disposal", type: "Hazardous", distance: "5.2 km", icon: "⚠️" },
              { name: "Paper & Cardboard Depot", type: "Paper", distance: "0.9 km", icon: "📄" },
            ].map((c, i) => (
              <div key={i} className="center-item">
                <div className="center-icon">{c.icon}</div>
                <div className="center-info">
                  <div className="center-name">{c.name}</div>
                  <div className="center-type">{c.type}</div>
                </div>
                <div className="center-distance">{c.distance}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="footer-note">WasteWise · Built for a greener planet 🌍</div>
    </div>
  );
}