import wasteData from "./data/wasteData.json";
import { useState, useEffect } from "react";
import "./App.css";

const LEVELS = [
  { name: "Eco Newbie", min: 0, max: 50, emoji: "🌱" },
  { name: "Recycler", min: 50, max: 150, emoji: "♻️" },
  { name: "Green Guard", min: 150, max: 300, emoji: "🌿" },
  { name: "Eco Warrior", min: 300, max: 500, emoji: "⚡" },
  { name: "Planet Hero", min: 500, max: Infinity, emoji: "🌍" },
];

function getLevel(points) {
  return LEVELS.find((l) => points >= l.min && points < l.max) || LEVELS[0];
}

function getTutorials(category) {

  const item = wasteData.find(
    (i) => i.category.toLowerCase() === category.toLowerCase()
  );

  if (!item) return [];

  return [
    {
      icon: "♻️",
      label: "Recycle",
      title: "How to recycle",
      desc: item.recycling_method
    },
    {
      icon: "🌱",
      label: "Decompose",
      title: "Decomposition time",
      desc: item.decomposition_time
    },
    {
      icon: "🛠️",
      label: "Steps",
      title: "Recycling steps",
      desc: item.tutorial_steps.join(", ")
    },
    {
      icon: "⚠️",
      label: "Warning",
      title: "Environmental note",
      desc: `Improper disposal of ${item.category} harms ecosystems`
    }
  ];
}

export default function App() {

  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const [points, setPoints] = useState(
    () => Number(localStorage.getItem("ww_points") || 0)
  );

  const [totalScans, setTotalScans] = useState(
    () => Number(localStorage.getItem("ww_scans") || 0)
  );

  const [streak, setStreak] = useState(
    () => Number(localStorage.getItem("ww_streak") || 0)
  );

  const [pointsPopup, setPointsPopup] = useState(false);

  useEffect(() => {
    localStorage.setItem("ww_points", points);
  }, [points]);

  useEffect(() => {
    localStorage.setItem("ww_scans", totalScans);
  }, [totalScans]);

  useEffect(() => {
    localStorage.setItem("ww_streak", streak);
  }, [streak]);

  function awardPoints() {

    const earned = 10;

    setPoints(p => p + earned);
    setTotalScans(s => s + 1);

    setPointsPopup(true);
    setTimeout(() => setPointsPopup(false), 2000);

    const lastScan = localStorage.getItem("ww_lastScan");
    const today = new Date().toDateString();

    if (lastScan !== today) {
      localStorage.setItem("ww_lastScan", today);
      setStreak(s => s + 1);
    }
  }

  async function analyzeImage(base64Data, mediaType) {

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_KEY}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mediaType};base64,${base64Data}`
                  }
                },
                {
                  type: "text",
                  text: `Identify waste item and category.

Return JSON only:

{
"name":"item name",
"desc":"short description",
"confidence":90,
"category":"Plastic"
}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await res.json();

    const text = data.choices[0].message.content;

    const match = text.match(/\{[\s\S]*\}/);

    return JSON.parse(match[0]);
  }

  function processImage(file) {

    const reader = new FileReader();

    reader.onload = async e => {

      const full = e.target.result;
      const base64 = full.split(",")[1];

      setPreview(full);
      setScanning(true);

      try {

        const ai = await analyzeImage(base64, file.type);

        const tutorials = getTutorials(ai.category);

        const finalResult = {
          ...ai,
          tutorials
        };

        setResult(finalResult);

        setHistory(h => [finalResult, ...h]);

        awardPoints();

      } catch {

        setResult(null);

      } finally {

        setScanning(false);

      }

    };

    reader.readAsDataURL(file);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) processImage(file);
  }

  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];

  const progress = nextLevel
    ? ((points - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (

    <div className="app">

      <div className="header">
        <div className="logo-mark">♻</div>
        <div>
          <div className="logo-text">WasteWise</div>
          <div className="logo-sub">AI Waste Identifier</div>
        </div>
      </div>

      <div className="points-card">

        <div className="points-left">
          <div className="level-emoji">{level.emoji}</div>

          <div>
            <div className="level-name">{level.name}</div>
            <div className="level-sub">
              {totalScans} scans · {streak} day streak 🔥
            </div>
          </div>
        </div>

        <div className="points-right">

          {pointsPopup && (
            <div className="points-popup">+10 pts</div>
          )}

          <div className="points-number">{points}</div>
          <div className="points-label">green points</div>

        </div>

      </div>

      <div className="level-progress-wrap">

        <div className="level-progress-bar">
          <div
            className="level-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

      </div>

      <div className="hero-label">Powered by AI</div>

      <h1 className="hero-title">
        Identify waste.<br />
        <span>Recycle smarter.</span>
      </h1>

      <p className="hero-sub">
        Upload a waste photo to get recycling instructions.
      </p>

      <div className="upload-zone">

        {scanning && (
          <div className="scanning-overlay">
            <div className="scan-ring"></div>
            <div className="scan-text">
              Analyzing waste...
            </div>
          </div>
        )}

        {preview && (
          <img
            className="preview-img"
            src={preview}
            alt="preview"
          />
        )}

        {!preview && (

          <div className="upload-content">

            <div className="upload-icon">📷</div>

            <div className="upload-title">
              Drop your image here
            </div>

            <div className="upload-hint">
              PNG, JPG, WEBP
            </div>

            <label className="btn-primary">

              Choose File

              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                style={{ display: "none" }}
              />

            </label>

          </div>
        )}

      </div>

      {result && (

        <div className="result-card">

          <div className="result-badge">✓ Identified</div>

          <div className="result-name">{result.name}</div>

          <div className="result-desc">{result.desc}</div>

          <div className="confidence-label">
            <span>Confidence</span>
            <span>{result.confidence}%</span>
          </div>

          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${result.confidence}%` }}
            />
          </div>

        </div>

      )}

      {result && (

        <>
          <div className="section-title">
            Recycling Guide
          </div>

          <div className="tutorial-cards">

            {result.tutorials.map((t, i) => (

              <div key={i} className="tutorial-card">

                <div className="tutorial-icon">
                  {t.icon}
                </div>

                <div className="tutorial-label">
                  {t.label}
                </div>

                <div className="tutorial-title">
                  {t.title}
                </div>

                <div className="tutorial-desc">
                  {t.desc}
                </div>

              </div>

            ))}

          </div>
        </>
      )}

      {history.length > 0 && (

        <>
          <div className="section-title">
            Scan History
          </div>

          <div className="tutorial-cards">

            {history.map((h, i) => (

              <div key={i} className="tutorial-card">

                <div className="tutorial-title">
                  {h.name}
                </div>

                <div className="tutorial-desc">
                  {h.category}
                </div>

              </div>

            ))}

          </div>
        </>
      )}

      <div className="footer-note">
        WasteWise · Built for a greener planet
      </div>

    </div>
  );
}