# Android Audit — Society Management System

Date: 2026-07-14

## Existing Android screens

- Splash
- Login
- Resident registration
- Forgot password
- Reset password deep link
- Change password
- Admin dashboard
- Resident dashboard
- Admin residents list/details/form
- Admin flats list/details/form
- Admin staff list/details/form
- Admin maintenance, categories, expenses, payments, disputes and settings sections
- Resident maintenance and payment submission flow
- Admin complaints
- Resident complaints / raise complaint
- Notices
- Admin notifications
- Resident profile
- Admin reports
- Resident reports
- Coming soon fallback screen

## Existing working features

- Kotlin + Jetpack Compose + Material 3 native app.
- No WebView is used.
- Retrofit + OkHttp + Gson networking.
- Hilt dependency injection.
- DataStore-backed session storage.
- JWT attached through `AuthHeaderInterceptor`.
- Session-expiry handling through `SessionExpiryInterceptor`.
- Role-based navigation for admin and resident.
- Pull-to-refresh on dashboards and several list screens.
- Real Railway backend base URL:
  `https://societymanagment-production-e0d3.up.railway.app/`
- Admin modules use real backend routes for users, flats, staff, maintenance, complaints, notices, notifications and reports.
- Resident modules use real backend routes for dashboard, profile, maintenance, complaints, notices and reports.
- Android build output is redirected locally through `local.properties` to avoid OneDrive build-file locking.

## Broken or incomplete features

- UI is functional but not yet fully aligned with the provided polished blue/green mobile design reference.
- Bottom navigation exists conceptually in requirements but the current navigation is mostly screen-by-screen with dashboard quick actions.
- Admin and resident login use the same backend login endpoint; visual role-specific login treatment needs refinement.
- Some backend response structures are not consistent (`success/data` wrapper exists on some routes, raw JSON arrays on others).
- PDF/CSV report export is not backed by Android-safe backend download endpoints.
- Push notifications are not fully functional because Firebase config and backend token registration endpoint are missing.
- Some requested fields are not supported by backend:
  - Complaint image upload
  - Complaint category/priority/assigned staff
  - Notice category/attachment/important flag/edit
  - Staff salary/joining date/status if missing from DB
  - Resident family members/vehicles/emergency contacts as full CRUD

## Missing admin features

- Dedicated More screen for Flats, Complaints, Notices, Staff, Reports, Settings and Logout.
- Full app-wide bottom navigation for admin.
- Complaint image viewing/upload, priority and staff assignment require backend support.
- Notice edit/category/attachment/important flag require backend support.
- Report PDF/CSV backend export endpoints are missing.
- Settings screen is present on the website but not fully implemented natively.

## Missing resident features

- Resident bottom navigation across every resident screen.
- Family members, vehicle details and emergency contacts CRUD endpoints are not confirmed.
- Resident directory exists on backend (`GET /api/resident/members`) but privacy and UI need careful finalization.
- Complaint image upload/category/priority requires backend support.
- Receipt download/share requires backend-generated or stored receipt endpoint.

## Existing backend endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PUT /api/auth/change-password`

### Users / residents

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `PUT /api/users/:id/status`
- `DELETE /api/users/:id`

### Flats

- `GET /api/flats`
- `GET /api/flats/available`
- `GET /api/flats/:id`
- `POST /api/flats`
- `PUT /api/flats/:id`
- `DELETE /api/flats/:id`

### Staff

- `GET /api/staff`
- `GET /api/staff/:id`
- `POST /api/staff`
- `PUT /api/staff/:id`
- `DELETE /api/staff/:id`

### Maintenance

- `GET /api/maintenance/dashboard`
- `GET /api/maintenance`
- `POST /api/maintenance`
- `POST /api/maintenance/generate`
- `GET /api/maintenance/bills`
- `GET /api/maintenance/bills/:id`
- `PUT /api/maintenance/bills/:id/mark-paid`
- `POST /api/maintenance/bills/:id/reminder`
- `POST /api/maintenance/payments`
- `PUT /api/maintenance/payments/:id`
- `GET /api/maintenance/payments`
- `GET /api/maintenance/reports`
- `GET /api/maintenance/user/my-maintenance`
- `PUT /api/maintenance/:id/pay`
- `PUT /api/maintenance/:id`
- `DELETE /api/maintenance/:id`
- `GET /api/maintenance/categories`
- `POST /api/maintenance/categories`
- `PUT /api/maintenance/categories/:id`
- `DELETE /api/maintenance/categories/:id`
- `GET /api/maintenance/expenses`
- `POST /api/maintenance/expenses`
- `DELETE /api/maintenance/expenses/:id`
- `GET /api/maintenance/late-fee-rule`
- `PUT /api/maintenance/late-fee-rule`
- `POST /api/maintenance/disputes`
- `GET /api/maintenance/disputes`

### Complaints

- `GET /api/complaints`
- `GET /api/complaints/user/my-complaints`
- `GET /api/complaints/:id`
- `POST /api/complaints`
- `PUT /api/complaints/:id`
- `DELETE /api/complaints/:id`

### Notices

- `GET /api/notices`
- `GET /api/notices/latest`
- `GET /api/notices/:id`
- `POST /api/notices`
- `DELETE /api/notices/:id`

### Resident portal

- `GET /api/resident/dashboard`
- `GET /api/resident/members`
- `PUT /api/resident/profile`
- `GET /api/resident/maintenance`
- `GET /api/resident/complaints`
- `GET /api/resident/visitors`
- `GET /api/resident/parcels`
- `GET /api/resident/activities`
- `GET /api/resident/reports/my-summary`
- `GET /api/resident/reports/my-maintenance`
- `GET /api/resident/reports/society-summary`
- `GET /api/resident/reports/expenses`
- `GET /api/resident/reports/members-maintenance`
- `GET /api/resident/reports/all-maintenance`

### Settings and notifications

- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/settings/payment`
- `GET /api/notifications/admin`
- `PUT /api/notifications/admin/read`

## Missing backend endpoints

- Firebase device-token registration/unregistration.
- Native report PDF download endpoint.
- Native report CSV download endpoint.
- Notice update endpoint.
- Notice category/attachment/important endpoints.
- Complaint image upload endpoint.
- Complaint category/priority/assigned staff fields and endpoints.
- Resident family members CRUD.
- Vehicle details CRUD.
- Emergency contacts CRUD.
- Resident notification endpoint.
- Payment receipt download endpoint.

## API response mismatches

- Some endpoints return raw arrays/objects, while others return `{ success, message, data }`.
- Android repository layer currently handles both styles, but consistency should be improved carefully without breaking the React website.
- Resident reports and admin reports use different structures and require dedicated DTOs.

## Security problems / risks

- Android app correctly does not store Supabase credentials, database URL, JWT secret or admin password.
- Backend must remain the only system that talks to Supabase/PostgreSQL.
- Report exports are not safe to fake on Android because complete/paginated data rules matter.
- Resident reports must avoid exposing emails, phone numbers, payment proof images, internal notes and sensitive transaction IDs.
- Firebase cannot be completed without real `google-services.json` and backend token endpoint.

## Recommended implementation order

1. Stabilize Android build and local disk/build output.
2. Apply reusable Material 3 blue/green UI system.
3. Add proper admin/resident bottom navigation shell.
4. Polish dashboards to match the reference UI.
5. Polish residents/flats/staff lists with search/filter/status chips.
6. Polish maintenance/payment screens.
7. Polish complaints/notices screens.
8. Complete native reports using confirmed endpoints only.
9. Add missing backend endpoints only where the React website will remain compatible.
10. Add tests for ViewModels, repositories and auth/session flows.
11. Add release signing instructions and Play Store checklist.

