# Google Authentication Setup (Android + Render)

Google login is restricted to existing, approved Resident accounts. Admin and Super Admin accounts must continue to use email and password.

## Required values

- `GOOGLE_ANDROID_CLIENT_ID`: created in Google Cloud for package `com.example.application`. It is registered in Google Cloud and is not used as the backend token audience.
- `GOOGLE_WEB_CLIENT_ID`: created as a Web application OAuth client. Android uses it as the server client ID when requesting an ID token.
- Render `GOOGLE_CLIENT_ID`: set this to the same value as `GOOGLE_WEB_CLIENT_ID`.

Do not configure or ship a Google client secret in the Android application.

## Google Cloud Console

1. Open Google Cloud Console and select or create the project used by Society Management.
2. Configure the Google Auth Platform consent screen and add the required support/contact information.
3. Create an OAuth client of type **Android**:
   - Package name: `com.example.application`
   - Add the debug SHA-1 for local builds.
   - Add the release SHA-1 from the real release keystore before publishing.
4. Create an OAuth client of type **Web application**.
5. Copy the Web Client ID. This is the token audience used by both Android and Render.

## Android configuration

Set the Web Client ID before building. PowerShell example:

```powershell
$env:GOOGLE_WEB_CLIENT_ID="your_web_client_id.apps.googleusercontent.com"
.\gradlew.bat :app:assembleDebug
```

Alternatively, add this to an untracked local `gradle.properties` file:

```properties
GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
```

The Android OAuth Client ID stays in Google Cloud Console. The application preserves its package name and requests a backend-verifiable ID token using the Web Client ID.

## Render configuration

In Render Dashboard, open the backend Web Service, then **Environment** and add:

```text
GOOGLE_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
```

Save the variable and deploy the latest backend commit. The value must exactly match Android's `GOOGLE_WEB_CLIENT_ID`.

## Signing fingerprints

Debug and configured release signing information:

```powershell
cd Application
.\gradlew.bat signingReport
```

For a specific release keystore:

```powershell
keytool -list -v -keystore C:\path\to\release-key.jks -alias your-key-alias
```

Never commit the release keystore or its passwords.

## Backend API

`POST /api/auth/google`

```json
{ "idToken": "google_id_token" }
```

The backend verifies signature, issuer, expiry, and audience with `google-auth-library`. A valid approved Resident receives the same 24-hour application JWT and user/society response used by email/password login. An unknown verified Google email receives `GOOGLE_REGISTRATION_REQUIRED`; no application access is granted at this stage.

`POST /api/auth/google/register`

```json
{
  "idToken": "google_id_token",
  "society_code": "MHLX",
  "flat_id": "101",
  "phone": "9876543210",
  "ownership_type": "Owner"
}
```

This endpoint verifies the Google token again, takes name and email only from Google, validates the active society, available flat, Indian mobile number, and Owner/Tenant value, then creates a `pending` Resident in one database transaction. It never accepts a role or password from Android and never issues an application JWT before Admin approval.

## Verification checklist

1. Existing email/password login still succeeds for Admin and Resident accounts.
2. Existing approved Resident with a matching verified Google email succeeds.
3. Unknown Google email opens the Complete Google Registration screen.
4. A new Google registration is saved as Pending and cannot access society data.
5. The Society Admin can approve the pending Resident using the existing Residents module.
6. After approval, the same Google account signs in successfully.
7. Pending/rejected resident returns HTTP 403 with a clear status message.
8. Admin and Super Admin Google login returns HTTP 403.
9. Cancelled credential selection shows a safe cancellation message.
10. Protected Resident APIs accept the returned application JWT.
