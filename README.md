# MAKNAZUL 'IRFAN ACADEMY - Result Portal (blue theme)

Node.js only - zero dependencies. No `npm install` needed.

Run: `node server.js` (or `npm start`), then open http://localhost:3000
Optional demo data: `node seed.js` (student MIA/24/001, PIN 1234)

First admin login: admin / admin123 - change it straight away, or set ADMIN_PASS before the first start.
Environment variables: ADMIN_USER, ADMIN_PASS, SESSION_SECRET, PORT, DATA_DIR.

Customise school name, Term/Term names, grading scale and graduation units in `lib/config.js`.
Free hosts can erase data on restart: use Backup & restore on the admin Students page regularly.
