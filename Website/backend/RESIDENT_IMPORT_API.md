# Resident Excel Import API

All endpoints require `Authorization: Bearer <JWT>` and an authenticated user with the `admin` role. Data is restricted to the admin's society.

## Template

`GET /api/residents/import/template`

Returns `resident_import_sample.xlsx`. The `Residents` worksheet contains two editable example rows and these exact columns in row 1:

1. Flat Number
2. Resident Name
3. Email
4. Mobile Number
5. Flat Type
6. Ownership Type (`Owner` or `Tenant`)
7. Occupancy Status (`Active` or `Inactive`)

The `Instructions` worksheet marks every field as required and documents its format and allowed values. Replace or remove the example rows before upload. Flat Type must already exist and be active in the society. Active creates an approved account; Inactive creates a pending account. Imported accounts receive a cryptographically random password and can use the existing password-reset flow.

Uploaded headings are checked against the same field configuration that creates the sample. Missing, duplicated, or unknown headings return: `Invalid Excel format. Please download and use the sample Excel template.`

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

## History

`GET /api/residents/imports`

Returns the latest 100 tenant-scoped resident import batches, including file name, uploader, upload time, total, imported, skipped, failed, invalid and duplicate counts, and status. Error reports remain available through the batch-specific endpoint above.

## Android Data Import module

The Admin Dashboard now opens a dedicated `Data Import` screen. Resident imports run directly in this screen. Maintenance transaction actions open the existing transaction import screen, which owns its template, preview, confirmation, error report, and history flow. The normal Residents and Maintenance pages do not show Excel import buttons.

Maintenance uploads accept `.xlsx`, `.xls`, and `.csv`. `GET /api/maintenance/transactions/template` returns `maintenance_import_sample.xlsx`. For `.xls` and `.csv`, the first worksheet/data table is treated as `Transactions`; all transaction headers must remain identical to the sample.

The maintenance sample includes two editable examples, an `Instructions` worksheet, the society's `Members` reference worksheet, and the existing `Summary` worksheet. Its exact transaction headings are:

1. Transaction ID
2. Society Code
3. Member ID
4. Member Name
5. Wing
6. Flat Number
7. Bill ID
8. Bill Number
9. Transaction Date (`YYYY-MM-DD`)
10. Transaction Type (`Maintenance`)
11. Payment Mode (`Cash`, `UPI`, `Bank Transfer`, or `Cheque`)
12. Amount
13. UTR/Cheque Number
14. Payment Status (`Pending`, `Approved`, `Paid`, or `Rejected`)
15. Remarks
16. Import Action (`CREATE` or `UPDATE`)
17. Validation Result
18. Validation Message

The last two columns should remain blank during upload; they are populated by validation and error reports.

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
