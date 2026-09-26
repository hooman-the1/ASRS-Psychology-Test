# ASRS

This repository currently contains an empty Angular shell. The ASRS questionnaire will be added in later tasks.

## Setup and commands

Install Node.js 20 LTS and npm. From the repository root:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:4200/` to see the empty app.

```sh
npm test
npm run build
```

The non-interactive test command needs a local Chrome or Chromium installation. If the launcher cannot find it, set `CHROME_BIN` to the browser executable before running `npm test`. On Windows, Microsoft Edge's `msedge.exe` can be used as `CHROME_BIN`.
