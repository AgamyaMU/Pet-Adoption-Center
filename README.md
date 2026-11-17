# Pet House — Pet Adoption Center 🐾

A lightweight full-stack **Web Technology college project** inspired by a sage-green pet adoption UI reference.

## Tech stack
- Frontend: HTML5, CSS3, vanilla JavaScript
- Server: Node.js built-in HTTP module (no npm dependencies)
- Persistence: local JSON file (`data/store.json`)
- Security: password hashing using Node.js `scrypt`, HTTP-only admin session cookie, server-side input checks

## Run
1. Install Node.js 18 or newer.
2. Open the project directory in a terminal.
3. Run `npm start`.
4. Open `http://localhost:3000`.
5. Admin login: click **Log in** on the website, enter username `admin` and password `PetHouse@123` (demo only), then open `/admin.html`.

**For a demo only:** set `ADMIN_USER` and `ADMIN_PASSWORD` environment variables to change the credentials. The default password is not appropriate for a public deployment. Admin sessions are stored in memory and disappear when the server restarts. User login validates credentials but does not create a persistent user session. Do not deploy this prototype publicly with real personal information.

## Modules
- Responsive home page and pet browsing by category
- Pet profiles and adoption request form
- User registration and login
- Admin overview, pet creation/deletion, application review and status updates
- Persistent JSON records

## Five JavaScript validation screenshots
Open **Join our family** and capture the form with the following invalid submissions. Add each screenshot to your college report:

| Figure | Test | Expected message |
|---|---|---|
| Fig 1.1 | Submit with all fields blank | This field is required. |
| Fig 1.2 | Enter `Ab1!` as password with other fields valid | Password must contain at least 8 characters. |
| Fig 1.3 | Enter `invalid-email` with other fields valid | Enter a valid email address. |
| Fig 1.4 | Enter `abcdefgh` as password with other fields valid | Use uppercase, lowercase, number and special character. |
| Fig 1.5 | Enter `12345` as phone number with other fields valid | Phone number must contain exactly 10 digits. |

Example valid password: `PetHouse@123`; example valid phone: `9876543210`.

## Suggested viva questions
1. What is client-side validation? — JavaScript checks input before submitting it to the server.
2. Why is server-side validation also needed? — Browser validation can be bypassed.
3. What is a regular expression? — A pattern used to match strings such as emails and phone numbers.
4. How does the admin dashboard work? — It uses protected HTTP API endpoints to manage JSON records.
5. How are passwords stored? — Salted and hashed using `scrypt`, not saved as plain text.
6. What is responsive design? — A layout that adapts to different screen sizes.

## Project notes
- Pet photography is loaded from Unsplash and fonts from Google Fonts, so those visual assets need an internet connection.
- The supplied reference is used for visual direction; this is an original implementation, not an editable import of the reference Figma design.
- This is an educational prototype, not a production-ready adoption service.
