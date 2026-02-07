# GST and invoice capability

Per [TASKS.md](../TASKS.md) 3.6: capability or placeholder for issuing GST-compliant invoices to paid customers.

## Placeholder / direction

- **Razorpay** can issue invoices for subscriptions and one-time payments. When a tenant is on a paid plan (Phase 4), invoices can be generated via Razorpay’s [Invoices API](https://razorpay.com/docs/api/invoices/) or via the Razorpay Dashboard.
- For **GST compliance in India**: ensure the business (platform or tenant) has a GSTIN and that invoice line items, tax breakdown, and place-of-supply are set as required. Razorpay supports GST in invoices.
- **Implementation options:**
  1. **Razorpay-hosted:** Use Razorpay Subscription + Invoices; customers receive invoices from Razorpay (configure GSTIN in Razorpay Dashboard).
  2. **Self-served:** Backend stores billing events; a separate service or Lambda generates PDF invoices with GST fields and stores them (e.g. S3) for download from the Billing UI.

## Next steps for first paying customer

1. Enable Razorpay Subscriptions (Phase 4) and configure Plans with correct tax treatment.
2. In Razorpay Dashboard, set business details (GSTIN, address) so generated invoices are compliant.
3. Optionally add a “Download invoice” link in the Billing UI that points to Razorpay invoice URL or to a platform-generated invoice.
