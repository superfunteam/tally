# Tally - Product Requirements Document

> **"Track if your bills match. Tally ho!"**

A front-end static web app that helps users verify their credit card charges by matching receipt photos against bank statement transactions using AI-powered analysis.

---

## Overview

Tally allows users to upload a month's worth of receipt photos alongside their PDF bank statements. The app uses Anthropic Claude via Netlify AI Gateway to:
1. Extract transaction data from receipt images (including handwritten tips)
2. Parse transactions from PDF bank statements
3. Intelligently match receipts to statement charges
4. Flag discrepancies (overcharges/undercharges)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Vite + React |
| Styling | Tailwind CSS (mobile-first) |
| Icons | Material Icons |
| Typography | Google Sans Flex (Google Fonts) |
| Animations | Framer Motion |
| AI Provider | Anthropic Claude via Netlify AI Gateway |
| PWA | vite-plugin-pwa (Workbox) |
| Hosting | Netlify (static site + functions) |
| Local Dev | Netlify CLI (`netlify dev`) |

---

## Design Philosophy

**Mobile-First Approach**: All UI components are designed for mobile screens first, then enhanced for larger displays. Touch targets, typography, and layouts prioritize the phone experience since users will primarily capture receipts on-the-go.

---

## Requirements

### 1. Project Setup

**REQ-1.1: Initialize Vite React Project**
- Create Vite + React + TypeScript project
- Configure Tailwind CSS with custom theme
- Add Google Sans Flex font from Google Fonts
- Add Material Icons
- Install Framer Motion
- Install Anthropic SDK

**Test Criteria:**
- [ ] `npm run dev` starts without errors
- [ ] Tailwind classes apply correctly
- [ ] Google Sans Flex renders as default font
- [ ] Material Icons display properly
- [ ] Framer Motion animations work

---

**REQ-1.2: Netlify Configuration**
- Create `netlify.toml` with build settings
- Create `netlify/functions/` directory structure
- Configure for static site deployment
- Set up environment variable references for AI Gateway

**Test Criteria:**
- [ ] `netlify dev` runs locally on port 8888
- [ ] Functions are accessible at `/.netlify/functions/` or custom paths
- [ ] `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` are available in functions

---

**REQ-1.3: Progressive Web App (PWA)**
- Configure `vite-plugin-pwa` for installable app
- Create `manifest.json` with:
  - App name: "Tally"
  - Short name: "Tally"
  - Theme color matching brand
  - App icons (192x192, 512x512)
  - Display: standalone
  - Orientation: portrait
- Implement service worker for offline shell
- Add "Install to Home Screen" prompt:
  - Show banner after 2nd visit or first upload
  - Dismissible but re-promptable from menu
  - Custom styled prompt (not browser default)
- Configure iOS meta tags for Add to Home Screen

**Test Criteria:**
- [ ] Chrome shows install prompt on Android
- [ ] Safari shows "Add to Home Screen" option on iOS
- [ ] Installed app opens in standalone mode (no browser chrome)
- [ ] App icon appears correctly on home screen
- [ ] Splash screen displays during app load
- [ ] Custom install banner appears and functions correctly

---

### 2. User Interface

**REQ-2.1: Mobile-First Layout**
- **Mobile (default)**: Single column, tab navigation between Receipts/Statements
  - Bottom tab bar with two tabs: "Receipts" and "Statements"
  - Full-width panels that swap on tab selection
  - Floating action button (FAB) for primary action (camera/upload)
- **Tablet (768px+)**: Side-by-side split view at 50/50
- **Desktop (1024px+)**: Split view with more breathing room
- Sticky header with app branding and progress indicator
- Safe area insets for notched devices

**Test Criteria:**
- [ ] Mobile: Bottom tabs switch between panels smoothly
- [ ] Mobile: FAB is always visible and accessible
- [ ] Tablet/Desktop: Side-by-side panels at 50/50 split
- [ ] Header stays fixed during scroll
- [ ] Content respects safe-area-inset on notched phones
- [ ] Touch targets are minimum 48x48px

---

**REQ-2.2: Receipt Upload Panel**
- **Camera Capture (Primary on Mobile)**:
  - "Take Photo" button using `<input type="file" capture="environment">`
  - Opens native device camera directly
  - Supports rear camera for receipt scanning
  - Immediate preview after capture
- **File Upload (Secondary/Desktop)**:
  - Large drop zone with dashed border
  - "Upload from Gallery" button
  - Accepts: JPG, PNG, HEIC, WebP
- Thumbnail grid of uploaded receipts (2 columns on mobile, 3-4 on desktop)
- Individual receipt cards show:
  - Thumbnail image
  - Processing status indicator
  - Extracted transaction preview (after processing)
  - Delete button

**Test Criteria:**
- [ ] "Take Photo" opens native camera on iOS Safari
- [ ] "Take Photo" opens native camera on Android Chrome
- [ ] Captured photo appears immediately in thumbnail grid
- [ ] HEIC images from iPhone are handled correctly
- [ ] Drag-and-drop uploads work on desktop
- [ ] Click-to-browse uploads work
- [ ] Invalid file types are rejected with toast message
- [ ] Can delete individual receipts

---

**REQ-2.3: Statement Upload Panel (Right)**
- Large drop zone with dashed border
- Accepts: PDF files only
- "Upload Statements" button (chunky, secondary color)
- List of uploaded PDFs with file names
- Individual statement cards show:
  - PDF icon + filename
  - Page count
  - Processing status indicator
  - Transaction count (after processing)
  - Delete button

**Test Criteria:**
- [ ] Drag-and-drop PDF uploads work
- [ ] Click-to-browse uploads work
- [ ] Non-PDF files are rejected
- [ ] File size displayed for each PDF
- [ ] Can delete individual statements

---

**REQ-2.4: Design System**
- Color palette: Modern, clean (suggest: indigo primary, slate neutrals)
- Buttons: Large (min 48px height), rounded-xl, bold text
- Cards: Rounded-2xl, subtle shadows, hover states
- Typography: Google Sans Flex throughout
- Icons: Material Icons (outlined variant)
- Spacing: Generous padding (p-6 minimum for containers)

**Test Criteria:**
- [ ] All interactive elements are at least 44x44px
- [ ] Consistent border radius across components
- [ ] Hover/focus states on all interactive elements
- [ ] Typography hierarchy is clear (h1 > h2 > body)

---

### 3. Processing Queue System

**REQ-3.1: Upload Queue Manager**
- Queue receipts for sequential AI processing
- Process max 3 images concurrently (prevent rate limiting)
- Visual queue indicator showing position and progress
- Pause/resume queue functionality
- Retry failed items with exponential backoff

**Test Criteria:**
- [ ] 20+ images queue without crashing
- [ ] Only 3 API calls active simultaneously
- [ ] Queue position updates in real-time
- [ ] Failed items can be retried
- [ ] Pause stops new processing, resume continues

---

**REQ-3.2: Processing Status Animation**
- Staged animated interface during API processing:
  1. "Uploading..." with progress bar
  2. "Analyzing image..." with pulsing animation
  3. "Extracting transactions..." with typing effect
  4. "Complete!" with checkmark animation
- Use Framer Motion for smooth transitions
- Each receipt card shows its current stage

**Test Criteria:**
- [ ] All 4 stages animate in sequence
- [ ] Animations are smooth (60fps)
- [ ] Status text is readable during animation
- [ ] Completion state persists correctly

---

### 4. AI Integration (Netlify AI Gateway)

**REQ-4.1: Receipt Analysis Function**
- Netlify function at `/api/analyze-receipt`
- Accepts base64 image data
- Uses Claude claude-sonnet-4-5-20250929 (vision capable) for image analysis
- Detects multiple receipts in single image
- Extracts per receipt:
  - Merchant name
  - Date and time
  - Location/address
  - Subtotal
  - Tax
  - Tip (including handwritten)
  - Total
  - Payment method (if visible)

**Test Criteria:**
- [ ] Single receipt image extracts all fields correctly
- [ ] Image with 2-3 receipts returns array of transactions
- [ ] Handwritten tips are detected and parsed
- [ ] Blurry/partial receipts return confidence scores
- [ ] Function returns within 30 seconds

---

**REQ-4.2: Multi-Receipt Detection**
- AI first pass: Count receipts in image
- If multiple detected, process each separately
- Return array of transactions with bounding box hints
- Handle up to 10 receipts per image

**Test Criteria:**
- [ ] Image with 1 receipt returns single transaction
- [ ] Image with 3 receipts returns 3 transactions
- [ ] Image with 10 receipts processes without timeout
- [ ] AI identifies receipt boundaries accurately

---

**REQ-4.3: Statement Parsing Function**
- Netlify function at `/api/parse-statement`
- Accepts PDF as base64
- Uses Claude to extract all transactions:
  - Date
  - Description/merchant
  - Amount
  - Transaction type (debit/credit)
- Handle multi-page PDFs

**Test Criteria:**
- [ ] Single-page statement parses correctly
- [ ] Multi-page PDF (10+ pages) completes processing
- [ ] Transactions maintain chronological order
- [ ] Amounts parsed with correct sign (+/-)

---

**REQ-4.4: Transaction Matching Function**
- Netlify function at `/api/match-transactions`
- Accepts: receipt transactions array, statement transactions array
- Uses Claude to perform intelligent matching:
  - Match by amount (exact)
  - Match by date (within 3 days due to pending)
  - Match by merchant name (fuzzy)
  - Consider tip variations
- Returns match results with confidence scores

**Test Criteria:**
- [ ] Exact matches (same amount, date, merchant) return 95%+ confidence
- [ ] Tip-adjusted matches calculate difference correctly
- [ ] Unmatched receipts flagged clearly
- [ ] Unmatched statement charges flagged clearly

---

### 5. Results Dashboard

**REQ-5.1: Match Results View**
- Toggle from upload view to results view
- Three sections:
  1. **Confirmed Matches** (green) - Receipt matches statement
  2. **Discrepancies** (amber) - Amount mismatch
  3. **Unmatched** (red) - No match found
- Summary statistics at top

**Test Criteria:**
- [ ] Matched items show receipt + statement side by side
- [ ] Discrepancy shows calculated difference
- [ ] Unmatched items are clearly separated
- [ ] Summary shows: total receipts, total matches, discrepancy count

---

**REQ-5.2: Individual Match Cards**
- Expandable cards showing:
  - Receipt thumbnail
  - Extracted data vs statement data
  - Match confidence percentage
  - Difference amount (if any)
  - "Mark as Resolved" action

**Test Criteria:**
- [ ] Cards expand/collapse with animation
- [ ] Side-by-side comparison is readable
- [ ] Confidence score displayed as progress ring
- [ ] Mark as resolved updates UI state

---

### 6. Animations & Transitions

**REQ-6.1: Page Transitions**
- Framer Motion page transitions between:
  - Upload view → Processing view → Results view
- Slide/fade combinations for natural feel
- Maintain scroll position where appropriate

**Test Criteria:**
- [ ] View transitions animate smoothly
- [ ] No layout shift during transitions
- [ ] Back navigation works correctly

---

**REQ-6.2: Micro-interactions**
- Button press: Scale down slightly
- Card hover: Subtle lift shadow
- Upload drop zone: Border color pulse on drag
- Success: Confetti or checkmark burst
- Loading: Skeleton placeholders with shimmer

**Test Criteria:**
- [ ] All interactions feel responsive (<100ms)
- [ ] Animations don't block user interaction
- [ ] Success animation triggers on completion

---

### 7. Error Handling

**REQ-7.1: Graceful Error States**
- Network failure: Retry button with offline indicator
- AI timeout: Queue retry with delay
- Invalid file: Clear error message
- Rate limit: Automatic backoff with countdown

**Test Criteria:**
- [ ] Offline mode shows appropriate message
- [ ] Timeout errors auto-retry 3 times
- [ ] User can manually retry any failed item
- [ ] Rate limit countdown displays accurately

---

### 8. Data Persistence

**REQ-8.1: Local Storage**
- Store uploaded files in IndexedDB
- Store processing results in localStorage
- Survive page refresh
- "Clear All Data" option in settings

**Test Criteria:**
- [ ] Refresh page keeps uploaded files
- [ ] Results persist across sessions
- [ ] Clear all data removes everything
- [ ] Storage limits handled gracefully

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze-receipt` | POST | Extract transactions from receipt image |
| `/api/parse-statement` | POST | Parse transactions from PDF statement |
| `/api/match-transactions` | POST | AI-powered transaction matching |

---

## File Structure

```
tally/
├── netlify/
│   └── functions/
│       ├── analyze-receipt.ts
│       ├── parse-statement.ts
│       └── match-transactions.ts
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── apple-touch-icon.png
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DropZone.tsx
│   │   │   ├── CameraButton.tsx
│   │   │   ├── BottomTabs.tsx
│   │   │   ├── FAB.tsx
│   │   │   └── ProgressRing.tsx
│   │   ├── pwa/
│   │   │   └── InstallPrompt.tsx
│   │   ├── ReceiptPanel.tsx
│   │   ├── StatementPanel.tsx
│   │   ├── ProcessingQueue.tsx
│   │   ├── ResultsDashboard.tsx
│   │   └── MatchCard.tsx
│   ├── hooks/
│   │   ├── useQueue.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePWAInstall.ts
│   │   ├── useCamera.ts
│   │   └── useApi.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── netlify.toml
├── tailwind.config.js
├── vite.config.ts          # Includes PWA plugin config
├── package.json
└── PRD.md
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Run with Netlify CLI (required for AI Gateway)
netlify dev

# App available at http://localhost:8888
```

---

## Success Metrics

1. **Reliability**: Process 50+ receipts without failure
2. **Accuracy**: 90%+ correct matches on clear receipts
3. **Speed**: Average receipt processing under 10 seconds
4. **UX**: All animations run at 60fps

---

## Out of Scope (V1)

- User authentication
- Cloud storage of receipts
- Export to CSV/PDF
- Multi-currency support
- OCR without AI (pure local processing)
- Native app store distribution (App Store / Play Store)

---

## Implementation Order

1. Project setup + PWA config (REQ-1.1, REQ-1.2, REQ-1.3)
2. Mobile-first UI layout + design system (REQ-2.1, REQ-2.4)
3. Receipt panel with camera capture (REQ-2.2)
4. Statement panel (REQ-2.3)
5. AI functions (REQ-4.x)
6. Queue system (REQ-3.x)
7. Results dashboard (REQ-5.x)
8. Animations & transitions (REQ-6.x)
9. Error handling & persistence (REQ-7.x, REQ-8.x)
10. PWA polish & install prompt refinement
