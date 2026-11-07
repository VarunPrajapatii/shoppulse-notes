# 05 Prisma schema and migration design (Stage 3, 2026-10-31)

Design only. Nothing in `prisma/schema.prisma` is changed by this stage. Line refs are to the current schema (02 Appendix A).
Conventions kept: `String @id @default(uuid())`, money `Decimal @db.Decimal(12, 2)`, rates in basis points (`Int`, 5% = 500), IST calendar dates as `@db.Date`.
Integrity is enforced by Prisma constraints plus the service layer only. Repository policy forbids hand-edited migration SQL, so there are no DB triggers, partial indexes or exclusion constraints. Tags as in 04.
Revised after the S4 review (R-001..R-043; the resolution table is at the end of s4-review.md).

## 1. New enums
```prisma
enum GstRegime {
  UNREGISTERED
  REGULAR
  COMPOSITION
}

enum BusinessConstitution {
  INDIVIDUAL_OR_PROPRIETOR
  PARTNERSHIP
  LLP
  PRIVATE_LIMITED
  PUBLIC_LIMITED
  ONE_PERSON_COMPANY
  HUF
  TRUST_OR_SOCIETY
  OTHER
}

enum TaxRegistrationChangeReason {
  ONBOARDING
  GST_REGISTERED
  COMPOSITION_OPT_IN
  COMPOSITION_EXIT_VOLUNTARY
  COMPOSITION_EXIT_FORCED
  REGISTRATION_CANCELLED
  NEW_GSTIN
  IDENTITY_CHANGE
}

enum AatoTier {
  UP_TO_1_5_CR
  UP_TO_5_CR
  ABOVE_5_CR
}

enum Taxability {
  TAXABLE
  NIL_RATED
  EXEMPT
  NON_GST
}

enum RateMode {
  CATALOGUE
  MANUAL
}

enum RateCondition {
  NONE
  PER_PIECE_VALUE_THRESHOLD
}

enum RateRuleVerification {
  OFFICIAL_LOAD
  CA_VERIFIED
  UNVERIFIED
}

enum CatalogueStatus {
  DRAFT
  PUBLISHED
  RETIRED
}

enum ChargeAllocationMethod {
  PROPORTIONAL_TO_VALUE
  HIGHEST_RATE_LINE
}

enum MixedCartDocumentMode {
  SPLIT_DOCUMENTS
  INVOICE_CUM_BILL_OF_SUPPLY // hidden until a CA confirms Rule 46A scope
}

enum SupplyType {
  INTRA_STATE
  INTER_STATE
  NONE
}

enum ThresholdOutcome {
  NOT_APPLICABLE
  LOW
  HIGH
}

enum ChargeKind {
  SHIPPING
  COD_FEE
  OTHER
}

enum TaxDocumentType {
  TAX_INVOICE
  BILL_OF_SUPPLY
  INVOICE_CUM_BILL_OF_SUPPLY
  COMMERCIAL_INVOICE
  CREDIT_NOTE
  DEBIT_NOTE
  RECEIPT_VOUCHER
  REFUND_VOUCHER
}

// Letter in the number is mapped in code: INVOICE=I, BILL_OF_SUPPLY=B, COMMERCIAL=S, CREDIT_NOTE=C, DEBIT_NOTE=D, RECEIPT_VOUCHER=R, REFUND_VOUCHER=V
enum DocumentSeriesKind {
  INVOICE
  BILL_OF_SUPPLY
  COMMERCIAL
  CREDIT_NOTE
  DEBIT_NOTE
  RECEIPT_VOUCHER
  REFUND_VOUCHER
}

enum TaxDocumentTrigger {
  PAYMENT_SETTLED
  DISPATCH_COMMIT
  ISSUE_NOW // seller pre-issues before a rate or regime change
  CORRECTION
  EXCHANGE
  RECONCILE
}

enum SaleDocumentStatus {
  PENDING
  ISSUED
  FAILED
}

enum SaleSetMember {
  MAIN
  BOS
}

enum TaxCorrectionKind {
  CANCELLATION
  RTO
  RETURN
  EXCHANGE_RETURN
  REISSUE
}

enum NoteNature {
  GST_CREDIT_NOTE
  COMMERCIAL_CREDIT_NOTE
}

enum DocumentLineKind {
  GOODS
  SHIPPING
  COD_FEE
  OTHER_CHARGE
}

enum ArtifactStatus {
  PENDING
  STORED
  FAILED
}

enum DeliveryChannel {
  EMAIL
}

enum DeliveryStatus {
  PENDING
  SENT
  FAILED
  SKIPPED_NO_PROVIDER
}
```

## 2. New models
```prisma
// Seller-as-supplier identity history. One row per period; core fields never change on a row.
model StoreTaxRegistration {
  id               String                      @id @default(uuid())
  storeId          String
  store            Store                       @relation(fields: [storeId], references: [id], onDelete: Restrict)
  regime           GstRegime
  constitution     BusinessConstitution
  legalName        String
  tradeName        String?
  pan              String?                     @db.VarChar(10)
  gstin            String?                     @db.VarChar(15)
  stateCode        String                      @db.VarChar(2)
  principalAddress Json // { line1, line2?, city, pincode, stateCode }
  effectiveFrom    DateTime                    @db.Date
  effectiveTo      DateTime?                   @db.Date // exclusive; null = open-ended
  changeReason     TaxRegistrationChangeReason
  compositionRateBps Int? // seller-entered; used for estimates only
  compositionAttestation Json? // { allPanRegistrationsOptIn, notManufacturerOfNotifiedGoods, attestedAt }
  documentPrefixId String
  documentPrefix   DocumentPrefix              @relation(fields: [documentPrefixId], references: [id], onDelete: Restrict)
  createdAt        DateTime                    @default(now())
  updatedAt        DateTime                    @updatedAt

  orders    Order[]
  documents TaxDocument[]

  @@index([storeId, effectiveFrom])
  @@index([gstin])
  @@index([pan])
}

model StoreTaxSettings {
  storeId               String                 @id
  store                 Store                  @relation(fields: [storeId], references: [id], onDelete: Cascade)
  pricesIncludeTax      Boolean                @default(true) // no UI in MVP
  chargeAllocation      ChargeAllocationMethod @default(PROPORTIONAL_TO_VALUE)
  mixedCartDocumentMode MixedCartDocumentMode  @default(SPLIT_DOCUMENTS)
  homeStateOnly         Boolean                @default(false) // voluntary for REGULAR; forced by regime otherwise
  allowB2bInvoices      Boolean                @default(false)
  invoiceFooterText     String?                @db.Text
  invoiceLogoUrl        String?
  updatedAt             DateTime               @updatedAt
}

// One per store per FY; the turnover facts the law keys on. Previous FY's row carries over until declared.
model StoreTaxYearDeclaration {
  id                        String    @id @default(uuid())
  storeId                   String
  store                     Store     @relation(fields: [storeId], references: [id], onDelete: Restrict)
  financialYear             String    @db.VarChar(7)
  prevFyAatoTier            AatoTier
  prevFyPanWideAatoInr      Decimal?  @db.Decimal(15, 2) // required for composition eligibility
  aatoEverAbove5Cr          Boolean   @default(false) // any FY since 2017-18
  otherTurnoverInr          Decimal   @default(0) @db.Decimal(15, 2) // sales outside ShopPulse this FY
  annualReturnFiledOn       DateTime? @db.Date // for the FY that ends this declaration's previous FY
  lastThresholdAlertLevel   Int       @default(0) // 0, 75, 90
  declaredAt                DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  @@unique([storeId, financialYear])
}

// Dedupe for reminder crons.
model TaxReminderLog {
  id        String   @id @default(uuid())
  storeId   String
  key       String // e.g. "TRANSITION:{id}:T-7", "CN_WINDOW:2025-26"
  sentAt    DateTime @default(now())

  @@unique([storeId, key])
}

// Globally unique, never renamed or deleted, so every number ever issued stays unique.
// Bound to at most one GSTIN (enforced in the prefix service via the registrations using it).
model DocumentPrefix {
  id        String   @id @default(uuid())
  prefix    String   @unique @db.VarChar(5)
  storeId   String
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Restrict)
  createdAt DateTime @default(now())

  series        DocumentSeries[]
  registrations StoreTaxRegistration[]

  @@index([storeId])
}

model DocumentSeries {
  id            String             @id @default(uuid())
  prefixId      String
  prefix        DocumentPrefix     @relation(fields: [prefixId], references: [id], onDelete: Restrict)
  kind          DocumentSeriesKind
  financialYear String             @db.VarChar(7) // IST FY, "2026-27"
  lastNumber    Int                @default(0)
  updatedAt     DateTime           @updatedAt

  documents TaxDocument[]

  @@unique([prefixId, kind, financialYear])
}

// Immutable once inserted, except the pdf* and irn* artefact columns.
model TaxDocument {
  id                     String               @id @default(uuid())
  storeId                String
  store                  Store                @relation(fields: [storeId], references: [id], onDelete: Restrict)
  orderId                String
  order                  Order                @relation(fields: [orderId], references: [id], onDelete: Restrict)
  registrationId         String
  registration           StoreTaxRegistration @relation(fields: [registrationId], references: [id], onDelete: Restrict)
  type                   TaxDocumentType
  seriesId               String
  series                 DocumentSeries       @relation(fields: [seriesId], references: [id], onDelete: Restrict)
  sequence               Int
  number                 String               @unique @db.VarChar(16)
  financialYear          String               @db.VarChar(7)
  issueDate              DateTime             @db.Date
  issuedAt               DateTime             @default(now())
  issueKey               String               @unique
  trigger                TaxDocumentTrigger

  originalDocumentId     String?
  originalDocument       TaxDocument?         @relation("DocumentCorrections", fields: [originalDocumentId], references: [id], onDelete: Restrict)
  corrections            TaxDocument[]        @relation("DocumentCorrections")
  correctionId           String?
  correction             TaxCorrection?       @relation(fields: [correctionId], references: [id], onDelete: Restrict)
  noteNature             NoteNature? // credit/debit notes only
  declarationDeadline    DateTime?            @db.Date // credit notes: 30 Nov after the original FY, or earlier annual-return date
  saleSetKey             String? // "ORDER:{orderId}" or "EXCH:{exchangeId}"; sale documents only
  saleMember             SaleSetMember?

  supplier               Json // legalName, tradeName, gstin, pan, address, stateCode, stateName, regime, legend
  recipient              Json // name, billingAddress, shippingAddress, gstin?, stateCode, stateName
  brandingSnapshot       Json // { logoPublicId, logoVersion, footerText }
  renderVersion          String
  placeOfSupplyStateCode String               @db.VarChar(2)
  supplyType             SupplyType
  isB2B                  Boolean
  reverseCharge          Boolean              @default(false)
  pricesIncludeTax       Boolean
  hsnDigits              Int

  taxableTotal           Decimal              @db.Decimal(12, 2)
  cgstTotal              Decimal              @default(0) @db.Decimal(12, 2)
  sgstTotal              Decimal              @default(0) @db.Decimal(12, 2)
  utgstTotal             Decimal              @default(0) @db.Decimal(12, 2)
  igstTotal              Decimal              @default(0) @db.Decimal(12, 2)
  cessTotal              Decimal              @default(0) @db.Decimal(12, 2)
  taxTotal               Decimal              @default(0) @db.Decimal(12, 2)
  grandTotal             Decimal              @db.Decimal(12, 2)
  engineVersion          String

  irn                    String?
  irnAckNumber           String?
  irnAckDate             DateTime?
  irnSignedQr            String?              @db.Text

  pdfStatus              ArtifactStatus       @default(PENDING)
  pdfAttempts            Int                  @default(0)
  pdfNextAttemptAt       DateTime             @default(now())
  pdfClaimToken          String?
  pdfClaimedUntil        DateTime?
  pdfLastError           String?              @db.Text
  pdfPublicId            String?
  pdfVersion             String?
  pdfResourceType        String?
  pdfDeliveryType        String?
  pdfFormat              String?
  pdfBytes               Int?
  pdfSha256              String?              @db.VarChar(64)
  pdfStoredAt            DateTime?

  lines      TaxDocumentLine[]
  deliveries TaxDocumentDelivery[]

  @@unique([seriesId, sequence])
  @@index([storeId, financialYear, type])
  @@index([orderId])
  @@index([saleSetKey])
  @@index([correctionId])
  @@index([pdfStatus, pdfNextAttemptAt])
}

// One per business event that reduces a supply; serialised per order (Order row lock).
model TaxCorrection {
  id              String            @id @default(uuid())
  orderId         String
  order           Order             @relation(fields: [orderId], references: [id], onDelete: Restrict)
  kind            TaxCorrectionKind
  sourceKey       String            @unique // CANCEL:{orderId} | RTO:{shipmentId} | RETURN:{returnRequestId} | EXCH:{exchangeId} | REISSUE:{orderId}:{n}
  returnRequestId String?
  returnRequest   ReturnRequest?    @relation(fields: [returnRequestId], references: [id], onDelete: Restrict)
  exchangeId      String?
  creditedGross   Decimal           @db.Decimal(12, 2)
  createdAt       DateTime          @default(now())

  lines      TaxCorrectionLine[]
  documents  TaxDocument[]
  refundLegs RefundLeg[]

  @@index([orderId])
}

model TaxCorrectionLine {
  id             String          @id @default(uuid())
  correctionId   String
  correction     TaxCorrection   @relation(fields: [correctionId], references: [id], onDelete: Restrict)
  originalLineId String // TaxDocumentLine being reduced
  quantity       Decimal         @db.Decimal(12, 3)
  grossAmount    Decimal         @db.Decimal(12, 2)
  taxableValue   Decimal         @db.Decimal(12, 2)
  cgst           Decimal         @default(0) @db.Decimal(12, 2)
  sgst           Decimal         @default(0) @db.Decimal(12, 2)
  utgst          Decimal         @default(0) @db.Decimal(12, 2)
  igst           Decimal         @default(0) @db.Decimal(12, 2)
  cess           Decimal         @default(0) @db.Decimal(12, 2)

  @@index([originalLineId])
}

model TaxDocumentLine {
  id                String           @id @default(uuid())
  documentId        String
  document          TaxDocument      @relation(fields: [documentId], references: [id], onDelete: Restrict)
  lineNo            Int
  kind              DocumentLineKind
  orderItemId       String?
  originalLineId    String?
  originalLine      TaxDocumentLine? @relation("LineCorrections", fields: [originalLineId], references: [id], onDelete: Restrict)
  corrections       TaxDocumentLine[] @relation("LineCorrections")
  allocatedToLineNo Int? // charge line → goods line on the same document
  description       String
  hsnCode           String?          @db.VarChar(8) // full code; printed digits = document.hsnDigits
  uqc               String?          @db.VarChar(3)
  quantity          Decimal          @db.Decimal(12, 3)
  unitPrice         Decimal          @db.Decimal(12, 2)
  discount          Decimal          @default(0) @db.Decimal(12, 2)
  grossAmount       Decimal          @db.Decimal(12, 2)
  taxability        Taxability
  rateBps           Int
  cessRateBps       Int              @default(0)
  thresholdOutcome  ThresholdOutcome @default(NOT_APPLICABLE)
  rateMode          RateMode?
  rateRuleId        String?
  taxableValue      Decimal          @db.Decimal(12, 2)
  cgst              Decimal          @default(0) @db.Decimal(12, 2)
  sgst              Decimal          @default(0) @db.Decimal(12, 2)
  utgst             Decimal          @default(0) @db.Decimal(12, 2)
  igst              Decimal          @default(0) @db.Decimal(12, 2)
  cess              Decimal          @default(0) @db.Decimal(12, 2)
  lineTotal         Decimal          @db.Decimal(12, 2)

  @@unique([documentId, lineNo])
  @@index([orderItemId])
  @@index([originalLineId])
}

model TaxDocumentDelivery {
  id            String          @id @default(uuid())
  documentId    String
  document      TaxDocument     @relation(fields: [documentId], references: [id], onDelete: Restrict)
  channel       DeliveryChannel
  recipient     String
  status        DeliveryStatus  @default(PENDING)
  attempts      Int             @default(0)
  nextAttemptAt DateTime        @default(now())
  claimToken    String?
  claimedUntil  DateTime?
  providerMessageId String?
  lastError     String?         @db.Text
  sentAt        DateTime?
  createdAt     DateTime        @default(now())

  @@index([status, nextAttemptAt])
  @@index([documentId])
}

// Checkout-time charge with its tax split; the allocation JSON lists one entry per goods line.
model OrderCharge {
  id            String     @id @default(uuid())
  orderId       String
  order         Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  kind          ChargeKind
  label         String
  grossAmount   Decimal    @db.Decimal(12, 2)
  taxableAmount Decimal    @default(0) @db.Decimal(12, 2)
  cgstAmount    Decimal    @default(0) @db.Decimal(12, 2)
  sgstAmount    Decimal    @default(0) @db.Decimal(12, 2)
  utgstAmount   Decimal    @default(0) @db.Decimal(12, 2)
  igstAmount    Decimal    @default(0) @db.Decimal(12, 2)
  cessAmount    Decimal    @default(0) @db.Decimal(12, 2)
  allocation    Json // [{ orderItemId, grossPaise, rateBps, taxablePaise, cgstPaise, sgstPaise, utgstPaise, igstPaise, cessPaise }]

  @@unique([orderId, kind])
}

// Platform-wide catalogue. Exactly one PUBLISHED version; it carries full effective-dated history.
model TaxCatalogueVersion {
  id            String          @id @default(uuid())
  label         String          @unique
  sourceSummary String          @db.Text
  status        CatalogueStatus @default(DRAFT)
  publishedAt   DateTime?
  createdAt     DateTime        @default(now())

  hsnCodes  HsnCode[]
  rateRules GstRateRule[]
}

model HsnCode {
  id                 String              @id @default(uuid())
  catalogueVersionId String
  catalogueVersion   TaxCatalogueVersion @relation(fields: [catalogueVersionId], references: [id], onDelete: Restrict)
  code               String              @db.VarChar(8)
  digits             Int
  description        String              @db.Text
  chapter            String              @db.VarChar(2)
  keywords           String[]
  defaultUqc         String?             @db.VarChar(3)

  @@unique([catalogueVersionId, code])
  @@index([code])
}

model GstRateRule {
  id                     String               @id @default(uuid())
  catalogueVersionId     String
  catalogueVersion       TaxCatalogueVersion  @relation(fields: [catalogueVersionId], references: [id], onDelete: Restrict)
  hsnPrefix              String               @db.VarChar(8) // longest-prefix match
  description            String               @db.Text
  taxability             Taxability
  rateBps                Int
  cessRateBps            Int                  @default(0)
  condition              RateCondition        @default(NONE)
  thresholdPaisePerPiece Int?
  rateAboveThresholdBps  Int?
  compositionManufacturerBar Boolean          @default(false) // informational: notified for the manufacturer bar
  effectiveFrom          DateTime             @db.Date
  effectiveTo            DateTime?            @db.Date // exclusive
  notificationRef        String
  sourceUrl              String
  verification           RateRuleVerification

  @@index([catalogueVersionId, hsnPrefix, effectiveFrom])
}

// India Post pincode directory; more than one State code means the buyer picks among them.
model Pincode {
  pincode    String   @id @db.VarChar(6)
  stateCodes String[]
  district   String?
}

// Seller-as-buyer identity for ShopPulse's own subscription invoices. Never read by storefront tax code.
model SaasBillingProfile {
  userId              String    @id
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  wantsGstInvoice     Boolean   @default(false)
  legalName           String?
  gstin               String?   @db.VarChar(15)
  pan                 String?   @db.VarChar(10)
  billingAddress      Json?
  stateCode           String?   @db.VarChar(2)
  lastSensitiveEditAt DateTime?
  updatedAt           DateTime  @updatedAt
}
```

## 3. Changed models (delta only)
| Model | Remove | Add / change | Why (D-id / B-id) |
|---|---|---|---|
| Store (L57-212) | `legalName, gstin, pan, registeredAddress, stateCode, isCompositionScheme, einvoiceEnabled, einvoiceCredentials, invoiceNumberFormat, invoicePrefix, invoiceLogoUrl, invoiceFooterText, declaredTurnoverFy, gstDetailsVerifiedAt, gstDetailsLastEditAt, gstRegistered, gstRegisteredAt, allowB2BInvoices, priceMode, gstGraceStartedAt, gstGraceEndsAt, gstEnforcementApplied, gstHiddenProductCount, gstEnforcementRunAt`; relation `invoiceCounters`; `@@index([gstin])` | relations `taxRegistrations StoreTaxRegistration[]`, `taxSettings StoreTaxSettings?`, `taxYearDeclarations StoreTaxYearDeclaration[]`, `documentPrefixes DocumentPrefix[]`, `taxDocuments TaxDocument[]` | D-01, D-03, D-27, D-48; B-04..B-06, B-26 |
| User | — | `saasBillingProfile SaasBillingProfile?` | D-01 |
| Product (L372-497) | `taxRate, cessRate, isExempt, ucsCode, taxBracketRule` | `hsnCode String? @db.VarChar(8)` (keep index), `taxability Taxability @default(TAXABLE)`, `rateMode RateMode @default(CATALOGUE)`, `manualRateBps Int?`, `manualCessRateBps Int?`, `manualThresholdPaisePerPiece Int?`, `manualRateAboveThresholdBps Int?`, `uqc String @default("PCS") @db.VarChar(3)`, `piecesPerUnit Int @default(1)`, `taxConfirmedAt DateTime?`, `taxReviewRequired Boolean @default(false)` | D-09, D-10, D-40; B-10, B-23..B-25 |
| ArchivedProduct (L535-590) | — | `taxSnapshot Json?` | B-29 |
| Order (L609-744) | `tax` | `taxRegistrationId String` + relation (Restrict), `sellerRegime GstRegime`, `sellerStateCode String @db.VarChar(2)`, `placeOfSupplyStateCode String @db.VarChar(2)`, `supplyType SupplyType`, `shippingStateCode String @db.VarChar(2)`, `billingStateCode String? @db.VarChar(2)`, `pricesIncludeTax Boolean @default(true)`, `chargeAllocation ChargeAllocationMethod @default(PROPORTIONAL_TO_VALUE)`, `isB2B Boolean @default(false)`, `buyerGstin String? @db.VarChar(15)`, `buyerLegalName String?`, `buyerBillingAddress Json?`, `taxableTotal, cgstTotal, sgstTotal, utgstTotal, igstTotal, cessTotal, taxTotal Decimal @default(0) @db.Decimal(12, 2)`, `taxEngineVersion String`, `codCollectedAt DateTime?`, `supplierSnapshot Json` (quote-time supplier block, D-43), `saleDocumentStatus SaleDocumentStatus @default(PENDING)`, `saleDocumentsIssuedAt DateTime?`, relations `charges OrderCharge[]`, `taxDocuments TaxDocument[]`, `taxCorrections TaxCorrection[]`. Normalise `subtotal, shippingCost, totalAmount, codAmount, codCharge, shippingEstimate` to `@db.Decimal(12, 2)` | D-07, D-11, D-13, D-17, D-41, D-43, D-49; B-11, B-15 |
| OrderItem (L772-836) | `hsnCodeSnapshot, taxRateSnapshot, cessRateSnapshot, appliedTaxSource` | Quote outcome: `hsnCode String? @db.VarChar(8)`, `uqc String? @db.VarChar(3)`, `taxability Taxability?`, `rateBps Int @default(0)`, `cessRateBps Int @default(0)`, `thresholdOutcome ThresholdOutcome @default(NOT_APPLICABLE)`, `utgstAmount Decimal @default(0) @db.Decimal(12, 2)`. **Frozen classification inputs (D-43):** `rateMode RateMode?`, `rateRuleId String?`, `baseRateBps Int?` (manual flat/low rate), `rateCondition RateCondition @default(NONE)`, `thresholdPaisePerPiece Int?`, `rateAboveThresholdBps Int?`, `piecesPerUnit Int @default(1)`. Existing `taxableAmount, cgstAmount, sgstAmount, igstAmount, cessAmount` become non-null `@default(0) @db.Decimal(12, 2)` **in Migration B** (nullable until prefill, §5). Normalise `productMrp, priceAtPurchase, lineTotal` to `(12, 2)` | quote snapshot; documents hold the issued values |
| Payment (L1105-1196) | `buyerGstin, buyerLegalName, buyerStateCode, buyerBillingAddress, buyerPan, sellerGstin, sellerStateCode, placeOfSupply, taxableAmount, cgstAmount, sgstAmount, igstAmount, cessAmount, totalTax, invoiceNumber, invoiceKind, invoiceDate, invoiceFinancialYear, invoiceUrl, invoiceGeneratedAt, eInvoiceIrn, eInvoiceAckNumber, eInvoiceAckDate, eInvoiceQrCode, eInvoiceStatus, eInvoiceError, originalInvoiceNumber, originalInvoiceDate`; indexes on `invoiceNumber`, `invoiceFinancialYear` | — (Payment = money only; `buyerName`, `buyerEmail` stay as payer contact). `amount` widens to `(12, 2)` | D-19, D-49; B-02, B-27, B-31 |
| StoreInvoiceCounter (L1207-1219) | whole model | replaced by `DocumentPrefix` + `DocumentSeries` | D-18 |
| Address (L1340-1385) | — | `stateCode String @db.VarChar(2)` (keep `state` name for Shiprocket) | D-05; B-33 |
| Shipment (L1432-1575) | — | EWB record: `ewayBillNumber String? @db.VarChar(12)`, `ewayBillDate DateTime?`, `ewayBillValidUntil DateTime?`, `ewayBillDocumentNumbers String[]`, `ewayBillFromPincode String? @db.VarChar(6)`, `ewayBillToPincode String? @db.VarChar(6)`, `consignmentValue Decimal? @db.Decimal(12, 2)`; `codAmount` widens to `(12, 2)` | D-26, D-49 |
| RefundLeg (L1922-1975) | — | `taxCorrectionId String?` + relation to `TaxCorrection` (Restrict); `amount` widens to `(12, 2)` | D-22, D-49 |
| ReturnRequest (L1650-1806) | — | back-relation `taxCorrections TaxCorrection[]`; `payAtSubmitWaivedInr`, `reverseShippingFeeInr` widen to `(12, 2)` | D-22, D-49 |
| ExchangeDetail (L1979-2017) | — | `replacementSnapshot Json?` (frozen at approval: product/variant, qty, gross, classification inputs as on OrderItem, buyer and ship-to); `newPriceAtExchange`, `priceDifference` widen to `(12, 2)` | D-23, D-49 |
| SubscriptionPayment (L1010-1090) | — | `invoicePublicId String?`, `invoiceVersion String?`, `invoiceResourceType String?`, `invoiceDeliveryType String?`, `invoiceFormat String?` (storage ids, D-20 contract); number format change is code-only | D-37 |

Not in the DB: the State master (code, name, kind STATE / UT_WITH_LEGISLATURE / UT_WITHOUT_LEGISLATURE, registration-threshold class, composition-cap class, intra-State e-way threshold) stays a TS constant extending `src/lib/billing/indian-states.ts`, verified against the official GSTN list (CA/3P). UQC list is also a TS constant (3P data source).

## 4. Invariants the service layer enforces (the schema cannot)
| # | Rule | Where |
|---|---|---|
| S-1 | A store's registration periods are contiguous and never overlap; exactly one row is open-ended | `registration-service` under `SELECT … FOR UPDATE` on the Store row |
| S-2 | Core fields (`regime, gstin, pan, stateCode, constitution, effectiveFrom`) are never updated on a row that any Order or TaxDocument references | same service; no generic update exported |
| S-3 | `TaxDocument` / `TaxDocumentLine` financial columns are never updated; only `pdf*`, `irn*` and delivery rows change | `documents/repository.ts` exposes insert + artefact updates only |
| S-4 | `number` matches `^[A-Z0-9-]{1,16}$` and is built from the prefix, kind letter, FY and sequence | `documents/numbering.ts` (asserted before insert) |
| S-5 | For REGULAR and COMPOSITION, `gstin[0..2] = stateCode` and `gstin[2..12] = pan` | `identity/gstin.ts` |
| S-6 | Exactly one `TaxCatalogueVersion` is PUBLISHED; rules are never edited after publish (a new version is imported) | import script |
| S-7 | `DocumentPrefix` rows are never deleted or renamed; editing a prefix creates a new row, allowed only before the current FY's first document | prefix service |
| S-8 | Documents with a document `issueDate` in FY X belong to a series with `financialYear = X` | issue tx |
| S-9 | For every original `TaxDocumentLine`, Σ `TaxCorrectionLine` (quantity, gross, each component) ≤ the original; balances are read and written only under the Order row lock | `corrections/service.ts` (D-22, D-42) |
| S-10 | A sale set (same `saleSetKey`) is inserted in one transaction; `Order.saleDocumentStatus=ISSUED` is set in that transaction | issue tx (D-41) |
| S-11 | Outbox completion writes only where `pdfClaimToken`/`claimToken` equals the worker's token | `documents/outbox.ts` (D-46) |
| S-12 | A credit note's `registrationId`, supplier snapshot and prefix equal those of its `originalDocument` | issue tx (D-22) |

## 5. Data migration: none (dev DB cleared; owner decision 31 Oct 2026)
The dev DB held only simulations from local testing. It was cleared, the legacy columns were dropped at once, and no prefill or legacy handling exists. Stores, products, addresses and orders are created fresh through the new onboarding and checkout. All SQL is generated by `prisma migrate dev`, never hand-edited.

| Step | Action | Notes |
|---|---|---|
| M-1 | DONE. Migration `tax_domain_foundation`: every new enum and model, the new columns, widened money columns | applied on the cleared DB |
| M-2 | Reference data, loaded by the owning WP: State master (TS constant), `npx tsx scripts/tax/import-pincodes.ts <file>` (WP1), `npx tsx scripts/tax/import-catalogue.ts <file>` (WP4; DRAFT → review → publish). Subscription plans come from `prisma/seed.ts` (already seeded) | 3P / CA data sources |
| M-5 | DONE. Migration `tax_domain_drop_legacy`: dropped every column and model listed under "Remove" in §3, removed the `PREFILL` and `LEGACY_EXCEPTION` enum values, made the former nullable columns required (`Order.taxRegistrationId, sellerRegime, sellerStateCode, placeOfSupplyStateCode, supplyType, shippingStateCode, taxEngineVersion, supplierSnapshot`, `Address.stateCode`, `OrderItem` tax amounts) | code that still references removed fields fails `tsc`; each WP fixes its owned files (07 G-3) |
| M-7 | Freeze: from now on the tax tables only take additive migrations. Post-launch, never drop or retype a column in `TaxDocument*`, `StoreTaxRegistration`, `GstRateRule`, `DocumentSeries`, `DocumentPrefix` | rule |

(The earlier prefill mapping tables and the correction reconstruction table were removed with this decision.)

## 6. Query paths the indexes serve
| Query | Index |
|---|---|
| Active registration on a date | `StoreTaxRegistration(storeId, effectiveFrom)` → latest `effectiveFrom ≤ date` |
| Rate for HSN on a date | `GstRateRule(catalogueVersionId, hsnPrefix, effectiveFrom)`; candidates = all prefixes of the HSN (≤ 4 lookups: 8/6/4/2 digits) |
| Number allocation | `DocumentSeries @@unique(prefixId, kind, financialYear)` |
| Idempotent issue | `TaxDocument.issueKey @unique` |
| GSTR-1 exports for a period | `TaxDocument(storeId, financialYear, type)` + `issueDate` filter |
| PDF/email outbox | `TaxDocument(pdfStatus, pdfNextAttemptAt)`, `TaxDocumentDelivery(status, nextAttemptAt)` |
| Documents of an order | `TaxDocument(orderId)` |
| Sale-set members | `TaxDocument(saleSetKey)` |
| Notes of a correction / remaining balance | `TaxDocument(correctionId)`, `TaxCorrectionLine(originalLineId)` |
