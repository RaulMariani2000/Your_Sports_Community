# Your Sport Community

Your Sport Community is a GitHub-ready MVP for a global supporter network platform. The concept goes beyond a club directory: it is designed to help sports fans discover existing supporter communities, find nearby fans with similar team preferences, and launch local matchday meetups when a city does not already have an organized group.

## What this MVP includes

- A polished landing page for the "find your team away from home" experience
- A searchable supporter-community explorer with seeded global data
- Supporter graph visualization using team, league, and country relationships
- A fan passport flow for matching users with likely communities
- A meetup launchpad for starting new local supporter scenes
- Firebase-ready authentication for Google, email/password, and guest access
- Supporter profiles with saved leagues, teams, city, and matchday style preferences

## Project structure

```text
.
|-- .env.example
|-- .gitignore
|-- firebase.local.example.js
|-- index.html
|-- styles.css
|-- src/
|   |-- app.js
|   |-- firebaseConfig.js
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

## Firebase setup

To enable real authentication and cloud-saved profiles:

1. Create a Firebase project.
2. Enable Authentication providers:
   - Google
   - Email/Password
   - Anonymous
3. Create a Firestore database.
4. Copy `firebase.local.example.js` to `firebase.local.js`.
5. Paste your Firebase web app config into `firebase.local.js`.
6. Serve the site locally and test sign-in from `http://127.0.0.1:8000/`.

This app stores supporter profiles in a Firestore collection named `profiles`. Until Firebase is configured, it falls back to local browser storage so the UI still works.

## Keeping config out of GitHub

- `firebase.local.js` is ignored by `.gitignore`, so your local Firebase config stays out of the repo.
- `.env.example` is included as a safe template for future hosting or build pipelines.
- In a browser app, Firebase web config is not a true secret once shipped to users. Real protection comes from Firebase Authentication, Firestore security rules, and API/domain restrictions.

## Product direction

This version uses seed data to demonstrate the product model. A fuller platform could add:

- Real maps with geocoded community locations
- Official supporter-club ingestion pipelines
- RSVP and event management
- Moderator and organizer roles
- Community claiming and verification
- Team calendars, reminders, and broadcast discovery
- Messaging and cross-city supporter graph analytics

## Data notes

The seeded entries are representative demo records intended to shape the product and UI. Before production launch, supporter groups, venues, and social handles should be verified against official branch directories, club supporter maps, and community-run sources.
