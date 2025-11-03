// Test comment to verify clasp workflow.

/**
 * This script is bound to the Google Sheet and reads configuration from it.
 * It generates a time tracking report from the user's calendar.
 */

/**
 * Adds a custom menu to the spreadsheet UI when the sheet is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Time Tracking')
      .addItem('Generate for This Week', 'generateThisWeekReport')
      .addItem('Generate for Last Week', 'generateLastWeekReport')
      .addToUi();
}

/**
 * Wrapper function to generate a report for the current week.
 */
function generateThisWeekReport() {
  generateTimeTrackingReport('this');
}

/**
 * Wrapper function to generate a report for the previous week.
 */
function generateLastWeekReport() {
  generateTimeTrackingReport('last');
}

/**
 * Reads configuration keywords from the 'Projects' sheet in this spreadsheet.
 * @returns {string[]} An array of keywords from column A of the 'Projects' sheet.
 */
function getKeywordsFromSheet() {
  const SHEET_NAME = 'Projects';
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found.`);
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) return [];
    
    const range = sheet.getRange('A1:A' + lastRow);
    const values = range.getValues();
    return values.map(row => row[0]).filter(String);
  } catch (e) {
    Logger.log(`Error reading keywords: ${e.message}`);
    SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
    return [];
  }
}

/**
 * Deletes existing rows for a specific week from the 'Time' sheet.
 * @param {Sheet} sheet The sheet object for the 'Time' tab.
 * @param {string} weekStartDate The start date of the week to clear, formatted as 'yyyy-MM-dd'.
 */
function clearExistingWeekData(sheet, weekStartDate) {
  const data = sheet.getDataRange().getValues();
  // Loop backwards to safely delete rows without skipping any
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = new Date(data[i][0]);
    const formattedRowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (formattedRowDate === weekStartDate) {
      sheet.deleteRow(i + 1);
    }
  }
}

/**
 * Extracts a clean task name from an event title by removing project-related prefixes.
 * Handles prefixes like '<project>:' or 'Work: <project> -'.
 * @param {string} title The full title of the calendar event.
 * @param {string} projectName The name of the project matched to the event.
 * @returns {string} The cleaned task name, or the original title if no prefix is matched.
 */
function getTaskFromEventTitle(title, projectName) {
  // Escape special regex characters in the project name.
  const escapedProjectName = projectName.replace(/[.*+?^${}()|[\\\]/g, '\\$&');

  // First, try to match with a "Work : project :" prefix
  const regexWithWork = new RegExp(`^Work\s*[:\-]\s*${escapedProjectName}\s*[:\-]\s*(.+)`, 'i');
  let match = title.match(regexWithWork);
  if (match && match[1]) {
    return match[1].trim();
  }

  // If that fails, try to match with just a "project :" prefix
  const regexWithoutWork = new RegExp(`^${escapedProjectName}\s*[:\-]\s*(.+)`, 'i');
  match = title.match(regexWithoutWork);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Otherwise, return the original title.
  return title.trim();
}

/**
 * Main function to generate the time tracking report.
 * @param {string} weekOption - Determines which week to report on. Accepts 'this' or 'last'.
 */
function generateTimeTrackingReport(weekOption) {
  const ui = SpreadsheetApp.getUi();
  const keywords = getKeywordsFromSheet();
  
  if (keywords.length === 0) {
    ui.alert('Configuration is empty. Please add keywords to your Google Sheet in the "Projects" tab, column A.');
    return;
  }

  try {
    // 1. Calculate the dates for the target week based on the chosen option
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    
    let startDate, endDate;
    let reportWeekDescription;

    // Get the date for the most recent Sunday
    const sundayOfThisWeek = new Date(today.setDate(today.getDate() - dayOfWeek));

    if (weekOption === 'this') {
      reportWeekDescription = "the current week";
      startDate = sundayOfThisWeek;
    } else { // 'last'
      reportWeekDescription = "the previous week";
      startDate = new Date(new Date(sundayOfThisWeek).setDate(sundayOfThisWeek.getDate() - 7));
    }
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startFormatted = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const endFormatted = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheet.toast(`Generating report for ${reportWeekDescription}...`);
    let outputSheet = spreadsheet.getSheetByName('Time');
    if (!outputSheet) {
      outputSheet = spreadsheet.insertSheet('Time');
      outputSheet.appendRow(['Week Start', 'Week End', 'Category', 'Hours', 'Tasks']);
    } else {
      clearExistingWeekData(outputSheet, startFormatted);
    }

    // 3. Fetch calendar events
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(startDate, endDate);

    // 4. Categorize event durations and tasks
    const timeReport = {};
    keywords.forEach(keyword => { 
      timeReport[keyword] = { hours: 0, tasks: [] }; 
    });
    timeReport['Other'] = { hours: 0, tasks: [] };

    events.forEach(event => {
      const myStatus = event.getMyStatus();
      const eventStatus = typeof event.getStatus === 'function' ? event.getStatus() : null;

      // 1. Skip events that are canceled. Compare to a string as the enum is unreliable.
      if ((eventStatus && String(eventStatus).toUpperCase() === 'CANCELLED') || myStatus === CalendarApp.GuestStatus.NO) {
        return; // Skip this event entirely
      }

      const durationInMillis = event.getEndTime().getTime() - event.getStartTime().getTime();
      if (durationInMillis === 0) return; // Skip zero-duration events

      const title = event.getTitle();
      
      // Combine all relevant fields into a single string for searching
      const guestEmails = event.getGuestList().map(guest => guest.getEmail()).join(' ');
      const searchableContent = [
        title,
        event.getDescription(),
        event.getCreators().join(' '), // Organizer/creator emails
        guestEmails
      ].join(' ').toLowerCase();

      let matched = false;
      for (const keyword of keywords) {
        if (searchableContent.includes(keyword.toLowerCase())) {
          const taskName = getTaskFromEventTitle(title, keyword);
          timeReport[keyword].hours += durationInMillis;
          timeReport[keyword].tasks.push(taskName);
          matched = true;
          break; // Assign to the first category that matches
        }
      }

      // 2. For non-project events, only include them if the user is attending.
      if (!matched) {
        const isAttending = (myStatus === CalendarApp.GuestStatus.YES || 
                             myStatus === CalendarApp.GuestStatus.MAYBE || 
                             myStatus === CalendarApp.GuestStatus.OWNER);
        if (isAttending) {
          timeReport['Other'].hours += durationInMillis;
          timeReport['Other'].tasks.push(title); // For 'Other', we use the full title
        }
      }
    });

    // 5. Write the new results
    for (const category in timeReport) {
      const hours = timeReport[category].hours / (1000 * 60 * 60);
      if (hours > 0) {
        const taskList = timeReport[category].tasks.join('\n');
        outputSheet.appendRow([startFormatted, endFormatted, category, hours.toFixed(2), taskList]);
      }
    }

    // Set text wrapping on the new Tasks column
    outputSheet.getRange(1, 5, outputSheet.getMaxRows(), 1).setWrap(true);

    spreadsheet.toast(`Report complete for ${reportWeekDescription} (${startFormatted} to ${endFormatted}).`, 'Report Status', 5);

  } catch (e) {
    Logger.log(`Error during report generation: ${e.message}`);
    ui.alert(`An error occurred: ${e.message}`);
  }
}