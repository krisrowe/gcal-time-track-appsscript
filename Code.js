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
      .addItem('Generate Weekly Report', 'generateTimeTrackingReport')
      .addToUi();
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
 * Main function to generate the time tracking report.
 */
function generateTimeTrackingReport() {
  const ui = SpreadsheetApp.getUi();
  const keywords = getKeywordsFromSheet();
  
  if (keywords.length === 0) {
    ui.alert('Configuration is empty. Please add keywords to your Google Sheet in the "Projects" tab, column A.');
    return;
  }
  
  ui.alert('Starting report generation...');

  try {
    // 1. Smartly calculate the dates for the target week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    
    let startDate, endDate;
    let reportWeekDescription;

    // If it's Fri, Sat, Sun, or Mon, report on LAST week
    if ([0, 1, 5, 6].includes(dayOfWeek)) {
      reportWeekDescription = "the previous week";
      const sundayOfThisWeek = new Date(today.setDate(today.getDate() - dayOfWeek));
      startDate = new Date(sundayOfThisWeek.setDate(sundayOfThisWeek.getDate() - 7));
    } else { // Otherwise (Tue, Wed, Thu), report on THIS week
      reportWeekDescription = "the current week";
      startDate = new Date(today.setDate(today.getDate() - dayOfWeek));
    }
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startFormatted = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const endFormatted = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // 2. Prepare the output sheet and clear old data
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let outputSheet = spreadsheet.getSheetByName('Time');
    if (!outputSheet) {
      outputSheet = spreadsheet.insertSheet('Time');
      outputSheet.appendRow(['Week Start', 'Week End', 'Category', 'Hours']);
    } else {
      clearExistingWeekData(outputSheet, startFormatted);
    }

    // 3. Fetch calendar events
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(startDate, endDate);

    // 4. Categorize event durations
    const timeReport = {};
    keywords.forEach(keyword => { timeReport[keyword] = 0; });
    timeReport['Other'] = 0;

    events.forEach(event => {
      const myStatus = event.getMyStatus();
      const eventStatus = event.getStatus();

      // 1. Skip events that are canceled or that the user has declined.
      if (eventStatus === CalendarApp.EventStatus.CANCELLED || myStatus === CalendarApp.GuestStatus.NO) {
        return; // Skip this event entirely
      }

      const durationInMillis = event.getEndTime().getTime() - event.getStartTime().getTime();
      
      // Combine all relevant fields into a single string for searching
      const guestEmails = event.getGuestList().map(guest => guest.getEmail()).join(' ');
      const searchableContent = [
        event.getTitle(),
        event.getDescription(),
        event.getCreators().join(' '), // Organizer/creator emails
        guestEmails
      ].join(' ').toLowerCase();

      let matched = false;
      for (const keyword of keywords) {
        if (searchableContent.includes(keyword.toLowerCase())) {
          timeReport[keyword] += durationInMillis;
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
          timeReport['Other'] += durationInMillis;
        }
      }
    });

    // 5. Write the new results
    for (const category in timeReport) {
      const hours = timeReport[category] / (1000 * 60 * 60);
      if (hours > 0) {
        outputSheet.appendRow([startFormatted, endFormatted, category, hours.toFixed(2)]);
      }
    }

    ui.alert(`Report complete for ${reportWeekDescription} (${startFormatted} to ${endFormatted}). Check the "Time" sheet.`);

  } catch (e) {
    Logger.log(`Error during report generation: ${e.message}`);
    ui.alert(`An error occurred: ${e.message}`);
  }
}
