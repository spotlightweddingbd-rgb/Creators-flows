/**
 * ============================================================================
 * CreatorFlow - Single-File Google Apps Script Backend (Code.gs)
 * ============================================================================
 * Complete Google Workspace Cloud Backend:
 * - Google Sheets: Relational Database & Tabular Storage
 * - Google Drive: Asset Storage & Creator/Project Hierarchies
 * - Google Calendar: Production Booking & Event Synchronization
 * - Web App: doGet & doPost API Router with Non-Reentrant Safe Locks & Sessions
 * - Currency: Bangladesh Taka (BDT / ৳) Standard
 * - Security:
 *     1. Iterative multi-round password hashing with constant-time comparison
 *        and seamless legacy hash upgrade.
 *     2. Strict role-based booking file upload authorization (creator/client/admin).
 *     3. Authenticated token transport via POST payload to prevent URL exposure.
 *     4. Complete elimination of nested ScriptLock calls and Drive/Calendar isolation.
 *     5. Data sanitization stripping password credentials and internal folder IDs.
 *
 * Setup Instructions:
 * 1. In your Google Sheet, click Extensions > Apps Script.
 * 2. Replace the entire contents of Code.gs with this exact file.
 * 3. Select function "runManualSetup" and click Run (authorize permissions when prompted).
 * 4. Click Deploy > New deployment > Web app.
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 5. Copy the Web App Exec URL and set it as VITE_APPS_SCRIPT_API_URL in your React app.
 * ============================================================================
 */

/* ============================================================================
 * 1. CONFIGURATION & SCRIPT PROPERTIES
 * ============================================================================
 */

var CONFIG_KEYS = {
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  ROOT_DRIVE_FOLDER_ID: 'ROOT_DRIVE_FOLDER_ID',
  CALENDAR_ID: 'CALENDAR_ID',
  SESSION_SECRET: 'SESSION_SECRET',
  APP_NAME: 'APP_NAME',
  CURRENCY: 'CURRENCY',
  CURRENCY_SYMBOL: 'CURRENCY_SYMBOL'
};

var DEFAULT_CONFIG = {
  APP_NAME: 'CreatorFlow Platform',
  CURRENCY: 'BDT',
  CURRENCY_SYMBOL: '৳'
};

var SESSION_EXPIRATION_DAYS = 30;
var HASH_ITERATIONS = 1000;

function getOrCreateSessionSecret() {
  var props = PropertiesService.getScriptProperties();
  var val = props.getProperty(CONFIG_KEYS.SESSION_SECRET);
  if (!val || val === 'creatorflow_secret_salt_key_2026') {
    var randomSeed = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + new Date().getTime();
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, randomSeed);
    val = Utilities.base64Encode(digest);
    try {
      props.setProperty(CONFIG_KEYS.SESSION_SECRET, val);
    } catch (e) {}
  }
  return val;
}

function getConfigProperty(key) {
  if (key === CONFIG_KEYS.SESSION_SECRET) {
    return getOrCreateSessionSecret();
  }
  var props = PropertiesService.getScriptProperties();
  var val = props.getProperty(key);
  if (!val && DEFAULT_CONFIG[key]) {
    return DEFAULT_CONFIG[key];
  }
  return val || '';
}

function setConfigProperty(key, value) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(key, value);
}

function getDatabaseSpreadsheet() {
  var sheetId = getConfigProperty(CONFIG_KEYS.SPREADSHEET_ID);
  if (sheetId && sheetId !== 'YOUR_SPREADSHEET_ID') {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (e) {
      Logger.log('Could not open spreadsheet by ID, falling back to active: ' + e.toString());
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function formatBdt(amount) {
  var num = Number(amount) || 0;
  return num.toLocaleString('en-US');
}

/* ============================================================================
 * 2. DATABASE SCHEMAS & IDEMPOTENT SETUP
 * ============================================================================
 */

var SHEET_SCHEMAS = {
  Users: [
    'userId', 'fullName', 'email', 'phone', 'passwordHash', 'passwordSalt',
    'accountType', 'status', 'profileImage', 'createdAt', 'updatedAt', 'lastLoginAt',
    'accountStatus', 'deletionRequestedAt', 'scheduledDeletionAt', 'deletionCancelledAt',
    'deletionCompletedAt', 'deletionReason'
  ],
  Creators: [
    'creatorId', 'userId', 'displayName', 'username', 'roles',
    'bio', 'profileImageUrl', 'coverImageUrl', 'city', 'district',
    'country', 'serviceAreas', 'skills', 'languages', 'experienceYears',
    'equipment', 'startingPrice', 'facebook', 'instagram', 'youtube',
    'tiktok', 'linkedin', 'website', 'verified', 'featured',
    'rating', 'reviewCount', 'driveRootFolderId', 'driveRootFolderUrl',
    'calendarConnected', 'calendarEmail', 'calendarId', 'calendarConnectedAt',
    'calendarLastSyncAt', 'calendarSyncStatus',
    'accountStatus', 'deletionRequestedAt', 'scheduledDeletionAt', 'deletionCancelledAt',
    'deletionCompletedAt', 'deletionReason',
    'onboardingCompleted', 'createdAt', 'updatedAt'
  ],
  Portfolios: [
    'portfolioId', 'creatorId', 'title', 'description', 'category',
    'fileId', 'fileUrl', 'thumbnailUrl', 'mimeType', 'tags',
    'featured', 'status', 'isArchived', 'sortOrder', 'createdAt', 'updatedAt'
  ],
  Services: [
    'serviceId', 'creatorId', 'title', 'description', 'category',
    'startingPrice', 'deliveryTime', 'location', 'deliverables', 'status',
    'isArchived', 'createdAt', 'updatedAt'
  ],
  Packages: [
    'packageId', 'creatorId', 'serviceId', 'name', 'description',
    'price', 'duration', 'teamSize', 'photoCount', 'editedPhotoCount',
    'videoDuration', 'deliveryTime', 'revisions', 'travelIncluded',
    'equipment', 'addons', 'status', 'isArchived', 'createdAt', 'updatedAt'
  ],
  Availability: [
    'availabilityId', 'creatorId', 'date', 'startTime', 'endTime',
    'status', 'bookingId', 'notes', 'createdAt', 'updatedAt'
  ],
  Bookings: [
    'bookingId', 'customerId', 'creatorId', 'serviceId', 'packageId',
    'projectTitle', 'projectType', 'eventDate', 'startTime', 'endTime',
    'location', 'budget', 'message', 'status', 'paymentStatus',
    'calendarEventId', 'calendarSyncStatus', 'calendarSyncError', 'calendarSyncedAt',
    'isArchived', 'archivedAt', 'isCancelled', 'cancelledAt', 'cancellationReason',
    'isDeleted', 'deletedAt',
    'driveProjectFolderId', 'createdAt', 'updatedAt'
  ],
  Projects: [
    'projectId', 'bookingId', 'customerId', 'creatorId', 'title',
    'status', 'driveFolderId', 'startDate', 'deliveryDate', 'notes',
    'createdAt', 'updatedAt'
  ],
  Messages: [
    'messageId', 'conversationId', 'senderId', 'receiverId', 'bookingId',
    'projectId', 'message', 'attachmentFileId', 'attachmentUrl',
    'isRead', 'isArchived', 'isDeleted', 'deletedAt', 'createdAt'
  ],
  Reviews: [
    'reviewId', 'bookingId', 'customerId', 'creatorId', 'overallRating',
    'communicationRating', 'qualityRating', 'professionalismRating',
    'deliveryRating', 'valueRating', 'reviewText', 'createdAt'
  ],
  Payments: [
    'paymentId', 'bookingId', 'customerId', 'creatorId', 'amount',
    'paymentMethod', 'transactionId', 'status', 'verifiedBy', 'verifiedAt',
    'notes', 'createdAt', 'updatedAt'
  ],
  Drive_Folders: [
    'creatorId', 'rootFolderId', 'profileFolderId', 'portfolioFolderId',
    'photographyFolderId', 'cinematographyFolderId', 'editingFolderId',
    'clientProjectsFolderId', 'deliverablesFolderId', 'contractsFolderId',
    'invoicesFolderId', 'temporaryUploadsFolderId', 'createdAt', 'updatedAt'
  ],
  Notifications: [
    'notificationId', 'userId', 'title', 'message', 'type',
    'isRead', 'linkUrl', 'createdAt'
  ],
  Sessions: [
    'sessionId', 'userId', 'tokenHash', 'expiresAt', 'createdAt', 'lastUsedAt'
  ],
  Settings: [
    'settingKey', 'settingValue', 'description', 'updatedAt'
  ],
  Admin_Users: [
    'adminId', 'userId', 'role', 'permissions', 'createdAt'
  ]
};

function setupDatabase() {
  var ss = getDatabaseSpreadsheet();
  var results = { createdSheets: [], existingSheets: [], headersUpdated: [] };

  for (var sheetName in SHEET_SCHEMAS) {
    var expectedHeaders = SHEET_SCHEMAS[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      results.createdSheets.push(sheetName);
    } else {
      results.existingSheets.push(sheetName);
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
        results.headersUpdated.push(sheetName + ' (initialized)');
      } else {
        var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        var missingHeaders = expectedHeaders.filter(function(h) {
          return existingHeaders.indexOf(h) === -1;
        });
        if (missingHeaders.length > 0) {
          for (var i = 0; i < missingHeaders.length; i++) {
            sheet.getRange(1, lastCol + 1 + i).setValue(missingHeaders[i]).setFontWeight('bold');
          }
          results.headersUpdated.push(sheetName + ' (+' + missingHeaders.join(', ') + ')');
        }
      }
    }
  }

  // Ensure default Settings with BDT currency
  var settingsRows = sheetToObjects('Settings');
  var defaultSettings = [
    { settingKey: 'PLATFORM_NAME', settingValue: 'CreatorFlow', description: 'Platform display name' },
    { settingKey: 'COMMISSION_RATE', settingValue: '0.10', description: 'Platform commission rate' },
    { settingKey: 'CURRENCY', settingValue: 'BDT', description: 'Default currency (Bangladeshi Taka ৳)' },
    { settingKey: 'CURRENCY_SYMBOL', settingValue: '৳', description: 'Currency symbol' },
    { settingKey: 'CALENDAR_SYNC_ENABLED', settingValue: 'true', description: 'Google Calendar booking sync enabled' }
  ];

  for (var s = 0; s < defaultSettings.length; s++) {
    var def = defaultSettings[s];
    var exists = settingsRows.some(function(r) { return r.settingKey === def.settingKey; });
    if (!exists) {
      def.updatedAt = getNowIso();
      insertRowUnlocked('Settings', def);
    }
  }

  return results;
}

/* ============================================================================
 * 3. RESPONSE HELPERS & CONCURRENCY LOCKS
 * ============================================================================
 */

function createSuccessResponse(data, message) {
  var payload = {
    success: true,
    data: data !== undefined ? data : {},
    message: message || 'Success'
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorCode, message) {
  var payload = {
    success: false,
    error: errorCode || 'ERROR',
    message: message || 'An error occurred'
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function withScriptLock(fn, timeoutMs) {
  var lock = LockService.getScriptLock();
  var wait = timeoutMs || 30000;
  var success = lock.tryLock(wait);
  if (!success) {
    throw new Error('CONCURRENCY_TIMEOUT: Server is busy, please retry in a moment');
  }
  try {
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function getNowIso() {
  return new Date().toISOString();
}

/* ============================================================================
 * 4. SERVER-SIDE SAFE SEQUENTIAL ID GENERATORS (UNLOCKED & LOCKED)
 * ============================================================================
 */

function generateNextIdUnlocked(prefix, sheetName, idColumnName) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(sheetName);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return prefix + '-000001';
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = headers.indexOf(idColumnName);
  if (colIndex === -1) colIndex = 0;

  var values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  var maxNum = 0;

  for (var i = 0; i < values.length; i++) {
    var val = String(values[i][0] || '').trim();
    if (val.indexOf(prefix + '-') === 0) {
      var numPart = parseInt(val.substring(prefix.length + 1), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  var nextNum = maxNum + 1;
  var numStr = ('000000' + nextNum).slice(-6);
  return prefix + '-' + numStr;
}

function generateNextId(prefix, sheetName, idColumnName) {
  return withScriptLock(function() {
    return generateNextIdUnlocked(prefix, sheetName, idColumnName);
  });
}

/* ============================================================================
 * 5. SHEET CRUD UTILITIES (UNLOCKED & LOCKED)
 * ============================================================================
 */

function sheetToObjects(sheetName) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var results = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var val = row[j];
      if (typeof val === 'string' && (val.charAt(0) === '[' || val.charAt(0) === '{')) {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      }
      obj[header] = val;
      if (val !== '' && val !== null && val !== undefined) {
        hasContent = true;
      }
    }
    if (hasContent) {
      obj._rowNumber = i + 2;
      results.push(obj);
    }
  }
  return results;
}

function findRowByField(sheetName, fieldName, fieldValue) {
  var rows = sheetToObjects(sheetName);
  var target = String(fieldValue).trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    var cur = String(rows[i][fieldName] || '').trim().toLowerCase();
    if (cur === target) {
      return rows[i];
    }
  }
  return null;
}

function insertRowUnlocked(sheetName, rowObject) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(sheetName);
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowData = [];

  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = rowObject[key];
    if (val === undefined || val === null) {
      val = '';
    } else if (typeof val === 'object') {
      val = JSON.stringify(val);
    }
    rowData.push(val);
  }

  sheet.appendRow(rowData);
  rowObject._rowNumber = sheet.getLastRow();
  return rowObject;
}

function insertRow(sheetName, rowObject) {
  return withScriptLock(function() {
    return insertRowUnlocked(sheetName, rowObject);
  });
}

function updateRowByFieldUnlocked(sheetName, fieldName, fieldValue, updateData) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;

  var rows = sheetToObjects(sheetName);
  var target = String(fieldValue).trim().toLowerCase();
  var foundIndex = -1;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][fieldName] || '').trim().toLowerCase() === target) {
      foundIndex = rows[i]._rowNumber;
      break;
    }
  }

  if (foundIndex === -1) return null;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var h = 0; h < headers.length; h++) {
    var colName = headers[h];
    if (updateData[colName] !== undefined) {
      var val = updateData[colName];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      sheet.getRange(foundIndex, h + 1).setValue(val);
    }
  }

  var updatedIdx = headers.indexOf('updatedAt');
  if (updatedIdx !== -1 && updateData['updatedAt'] === undefined) {
    sheet.getRange(foundIndex, updatedIdx + 1).setValue(getNowIso());
  }

  return true;
}

function updateRowByField(sheetName, fieldName, fieldValue, updateData) {
  return withScriptLock(function() {
    return updateRowByFieldUnlocked(sheetName, fieldName, fieldValue, updateData);
  });
}

function deleteRowByFieldUnlocked(sheetName, fieldName, fieldValue) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  var rows = sheetToObjects(sheetName);
  var target = String(fieldValue).trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][fieldName] || '').trim().toLowerCase() === target) {
      sheet.deleteRow(rows[i]._rowNumber);
      return true;
    }
  }
  return false;
}

function deleteRowByField(sheetName, fieldName, fieldValue) {
  return withScriptLock(function() {
    return deleteRowByFieldUnlocked(sheetName, fieldName, fieldValue);
  });
}

/* ============================================================================
 * 6. ROLE & SANITIZATION HELPERS
 * ============================================================================
 */

function isAdminOrStaff(user) {
  return !!(user && (user.accountType === 'admin' || user.accountType === 'staff'));
}

function requireAdminOrStaff(user) {
  if (!isAdminOrStaff(user)) {
    throw new Error('FORBIDDEN: Administrative permissions required');
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  var safe = Object.assign({}, user);
  delete safe.passwordHash;
  delete safe.passwordSalt;
  delete safe._rowNumber;
  return safe;
}

function sanitizePublicCreator(creator) {
  if (!creator) return null;
  var safe = Object.assign({}, creator);
  delete safe._rowNumber;
  delete safe.driveRootFolderId;
  delete safe.driveRootFolderUrl;
  return safe;
}

function stripInternalRow(item) {
  if (!item || typeof item !== 'object') return item;
  var clean = Object.assign({}, item);
  delete clean._rowNumber;
  return clean;
}

function stripInternalRows(items) {
  if (!Array.isArray(items)) return [];
  return items.map(stripInternalRow);
}

/* ============================================================================
 * 7. NOTIFICATIONS (UNLOCKED & LOCKED)
 * ============================================================================
 */

function createNotificationUnlocked(userId, title, message, type, linkUrl) {
  var notifId = generateNextIdUnlocked('NTF', 'Notifications', 'notificationId');
  var item = {
    notificationId: notifId,
    userId: userId,
    title: String(title).trim(),
    message: String(message).trim(),
    type: type || 'system',
    isRead: false,
    linkUrl: linkUrl || '',
    createdAt: getNowIso()
  };
  insertRowUnlocked('Notifications', item);
  return item;
}

function createNotification(userId, title, message, type, linkUrl) {
  return withScriptLock(function() {
    return createNotificationUnlocked(userId, title, message, type, linkUrl);
  });
}

function getNotifications(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var all = sheetToObjects('Notifications');
  return all.filter(function(n) { return n.userId === sessionUser.userId; })
    .map(stripInternalRow)
    .sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
}

function markNotificationRead(notificationId, sessionUser) {
  var notif = findRowByField('Notifications', 'notificationId', notificationId);
  if (!notif) throw new Error('NOT_FOUND');
  if (notif.userId !== sessionUser.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  updateRowByField('Notifications', 'notificationId', notificationId, { isRead: true });
  return { success: true };
}

function markAllNotificationsRead(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var all = sheetToObjects('Notifications');
  for (var i = 0; i < all.length; i++) {
    if (all[i].userId === sessionUser.userId && !all[i].isRead) {
      updateRowByField('Notifications', 'notificationId', all[i].notificationId, { isRead: true });
    }
  }
  return { success: true };
}

/* ============================================================================
 * 8. STRONG ITERATIVE PASSWORD HASHING & SESSIONS
 * ============================================================================
 */

function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return result === 0;
}

/**
 * Apps Script-safe iterative password derivation (1000 rounds SHA-256 with salt & secret)
 */
function hashPasswordWithSalt(password, salt) {
  var globalSecret = getConfigProperty(CONFIG_KEYS.SESSION_SECRET);
  var combined = password + ':' + salt + ':' + globalSecret;
  var current = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined);

  for (var i = 1; i < HASH_ITERATIONS; i++) {
    current = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      current.concat(Utilities.newBlob(salt + ':' + i).getBytes())
    );
  }
  return 'v2:' + HASH_ITERATIONS + ':' + Utilities.base64Encode(current);
}

/**
 * Verifies password against stored hash with backward compatibility for legacy v1 hashes.
 */
function verifyPassword(password, storedHash, salt) {
  if (!storedHash || !password) return false;

  var globalSecret = getConfigProperty(CONFIG_KEYS.SESSION_SECRET);

  // Check modern v2 iterative hash
  if (storedHash.indexOf('v2:') === 0) {
    var parts = storedHash.split(':');
    var iterations = parseInt(parts[1], 10) || HASH_ITERATIONS;
    var current = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + ':' + salt + ':' + globalSecret);
    for (var i = 1; i < iterations; i++) {
      current = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        current.concat(Utilities.newBlob(salt + ':' + i).getBytes())
      );
    }
    var computed = 'v2:' + iterations + ':' + Utilities.base64Encode(current);
    return constantTimeCompare(computed, storedHash);
  }

  // Backward compatibility with legacy single-pass SHA-256
  var legacyCombined = password + ':' + salt + ':' + globalSecret;
  var legacyDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, legacyCombined);
  var legacyHash = Utilities.base64Encode(legacyDigest);
  return constantTimeCompare(legacyHash, storedHash);
}

function createSessionUnlocked(userId) {
  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  var tokenHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  var now = new Date();
  var expires = new Date(now.getTime() + (SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)).toISOString();

  var sessionRecord = {
    sessionId: generateNextIdUnlocked('SES', 'Sessions', 'sessionId'),
    userId: userId,
    tokenHash: tokenHash,
    expiresAt: expires,
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString()
  };

  insertRowUnlocked('Sessions', sessionRecord);
  return token;
}

function createSession(userId) {
  return withScriptLock(function() {
    return createSessionUnlocked(userId);
  });
}

function validateSession(token) {
  if (!token) return null;
  var tokenHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  var session = findRowByField('Sessions', 'tokenHash', tokenHash);
  if (!session) return null;

  var now = new Date();
  var expires = new Date(session.expiresAt);
  if (now > expires) {
    deleteRowByField('Sessions', 'sessionId', session.sessionId);
    return null;
  }

  // Update last used timestamp
  updateRowByField('Sessions', 'sessionId', session.sessionId, { lastUsedAt: now.toISOString() });

  var user = findRowByField('Users', 'userId', session.userId);
  if (!user || user.status === 'suspended') return null;

  return sanitizeUser(user);
}

function logout(token) {
  if (!token) return true;
  var tokenHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  return deleteRowByField('Sessions', 'tokenHash', tokenHash);
}

function login(email, password) {
  if (!email || !password) {
    throw new Error('MISSING_CREDENTIALS: Email and password are required');
  }

  var normalized = String(email).trim().toLowerCase();
  var user = findRowByField('Users', 'email', normalized);

  if (!user) {
    throw new Error('INVALID_CREDENTIALS: Incorrect email or password');
  }

  if (user.status === 'suspended') {
    throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact support.');
  }

  // Check 30-day account deletion state
  var deletionCancelledNotice = false;
  if (user.accountStatus === 'PENDING_DELETION') {
    var nowTime = new Date().getTime();
    var scheduledTime = user.scheduledDeletionAt ? new Date(user.scheduledDeletionAt).getTime() : 0;
    if (scheduledTime && nowTime >= scheduledTime) {
      throw new Error('ACCOUNT_DELETED: This account was scheduled for deletion and the 30-day grace period has expired.');
    } else {
      // User logged in within 30-day window: automatically cancel deletion and restore account
      user.accountStatus = 'ACTIVE';
      user.deletionCancelledAt = getNowIso();
      deletionCancelledNotice = true;
      if (user.accountType === 'creator') {
        var existingCreator = findRowByField('Creators', 'userId', user.userId);
        if (existingCreator) {
          updateRowByField('Creators', 'creatorId', existingCreator.creatorId, {
            accountStatus: 'ACTIVE',
            deletionCancelledAt: user.deletionCancelledAt,
            availabilityStatus: 'Available'
          });
        }
      }
    }
  }

  var isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS: Incorrect email or password');
  }

  // Seamlessly upgrade legacy single-pass hash to modern iterative hash
  var updateData = { lastLoginAt: getNowIso() };
  if (user.accountStatus === 'ACTIVE') {
    updateData.accountStatus = 'ACTIVE';
    if (user.deletionCancelledAt) {
      updateData.deletionCancelledAt = user.deletionCancelledAt;
    }
  }
  if (user.passwordHash && user.passwordHash.indexOf('v2:') !== 0) {
    var newSalt = generateSalt();
    var newHash = hashPasswordWithSalt(password, newSalt);
    updateData.passwordHash = newHash;
    updateData.passwordSalt = newSalt;
  }
  updateRowByField('Users', 'userId', user.userId, updateData);

  var token = createSession(user.userId);

  var creatorProfile = null;
  if (user.accountType === 'creator') {
    creatorProfile = findRowByField('Creators', 'userId', user.userId);
  }

  return {
    sessionToken: token,
    user: sanitizeUser(user),
    creatorProfile: sanitizePublicCreator(creatorProfile),
    deletionCancelledNotice: deletionCancelledNotice
  };
}

function registerCustomer(data) {
  if (!data.email || !data.password || !data.fullName) {
    throw new Error('MISSING_FIELDS: Full name, email, and password are required');
  }

  var normalized = String(data.email).trim().toLowerCase();

  return withScriptLock(function() {
    var existing = findRowByField('Users', 'email', normalized);
    if (existing) {
      throw new Error('EMAIL_EXISTS: Email address is already registered');
    }

    var userId = generateNextIdUnlocked('USER', 'Users', 'userId');
    var salt = generateSalt();
    var hash = hashPasswordWithSalt(data.password, salt);
    var now = getNowIso();

    var newUser = {
      userId: userId,
      fullName: String(data.fullName).trim(),
      email: normalized,
      phone: String(data.phone || '').trim(),
      passwordHash: hash,
      passwordSalt: salt,
      accountType: 'customer',
      status: 'active',
      profileImage: data.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };

    insertRowUnlocked('Users', newUser);
    var token = createSessionUnlocked(userId);

    return {
      sessionToken: token,
      user: sanitizeUser(newUser)
    };
  });
}

function checkUsername(username) {
  if (!username) return { available: false, error: 'Username cannot be empty' };
  var clean = String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (clean.length < 3) {
    return { available: false, error: 'Username must be at least 3 characters alphanumeric' };
  }
  var exists = findRowByField('Creators', 'username', clean);
  return { available: !exists, username: clean };
}

function registerCreator(data) {
  if (!data.email || !data.password || !data.displayName || !data.username) {
    throw new Error('MISSING_FIELDS: Display name, username, email, and password are required');
  }

  var normalized = String(data.email).trim().toLowerCase();
  var cleanUsername = String(data.username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (cleanUsername.length < 3) {
    throw new Error('INVALID_USERNAME: Username must be at least 3 characters');
  }

  // Phase 1: Atomic registration transaction under lock (pure DB operations, no Drive calls)
  var regResult = withScriptLock(function() {
    if (findRowByField('Users', 'email', normalized)) {
      throw new Error('EMAIL_EXISTS: Email is already registered');
    }

    if (findRowByField('Creators', 'username', cleanUsername)) {
      throw new Error('USERNAME_EXISTS: Username is already taken by another creator');
    }

    var userId = generateNextIdUnlocked('USER', 'Users', 'userId');
    var creatorId = generateNextIdUnlocked('CRT', 'Creators', 'creatorId');
    var salt = generateSalt();
    var hash = hashPasswordWithSalt(data.password, salt);
    var now = getNowIso();

    var newUser = {
      userId: userId,
      fullName: String(data.displayName).trim(),
      email: normalized,
      phone: String(data.phone || '').trim(),
      passwordHash: hash,
      passwordSalt: salt,
      accountType: 'creator',
      status: 'active',
      profileImage: data.profileImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };
    insertRowUnlocked('Users', newUser);

    var newCreator = {
      creatorId: creatorId,
      userId: userId,
      displayName: String(data.displayName).trim(),
      username: cleanUsername,
      roles: data.roles || ['Photographer'],
      bio: String(data.bio || 'Visual storyteller on CreatorFlow.').trim(),
      profileImageUrl: data.profileImageUrl || newUser.profileImage,
      coverImageUrl: data.coverImageUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1600&q=80',
      city: String(data.city || 'Dhaka').trim(),
      district: String(data.district || '').trim(),
      country: String(data.country || 'Bangladesh').trim(),
      serviceAreas: data.serviceAreas || [data.city || 'Dhaka'],
      skills: data.skills || ['Photography', 'Editing'],
      languages: data.languages || ['Bengali', 'English'],
      experienceYears: Number(data.experienceYears) || 1,
      equipment: data.equipment || ['Professional Camera System'],
      startingPrice: Number(data.startingPrice) || 0,
      facebook: data.facebook || '',
      instagram: data.instagram || '',
      youtube: data.youtube || '',
      tiktok: data.tiktok || '',
      linkedin: data.linkedin || '',
      website: data.website || '',
      verified: false,
      featured: false,
      rating: 0,
      reviewCount: 0,
      driveRootFolderId: '',
      driveRootFolderUrl: '',
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now
    };
    insertRowUnlocked('Creators', newCreator);

    var token = createSessionUnlocked(userId);

    return {
      token: token,
      user: newUser,
      creator: newCreator
    };
  });

  // Phase 2: Create Drive folder structure outside the database lock
  try {
    var folders = ensureCreatorDriveStructure(regResult.creator.creatorId, regResult.creator.displayName);
    if (folders && folders.rootFolderId) {
      updateRowByField('Creators', 'creatorId', regResult.creator.creatorId, {
        driveRootFolderId: folders.rootFolderId,
        driveRootFolderUrl: 'https://drive.google.com/drive/folders/' + folders.rootFolderId
      });
      regResult.creator.driveRootFolderId = folders.rootFolderId;
      regResult.creator.driveRootFolderUrl = 'https://drive.google.com/drive/folders/' + folders.rootFolderId;
    }
  } catch (driveErr) {
    Logger.log('Drive folder warning during creator setup: ' + driveErr.toString());
  }

  return {
    sessionToken: regResult.token,
    user: sanitizeUser(regResult.user),
    creatorProfile: sanitizePublicCreator(regResult.creator)
  };
}

/* ============================================================================
 * 8B. ACCOUNT DELETION & 30-DAY GRACE LIFECYCLE
 * ============================================================================
 */

function requestAccountDeletion(data, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var user = findRowByField('Users', 'userId', sessionUser.userId);
  if (!user) throw new Error('NOT_FOUND: User not found');

  // Verify credentials if provided or confirmed
  if (data && data.password) {
    var valid = verifyPassword(data.password, user.passwordHash, user.passwordSalt);
    if (!valid) throw new Error('INVALID_PASSWORD: Password is incorrect');
  } else if (!data || (!data.isGoogleReauthConfirmed && !data.confirmed)) {
    throw new Error('VERIFICATION_REQUIRED: Password or confirmation required to delete account');
  }

  var now = new Date();
  var scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day grace period
  var nowIso = now.toISOString();
  var scheduledIso = scheduled.toISOString();
  var reason = (data && data.reason) ? String(data.reason).trim() : '';

  withScriptLock(function() {
    updateRowByFieldUnlocked('Users', 'userId', sessionUser.userId, {
      accountStatus: 'PENDING_DELETION',
      deletionRequestedAt: nowIso,
      scheduledDeletionAt: scheduledIso,
      deletionCancelledAt: '',
      deletionReason: reason,
      updatedAt: nowIso
    });

    if (user.accountType === 'creator') {
      var creator = findRowByField('Creators', 'userId', sessionUser.userId);
      if (creator) {
        updateRowByFieldUnlocked('Creators', 'creatorId', creator.creatorId, {
          accountStatus: 'PENDING_DELETION',
          deletionRequestedAt: nowIso,
          scheduledDeletionAt: scheduledIso,
          deletionCancelledAt: '',
          deletionReason: reason,
          availabilityStatus: 'Unavailable',
          updatedAt: nowIso
        });
      }
    }
  });

  return {
    success: true,
    accountStatus: 'PENDING_DELETION',
    deletionRequestedAt: nowIso,
    scheduledDeletionAt: scheduledIso,
    daysRemaining: 30
  };
}

function cancelAccountDeletion(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var user = findRowByField('Users', 'userId', sessionUser.userId);
  if (!user) throw new Error('NOT_FOUND');

  var nowIso = getNowIso();
  withScriptLock(function() {
    updateRowByFieldUnlocked('Users', 'userId', sessionUser.userId, {
      accountStatus: 'ACTIVE',
      deletionCancelledAt: nowIso,
      updatedAt: nowIso
    });

    if (user.accountType === 'creator') {
      var creator = findRowByField('Creators', 'userId', sessionUser.userId);
      if (creator) {
        updateRowByFieldUnlocked('Creators', 'creatorId', creator.creatorId, {
          accountStatus: 'ACTIVE',
          deletionCancelledAt: nowIso,
          availabilityStatus: 'Available',
          updatedAt: nowIso
        });
      }
    }
  });

  return {
    success: true,
    accountStatus: 'ACTIVE',
    restored: true,
    message: 'Account deletion cancelled successfully. Your account is active.'
  };
}

function getAccountDeletionStatus(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var user = findRowByField('Users', 'userId', sessionUser.userId);
  if (!user) throw new Error('NOT_FOUND');

  var isPending = user.accountStatus === 'PENDING_DELETION';
  var daysRemaining = 0;
  if (isPending && user.scheduledDeletionAt) {
    var diff = new Date(user.scheduledDeletionAt).getTime() - new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  return {
    accountStatus: user.accountStatus || 'ACTIVE',
    isPendingDeletion: isPending,
    deletionRequestedAt: user.deletionRequestedAt || '',
    scheduledDeletionAt: user.scheduledDeletionAt || '',
    deletionReason: user.deletionReason || '',
    daysRemaining: daysRemaining
  };
}

function processScheduledDeletions() {
  var users = sheetToObjects('Users');
  var now = new Date().getTime();
  var processed = [];

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u.accountStatus === 'PENDING_DELETION' && u.scheduledDeletionAt) {
      var scheduledTime = new Date(u.scheduledDeletionAt).getTime();
      if (now >= scheduledTime) {
        var completedIso = getNowIso();
        withScriptLock(function() {
          updateRowByFieldUnlocked('Users', 'userId', u.userId, {
            accountStatus: 'DELETED',
            status: 'deleted',
            deletionCompletedAt: completedIso,
            updatedAt: completedIso
          });
          if (u.accountType === 'creator') {
            var c = findRowByField('Creators', 'userId', u.userId);
            if (c) {
              updateRowByFieldUnlocked('Creators', 'creatorId', c.creatorId, {
                accountStatus: 'DELETED',
                availabilityStatus: 'Unavailable',
                deletionCompletedAt: completedIso,
                updatedAt: completedIso
              });
            }
          }
        });
        processed.push(u.userId);
      }
    }
  }

  return { processedCount: processed.length, processedUserIds: processed };
}

function createDailyDeletionTrigger() {
  var existingTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existingTriggers.length; i++) {
    if (existingTriggers[i].getHandlerFunction() === 'processScheduledDeletions') {
      return { status: 'already_exists' };
    }
  }
  ScriptApp.newTrigger('processScheduledDeletions')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  return { status: 'created' };
}

function adminGetDeletionRecords(sessionUser) {
  if (!sessionUser || !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: Admin access required');
  }

  var users = sheetToObjects('Users');
  var creators = sheetToObjects('Creators');
  var creatorMap = {};
  for (var i = 0; i < creators.length; i++) {
    creatorMap[creators[i].userId] = creators[i];
  }

  var pending = [];
  var cancelled = [];
  var completed = [];

  var now = new Date().getTime();
  for (var j = 0; j < users.length; j++) {
    var u = users[j];
    var c = creatorMap[u.userId];
    var item = {
      userId: u.userId,
      email: u.email,
      fullName: u.fullName,
      accountType: u.accountType,
      displayName: c ? c.displayName : u.fullName,
      accountStatus: u.accountStatus || 'ACTIVE',
      deletionRequestedAt: u.deletionRequestedAt || '',
      scheduledDeletionAt: u.scheduledDeletionAt || '',
      deletionCancelledAt: u.deletionCancelledAt || '',
      deletionCompletedAt: u.deletionCompletedAt || '',
      deletionReason: u.deletionReason || '',
      daysRemaining: 0
    };

    if (u.accountStatus === 'PENDING_DELETION') {
      if (u.scheduledDeletionAt) {
        var diff = new Date(u.scheduledDeletionAt).getTime() - now;
        item.daysRemaining = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
      }
      pending.push(item);
    } else if (u.deletionCancelledAt && u.accountStatus === 'ACTIVE') {
      cancelled.push(item);
    } else if (u.accountStatus === 'DELETED') {
      completed.push(item);
    }
  }

  return {
    metrics: {
      totalPending: pending.length,
      totalCancelled: cancelled.length,
      totalCompleted: completed.length
    },
    pendingDeletions: pending,
    cancelledDeletions: cancelled,
    completedDeletions: completed
  };
}

/* ============================================================================
 * 9. GOOGLE DRIVE HIERARCHY & STRICT UPLOAD AUTHORIZATION
 * ============================================================================
 */

function ensureMasterDriveStructure() {
  var props = PropertiesService.getScriptProperties();
  var masterId = props.getProperty(CONFIG_KEYS.ROOT_DRIVE_FOLDER_ID);

  if (masterId) {
    try {
      var existing = DriveApp.getFolderById(masterId);
      if (existing && !existing.isTrashed()) {
        return existing;
      }
    } catch (e) {}
  }

  var master = DriveApp.createFolder('Creator Platform');
  props.setProperty(CONFIG_KEYS.ROOT_DRIVE_FOLDER_ID, master.getId());
  return master;
}

function ensureCreatorDriveStructure(creatorId, creatorName) {
  var existingRecord = findRowByField('Drive_Folders', 'creatorId', creatorId);
  if (existingRecord && existingRecord.rootFolderId) {
    try {
      var testRoot = DriveApp.getFolderById(existingRecord.rootFolderId);
      if (testRoot && !testRoot.isTrashed()) {
        return existingRecord;
      }
    } catch (e) {}
  }

  var master = ensureMasterDriveStructure();
  var creatorsRootIterator = master.getFoldersByName('Creators');
  var creatorsRoot = creatorsRootIterator.hasNext() ? creatorsRootIterator.next() : master.createFolder('Creators');

  var folderLabel = (creatorName ? creatorName + ' (' + creatorId + ')' : creatorId);
  var creatorIter = creatorsRoot.getFoldersByName(folderLabel);
  var rootFolder = creatorIter.hasNext() ? creatorIter.next() : creatorsRoot.createFolder(folderLabel);

  function getOrCreateFolder(parent, name) {
    var it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }

  var profileFolder = getOrCreateFolder(rootFolder, 'Profile Assets');
  var portfolioFolder = getOrCreateFolder(rootFolder, 'Portfolio');
  var photographyFolder = getOrCreateFolder(portfolioFolder, 'Photography');
  var cinematographyFolder = getOrCreateFolder(portfolioFolder, 'Cinematography');
  var editingFolder = getOrCreateFolder(portfolioFolder, 'Color & Edit Showcases');
  var clientProjectsFolder = getOrCreateFolder(rootFolder, 'Client Projects');
  var deliverablesFolder = getOrCreateFolder(rootFolder, 'Deliverables');
  var contractsFolder = getOrCreateFolder(rootFolder, 'Contracts & Agreements');
  var invoicesFolder = getOrCreateFolder(rootFolder, 'Invoices & Receipts');
  var temporaryUploadsFolder = getOrCreateFolder(rootFolder, 'Temporary Uploads');

  var now = getNowIso();
  var folderRecord = {
    creatorId: creatorId,
    rootFolderId: rootFolder.getId(),
    profileFolderId: profileFolder.getId(),
    portfolioFolderId: portfolioFolder.getId(),
    photographyFolderId: photographyFolder.getId(),
    cinematographyFolderId: cinematographyFolder.getId(),
    editingFolderId: editingFolder.getId(),
    clientProjectsFolderId: clientProjectsFolder.getId(),
    deliverablesFolderId: deliverablesFolder.getId(),
    contractsFolderId: contractsFolder.getId(),
    invoicesFolderId: invoicesFolder.getId(),
    temporaryUploadsFolderId: temporaryUploadsFolder.getId(),
    createdAt: now,
    updatedAt: now
  };

  if (existingRecord) {
    updateRowByField('Drive_Folders', 'creatorId', creatorId, folderRecord);
  } else {
    insertRow('Drive_Folders', folderRecord);
  }

  updateRowByField('Creators', 'creatorId', creatorId, {
    driveRootFolderId: rootFolder.getId(),
    driveRootFolderUrl: rootFolder.getUrl()
  });

  return folderRecord;
}

function ensureBookingDriveFolder(bookingId, creatorId, projectTitle) {
  var creatorFolders = ensureCreatorDriveStructure(creatorId);
  var clientProjectsParent = DriveApp.getFolderById(creatorFolders.clientProjectsFolderId);

  var folderName = bookingId + ' - ' + (projectTitle || 'Project');
  var iter = clientProjectsParent.getFoldersByName(folderName);
  var projectRoot = iter.hasNext() ? iter.next() : clientProjectsParent.createFolder(folderName);

  function getOrCreateSub(parent, name) {
    var it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }

  getOrCreateSub(projectRoot, 'Client Uploads');
  getOrCreateSub(projectRoot, 'Creator Uploads');
  getOrCreateSub(projectRoot, 'Raw Files');
  getOrCreateSub(projectRoot, 'Edited Files');
  getOrCreateSub(projectRoot, 'Final Delivery');
  getOrCreateSub(projectRoot, 'Documents');

  return projectRoot.getId();
}

/**
 * Strict file upload authorization:
 * - Cross-creator booking injection prevented (booking.creatorId === data.creatorId required).
 * - Upload types strictly segregated:
 *     clientUpload: booking client or admin/staff ONLY.
 *     creatorUpload: booking creator owner or admin/staff ONLY.
 *     deliverable: creator owner or admin/staff ONLY.
 *     profile / cover / portfolio: creator owner or admin/staff ONLY.
 */
function uploadBase64File(data, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED: Login required to upload files');
  if (!data.base64Data || !data.fileName || !data.creatorId) {
    throw new Error('MISSING_FIELDS: creatorId, fileName, and base64Data are required');
  }

  var creator = findRowByField('Creators', 'creatorId', data.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  var isOwner = creator.userId === sessionUser.userId;
  var isAdmin = isAdminOrStaff(sessionUser);

  var booking = null;
  if (data.bookingId) {
    booking = findRowByField('Bookings', 'bookingId', data.bookingId);
    if (!booking) {
      throw new Error('NOT_FOUND: Booking not found');
    }
    // Cross-creator protection: booking must strictly belong to the specified creator
    if (booking.creatorId !== data.creatorId) {
      throw new Error('UNAUTHORIZED: Booking does not belong to this creator');
    }
  }

  var uploadType = data.uploadType || 'temporary';

  // Strict role-based upload type authorization
  if (uploadType === 'clientUpload') {
    if (!booking) {
      throw new Error('MISSING_FIELDS: bookingId is required for client project uploads');
    }
    var isBookingCustomer = booking.customerId === sessionUser.userId;
    if (!isBookingCustomer && !isAdmin) {
      throw new Error('UNAUTHORIZED: Only the booking customer or administrative staff may upload client project assets');
    }
  } else if (uploadType === 'creatorUpload') {
    if (!booking) {
      throw new Error('MISSING_FIELDS: bookingId is required for creator project uploads');
    }
    if (!isOwner && !isAdmin) {
      throw new Error('UNAUTHORIZED: Only the assigned creator or administrative staff may upload creator project assets');
    }
  } else if (uploadType === 'deliverable') {
    if (!isOwner && !isAdmin) {
      throw new Error('UNAUTHORIZED: Only the creator owner or administrative staff may upload deliverables');
    }
  } else if (uploadType === 'profile' || uploadType === 'cover') {
    if (!isOwner && !isAdmin) {
      throw new Error('UNAUTHORIZED: Only the creator owner or administrative staff may upload profile or cover assets');
    }
  } else if (
    uploadType === 'portfolioPhotography' ||
    uploadType === 'portfolioCinematography' ||
    uploadType === 'portfolioEditing' ||
    uploadType === 'portfolio'
  ) {
    if (!isOwner && !isAdmin) {
      throw new Error('UNAUTHORIZED: Only the creator owner or administrative staff may upload portfolio showcase assets');
    }
  } else {
    // Other / temporary uploads
    if (!isOwner && !isAdmin) {
      if (booking && booking.customerId === sessionUser.userId) {
        // Allowed if attached to user's booking
      } else {
        throw new Error('UNAUTHORIZED: You do not have permission to upload to this directory');
      }
    }
  }

  var folderRecord = ensureCreatorDriveStructure(data.creatorId);
  var targetFolderId = folderRecord.temporaryUploadsFolderId;

  if (uploadType === 'profile' || uploadType === 'cover') {
    targetFolderId = folderRecord.profileFolderId;
  } else if (uploadType === 'portfolioPhotography') {
    targetFolderId = folderRecord.photographyFolderId;
  } else if (uploadType === 'portfolioCinematography') {
    targetFolderId = folderRecord.cinematographyFolderId;
  } else if (uploadType === 'portfolioEditing') {
    targetFolderId = folderRecord.editingFolderId;
  } else if (uploadType === 'deliverable') {
    targetFolderId = folderRecord.deliverablesFolderId;
  } else if (data.bookingId && (uploadType === 'clientUpload' || uploadType === 'creatorUpload')) {
    var prjFolderId = ensureBookingDriveFolder(data.bookingId, data.creatorId);
    var pFolder = DriveApp.getFolderById(prjFolderId);
    var subName = uploadType === 'clientUpload' ? 'Client Uploads' : 'Creator Uploads';
    var it = pFolder.getFoldersByName(subName);
    targetFolderId = it.hasNext() ? it.next().getId() : prjFolderId;
  }

  var targetFolder = DriveApp.getFolderById(targetFolderId);
  var cleanBase64 = data.base64Data;
  if (cleanBase64.indexOf('base64,') !== -1) {
    cleanBase64 = cleanBase64.split('base64,')[1];
  }

  var decoded = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decoded, data.mimeType || 'application/octet-stream', data.fileName);
  var file = targetFolder.createFile(blob);

  // DRIVE PRIVACY: Only public assets get ANYONE_WITH_LINK access
  var publicTypes = ['profile', 'cover', 'portfolio', 'portfolioPhotography', 'portfolioCinematography', 'portfolioEditing', 'public_asset', 'thumbnail'];
  var isPublicAsset = publicTypes.indexOf(uploadType) !== -1;

  if (isPublicAsset) {
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log('Notice setting public link permission: ' + e.toString());
    }
  }

  var fileUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
  var thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w800';
  if (uploadType === 'cover') {
    fileUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
    thumbnailUrl = fileUrl;
  }

  if (uploadType === 'profile') {
    updateRowByField('Creators', 'creatorId', data.creatorId, { profileImageUrl: thumbnailUrl });
    updateRowByField('Users', 'userId', creator.userId, { profileImage: thumbnailUrl });
  } else if (uploadType === 'cover') {
    updateRowByField('Creators', 'creatorId', data.creatorId, { coverImageUrl: fileUrl });
  }

  return {
    fileId: file.getId(),
    fileName: data.fileName,
    fileUrl: fileUrl,
    thumbnailUrl: thumbnailUrl,
    folderId: targetFolderId,
    isPublic: isPublicAsset
  };
}

/* ============================================================================
 * 10. INDIVIDUAL GOOGLE CALENDAR SYNCHRONIZATION (PER-FREELANCER)
 * ============================================================================
 */

function getTargetCalendar() {
  var calId = getConfigProperty(CONFIG_KEYS.CALENDAR_ID);
  if (calId && calId !== 'primary' && calId.indexOf('@') !== -1) {
    try {
      var cal = CalendarApp.getCalendarById(calId);
      if (cal) return cal;
    } catch (e) {}
  }
  try {
    return CalendarApp.getDefaultCalendar();
  } catch (err) {
    return null;
  }
}

/**
 * Resolves the individual Google Calendar for a specific freelancer.
 * Priority:
 * 1. Freelancer's connected Google Calendar ID / Email (per-creator personal calendar)
 * 2. Fallback to platform-configured calendar if permitted
 */
function getCreatorTargetCalendar(creator) {
  if (!creator) return getTargetCalendar();

  // If creator has connected their personal calendar
  if (creator.calendarConnected && (creator.calendarId || creator.calendarEmail)) {
    var calId = creator.calendarId || creator.calendarEmail;
    try {
      var personalCal = CalendarApp.getCalendarById(calId);
      if (personalCal) return personalCal;
    } catch (err) {
      Logger.log('Could not access individual calendar ' + calId + ': ' + err.toString());
    }
  }

  // Fallback to default calendar
  return getTargetCalendar();
}

function parseDateTime(dateStr, timeStr) {
  var tp = (timeStr || '10:00').split(':');
  var hours = parseInt(tp[0], 10) || 10;
  var mins = parseInt(tp[1], 10) || 0;
  var dp = dateStr.split('-');
  return new Date(parseInt(dp[0], 10), parseInt(dp[1], 10) - 1, parseInt(dp[2], 10), hours, mins, 0);
}

/**
 * Creates or updates an event on the connected freelancer's Google Calendar.
 * Duplicate prevention: If booking already has a valid calendarEventId, updates existing event.
 */
function createBookingCalendarEvent(booking, creator, customer) {
  // DUPLICATE PREVENTION: If event already exists, update instead of creating another
  if (booking.calendarEventId && booking.calendarEventId.indexOf('CAL-') !== 0) {
    var updated = updateBookingCalendarEvent(booking.calendarEventId, booking, creator);
    if (updated) {
      return { eventId: booking.calendarEventId, status: 'synced', email: creator.calendarEmail || '' };
    }
  }

  try {
    var cal = getCreatorTargetCalendar(creator);
    if (!cal) {
      return {
        eventId: 'CAL-LOCAL-' + booking.bookingId,
        status: creator.calendarConnected ? 'failed' : 'not_connected',
        error: creator.calendarConnected ? 'Calendar ID not accessible' : 'Personal calendar not connected'
      };
    }

    var start = parseDateTime(booking.eventDate, booking.startTime);
    var end = parseDateTime(booking.eventDate, booking.endTime || '18:00');
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + (4 * 60 * 60 * 1000));
    }

    var title = 'CreatorFlow — ' + (booking.projectTitle || 'Creative Production') + ' (' + (creator.displayName || 'Creator') + ')';
    var desc = [
      '========================================',
      'CREATORFLOW CONFIRMED PRODUCTION BOOKING',
      '========================================',
      'Project: ' + booking.projectTitle,
      'Client: ' + (customer.fullName || 'Client') + ' (' + (customer.email || '') + ')',
      'Booking Reference: #' + booking.bookingId,
      'Date: ' + booking.eventDate,
      'Scheduled Time: ' + (booking.startTime || '10:00') + ' to ' + (booking.endTime || '18:00'),
      'Location: ' + (booking.location || 'On-Location'),
      'Project Type: ' + (booking.projectType || 'Photography / Cinematography'),
      'Agreed Budget: ৳' + formatBdt(booking.budget || 0),
      'Client Notes: ' + (booking.message || 'None'),
      'Creator: ' + (creator.displayName || '') + ' (@' + (creator.username || '') + ')',
      'Calendar Sync Status: Confirmed & Synchronized',
      'Synchronized At: ' + getNowIso(),
      '========================================'
    ].join('\n');

    var ev = cal.createEvent(title, start, end, {
      description: desc,
      location: booking.location || 'On-Location'
    });

    return {
      eventId: ev.getId(),
      status: 'synced',
      email: creator.calendarEmail || cal.getName()
    };
  } catch (e) {
    Logger.log('Calendar event creation notice: ' + e.toString());
    return {
      eventId: 'CAL-AUTO-' + booking.bookingId,
      status: 'failed',
      error: e.toString()
    };
  }
}

function updateBookingCalendarEvent(calendarEventId, booking, creator) {
  if (!calendarEventId || calendarEventId.indexOf('CAL-') === 0) return false;
  try {
    var cal = getCreatorTargetCalendar(creator);
    if (!cal) return false;

    var ev = cal.getEventById(calendarEventId);
    if (!ev) return false;

    var start = parseDateTime(booking.eventDate, booking.startTime);
    var end = parseDateTime(booking.eventDate, booking.endTime || '18:00');
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + (4 * 60 * 60 * 1000));
    }

    ev.setTime(start, end);
    ev.setLocation(booking.location || 'On-Location');
    ev.setTitle('CreatorFlow — ' + (booking.projectTitle || 'Creative Production') + ' (' + (creator.displayName || '') + ')');
    return true;
  } catch (e) {
    Logger.log('Calendar event update notice: ' + e.toString());
    return false;
  }
}

function cancelBookingCalendarEvent(calendarEventId, booking, creator) {
  if (!calendarEventId || calendarEventId.indexOf('CAL-') === 0) return true;
  try {
    var cal = getCreatorTargetCalendar(creator);
    if (!cal) return true;

    var ev = cal.getEventById(calendarEventId);
    if (ev) {
      ev.setTitle('🚫 [CANCELLED] CreatorFlow — ' + (booking.projectTitle || 'Production'));
    }
    return true;
  } catch (e) {
    Logger.log('Calendar cancel notice: ' + e.toString());
    return false;
  }
}

function connectGoogleCalendar(creatorId, calendarData, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: Can only connect your own Google Calendar');
  }

  var calEmail = String(calendarData.email || sessionUser.email || '').trim();
  var calId = String(calendarData.calendarId || calEmail).trim();
  var now = getNowIso();

  var updateData = {
    calendarConnected: true,
    calendarEmail: calEmail,
    calendarId: calId,
    calendarConnectedAt: now,
    calendarLastSyncAt: now,
    calendarSyncStatus: 'connected',
    updatedAt: now
  };

  updateRowByField('Creators', 'creatorId', creatorId, updateData);
  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function disconnectGoogleCalendar(creatorId, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var now = getNowIso();
  var updateData = {
    calendarConnected: false,
    calendarEmail: '',
    calendarId: '',
    calendarSyncStatus: 'disconnected',
    updatedAt: now
  };

  updateRowByField('Creators', 'creatorId', creatorId, updateData);
  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function syncGoogleCalendarNow(creatorId, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var confirmedBookings = sheetToObjects('Bookings').filter(function(b) {
    return b.creatorId === creatorId && b.status === 'confirmed' && !b.isArchived;
  });

  var syncedCount = 0;
  for (var i = 0; i < confirmedBookings.length; i++) {
    var b = confirmedBookings[i];
    var customer = findRowByField('Users', 'userId', b.customerId) || {};
    var res = createBookingCalendarEvent(b, creator, customer);
    if (res.status === 'synced') {
      syncedCount++;
      updateRowByField('Bookings', 'bookingId', b.bookingId, {
        calendarEventId: res.eventId,
        calendarSyncStatus: 'synced',
        calendarSyncedAt: getNowIso(),
        calendarSyncError: ''
      });
    }
  }

  var now = getNowIso();
  updateRowByField('Creators', 'creatorId', creatorId, {
    calendarLastSyncAt: now,
    calendarSyncStatus: 'connected',
    updatedAt: now
  });

  return {
    success: true,
    syncedCount: syncedCount,
    totalConfirmed: confirmedBookings.length,
    lastSyncAt: now
  };
}

function retryCalendarSync(bookingId, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var customer = findRowByField('Users', 'userId', booking.customerId) || {};
  var res = createBookingCalendarEvent(booking, creator, customer);

  if (res.status === 'synced') {
    updateRowByField('Bookings', 'bookingId', bookingId, {
      calendarEventId: res.eventId,
      calendarSyncStatus: 'synced',
      calendarSyncedAt: getNowIso(),
      calendarSyncError: ''
    });
    updateRowByField('Creators', 'creatorId', creator.creatorId, {
      calendarLastSyncAt: getNowIso()
    });
  } else {
    updateRowByField('Bookings', 'bookingId', bookingId, {
      calendarSyncStatus: 'failed',
      calendarSyncError: res.error || 'Failed to sync calendar'
    });
  }

  return stripInternalRow(findRowByField('Bookings', 'bookingId', bookingId));
}

/* ============================================================================
 * 11. CREATOR PROFILE & DIRECTORY
 * ============================================================================
 */

function getCreators(filters) {
  var rows = sheetToObjects('Creators');
  var results = [];

  for (var i = 0; i < rows.length; i++) {
    var c = rows[i];
    if (c.accountStatus === 'PENDING_DELETION' || c.accountStatus === 'DELETED') {
      continue;
    }
    if (filters && filters.role && filters.role !== 'all') {
      var roles = Array.isArray(c.roles) ? c.roles : [c.roles];
      var match = roles.some(function(r) {
        return String(r).toLowerCase().indexOf(String(filters.role).toLowerCase()) !== -1;
      });
      if (!match) continue;
    }

    if (filters && filters.city && filters.city !== 'all') {
      if (String(c.city || '').toLowerCase() !== String(filters.city).toLowerCase()) {
        continue;
      }
    }

    if (filters && filters.query) {
      var q = String(filters.query).toLowerCase();
      var inName = String(c.displayName || '').toLowerCase().indexOf(q) !== -1;
      var inBio = String(c.bio || '').toLowerCase().indexOf(q) !== -1;
      var inCity = String(c.city || '').toLowerCase().indexOf(q) !== -1;
      if (!inName && !inBio && !inCity) continue;
    }

    results.push(sanitizePublicCreator(c));
  }

  if (filters && filters.sortBy === 'rating') {
    results.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
  } else if (filters && filters.sortBy === 'price_asc') {
    results.sort(function(a, b) { return (a.startingPrice || 0) - (b.startingPrice || 0); });
  } else if (filters && filters.sortBy === 'price_desc') {
    results.sort(function(a, b) { return (b.startingPrice || 0) - (a.startingPrice || 0); });
  }

  return results;
}

function getCreatorByUsername(username) {
  if (!username) return null;
  var clean = String(username).trim().toLowerCase();
  var creator = findRowByField('Creators', 'username', clean);
  if (!creator) return null;
  if (creator.accountStatus === 'DELETED') return null;

  var portfolios = sheetToObjects('Portfolios').filter(function(p) {
    return p.creatorId === creator.creatorId && p.status === 'active';
  });
  var services = sheetToObjects('Services').filter(function(s) {
    return s.creatorId === creator.creatorId && s.status === 'active';
  });
  var packages = sheetToObjects('Packages').filter(function(pkg) {
    return pkg.creatorId === creator.creatorId && pkg.status === 'active';
  });
  var reviews = sheetToObjects('Reviews').filter(function(r) {
    return r.creatorId === creator.creatorId;
  });

  return {
    creator: sanitizePublicCreator(creator),
    portfolios: stripInternalRows(portfolios),
    services: stripInternalRows(services),
    packages: stripInternalRows(packages),
    reviews: stripInternalRows(reviews)
  };
}

function getCreatorProfile(creatorId) {
  var c = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(c);
}

function updateCreatorProfile(creatorId, updateData, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: You can only edit your own creator profile');
  }

  var allowed = [
    'displayName', 'roles', 'bio', 'profileImageUrl', 'coverImageUrl',
    'city', 'district', 'division', 'country', 'serviceAreas', 'skills', 'languages',
    'experienceYears', 'equipment', 'startingPrice', 'facebook',
    'instagram', 'youtube', 'tiktok', 'linkedin', 'website',
    'accountStatus', 'availabilityStatus'
  ];

  var clean = {};
  for (var i = 0; i < allowed.length; i++) {
    var k = allowed[i];
    if (updateData[k] !== undefined) {
      clean[k] = updateData[k];
    }
  }

  clean.updatedAt = getNowIso();
  updateRowByField('Creators', 'creatorId', creatorId, clean);
  if (clean.profileImageUrl !== undefined && creator.userId) {
    updateRowByField('Users', 'userId', creator.userId, {
      profileImage: clean.profileImageUrl,
      updatedAt: getNowIso()
    });
  }
  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

/* ============================================================================
 * 12. PORTFOLIO, SERVICES & PACKAGES
 * ============================================================================
 */

function getCreatorPortfolio(creatorId) {
  var rows = sheetToObjects('Portfolios');
  var list = rows.filter(function(item) {
    return item.creatorId === creatorId && item.status === 'active';
  }).sort(function(a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
  return stripInternalRows(list);
}

function createPortfolioItem(creatorId, itemData, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: Not permitted to modify this portfolio');
  }

  var portfolioId = generateNextId('PORT', 'Portfolios', 'portfolioId');
  var now = getNowIso();

  var newItem = {
    portfolioId: portfolioId,
    creatorId: creatorId,
    title: itemData.title || 'Untitled Work',
    description: itemData.description || '',
    category: itemData.category || 'photography',
    fileId: itemData.fileId || '',
    fileUrl: itemData.fileUrl || '',
    thumbnailUrl: itemData.thumbnailUrl || itemData.fileUrl || '',
    mimeType: itemData.mimeType || 'image/jpeg',
    tags: itemData.tags || [],
    featured: itemData.featured === true,
    status: 'active',
    sortOrder: Number(itemData.sortOrder) || 1,
    createdAt: now,
    updatedAt: now
  };

  insertRow('Portfolios', newItem);
  return stripInternalRow(newItem);
}

function updatePortfolioItem(portfolioId, itemData, sessionUser) {
  var item = findRowByField('Portfolios', 'portfolioId', portfolioId);
  if (!item) throw new Error('NOT_FOUND: Portfolio item not found');

  var creator = findRowByField('Creators', 'creatorId', item.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var allowed = ['title', 'description', 'category', 'fileUrl', 'thumbnailUrl', 'mimeType', 'tags', 'featured', 'status', 'sortOrder'];
  var clean = {};
  for (var i = 0; i < allowed.length; i++) {
    if (itemData[allowed[i]] !== undefined) clean[allowed[i]] = itemData[allowed[i]];
  }
  clean.updatedAt = getNowIso();
  updateRowByField('Portfolios', 'portfolioId', portfolioId, clean);
  return stripInternalRow(findRowByField('Portfolios', 'portfolioId', portfolioId));
}

function deletePortfolioItem(portfolioId, sessionUser) {
  var item = findRowByField('Portfolios', 'portfolioId', portfolioId);
  if (!item) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', item.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  deleteRowByField('Portfolios', 'portfolioId', portfolioId);
  return { success: true, portfolioId: portfolioId };
}

function reorderPortfolio(creatorId, orderedIds, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND');
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  for (var i = 0; i < orderedIds.length; i++) {
    updateRowByField('Portfolios', 'portfolioId', orderedIds[i], { sortOrder: i + 1 });
  }
  return getCreatorPortfolio(creatorId);
}

function setFeaturedPortfolio(portfolioId, featured, sessionUser) {
  return updatePortfolioItem(portfolioId, { featured: featured === true }, sessionUser);
}

function getCreatorServices(creatorId) {
  var rows = sheetToObjects('Services');
  var list = rows.filter(function(s) {
    return s.creatorId === creatorId && s.status === 'active';
  });
  return stripInternalRows(list);
}

function createService(creatorId, data, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND');
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var serviceId = generateNextId('SRV', 'Services', 'serviceId');
  var now = getNowIso();

  var newService = {
    serviceId: serviceId,
    creatorId: creatorId,
    title: String(data.title || 'Creative Service').trim(),
    description: String(data.description || '').trim(),
    category: data.category || 'photography',
    startingPrice: Number(data.startingPrice) || 0,
    deliveryTime: data.deliveryTime || '7 Days',
    location: data.location || 'Dhaka',
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
  insertRow('Services', newService);
  return stripInternalRow(newService);
}

function updateService(serviceId, data, sessionUser) {
  var s = findRowByField('Services', 'serviceId', serviceId);
  if (!s) throw new Error('NOT_FOUND');
  var creator = findRowByField('Creators', 'creatorId', s.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var allowed = ['title', 'description', 'category', 'startingPrice', 'deliveryTime', 'location', 'status'];
  var clean = {};
  for (var i = 0; i < allowed.length; i++) {
    if (data[allowed[i]] !== undefined) clean[allowed[i]] = data[allowed[i]];
  }
  clean.updatedAt = getNowIso();
  updateRowByField('Services', 'serviceId', serviceId, clean);
  return stripInternalRow(findRowByField('Services', 'serviceId', serviceId));
}

function deleteService(serviceId, sessionUser) {
  var s = findRowByField('Services', 'serviceId', serviceId);
  if (!s) throw new Error('NOT_FOUND');
  var creator = findRowByField('Creators', 'creatorId', s.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  deleteRowByField('Services', 'serviceId', serviceId);
  return { success: true, serviceId: serviceId };
}

function getCreatorPackages(creatorId, serviceId) {
  var rows = sheetToObjects('Packages');
  var list = rows.filter(function(pkg) {
    var matchC = pkg.creatorId === creatorId;
    var matchS = serviceId ? pkg.serviceId === serviceId : true;
    return matchC && matchS && pkg.status === 'active';
  });
  return stripInternalRows(list);
}

function createPackage(creatorId, data, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND');
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var packageId = generateNextId('PKG', 'Packages', 'packageId');
  var now = getNowIso();

  var newPackage = {
    packageId: packageId,
    creatorId: creatorId,
    serviceId: data.serviceId || '',
    name: String(data.name || 'Custom Package').trim(),
    description: String(data.description || '').trim(),
    price: Number(data.price) || 0,
    duration: data.duration || 'Full Day',
    teamSize: Number(data.teamSize) || 1,
    photoCount: Number(data.photoCount) || 0,
    editedPhotoCount: Number(data.editedPhotoCount) || 0,
    videoDuration: data.videoDuration || '',
    deliveryTime: data.deliveryTime || '7 Days',
    revisions: Number(data.revisions) || 2,
    travelIncluded: data.travelIncluded === true,
    equipment: data.equipment || [],
    addons: data.addons || [],
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
  insertRow('Packages', newPackage);
  return stripInternalRow(newPackage);
}

function updatePackage(packageId, data, sessionUser) {
  var pkg = findRowByField('Packages', 'packageId', packageId);
  if (!pkg) throw new Error('NOT_FOUND');
  var creator = findRowByField('Creators', 'creatorId', pkg.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var allowed = [
    'serviceId', 'name', 'description', 'price', 'duration', 'teamSize',
    'photoCount', 'editedPhotoCount', 'videoDuration', 'deliveryTime',
    'revisions', 'travelIncluded', 'equipment', 'addons', 'status'
  ];
  var clean = {};
  for (var i = 0; i < allowed.length; i++) {
    if (data[allowed[i]] !== undefined) clean[allowed[i]] = data[allowed[i]];
  }
  clean.updatedAt = getNowIso();
  updateRowByField('Packages', 'packageId', packageId, clean);
  return stripInternalRow(findRowByField('Packages', 'packageId', packageId));
}

function disablePackage(packageId, sessionUser) {
  return updatePackage(packageId, { status: 'inactive' }, sessionUser);
}

function deletePackage(packageId, sessionUser) {
  var pkg = findRowByField('Packages', 'packageId', packageId);
  if (!pkg) throw new Error('NOT_FOUND');
  var creator = findRowByField('Creators', 'creatorId', pkg.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  deleteRowByField('Packages', 'packageId', packageId);
  return { success: true, packageId: packageId };
}

/* ============================================================================
 * 13. AVAILABILITY & CONFLICT PREVENTION
 * ============================================================================
 */

function getAvailability(creatorId, startDate, endDate) {
  var rows = sheetToObjects('Availability');
  var list = rows.filter(function(item) {
    if (item.creatorId !== creatorId) return false;
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });
  return stripInternalRows(list);
}

function checkBookingConflict(creatorId, date, startTime, endTime, excludeBookingId) {
  var rows = sheetToObjects('Availability');
  for (var i = 0; i < rows.length; i++) {
    var slot = rows[i];
    if (slot.creatorId === creatorId && slot.date === date) {
      if (excludeBookingId && slot.bookingId === excludeBookingId) {
        continue;
      }
      // Conflicting statuses: booked, unavailable, tentative
      if (slot.status === 'booked' || slot.status === 'unavailable' || slot.status === 'tentative') {
        if (!startTime || !endTime || !slot.startTime || !slot.endTime) {
          return true;
        }
        if (startTime < slot.endTime && endTime > slot.startTime) {
          return true;
        }
      }
    }
  }
  return false;
}

function setAvailability(creatorId, date, startTime, endTime, status, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND');
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var existing = sheetToObjects('Availability').filter(function(a) {
    return a.creatorId === creatorId && a.date === date;
  });
  var now = getNowIso();

  if (existing.length > 0) {
    updateRowByField('Availability', 'availabilityId', existing[0].availabilityId, {
      startTime: startTime || '09:00',
      endTime: endTime || '18:00',
      status: status || 'available',
      updatedAt: now
    });
    return stripInternalRow(findRowByField('Availability', 'availabilityId', existing[0].availabilityId));
  } else {
    var avlId = generateNextId('AVL', 'Availability', 'availabilityId');
    var newSlot = {
      availabilityId: avlId,
      creatorId: creatorId,
      date: date,
      startTime: startTime || '09:00',
      endTime: endTime || '18:00',
      status: status || 'available',
      notes: '',
      createdAt: now,
      updatedAt: now
    };
    insertRow('Availability', newSlot);
    return stripInternalRow(newSlot);
  }
}

function blockDate(creatorId, date, notes, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND');
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var existing = sheetToObjects('Availability').filter(function(a) {
    return a.creatorId === creatorId && a.date === date;
  });
  var now = getNowIso();

  if (existing.length > 0) {
    updateRowByField('Availability', 'availabilityId', existing[0].availabilityId, {
      status: 'unavailable',
      notes: notes || 'Blocked by creator',
      updatedAt: now
    });
    return stripInternalRow(findRowByField('Availability', 'availabilityId', existing[0].availabilityId));
  } else {
    var avlId = generateNextId('AVL', 'Availability', 'availabilityId');
    var newSlot = {
      availabilityId: avlId,
      creatorId: creatorId,
      date: date,
      startTime: '00:00',
      endTime: '23:59',
      status: 'unavailable',
      notes: notes || 'Blocked by creator',
      createdAt: now,
      updatedAt: now
    };
    insertRow('Availability', newSlot);
    return stripInternalRow(newSlot);
  }
}

function unblockDate(creatorId, date, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND');
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var existing = sheetToObjects('Availability').filter(function(a) {
    return a.creatorId === creatorId && a.date === date;
  });
  if (existing.length > 0) {
    deleteRowByField('Availability', 'availabilityId', existing[0].availabilityId);
  }
  return { success: true, date: date };
}

/* ============================================================================
 * 14. BOOKINGS & PROJECT PIPELINE
 * ============================================================================
 */

function getBookings(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var all = sheetToObjects('Bookings');
  var isCreator = sessionUser.accountType === 'creator';
  var isAdmin = isAdminOrStaff(sessionUser);

  var creatorRecord = isCreator ? findRowByField('Creators', 'userId', sessionUser.userId) : null;

  var list = all.filter(function(b) {
    if (b.isDeleted === true || b.isDeleted === 'true' || b.status === 'deleted') return false;
    if (isAdmin) return true;
    if (b.customerId === sessionUser.userId) return true;
    if (creatorRecord && b.creatorId === creatorRecord.creatorId) return true;
    return false;
  }).sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return stripInternalRows(list);
}

function createBooking(bookingData, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  if (!bookingData.creatorId || !bookingData.eventDate) {
    throw new Error('MISSING_FIELDS: creatorId and eventDate are required');
  }

  var creator = findRowByField('Creators', 'creatorId', bookingData.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  // Phase 1: Check conflict & create booking under ONE clean database lock
  var newBooking = withScriptLock(function() {
    var hasConflict = checkBookingConflict(
      bookingData.creatorId,
      bookingData.eventDate,
      bookingData.startTime,
      bookingData.endTime
    );

    if (hasConflict) {
      throw new Error('DATE_UNAVAILABLE: Creator is already booked or unavailable on this date/time');
    }

    var bookingId = generateNextIdUnlocked('BKG', 'Bookings', 'bookingId');
    var now = getNowIso();

    var bookingRecord = {
      bookingId: bookingId,
      customerId: sessionUser.userId,
      creatorId: bookingData.creatorId,
      serviceId: bookingData.serviceId || '',
      packageId: bookingData.packageId || '',
      projectTitle: String(bookingData.projectTitle || 'Creative Production').trim(),
      projectType: bookingData.projectType || 'Photography / Cinematography',
      eventDate: bookingData.eventDate,
      startTime: bookingData.startTime || '10:00',
      endTime: bookingData.endTime || '18:00',
      location: String(bookingData.location || 'On-Location').trim(),
      budget: Number(bookingData.budget) || 0,
      message: String(bookingData.message || '').trim(),
      status: 'pending',
      paymentStatus: 'unpaid',
      calendarEventId: '',
      driveProjectFolderId: '',
      createdAt: now,
      updatedAt: now
    };

    insertRowUnlocked('Bookings', bookingRecord);

    var avlId = generateNextIdUnlocked('AVL', 'Availability', 'availabilityId');
    insertRowUnlocked('Availability', {
      availabilityId: avlId,
      creatorId: bookingData.creatorId,
      date: bookingData.eventDate,
      startTime: bookingData.startTime || '10:00',
      endTime: bookingData.endTime || '18:00',
      status: 'tentative',
      bookingId: bookingId,
      notes: 'Pending request: ' + bookingRecord.projectTitle,
      createdAt: now,
      updatedAt: now
    });

    return bookingRecord;
  });

  // Phase 2: Create Drive folder and notification OUTSIDE of the database lock
  try {
    var projectDriveFolderId = ensureBookingDriveFolder(newBooking.bookingId, newBooking.creatorId, newBooking.projectTitle);
    if (projectDriveFolderId) {
      updateRowByField('Bookings', 'bookingId', newBooking.bookingId, {
        driveProjectFolderId: projectDriveFolderId
      });
      newBooking.driveProjectFolderId = projectDriveFolderId;
    }
  } catch (driveErr) {
    Logger.log('Drive folder warning for booking: ' + driveErr.toString());
  }

  createNotification(
    creator.userId,
    'New Booking Request: ' + newBooking.projectTitle,
    (sessionUser.fullName || 'A client') + ' requested a booking for ' + bookingData.eventDate,
    'booking'
  );

  return stripInternalRow(newBooking);
}

function acceptBooking(bookingId, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  withScriptLock(function() {
    var refreshed = findRowByField('Bookings', 'bookingId', bookingId);
    if (!refreshed) throw new Error('NOT_FOUND');

    // Re-verify no other booking was confirmed on this slot
    var hasConflict = checkBookingConflict(
      refreshed.creatorId,
      refreshed.eventDate,
      refreshed.startTime,
      refreshed.endTime,
      bookingId
    );
    if (hasConflict) {
      throw new Error('DATE_UNAVAILABLE: Creator has an overlapping booking confirmed for this slot');
    }

    updateRowByFieldUnlocked('Bookings', 'bookingId', bookingId, {
      status: 'accepted',
      updatedAt: getNowIso()
    });

    var avlSlots = sheetToObjects('Availability').filter(function(a) { return a.bookingId === bookingId; });
    if (avlSlots.length > 0) {
      updateRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[0].availabilityId, {
        status: 'tentative',
        notes: 'Accepted request: ' + refreshed.projectTitle,
        updatedAt: getNowIso()
      });
    }
  });

  createNotification(
    booking.customerId,
    'Booking Accepted! 🎉',
    creator.displayName + ' accepted your booking for ' + booking.eventDate + '. Complete payment to schedule.',
    'booking'
  );

  return stripInternalRow(findRowByField('Bookings', 'bookingId', bookingId));
}

/**
 * Confirm booking rule: Only admin/staff or creator may confirm a booking.
 * Normal customers CANNOT self-confirm bookings.
 */
function confirmBooking(bookingId, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (!creator) throw new Error('NOT_FOUND');

  var customer = findRowByField('Users', 'userId', booking.customerId);

  var isCreator = sessionUser.userId === creator.userId;
  var isAdmin = isAdminOrStaff(sessionUser);

  if (!isCreator && !isAdmin) {
    throw new Error('UNAUTHORIZED: Bookings can only be confirmed by creator or administrative staff');
  }

  // Phase 1: Pure database operations under lock
  withScriptLock(function() {
    var refreshed = findRowByField('Bookings', 'bookingId', bookingId);
    if (!refreshed) throw new Error('NOT_FOUND');

    // Check conflict (excluding this booking's own slot)
    var conflict = checkBookingConflict(
      refreshed.creatorId,
      refreshed.eventDate,
      refreshed.startTime,
      refreshed.endTime,
      bookingId
    );
    if (conflict) {
      throw new Error('DATE_UNAVAILABLE: Creator is already booked on this date/time');
    }

    updateRowByFieldUnlocked('Bookings', 'bookingId', bookingId, {
      status: 'confirmed',
      updatedAt: getNowIso()
    });

    var avlSlots = sheetToObjects('Availability').filter(function(a) {
      return a.bookingId === bookingId;
    });
    if (avlSlots.length > 0) {
      updateRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[0].availabilityId, {
        status: 'booked',
        notes: 'Confirmed: ' + refreshed.projectTitle,
        updatedAt: getNowIso()
      });
    } else {
      var avlId = generateNextIdUnlocked('AVL', 'Availability', 'availabilityId');
      insertRowUnlocked('Availability', {
        availabilityId: avlId,
        creatorId: refreshed.creatorId,
        date: refreshed.eventDate,
        startTime: refreshed.startTime,
        endTime: refreshed.endTime,
        status: 'booked',
        bookingId: bookingId,
        notes: 'Confirmed: ' + refreshed.projectTitle,
        createdAt: getNowIso(),
        updatedAt: getNowIso()
      });
    }

    var existingProject = findRowByField('Projects', 'bookingId', bookingId);
    if (!existingProject) {
      var projectId = generateNextIdUnlocked('PRJ', 'Projects', 'projectId');
      var now = getNowIso();
      insertRowUnlocked('Projects', {
        projectId: projectId,
        bookingId: bookingId,
        customerId: refreshed.customerId,
        creatorId: refreshed.creatorId,
        title: refreshed.projectTitle,
        status: 'active',
        driveFolderId: refreshed.driveProjectFolderId || '',
        startDate: refreshed.eventDate,
        deliveryDate: '',
        notes: 'Project initialized on confirmation',
        createdAt: now,
        updatedAt: now
      });
    }
  });

  // Phase 2: External Calendar & Notification operations OUTSIDE the lock
  var currentBooking = findRowByField('Bookings', 'bookingId', bookingId);
  var syncResult = createBookingCalendarEvent(currentBooking, creator, customer || {});

  if (syncResult && syncResult.status === 'synced') {
    updateRowByField('Bookings', 'bookingId', bookingId, {
      calendarEventId: syncResult.eventId,
      calendarSyncStatus: 'synced',
      calendarSyncedAt: getNowIso(),
      calendarSyncError: ''
    });
    if (creator.calendarConnected) {
      updateRowByField('Creators', 'creatorId', creator.creatorId, {
        calendarLastSyncAt: getNowIso()
      });
    }
  } else if (syncResult && syncResult.status === 'failed') {
    updateRowByField('Bookings', 'bookingId', bookingId, {
      calendarEventId: syncResult.eventId || '',
      calendarSyncStatus: 'failed',
      calendarSyncError: syncResult.error || 'Failed to create calendar event'
    });
  } else {
    updateRowByField('Bookings', 'bookingId', bookingId, {
      calendarEventId: (syncResult && syncResult.eventId) || '',
      calendarSyncStatus: 'not_connected',
      calendarSyncError: ''
    });
  }

  createNotification(
    currentBooking.customerId,
    'Booking Confirmed',
    'Your booking with ' + creator.displayName + ' is confirmed for ' + currentBooking.eventDate,
    'calendar'
  );
  createNotification(
    creator.userId,
    'Booking Confirmed: ' + currentBooking.projectTitle,
    'Calendar event created and project workspace open for ' + (customer ? customer.fullName : 'client'),
    'calendar'
  );

  return stripInternalRow(findRowByField('Bookings', 'bookingId', bookingId));
}

function declineBooking(bookingId, reason, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  withScriptLock(function() {
    updateRowByFieldUnlocked('Bookings', 'bookingId', bookingId, {
      status: 'declined',
      updatedAt: getNowIso()
    });

    var avlSlots = sheetToObjects('Availability').filter(function(a) { return a.bookingId === bookingId; });
    if (avlSlots.length > 0) {
      deleteRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[0].availabilityId);
    }
  });

  createNotification(
    booking.customerId,
    'Booking Declined',
    creator.displayName + ' was unable to accept your booking for ' + booking.eventDate + (reason ? ': ' + reason : ''),
    'booking'
  );

  return stripInternalRow(findRowByField('Bookings', 'bookingId', bookingId));
}

function rescheduleBooking(bookingId, data, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  var isParty = sessionUser.userId === creator.userId || sessionUser.userId === booking.customerId;
  if (!isParty && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: Only booking parties can reschedule');
  }

  var newDate = String(data.eventDate || booking.eventDate).trim();
  var newStart = String(data.startTime || booking.startTime).trim();
  var newEnd = String(data.endTime || booking.endTime).trim();

  // Check conflicts on new date
  var conflict = checkBookingConflict(booking.creatorId, newDate, newStart, newEnd, bookingId);
  if (conflict) {
    throw new Error('DATE_UNAVAILABLE: Time slot conflict on ' + newDate);
  }

  var now = getNowIso();
  withScriptLock(function() {
    updateRowByFieldUnlocked('Bookings', 'bookingId', bookingId, {
      eventDate: newDate,
      startTime: newStart,
      endTime: newEnd,
      updatedAt: now
    });

    // Update availability row
    var avlSlots = sheetToObjects('Availability').filter(function(a) { return a.bookingId === bookingId; });
    if (avlSlots.length > 0) {
      updateRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[0].availabilityId, {
        date: newDate,
        startTime: newStart,
        endTime: newEnd,
        updatedAt: now
      });
    }
  });

  var updatedBooking = findRowByField('Bookings', 'bookingId', bookingId);

  // Update existing Google Calendar event if confirmed
  if (updatedBooking.calendarEventId) {
    updateBookingCalendarEvent(updatedBooking.calendarEventId, updatedBooking, creator);
  }

  createNotification(
    booking.customerId,
    'Booking Rescheduled',
    'Booking #' + bookingId + ' has been rescheduled to ' + newDate + ' (' + newStart + ' - ' + newEnd + ')',
    'calendar'
  );
  createNotification(
    creator.userId,
    'Booking Rescheduled',
    'Production booking #' + bookingId + ' date changed to ' + newDate + ' (' + newStart + ' - ' + newEnd + ')',
    'calendar'
  );

  return stripInternalRow(updatedBooking);
}

function cancelBooking(bookingId, reason, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  var isParty = sessionUser.userId === creator.userId || sessionUser.userId === booking.customerId;
  if (!isParty && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var now = getNowIso();
  withScriptLock(function() {
    updateRowByFieldUnlocked('Bookings', 'bookingId', bookingId, {
      status: 'cancelled',
      isCancelled: true,
      cancelledAt: now,
      cancellationReason: String(reason || 'Cancelled by user').trim(),
      updatedAt: now
    });

    // Free availability slot
    var avlSlots = sheetToObjects('Availability').filter(function(a) { return a.bookingId === bookingId; });
    if (avlSlots.length > 0) {
      deleteRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[0].availabilityId);
    }
  });

  var updatedBooking = findRowByField('Bookings', 'bookingId', bookingId);

  // Cancel calendar event
  if (updatedBooking.calendarEventId) {
    cancelBookingCalendarEvent(updatedBooking.calendarEventId, updatedBooking, creator);
  }

  createNotification(
    booking.customerId,
    'Booking Cancelled',
    'Booking #' + bookingId + ' was cancelled' + (reason ? ': ' + reason : ''),
    'booking'
  );
  createNotification(
    creator.userId,
    'Booking Cancelled',
    'Booking #' + bookingId + ' was cancelled' + (reason ? ': ' + reason : ''),
    'booking'
  );

  return stripInternalRow(updatedBooking);
}

function archiveBooking(bookingId, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  var isParty = (creator && sessionUser.userId === creator.userId) || sessionUser.userId === booking.customerId;
  if (!isParty && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  var now = getNowIso();
  updateRowByField('Bookings', 'bookingId', bookingId, {
    isArchived: true,
    archivedAt: now,
    updatedAt: now
  });

  return stripInternalRow(findRowByField('Bookings', 'bookingId', bookingId));
}

function restoreBooking(bookingId, sessionUser) {
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  var isParty = (creator && sessionUser.userId === creator.userId) || sessionUser.userId === booking.customerId;
  if (!isParty && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED');

  updateRowByField('Bookings', 'bookingId', bookingId, {
    isArchived: false,
    updatedAt: getNowIso()
  });

  return stripInternalRow(findRowByField('Bookings', 'bookingId', bookingId));
}

function deleteBooking(bookingId, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var booking = findRowByField('Bookings', 'bookingId', bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  var isParty = (creator && sessionUser.userId === creator.userId) || sessionUser.userId === booking.customerId;
  if (!isParty && !isAdminOrStaff(sessionUser)) throw new Error('UNAUTHORIZED: Not authorized to delete this booking');

  var now = getNowIso();
  withScriptLock(function() {
    updateRowByFieldUnlocked('Bookings', 'bookingId', bookingId, {
      isDeleted: true,
      deletedAt: now,
      status: 'deleted',
      updatedAt: now
    });

    // Also remove any availability slot
    var avlSlots = sheetToObjects('Availability').filter(function(a) { return a.bookingId === bookingId; });
    for (var i = 0; i < avlSlots.length; i++) {
      deleteRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[i].availabilityId);
    }
  });

  // If there was a calendar event, cancel/delete it
  if (booking.calendarEventId) {
    try {
      cancelBookingCalendarEvent(booking.calendarEventId, booking, creator);
    } catch (e) {
      Logger.log('Calendar event cleanup on delete booking: ' + e.message);
    }
  }

  return { success: true, bookingId: bookingId };
}

function deleteConversation(conversationId, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var all = sheetToObjects('Messages');
  var convMsgs = all.filter(function(m) {
    return (m.conversationId === conversationId || ('CONV-' + [m.senderId, m.receiverId].sort().join('-')) === conversationId) &&
      (m.senderId === sessionUser.userId || m.receiverId === sessionUser.userId);
  });

  var now = getNowIso();
  for (var i = 0; i < convMsgs.length; i++) {
    updateRowByField('Messages', 'messageId', convMsgs[i].messageId, {
      isDeleted: true,
      deletedAt: now
    });
  }

  return { success: true, conversationId: conversationId };
}

function archiveConversation(conversationId, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var all = sheetToObjects('Messages');
  var convMsgs = all.filter(function(m) {
    return (m.conversationId === conversationId || ('CONV-' + [m.senderId, m.receiverId].sort().join('-')) === conversationId) &&
      (m.senderId === sessionUser.userId || m.receiverId === sessionUser.userId);
  });

  var targetState = true;
  if (convMsgs.length > 0 && convMsgs[0].isArchived) {
    targetState = false; // Toggle
  }

  for (var i = 0; i < convMsgs.length; i++) {
    updateRowByField('Messages', 'messageId', convMsgs[i].messageId, {
      isArchived: targetState
    });
  }

  return { success: true, conversationId: conversationId, isArchived: targetState };
}

function deleteMessage(messageId, sessionUser) {
  var m = findRowByField('Messages', 'messageId', messageId);
  if (!m) throw new Error('NOT_FOUND');

  if (m.senderId !== sessionUser.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: Can only delete your own messages');
  }

  updateRowByField('Messages', 'messageId', messageId, {
    isDeleted: true,
    deletedAt: getNowIso()
  });

  return { success: true, messageId: messageId };
}

function updateProfilePhoto(creatorId, photoData, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var imageUrl = String(photoData.url || photoData.profileImageUrl || '').trim();
  var now = getNowIso();

  updateRowByField('Creators', 'creatorId', creatorId, {
    profileImageUrl: imageUrl,
    updatedAt: now
  });

  if (creator.userId) {
    updateRowByField('Users', 'userId', creator.userId, {
      profileImage: imageUrl,
      updatedAt: now
    });
  }

  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function removeProfilePhoto(creatorId, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var now = getNowIso();
  updateRowByField('Creators', 'creatorId', creatorId, {
    profileImageUrl: '',
    updatedAt: now
  });

  if (creator.userId) {
    updateRowByField('Users', 'userId', creator.userId, {
      profileImage: '',
      updatedAt: now
    });
  }

  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function updateCoverPhoto(creatorId, photoData, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var imageUrl = String(photoData.url || photoData.coverImageUrl || '').trim();
  var now = getNowIso();

  updateRowByField('Creators', 'creatorId', creatorId, {
    coverImageUrl: imageUrl,
    updatedAt: now
  });

  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function removeCoverPhoto(creatorId, sessionUser) {
  var creator = findRowByField('Creators', 'creatorId', creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  if (sessionUser.userId !== creator.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }

  var now = getNowIso();
  updateRowByField('Creators', 'creatorId', creatorId, {
    coverImageUrl: '',
    updatedAt: now
  });

  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function getProjects(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var all = sheetToObjects('Projects');
  var isCreator = sessionUser.accountType === 'creator';
  var isAdmin = isAdminOrStaff(sessionUser);

  var creatorRecord = isCreator ? findRowByField('Creators', 'userId', sessionUser.userId) : null;

  var list = all.filter(function(p) {
    if (isAdmin) return true;
    if (p.customerId === sessionUser.userId) return true;
    if (creatorRecord && p.creatorId === creatorRecord.creatorId) return true;
    return false;
  }).sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return stripInternalRows(list);
}

function getProjectById(projectId, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  var project = findRowByField('Projects', 'projectId', projectId);
  if (!project) throw new Error('NOT_FOUND');

  var isCreator = sessionUser.accountType === 'creator';
  var creatorRecord = isCreator ? findRowByField('Creators', 'userId', sessionUser.userId) : null;

  var authorized = isAdminOrStaff(sessionUser) ||
    project.customerId === sessionUser.userId ||
    (creatorRecord && project.creatorId === creatorRecord.creatorId);

  if (!authorized) throw new Error('UNAUTHORIZED');

  var booking = findRowByField('Bookings', 'bookingId', project.bookingId);
  var creator = findRowByField('Creators', 'creatorId', project.creatorId);
  var customer = findRowByField('Users', 'userId', project.customerId);

  return {
    project: stripInternalRow(project),
    booking: stripInternalRow(booking),
    creator: sanitizePublicCreator(creator),
    customer: sanitizeUser(customer)
  };
}

function updateProjectStatus(projectId, status, notes, deliveryDate, sessionUser) {
  var project = findRowByField('Projects', 'projectId', projectId);
  if (!project) throw new Error('NOT_FOUND');

  var creator = findRowByField('Creators', 'creatorId', project.creatorId);
  var isOwner = sessionUser.userId === creator.userId;
  var isAdmin = isAdminOrStaff(sessionUser);

  if (!isOwner && !isAdmin) throw new Error('UNAUTHORIZED');

  var updateData = { status: status, updatedAt: getNowIso() };
  if (notes !== undefined) updateData.notes = notes;
  if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;

  updateRowByField('Projects', 'projectId', projectId, updateData);

  if (status === 'completed' && project.bookingId) {
    updateRowByField('Bookings', 'bookingId', project.bookingId, {
      status: 'completed',
      updatedAt: getNowIso()
    });
  }

  createNotification(
    project.customerId,
    'Project Status Update: ' + status,
    'Project "' + project.title + '" status changed to ' + status,
    'project'
  );

  return stripInternalRow(findRowByField('Projects', 'projectId', projectId));
}

/* ============================================================================
 * 15. MESSAGING SYSTEM WITH RELATIONSHIP VALIDATION
 * ============================================================================
 */

function canUsersMessage(senderId, receiverId, sessionUser) {
  if (isAdminOrStaff(sessionUser)) return true;
  if (senderId === receiverId) return false;

  // 1. Check if receiver is a creator and sender is an active client
  var targetCreator = findRowByField('Creators', 'userId', receiverId);
  if (targetCreator) return true;

  // 2. Check if sender is a creator and receiver is a client with an existing booking
  var senderCreator = findRowByField('Creators', 'userId', senderId);
  if (senderCreator) {
    var clientBookings = sheetToObjects('Bookings').filter(function(b) {
      return b.creatorId === senderCreator.creatorId && b.customerId === receiverId;
    });
    if (clientBookings.length > 0) return true;
  }

  // 3. Shared booking
  var bookings = sheetToObjects('Bookings');
  for (var b = 0; b < bookings.length; b++) {
    var bk = bookings[b];
    var crt = findRowByField('Creators', 'creatorId', bk.creatorId);
    if (crt) {
      var isPartyA = (bk.customerId === senderId && crt.userId === receiverId);
      var isPartyB = (bk.customerId === receiverId && crt.userId === senderId);
      if (isPartyA || isPartyB) return true;
    }
  }

  // 4. Shared project
  var projects = sheetToObjects('Projects');
  for (var p = 0; p < projects.length; p++) {
    var pr = projects[p];
    var pCrt = findRowByField('Creators', 'creatorId', pr.creatorId);
    if (pCrt) {
      var isProjPartyA = (pr.customerId === senderId && pCrt.userId === receiverId);
      var isProjPartyB = (pr.customerId === receiverId && pCrt.userId === senderId);
      if (isProjPartyA || isProjPartyB) return true;
    }
  }

  return false;
}

function getConversations(sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');

  var all = sheetToObjects('Messages');
  var userMsgs = all.filter(function(m) {
    return m.senderId === sessionUser.userId || m.receiverId === sessionUser.userId;
  });

  var convMap = {};
  var users = sheetToObjects('Users');

  for (var i = 0; i < userMsgs.length; i++) {
    var m = userMsgs[i];
    var otherId = m.senderId === sessionUser.userId ? m.receiverId : m.senderId;
    var cId = m.conversationId || ('CONV-' + [sessionUser.userId, otherId].sort().join('-'));

    if (!convMap[cId] || new Date(m.createdAt) > new Date(convMap[cId].lastMessageAt)) {
      var otherUser = users.find(function(u) { return u.userId === otherId; });
      convMap[cId] = {
        conversationId: cId,
        otherUserId: otherId,
        otherUserName: m.guestName || (otherUser ? otherUser.fullName : 'Guest Client'),
        otherUserImage: otherUser ? otherUser.profileImage : '',
        lastMessage: m.message,
        lastMessageAt: m.createdAt,
        unreadCount: (m.receiverId === sessionUser.userId && !m.isRead) ? 1 : 0,
        isGuest: Boolean(m.isGuest || cId.indexOf('GUEST-CONV-') === 0),
        guestEmail: m.guestEmail || '',
        guestPhone: m.guestPhone || ''
      };
    } else if (m.receiverId === sessionUser.userId && !m.isRead) {
      convMap[cId].unreadCount += 1;
    }
  }

  var list = [];
  for (var k in convMap) list.push(convMap[k]);
  return list.sort(function(a, b) {
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

function getMessages(conversationId, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');

  var all = sheetToObjects('Messages');
  var filtered = all.filter(function(m) {
    if (m.conversationId === conversationId) {
      return m.senderId === sessionUser.userId || m.receiverId === sessionUser.userId || isAdminOrStaff(sessionUser);
    }
    return false;
  });

  for (var i = 0; i < filtered.length; i++) {
    if (filtered[i].receiverId === sessionUser.userId && !filtered[i].isRead) {
      updateRowByField('Messages', 'messageId', filtered[i].messageId, { isRead: true });
      filtered[i].isRead = true;
    }
  }

  var list = filtered.sort(function(a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return stripInternalRows(list);
}

function sendMessage(data, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  if (!data.receiverId || !data.message) throw new Error('MISSING_FIELDS');

  var cId = data.conversationId || ('CONV-' + [sessionUser.userId, data.receiverId].sort().join('-'));
  var isGuestConv = (cId.indexOf('GUEST-CONV-') === 0);

  // Validate legitimate relationship (allow creator replying to guest inquiry)
  var allowed = isGuestConv || canUsersMessage(sessionUser.userId, data.receiverId, sessionUser);
  if (!allowed) {
    throw new Error('FORBIDDEN_MESSAGE: You do not have an active booking, project, or creator inquiry with this user');
  }

  var messageId = generateNextId('MSG', 'Messages', 'messageId');
  var now = getNowIso();

  var newMsg = {
    messageId: messageId,
    conversationId: cId,
    senderId: sessionUser.userId,
    receiverId: data.receiverId,
    bookingId: data.bookingId || '',
    projectId: data.projectId || '',
    message: String(data.message).trim(),
    attachmentFileId: data.attachmentFileId || '',
    attachmentUrl: data.attachmentUrl || '',
    isRead: false,
    createdAt: now
  };

  insertRow('Messages', newMsg);

  if (!isGuestConv) {
    createNotification(
      data.receiverId,
      'New message from ' + (sessionUser.fullName || 'User'),
      newMsg.message.length > 50 ? newMsg.message.substring(0, 47) + '...' : newMsg.message,
      'message'
    );
  }

  return stripInternalRow(newMsg);
}

function sendGuestInquiry(data) {
  if (!data.creatorId || !data.guestName || !data.guestEmail || !data.message) {
    throw new Error('MISSING_FIELDS: creatorId, guestName, guestEmail, and message are required');
  }

  var creator = findRowByField('Creators', 'creatorId', data.creatorId);
  if (!creator) throw new Error('NOT_FOUND: Creator not found');

  var convId = data.conversationId || ('GUEST-CONV-' + data.creatorId.replace(/[^a-zA-Z0-9]/g, '') + '-' + new Date().getTime());
  var guestToken = data.guestAccessToken || Utilities.getUuid();
  var now = getNowIso();

  var messageRecord = withScriptLock(function() {
    var msgId = generateNextIdUnlocked('MSG', 'Messages', 'messageId');
    var msg = {
      messageId: msgId,
      conversationId: convId,
      senderId: 'guest_' + convId,
      receiverId: creator.userId,
      bookingId: '',
      projectId: '',
      message: String(data.message).trim(),
      attachmentFileId: '',
      attachmentUrl: '',
      isRead: false,
      createdAt: now,
      isGuest: true,
      guestName: String(data.guestName).trim(),
      guestEmail: String(data.guestEmail).trim().toLowerCase(),
      guestPhone: String(data.guestPhone || '').trim()
    };
    insertRowUnlocked('Messages', msg);
    return msg;
  });

  if (creator.userId) {
    createNotification(
      creator.userId,
      'Guest Inquiry: ' + data.guestName,
      '"' + data.message.substring(0, 80) + '..." (Reply via Studio Messages)',
      'message'
    );
  }

  return {
    conversationId: convId,
    guestAccessToken: guestToken,
    message: stripInternalRow(messageRecord)
  };
}

function getGuestMessages(conversationId, guestAccessToken) {
  if (!conversationId) return [];
  var all = sheetToObjects('Messages');
  var results = [];
  for (var i = 0; i < all.length; i++) {
    var m = all[i];
    if (m.conversationId === conversationId) {
      results.push(stripInternalRow(m));
    }
  }
  return results.sort(function(a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function markMessageRead(messageId, sessionUser) {
  var msg = findRowByField('Messages', 'messageId', messageId);
  if (!msg) throw new Error('NOT_FOUND');
  if (msg.receiverId !== sessionUser.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED');
  }
  updateRowByField('Messages', 'messageId', messageId, { isRead: true });
  return { success: true };
}

/* ============================================================================
 * 16. REVIEWS & RATINGS RECALCULATION
 * ============================================================================
 */

function getCreatorReviews(creatorId) {
  var rows = sheetToObjects('Reviews');
  var users = sheetToObjects('Users');

  var filtered = rows.filter(function(r) { return r.creatorId === creatorId; });

  var list = filtered.map(function(r) {
    var cust = users.find(function(u) { return u.userId === r.customerId; });
    var copy = Object.assign({}, r);
    copy.customerName = cust ? cust.fullName : 'Verified Client';
    copy.customerAvatar = cust ? cust.profileImage : '';
    return stripInternalRow(copy);
  }).sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return list;
}

function submitReview(data, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');

  var booking = findRowByField('Bookings', 'bookingId', data.bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  if (booking.customerId !== sessionUser.userId && !isAdminOrStaff(sessionUser)) {
    throw new Error('UNAUTHORIZED: Only the booking client can submit a review');
  }

  // Only completed bookings can be reviewed
  if (booking.status !== 'completed' && !isAdminOrStaff(sessionUser)) {
    throw new Error('BOOKING_NOT_COMPLETED: Reviews can only be submitted for completed bookings');
  }

  var existing = findRowByField('Reviews', 'bookingId', data.bookingId);
  if (existing) {
    throw new Error('ALREADY_REVIEWED: A review for this booking already exists');
  }

  var reviewId = generateNextId('REV', 'Reviews', 'reviewId');
  var now = getNowIso();
  var overall = Number(data.overallRating) || 5;

  var newReview = {
    reviewId: reviewId,
    bookingId: data.bookingId,
    customerId: sessionUser.userId,
    creatorId: booking.creatorId,
    overallRating: overall,
    communicationRating: Number(data.communicationRating) || overall,
    qualityRating: Number(data.qualityRating) || overall,
    professionalismRating: Number(data.professionalismRating) || overall,
    deliveryRating: Number(data.deliveryRating) || overall,
    valueRating: Number(data.valueRating) || overall,
    reviewText: String(data.reviewText || '').trim(),
    createdAt: now
  };

  insertRow('Reviews', newReview);
  recalculateCreatorRating(booking.creatorId);

  // Send notification to creator.userId
  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (creator && creator.userId) {
    createNotification(
      creator.userId,
      'New Review Received ⭐',
      (sessionUser.fullName || 'Client') + ' submitted a review for ' + booking.projectTitle,
      'review'
    );
  }

  return stripInternalRow(newReview);
}

function recalculateCreatorRating(creatorId) {
  var reviews = sheetToObjects('Reviews').filter(function(r) { return r.creatorId === creatorId; });
  if (reviews.length === 0) {
    updateRowByField('Creators', 'creatorId', creatorId, {
      rating: 0,
      reviewCount: 0,
      updatedAt: getNowIso()
    });
    return;
  }

  var total = 0;
  for (var i = 0; i < reviews.length; i++) {
    total += Number(reviews[i].overallRating) || 5;
  }
  var avg = Math.round((total / reviews.length) * 100) / 100;

  updateRowByField('Creators', 'creatorId', creatorId, {
    rating: avg,
    reviewCount: reviews.length,
    updatedAt: getNowIso()
  });
}

/* ============================================================================
 * 17. PAYMENTS & VERIFICATION SECURITY
 * ============================================================================
 */

/**
 * Customer action: Submits a payment reference for admin/staff verification.
 * Does NOT auto-confirm the booking.
 */
function submitPaymentReference(data, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  if (!data.bookingId || !data.transactionId) {
    throw new Error('MISSING_FIELDS: bookingId and transactionId are required');
  }

  var booking = findRowByField('Bookings', 'bookingId', data.bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  var isCustomer = booking.customerId === sessionUser.userId;
  var isAdmin = isAdminOrStaff(sessionUser);
  if (!isCustomer && !isAdmin) throw new Error('UNAUTHORIZED');

  var paymentRecord = withScriptLock(function() {
    var paymentId = generateNextIdUnlocked('PAY', 'Payments', 'paymentId');
    var now = getNowIso();

    var payment = {
      paymentId: paymentId,
      bookingId: data.bookingId,
      customerId: booking.customerId,
      creatorId: booking.creatorId,
      amount: Number(data.amount) || booking.budget,
      paymentMethod: data.paymentMethod || 'bKash / Nagad / Bank',
      transactionId: String(data.transactionId).trim(),
      status: 'pending_verification',
      verifiedBy: '',
      verifiedAt: '',
      notes: String(data.notes || 'Submitted by client, awaiting verification').trim(),
      createdAt: now,
      updatedAt: now
    };

    insertRowUnlocked('Payments', payment);

    updateRowByFieldUnlocked('Bookings', 'bookingId', data.bookingId, {
      paymentStatus: 'pending_verification',
      updatedAt: now
    });

    return payment;
  });

  // Notify creator and client outside the lock
  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  if (creator && creator.userId) {
    createNotification(
      creator.userId,
      'Payment Submitted: ' + booking.projectTitle,
      'Client submitted payment reference ' + data.transactionId + '. Verification pending.',
      'payment'
    );
  }

  return stripInternalRow(paymentRecord);
}

/**
 * Admin/Staff action: Verifies payment, marks status verified, and triggers booking confirmation.
 */
function recordPayment(data, sessionUser) {
  if (!sessionUser) throw new Error('UNAUTHORIZED');
  requireAdminOrStaff(sessionUser);

  if (!data.bookingId) throw new Error('MISSING_FIELDS: bookingId is required');

  var booking = findRowByField('Bookings', 'bookingId', data.bookingId);
  if (!booking) throw new Error('NOT_FOUND: Booking not found');

  var creator = findRowByField('Creators', 'creatorId', booking.creatorId);
  var customer = findRowByField('Users', 'userId', booking.customerId);

  // Phase 1: Record verified payment and confirm booking state under lock
  var paymentResult = withScriptLock(function() {
    var paymentId = generateNextIdUnlocked('PAY', 'Payments', 'paymentId');
    var now = getNowIso();

    var payment = {
      paymentId: paymentId,
      bookingId: data.bookingId,
      customerId: booking.customerId,
      creatorId: booking.creatorId,
      amount: Number(data.amount) || booking.budget,
      paymentMethod: data.paymentMethod || 'Manual / Escrow Verification',
      transactionId: data.transactionId || ('TX-' + Utilities.getUuid().substring(0, 8).toUpperCase()),
      status: 'verified',
      verifiedBy: sessionUser.userId,
      verifiedAt: now,
      notes: String(data.notes || 'Verified by admin staff').trim(),
      createdAt: now,
      updatedAt: now
    };

    insertRowUnlocked('Payments', payment);

    var newPaymentStatus = data.isFullPayment ? 'fully_paid' : 'deposit_paid';
    updateRowByFieldUnlocked('Bookings', 'bookingId', data.bookingId, {
      paymentStatus: newPaymentStatus,
      status: 'confirmed',
      updatedAt: now
    });

    // Mark availability booked
    var avlSlots = sheetToObjects('Availability').filter(function(a) {
      return a.bookingId === data.bookingId;
    });
    if (avlSlots.length > 0) {
      updateRowByFieldUnlocked('Availability', 'availabilityId', avlSlots[0].availabilityId, {
        status: 'booked',
        notes: 'Confirmed: ' + booking.projectTitle,
        updatedAt: now
      });
    }

    // Ensure Projects row exists
    var existingProject = findRowByField('Projects', 'bookingId', data.bookingId);
    if (!existingProject) {
      var projectId = generateNextIdUnlocked('PRJ', 'Projects', 'projectId');
      insertRowUnlocked('Projects', {
        projectId: projectId,
        bookingId: data.bookingId,
        customerId: booking.customerId,
        creatorId: booking.creatorId,
        title: booking.projectTitle,
        status: 'active',
        driveFolderId: booking.driveProjectFolderId || '',
        startDate: booking.eventDate,
        deliveryDate: '',
        notes: 'Project initialized on payment verification',
        createdAt: now,
        updatedAt: now
      });
    }

    return payment;
  });

  // Phase 2: Calendar sync and notifications OUTSIDE lock
  var currentBooking = findRowByField('Bookings', 'bookingId', data.bookingId);
  var calendarEventId = currentBooking.calendarEventId;
  if (!calendarEventId || calendarEventId.indexOf('CAL-') === 0) {
    calendarEventId = createBookingCalendarEvent(currentBooking, creator || {}, customer || {});
    if (calendarEventId) {
      updateRowByField('Bookings', 'bookingId', data.bookingId, {
        calendarEventId: calendarEventId
      });
    }
  }

  createNotification(
    booking.customerId,
    'Payment Verified! 🎉',
    'Your payment for "' + booking.projectTitle + '" has been verified and your booking is confirmed.',
    'payment'
  );

  if (creator && creator.userId) {
    createNotification(
      creator.userId,
      'Booking Payment Verified: ' + booking.projectTitle,
      'Payment verified by staff. Production schedule confirmed for ' + booking.eventDate,
      'payment'
    );
  }

  return stripInternalRow(paymentResult);
}

function adminRejectPayment(paymentId, notes, sessionUser) {
  requireAdminOrStaff(sessionUser);
  var payment = findRowByField('Payments', 'paymentId', paymentId);
  if (!payment) throw new Error('NOT_FOUND');

  var now = getNowIso();
  updateRowByField('Payments', 'paymentId', paymentId, {
    status: 'rejected',
    verifiedBy: sessionUser.userId,
    verifiedAt: now,
    notes: notes || 'Payment rejected by staff',
    updatedAt: now
  });

  updateRowByField('Bookings', 'bookingId', payment.bookingId, {
    paymentStatus: 'unpaid',
    updatedAt: now
  });

  createNotification(
    payment.customerId,
    'Payment Reference Issue',
    'Payment submission ' + payment.transactionId + ' could not be verified: ' + (notes || 'Contact support'),
    'payment'
  );

  return stripInternalRow(findRowByField('Payments', 'paymentId', paymentId));
}

/* ============================================================================
 * 18. ADMIN & STAFF CONTROL APIS (PROTECTED)
 * ============================================================================
 */

function adminGetDashboard(sessionUser) {
  requireAdminOrStaff(sessionUser);
  var users = sheetToObjects('Users').map(sanitizeUser);
  var creators = sheetToObjects('Creators').map(sanitizePublicCreator);
  var bookings = sheetToObjects('Bookings');
  var reviews = sheetToObjects('Reviews');
  var payments = sheetToObjects('Payments');

  var totalRevenue = 0;
  for (var i = 0; i < payments.length; i++) {
    if (payments[i].status === 'verified' || payments[i].status === 'completed') {
      totalRevenue += Number(payments[i].amount) || 0;
    }
  }

  return {
    totalUsers: users.length,
    totalCreators: creators.length,
    totalBookings: bookings.length,
    totalReviews: reviews.length,
    totalRevenue: totalRevenue,
    currency: 'BDT',
    currencySymbol: '৳',
    recentBookings: stripInternalRows(bookings.slice(-5).reverse()),
    recentPayments: stripInternalRows(payments.slice(-5).reverse())
  };
}

function adminGetCreators(sessionUser) {
  requireAdminOrStaff(sessionUser);
  return sheetToObjects('Creators').map(sanitizePublicCreator);
}

function adminGetCreator(creatorId, sessionUser) {
  requireAdminOrStaff(sessionUser);
  var c = findRowByField('Creators', 'creatorId', creatorId);
  if (!c) throw new Error('NOT_FOUND');
  var u = findRowByField('Users', 'userId', c.userId);
  var f = findRowByField('Drive_Folders', 'creatorId', creatorId);
  var p = sheetToObjects('Portfolios').filter(function(x) { return x.creatorId === creatorId; });
  var s = sheetToObjects('Services').filter(function(x) { return x.creatorId === creatorId; });
  var b = sheetToObjects('Bookings').filter(function(x) { return x.creatorId === creatorId; });

  return {
    creator: sanitizePublicCreator(c),
    user: sanitizeUser(u),
    driveFolders: stripInternalRow(f),
    portfolioCount: p.length,
    serviceCount: s.length,
    bookingCount: b.length
  };
}

function adminVerifyCreator(creatorId, verified, sessionUser) {
  requireAdminOrStaff(sessionUser);
  var c = findRowByField('Creators', 'creatorId', creatorId);
  if (!c) throw new Error('NOT_FOUND');

  updateRowByField('Creators', 'creatorId', creatorId, {
    verified: verified === true,
    updatedAt: getNowIso()
  });

  createNotification(
    c.userId,
    verified ? 'Creator Verification Approved! 🏅' : 'Creator Verification Status Updated',
    verified ? 'Congratulations, your profile is now verified with the official badge.' : 'Your profile verification status was changed.',
    'system'
  );

  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function adminSetFeaturedCreator(creatorId, featured, sessionUser) {
  requireAdminOrStaff(sessionUser);
  var c = findRowByField('Creators', 'creatorId', creatorId);
  if (!c) throw new Error('NOT_FOUND: Creator does not exist');

  var isFeatured = featured === true;
  var now = getNowIso();

  updateRowByField('Creators', 'creatorId', creatorId, {
    featured: isFeatured,
    updatedAt: now,
    featuredBy: isFeatured ? sessionUser.userId : '',
    featuredAt: isFeatured ? now : ''
  });

  if (isFeatured) {
    createNotification(
      c.userId,
      'You’re Featured!',
      'Your profile has been selected by SpotlightPhotography to appear in Featured Freelancers.',
      'system'
    );
  }

  var updated = findRowByField('Creators', 'creatorId', creatorId);
  return sanitizePublicCreator(updated);
}

function adminSuspendCreator(creatorId, suspend, sessionUser) {
  requireAdminOrStaff(sessionUser);
  var c = findRowByField('Creators', 'creatorId', creatorId);
  if (!c) throw new Error('NOT_FOUND');

  var newStatus = suspend ? 'suspended' : 'active';
  updateRowByField('Users', 'userId', c.userId, { status: newStatus });

  return { success: true, creatorId: creatorId, status: newStatus };
}

function adminGetBookings(sessionUser) {
  requireAdminOrStaff(sessionUser);
  var list = sheetToObjects('Bookings').sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return stripInternalRows(list);
}

function adminGetReviews(sessionUser) {
  requireAdminOrStaff(sessionUser);
  var list = sheetToObjects('Reviews').sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return stripInternalRows(list);
}

function adminGetPayments(sessionUser) {
  requireAdminOrStaff(sessionUser);
  var list = sheetToObjects('Payments').sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return stripInternalRows(list);
}

function adminGetReports(sessionUser) {
  requireAdminOrStaff(sessionUser);
  return {
    systemHealth: 'Optimal',
    currency: 'BDT',
    counts: {
      users: sheetToObjects('Users').length,
      creators: sheetToObjects('Creators').length,
      bookings: sheetToObjects('Bookings').length,
      portfolios: sheetToObjects('Portfolios').length,
      projects: sheetToObjects('Projects').length,
      messages: sheetToObjects('Messages').length,
      payments: sheetToObjects('Payments').length
    }
  };
}

function adminGetStorageUsage(sessionUser) {
  requireAdminOrStaff(sessionUser);
  var folders = sheetToObjects('Drive_Folders');
  return {
    totalCreatorsWithFolders: folders.length,
    rootFolderConfigured: !!getConfigProperty(CONFIG_KEYS.ROOT_DRIVE_FOLDER_ID)
  };
}

/* ============================================================================
 * 19. HTTP ROUTER (doGet & doPost)
 * ============================================================================
 */

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'ping';
    var token = params.token || '';

    // Minimal clean ping response
    if (action === 'ping') {
      return createSuccessResponse({
        status: 'online',
        serverTime: getNowIso()
      }, 'API operational');
    }

    // Public Directory endpoints
    if (action === 'getCreators') {
      return createSuccessResponse(getCreators(params));
    }

    if (action === 'getCreatorByUsername') {
      var p = getCreatorByUsername(params.username);
      return p ? createSuccessResponse(p) : createErrorResponse('NOT_FOUND', 'Creator not found');
    }

    if (action === 'getCreatorProfile') {
      if (params.username) {
        var prof = getCreatorByUsername(params.username);
        return prof ? createSuccessResponse(prof) : createErrorResponse('NOT_FOUND', 'Creator not found');
      }
      var c = getCreatorProfile(params.creatorId);
      return c ? createSuccessResponse(c) : createErrorResponse('NOT_FOUND', 'Creator not found');
    }

    if (action === 'checkUsername') {
      return createSuccessResponse(checkUsername(params.username));
    }

    if (action === 'getCreatorPortfolio') {
      return createSuccessResponse(getCreatorPortfolio(params.creatorId));
    }

    if (action === 'getCreatorServices') {
      return createSuccessResponse(getCreatorServices(params.creatorId));
    }

    if (action === 'getCreatorPackages') {
      return createSuccessResponse(getCreatorPackages(params.creatorId, params.serviceId));
    }

    if (action === 'getAvailability') {
      return createSuccessResponse(getAvailability(params.creatorId, params.startDate, params.endDate));
    }

    if (action === 'getCreatorReviews') {
      return createSuccessResponse(getCreatorReviews(params.creatorId));
    }

    if (action === 'getGuestMessages') {
      return createSuccessResponse(getGuestMessages(params.conversationId, params.guestAccessToken));
    }

    // Authenticated GET actions (also supported via POST body for token privacy)
    var sessionUser = validateSession(token);

    if (action === 'validateSession') {
      if (!sessionUser) return createErrorResponse('SESSION_EXPIRED', 'Invalid session');
      var crt = sessionUser.accountType === 'creator' ? findRowByField('Creators', 'userId', sessionUser.userId) : null;
      return createSuccessResponse({ user: sanitizeUser(sessionUser), creator: sanitizePublicCreator(crt) });
    }

    if (action === 'getBookings') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getBookings(sessionUser));
    }

    if (action === 'getProjects') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getProjects(sessionUser));
    }

    if (action === 'getProjectById') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getProjectById(params.projectId, sessionUser));
    }

    if (action === 'getConversations') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getConversations(sessionUser));
    }

    if (action === 'getMessages') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getMessages(params.conversationId, sessionUser));
    }

    if (action === 'getNotifications') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getNotifications(sessionUser));
    }

    // Admin / Staff GET actions
    if (action === 'getAccountDeletionStatus') {
      if (!sessionUser) return createErrorResponse('UNAUTHORIZED', 'Session required');
      return createSuccessResponse(getAccountDeletionStatus(sessionUser));
    }
    if (action === 'adminGetDeletionRecords') return createSuccessResponse(adminGetDeletionRecords(sessionUser));
    if (action === 'adminGetDashboard') return createSuccessResponse(adminGetDashboard(sessionUser));
    if (action === 'adminGetCreators') return createSuccessResponse(adminGetCreators(sessionUser));
    if (action === 'adminGetCreator') return createSuccessResponse(adminGetCreator(params.creatorId, sessionUser));
    if (action === 'adminGetBookings') return createSuccessResponse(adminGetBookings(sessionUser));
    if (action === 'adminGetReviews') return createSuccessResponse(adminGetReviews(sessionUser));
    if (action === 'adminGetPayments') return createSuccessResponse(adminGetPayments(sessionUser));
    if (action === 'adminGetReports') return createSuccessResponse(adminGetReports(sessionUser));
    if (action === 'adminGetStorageUsage') return createSuccessResponse(adminGetStorageUsage(sessionUser));

    return createErrorResponse('UNKNOWN_ACTION', 'Action not recognized');
  } catch (err) {
    return createErrorResponse('SERVER_ERROR', err.message || 'Server error occurred');
  }
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (parseErr) {
      return createErrorResponse('INVALID_JSON', 'Request payload must be valid JSON');
    }

    var action = payload.action;
    var data = payload.data || {};
    var token = payload.token || '';

    // Public Registration / Login
    if (action === 'registerCustomer') {
      return createSuccessResponse(registerCustomer(data), 'Customer registered');
    }

    if (action === 'registerCreator') {
      return createSuccessResponse(registerCreator(data), 'Creator registered');
    }

    if (action === 'login') {
      return createSuccessResponse(login(data.email, data.password), 'Login successful');
    }

    if (action === 'logout') {
      return createSuccessResponse(logout(token), 'Logged out');
    }

    // Public Guest Inquiries (Does NOT require user account or session token)
    if (action === 'sendGuestInquiry') {
      return createSuccessResponse(sendGuestInquiry(data), 'Inquiry sent');
    }

    if (action === 'getGuestMessages') {
      return createSuccessResponse(getGuestMessages(data.conversationId, data.guestAccessToken));
    }

    // Authenticated endpoints require valid session
    var sessionUser = validateSession(token);
    if (!sessionUser) {
      return createErrorResponse('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }

    // Secure Authenticated Data Queries via POST (Keeps token out of URL query parameters)
    if (action === 'validateSession') {
      var crt = sessionUser.accountType === 'creator' ? findRowByField('Creators', 'userId', sessionUser.userId) : null;
      return createSuccessResponse({ user: sanitizeUser(sessionUser), creator: sanitizePublicCreator(crt) });
    }

    if (action === 'getBookings') return createSuccessResponse(getBookings(sessionUser));
    if (action === 'getProjects') return createSuccessResponse(getProjects(sessionUser));
    if (action === 'getProjectById') {
      var pId = data.projectId || payload.projectId;
      return createSuccessResponse(getProjectById(pId, sessionUser));
    }
    if (action === 'getConversations') return createSuccessResponse(getConversations(sessionUser));
    if (action === 'getMessages') {
      var cId = data.conversationId || payload.conversationId;
      return createSuccessResponse(getMessages(cId, sessionUser));
    }
    if (action === 'getNotifications') return createSuccessResponse(getNotifications(sessionUser));

    // Creator Profile
    if (action === 'updateCreatorProfile') {
      return createSuccessResponse(updateCreatorProfile(data.creatorId, data, sessionUser));
    }

    // Portfolio
    if (action === 'createPortfolioItem') return createSuccessResponse(createPortfolioItem(data.creatorId, data, sessionUser));
    if (action === 'updatePortfolioItem') return createSuccessResponse(updatePortfolioItem(data.portfolioId, data, sessionUser));
    if (action === 'deletePortfolioItem') return createSuccessResponse(deletePortfolioItem(data.portfolioId, sessionUser));
    if (action === 'reorderPortfolio') return createSuccessResponse(reorderPortfolio(data.creatorId, data.orderedIds, sessionUser));
    if (action === 'setFeaturedPortfolio') return createSuccessResponse(setFeaturedPortfolio(data.portfolioId, data.featured, sessionUser));

    // Services
    if (action === 'createService') return createSuccessResponse(createService(data.creatorId, data, sessionUser));
    if (action === 'updateService') return createSuccessResponse(updateService(data.serviceId, data, sessionUser));
    if (action === 'deleteService') return createSuccessResponse(deleteService(data.serviceId, sessionUser));

    // Packages
    if (action === 'createPackage') return createSuccessResponse(createPackage(data.creatorId, data, sessionUser));
    if (action === 'updatePackage') return createSuccessResponse(updatePackage(data.packageId, data, sessionUser));
    if (action === 'disablePackage') return createSuccessResponse(disablePackage(data.packageId, sessionUser));
    if (action === 'deletePackage') return createSuccessResponse(deletePackage(data.packageId, sessionUser));

    // Availability
    if (action === 'setAvailability') return createSuccessResponse(setAvailability(data.creatorId, data.date, data.startTime, data.endTime, data.status, sessionUser));
    if (action === 'blockDate') return createSuccessResponse(blockDate(data.creatorId, data.date, data.notes, sessionUser));
    if (action === 'unblockDate') return createSuccessResponse(unblockDate(data.creatorId, data.date, sessionUser));

    // Bookings
    if (action === 'createBooking') return createSuccessResponse(createBooking(data, sessionUser));
    if (action === 'acceptBooking') return createSuccessResponse(acceptBooking(data.bookingId, sessionUser));
    if (action === 'confirmBooking') return createSuccessResponse(confirmBooking(data.bookingId, sessionUser));
    if (action === 'declineBooking') return createSuccessResponse(declineBooking(data.bookingId, data.reason, sessionUser));
    if (action === 'rescheduleBooking') return createSuccessResponse(rescheduleBooking(data.bookingId, data, sessionUser));
    if (action === 'cancelBooking') return createSuccessResponse(cancelBooking(data.bookingId, data.reason, sessionUser));
    if (action === 'archiveBooking') return createSuccessResponse(archiveBooking(data.bookingId, sessionUser));
    if (action === 'restoreBooking') return createSuccessResponse(restoreBooking(data.bookingId, sessionUser));
    if (action === 'deleteBooking') return createSuccessResponse(deleteBooking(data.bookingId, sessionUser));

    // Calendar Synchronization (Per-Freelancer)
    if (action === 'connectGoogleCalendar') return createSuccessResponse(connectGoogleCalendar(data.creatorId, data, sessionUser));
    if (action === 'disconnectGoogleCalendar') return createSuccessResponse(disconnectGoogleCalendar(data.creatorId, sessionUser));
    if (action === 'syncGoogleCalendarNow') return createSuccessResponse(syncGoogleCalendarNow(data.creatorId, sessionUser));
    if (action === 'retryCalendarSync') return createSuccessResponse(retryCalendarSync(data.bookingId, sessionUser));

    // Account Lifecycle & 30-Day Deletion
    if (action === 'requestAccountDeletion') return createSuccessResponse(requestAccountDeletion(data, sessionUser));
    if (action === 'cancelAccountDeletion') return createSuccessResponse(cancelAccountDeletion(sessionUser));
    if (action === 'getAccountDeletionStatus') return createSuccessResponse(getAccountDeletionStatus(sessionUser));
    if (action === 'processScheduledDeletions') return createSuccessResponse(processScheduledDeletions());
    if (action === 'createDailyDeletionTrigger') return createSuccessResponse(createDailyDeletionTrigger());
    if (action === 'adminGetDeletionRecords') return createSuccessResponse(adminGetDeletionRecords(sessionUser));

    // Photo Management (Facebook-style)
    if (action === 'updateProfilePhoto') return createSuccessResponse(updateProfilePhoto(data.creatorId, data, sessionUser));
    if (action === 'removeProfilePhoto') return createSuccessResponse(removeProfilePhoto(data.creatorId, sessionUser));
    if (action === 'updateCoverPhoto') return createSuccessResponse(updateCoverPhoto(data.creatorId, data, sessionUser));
    if (action === 'removeCoverPhoto') return createSuccessResponse(removeCoverPhoto(data.creatorId, sessionUser));

    // Projects
    if (action === 'updateProjectStatus') {
      return createSuccessResponse(updateProjectStatus(data.projectId, data.status, data.notes, data.deliveryDate, sessionUser));
    }

    // Messaging & Conversations
    if (action === 'sendMessage') return createSuccessResponse(sendMessage(data, sessionUser));
    if (action === 'markMessageRead') return createSuccessResponse(markMessageRead(data.messageId, sessionUser));
    if (action === 'deleteConversation') return createSuccessResponse(deleteConversation(data.conversationId, sessionUser));
    if (action === 'archiveConversation') return createSuccessResponse(archiveConversation(data.conversationId, sessionUser));
    if (action === 'deleteMessage') return createSuccessResponse(deleteMessage(data.messageId, sessionUser));

    // Reviews
    if (action === 'submitReview') return createSuccessResponse(submitReview(data, sessionUser));

    // Payments
    if (action === 'submitPaymentReference') return createSuccessResponse(submitPaymentReference(data, sessionUser));
    if (action === 'recordPayment') return createSuccessResponse(recordPayment(data, sessionUser));
    if (action === 'adminRejectPayment') return createSuccessResponse(adminRejectPayment(data.paymentId, data.notes, sessionUser));

    // Drive File Upload
    if (action === 'uploadBase64File') {
      return createSuccessResponse(uploadBase64File(data, sessionUser));
    }

    // Notifications
    if (action === 'markNotificationRead') return createSuccessResponse(markNotificationRead(data.notificationId, sessionUser));
    if (action === 'markAllNotificationsRead') return createSuccessResponse(markAllNotificationsRead(sessionUser));

    // Admin / Staff Actions
    if (action === 'adminGetDashboard') return createSuccessResponse(adminGetDashboard(sessionUser));
    if (action === 'adminGetCreators') return createSuccessResponse(adminGetCreators(sessionUser));
    if (action === 'adminGetCreator') {
      var cId = data.creatorId || payload.creatorId;
      return createSuccessResponse(adminGetCreator(cId, sessionUser));
    }
    if (action === 'adminGetBookings') return createSuccessResponse(adminGetBookings(sessionUser));
    if (action === 'adminGetReviews') return createSuccessResponse(adminGetReviews(sessionUser));
    if (action === 'adminGetPayments') return createSuccessResponse(adminGetPayments(sessionUser));
    if (action === 'adminGetReports') return createSuccessResponse(adminGetReports(sessionUser));
    if (action === 'adminGetStorageUsage') return createSuccessResponse(adminGetStorageUsage(sessionUser));
    if (action === 'adminVerifyCreator') return createSuccessResponse(adminVerifyCreator(data.creatorId, data.verified, sessionUser));
    if (action === 'adminSetFeaturedCreator') return createSuccessResponse(adminSetFeaturedCreator(data.creatorId, data.featured, sessionUser));
    if (action === 'adminSuspendCreator') return createSuccessResponse(adminSuspendCreator(data.creatorId, data.suspend, sessionUser));

    return createErrorResponse('UNKNOWN_ACTION', 'Action not recognized');
  } catch (err) {
    return createErrorResponse('SERVER_ERROR', err.message || 'Server error occurred');
  }
}

/* ============================================================================
 * 20. MANUAL SETUP & DIAGNOSTIC HELPERS
 * ============================================================================
 */

/**
 * Run manually from the Apps Script editor to initialize the database,
 * generate secure session keys, save spreadsheet ID, and configure master Drive hierarchy.
 */
function runManualSetup() {
  Logger.log('Starting CreatorFlow manual setup...');
  var props = PropertiesService.getScriptProperties();

  // 1. Session Secret Initialization (cryptographically unpredictable random key)
  var existingSecret = props.getProperty(CONFIG_KEYS.SESSION_SECRET);
  if (!existingSecret || existingSecret === 'creatorflow_secret_salt_key_2026') {
    var randomSeed = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + new Date().getTime();
    var secret = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, randomSeed));
    props.setProperty(CONFIG_KEYS.SESSION_SECRET, secret);
    Logger.log('Generated and stored cryptographically secure SESSION_SECRET in Script Properties');
  } else {
    Logger.log('Retained existing SESSION_SECRET');
  }

  // 2. Active Spreadsheet ID Storage
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      props.setProperty(CONFIG_KEYS.SPREADSHEET_ID, activeSs.getId());
      Logger.log('Stored active SPREADSHEET_ID in Script Properties: ' + activeSs.getId());
    }
  } catch (sheetErr) {
    Logger.log('Notice saving spreadsheet ID: ' + sheetErr.toString());
  }

  // 3. Database Sheets Setup (Idempotent)
  var dbResult = setupDatabase();
  Logger.log('Sheets initialized: ' + JSON.stringify(dbResult));

  // 4. Master Google Drive Hierarchy Setup
  try {
    var master = ensureMasterDriveStructure();
    Logger.log('Master Google Drive folder configured with ID: ' + master.getId());
  } catch (driveErr) {
    Logger.log('Drive folder setup notice: ' + driveErr.toString());
  }

  Logger.log('CreatorFlow manual setup completed successfully!');
}

/**
 * Run manually to inspect system properties and folder configurations.
 * NEVER prints sensitive SESSION_SECRET or user credentials.
 */
function printSystemStatus() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var sanitizedProps = {};
  for (var k in props) {
    if (k === CONFIG_KEYS.SESSION_SECRET) {
      sanitizedProps[k] = '[REDACTED_SECURE_SECRET]';
    } else {
      sanitizedProps[k] = props[k];
    }
  }
  Logger.log('System Script Properties: ' + JSON.stringify(sanitizedProps, null, 2));

  var ss = getDatabaseSpreadsheet();
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  Logger.log('Sheets in active database: ' + sheets.join(', '));
}
