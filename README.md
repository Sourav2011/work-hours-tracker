# ☕ ShiftTrack Café - Dual Job Work Hours & Salary Reconciliation

> A modern, responsive web application designed for multi-job workers (specifically at **Cafe Oliv** and **Cafe Click**). Easily log shifts on different days and times, auto-calculate durations, separate standard vs. overtime hours, record salary payments received, and automatically subtract paid hours to track remaining unpaid balances!

---

## 🌟 Key Features

### 1. 🫒 Dual Workplace Monitoring (Cafe Oliv & Cafe Click)
- Pre-configured with distinct badges, color schemes, and customizable rates:
  - **Cafe Oliv**: Base €13.90/hr, Overtime €20.85/hr
  - **Cafe Click**: Base €14.00/hr, Overtime €21.00/hr
- Rates and currency symbols can be configured in **Rates & Settings**.

### 2. 🕒 Smart Shift Logger
- **Flexible Timing**:
  - **Clock In / Out**: Enter Start Time (e.g. 09:00) and End Time (e.g. 14:00) with optional unpaid breaks (15m, 30m, 45m, 1h). The app automatically calculates duration (5.0 hrs).
  - **Direct Hours**: Enter hours directly (e.g. 5.5 hrs).
- **Overtime Tracking**:
  - Overtime hours are tracked and displayed distinctly in glowing badges.
  - "Auto-split (>8h)" button automatically splits long shifts into standard (8h) and overtime.
- **⚡ 1-Click Quick Example**:
  - Click **"⚡ Quick Example: Yesterday 9am–2pm"** to instantly test and populate a 5-hour shift at Cafe Click!

### 3. 💼 Custom Pay Cycle Engine (18th to 19th Cutoff)
- **Matches Your Exact Pay Schedule**:
  - Does NOT awkwardly split hours by calendar month (1st–31st).
  - Automatically groups shifts by salary pay periods:
    - **July/August Salary**: July 18 – August 19 (Paid August 23)
    - **August/September Salary**: August 18 – September 19 (Paid September 25)
    - **September/October Salary**: September 18 – October 19 (Active accumulating cycle, payout ~October 25)
- **Direct Cycle Selector**: Select any pay cycle directly from the dropdown or use the `◀` and `▶` arrows and `Active Cycle` jump button.
- **Real-Time Cycle Destination Indicator**: When picking any shift date in the logging form, the app immediately shows which salary cycle it counts towards.

### 4. 💵 "Paid Section" (Salary Receipts & Reconciliation)
- When you receive your paycheck from either restaurant:
  - Select which **Pay Period Covered** it pays for.
  - Click **"⚡ Auto-fill Period Hours & Money"** to instantly pull the exact hours worked and earnings for that cycle!
  - Record Payment Date, Restaurant, **Hours Paid For**, and **Money Received** (€).
- **Automatic Subtraction**:
  - The app subtracts the hours paid from total worked hours:
    $$\text{Unpaid Remaining Hours} = \text{Total Worked Hours} - \text{Total Hours Paid}$$
    $$\text{Pending Balance} = \text{Total Estimated Earnings} - \text{Total Money Received}$$
- Instant visual reconciliation: easily verify if a restaurant still owes you hours or salary!

### 5. 📑 Salary Period Timesheet Statement & Export
- Print-ready clean statement view for each salary cycle (ready to print or save to PDF for managers).
- **Export to CSV**: Download your shifts spreadsheet for Excel or Google Sheets.
- **Local Storage**: Automatically persists all shifts, payments, and settings in your browser.

---

