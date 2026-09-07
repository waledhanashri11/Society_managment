# Resident Excel Import API

All endpoints require `Authorization: Bearer <JWT>` and an authenticated user with the `admin` role. Data is restricted to the admin's society.

## Template

`GET /api/residents/import/template`

Returns `SocietyHub_Resident_Import_Template.xlsx`. The `Residents` worksheet contains these columns in row 1:

1. Flat Number
2. Resident Name
3. Email
4. Mobile Number
5. Flat Type
6. Ownership Type (`Owner` or `Tenant`)
7. Occupancy Status (`Active` or `Inactive`)

The example row should be removed before upload. Flat Type must already exist and be active in the society. Active creates an approved account; Inactive creates a pending account. Imported accounts receive a cryptographically random password and can use the existing password-reset flow.

## Preview

`POST /api/residents/import/preview`

Content type: `multipart/form-data`. Send one file part named `file`. Supported extensions are `.xlsx`, `.xls`, and `.csv`. Maximum size is 5 MB and maximum data rows is 1,000.

The response contains `batchId`, `totalRows`, `validRows`, `invalidRows`, `duplicateRows`, and row-wise validation results. Preview stores immutable staging rows in PostgreSQL; confirm does not accept row data from the client.

## Confirm

`POST /api/residents/import/confirm`

```json
{ "batchId": "123" }
```

Valid staged rows are inserted in one PostgreSQL transaction. Existing or concurrently-created residents/flats are skipped and never overwritten. Unexpected failures roll back the transaction. The response reports `successfullyImported`, `skipped`, and `failed`.

## Error report

`GET /api/residents/import/:batchId/errors`

Returns an `.xlsx` file containing invalid and duplicate rows with their row-wise error messages.

## Testing

1. Run `npm install` in `Website/backend`.
2. Run `npm run test:resident-import`.
3. Run migrations with `npm run migrate` against a test PostgreSQL database.
4. Sign in as an admin and download the template.
5. Verify valid `.xlsx`, `.xls`, and `.csv` files reach preview.
6. Test missing fields, invalid email/mobile/flat values, unsupported flat type, invalid ownership/status, duplicates in the file, and duplicates already in PostgreSQL.
7. Confirm a mixed preview and verify only valid rows are inserted.
8. Confirm the same batch twice and expect HTTP 409.
9. Sign in as a resident and verify every endpoint returns HTTP 403.
10. Upload a file over 5 MB, more than 1,000 rows, and an unsupported extension; each must be rejected.
