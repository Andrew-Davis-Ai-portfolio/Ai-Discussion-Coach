// app.js
// AI Discussion Coach — Conversation Dojo for New AI Cert Holders
// All logic is client-side only. No external APIs.

(function () {
  const DOM = {};
  const state = {
    profile: null,
    history: [],
    tts: {
      supported:
        "speechSynthesis" in window &&
        typeof window.speechSynthesis !== "undefined" &&
        typeof window.SpeechSynthesisUtterance !== "undefined",
      synth: window.speechSynthesis || null,
      currentUtterance: null,
    },
    lastScenario: {
      mode: null,
      difficulty: null,
      scenarioText: "",
      openingLine: "",
    },
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheDom();
    wireProfile();
    wireScenario();
    wirePractice();
    setupTTSButtons();
    loadProfileFromStorage();
    updateProfileStatus("Profile ready. Save once after edits.");
    if (DOM.ttsScenarioStatus && state.tts.supported) {
      DOM.ttsScenarioStatus.textContent = "TTS online — generate a scenario and listen.";
    }
  }

  function cacheDom() {
    DOM.nameInput = document.getElementById("nameInput");
    DOM.certsInput = document.getElementById("certsInput");
    DOM.roleInput = document.getElementById("roleInput");
    DOM.stackInput = document.getElementById("stackInput");
    DOM.focusInput = document.getElementById("focusInput");

    DOM.saveProfileBtn = document.getElementById("saveProfileBtn");
    DOM.profileStatus = document.getElementById("profileStatus");

    DOM.modeSelect = document.getElementById("modeSelect");
    DOM.difficultySelect = document.getElementById("difficultySelect");
    DOM.generateScenarioBtn = document.getElementById("generateScenarioBtn");

    DOM.scenarioText = document.getElementById("scenarioText");
    DOM.scenarioOpening = document.getElementById("scenarioOpening");

    DOM.responseInput = document.getElementById("responseInput");
    DOM.submitResponseBtn = document.getElementById("submitResponseBtn");
    DOM.responseStatus = document.getElementById("responseStatus");

    DOM.feedbackAuthority = document.getElementById("feedbackAuthority");
    DOM.feedbackClarity = document.getElementById("feedbackClarity");
    DOM.feedbackPresence = document.getElementById("feedbackPresence");
    DOM.feedbackRelevance = document.getElementById("feedbackRelevance");
    DOM.overallStatus = document.getElementById("overallStatus");
    DOM.hardTruthText = document.getElementById("hardTruthText");
    DOM.correctionList = document.getElementById("correctionList");

    DOM.historyList = document.getElementById("historyList");

    DOM.ttsScenarioBtn = document.getElementById("ttsScenarioBtn");
    DOM.ttsScenarioStatus = document.getElementById("ttsScenarioStatus");
    DOM.ttsFeedbackBtn = document.getElementById("ttsFeedbackBtn");
    DOM.ttsMatrixBtn = document.getElementById("ttsMatrixBtn");

    // Vector matrix DOM
    DOM.barOutcome = document.getElementById("barOutcome");
    DOM.barRisk = document.getElementById("barRisk");
    DOM.barTech = document.getElementById("barTech");
    DOM.barHuman = document.getElementById("barHuman");
    DOM.barConf = document.getElementById("barConf");

    DOM.barOutcomeValue = document.getElementById("barOutcomeValue");
    DOM.barRiskValue = document.getElementById("barRiskValue");
    DOM.barTechValue = document.getElementById("barTechValue");
    DOM.barHumanValue = document.getElementById("barHumanValue");
    DOM.barConfValue = document.getElementById("barConfValue");

    DOM.matrixNeighborsList = document.getElementById("matrixNeighborsList");
  }

  // PROFILE HANDLING

  function wireProfile() {
    DOM.saveProfileBtn.addEventListener("click", () => {
      const profile = {
        name: DOM.nameInput.value.trim(),
        certs: DOM.certsInput.value.trim(),
        role: DOM.roleInput.value.trim(),
        stack: DOM.stackInput.value.trim(),
        focus: DOM.focusInput.value.trim(),
      };
      state.profile = profile;
      try {
        localStorage.setItem("aiDiscussionProfile", JSON.stringify(profile));
        updateProfileStatus("Profile saved to this browser.");
      } catch (e) {
        console.warn("localStorage error:", e);
        updateProfileStatus("Unable to save profile (storage blocked).", true);
      }
    });
  }

  function loadProfileFromStorage() {
    try {
      const raw = localStorage.getItem("aiDiscussionProfile");
      if (!raw) return;
      const profile = JSON.parse(raw);
      state.profile = profile;

      DOM.nameInput.value = profile.name || "";
      DOM.certsInput.value = profile.certs || "";
      DOM.roleInput.value = profile.role || "";
      DOM.stackInput.value = profile.stack || "";
      DOM.focusInput.value = profile.focus || "";
      updateProfileStatus("Profile loaded from this browser.");
    } catch (e) {
      console.warn("Failed to load profile:", e);
      updateProfileStatus("Could not load profile data.", true);
    }
  }

  function updateProfileStatus(msg, isError) {
    if (!DOM.profileStatus) return;
    DOM.profileStatus.textContent = msg;
    DOM.profileStatus.style.color = isError ? "#ff808f" : "#a7afc4";
  }

  // SCENARIO GENERATION

  function wireScenario() {
    DOM.generateScenarioBtn.addEventListener("click", () => {
      if (!state.profile) {
        state.profile = {
          name: DOM.nameInput.value.trim(),
          certs: DOM.certsInput.value.trim(),
          role: DOM.roleInput.value.trim(),
          stack: DOM.stackInput.value.trim(),
          focus: DOM.focusInput.value.trim(),
        };
      }

      const mode = DOM.modeSelect.value;
      const difficulty = DOM.difficultySelect.value;
      const profile = state.profile || {};

      const scenario = buildScenario(mode, difficulty, profile);
      state.lastScenario = {
        mode,
        difficulty,
        scenarioText: scenario.scenarioText,
        openingLine: scenario.openingLine,
      };

      DOM.scenarioText.textContent = scenario.scenarioText;
      DOM.scenarioOpening.textContent = scenario.openingLine;

      stopSpeaking();
      DOM.ttsScenarioStatus.textContent = "Scenario ready for TTS.";
      DOM.responseStatus.textContent = "";
    });
  }

  function buildScenario(mode, difficulty, profile) {
    const roleText = profile.role || "AI professional";
    const focus = profile.focus || "";
    const certSnippet = profile.certs
      ? "You’ve mentioned certifications like " + truncate(profile.certs, 80) + ". "
      : "";
    const stackSnippet = profile.stack
      ? "Your main tools include " + truncate(profile.stack, 80) + ". "
      : "";

    const difficultyTone = (() => {
      switch (difficulty) {
        case "warm":
          return "The tone is friendly but focused.";
        case "neutral":
          return "They’re short on time and want a direct, grounded answer.";
        case "cold":
          return "They sound skeptical and a little impatient. You must hold your ground calmly.";
        default:
          return "";
      }
    })();

    let scenarioText = "";
    let openingLine = "";

    if (mode === "recruiter") {
      scenarioText =
        `You're on a 15-minute screening call with a recruiter for a remote role where you'll be expected to turn AI certifications into real execution. ` +
        `${difficultyTone} ${certSnippet}${stackSnippet}` +
        (focus ? `You especially want to get better at: ${focus}. ` : "") +
        `The recruiter is trying to decide whether to pass you to the hiring manager.`;

      openingLine =
        `“Can you walk me through how your certifications actually show up in your day-to-day work — in plain language, not buzzwords?”`;
    } else if (mode === "hiringManager") {
      scenarioText =
        `You're speaking with a hiring manager who leads an AI implementation team. ` +
        `They already know your resume and certs; now they want to see if you can connect strategy, tools, and deployment. ` +
        `${difficultyTone} ${stackSnippet}` +
        (focus ? `You need to prove you can handle: ${focus}. ` : "") +
        `They care about evidence, systems, and how you work with non-technical stakeholders.`;

      openingLine =
        `“Pick one AI project you’ve done and walk me through it — from problem to deployment — like you would if we were about to trust you with our systems.”`;
    } else if (mode === "executive") {
      scenarioText =
        `You’re in a short meeting with a non-technical executive who controls budget and risk. ` +
        `They’ve heard ‘AI’ a thousand times and are tired of vague pitches. ` +
        `${difficultyTone} ${certSnippet}${stackSnippet}` +
        `Your job is to explain your value in outcomes: safer decisions, clearer governance, and real ROI — without drowning them in jargon.`;

      openingLine =
        `“I don’t need the technical details. In one minute: why should I trust you to bring AI into this business without creating chaos or risk?”`;
    } else if (mode === "coworker") {
      scenarioText =
        `You’re having a hallway-style conversation with a coworker who’s wary of AI. ` +
        `They worry about hype, job threats, and broken systems. ` +
        `${difficultyTone}` +
        (focus ? `You want to improve how you explain: ${focus}. ` : "") +
        `Your job is to stay calm, honest, and grounded — showing how responsible AI actually protects people and workflows.`;

      openingLine =
        `“Look, isn’t AI just another overhyped trend? Why should we trust these systems at all instead of just doing things the way we already do?”`;
    } else {
      scenarioText =
        "Select a conversation mode and difficulty to generate a realistic scenario.";
      openingLine =
        "Once generated, your opening line to respond to will appear here.";
    }

    return { scenarioText, openingLine };
  }

  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max - 3) + "..." : text;
  }

  // PRACTICE / ASSESSMENT

  function wirePractice() {
    DOM.submitResponseBtn.addEventListener("click", () => {
      const response = DOM.responseInput.value.trim();
      if (!response) {
        DOM.responseStatus.textContent =
          "Your response is empty. Say something to the room.";
        return;
      }

      const mode = state.lastScenario.mode || DOM.modeSelect.value;
      const assessments = assessResponse(response, state.profile || {}, mode);
      renderFeedback(assessments);
      addToHistory(mode, assessments, response);
      updateVectorMatrix();
      DOM.responseStatus.textContent =
        "Assessment updated. Review the feedback, study the matrix, and run another rep.";
      stopSpeaking();
    });
  }

  function assessResponse(text, profile, mode) {
    const lower = text.toLowerCase();
    const lengthScore = text.length;
    const hasShort = lengthScore < 220;

    const fillers = ["kind of", "sort of", "maybe", "i guess", " um ", " uh ", " like, "];
    const buzzwords = ["synergy", "paradigm", "leverage", "revolutionary", "disruptive"];
    const outcomeWords = [
      "faster",
      "safer",
      "more accurate",
      "accuracy",
      "reliable",
      "reduce risk",
      "reduced risk",
      "less risk",
      "time saved",
      "save time",
      "save money",
      "cost",
      "efficiency",
      "efficient",
      "outcome",
      "results",
    ];

    const riskWords = [
      "risk",
      "governance",
      "compliance",
      "secure",
      "security",
      "safe",
      "safety",
      "guardrail",
    ];
    const techWords = [
      "pipeline",
      "model",
      "architecture",
      "deployment",
      "api",
      "vector",
      "embedding",
      "transformer",
      "inference",
      "infrastructure",
    ];
    const humanWords = [
      "team",
      "stakeholder",
      "people",
      "training",
      "communication",
      "onboard",
      "support",
      "partner",
    ];

    const fillerCount = countMatches(lower, fillers);
    const buzzCount = countMatches(lower, buzzwords);
    const outcomeHits = countMatches(lower, outcomeWords);
    const riskHits = countMatches(lower, riskWords);
    const techHits = countMatches(lower, techWords);
    const humanHits = countMatches(lower, humanWords);

    const profileTerms = collectProfileTerms(profile);
    const mentionsProfileTerm = profileTerms.some((t) => lower.includes(t));

    const startsWeak =
      lower.startsWith("so ") ||
      lower.startsWith("well ") ||
      lower.startsWith("i mean") ||
      lower.startsWith("honestly");

    // Opening Authority
    let authority;
    if (hasShort && outcomeHits === 0 && !mentionsProfileTerm) {
      authority = "FAIL";
    } else if (startsWeak || fillerCount > 2 || hasShort) {
      authority = "BORDERLINE";
    } else {
      authority = "PASS";
    }

    // Clarity & Translation
    const usesJargon =
      lower.includes("llm") ||
      lower.includes("latent") ||
      lower.includes("embedding") ||
      lower.includes("vector db") ||
      lower.includes("transformer");
    const explainsValue = outcomeHits > 0;
    let clarity;
    if (usesJargon && !explainsValue) {
      clarity = "FAIL";
    } else if (usesJargon && explainsValue) {
      clarity = "BORDERLINE";
    } else {
      clarity = "PASS";
    }

    // Confidence & Presence
    const hedges = ["i think", "i hope", "i'm not sure", "maybe", "hopefully"];
    const hedgeCount = countMatches(lower, hedges);
    let presence;
    if (hedgeCount >= 3 || fillerCount >= 4) {
      presence = "FAIL";
    } else if (hedgeCount >= 1 || fillerCount >= 2) {
      presence = "BORDERLINE";
    } else {
      presence = "PASS";
    }

    // Relevance
    const modeHints = {
      recruiter: ["recruiter", "screening", "resume"],
      hiringManager: ["deploy", "implementation", "pipeline", "architecture", "monitoring"],
      executive: ["risk", "roi", "cost", "stakeholder", "governance", "outcome"],
      coworker: ["team", "workflow", "job", "impact", "trust"],
    };

    const hints = modeHints[mode] || [];
    const mentionsModeHints = hints.some((h) => lower.includes(h));
    let relevance;
    if (!mentionsModeHints && !mentionsProfileTerm) {
      relevance = "FAIL";
    } else {
      relevance = "PASS";
    }

    const overallStatus = computeOverallStatus({
      authority,
      clarity,
      presence,
      relevance,
    });

    const hardTruth = buildHardTruth({
      authority,
      clarity,
      presence,
      relevance,
      overallStatus,
    });

    const correctionReps = buildCorrections({
      authority,
      clarity,
      presence,
      relevance,
      hasShort,
      fillerCount,
      buzzCount,
      outcomeHits,
      mentionsProfileTerm,
    });

    // Vector embedding for Signal Matrix (pseudo vector DB)
    const confidenceScore = Math.max(
      0,
      10 - (hedgeCount + fillerCount) // more hedges/fillers = lower score
    );
    const vector = [
      outcomeHits, // outcome focus
      riskHits, // risk & governance
      techHits, // tech depth
      humanHits, // human / stakeholder
      confidenceScore, // confidence
    ];

    return {
      authority,
      clarity,
      presence,
      relevance,
      overallStatus,
      hardTruth,
      correctionReps,
      vector,
    };
  }

  function collectProfileTerms(profile) {
    const terms = [];
    if (profile.certs) {
      terms.push(
        ...profile.certs
          .toLowerCase()
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
    if (profile.stack) {
      terms.push(
        ...profile.stack
          .toLowerCase()
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
    return terms.slice(0, 10);
  }

  function countMatches(text, phrases) {
    let count = 0;
    phrases.forEach((p) => {
      if (!p) return;
      if (text.includes(p)) count++;
    });
    return count;
  }

  function computeOverallStatus(parts) {
    if (parts.clarity === "FAIL" || parts.presence === "FAIL") {
      return "NOT READY";
    }
    const fails = [parts.authority, parts.clarity, parts.presence, parts.relevance].filter(
      (s) => s === "FAIL"
    );
    const borders = [parts.authority, parts.clarity, parts.presence, parts.relevance].filter(
      (s) => s === "BORDERLINE"
    );

    if (fails.length === 0 && borders.length === 0) return "READY";
    if (fails.length === 0) return "READY";
    if (fails.length > 0 && fails.length <= 2) return "BORDERLINE";
    return "NOT READY";
  }

  function buildHardTruth(parts) {
    const { authority, clarity, presence, relevance, overallStatus } = parts;

    if (overallStatus === "READY") {
      if (clarity === "BORDERLINE" || authority === "BORDERLINE") {
        return "This is strong — tune your first sentence and cut a little jargon, and you’ll be ready for serious rooms.";
      }
      return "This response would hold up in most rooms. Keep refining your rhythm, not just your vocabulary.";
    }

    if (overallStatus === "BORDERLINE") {
      if (clarity === "FAIL") {
        return "You sound knowledgeable, but your message is tangled. In a real room, people will nod and still not know what you actually do.";
      }
      if (presence === "FAIL") {
        return "You know the content, but your language sounds uncertain. Under pressure, that hesitation will cost you trust.";
      }
      return "This might work in a friendly room, but it will crack under pressure. You’re close — tighten your open and anchor your outcomes.";
    }

    // NOT READY
    if (clarity === "FAIL" && presence === "FAIL") {
      return "Right now, you’re hiding behind words instead of holding the room. No panic — this is the rep where we get honest so the next one gets sharper.";
    }
    if (relevance === "FAIL") {
      return "You’re saying smart things, but not to the room you’re actually in. Real conversations demand alignment, not just intelligence.";
    }
    return "In its current form, this answer would not land in a real conversation. Strip it down, make it shorter, and speak to one clear outcome.";
  }

  function buildCorrections(ctx) {
    const reps = [];
    if (ctx.hasShort) {
      reps.push("Add one concrete sentence that shows what you did, not just what you know.");
    } else {
      reps.push("Try trimming two sentences so your answer feels tighter and more intentional.");
    }

    if (!ctx.mentionsProfileTerm) {
      reps.push(
        "Mention at least one cert or tool from your profile and tie it to a specific action you took."
      );
    }

    if (ctx.outcomeHits === 0) {
      reps.push(
        "Add one clear outcome: time saved, risk reduced, money protected, or accuracy improved."
      );
    }

    if (ctx.fillerCount > 0) {
      reps.push(
        "Remove one filler phrase like “kind of”, “maybe”, or “I guess” to sound more grounded."
      );
    }

    if (ctx.buzzCount > 0) {
      reps.push("Replace one buzzword with a concrete example from your work.");
    }

    return reps.slice(0, 3);
  }

  function renderFeedback(a) {
    DOM.feedbackAuthority.textContent = a.authority;
    DOM.feedbackClarity.textContent = a.clarity;
    DOM.feedbackPresence.textContent = a.presence;
    DOM.feedbackRelevance.textContent = a.relevance;
    DOM.hardTruthText.textContent = a.hardTruth;

    DOM.overallStatus.textContent = a.overallStatus;
    DOM.overallStatus.classList.remove(
      "status-pill-ready",
      "status-pill-borderline",
      "status-pill-notready",
      "status-pill-neutral"
    );

    if (a.overallStatus === "READY") {
      DOM.overallStatus.classList.add("status-pill-ready");
    } else if (a.overallStatus === "BORDERLINE") {
      DOM.overallStatus.classList.add("status-pill-borderline");
    } else if (a.overallStatus === "NOT READY") {
      DOM.overallStatus.classList.add("status-pill-notready");
    } else {
      DOM.overallStatus.classList.add("status-pill-neutral");
    }

    while (DOM.correctionList.firstChild) {
      DOM.correctionList.removeChild(DOM.correctionList.firstChild);
    }
    a.correctionReps.forEach((rep) => {
      const li = document.createElement("li");
      li.textContent = rep;
      DOM.correctionList.appendChild(li);
    });
  }

  // HISTORY & VECTOR MEMORY

  function addToHistory(mode, assessments, responseText) {
    const modeLabel = (() => {
      switch (mode) {
        case "recruiter":
          return "Recruiter — Screening";
        case "hiringManager":
          return "Hiring Manager";
        case "executive":
          return "Executive";
        case "coworker":
          return "Skeptical Coworker";
        default:
          return "Unknown Mode";
      }
    })();

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const snippet = truncate(responseText, 120);

    state.history.unshift({
      mode,
      modeLabel,
      status: assessments.overallStatus,
      time: timeStr,
      vector: assessments.vector.slice(),
      snippet,
    });

    state.history = state.history.slice(0, 12);
    renderHistory();
  }

  function renderHistory() {
    while (DOM.historyList.firstChild) {
      DOM.historyList.removeChild(DOM.historyList.firstChild);
    }

    if (state.history.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "No sessions yet. Run a scenario and submit your first response.";
      DOM.historyList.appendChild(li);
      return;
    }

    state.history.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "history-meta";

      const modeSpan = document.createElement("span");
      modeSpan.className = "history-mode";
      modeSpan.textContent = entry.modeLabel;

      const statusSpan = document.createElement("span");
      statusSpan.className = "history-status";
      statusSpan.textContent = entry.status;

      meta.appendChild(modeSpan);
      meta.appendChild(statusSpan);

      const timeSpan = document.createElement("span");
      timeSpan.className = "history-time";
      timeSpan.textContent = entry.time;

      li.appendChild(meta);
      li.appendChild(timeSpan);

      DOM.historyList.appendChild(li);
    });
  }

  function updateVectorMatrix() {
    if (!DOM.barOutcome) return;

    if (state.history.length === 0) {
      setBars([0, 0, 0, 0, 0]);
      renderMatrixNeighbors(null);
      return;
    }

    const vectors = state.history
      .map((h) => h.vector)
      .filter((v) => Array.isArray(v) && v.length === 5);
    if (vectors.length === 0) {
      setBars([0, 0, 0, 0, 0]);
      renderMatrixNeighbors(null);
      return;
    }

    const avg = [0, 0, 0, 0, 0];
    vectors.forEach((v) => {
      for (let i = 0; i < 5; i++) {
        avg[i] += v[i];
      }
    });
    for (let i = 0; i < 5; i++) {
      avg[i] = avg[i] / vectors.length;
    }

    setBars(avg);
    renderMatrixNeighbors(state.history[0]);
  }

  function setBars(avgVector) {
    const maxOutcome = 6;
    const maxRisk = 6;
    const maxTech = 6;
    const maxHuman = 6;
    const maxConf = 10;

    const toPct = (val, maxVal) => {
      if (maxVal <= 0) return 0;
      const p = Math.max(0, Math.min(1, val / maxVal));
      return Math.round(p * 100);
    };

    const outcomePct = toPct(avgVector[0], maxOutcome);
    const riskPct = toPct(avgVector[1], maxRisk);
    const techPct = toPct(avgVector[2], maxTech);
    const humanPct = toPct(avgVector[3], maxHuman);
    const confPct = toPct(avgVector[4], maxConf);

    if (DOM.barOutcome) DOM.barOutcome.style.width = outcomePct + "%";
    if (DOM.barRisk) DOM.barRisk.style.width = riskPct + "%";
    if (DOM.barTech) DOM.barTech.style.width = techPct + "%";
    if (DOM.barHuman) DOM.barHuman.style.width = humanPct + "%";
    if (DOM.barConf) DOM.barConf.style.width = confPct + "%";

    if (DOM.barOutcomeValue) DOM.barOutcomeValue.textContent = outcomePct + "%";
    if (DOM.barRiskValue) DOM.barRiskValue.textContent = riskPct + "%";
    if (DOM.barTechValue) DOM.barTechValue.textContent = techPct + "%";
    if (DOM.barHumanValue) DOM.barHumanValue.textContent = humanPct + "%";
    if (DOM.barConfValue) DOM.barConfValue.textContent = confPct + "%";
  }

  function renderMatrixNeighbors(anchorEntry) {
    if (!DOM.matrixNeighborsList) return;

    while (DOM.matrixNeighborsList.firstChild) {
      DOM.matrixNeighborsList.removeChild(DOM.matrixNeighborsList.firstChild);
    }

    if (!anchorEntry || state.history.length <= 1) {
      const li = document.createElement("li");
      li.className = "matrix-empty";
      li.textContent =
        "Your next answer will start connecting reps together in the vector memory.";
      DOM.matrixNeighborsList.appendChild(li);
      return;
    }

    const anchorVec = anchorEntry.vector;
    const neighbors = [];

    for (let i = 1; i < state.history.length; i++) {
      const entry = state.history[i];
      if (!entry.vector || entry.vector.length !== 5) continue;
      const sim = cosineSimilarity(anchorVec, entry.vector);
      neighbors.push({ entry, sim });
    }

    neighbors.sort((a, b) => b.sim - a.sim);
    const top = neighbors.slice(0, 2).filter((n) => n.sim > 0);

    if (top.length === 0) {
      const li = document.createElement("li");
      li.className = "matrix-empty";
      li.textContent =
        "No strong matches yet — keep practicing and the matrix will start clustering your style.";
      DOM.matrixNeighborsList.appendChild(li);
      return;
    }

    top.forEach((n) => {
      const li = document.createElement("li");
      li.className = "matrix-neighbor-item";

      const head = document.createElement("div");
      head.className = "matrix-neighbor-head";

      const modeSpan = document.createElement("span");
      modeSpan.className = "matrix-neighbor-mode";
      modeSpan.textContent = n.entry.modeLabel;

      const metaSpan = document.createElement("span");
      metaSpan.className = "matrix-neighbor-meta";
      metaSpan.textContent =
        n.entry.status + " · " + n.entry.time + " · sim " + n.sim.toFixed(2);

      head.appendChild(modeSpan);
      head.appendChild(metaSpan);

      const snippet = document.createElement("div");
      snippet.className = "matrix-neighbor-snippet";
      snippet.textContent = "“" + (n.entry.snippet || "").replace(/\s+/g, " ") + "”";

      li.appendChild(head);
      li.appendChild(snippet);

      DOM.matrixNeighborsList.appendChild(li);
    });
  }

  function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // TTS

  function setupTTSButtons() {
    if (!state.tts.supported) {
      if (DOM.ttsScenarioBtn) {
        DOM.ttsScenarioBtn.disabled = true;
        DOM.ttsScenarioBtn.title = "TTS not supported in this browser.";
      }
      if (DOM.ttsFeedbackBtn) {
        DOM.ttsFeedbackBtn.disabled = true;
        DOM.ttsFeedbackBtn.title = "TTS not supported in this browser.";
      }
      if (DOM.ttsMatrixBtn) {
        DOM.ttsMatrixBtn.disabled = true;
        DOM.ttsMatrixBtn.title = "TTS not supported in this browser.";
      }
      if (DOM.ttsScenarioStatus) {
        DOM.ttsScenarioStatus.textContent = "TTS not available.";
      }
      return;
    }

    if (DOM.ttsScenarioBtn) {
      DOM.ttsScenarioBtn.addEventListener("click", () => {
        const text =
          (state.lastScenario.scenarioText || "").trim() +
          " " +
          (state.lastScenario.openingLine || "").trim();
        if (!text.trim()) {
          DOM.ttsScenarioStatus.textContent =
            "Generate a scenario first, then use TTS.";
          return;
        }
        speak(text, "scenario");
      });
    }

    if (DOM.ttsFeedbackBtn) {
      DOM.ttsFeedbackBtn.addEventListener("click", () => {
        const status = DOM.overallStatus.textContent || "";
        const hardTruth = DOM.hardTruthText.textContent || "";
        const corrections = Array.from(
          DOM.correctionList.querySelectorAll("li")
        ).map((li) => li.textContent);
        if (!status || status === "NO DATA") {
          DOM.responseStatus.textContent =
            "Submit a response first — then I can read your feedback aloud.";
          return;
        }
        const text =
          "Overall status: " +
          status +
          ". Hard truth: " +
          hardTruth +
          ". Correction reps: " +
          corrections.join(". ") +
          ".";
        speak(text, "feedback");
      });
    }

    if (DOM.ttsMatrixBtn) {
      DOM.ttsMatrixBtn.addEventListener("click", () => {
        if (state.history.length === 0) {
          speak(
            "Vector memory is empty. Run a few reps and I’ll start mapping your signal.",
            "matrix"
          );
          return;
        }

        const last = state.history[0];
        const avgVector = computeAverageVector();
        const [outcomePct, riskPct, techPct, humanPct, confPct] = vectorPercents(
          avgVector
        );

        let summary =
          "Signal matrix summary. Outcome focus: " +
          describeLevel(outcomePct) +
          ". Risk and governance: " +
          describeLevel(riskPct) +
          ". Technical depth: " +
          describeLevel(techPct) +
          ". Human and stakeholder focus: " +
          describeLevel(humanPct) +
          ". Confidence signal: " +
          describeLevel(confPct) +
          ". ";

        if (state.history.length > 1) {
          const neighbors = nearestNeighbors(last, 1);
          if (neighbors.length > 0) {
            const n = neighbors[0];
            summary +=
              "Your closest past rep is a " +
              n.entry.status +
              " " +
              n.entry.modeLabel +
              " conversation with similarity " +
              n.sim.toFixed(2) +
              ".";
          }
        }

        speak(summary, "matrix");
      });
    }
  }

  function computeAverageVector() {
    if (state.history.length === 0) return [0, 0, 0, 0, 0];
    const acc = [0, 0, 0, 0, 0];
    let count = 0;
    state.history.forEach((h) => {
      if (!h.vector || h.vector.length !== 5) return;
      for (let i = 0; i < 5; i++) {
        acc[i] += h.vector[i];
      }
      count++;
    });
    if (count === 0) return [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      acc[i] = acc[i] / count;
    }
    return acc;
  }

  function vectorPercents(vector) {
    const maxOutcome = 6;
    const maxRisk = 6;
    const maxTech = 6;
    const maxHuman = 6;
    const maxConf = 10;

    const toPct = (val, maxVal) => {
      if (maxVal <= 0) return 0;
      const p = Math.max(0, Math.min(1, val / maxVal));
      return Math.round(p * 100);
    };

    const outcomePct = toPct(vector[0], maxOutcome);
    const riskPct = toPct(vector[1], maxRisk);
    const techPct = toPct(vector[2], maxTech);
    const humanPct = toPct(vector[3], maxHuman);
    const confPct = toPct(vector[4], maxConf);

    return [outcomePct, riskPct, techPct, humanPct, confPct];
  }

  function nearestNeighbors(anchorEntry, count) {
    const anchorVec = anchorEntry.vector;
    const neighbors = [];

    for (let i = 1; i < state.history.length; i++) {
      const entry = state.history[i];
      if (!entry.vector || entry.vector.length !== 5) continue;
      const sim = cosineSimilarity(anchorVec, entry.vector);
      neighbors.push({ entry, sim });
    }

    neighbors.sort((a, b) => b.sim - a.sim);
    return neighbors.slice(0, count).filter((n) => n.sim > 0);
  }

  function describeLevel(pct) {
    if (pct >= 75) return "high";
    if (pct >= 40) return "moderate";
    if (pct > 0) return "low";
    return "inactive";
  }

  function speak(text, source) {
    if (!state.tts.supported || !state.tts.synth) return;
    try {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = source === "scenario" ? 1.02 : 1.0;
      utterance.pitch = source === "scenario" ? 1.0 : source === "matrix" ? 0.98 : 0.96;
      utterance.onstart = () => {
        if (source === "scenario" && DOM.ttsScenarioStatus) {
          DOM.ttsScenarioStatus.textContent = "Speaking scenario...";
        }
      };
      utterance.onend = () => {
        if (source === "scenario" && DOM.ttsScenarioStatus) {
          DOM.ttsScenarioStatus.textContent = "Scenario ready. Replay anytime.";
        }
      };
      state.tts.currentUtterance = utterance;
      state.tts.synth.speak(utterance);
    } catch (e) {
      console.warn("TTS error:", e);
      if (source === "scenario" && DOM.ttsScenarioStatus) {
        DOM.ttsScenarioStatus.textContent = "Unable to speak the scenario.";
      }
    }
  }

  function stopSpeaking() {
    if (!state.tts.supported || !state.tts.synth) return;
    try {
      state.tts.synth.cancel();
      state.tts.currentUtterance = null;
    } catch (e) {
      console.warn("TTS cancel error:", e);
    }
  }
})();
