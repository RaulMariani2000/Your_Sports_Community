# Terrace Atlas

Terrace Atlas is a GitHub-ready MVP for a global supporter network platform. The concept goes beyond a club directory: it is designed to help sports fans discover existing supporter communities, find nearby fans with similar team preferences, and launch local matchday meetups when a city does not already have an organized group.

## What this MVP includes

- A polished landing page positioning the product as a supporter network operating system
- A searchable supporter-community explorer with seeded global data
- Supporter graph visualization using team, league, and country relationships
- A fan passport flow for matching users with likely communities
- A meetup launchpad for starting new local supporter scenes
- Placeholder UX for future Google sign-in integration

## Project structure

```text
.
|-- index.html
|-- styles.css
|-- src/
|   |-- app.js
|   `-- data/
|       `-- supporterData.js
`-- README.md
```

## Running locally

Because this is a static, dependency-free MVP, you can open `index.html` directly in a browser.

If you want to serve it locally instead, you can run a simple static server such as:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Product direction

This version uses seed data to demonstrate the product model. A fuller platform could add:

- Google authentication and user profiles
- Real maps with geocoded community locations
- Official supporter-club ingestion pipelines
- RSVP and event management
- Moderator and organizer roles
- Community claiming and verification
- Team calendars, reminders, and broadcast discovery
- Messaging and cross-city supporter graph analytics

## Data notes

The seeded entries are representative demo records intended to shape the product and UI. Before production launch, supporter groups, venues, and social handles should be verified against official branch directories, club supporter maps, and community-run sources.
