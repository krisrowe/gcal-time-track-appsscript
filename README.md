# Google Calendar Time Tracking Report Script

A Google Apps Script to analyze your calendar events from the previous or current week, categorize them based on keywords, and generate a summary report in a Google Sheet.

This project is designed to be managed locally using the [`clasp`](https://github.com/google/clasp) command-line tool.

## Features

- **Automatic Time Tracking:** Reads your Google Calendar events and calculates the time spent.
- **Keyword-Based Categorization:** Define your own project keywords in a Google Sheet to automatically categorize events.
- **Smart Week Selection:** Automatically determines whether to report on the *current* week or the *previous* week based on the day you run it.
- **Data Persistence:** Appends data to a "Time" tab in your sheet, automatically replacing any previous data for that week to prevent duplicates.
- **Easy to Use:** Run the report from a custom "Time Tracking" menu directly within your Google Sheet.

## Prerequisites

- A Google Account.
- [Node.js](https://nodejs.org/) and `npm`.
- `git` and the `gh` CLI (optional, but recommended for GitHub workflow).

## Setup Instructions

Follow these steps to set up the project in your own Google Account.

### 1. Clone the Repository
Clone this repository to your local machine:
```bash
git clone https://github.com/krisrowe/gcal-time-track-appscript.git
cd gcal-time-track-appscript
```

### 2. Install and Authenticate `clasp`
Install the `clasp` CLI globally and log in to your Google account.
```bash
npm install -g @google/clasp
clasp login
```
Follow the prompts in your browser to authorize `clasp`.

### 3. Create the Google Sheet & Apps Script Project
This script is designed to be **bound** to a Google Sheet, which will hold your configuration and the final report.

1.  **Create a new Google Sheet.**
2.  Rename the sheet to something descriptive (e.g., "Time Tracking").
3.  Create a new tab and name it **`Projects`**.
4.  In the `Projects` tab, add your keywords to **Column A**, starting in cell `A1`. Each cell should contain one keyword (e.g., "Client Meeting", "Development", "Project X").
5.  In the top menu, go to **Extensions > Apps Script**. This will create a new, bound Apps Script project.

### 4. Configure the Project
1.  **Enable the Apps Script API:** Visit [script.google.com/home/usersettings](https://script.google.com/home/usersettings) and turn on the "Google Apps Script API".
2.  **Get the Script ID:** In the Apps Script editor, click the **Project Settings (⚙️)** icon on the left. Copy the **Script ID**.
3.  **Create `.clasp.json`:** In your local project directory, create a new file named `.clasp.json` and add the following content, pasting your Script ID in the appropriate place:
    ```json
    {
      "scriptId": "YOUR_SCRIPT_ID_HERE",
      "rootDir": "."
    }
    ```

### 5. Push the Code
Push the local code to your Apps Script project.
```bash
clasp push --force
```
The `--force` flag may be needed on the first push to overwrite the default files.

## Usage

1.  **Reload** your Google Sheet.
2.  A new menu named **"Time Tracking"** will appear.
3.  Click **Time Tracking > Generate Weekly Report**.
4.  The first time, you will need to grant the script permission to access your Calendar and Sheets.
5.  The script will run and create a "Time" tab with your categorized report.
