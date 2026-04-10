import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { supporterGroups } from "./data/supporterData.js";
import { firebaseWebConfig, isFirebaseConfigured } from "./firebaseConfig.js";

const state = {
  search: "",
  mapSearch: "",
  league: "all",
  country: "all",
  status: "all"
};

const firebaseState = {
  enabled: false,
  auth: null,
  db: null,
  user: null
};

const profileStorageKey = "ysc-fan-profile";
const sportsGlyphs = ["\u26BD", "\u{1F3C0}", "\u{1F3C8}", "\u26BE", "\u{1F3D2}", "\u{1F3C9}", "\u{1F3BE}", "\u{1F3CE}\uFE0F"];

const $ = (selector) => document.querySelector(selector);

const leagueFilter = $("#league-filter");
const countryFilter = $("#country-filter");
const statusFilter = $("#status-filter");
const resultsGrid = $("#results-grid");
const resultsCount = $("#results-count");
const graphNodes = $("#graph-nodes");
const matchResults = $("#match-results");
const matchCopy = $("#match-copy");
const meetupSignals = $("#meetup-signals");
const mapSearchInput = $("#map-search-input");
const mapDotsLayer = $("#map-dots-layer");
const mapResultsCount = $("#map-results-count");
const authModal = $("#auth-modal");
const accountSummary = $("#account-summary");
const brandMark = $("#brand-mark");
const brandMarkGlyph = $("#brand-mark-glyph");
const passportLeague = $("#passport-league");
const passportTeam = $("#passport-team");
const authStatus = $("#auth-status");

const seedSignals = [
  {
    city: "Berlin",
    team: "Toronto Maple Leafs",
    venue: "Need a bar partner",
    need: "A host venue"
  },
  {
    city: "Lisbon",
    team: "Chicago Bears",
    venue: "Rotating watch party homes",
    need: "More founding fans"
  },
  {
    city: "Seoul",
    team: "Arsenal Women",
    venue: "Organizer scouting locations",
    need: "A local organizer"
  }
];

const fallbackProfile = {
  signedIn: false,
  name: "",
  city: "",
  mode: "pub",
  leagues: [],
  teams: [],
  provider: "local"
};

const leagueBrand = {
  "Premier League": { short: "EPL", colors: ["#6c1d45", "#00ff87"] },
  "La Liga": { short: "LL", colors: ["#9b111e", "#f7b538"] },
  NFL: { short: "NFL", colors: ["#013369", "#d50a0a"] },
  MLB: { short: "MLB", colors: ["#041e42", "#c8102e"] },
  NHL: { short: "NHL", colors: ["#111111", "#7f8c8d"] },
  NBA: { short: "NBA", colors: ["#17408b", "#c9082a"] },
  "International Rugby": { short: "RUG", colors: ["#1b4332", "#95d5b2"] },
  "Super Lig": { short: "TSL", colors: ["#c1121f", "#fcbf49"] },
  "Formula 1": { short: "F1", colors: ["#111111", "#e10600"] }
};

const teamBrand = {
  Arsenal: { short: "ARS", colors: ["#db0007", "#9c824a"] },
  "FC Barcelona": { short: "BAR", colors: ["#a50044", "#004d98"] },
  "Dallas Cowboys": { short: "DAL", colors: ["#041e42", "#869397"] },
  "New York Yankees": { short: "NYY", colors: ["#132448", "#c4ced4"] },
  "Toronto Maple Leafs": { short: "TOR", colors: ["#003e7e", "#ffffff"] },
  "Los Angeles Lakers": { short: "LAL", colors: ["#552583", "#fdb927"] },
  "All Blacks": { short: "AB", colors: ["#111111", "#555555"] },
  Galatasaray: { short: "GS", colors: ["#a71930", "#ffb612"] },
  "Golden State Warriors": { short: "GSW", colors: ["#1d428a", "#ffc72c"] },
  "Real Madrid": { short: "RMA", colors: ["#00529f", "#febe10"] },
  "Scuderia Ferrari": { short: "FER", colors: ["#dc0000", "#f7d117"] },
  "Kansas City Chiefs": { short: "KC", colors: ["#e31837", "#ffb81c"] }
};

function uniqueValues(key) {
  return [...new Set(supporterGroups.map((group) => group[key]))].sort((a, b) => a.localeCompare(b));
}

function getTeamsForLeagues(leagues) {
  const source = leagues.length === 0
    ? supporterGroups
    : supporterGroups.filter((group) => leagues.includes(group.league));

  return [...new Set(source.map((group) => group.team))].sort((a, b) => a.localeCompare(b));
}

function populateSelect(selectElement, values, label) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || label;
    selectElement.append(option);
  });
}

function clearOptions(selectElement, firstOptionLabel) {
  selectElement.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = firstOptionLabel;
  selectElement.append(option);
}

function setAuthStatus(message, type = "default") {
  authStatus.textContent = message;
  if (type === "default") {
    authStatus.removeAttribute("data-state");
  } else {
    authStatus.dataset.state = type;
  }
}

function setMetrics() {
  $("#metric-groups").textContent = supporterGroups.length;
  $("#metric-countries").textContent = uniqueValues("country").length;
  $("#metric-leagues").textContent = uniqueValues("league").length;
}

function createCommunityCard(group) {
  const template = $("#community-card-template");
  const fragment = template.content.cloneNode(true);

  applyLogo(fragment.querySelector(".league-logo"), getLeagueBrand(group.league));
  applyLogo(fragment.querySelector(".team-logo"), getTeamBrand(group.team));
  fragment.querySelector(".community-league").textContent = `${group.league} | ${group.sport}`;
  fragment.querySelector(".community-team").textContent = group.team;

  const statusEl = fragment.querySelector(".community-status");
  statusEl.textContent = group.status.replace("-", " ");
  statusEl.classList.add(group.status);

  fragment.querySelector(".community-location").textContent = `${group.city}, ${group.country}`;
  fragment.querySelector(".community-venue").textContent = `Meetup anchor: ${group.venue}`;
  fragment.querySelector(".community-description").textContent = group.description;

  const meta = fragment.querySelector(".community-meta");
  [`${group.activeFans} active fans`, group.source].forEach((item) => {
    const pill = document.createElement("span");
    pill.className = "meta-pill";
    pill.textContent = item;
    meta.append(pill);
  });

  const socials = fragment.querySelector(".community-socials");
  group.socials.forEach((social) => {
    const pill = document.createElement("span");
    pill.className = "social-pill";
    pill.textContent = `${social.label}: ${social.handle}`;
    socials.append(pill);
  });

  return fragment;
}

function makeGradient(colors) {
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

function initialsFromText(value, max = 3) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
}

function getLeagueBrand(league) {
  return leagueBrand[league] ?? { short: initialsFromText(league), colors: ["#345", "#678"] };
}

function getTeamBrand(team) {
  return teamBrand[team] ?? { short: initialsFromText(team), colors: ["#7a1f1f", "#1f4d7a"] };
}

function applyLogo(element, brand) {
  if (!element) return;
  element.textContent = brand.short;
  element.style.background = makeGradient(brand.colors);
}

function filterGroups() {
  const term = state.mapSearch.trim().toLowerCase();

  if (term === "") {
    return [];
  }

  return supporterGroups.filter((group) => {
    const matchesSearch = term === "" || [
      group.team,
      group.league,
      group.city,
      group.country,
      group.venue,
      group.sport
    ].some((value) => value.toLowerCase().includes(term));

    const matchesLeague = state.league === "all" || group.league === state.league;
    const matchesCountry = state.country === "all" || group.country === state.country;
    const matchesStatus = state.status === "all" || group.status === state.status;

    return matchesSearch && matchesLeague && matchesCountry && matchesStatus;
  });
}

function renderResults() {
  const groups = filterGroups();
  resultsGrid.innerHTML = "";
  resultsCount.textContent = `${groups.length} ${groups.length === 1 ? "community" : "communities"}`;

  if (state.mapSearch.trim() === "") {
    resultsGrid.innerHTML = `<div class="empty-state">Use the world map search above to choose a team or league, then matching supporter communities will appear here.</div>`;
    return;
  }

  if (groups.length === 0) {
    resultsGrid.innerHTML = `<div class="empty-state">No communities matched that map search after filters were applied. Try a broader team or league above.</div>`;
    return;
  }

  groups.forEach((group) => {
    resultsGrid.append(createCommunityCard(group));
  });
}

function renderGraph() {
  graphNodes.innerHTML = "";

  const teams = uniqueValues("team").slice(0, 8).map((value) => ({ value, type: "team" }));
  const leagues = uniqueValues("league").map((value) => ({ value, type: "league" }));
  const countries = uniqueValues("country").slice(0, 8).map((value) => ({ value, type: "country" }));

  [...teams, ...leagues, ...countries].forEach((node) => {
    const pill = document.createElement("span");
    pill.className = `node-pill ${node.type}`;

    if (node.type === "team" || node.type === "league") {
      const logo = document.createElement("span");
      logo.className = "mini-logo";
      applyLogo(logo, node.type === "team" ? getTeamBrand(node.value) : getLeagueBrand(node.value));
      pill.append(logo);
    }

    const text = document.createElement("span");
    text.textContent = node.value;
    pill.append(text);
    graphNodes.append(pill);
  });
}

function getMapMatches(searchTerm) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return supporterGroups;

  return supporterGroups.filter((group) => {
    return group.team.toLowerCase().includes(term)
      || group.league.toLowerCase().includes(term)
      || group.city.toLowerCase().includes(term)
      || group.country.toLowerCase().includes(term);
  });
}

function renderMap(searchTerm = "") {
  const matches = getMapMatches(searchTerm);
  state.mapSearch = searchTerm;

  mapDotsLayer.innerHTML = "";
  mapResultsCount.textContent = `${matches.length} plotted ${matches.length === 1 ? "community" : "communities"}`;

  supporterGroups.forEach((group) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `map-dot${matches.some((match) => match.id === group.id) ? " active" : ""}`;
    dot.style.left = `${group.coordinates.x}%`;
    dot.style.top = `${group.coordinates.y}%`;
    dot.innerHTML = `<span class="map-dot-label">${group.city}</span>`;
      dot.title = `${group.team} in ${group.city}`;
      dot.addEventListener("click", () => {
        mapSearchInput.value = group.team;
        renderMap(group.team);
      });
    mapDotsLayer.append(dot);
  });

  if (matches.length === 0) {
    renderResults();
    return;
  }

  renderResults();
}

function renderMeetupSignals(signals = seedSignals) {
  meetupSignals.innerHTML = "";
  signals.forEach((signal) => {
    const card = document.createElement("article");
    card.className = "signal-card";
    card.innerHTML = `
      <strong>${signal.team} in ${signal.city}</strong>
      <p>Need: ${signal.need}</p>
      <p>Venue: ${signal.venue}</p>
    `;
    meetupSignals.append(card);
  });
}

function rankMatches(formData) {
  const city = (formData.get("city") || "").trim().toLowerCase();
  const team = (formData.get("team") || "").trim().toLowerCase();
  const league = (formData.get("league") || "").trim();
  const mode = formData.get("mode");

  return supporterGroups
    .map((group) => {
      let score = 0;
      if (city && group.city.toLowerCase() === city) score += 4;
      if (city && group.country.toLowerCase() === city) score += 2;
      if (team && group.team.toLowerCase().includes(team)) score += 6;
      if (league && group.league === league) score += 3;
      if (mode === "pub" && group.venue.toLowerCase().includes("bar")) score += 2;
      if (group.status === "organized") score += 2;
      if (group.status === "needs-host") score += 1;
      return { ...group, score };
    })
    .filter((group) => group.score > 0)
    .sort((a, b) => b.score - a.score || b.activeFans - a.activeFans)
    .slice(0, 4);
}

function renderMatches(matches, formData) {
  matchResults.innerHTML = "";

  if (matches.length === 0) {
    const fallbackCity = formData.get("city") || "your city";
    matchCopy.textContent = `No exact supporter branch was found for ${fallbackCity} in this seed dataset. That is exactly where the meetup launch flow becomes valuable.`;
    matchResults.innerHTML = `<div class="empty-state">No direct match yet. Use the meetup launchpad below to start the first local signal for your fan identity.</div>`;
    return;
  }

  const team = formData.get("team") || "your fan profile";
  matchCopy.textContent = `Best current matches for ${team}. These are ranked by city, team, league, and matchday style fit.`;

  matches.forEach((match) => {
    const card = document.createElement("article");
    card.className = "match-card";
    card.innerHTML = `
      <strong>${match.team} | ${match.city}, ${match.country}</strong>
      <p>${match.league} | ${match.activeFans} active fans | ${match.status.replace("-", " ")}</p>
      <p>Meetup anchor: ${match.venue}</p>
    `;
    matchResults.append(card);
  });
}

function loadLocalProfile() {
  try {
    const saved = localStorage.getItem(profileStorageKey);
    if (!saved) return { ...fallbackProfile };
    return { ...fallbackProfile, ...JSON.parse(saved) };
  } catch {
    return { ...fallbackProfile };
  }
}

function saveLocalProfile(profile) {
  localStorage.setItem(profileStorageKey, JSON.stringify(profile));
}

async function loadProfile() {
  if (!firebaseState.enabled || !firebaseState.user || !firebaseState.db) {
    return loadLocalProfile();
  }

  const localProfile = loadLocalProfile();
  try {
    const snapshot = await getDoc(doc(firebaseState.db, "profiles", firebaseState.user.uid));
    if (!snapshot.exists()) {
      return {
        ...localProfile,
        signedIn: true,
        name: firebaseState.user.displayName || localProfile.name,
        provider: firebaseState.user.isAnonymous ? "guest" : "firebase"
      };
    }

    return {
      ...fallbackProfile,
      ...snapshot.data(),
      signedIn: true,
      name: snapshot.data().name || firebaseState.user.displayName || "",
      provider: firebaseState.user.isAnonymous ? "guest" : "firebase"
    };
  } catch {
    return loadLocalProfile();
  }
}

async function saveProfile(profile) {
  saveLocalProfile(profile);

  if (!firebaseState.enabled || !firebaseState.user || !firebaseState.db) {
    return;
  }

  await setDoc(
    doc(firebaseState.db, "profiles", firebaseState.user.uid),
    {
      ...profile,
      email: firebaseState.user.email || "",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function createChip(label, isActive, onClick) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `choice-chip${isActive ? " active" : ""}`;
  chip.textContent = label;
  chip.addEventListener("click", onClick);
  return chip;
}

function renderChipSelector(container, options, selectedValues, onToggle) {
  container.innerHTML = "";
  options.forEach((option) => {
    const chip = createChip(option, selectedValues.includes(option), () => onToggle(option));
    container.append(chip);
  });
}

function toggleSelectedValue(values, target) {
  return values.includes(target)
    ? values.filter((value) => value !== target)
    : [...values, target];
}

function updateTeamChipGrid(profile) {
  const teamGrid = $("#team-chip-grid");
  const availableTeams = getTeamsForLeagues(profile.leagues);
  profile.teams = profile.teams.filter((team) => availableTeams.includes(team));

  renderChipSelector(teamGrid, availableTeams, profile.teams, (team) => {
    profile.teams = toggleSelectedValue(profile.teams, team);
    updateTeamChipGrid(profile);
  });
}

function renderProfileSummary(profile) {
  accountSummary.innerHTML = "";

  if (!profile.signedIn) {
    accountSummary.innerHTML = `
      <strong>No supporter profile saved yet.</strong>
      <p>Choose Google, email, or guest access and save multiple leagues and teams to personalize your fan map.</p>
    `;
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <strong>${profile.name || "Supporter"} is signed in</strong>
    <p>${profile.city || "No city saved yet"} | ${profile.mode} | ${profile.provider}</p>
  `;

  const summaryList = document.createElement("div");
  summaryList.className = "summary-list";
  [...profile.leagues, ...profile.teams].forEach((item) => {
    const pill = document.createElement("span");
    pill.className = "summary-pill";
    pill.textContent = item;
    summaryList.append(pill);
  });

  accountSummary.append(wrapper, summaryList);
}

function populatePassportFromProfile(profile) {
  $("#passport-city").value = profile.city || "";
  $("#passport-mode").value = profile.mode || "pub";

  clearOptions(passportLeague, "Any league");
  populateSelect(passportLeague, profile.leagues.length ? profile.leagues : uniqueValues("league"), "League");
  if (profile.leagues[0]) passportLeague.value = profile.leagues[0];

  clearOptions(passportTeam, "Choose from your saved teams");
  populateSelect(passportTeam, profile.teams.length ? profile.teams : getTeamsForLeagues(profile.leagues), "Team");
  if (profile.teams[0]) passportTeam.value = profile.teams[0];
}

function hydrateProfileUI(profile) {
  $("#profile-name").value = profile.name || "";
  $("#profile-city").value = profile.city || "";
  $("#profile-mode").value = profile.mode || "pub";

  const leagueGrid = $("#league-chip-grid");
  renderChipSelector(leagueGrid, uniqueValues("league"), profile.leagues, (league) => {
    profile.leagues = toggleSelectedValue(profile.leagues, league);
    hydrateProfileUI(profile);
  });

  updateTeamChipGrid(profile);
  renderProfileSummary(profile);
  populatePassportFromProfile(profile);
}

async function refreshProfileUI() {
  const profile = await loadProfile();
  hydrateProfileUI(profile);

  if (!profile.signedIn) {
    if (firebaseState.enabled && !firebaseState.user) {
      setAuthStatus("Firebase is connected. Sign in with Google, email, or guest mode.", "success");
    } else if (!firebaseState.enabled) {
      setAuthStatus("Firebase config missing. Using local browser storage until keys are added.", "error");
    } else {
      setAuthStatus("Not signed in");
    }
    return;
  }

  setAuthStatus(`Signed in as ${profile.name || "supporter"}`, "success");
}

function collectProfileDraft() {
  return {
    signedIn: firebaseState.user ? true : loadLocalProfile().signedIn,
    name: $("#profile-name").value.trim(),
    city: $("#profile-city").value.trim(),
    mode: $("#profile-mode").value,
    leagues: [...document.querySelectorAll("#league-chip-grid .choice-chip.active")].map((chip) => chip.textContent),
    teams: [...document.querySelectorAll("#team-chip-grid .choice-chip.active")].map((chip) => chip.textContent),
    provider: firebaseState.user?.isAnonymous ? "guest" : firebaseState.user ? "firebase" : "local"
  };
}

async function openAuthModal() {
  await refreshProfileUI();
  if (typeof authModal.showModal === "function") {
    authModal.showModal();
  }
}

function closeAuthModal() {
  if (authModal.open) authModal.close();
}

async function handleGoogleSignIn() {
  if (!firebaseState.enabled || !firebaseState.auth) {
    setAuthStatus("Add your Firebase keys in src/firebaseConfig.js to enable Google sign-in.", "error");
    return;
  }

  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(firebaseState.auth, provider);
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function handleGuestSignIn() {
  if (!firebaseState.enabled || !firebaseState.auth) {
    const profile = loadLocalProfile();
    profile.signedIn = true;
    profile.provider = "guest";
    await saveProfile(profile);
    await refreshProfileUI();
    setAuthStatus("Guest mode enabled locally. Add Firebase config to persist guest users in Firebase.", "success");
    return;
  }

  try {
    await signInAnonymously(firebaseState.auth);
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function handleEmailAuth(mode) {
  if (!firebaseState.enabled || !firebaseState.auth) {
    setAuthStatus("Add your Firebase keys in src/firebaseConfig.js to enable email accounts.", "error");
    return;
  }

  const email = $("#email-auth-email").value.trim();
  const password = $("#email-auth-password").value;

  if (!email || !password) {
    setAuthStatus("Email and password are both required.", "error");
    return;
  }

  try {
    if (mode === "signup") {
      await createUserWithEmailAndPassword(firebaseState.auth, email, password);
    } else {
      await signInWithEmailAndPassword(firebaseState.auth, email, password);
    }
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function handleSaveProfile() {
  try {
    const draft = collectProfileDraft();
    if (firebaseState.user) {
      draft.signedIn = true;
      draft.name = draft.name || firebaseState.user.displayName || firebaseState.user.email || "Supporter";
      draft.provider = firebaseState.user.isAnonymous ? "guest" : "firebase";
    }
    await saveProfile(draft);
    await refreshProfileUI();
    closeAuthModal();
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function handleSignOut() {
  try {
    saveLocalProfile({ ...fallbackProfile });
    if (firebaseState.enabled && firebaseState.auth && firebaseState.user) {
      await signOut(firebaseState.auth);
    }
    await refreshProfileUI();
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

function cycleBrandLogo() {
  let index = 0;
  setInterval(() => {
    index = (index + 1) % sportsGlyphs.length;
    brandMark.classList.remove("is-animating");
    void brandMark.offsetWidth;
    brandMarkGlyph.textContent = sportsGlyphs[index];
    brandMark.classList.add("is-animating");
  }, 2200);
}

function wireScrollButtons() {
  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scrollTarget);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindFilters() {
  leagueFilter.addEventListener("change", (event) => {
    state.league = event.target.value;
    renderResults();
  });

  countryFilter.addEventListener("change", (event) => {
    state.country = event.target.value;
    renderResults();
  });

  statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderResults();
  });

  $("#reset-filters").addEventListener("click", () => {
    state.league = "all";
    state.country = "all";
    state.status = "all";
    leagueFilter.value = "all";
    countryFilter.value = "all";
    statusFilter.value = "all";
    renderResults();
  });
}

function bindPassport() {
  const form = $("#passport-form");

  passportLeague.addEventListener("change", () => {
    const teams = getTeamsForLeagues([passportLeague.value].filter(Boolean));
    clearOptions(passportTeam, "Choose from your saved teams");
    populateSelect(passportTeam, teams, "Team");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const matches = rankMatches(formData);
    renderMatches(matches, formData);
  });

  $("#match-from-profile").addEventListener("click", async () => {
    const profile = await loadProfile();
    if (!profile.signedIn) {
      matchCopy.textContent = "Sign in first so your supporter profile can prefill your leagues, teams, and city.";
      await openAuthModal();
      return;
    }

    populatePassportFromProfile(profile);
    const formData = new FormData(form);
    const matches = rankMatches(formData);
    renderMatches(matches, formData);
  });
}

function bindMeetupForm() {
  const form = $("#meetup-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const newSignal = {
      city: formData.get("city") || "Unknown city",
      team: formData.get("team") || "Unnamed supporters",
      venue: formData.get("venue") || "Venue TBD",
      need: formData.get("need") === "host"
        ? "A host venue"
        : formData.get("need") === "fans"
          ? "More founding fans"
          : "A local organizer"
    };

    seedSignals.unshift(newSignal);
    renderMeetupSignals(seedSignals);
    form.reset();
  });
}

function bindMap() {
  mapSearchInput.addEventListener("input", (event) => {
    renderMap(event.target.value);
  });
}

function bindAuthFlow() {
  ["#open-auth-modal", "#hero-auth-button", "#passport-auth-button", "#edit-profile-button"].forEach((selector) => {
    $(selector).addEventListener("click", () => {
      openAuthModal();
    });
  });

  $("#google-signin-button").addEventListener("click", handleGoogleSignIn);
  $("#guest-signin-button").addEventListener("click", handleGuestSignIn);
  $("#email-signup-button").addEventListener("click", () => handleEmailAuth("signup"));
  $("#email-signin-button").addEventListener("click", () => handleEmailAuth("signin"));
  $("#save-profile-button").addEventListener("click", handleSaveProfile);
  $("#signout-button").addEventListener("click", handleSignOut);

  authModal.addEventListener("click", (event) => {
    if (event.target === authModal) closeAuthModal();
  });
}

function populateFormOptions() {
  populateSelect(leagueFilter, uniqueValues("league"), "League");
  populateSelect(countryFilter, uniqueValues("country"), "Country");
  populateSelect(passportLeague, uniqueValues("league"), "League");
  populateSelect(passportTeam, uniqueValues("team"), "Team");
}

function initFirebase() {
  if (!isFirebaseConfigured()) {
    return;
  }

  const app = initializeApp(firebaseWebConfig);
  firebaseState.auth = getAuth(app);
  firebaseState.db = getFirestore(app);
  firebaseState.enabled = true;

  onAuthStateChanged(firebaseState.auth, async (user) => {
    firebaseState.user = user;
    const profile = await loadProfile();

    if (user) {
      profile.signedIn = true;
      profile.name = profile.name || user.displayName || user.email || "Supporter";
      profile.provider = user.isAnonymous ? "guest" : "firebase";
      await saveProfile(profile);
    }

    await refreshProfileUI();
  });
}

function init() {
  setMetrics();
  populateFormOptions();
  renderResults();
  renderGraph();
  renderMap("");
  renderMeetupSignals();
  wireScrollButtons();
  bindFilters();
  bindAuthFlow();
  bindPassport();
  bindMeetupForm();
  bindMap();
  cycleBrandLogo();
  initFirebase();
  refreshProfileUI();
}

init();
