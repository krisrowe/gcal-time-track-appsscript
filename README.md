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

---

## Setup & Installation

There are two main workflows for setting up this project:

1.  **First-Time Setup:** For users setting up the script for the first time in a new Google Sheet.
2.  **Developer Setup:** For developers contributing to an existing project.

### Option 1: First-Time Setup (New Project)

Follow these steps to set up the project from scratch in your own Google Account.

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/krisrowe/gcal-time-track-appsscript.git
    cd gcal-time-track-appsscript
    ```

2.  **Install and Authenticate `clasp`:**
    ```bash
    npm install -g @google/clasp
    clasp login
    ```

3.  **Create the Google Sheet & Apps Script Project:**
    - Create a new **Google Sheet**.
    - Create a new tab and name it **`Projects`**.
    - In the `Projects` tab, add your keywords to **Column A**, starting in cell `A1`.
    - In the top menu, go to **Extensions > Apps Script**. This creates a new, bound Apps Script project.
    - (Optional) Rename the script project. By default, it will be named "Untitled Project". Click the title in the Apps Script editor to give it a more descriptive name, like "Time Tracking Report". This name is for your reference only and does not affect the script's functionality.

4.  **Configure the Project:**
    - **Enable the Apps Script API:** Visit [script.google.com/home/usersettings](https://script.google.com/home/usersettings) and turn on the "Google Apps Script API".
    - **Get the Script ID:** In the Apps Script editor, click the **Project Settings (⚙️)** icon and copy the **Script ID**.
    - **Create `.clasp.json`:** In your local project directory, create a file named `.clasp.json` with the following content, pasting in your Script ID:
      ```json
      {
        "scriptId": "YOUR_SCRIPT_ID_HERE",
        "rootDir": "."
      }
      ```

5.  **Push the Code:**
    ```bash
    clasp push --force
    ```

### Option 2: Developer Setup (Existing Project)

Follow these steps if you are a developer contributing to an existing, already-configured Google Sheet.

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/krisrowe/gcal-time-track-appsscript.git
    cd gcal-time-track-appsscript
    ```

2.  **Install and Authenticate `clasp`:**
    ```bash
    npm install -g @google/clasp
    clasp login
    ```

3.  **Get the Script ID:**
    - You must be granted editor access to the existing Google Sheet and its bound Apps Script project.
    - Open the sheet, go to **Extensions > Apps Script**.
    - In the Apps Script editor, click the **Project Settings (⚙️)** icon and copy the **Script ID**.

4.  **Configure the Project:**
    - **Enable the Apps Script API:** Visit [script.google.com/home/usersettings](https://script.google.com/home/usersettings) and turn on the "Google Apps Script API".
    - **Create `.clasp.json`:** Create the file with the Script ID you just copied:
      ```json
      {
        "scriptId": "THE_EXISTING_SCRIPT_ID_HERE",
        "rootDir": "."
      }
      ```

5.  **Pull the Latest Code:**
    - Pull the most recent version of the script from the server to ensure your local environment is up-to-date before making changes.
    ```bash
    clasp pull
    ```

---

## Usage

1.  **Reload** your Google Sheet.
2.  A new menu named **"Time Tracking"** will appear.
3.  Click **Time Tracking > Generate Weekly Report**.
4.  The first time, you will need to grant the script permission to access your Calendar and Sheets.
5.  The script will run and create a "Time" tab with your categorized report.

---

## Future Enhancements

### CI/CD with GitHub Actions

For a professional workflow, you can automate the deployment of this script using GitHub Actions. This allows you to automatically push changes to the Apps Script project whenever you merge to your `main` branch.

The primary challenge is providing both **authentication** and the **project ID** to the non-interactive CI/CD environment. The solution is to use GitHub Secrets to securely store both of these values.

**Setup Steps:**

1.  **Create GitHub Secrets:** You will need to create two secrets in your GitHub repository. Go to **Settings > Secrets and variables > Actions** and add the following:
    -   **`CLASP_RC_JSON`**:
        -   On your local machine where you ran `clasp login`, find the authentication file located at `~/.clasprc.json`.
        -   Copy the **entire JSON content** of this file and paste it as the value for this secret.
    -   **`SCRIPT_ID`**:
        -   Open your Apps Script project and go to **Project Settings (⚙️)**.
        -   Copy your **Script ID**.
        -   Paste this ID as the value for this secret.

2.  **Create the Workflow File:**
    -   Create a new file in your repository at `.github/workflows/deploy.yml`.
    -   Add the following content to the file. This workflow will trigger on every push to the `main` branch, create the necessary configuration files from your secrets, and push the code.

    ```yaml
    name: Deploy to Google Apps Script

    on:
      push:
        branches:
          - main

    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v3

          - name: Setup Node
            uses: actions/setup-node@v3
            with:
              node-version: '18'

          - name: Install clasp
            run: npm install -g @google/clasp

          - name: Create .clasprc.json for Authentication
            run: echo '${{ secrets.CLASP_RC_JSON }}' > ~/.clasprc.json

          - name: Create .clasp.json for Project ID
            run: echo '{"scriptId":"${{ secrets.SCRIPT_ID }}", "rootDir":"."}' > .clasp.json

          - name: Push to Apps Script
            run: clasp push --force
    ```

Once this is set up, any push to the `main` branch will automatically trigger the action and deploy your script.
