const state = {
  search: "",
  league: "all",
  country: "all",
  status: "all"
};

const $ = (selector) => document.querySelector(selector);
const supporterGroups = window.supporterGroups ?? [];

const leagueFilter = $("#league-filter");
const countryFilter = $("#country-filter");
const statusFilter = $("#status-filter");
const searchInput = $("#search-input");
const resultsGrid = $("#results-grid");
const resultsCount = $("#results-count");
const graphNodes = $("#graph-nodes");
const matchResults = $("#match-results");
const matchCopy = $("#match-copy");
const meetupSignals = $("#meetup-signals");

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

function uniqueValues(key) {
  return [...new Set(supporterGroups.map((group) => group[key]))].sort((a, b) => a.localeCompare(b));
}

function populateSelect(selectElement, values, label) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || label;
    selectElement.append(option);
  });
}

function setMetrics() {
  $("#metric-groups").textContent = supporterGroups.length;
  $("#metric-countries").textContent = uniqueValues("country").length;
  $("#metric-leagues").textContent = uniqueValues("league").length;
}

function createCommunityCard(group) {
  const template = $("#community-card-template");
  const fragment = template.content.cloneNode(true);

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

function filterGroups() {
  const term = state.search.trim().toLowerCase();

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

  if (groups.length === 0) {
    resultsGrid.innerHTML = `<div class="empty-state">No communities matched those filters yet. Try a broader league or country, or launch a new meetup signal.</div>`;
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
    pill.textContent = node.value;
    graphNodes.append(pill);
  });
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

function wireScrollButtons() {
  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scrollTarget);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindFilters() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderResults();
  });

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
    state.search = "";
    state.league = "all";
    state.country = "all";
    state.status = "all";
    searchInput.value = "";
    leagueFilter.value = "all";
    countryFilter.value = "all";
    statusFilter.value = "all";
    renderResults();
  });
}

function bindPassport() {
  const form = $("#passport-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const matches = rankMatches(formData);
    renderMatches(matches, formData);
  });

  $("#google-signin-placeholder").addEventListener("click", () => {
    matchCopy.textContent = "Google sign-in is a planned next step. This MVP keeps the flow visible so auth can be wired in without redesigning the product.";
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

function populateFormOptions() {
  populateSelect(leagueFilter, uniqueValues("league"), "League");
  populateSelect(countryFilter, uniqueValues("country"), "Country");
  populateSelect($("#passport-league"), uniqueValues("league"), "League");
}

function init() {
  setMetrics();
  populateFormOptions();
  renderResults();
  renderGraph();
  renderMeetupSignals();
  wireScrollButtons();
  bindFilters();
  bindPassport();
  bindMeetupForm();
}

init();
