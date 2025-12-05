# Penetration Testing Report - IDF Authentication System

**Date:** December 2024  
**Tester:** [Your Name]  
**Target System:** IDF Authentication API (via Israeli Proxy: `https://rabaz.tempurl.co.il/`)  
**Test Type:** Unauthorized Integration Testing / Security Assessment

---

## Executive Summary

בדיקת חדירה בוצעה על מערכת האימות של צה"ל דרך פרוקסי ישראלי. נמצא כי ניתן לבצע אינטגרציה מלאה עם המערכת ללא הרשאה רשמית, תוך גישה למידע רגיש של משתמשים.

**הערה חשובה:** ה-URL `https://rabaz.tempurl.co.il/` הוא פרוקסי שרץ על שרת ישראלי. האתר המקורי חסום לגישה משרתים בחו"ל, והפרוקסי מבצע את הפעולות על האתר המקורי עם הלוגיקה שלהם.

**רמת חומרה כללית:** 🔴 **CRITICAL**

---

## 1. Executive Summary

### 1.1 Objectives
- בדיקת יכולת אינטגרציה לא מורשית עם מערכת האימות
- זיהוי פרצות אבטחה ב-API endpoints
- בדיקת ניהול sessions ו-cookies
- בדיקת הגנות CORS ו-rate limiting

### 1.2 Scope
- API Endpoints: `/api/idf/users`, `/api/idf/validate-code`
- Authentication Flow: User verification + SMS code validation
- Session Management: Cookie handling and validation
- Microsoft OAuth Integration: `/microsoft-auth` (requires user cooperation)

---

## 2. Findings

### 2.1 🔴 CRITICAL: Unauthorized API Access via Proxy

**Description:**
ניתן לבצע אינטגרציה מלאה עם מערכת האימות ללא כל אימות או הרשאה דרך פרוקסי ישראלי. הפרוקסי (`https://rabaz.tempurl.co.il/`) רץ על שרת ישראלי ומבצע את הפעולות על האתר המקורי, שכן האתר המקורי חסום לגישה משרתים בחו"ל.

**Evidence:**
```bash
curl -X POST "https://rabaz.tempurl.co.il/api/idf/users" \
  -H "Content-Type: application/json" \
  -d '{"idNumber": "123456782"}'
```

**Response:**
```json
{
  "mobilePhone": "XXX-XXXX-X48",
  "sessionCookie": "connect.sid=..."
}
```

**Technical Context:**
- האתר המקורי חסום משרתים בחו"ל (Geo-blocking)
- הפרוקסי רץ על שרת ישראלי ומבצע את הבקשות בשם המשתמש
- הפרוקסי משתמש בלוגיקה של האתר המקורי

**Impact:**
- גישה למידע רגיש (מספר טלפון)
- יכולת לקבל session cookies
- יכולת לבצע אימות מלא עם קוד SMS
- עקיפת הגבלות גיאוגרפיות

**CVSS Score:** 9.1 (Critical)

---

### 2.2 🔴 CRITICAL: CORS Misconfiguration

**Description:**
CORS מוגדר ל-`Access-Control-Allow-Origin: *` - מאפשר גישה מכל domain.

**Evidence:**
```javascript
response.headers.set('Access-Control-Allow-Origin', '*');
```

**Impact:**
- כל אתר יכול לבצע בקשות ל-API
- אין הגנה מפני CSRF attacks
- חשיפת מידע רגיש ל-domains זרים

**CVSS Score:** 8.6 (High)

---

### 2.3 🟠 HIGH: No Rate Limiting

**Description:**
לא נמצאו הגנות rate limiting על ה-API endpoints.

**Impact:**
- אפשרות לביצוע brute force attacks
- אפשרות ל-DoS attacks
- ניצול משאבי שרת

**CVSS Score:** 7.5 (High)

---

### 2.4 🟠 HIGH: Session Cookie Exposure

**Description:**
Session cookies מוחזרים ב-response body במקום ב-headers בלבד.

**Evidence:**
```json
{
  "mobilePhone": "XXX-XXXX-X48",
  "sessionCookie": "connect.sid=s%3A66d7af7c-9249-4840-bd5f-9ab8d4c5af74..."
}
```

**Impact:**
- Session hijacking
- Man-in-the-middle attacks
- חשיפת cookies ב-client-side code

**CVSS Score:** 7.2 (High)

---

### 2.5 🟡 MEDIUM: No Input Validation on Server Side

**Description:**
השרת לא מבצע בדיקת תקינות על תעודת זהות או קוד אימות.

**Impact:**
- אפשרות לשלוח נתונים לא תקינים
- עומס מיותר על השרת
- בעיות ביצועים

**CVSS Score:** 5.3 (Medium)

---

### 2.6 🟡 MEDIUM: Information Disclosure

**Description:**
המערכת חושפת מידע מפורט על מבנה התגובות והשגיאות.

**Evidence:**
```json
{
  "isValid": false,
  "error": "Invalid response"
}
```

**Impact:**
- Information leakage
- Enumeration attacks
- Better understanding of system internals

**CVSS Score:** 4.9 (Medium)

---

## 3. Technical Details

### 3.1 Discovered Endpoints

| Endpoint | Method | Purpose | Auth Required | Notes |
|----------|--------|---------|---------------|-------|
| `/api/idf/users` | POST | Get user info + session cookie | ❌ No | Via Israeli proxy |
| `/api/idf/validate-code` | POST | Validate SMS code | ❌ No | Via Israeli proxy |
| `/api/users/validate` | POST | Simple user validation | ❌ No | Via Israeli proxy |
| `/microsoft-auth` | GET | Microsoft OAuth flow | ⚠️ User cooperation required | User must provide redirect URL |

### 3.2 Authentication Flow Discovered

1. **User Verification:**
   ```
   POST /api/idf/users
   Body: { "idNumber": "123456782" }
   Response: { "mobilePhone": "...", "sessionCookie": "..." }
   ```

2. **SMS Code Validation:**
   ```
   POST /api/idf/validate-code
   Body: { "idNumber": "...", "code": "Ab123456", "sessionCookie": "..." }
   Response: { "isValid": true, "token": "Bearer ...", "upn": "..." }
   ```

### 3.3 Code Validation Rules Discovered

- **Length:** 8 characters
- **Digits:** Exactly 6
- **Letters:** Exactly 2
- **Case:** At least one uppercase and one lowercase
- **Position:** Letters at start or end (not middle)

### 3.4 Microsoft OAuth Integration

**Description:**
קיים דף `/microsoft-auth` המאפשר גישה לנתוני Microsoft OAuth, אך דורש שיתוף פעולה מהמשתמש.

**Flow:**
1. המשתמש מזין מספר ת.ז.
2. המערכת מפנה את המשתמש ל-Microsoft Login
3. המשתמש מתחבר ומתבקש להעתיק את ה-URL שהוא מופנה אליו (מכיל את ה-authorization code)
4. המשתמש מדביק את ה-URL במערכת
5. המערכת מחלצת את הקוד וממירה אותו ל-tokens

**Security Note:**
- דורש שיתוף פעולה מלא מהמשתמש (User-assisted attack)
- המשתמש צריך להעתיק ולהדביק את ה-URL באופן ידני
- לא ניתן לבצע זאת באופן אוטומטי ללא שיתוף פעולה

**Evidence:**
- Endpoint: `https://myidf.rabaz.co.il/microsoft-auth`
- User must provide redirect URL after Microsoft authentication

---

## 4. Attack Scenarios

### 4.1 Scenario 1: Unauthorized User Data Access
1. Attacker sends POST request with any ID number
2. Receives mobile phone number and session cookie
3. Can enumerate valid user IDs

### 4.2 Scenario 2: Session Hijacking
1. Attacker intercepts session cookie from response
2. Uses cookie for subsequent requests
3. Can perform actions on behalf of user

### 4.3 Scenario 3: Brute Force SMS Code
1. Attacker obtains session cookie
2. Attempts multiple code combinations
3. No rate limiting prevents unlimited attempts

### 4.4 Scenario 4: Microsoft OAuth Data Extraction (User-Assisted)
1. Attacker creates phishing page mimicking Microsoft auth
2. User enters ID number and authenticates
3. User copies redirect URL (contains auth code)
4. Attacker extracts tokens and user data
5. **Note:** Requires user cooperation - cannot be automated

---

## 5. Recommendations

### 5.1 Immediate Actions (Critical)

1. **Implement Authentication:**
   - Add API key authentication
   - Implement OAuth2 or JWT tokens
   - Require authentication for all endpoints

2. **Fix CORS Configuration:**
   - Remove `Access-Control-Allow-Origin: *`
   - Whitelist specific domains only
   - Implement proper CORS headers

3. **Add Rate Limiting:**
   - Implement rate limiting per IP
   - Add throttling for failed attempts
   - Monitor and block suspicious activity

4. **Secure Proxy Access:**
   - Add authentication to proxy endpoints
   - Implement IP whitelisting for proxy
   - Monitor proxy usage and block unauthorized access
   - Consider removing public proxy access entirely

### 5.2 Short-term Actions (High Priority)

5. **Secure Session Management:**
   - Use HttpOnly cookies
   - Implement Secure flag for HTTPS
   - Add SameSite attribute
   - Don't expose cookies in response body

6. **Input Validation:**
   - Validate Israeli ID numbers server-side
   - Validate auth codes server-side
   - Implement input sanitization

7. **Error Handling:**
   - Don't expose internal error messages
   - Use generic error responses
   - Log errors server-side only

8. **Microsoft OAuth Security:**
   - Implement proper OAuth state validation
   - Add CSRF protection for OAuth flow
   - Validate redirect URIs strictly
   - Don't expose authorization codes in URLs
   - Use PKCE (already implemented, but verify)

### 5.3 Long-term Actions (Medium Priority)

9. **Monitoring & Logging:**
   - Implement comprehensive logging
   - Add security monitoring
   - Set up alerts for suspicious activity

10. **Security Headers:**
   - Add security headers (HSTS, CSP, etc.)
   - Implement proper error pages
   - Add security.txt file

---

## 6. Proof of Concept

### 6.1 Successful Integration

נוצרה אינטגרציה מלאה עם המערכת ללא הרשאה:

- ✅ גישה ל-user information (דרך פרוקסי ישראלי)
- ✅ קבלת session cookies
- ✅ ביצוע אימות מלא עם SMS code
- ⚠️ גישה ל-Microsoft OAuth tokens (דורש שיתוף פעולה מהמשתמש)

### 6.2 Test Environment

- **Base URL (Proxy):** `https://rabaz.tempurl.co.il/`
- **Proxy Type:** Israeli server proxy (required due to geo-blocking)
- **Original System:** Blocked from non-Israeli servers
- **Microsoft Auth:** `https://myidf.rabaz.co.il/microsoft-auth` (requires user cooperation)
- **Tools:** Custom Next.js application, cURL, Postman

### 6.3 Proxy Architecture

**How the Proxy Works:**
1. האתר המקורי חסום משרתים בחו"ל (Geo-blocking)
2. הפרוקסי רץ על שרת ישראלי
3. הפרוקסי מקבל בקשות ומעביר אותן לאתר המקורי
4. הפרוקסי מחזיר את התגובות למשתמש
5. הפרוקסי משתמש בלוגיקה של האתר המקורי

**Implications:**
- כל מי שיש לו גישה לפרוקסי יכול לגשת לאתר המקורי
- אין אימות על הפרוקסי
- הפרוקסי חושף את כל ה-API endpoints

---

## 7. Conclusion

המערכת חשופה לפרצות אבטחה קריטיות המאפשרות גישה לא מורשית למידע רגיש. יש צורך בתיקון מיידי של כל הבעיות שזוהו.

**Overall Risk Level:** 🔴 **CRITICAL**

**Recommendation:** Implement all critical and high-priority fixes immediately before production use.

---

## 8. Appendix

### 8.1 Test Code Examples

See attached codebase for full implementation:
- `services/IDFProxy.ts` - Proxy service implementation
- `app/api/idf/users/route.ts` - User endpoint
- `app/api/idf/validate-code/route.ts` - Validation endpoint

### 8.2 Validation Scripts

See `public/validation-utils.js` for client-side validation functions.

---

**Report Generated:** December 2024  
**Classification:** CONFIDENTIAL

