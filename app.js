/**
 * ===================================================================
 * SHIFTTRACK CAFÉ - CONTINUOUS HOURS & MONTH-END SALARY SETTLEMENT
 *
 * Core Concept:
 *  - Shifts accumulate continuously as you work day by day.
 *  - Whenever you get paid (month end), click "Month End / Settle Salary".
 *  - Record the hours & money paid for Cafe Oliv and Cafe Click.
 *  - The app closes that period and immediately starts counting fresh!
 * ===================================================================
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------
  // 1. DATA KEYS & DEFAULT SETTINGS
  // -------------------------------------------------------------------
  const STORAGE_KEY_SHIFTS = 'shifttrack_shifts_v3';
  const STORAGE_KEY_SETTLEMENTS = 'shifttrack_settlements_v3';
  const STORAGE_KEY_SETTINGS = 'shifttrack_settings_v3';
  const STORAGE_KEY_THEME = 'shifttrack_theme_v3';

  const defaultSettings = {
    currency: '€',
    venues: {
      oliv: {
        name: 'Cafe Oliv',
        emoji: '🫒',
        baseRate: 13.90,
        otRate: 20.85
      },
      click: {
        name: 'Cafe Click',
        emoji: '☕',
        baseRate: 14.00,
        otRate: 21.00
      }
    }
  };

  let settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || 'null') || defaultSettings;
  if (!settings.venues) settings.venues = defaultSettings.venues;
  settings.currency = '€';
  settings.venues.click.baseRate = 14.00;
  settings.venues.click.otRate = 21.00;
  settings.venues.oliv.baseRate = 13.90;
  settings.venues.oliv.otRate = 20.85;
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

  let shifts = JSON.parse(localStorage.getItem(STORAGE_KEY_SHIFTS) || 'null');
  let settlements = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTLEMENTS) || 'null');
  let theme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';

  // Active view: 'current' (ongoing unsettled) | settlementId (past closed period) | 'all'
  let activeView = 'current';

  // Seed sample data if empty
  if (!shifts || shifts.length === 0 || !settlements) {
    const sample = generateSampleData();
    shifts = sample.shifts;
    settlements = sample.settlements;
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
  }

  // -------------------------------------------------------------------
  // 2. HELPER FUNCTIONS
  // -------------------------------------------------------------------
  function formatMoney(amount) {
    const cur = settings.currency || '€';
    return `${cur}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatHours(hrs) {
    return `${(Math.round((hrs || 0) * 100) / 100).toFixed(1)}h`;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function getTodayString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getYesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function calculateTimeDiff(start, end, breakMins = 0) {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);

    let startTotal = h1 * 60 + m1;
    let endTotal = h2 * 60 + m2;
    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }

    let netMins = endTotal - startTotal - breakMins;
    if (netMins < 0) netMins = 0;
    return Math.round((netMins / 60) * 100) / 100;
  }

  function showToast(message) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  // -------------------------------------------------------------------
  // 3. SAMPLE DATA GENERATOR (PAST SETTLED + ONGOING SHIFTS)
  // -------------------------------------------------------------------
  function generateSampleData() {
    const s1Id = 'settle_jul_aug_2026';
    const s2Id = 'settle_aug_sep_2026';

    const sampleSettlements = [
      {
        id: s2Id,
        title: 'Aug 18 – Sep 19 Salary',
        date: '2026-09-25',
        venues: {
          oliv: { workedHours: 15.0, earnedPay: 211.98, paidHours: 15.0, paidMoney: 211.98 },
          click: { workedHours: 18.0, earnedPay: 252.00, paidHours: 18.0, paidMoney: 252.00 }
        },
        totalWorkedHours: 33.0,
        totalEarned: 463.98,
        totalPaidHours: 33.0,
        totalPaidMoney: 463.98,
        method: 'Bank Transfer',
        note: 'Full salary received on September 25'
      },
      {
        id: s1Id,
        title: 'Jul 18 – Aug 19 Salary',
        date: '2026-08-23',
        venues: {
          oliv: { workedHours: 7.0, earnedPay: 97.30, paidHours: 7.0, paidMoney: 97.30 },
          click: { workedHours: 6.0, earnedPay: 84.00, paidHours: 6.0, paidMoney: 84.00 }
        },
        totalWorkedHours: 13.0,
        totalEarned: 181.30,
        totalPaidHours: 13.0,
        totalPaidMoney: 181.30,
        method: 'Bank Transfer',
        note: 'Salary received on August 23'
      }
    ];

    const sampleShifts = [
      // Current Ongoing Period (Unsettled)
      {
        id: 'shift_sep26',
        date: '2026-09-26', // Yesterday
        workplace: 'click',
        startTime: '09:00',
        endTime: '14:00',
        breakMins: 0,
        totalHours: 5.0,
        regHours: 5.0,
        otHours: 0.0,
        estimatedPay: 70.00,
        note: 'Yesterday morning barista shift (5 hours)',
        settled: false,
        settlementId: null
      },
      {
        id: 'shift_sep22',
        date: '2026-09-22',
        workplace: 'oliv',
        startTime: '10:00',
        endTime: '16:30',
        breakMins: 0,
        totalHours: 6.5,
        regHours: 6.5,
        otHours: 0.0,
        estimatedPay: 90.35,
        note: 'Lunch service and food prep',
        settled: false,
        settlementId: null
      },

      // Aug 18 – Sep 19 Period (Settled in s2Id)
      {
        id: 'shift_sep17',
        date: '2026-09-17',
        workplace: 'click',
        startTime: '09:00',
        endTime: '15:00',
        breakMins: 30,
        totalHours: 5.5,
        regHours: 5.5,
        otHours: 0.0,
        estimatedPay: 77.00,
        note: 'Barista shift',
        settled: true,
        settlementId: s2Id
      },
      {
        id: 'shift_sep12',
        date: '2026-09-12',
        workplace: 'oliv',
        startTime: '16:00',
        endTime: '22:30',
        breakMins: 0,
        totalHours: 6.5,
        regHours: 6.5,
        otHours: 0.0,
        estimatedPay: 90.35,
        note: 'Dinner closing shift',
        settled: true,
        settlementId: s2Id
      },
      {
        id: 'shift_sep05',
        date: '2026-09-05',
        workplace: 'click',
        startTime: '08:30',
        endTime: '16:30',
        breakMins: 30,
        totalHours: 7.5,
        regHours: 7.5,
        otHours: 0.0,
        estimatedPay: 105.00,
        note: 'Weekend brunch',
        settled: true,
        settlementId: s2Id
      },
      {
        id: 'shift_aug28',
        date: '2026-08-28',
        workplace: 'oliv',
        startTime: '10:00',
        endTime: '19:00',
        breakMins: 30,
        totalHours: 8.5,
        regHours: 8.0,
        otHours: 0.5,
        estimatedPay: 121.63,
        note: 'Kitchen shift + 0.5h Overtime',
        settled: true,
        settlementId: s2Id
      },
      {
        id: 'shift_aug22',
        date: '2026-08-22',
        workplace: 'click',
        startTime: '09:00',
        endTime: '14:00',
        breakMins: 0,
        totalHours: 5.0,
        regHours: 5.0,
        otHours: 0.0,
        estimatedPay: 70.00,
        note: 'Morning shift',
        settled: true,
        settlementId: s2Id
      },

      // Jul 18 – Aug 19 Period (Settled in s1Id)
      {
        id: 'shift_aug15',
        date: '2026-08-15',
        workplace: 'click',
        startTime: '09:00',
        endTime: '15:00',
        breakMins: 0,
        totalHours: 6.0,
        regHours: 6.0,
        otHours: 0.0,
        estimatedPay: 84.00,
        note: 'Mid-month rush',
        settled: true,
        settlementId: s1Id
      },
      {
        id: 'shift_aug08',
        date: '2026-08-08',
        workplace: 'oliv',
        startTime: '11:00',
        endTime: '18:00',
        breakMins: 0,
        totalHours: 7.0,
        regHours: 7.0,
        otHours: 0.0,
        estimatedPay: 97.30,
        note: 'Weekend lunch service',
        settled: true,
        settlementId: s1Id
      }
    ];

    return { shifts: sampleShifts, settlements: sampleSettlements };
  }

  // -------------------------------------------------------------------
  // 4. DOM ELEMENTS CACHE
  // -------------------------------------------------------------------
  const dom = {
    body: document.body,
    themeIcon: document.getElementById('theme-icon'),
    btnToggleTheme: document.getElementById('btn-toggle-theme'),

    // Period Control Bar
    periodViewSelect: document.getElementById('period-view-select'),
    btnOpenSettle: document.getElementById('btn-open-settle'),

    // KPI Summary
    kpiPeriodLabel: document.getElementById('kpi-period-label'),
    kpiTotalHours: document.getElementById('kpi-total-hours'),
    kpiRegularHours: document.getElementById('kpi-regular-hours'),
    kpiOtHours: document.getElementById('kpi-ot-hours'),
    kpiUnpaidHours: document.getElementById('kpi-unpaid-hours'),
    kpiPaidHours: document.getElementById('kpi-paid-hours'),
    kpiRemainingHours: document.getElementById('kpi-remaining-hours'),
    kpiEarnedTotal: document.getElementById('kpi-earned-total'),
    kpiReceivedTotal: document.getElementById('kpi-received-total'),
    kpiBalanceTotal: document.getElementById('kpi-balance-total'),

    // Cafe Oliv Card
    olivRateLabel: document.getElementById('oliv-rate-label'),
    olivTotalHrs: document.getElementById('oliv-total-hrs'),
    olivRegHrs: document.getElementById('oliv-reg-hrs'),
    olivOtHrs: document.getElementById('oliv-ot-hrs'),
    olivPaidHrs: document.getElementById('oliv-paid-hrs'),
    olivUnpaidHrs: document.getElementById('oliv-unpaid-hrs'),
    olivPendingPay: document.getElementById('oliv-pending-pay'),
    olivEarnedPay: document.getElementById('oliv-earned-pay'),
    olivReceivedPay: document.getElementById('oliv-received-pay'),

    // Cafe Click Card
    clickRateLabel: document.getElementById('click-rate-label'),
    clickTotalHrs: document.getElementById('click-total-hrs'),
    clickRegHrs: document.getElementById('click-reg-hrs'),
    clickOtHrs: document.getElementById('click-ot-hrs'),
    clickPaidHrs: document.getElementById('click-paid-hrs'),
    clickUnpaidHrs: document.getElementById('click-unpaid-hrs'),
    clickPendingPay: document.getElementById('click-pending-pay'),
    clickEarnedPay: document.getElementById('click-earned-pay'),
    clickReceivedPay: document.getElementById('click-received-pay'),

    // Tabs
    navTabs: document.querySelectorAll('.nav-tab'),
    tabViews: document.querySelectorAll('.tab-view'),
    paymentsBadge: document.getElementById('payments-badge'),

    // Shift Form
    shiftForm: document.getElementById('shift-form'),
    shiftId: document.getElementById('shift-id'),
    wpOliv: document.getElementById('wp-oliv'),
    wpClick: document.getElementById('wp-click'),
    formOlivRate: document.getElementById('form-oliv-rate'),
    formClickRate: document.getElementById('form-click-rate'),
    btnQuickExample: document.getElementById('btn-quick-example'),
    btnDateToday: document.getElementById('btn-date-today'),
    btnDateYesterday: document.getElementById('btn-date-yesterday'),
    shiftDate: document.getElementById('shift-date'),
    btnModeClock: document.getElementById('btn-mode-clock'),
    btnModeDirect: document.getElementById('btn-mode-direct'),
    clockInputsGroup: document.getElementById('clock-inputs-group'),
    directInputsGroup: document.getElementById('direct-inputs-group'),
    shiftStartTime: document.getElementById('shift-start-time'),
    shiftEndTime: document.getElementById('shift-end-time'),
    shiftBreak: document.getElementById('shift-break'),
    shiftDirectHours: document.getElementById('shift-direct-hours'),
    computedDuration: document.getElementById('computed-duration'),
    shiftHasOt: document.getElementById('shift-has-ot'),
    otInputsWrapper: document.getElementById('ot-inputs-wrapper'),
    btnAutoSplitOt: document.getElementById('btn-auto-split-ot'),
    shiftRegHours: document.getElementById('shift-reg-hours'),
    shiftOtHours: document.getElementById('shift-ot-hours'),
    shiftNote: document.getElementById('shift-note'),
    btnSaveShift: document.getElementById('btn-save-shift'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),

    // Shift History Table
    shiftsCount: document.getElementById('shifts-count'),
    filterVenue: document.getElementById('filter-venue'),
    shiftsEmpty: document.getElementById('shifts-empty'),
    shiftsTableWrap: document.getElementById('shifts-table-wrap'),
    shiftsTbody: document.getElementById('shifts-tbody'),
    shiftsCardsWrap: document.getElementById('shifts-cards-wrap'),

    // Tab 1 Mobile Elements
    btnTab1Form: document.getElementById('btn-tab1-form'),
    btnTab1List: document.getElementById('btn-tab1-list'),
    tab1BadgeCount: document.getElementById('tab1-badge-count'),
    tab1FormCard: document.getElementById('tab1-form-card'),
    tab1HistoryCard: document.getElementById('tab1-history-card'),

    // Tab 2 Settle Form & Ledger
    settleForm: document.getElementById('settle-form'),
    settleTitle: document.getElementById('settle-title'),
    settleDate: document.getElementById('settle-date'),
    settleOlivHrs: document.getElementById('settle-oliv-hrs'),
    settleOlivMoney: document.getElementById('settle-oliv-money'),
    settleClickHrs: document.getElementById('settle-click-hrs'),
    settleClickMoney: document.getElementById('settle-click-money'),
    settleMethod: document.getElementById('settle-method'),
    settleNote: document.getElementById('settle-note'),
    settleCardShiftsCount: document.getElementById('settle-card-shifts-count'),
    settleCardTotalHrs: document.getElementById('settle-card-total-hrs'),
    settleCardEarned: document.getElementById('settle-card-earned'),
    settleOlivSummary: document.getElementById('settle-oliv-summary'),
    settleClickSummary: document.getElementById('settle-click-summary'),
    settlementsCount: document.getElementById('settlements-count'),
    settlementsEmpty: document.getElementById('settlements-empty'),
    settlementsTableWrap: document.getElementById('settlements-table-wrap'),
    settlementsTbody: document.getElementById('settlements-tbody'),
    settlementsCardsWrap: document.getElementById('settlements-cards-wrap'),
    recOlivText: document.getElementById('rec-oliv-text'),
    recClickText: document.getElementById('rec-click-text'),

    // Tab 2 Mobile Elements
    btnTab2Settle: document.getElementById('btn-tab2-settle'),
    btnTab2Ledger: document.getElementById('btn-tab2-ledger'),
    tab2BadgeCount: document.getElementById('tab2-badge-count'),
    tab2FormCard: document.getElementById('tab2-form-card'),
    tab2HistoryCard: document.getElementById('tab2-history-card'),

    // Settle Modal
    modalSettleBackdrop: document.getElementById('modal-settle-backdrop'),
    btnCloseSettle: document.getElementById('btn-close-settle'),
    btnCancelModalSettle: document.getElementById('btn-cancel-modal-settle'),
    modalSettleForm: document.getElementById('modal-settle-form'),
    modalSettleTitle: document.getElementById('modal-settle-title'),
    modalSettleDate: document.getElementById('modal-settle-date'),
    modalSettleShiftsCount: document.getElementById('modal-settle-shifts-count'),
    modalSettleTotalHrs: document.getElementById('modal-settle-total-hrs'),
    modalSettleEarned: document.getElementById('modal-settle-earned'),
    modalSettleOlivSub: document.getElementById('modal-settle-oliv-sub'),
    modalSettleClickSub: document.getElementById('modal-settle-click-sub'),
    modalSettleOlivHrs: document.getElementById('modal-settle-oliv-hrs'),
    modalSettleOlivMoney: document.getElementById('modal-settle-oliv-money'),
    modalSettleClickHrs: document.getElementById('modal-settle-click-hrs'),
    modalSettleClickMoney: document.getElementById('modal-settle-click-money'),
    modalSettleMethod: document.getElementById('modal-settle-method'),
    modalSettleNote: document.getElementById('modal-settle-note'),

    // Statement / Timesheet
    reportTitleMonth: document.getElementById('report-title-month'),
    statementPeriod: document.getElementById('statement-period'),
    statementSummaryTbody: document.getElementById('statement-summary-tbody'),
    statementShiftsTbody: document.getElementById('statement-shifts-tbody'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnPrintReport: document.getElementById('btn-print-report'),

    // Settings Modal
    btnOpenSettings: document.getElementById('btn-open-settings'),
    modalSettingsBackdrop: document.getElementById('modal-settings-backdrop'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    settingCurrency: document.getElementById('setting-currency'),
    settingOlivRate: document.getElementById('setting-oliv-rate'),
    settingOlivOtRate: document.getElementById('setting-oliv-ot-rate'),
    settingClickRate: document.getElementById('setting-click-rate'),
    settingClickOtRate: document.getElementById('setting-click-ot-rate'),
    btnLoadSampleData: document.getElementById('btn-load-sample-data'),
    btnClearAllData: document.getElementById('btn-clear-all-data'),
    btnInstallApp: document.getElementById('btn-install-app'),
    btnBackupExport: document.getElementById('btn-backup-export'),
    btnBackupImportTrigger: document.getElementById('btn-backup-import-trigger'),
    backupFileInput: document.getElementById('backup-file-input'),

    // Cloud Sync Elements
    cloudSyncStatusBadge: document.getElementById('cloud-sync-status-badge'),
    cloudSyncSetupBox: document.getElementById('cloud-sync-setup-box'),
    cloudSyncActiveBox: document.getElementById('cloud-sync-active-box'),
    firebaseConfigInput: document.getElementById('firebase-config-input'),
    btnConnectCloud: document.getElementById('btn-connect-cloud'),
    cloudSyncProjectName: document.getElementById('cloud-sync-project-name'),
    cloudSyncPhoneLink: document.getElementById('cloud-sync-phone-link'),
    btnCopyPhoneLink: document.getElementById('btn-copy-phone-link'),
    btnForceCloudPush: document.getElementById('btn-force-cloud-push'),
    btnForceCloudPull: document.getElementById('btn-force-cloud-pull'),
    btnDisconnectCloud: document.getElementById('btn-disconnect-cloud')
  };

  // -------------------------------------------------------------------
  // 5. VIEW DATA & METRICS ENGINE
  // -------------------------------------------------------------------
  function getViewData() {
    let viewShifts = [];
    let periodTitle = 'Current Ongoing Hours (Unsettled)';
    let periodSubtitle = 'Accumulating towards your next salary payout';
    let isCurrent = false;
    let selectedSettlement = null;

    if (activeView === 'current') {
      viewShifts = shifts.filter(s => !s.settled);
      isCurrent = true;
      if (viewShifts.length > 0) {
        const dates = viewShifts.map(s => s.date).sort();
        periodSubtitle = `Working period from ${formatDateDisplay(dates[0])} to ${formatDateDisplay(dates[dates.length - 1])}`;
      } else {
        periodSubtitle = 'No unsettled shifts. Great job! Ready for your next shift.';
      }
    } else if (activeView === 'all') {
      viewShifts = [...shifts];
      periodTitle = 'All Shifts History (Lifetime)';
      periodSubtitle = 'Complete record of all shifts worked';
    } else {
      selectedSettlement = settlements.find(st => st.id === activeView);
      if (selectedSettlement) {
        viewShifts = shifts.filter(s => s.settlementId === activeView);
        periodTitle = `Closed: ${selectedSettlement.title}`;
        periodSubtitle = `Salary received on ${formatDateDisplay(selectedSettlement.date)} (${selectedSettlement.method || 'Bank'})`;
      } else {
        viewShifts = shifts.filter(s => !s.settled);
        isCurrent = true;
      }
    }

    // Compute venue metrics for this view
    const venues = {
      oliv: { totalHrs: 0, regHrs: 0, otHrs: 0, earned: 0, paidHrs: 0, paidMoney: 0, unpaidHrs: 0, pendingPay: 0 },
      click: { totalHrs: 0, regHrs: 0, otHrs: 0, earned: 0, paidHrs: 0, paidMoney: 0, unpaidHrs: 0, pendingPay: 0 }
    };

    viewShifts.forEach(s => {
      const v = venues[s.workplace];
      if (v) {
        v.totalHrs += s.totalHours || 0;
        v.regHrs += s.regHours || 0;
        v.otHrs += s.otHours || 0;
        v.earned += s.estimatedPay || 0;
      }
    });

    if (isCurrent) {
      // In current ongoing view, nothing is paid yet
      ['oliv', 'click'].forEach(k => {
        venues[k].unpaidHrs = venues[k].totalHrs;
        venues[k].pendingPay = venues[k].earned;
      });
    } else if (selectedSettlement) {
      // In a closed settlement view, paid amounts come directly from settlement record
      ['oliv', 'click'].forEach(k => {
        const v = venues[k];
        const sv = selectedSettlement.venues ? selectedSettlement.venues[k] : null;
        if (sv) {
          v.paidHrs = sv.paidHours || 0;
          v.paidMoney = sv.paidMoney || 0;
        } else {
          v.paidHrs = v.totalHrs;
          v.paidMoney = v.earned;
        }
        v.unpaidHrs = Math.max(0, Math.round((v.totalHrs - v.paidHrs) * 100) / 100);
        v.pendingPay = Math.max(0, Math.round((v.earned - v.paidMoney) * 100) / 100);
      });
    } else {
      // 'all' view: sum paid amounts from all settlements
      let totalOlivPaidHrs = 0;
      let totalOlivPaidMoney = 0;
      let totalClickPaidHrs = 0;
      let totalClickPaidMoney = 0;
      settlements.forEach(st => {
        if (st.venues) {
          totalOlivPaidHrs += st.venues.oliv ? st.venues.oliv.paidHours || 0 : 0;
          totalOlivPaidMoney += st.venues.oliv ? st.venues.oliv.paidMoney || 0 : 0;
          totalClickPaidHrs += st.venues.click ? st.venues.click.paidHours || 0 : 0;
          totalClickPaidMoney += st.venues.click ? st.venues.click.paidMoney || 0 : 0;
        }
      });
      venues.oliv.paidHrs = totalOlivPaidHrs;
      venues.oliv.paidMoney = totalOlivPaidMoney;
      venues.oliv.unpaidHrs = Math.max(0, Math.round((venues.oliv.totalHrs - totalOlivPaidHrs) * 100) / 100);
      venues.oliv.pendingPay = Math.max(0, Math.round((venues.oliv.earned - totalOlivPaidMoney) * 100) / 100);

      venues.click.paidHrs = totalClickPaidHrs;
      venues.click.paidMoney = totalClickPaidMoney;
      venues.click.unpaidHrs = Math.max(0, Math.round((venues.click.totalHrs - totalClickPaidHrs) * 100) / 100);
      venues.click.pendingPay = Math.max(0, Math.round((venues.click.earned - totalClickPaidMoney) * 100) / 100);
    }

    const grand = {
      totalHrs: venues.oliv.totalHrs + venues.click.totalHrs,
      regHrs: venues.oliv.regHrs + venues.click.regHrs,
      otHrs: venues.oliv.otHrs + venues.click.otHrs,
      earned: venues.oliv.earned + venues.click.earned,
      paidHrs: venues.oliv.paidHrs + venues.click.paidHrs,
      paidMoney: venues.oliv.paidMoney + venues.click.paidMoney,
      unpaidHrs: venues.oliv.unpaidHrs + venues.click.unpaidHrs,
      pendingPay: venues.oliv.pendingPay + venues.click.pendingPay
    };

    return { viewShifts, periodTitle, periodSubtitle, isCurrent, selectedSettlement, venues, grand };
  }

  // Calculate current unsettled shifts stats (for pre-filling settle forms)
  function getUnsettledStats() {
    const unsettledShifts = shifts.filter(s => !s.settled);
    let olivHrs = 0;
    let olivEarned = 0;
    let clickHrs = 0;
    let clickEarned = 0;

    unsettledShifts.forEach(s => {
      if (s.workplace === 'oliv') {
        olivHrs += s.totalHours || 0;
        olivEarned += s.estimatedPay || 0;
      } else if (s.workplace === 'click') {
        clickHrs += s.totalHours || 0;
        clickEarned += s.estimatedPay || 0;
      }
    });

    let suggestedTitle = '';
    if (unsettledShifts.length > 0) {
      const dates = unsettledShifts.map(s => s.date).sort();
      const first = new Date(dates[0]);
      const last = new Date(dates[dates.length - 1]);
      const m1 = first.toLocaleString('en-US', { month: 'short' });
      const m2 = last.toLocaleString('en-US', { month: 'short' });
      suggestedTitle = `${m1} ${first.getDate()} – ${m2} ${last.getDate()} Salary`;
    } else {
      suggestedTitle = 'Current Month Salary';
    }

    return {
      shiftsCount: unsettledShifts.length,
      totalHrs: olivHrs + clickHrs,
      totalEarned: olivEarned + clickEarned,
      olivHrs,
      olivEarned,
      clickHrs,
      clickEarned,
      suggestedTitle
    };
  }

  // -------------------------------------------------------------------
  // 6. UI RENDER ENGINE
  // -------------------------------------------------------------------
  function updateUI() {
    const data = getViewData();

    // 1. Header Dropdown Population
    populatePeriodViewSelect();

    // 2. KPI Cards
    if (data.isCurrent) {
      dom.kpiPeriodLabel.textContent = 'CURRENT ONGOING WORKED';
      dom.kpiTotalHours.innerHTML = `${data.grand.totalHrs.toFixed(1)} <span class="unit">hrs</span>`;
      dom.kpiRegularHours.textContent = formatHours(data.grand.regHrs);
      dom.kpiOtHours.textContent = formatHours(data.grand.otHrs);

      dom.kpiUnpaidHours.innerHTML = `${data.grand.unpaidHrs.toFixed(1)} <span class="unit">hrs unpaid</span>`;
      dom.kpiPaidHours.textContent = formatHours(data.grand.paidHrs);
      dom.kpiRemainingHours.textContent = formatHours(data.grand.unpaidHrs);

      dom.kpiEarnedTotal.textContent = formatMoney(data.grand.earned);
      dom.kpiReceivedTotal.textContent = formatMoney(data.grand.paidMoney);
      dom.kpiBalanceTotal.textContent = formatMoney(data.grand.pendingPay);
    } else {
      dom.kpiPeriodLabel.textContent = 'TOTAL WORKED IN PERIOD';
      dom.kpiTotalHours.innerHTML = `${data.grand.totalHrs.toFixed(1)} <span class="unit">hrs</span>`;
      dom.kpiRegularHours.textContent = formatHours(data.grand.regHrs);
      dom.kpiOtHours.textContent = formatHours(data.grand.otHrs);

      dom.kpiUnpaidHours.innerHTML = `${data.grand.unpaidHrs.toFixed(1)} <span class="unit">hrs balance</span>`;
      dom.kpiPaidHours.textContent = formatHours(data.grand.paidHrs);
      dom.kpiRemainingHours.textContent = formatHours(data.grand.unpaidHrs);

      dom.kpiEarnedTotal.textContent = formatMoney(data.grand.earned);
      dom.kpiReceivedTotal.textContent = formatMoney(data.grand.paidMoney);
      dom.kpiBalanceTotal.textContent = formatMoney(data.grand.pendingPay);
    }

    // 3. Cafe Oliv Card
    const o = data.venues.oliv;
    dom.olivRateLabel.textContent = `Rate: ${formatMoney(settings.venues.oliv.baseRate)}/hr • OT: ${formatMoney(settings.venues.oliv.otRate)}/hr`;
    dom.formOlivRate.textContent = `${formatMoney(settings.venues.oliv.baseRate)}/hr`;
    dom.olivTotalHrs.textContent = formatHours(o.totalHrs);
    dom.olivRegHrs.textContent = formatHours(o.regHrs);
    dom.olivOtHrs.textContent = formatHours(o.otHrs);
    dom.olivPaidHrs.textContent = formatHours(o.paidHrs);
    dom.olivUnpaidHrs.textContent = formatHours(o.unpaidHrs);
    dom.olivPendingPay.textContent = formatMoney(o.pendingPay);
    dom.olivEarnedPay.textContent = formatMoney(o.earned);
    dom.olivReceivedPay.textContent = formatMoney(o.paidMoney);

    // 4. Cafe Click Card
    const c = data.venues.click;
    dom.clickRateLabel.textContent = `Rate: ${formatMoney(settings.venues.click.baseRate)}/hr • OT: ${formatMoney(settings.venues.click.otRate)}/hr`;
    dom.formClickRate.textContent = `${formatMoney(settings.venues.click.baseRate)}/hr`;
    dom.clickTotalHrs.textContent = formatHours(c.totalHrs);
    dom.clickRegHrs.textContent = formatHours(c.regHrs);
    dom.clickOtHrs.textContent = formatHours(c.otHrs);
    dom.clickPaidHrs.textContent = formatHours(c.paidHrs);
    dom.clickUnpaidHrs.textContent = formatHours(c.unpaidHrs);
    dom.clickPendingPay.textContent = formatMoney(c.pendingPay);
    dom.clickEarnedPay.textContent = formatMoney(c.earned);
    dom.clickReceivedPay.textContent = formatMoney(c.paidMoney);

    // 5. Render Shifts Table
    renderShiftsTable(data.viewShifts, data.isCurrent);

    // 6. Render Settlements Ledger in Tab 2
    renderSettlementsLedger();

    // 7. Refresh Settle Forms stats
    refreshSettleFormInputs();

    // 8. Render Statement in Tab 3
    renderStatement(data);
  }

  // Populate the Period dropdown in header
  function populatePeriodViewSelect() {
    dom.periodViewSelect.innerHTML = '';

    // Option 1: Current Ongoing
    const optCurrent = document.createElement('option');
    optCurrent.value = 'current';
    const unCount = shifts.filter(s => !s.settled).length;
    optCurrent.textContent = `🔥 Current Ongoing Hours (${unCount} shifts)`;
    if (activeView === 'current') optCurrent.selected = true;
    dom.periodViewSelect.appendChild(optCurrent);

    // Option 2: Past Settlements
    if (settlements.length > 0) {
      settlements.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = `📁 Closed: ${st.title} (Paid on ${formatDateDisplay(st.date)})`;
        if (activeView === st.id) opt.selected = true;
        dom.periodViewSelect.appendChild(opt);
      });
    }

    // Option 3: All Shifts History
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = `📋 All Shifts History (${shifts.length} shifts)`;
    if (activeView === 'all') optAll.selected = true;
    dom.periodViewSelect.appendChild(optAll);
  }

  dom.periodViewSelect.addEventListener('change', () => {
    activeView = dom.periodViewSelect.value;
    updateUI();
    const data = getViewData();
    showToast(`Switched view to: ${data.periodTitle}! ✨`);
  });

  // Render Shifts Table
  function renderShiftsTable(viewShifts, isCurrent) {
    const filter = dom.filterVenue.value;
    let list = viewShifts;
    if (filter !== 'all') {
      list = list.filter(s => s.workplace === filter);
    }

    list.sort((a, b) => b.date.localeCompare(a.date));

    dom.shiftsCount.textContent = list.length;
    if (dom.tab1BadgeCount) dom.tab1BadgeCount.textContent = list.length;
    dom.shiftsTbody.innerHTML = '';
    if (dom.shiftsCardsWrap) dom.shiftsCardsWrap.innerHTML = '';

    if (list.length === 0) {
      dom.shiftsEmpty.classList.remove('hidden');
      dom.shiftsTableWrap.classList.add('hidden');
      if (dom.shiftsCardsWrap) dom.shiftsCardsWrap.classList.add('hidden');
      return;
    }
    dom.shiftsEmpty.classList.add('hidden');
    dom.shiftsTableWrap.classList.remove('hidden');
    if (dom.shiftsCardsWrap) dom.shiftsCardsWrap.classList.remove('hidden');

    list.forEach(shift => {
      const v = settings.venues[shift.workplace] || { name: shift.workplace, emoji: '☕' };
      const isClick = shift.workplace === 'click';
      const timeSpan = shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : 'Direct';
      const otText = shift.otHours > 0 ? `<span class="ot-badge">+${shift.otHours.toFixed(1)}h OT</span>` : '<span class="text-sub">0h</span>';
      const statusBadge = shift.settled ? `<span class="venue-badge badge-click" style="font-size:10px;">Paid</span>` : `<span class="venue-badge" style="background:rgba(245,158,11,0.2); color:#f59e0b; font-size:10px;">Ongoing</span>`;

      // 1. Desktop Table Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${formatDateDisplay(shift.date)}</strong>
          ${shift.note ? `<div class="input-hint">${shift.note}</div>` : ''}
        </td>
        <td>
          <span class="venue-tag ${isClick ? 'tag-click' : 'tag-oliv'}">
            ${v.emoji} ${v.name}
          </span>
          ${statusBadge}
        </td>
        <td>
          <div>${shift.totalHours.toFixed(1)} hrs</div>
          <small class="input-hint">${timeSpan} ${shift.breakMins > 0 ? `(${shift.breakMins}m brk)` : ''}</small>
        </td>
        <td>${shift.regHours.toFixed(1)}h</td>
        <td>${otText}</td>
        <td><strong>${formatMoney(shift.estimatedPay)}</strong></td>
        <td>
          <button class="action-icon-btn edit-shift-btn" data-id="${shift.id}" title="Edit Shift">✏️</button>
          <button class="action-icon-btn delete-shift-btn" data-id="${shift.id}" title="Delete Shift">🗑️</button>
        </td>
      `;
      dom.shiftsTbody.appendChild(tr);

      // 2. Mobile Shift Card (100% visible on phones!)
      if (dom.shiftsCardsWrap) {
        const card = document.createElement('div');
        card.className = 'mobile-shift-card';
        card.innerHTML = `
          <div class="msc-top">
            <span class="venue-tag ${isClick ? 'tag-click' : 'tag-oliv'}">
              ${v.emoji} ${v.name}
            </span>
            <span class="msc-date">${formatDateDisplay(shift.date)}</span>
            ${statusBadge}
          </div>

          <div class="msc-details">
            <div class="msc-stat">
              <span class="msc-lbl">Duration</span>
              <strong class="msc-val">${shift.totalHours.toFixed(1)} hrs</strong>
              <small class="input-hint">${timeSpan} ${shift.breakMins > 0 ? `(${shift.breakMins}m)` : ''}</small>
            </div>
            <div class="msc-stat">
              <span class="msc-lbl">Standard / OT</span>
              <span class="msc-val">${shift.regHours.toFixed(1)}h reg ${shift.otHours > 0 ? `<span class="ot-badge">+${shift.otHours.toFixed(1)}h</span>` : ''}</span>
            </div>
            <div class="msc-stat">
              <span class="msc-lbl">Est. Pay</span>
              <strong class="msc-val text-success">${formatMoney(shift.estimatedPay)}</strong>
            </div>
          </div>

          ${shift.note ? `<div class="msc-note">📝 ${shift.note}</div>` : ''}

          <div class="msc-footer">
            <button class="action-pill-btn edit-shift-btn" data-id="${shift.id}">✏️ Edit</button>
            <button class="action-pill-btn delete-shift-btn btn-danger-soft" data-id="${shift.id}">🗑️ Delete</button>
          </div>
        `;
        dom.shiftsCardsWrap.appendChild(card);
      }
    });

    document.querySelectorAll('.delete-shift-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteShift(btn.dataset.id));
    });
    document.querySelectorAll('.edit-shift-btn').forEach(btn => {
      btn.addEventListener('click', () => loadShiftForEdit(btn.dataset.id));
    });
  }

  // Render Settlements in Tab 2
  function renderSettlementsLedger() {
    dom.paymentsBadge.textContent = settlements.length;
    if (dom.tab2BadgeCount) dom.tab2BadgeCount.textContent = settlements.length;
    dom.settlementsCount.textContent = settlements.length;
    dom.settlementsTbody.innerHTML = '';
    if (dom.settlementsCardsWrap) dom.settlementsCardsWrap.innerHTML = '';

    if (settlements.length === 0) {
      dom.settlementsEmpty.classList.remove('hidden');
      dom.settlementsTableWrap.classList.add('hidden');
      if (dom.settlementsCardsWrap) dom.settlementsCardsWrap.classList.add('hidden');
    } else {
      dom.settlementsEmpty.classList.add('hidden');
      dom.settlementsTableWrap.classList.remove('hidden');
      if (dom.settlementsCardsWrap) dom.settlementsCardsWrap.classList.remove('hidden');

      settlements.forEach(st => {
        const oliv = st.venues ? st.venues.oliv : null;
        const click = st.venues ? st.venues.click : null;

        const olivText = oliv ? `<strong>${oliv.paidHours.toFixed(1)}h</strong> (${formatMoney(oliv.paidMoney)})` : '—';
        const clickText = click ? `<strong>${click.paidHours.toFixed(1)}h</strong> (${formatMoney(click.paidMoney)})` : '—';

        // 1. Desktop Table Row
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${formatDateDisplay(st.date)}</strong></td>
          <td>
            <strong>${st.title}</strong>
            ${st.note ? `<div class="input-hint">${st.note}</div>` : ''}
          </td>
          <td><span class="text-success">${olivText}</span></td>
          <td><span class="text-success">${clickText}</span></td>
          <td><strong class="text-success">${formatMoney(st.totalPaidMoney)}</strong></td>
          <td>
            <button class="action-pill-btn view-settle-btn" data-id="${st.id}" style="padding: 4px 8px; font-size:11px;" title="View shifts for this month">🔍 View</button>
            <button class="action-icon-btn undo-settle-btn" data-id="${st.id}" title="Undo / Reopen Month (returns shifts to ongoing)">↩️</button>
          </td>
        `;
        dom.settlementsTbody.appendChild(tr);

        // 2. Mobile Receipt Card (100% visible on mobile phones!)
        if (dom.settlementsCardsWrap) {
          const card = document.createElement('div');
          card.className = 'settle-receipt-card';
          card.innerHTML = `
            <div class="rc-header">
              <div class="rc-title-group">
                <span class="rc-icon">🧾</span>
                <div>
                  <h4 class="rc-title">${st.title}</h4>
                  <div class="rc-date">Paid on <strong>${formatDateDisplay(st.date)}</strong> • ${st.method || 'Bank Transfer'}</div>
                </div>
              </div>
              <div class="rc-total-badge">
                <span class="rc-total-label">Total Payout</span>
                <span class="rc-total-val">${formatMoney(st.totalPaidMoney)}</span>
              </div>
            </div>

            <div class="rc-venues-grid">
              <div class="rc-venue-row oliv-border">
                <span class="rc-v-name">🫒 Cafe Oliv</span>
                <span class="rc-v-hrs">${oliv ? oliv.paidHours.toFixed(1) : '0.0'}h paid</span>
                <strong class="rc-v-money text-success">${oliv ? formatMoney(oliv.paidMoney) : '€0.00'}</strong>
              </div>
              <div class="rc-venue-row click-border">
                <span class="rc-v-name">☕ Cafe Click</span>
                <span class="rc-v-hrs">${click ? click.paidHours.toFixed(1) : '0.0'}h paid</span>
                <strong class="rc-v-money text-success">${click ? formatMoney(click.paidMoney) : '€0.00'}</strong>
              </div>
            </div>

            ${st.note ? `<div class="rc-note">💬 ${st.note}</div>` : ''}

            <div class="rc-actions">
              <button class="action-pill-btn view-settle-btn" data-id="${st.id}">🔍 View Shifts in Period</button>
              <button class="action-pill-btn undo-settle-btn btn-danger-soft" data-id="${st.id}">↩️ Reopen Period</button>
            </div>
          `;
          dom.settlementsCardsWrap.appendChild(card);
        }
      });

      document.querySelectorAll('.view-settle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeView = btn.dataset.id;
          updateUI();
          switchToTab('shifts');
          if (dom.btnTab1List) dom.btnTab1List.click();
          showToast(`Viewing closed shifts for: ${settlements.find(s => s.id === activeView)?.title}`);
        });
      });

      document.querySelectorAll('.undo-settle-btn').forEach(btn => {
        btn.addEventListener('click', () => undoSettlement(btn.dataset.id));
      });
    }

    // Refresh ongoing summary text in Tab 2
    const un = getUnsettledStats();
    dom.recOlivText.innerHTML = `<strong>${un.olivHrs.toFixed(1)}h worked</strong> (${formatMoney(un.olivEarned)} pending payout)`;
    dom.recClickText.innerHTML = `<strong>${un.clickHrs.toFixed(1)}h worked</strong> (${formatMoney(un.clickEarned)} pending payout)`;
  }

  // Pre-fill Settle form inputs in Tab 2 & Modal
  function refreshSettleFormInputs() {
    const un = getUnsettledStats();

    // Tab 2 card banner
    if (dom.settleCardShiftsCount) dom.settleCardShiftsCount.textContent = `${un.shiftsCount} shifts`;
    if (dom.settleCardTotalHrs) dom.settleCardTotalHrs.textContent = `${un.totalHrs.toFixed(1)} hrs`;
    if (dom.settleCardEarned) dom.settleCardEarned.textContent = formatMoney(un.totalEarned);
    if (dom.settleOlivSummary) dom.settleOlivSummary.textContent = `Worked: ${un.olivHrs.toFixed(1)}h (${formatMoney(un.olivEarned)})`;
    if (dom.settleClickSummary) dom.settleClickSummary.textContent = `Worked: ${un.clickHrs.toFixed(1)}h (${formatMoney(un.clickEarned)})`;

    if (!dom.settleDate.value) dom.settleDate.value = getTodayString();
    if (!dom.settleTitle.value || dom.settleTitle.dataset.autofilled === 'true') {
      dom.settleTitle.value = un.suggestedTitle;
      dom.settleTitle.dataset.autofilled = 'true';
    }
    if (!dom.settleOlivHrs.value || dom.settleOlivHrs.dataset.autofilled === 'true') {
      dom.settleOlivHrs.value = un.olivHrs;
      dom.settleOlivMoney.value = un.olivEarned.toFixed(2);
      dom.settleOlivHrs.dataset.autofilled = 'true';
    }
    if (!dom.settleClickHrs.value || dom.settleClickHrs.dataset.autofilled === 'true') {
      dom.settleClickHrs.value = un.clickHrs;
      dom.settleClickMoney.value = un.clickEarned.toFixed(2);
      dom.settleClickHrs.dataset.autofilled = 'true';
    }

    // Modal elements
    if (dom.modalSettleShiftsCount) dom.modalSettleShiftsCount.textContent = `${un.shiftsCount} shifts`;
    if (dom.modalSettleTotalHrs) dom.modalSettleTotalHrs.textContent = `${un.totalHrs.toFixed(1)} hrs`;
    if (dom.modalSettleEarned) dom.modalSettleEarned.textContent = formatMoney(un.totalEarned);
    if (dom.modalSettleOlivSub) dom.modalSettleOlivSub.textContent = `Worked: ${un.olivHrs.toFixed(1)}h (${formatMoney(un.olivEarned)})`;
    if (dom.modalSettleClickSub) dom.modalSettleClickSub.textContent = `Worked: ${un.clickHrs.toFixed(1)}h (${formatMoney(un.clickEarned)})`;

    if (!dom.modalSettleDate.value) dom.modalSettleDate.value = getTodayString();
    if (!dom.modalSettleTitle.value || dom.modalSettleTitle.dataset.autofilled === 'true') {
      dom.modalSettleTitle.value = un.suggestedTitle;
      dom.modalSettleTitle.dataset.autofilled = 'true';
    }
    if (!dom.modalSettleOlivHrs.value || dom.modalSettleOlivHrs.dataset.autofilled === 'true') {
      dom.modalSettleOlivHrs.value = un.olivHrs;
      dom.modalSettleOlivMoney.value = un.olivEarned.toFixed(2);
      dom.modalSettleOlivHrs.dataset.autofilled = 'true';
    }
    if (!dom.modalSettleClickHrs.value || dom.modalSettleClickHrs.dataset.autofilled === 'true') {
      dom.modalSettleClickHrs.value = un.clickHrs;
      dom.modalSettleClickMoney.value = un.clickEarned.toFixed(2);
      dom.modalSettleClickHrs.dataset.autofilled = 'true';
    }
  }

  // Attach input listeners to settle inputs so user custom typing is not overwritten
  [
    dom.settleTitle, dom.settleOlivHrs, dom.settleOlivMoney, dom.settleClickHrs, dom.settleClickMoney,
    dom.modalSettleTitle, dom.modalSettleOlivHrs, dom.modalSettleOlivMoney, dom.modalSettleClickHrs, dom.modalSettleClickMoney
  ].forEach(el => {
    if (el) {
      el.addEventListener('input', () => { el.dataset.autofilled = 'false'; });
    }
  });

  // Render Statement in Tab 3
  function renderStatement(data) {
    dom.reportTitleMonth.textContent = `Statement: ${data.periodTitle}`;
    dom.statementPeriod.textContent = `${data.periodTitle} • ${data.periodSubtitle}`;

    dom.statementSummaryTbody.innerHTML = `
      <tr>
        <td><strong>🫒 Cafe Oliv</strong></td>
        <td>${data.venues.oliv.regHrs.toFixed(1)}h</td>
        <td class="text-ot">${data.venues.oliv.otHrs.toFixed(1)}h</td>
        <td><strong>${data.venues.oliv.totalHrs.toFixed(1)}h</strong></td>
        <td class="text-success">${data.venues.oliv.paidHrs.toFixed(1)}h</td>
        <td class="${data.venues.oliv.unpaidHrs > 0 ? 'text-warning' : 'text-success'}"><strong>${data.venues.oliv.unpaidHrs.toFixed(1)}h</strong></td>
        <td>${formatMoney(data.venues.oliv.earned)}</td>
        <td class="text-success">${formatMoney(data.venues.oliv.paidMoney)}</td>
        <td class="${data.venues.oliv.pendingPay > 0 ? 'text-warning' : 'text-success'}"><strong>${formatMoney(data.venues.oliv.pendingPay)}</strong></td>
      </tr>
      <tr>
        <td><strong>☕ Cafe Click</strong></td>
        <td>${data.venues.click.regHrs.toFixed(1)}h</td>
        <td class="text-ot">${data.venues.click.otHrs.toFixed(1)}h</td>
        <td><strong>${data.venues.click.totalHrs.toFixed(1)}h</strong></td>
        <td class="text-success">${data.venues.click.paidHrs.toFixed(1)}h</td>
        <td class="${data.venues.click.unpaidHrs > 0 ? 'text-warning' : 'text-success'}"><strong>${data.venues.click.unpaidHrs.toFixed(1)}h</strong></td>
        <td>${formatMoney(data.venues.click.earned)}</td>
        <td class="text-success">${formatMoney(data.venues.click.paidMoney)}</td>
        <td class="${data.venues.click.pendingPay > 0 ? 'text-warning' : 'text-success'}"><strong>${formatMoney(data.venues.click.pendingPay)}</strong></td>
      </tr>
      <tr style="border-top: 2px solid var(--border-card); font-weight: 800; background: rgba(255,255,255,0.03);">
        <td><strong>TOTAL COMBINED</strong></td>
        <td>${data.grand.regHrs.toFixed(1)}h</td>
        <td class="text-ot">${data.grand.otHrs.toFixed(1)}h</td>
        <td><strong>${data.grand.totalHrs.toFixed(1)}h</strong></td>
        <td class="text-success">${data.grand.paidHrs.toFixed(1)}h</td>
        <td class="text-warning"><strong>${data.grand.unpaidHrs.toFixed(1)}h</strong></td>
        <td><strong>${formatMoney(data.grand.earned)}</strong></td>
        <td class="text-success"><strong>${formatMoney(data.grand.paidMoney)}</strong></td>
        <td class="text-warning"><strong>${formatMoney(data.grand.pendingPay)}</strong></td>
      </tr>
    `;

    dom.statementShiftsTbody.innerHTML = '';
    const sorted = [...data.viewShifts].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) {
      dom.statementShiftsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted);">No shifts recorded for this period.</td></tr>`;
      return;
    }

    sorted.forEach(s => {
      const v = settings.venues[s.workplace];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDateDisplay(s.date)}</td>
        <td>${v.name}</td>
        <td><strong>${s.totalHours.toFixed(1)} hrs</strong></td>
        <td>${s.regHours.toFixed(1)}h</td>
        <td>${s.otHours > 0 ? `${s.otHours.toFixed(1)}h` : '—'}</td>
        <td>${formatMoney(v.baseRate)}/hr</td>
        <td><strong>${formatMoney(s.estimatedPay)}</strong></td>
        <td><small class="input-hint">${s.note || '—'}</small></td>
      `;
      dom.statementShiftsTbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------------
  // 7. SHIFT LOGGING & EDITING
  // -------------------------------------------------------------------
  let isDirectMode = false;

  function updateShiftDurationCalculation() {
    let total = 0;
    if (isDirectMode) {
      total = parseFloat(dom.shiftDirectHours.value) || 0;
    } else {
      const start = dom.shiftStartTime.value;
      const end = dom.shiftEndTime.value;
      const breakM = parseInt(dom.shiftBreak.value, 10) || 0;
      total = calculateTimeDiff(start, end, breakM);
    }

    const hoursInt = Math.floor(total);
    const minsInt = Math.round((total - hoursInt) * 60);
    dom.computedDuration.textContent = `${total.toFixed(1)} hrs (${hoursInt}h ${minsInt}m)`;

    if (!dom.shiftHasOt.checked) {
      dom.shiftRegHours.value = total;
      dom.shiftOtHours.value = 0;
    } else {
      const ot = parseFloat(dom.shiftOtHours.value) || 0;
      dom.shiftRegHours.value = Math.max(0, total - ot);
    }
  }

  dom.btnModeClock.addEventListener('click', () => {
    isDirectMode = false;
    dom.btnModeClock.classList.add('active');
    dom.btnModeDirect.classList.remove('active');
    dom.clockInputsGroup.classList.remove('hidden');
    dom.directInputsGroup.classList.add('hidden');
    updateShiftDurationCalculation();
  });

  dom.btnModeDirect.addEventListener('click', () => {
    isDirectMode = true;
    dom.btnModeDirect.classList.add('active');
    dom.btnModeClock.classList.remove('active');
    dom.directInputsGroup.classList.remove('hidden');
    dom.clockInputsGroup.classList.add('hidden');
    updateShiftDurationCalculation();
  });

  [dom.shiftStartTime, dom.shiftEndTime, dom.shiftBreak, dom.shiftDirectHours].forEach(el => {
    el.addEventListener('input', updateShiftDurationCalculation);
    el.addEventListener('change', updateShiftDurationCalculation);
  });

  dom.shiftHasOt.addEventListener('change', () => {
    if (dom.shiftHasOt.checked) {
      dom.otInputsWrapper.classList.remove('hidden');
    } else {
      dom.otInputsWrapper.classList.add('hidden');
    }
    updateShiftDurationCalculation();
  });

  dom.btnAutoSplitOt.addEventListener('click', () => {
    let total = 0;
    if (isDirectMode) total = parseFloat(dom.shiftDirectHours.value) || 0;
    else total = calculateTimeDiff(dom.shiftStartTime.value, dom.shiftEndTime.value, parseInt(dom.shiftBreak.value, 10) || 0);

    dom.shiftHasOt.checked = true;
    dom.otInputsWrapper.classList.remove('hidden');

    if (total > 8) {
      dom.shiftRegHours.value = 8.0;
      dom.shiftOtHours.value = Math.round((total - 8.0) * 100) / 100;
      showToast(`Split: 8.0h Standard + ${(total - 8.0).toFixed(1)}h Overtime!`);
    } else {
      dom.shiftRegHours.value = total;
      dom.shiftOtHours.value = 0;
      showToast('Shift is 8 hours or less (0 OT hours).');
    }
  });

  dom.shiftOtHours.addEventListener('input', () => {
    let total = 0;
    if (isDirectMode) total = parseFloat(dom.shiftDirectHours.value) || 0;
    else total = calculateTimeDiff(dom.shiftStartTime.value, dom.shiftEndTime.value, parseInt(dom.shiftBreak.value, 10) || 0);

    const ot = parseFloat(dom.shiftOtHours.value) || 0;
    dom.shiftRegHours.value = Math.max(0, Math.round((total - ot) * 100) / 100);
  });

  dom.btnDateToday.addEventListener('click', () => { dom.shiftDate.value = getTodayString(); });
  dom.btnDateYesterday.addEventListener('click', () => { dom.shiftDate.value = getYesterdayString(); });

  // Quick Example Button: Yesterday 9am-2pm at Cafe Click
  dom.btnQuickExample.addEventListener('click', () => {
    dom.shiftId.value = '';
    dom.wpClick.checked = true;
    dom.shiftDate.value = getYesterdayString();
    isDirectMode = false;
    dom.btnModeClock.classList.add('active');
    dom.btnModeDirect.classList.remove('active');
    dom.clockInputsGroup.classList.remove('hidden');
    dom.directInputsGroup.classList.add('hidden');

    dom.shiftStartTime.value = '09:00';
    dom.shiftEndTime.value = '14:00';
    dom.shiftBreak.value = '0';
    dom.shiftHasOt.checked = false;
    dom.otInputsWrapper.classList.add('hidden');
    dom.shiftRegHours.value = 5.0;
    dom.shiftOtHours.value = 0.0;
    dom.shiftNote.value = 'Morning barista shift (5.0 hours)';

    updateShiftDurationCalculation();
    showToast('⚡ Autofilled: Yesterday 9:00 AM – 2:00 PM at Cafe Click (5.0 hrs)!');
  });

  // Shift Form Submit
  dom.shiftForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const date = dom.shiftDate.value;
    if (!date) {
      alert('Please select a shift date.');
      return;
    }

    const workplace = dom.wpOliv.checked ? 'oliv' : 'click';
    const vSettings = settings.venues[workplace];

    let totalHours = 0;
    let startTime = '';
    let endTime = '';
    let breakMins = 0;

    if (isDirectMode) {
      totalHours = parseFloat(dom.shiftDirectHours.value) || 0;
      if (totalHours <= 0) {
        alert('Please enter valid working hours.');
        return;
      }
    } else {
      startTime = dom.shiftStartTime.value;
      endTime = dom.shiftEndTime.value;
      breakMins = parseInt(dom.shiftBreak.value, 10) || 0;
      totalHours = calculateTimeDiff(startTime, endTime, breakMins);
      if (totalHours <= 0) {
        alert('End time must be after start time.');
        return;
      }
    }

    let regHours = totalHours;
    let otHours = 0;

    if (dom.shiftHasOt.checked) {
      otHours = parseFloat(dom.shiftOtHours.value) || 0;
      regHours = parseFloat(dom.shiftRegHours.value) || Math.max(0, totalHours - otHours);
    }

    const estimatedPay = Math.round((regHours * vSettings.baseRate + otHours * vSettings.otRate) * 100) / 100;
    const note = dom.shiftNote.value.trim();
    const editId = dom.shiftId.value;

    if (editId) {
      const idx = shifts.findIndex(s => s.id === editId);
      if (idx !== -1) {
        shifts[idx] = {
          ...shifts[idx],
          date,
          workplace,
          startTime,
          endTime,
          breakMins,
          totalHours,
          regHours,
          otHours,
          estimatedPay,
          note
        };
        showToast('Shift updated successfully! ✨');
      }
    } else {
      const newShift = {
        id: 'shift_' + Date.now(),
        date,
        workplace,
        startTime,
        endTime,
        breakMins,
        totalHours,
        regHours,
        otHours,
        estimatedPay,
        note,
        settled: false,
        settlementId: null
      };
      shifts.unshift(newShift);
      // Auto return to current ongoing view if viewing history
      activeView = 'current';
      showToast(`Added ${totalHours.toFixed(1)}h shift for ${vSettings.name}! 🕒`);
    }

    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    resetShiftForm();
    updateUI();
    syncLocalToCloud();
  });

  function resetShiftForm() {
    dom.shiftId.value = '';
    dom.shiftDate.value = getTodayString();
    dom.shiftStartTime.value = '09:00';
    dom.shiftEndTime.value = '14:00';
    dom.shiftBreak.value = '0';
    dom.shiftDirectHours.value = '';
    dom.shiftHasOt.checked = false;
    dom.otInputsWrapper.classList.add('hidden');
    dom.shiftRegHours.value = '';
    dom.shiftOtHours.value = '0';
    dom.shiftNote.value = '';
    dom.btnSaveShift.querySelector('span').textContent = '💾 Save Working Shift';
    dom.btnCancelEdit.classList.add('hidden');
    updateShiftDurationCalculation();
  }

  function loadShiftForEdit(id) {
    const shift = shifts.find(s => s.id === id);
    if (!shift) return;

    dom.shiftId.value = shift.id;
    dom.shiftDate.value = shift.date;
    if (shift.workplace === 'click') dom.wpClick.checked = true;
    else dom.wpOliv.checked = true;

    if (shift.startTime && shift.endTime) {
      isDirectMode = false;
      dom.btnModeClock.classList.add('active');
      dom.btnModeDirect.classList.remove('active');
      dom.clockInputsGroup.classList.remove('hidden');
      dom.directInputsGroup.classList.add('hidden');
      dom.shiftStartTime.value = shift.startTime;
      dom.shiftEndTime.value = shift.endTime;
      dom.shiftBreak.value = shift.breakMins || 0;
    } else {
      isDirectMode = true;
      dom.btnModeDirect.classList.add('active');
      dom.btnModeClock.classList.remove('active');
      dom.directInputsGroup.classList.remove('hidden');
      dom.clockInputsGroup.classList.add('hidden');
      dom.shiftDirectHours.value = shift.totalHours;
    }

    if (shift.otHours > 0) {
      dom.shiftHasOt.checked = true;
      dom.otInputsWrapper.classList.remove('hidden');
      dom.shiftRegHours.value = shift.regHours;
      dom.shiftOtHours.value = shift.otHours;
    } else {
      dom.shiftHasOt.checked = false;
      dom.otInputsWrapper.classList.add('hidden');
    }

    dom.shiftNote.value = shift.note || '';
    dom.btnSaveShift.querySelector('span').textContent = 'Update Shift';
    dom.btnCancelEdit.classList.remove('hidden');

    updateShiftDurationCalculation();
    dom.shiftForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Editing shift...');
  }

  dom.btnCancelEdit.addEventListener('click', resetShiftForm);

  function deleteShift(id) {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    shifts = shifts.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    updateUI();
    syncLocalToCloud();
    showToast('Shift deleted.');
  }

  // -------------------------------------------------------------------
  // 8. MONTH END SETTLEMENT EXECUTION
  // -------------------------------------------------------------------
  function performMonthEndSettlement(params) {
    const unsettledShifts = shifts.filter(s => !s.settled);
    if (unsettledShifts.length === 0) {
      alert('You have no ongoing shifts to settle! Log some shifts first.');
      return false;
    }

    const un = getUnsettledStats();
    const settleId = 'settle_' + Date.now();

    const olivPaidHrs = parseFloat(params.olivHrs) || 0;
    const olivPaidMoney = parseFloat(params.olivMoney) || 0;
    const clickPaidHrs = parseFloat(params.clickHrs) || 0;
    const clickPaidMoney = parseFloat(params.clickMoney) || 0;

    const newSettlement = {
      id: settleId,
      title: params.title || 'Salary Period',
      date: params.date || getTodayString(),
      venues: {
        oliv: {
          workedHours: un.olivHrs,
          earnedPay: un.olivEarned,
          paidHours: olivPaidHrs,
          paidMoney: olivPaidMoney
        },
        click: {
          workedHours: un.clickHrs,
          earnedPay: un.clickEarned,
          paidHours: clickPaidHrs,
          paidMoney: clickPaidMoney
        }
      },
      totalWorkedHours: un.totalHrs,
      totalEarned: un.totalEarned,
      totalPaidHours: olivPaidHrs + clickPaidHrs,
      totalPaidMoney: olivPaidMoney + clickPaidMoney,
      method: params.method || 'Bank Transfer',
      note: params.note || ''
    };

    // Mark current ongoing shifts as settled
    shifts.forEach(s => {
      if (!s.settled) {
        s.settled = true;
        s.settlementId = settleId;
      }
    });

    settlements.unshift(newSettlement);

    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
    syncLocalToCloud();

    // Reset settle form inputs & autofill flags for the next period
    [
      dom.settleTitle, dom.settleOlivHrs, dom.settleOlivMoney, dom.settleClickHrs, dom.settleClickMoney,
      dom.modalSettleTitle, dom.modalSettleOlivHrs, dom.modalSettleOlivMoney, dom.modalSettleClickHrs, dom.modalSettleClickMoney
    ].forEach(el => {
      if (el) {
        el.value = '';
        el.dataset.autofilled = 'true';
      }
    });

    // Return to ongoing view (which now starts at 0 hours!)
    activeView = 'current';
    updateUI();

    showToast(`🎉 Closed ${newSettlement.title}! Next salary starts counting from 0.0h.`);
    return true;
  }

  // Submit from Tab 2 Settle Form
  dom.settleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = {
      title: dom.settleTitle.value.trim(),
      date: dom.settleDate.value,
      olivHrs: dom.settleOlivHrs.value,
      olivMoney: dom.settleOlivMoney.value,
      clickHrs: dom.settleClickHrs.value,
      clickMoney: dom.settleClickMoney.value,
      method: dom.settleMethod.value,
      note: dom.settleNote.value.trim()
    };
    performMonthEndSettlement(params);
  });

  // Submit from Modal Settle Form
  dom.modalSettleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = {
      title: dom.modalSettleTitle.value.trim(),
      date: dom.modalSettleDate.value,
      olivHrs: dom.modalSettleOlivHrs.value,
      olivMoney: dom.modalSettleOlivMoney.value,
      clickHrs: dom.modalSettleClickHrs.value,
      clickMoney: dom.modalSettleClickMoney.value,
      method: dom.modalSettleMethod.value,
      note: dom.modalSettleNote.value.trim()
    };
    if (performMonthEndSettlement(params)) {
      dom.modalSettleBackdrop.classList.add('hidden');
    }
  });

  // Open Settle Modal from header button
  dom.btnOpenSettle.addEventListener('click', () => {
    refreshSettleFormInputs();
    dom.modalSettleBackdrop.classList.remove('hidden');
  });

  dom.btnCloseSettle.addEventListener('click', () => {
    dom.modalSettleBackdrop.classList.add('hidden');
  });
  dom.btnCancelModalSettle.addEventListener('click', () => {
    dom.modalSettleBackdrop.classList.add('hidden');
  });

  // Undo / Reopen a closed settlement
  function undoSettlement(id) {
    const st = settlements.find(s => s.id === id);
    if (!st) return;

    if (!confirm(`Reopen "${st.title}"? All shifts in this period will return to your current ongoing hours count.`)) {
      return;
    }

    shifts.forEach(s => {
      if (s.settlementId === id) {
        s.settled = false;
        s.settlementId = null;
      }
    });

    settlements = settlements.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
    syncLocalToCloud();

    activeView = 'current';
    updateUI();
    showToast(`↩️ Reopened "${st.title}"! Shifts returned to ongoing hours.`);
  }

  // -------------------------------------------------------------------
  // 9. TAB SWITCHING
  // -------------------------------------------------------------------
  function switchToTab(tabName) {
    dom.navTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    dom.tabViews.forEach(v => v.classList.toggle('active', v.id === `tab-${tabName}`));
  }

  dom.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchToTab(tab.dataset.tab);
    });
  });

  dom.filterVenue.addEventListener('change', () => {
    const data = getViewData();
    renderShiftsTable(data.viewShifts, data.isCurrent);
  });

  // -------------------------------------------------------------------
  // 10. EXPORT & PRINT
  // -------------------------------------------------------------------
  dom.btnExportCsv.addEventListener('click', () => {
    const data = getViewData();
    const rows = [
      ['Date', 'Workplace', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Estimated Pay', 'Status', 'Notes']
    ];

    data.viewShifts.forEach(s => {
      const v = settings.venues[s.workplace];
      rows.push([
        s.date,
        v.name,
        s.totalHours.toFixed(2),
        s.regHours.toFixed(2),
        s.otHours.toFixed(2),
        s.estimatedPay.toFixed(2),
        s.settled ? 'Settled / Paid' : 'Ongoing / Unpaid',
        `"${(s.note || '').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShiftTrack_${data.periodTitle.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded timesheet CSV! 📥');
  });

  dom.btnPrintReport.addEventListener('click', () => {
    window.print();
  });

  // -------------------------------------------------------------------
  // 11. SETTINGS MODAL & THEMES
  // -------------------------------------------------------------------
  function applyTheme(t) {
    theme = t;
    dom.body.dataset.theme = t;
    localStorage.setItem(STORAGE_KEY_THEME, t);
    dom.themeIcon.textContent = t === 'dark' ? '☀️' : '🌙';
  }

  dom.btnToggleTheme.addEventListener('click', () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  });

  dom.btnOpenSettings.addEventListener('click', () => {
    dom.settingCurrency.value = settings.currency || '€';
    dom.settingOlivRate.value = settings.venues.oliv.baseRate;
    dom.settingOlivOtRate.value = settings.venues.oliv.otRate;
    dom.settingClickRate.value = settings.venues.click.baseRate;
    dom.settingClickOtRate.value = settings.venues.click.otRate;
    dom.modalSettingsBackdrop.classList.remove('hidden');
  });

  dom.btnCloseSettings.addEventListener('click', () => {
    dom.modalSettingsBackdrop.classList.add('hidden');
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    settings.currency = dom.settingCurrency.value;
    settings.venues.oliv.baseRate = parseFloat(dom.settingOlivRate.value) || 13.90;
    settings.venues.oliv.otRate = parseFloat(dom.settingOlivOtRate.value) || 20.85;
    settings.venues.click.baseRate = parseFloat(dom.settingClickRate.value) || 14.00;
    settings.venues.click.otRate = parseFloat(dom.settingClickOtRate.value) || 21.00;

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    dom.modalSettingsBackdrop.classList.add('hidden');
    showToast('Hourly rates & settings saved! ⚙️');
    updateUI();
  });

  dom.btnLoadSampleData.addEventListener('click', () => {
    if (confirm('Load demo sample shifts with August and September settlements?')) {
      const sample = generateSampleData();
      shifts = sample.shifts;
      settlements = sample.settlements;
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
      localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
      activeView = 'current';
      dom.modalSettingsBackdrop.classList.add('hidden');
      showToast('Loaded demo shifts and past settlements! 🌟');
      updateUI();
    }
  });

  dom.btnClearAllData.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear ALL shifts and settlement records? This cannot be undone.')) {
      shifts = [];
      settlements = [];
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
      localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
      activeView = 'current';
      dom.modalSettingsBackdrop.classList.add('hidden');
      showToast('All shift data cleared.');
      updateUI();
    }
  });

  // -------------------------------------------------------------------
  // 12. PWA SERVICE WORKER & APP INSTALL PROMPT
  // -------------------------------------------------------------------
  let deferredInstallPrompt = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(() => {
        console.log('ShiftTrack Service Worker registered');
      }).catch(err => {
        console.warn('SW registration skipped:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (dom.btnInstallApp) {
      dom.btnInstallApp.classList.remove('hidden');
    }
  });

  if (dom.btnInstallApp) {
    dom.btnInstallApp.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('🎉 ShiftTrack Café installed on your device!');
        }
        deferredInstallPrompt = null;
        dom.btnInstallApp.classList.add('hidden');
      } else {
        alert('To install on iPhone:\n1. Tap the Share button (square with arrow ⎋) in Safari.\n2. Scroll down and tap "Add to Home Screen" ⊞.\n\nTo install on Android Chrome:\nTap the three dots menu (⋮) -> "Install app" or "Add to Home screen".');
      }
    });
  }

  // -------------------------------------------------------------------
  // 13. DATA BACKUP & RESTORE (Phone <-> PC Sync)
  // -------------------------------------------------------------------
  if (dom.btnBackupExport) {
    dom.btnBackupExport.addEventListener('click', () => {
      const backupData = {
        app: 'ShiftTrack Café',
        version: 3,
        exportedAt: new Date().toISOString(),
        settings,
        shifts,
        settlements
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ShiftTrack_Backup_${getTodayString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('📥 Backup file downloaded successfully!');
    });
  }

  if (dom.btnBackupImportTrigger && dom.backupFileInput) {
    dom.btnBackupImportTrigger.addEventListener('click', () => {
      dom.backupFileInput.click();
    });

    dom.backupFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!imported.shifts || !Array.isArray(imported.shifts)) {
            throw new Error('Invalid backup file structure.');
          }

          if (confirm(`Restore backup from ${imported.exportedAt ? formatDateDisplay(imported.exportedAt.split('T')[0]) : 'file'}? This will merge ${imported.shifts.length} shifts into your tracker.`)) {
            const existingIds = new Set(shifts.map(s => s.id));
            imported.shifts.forEach(s => {
              if (!existingIds.has(s.id)) {
                shifts.push(s);
              }
            });

            if (imported.settlements && Array.isArray(imported.settlements)) {
              const existingSettleIds = new Set(settlements.map(st => st.id));
              imported.settlements.forEach(st => {
                if (!existingSettleIds.has(st.id)) {
                  settlements.push(st);
                }
              });
            }

            if (imported.settings) {
              settings = { ...settings, ...imported.settings };
              localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
            }

            localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
            localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));

            dom.modalSettingsBackdrop.classList.add('hidden');
            updateUI();
            showToast('✅ Backup restored and merged successfully! 🌟');
          }
        } catch (err) {
          alert('Could not restore backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
      dom.backupFileInput.value = '';
    });
  }

  // -------------------------------------------------------------------
  // 14. MOBILE SUB-TAB TOGGLING
  // -------------------------------------------------------------------
  function setupMobileSubtabs() {
    if (dom.btnTab1Form && dom.btnTab1List) {
      dom.btnTab1Form.addEventListener('click', () => {
        dom.btnTab1Form.classList.add('active');
        dom.btnTab1List.classList.remove('active');
        if (dom.tab1FormCard) dom.tab1FormCard.classList.remove('mobile-subtab-hidden');
        if (dom.tab1HistoryCard) dom.tab1HistoryCard.classList.add('mobile-subtab-hidden');
      });
      dom.btnTab1List.addEventListener('click', () => {
        dom.btnTab1List.classList.add('active');
        dom.btnTab1Form.classList.remove('active');
        if (dom.tab1HistoryCard) dom.tab1HistoryCard.classList.remove('mobile-subtab-hidden');
        if (dom.tab1FormCard) dom.tab1FormCard.classList.add('mobile-subtab-hidden');
      });
    }

    if (dom.btnTab2Settle && dom.btnTab2Ledger) {
      dom.btnTab2Settle.addEventListener('click', () => {
        dom.btnTab2Settle.classList.add('active');
        dom.btnTab2Ledger.classList.remove('active');
        if (dom.tab2FormCard) dom.tab2FormCard.classList.remove('mobile-subtab-hidden');
        if (dom.tab2HistoryCard) dom.tab2HistoryCard.classList.add('mobile-subtab-hidden');
      });
      dom.btnTab2Ledger.addEventListener('click', () => {
        dom.btnTab2Ledger.classList.add('active');
        dom.btnTab2Settle.classList.remove('active');
        if (dom.tab2HistoryCard) dom.tab2HistoryCard.classList.remove('mobile-subtab-hidden');
        if (dom.tab2FormCard) dom.tab2FormCard.classList.add('mobile-subtab-hidden');
      });
    }

    // Default mobile state on page load
    if (window.innerWidth <= 680) {
      if (dom.tab1FormCard) dom.tab1FormCard.classList.remove('mobile-subtab-hidden');
      if (dom.tab1HistoryCard) dom.tab1HistoryCard.classList.add('mobile-subtab-hidden');
      if (dom.tab2FormCard) dom.tab2FormCard.classList.remove('mobile-subtab-hidden');
      if (dom.tab2HistoryCard) dom.tab2HistoryCard.classList.add('mobile-subtab-hidden');
    }
  }

  // -------------------------------------------------------------------
  // 15. REAL-TIME CLOUD SYNC ENGINE (Firebase Firestore)
  // -------------------------------------------------------------------
  const STORAGE_KEY_FIREBASE_CFG = 'shifttrack_firebase_cfg_v3';
  const STORAGE_KEY_SYNC_UID = 'shifttrack_sync_uid_v3';
  const STORAGE_KEY_LAST_SYNC = 'shifttrack_last_sync_time';

  let firestoreDb = null;
  let firestoreUnsubscribe = null;
  let isSyncingToCloud = false;

  function parseFirebaseConfig(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      const cfg = {};
      const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      keys.forEach(k => {
        const match = raw.match(new RegExp(`${k}\\s*:\\s*["']([^"']+)["']`));
        if (match) cfg[k] = match[1];
      });
      if (cfg.apiKey && cfg.projectId) return cfg;
      return null;
    }
  }

  function initCloudSync() {
    // 1. Check if URL hash has cloud sync payload (from phone 1-tap link)
    if (window.location.hash && window.location.hash.includes('cloud_sync=')) {
      try {
        const payloadStr = decodeURIComponent(window.location.hash.split('cloud_sync=')[1]);
        const payload = JSON.parse(atob(payloadStr));
        if (payload && payload.cfg && payload.uid) {
          localStorage.setItem(STORAGE_KEY_FIREBASE_CFG, JSON.stringify(payload.cfg));
          localStorage.setItem(STORAGE_KEY_SYNC_UID, payload.uid);
          history.replaceState(null, '', window.location.pathname + window.location.search);
          showToast('🎉 Connected to Cloud Sync via 1-Tap Link!');
        }
      } catch (err) {
        console.warn('Could not parse cloud sync link:', err);
      }
    }

    const savedCfgStr = localStorage.getItem(STORAGE_KEY_FIREBASE_CFG);
    if (!savedCfgStr || typeof firebase === 'undefined') {
      updateCloudSyncUI(false);
      return;
    }

    try {
      const cfg = JSON.parse(savedCfgStr);
      if (!cfg.apiKey || !cfg.projectId) {
        updateCloudSyncUI(false);
        return;
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      firestoreDb = firebase.firestore();

      let syncUid = localStorage.getItem(STORAGE_KEY_SYNC_UID);
      if (!syncUid) {
        syncUid = 'main';
        localStorage.setItem(STORAGE_KEY_SYNC_UID, syncUid);
      }

      updateCloudSyncUI(true, cfg.projectId, syncUid);

      // Listen for real-time changes
      if (firestoreUnsubscribe) firestoreUnsubscribe();
      firestoreUnsubscribe = firestoreDb.collection('shifttrack_sync').doc(syncUid).onSnapshot((docSnapshot) => {
        if (isSyncingToCloud) return;
        if (docSnapshot.exists) {
          const remote = docSnapshot.data();
          if (remote && remote.updatedAt) {
            const localSyncTime = parseInt(localStorage.getItem(STORAGE_KEY_LAST_SYNC) || '0', 10);
            if (remote.updatedAt > localSyncTime) {
              if (Array.isArray(remote.shifts)) {
                const existingMap = new Map(shifts.map(s => [s.id, s]));
                remote.shifts.forEach(s => existingMap.set(s.id, s));
                shifts = Array.from(existingMap.values());
                localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
              }
              if (Array.isArray(remote.settlements)) {
                const existingSetMap = new Map(settlements.map(st => [st.id, st]));
                remote.settlements.forEach(st => existingSetMap.set(st.id, st));
                settlements = Array.from(existingSetMap.values());
                localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
              }
              if (remote.settings) {
                settings = { ...settings, ...remote.settings };
                localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
              }
              localStorage.setItem(STORAGE_KEY_LAST_SYNC, remote.updatedAt.toString());
              updateUI();
              showToast('⚡ Live Sync: Synced with your other device!');
            }
          }
        }
      }, (err) => {
        console.warn('Firestore snapshot listener error:', err);
      });
    } catch (err) {
      console.error('Firebase init error:', err);
      updateCloudSyncUI(false);
    }
  }

  function syncLocalToCloud() {
    if (!firestoreDb) return;
    const syncUid = localStorage.getItem(STORAGE_KEY_SYNC_UID);
    if (!syncUid) return;

    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
    isSyncingToCloud = true;

    firestoreDb.collection('shifttrack_sync').doc(syncUid).set({
      shifts,
      settlements,
      settings,
      updatedAt: now
    }, { merge: true }).then(() => {
      setTimeout(() => { isSyncingToCloud = false; }, 600);
    }).catch(err => {
      isSyncingToCloud = false;
      console.warn('Cloud sync push error:', err);
    });
  }

  function updateCloudSyncUI(isConnected, projectId = '', syncUid = '') {
    if (!dom.cloudSyncStatusBadge) return;
    if (isConnected) {
      dom.cloudSyncStatusBadge.textContent = '🟢 Active';
      dom.cloudSyncStatusBadge.className = 'cs-badge cs-badge-online';
      dom.cloudSyncSetupBox.classList.add('hidden');
      dom.cloudSyncActiveBox.classList.remove('hidden');
      if (dom.cloudSyncProjectName) {
        dom.cloudSyncProjectName.textContent = `Project: ${projectId} • ID: ${syncUid.substring(0, 8)}...`;
      }
      if (dom.cloudSyncPhoneLink) {
        const savedCfg = JSON.parse(localStorage.getItem(STORAGE_KEY_FIREBASE_CFG) || '{}');
        const payload = btoa(JSON.stringify({ cfg: savedCfg, uid: syncUid }));
        const baseHref = window.location.origin + window.location.pathname;
        dom.cloudSyncPhoneLink.value = `${baseHref}#cloud_sync=${encodeURIComponent(payload)}`;
      }
    } else {
      dom.cloudSyncStatusBadge.textContent = 'Local Only';
      dom.cloudSyncStatusBadge.className = 'cs-badge cs-badge-offline';
      dom.cloudSyncSetupBox.classList.remove('hidden');
      dom.cloudSyncActiveBox.classList.add('hidden');
    }
  }

  // Bind Cloud Sync UI buttons
  if (dom.btnConnectCloud) {
    dom.btnConnectCloud.addEventListener('click', () => {
      const raw = dom.firebaseConfigInput.value.trim();
      const cfg = parseFirebaseConfig(raw);
      if (!cfg || !cfg.apiKey || !cfg.projectId) {
        alert('Please paste a valid Firebase configuration containing at least apiKey and projectId.');
        return;
      }
      localStorage.setItem(STORAGE_KEY_FIREBASE_CFG, JSON.stringify(cfg));
      initCloudSync();
      syncLocalToCloud();
      showToast('☁️ Real-Time Cloud Sync connected!');
    });
  }

  if (dom.btnCopyPhoneLink) {
    dom.btnCopyPhoneLink.addEventListener('click', () => {
      if (!dom.cloudSyncPhoneLink.value) return;
      navigator.clipboard.writeText(dom.cloudSyncPhoneLink.value).then(() => {
        showToast('📋 Copied 1-Tap Phone Sync link to clipboard!');
      }).catch(() => {
        dom.cloudSyncPhoneLink.select();
        document.execCommand('copy');
        showToast('📋 Copied link!');
      });
    });
  }

  if (dom.btnForceCloudPush) {
    dom.btnForceCloudPush.addEventListener('click', () => {
      syncLocalToCloud();
      showToast('☁️ Pushed all local shifts to Cloud!');
    });
  }

  if (dom.btnForceCloudPull) {
    dom.btnForceCloudPull.addEventListener('click', () => {
      const syncUid = localStorage.getItem(STORAGE_KEY_SYNC_UID);
      if (!firestoreDb || !syncUid) return;
      firestoreDb.collection('shifttrack_sync').doc(syncUid).get().then(docSnapshot => {
        if (docSnapshot.exists) {
          const remote = docSnapshot.data();
          if (remote) {
            if (remote.shifts) shifts = remote.shifts;
            if (remote.settlements) settlements = remote.settlements;
            if (remote.settings) settings = { ...settings, ...remote.settings };
            localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
            localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
            updateUI();
            showToast('📥 Pulled latest shifts from Cloud!');
          }
        } else {
          showToast('No cloud data found yet. Pushing current shifts...');
          syncLocalToCloud();
        }
      });
    });
  }

  if (dom.btnDisconnectCloud) {
    dom.btnDisconnectCloud.addEventListener('click', () => {
      if (confirm('Disconnect Cloud Sync? Your local shifts will remain safe on this device.')) {
        if (firestoreUnsubscribe) firestoreUnsubscribe();
        localStorage.removeItem(STORAGE_KEY_FIREBASE_CFG);
        localStorage.removeItem(STORAGE_KEY_SYNC_UID);
        updateCloudSyncUI(false);
        showToast('Cloud Sync disconnected.');
      }
    });
  }

  // -------------------------------------------------------------------
  // 16. INITIALIZATION
  // -------------------------------------------------------------------
  function init() {
    applyTheme(theme);
    dom.shiftDate.value = getTodayString();
    updateShiftDurationCalculation();
    setupMobileSubtabs();
    updateUI();
    initCloudSync();
  }

  init();

})();

