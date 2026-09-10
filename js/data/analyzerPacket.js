/**
 * Analyzer packet report data — demo figures transcribed from the reference
 * screens. `{customer}` is replaced with the packet's customer at render, so
 * the report reads as one record end to end.
 */
(function (DA) {
  'use strict';

  DA.data = DA.data || {};

  /** Figures behind the comparison band, one set per scenario. */
  DA.data.scenarioFigures = {
    Current: {
      adv: '17313.0',
      baseFrtDisc: '51.3%',
      totalDisc: '55.9%',
      rpp: '$ 12.41',
      revenue: '$ 1,074,292',
      or: '0.98',
      profit: '$ 26,111'
    },
    'Scenario 1': {
      adv: '17340.2',
      baseFrtDisc: '50.9%',
      totalDisc: '55.5%',
      rpp: '$ 12.57',
      revenue: '$ 1,095,226',
      or: '0.97',
      profit: '$ 37,273'
    }
  };

  DA.data.comparisonKeys = ['adv', 'baseFrtDisc', 'totalDisc', 'rpp', 'revenue', 'or', 'profit'];

  /** Sample choices for the report filters. */
  DA.data.filterOptions = {
    revenueBasis: ['All', 'Freight Only', 'Accessorial Only', 'Net Revenue'],
    costBasis: ['Fully Allocated Cost', 'Marginal Cost', 'Direct Cost'],
    incentiveMethod: ['Cell-by-cell', 'Base/Zone', 'Custom Net Rate'],
    service: ['All', 'Next Day Air', 'Next Day Air Saver', '2nd Day Air', 'Ground', 'Ground Saver'],
    accessorial: ['All', 'Fuel Surcharge', 'Delivery Area', 'Additional Handling', 'Return Labels'],
    accountSuffix: ['MAIN', 'EAST', 'WEST']
  };

  /**
   * The Analyzer > Services-through-Weight & Cube Filters drawer's own
   * option trees/lists, per the client's reference screenshots. Choose
   * Account and Choose Service both go one level deeper than what's
   * actually visible there: Opportunity PLD (Choose Account) and Ground/
   * Export/Import (Choose Service) all show their own expand chevron in
   * the screenshots but with contents not given, so each is kept as a
   * plain selectable item carrying just the badge/count the screenshot
   * shows, rather than an invented sub-tree under it. Choose Accessorial
   * reuses filterOptions.accessorial above rather than a second, separate
   * list. Choose Service Feature Code and Choose Movement Direction Code
   * aren't in any reference screenshot yet -- both start with only the
   * drawer's own default "All" until the client supplies their real
   * option lists.
   */
  DA.data.filterAccountTree = [
    {
      label: 'HORMEL 2024',
      children: [
        {
          label: 'No Sub Parent',
          children: [
            { label: '0000067577 - APPLEGATE FARMS' }
          ]
        }
      ]
    },
    { label: 'Opportunity PLD' }
  ];

  DA.data.filterServiceTree = [
    {
      label: 'Domestic',
      badge: '2 Groups',
      children: [
        {
          label: 'Air',
          badge: '4',
          children: [
            { label: 'Next Day Air (1DA)', badge: '6' },
            { label: 'Next Day Air Saver (1DP)', badge: '6' },
            { label: '2nd Day Air (2DA)', badge: '6' },
            { label: '3 Day Select (3DS)', badge: '6' }
          ]
        },
        { label: 'Ground', badge: '1' }
      ]
    },
    { label: 'Export', badge: '2 Groups' },
    { label: 'Import', badge: '2 Groups' }
  ];

  DA.data.filterContainerTypes = ['Package', 'DOC', 'PAK', 'PAL'];

  /**
   * Choose Accessorial's own list for the Filters drawer -- distinct from
   * filterOptions.accessorial above (that one feeds the flat Accessorial
   * select elsewhere and carries a different, shorter set of names); this
   * is the client's own reference screenshot for this drawer specifically.
   */
  DA.data.filterAccessorialTypes = [
    'Fuel Surcharge',
    'Transportation Charges',
    'Pickup and Delivery',
    'Returns',
    'Other Charges',
    'Customs Brokerage'
  ];

  DA.data.filterServiceFeatureCodes = [
    'SCR - Single Piece Residential (Non-Blended Rate)',
    'SPB - Single Piece Business (Commercial)',
    'STC - Single Piece Residential Third Party (Non-Blended Rate)',
    'STP - Single Piece Business (Commercial) Third Party',
    'GFC - World Ease Multi-Piece Freight Collect',
    'GPB - World Ease Multi-Piece Prepaid',
    'MPB - Multi-Piece Prepaid'
  ];

  DA.data.filterMovementDirectionCodes = ['Domestic', 'Export', 'Import'];

  /**
   * Differences between two scenarios, keyed "from|to". These come from the
   * source rather than being recomputed here: the figures above are rounded for
   * display, so subtracting them lands a unit off on Total Disc and Profit.
   */
  DA.data.scenarioDifferences = {
    'Current|Scenario 1': {
      adv: '27.2',
      baseFrtDisc: '-0.4%',
      totalDisc: '-0.5%',
      rpp: '$ 0.16',
      revenue: '$ 20,934',
      or: '-0.01',
      profit: '$ 11,161'
    }
  };

  /* ---- Summary tab -------------------------------------------------------- */

  /**
   * Scales a formatted comparison figure ("$ 2,914.29", "0.0%", "0.98",
   * "-") by `factor`, preserving its own $ / % and decimal precision --
   * used to derive Scenario 1's own figures from Current's below, so the
   * Comparisons tab's Change column has a real (not universally "--")
   * delta to show on every row without hand-typing a second full row set.
   * "-" (a placeholder cell, not a real figure) passes through unscaled.
   */
  function scaleFigure(raw, factor) {
    if (raw === '-') return raw;
    var match = /^(\$\s*)?(-?[\d,]+(?:\.\d+)?)\s*(%)?$/.exec(raw);
    if (!match) return raw;
    var number = parseFloat(match[2].replace(/,/g, '')) * factor;
    var decimals = (match[2].split('.')[1] || '').length;
    var fixed = number.toFixed(decimals);
    var negative = fixed.charAt(0) === '-';
    if (negative) fixed = fixed.slice(1);
    var grouped = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (match[1] || '') + (negative ? '-' : '') + grouped + (match[3] || '');
  }

  /**
   * Applies a per-metric scale factor (adv/rpp/annRev/profit up, or down --
   * baseFrt/totalDisc left alone, since they're 0.0% on nearly every row
   * already and scaling zero by anything is still zero) to every row of a
   * comparisonSummaryTree(), recursively through `children` -- Scenario 1's
   * own version of Current's tree, not a second hand-typed copy.
   */
  var SCENARIO_1_SCALE = { adv: 1.03, rpp: 1.02, annRev: 1.025, or: 0.97, profit: 1.18 };

  function scaledSummaryTree(rows, scale) {
    return rows.map(function (row) {
      var scaled = Object.assign({}, row);
      Object.keys(scale).forEach(function (key) {
        if (scaled[key] != null) scaled[key] = scaleFigure(scaled[key], scale[key]);
      });
      if (row.children) scaled.children = scaledSummaryTree(row.children, scale);
      return scaled;
    });
  }

  /**
   * Canonical core-service order the client specified: by movement
   * (Domestic / Export / Import -- the N- / E- / I- label prefix), then
   * mode (Air before Ground), then a fixed service sequence within each.
   * coreServiceRank() turns any core-service label into a sortable number
   * so every list of these rows -- the Comparisons summary tree and the
   * Analyzer > Services table -- reads in the same hierarchy rather than
   * whatever order the figures were transcribed in. A service the client
   * didn't name sorts to the end of its own movement, in its original
   * order (Array.prototype.sort is stable).
   *
   * Air ranks 1-49, Ground 50-99; the more specific label wins, so the
   * regex list is ordered longest-match-first ("next day air saver"
   * before "next day air", "worldwide express saver"/"...freight midday"
   * before the bare "worldwide express" catch-all).
   */
  var CORE_SERVICE_RANKS = [
    // Domestic Air (shared sequence with international Air below)
    [/next day air early/, 1],
    [/next day air saver/, 3],
    [/next day air/, 2],
    [/2nd day air\s*a\.?\s*m\.?/, 4],
    [/2nd day air/, 5],
    [/3 day select/, 6],
    // International Air
    [/worldwide express freight midday/, 14],
    [/worldwide express freight/, 15],
    [/worldwide express midday/, 14],
    [/worldwide express saver/, 12],
    [/worldwide express plus/, 18],
    [/worldwide express/, 11],
    [/worldwide saver/, 13],
    [/worldwide expedited/, 16],
    [/worldwide economy ddp/, 20],
    [/worldwide economy ddu/, 21],
    [/import express saver/, 23],
    [/import express/, 22],
    // Domestic Ground -- the two weight-split Ground Saver rows sit right
    // after the plain one, heavier band first (> 1lb before < 1lb). Old
    // "SurePost 1 lb & Over" / "SurePost Under 1 lb" labels map to the
    // same two slots in case any other list still uses them.
    [/ground saver.*(>|over)|surepost.*(1 lb|over)/, 53],
    [/ground saver.*(<|under)|surepost.*(under|less)/, 54],
    [/ground saver/, 52],
    [/ground/, 51],
    // International Ground
    [/standard (to|from) canada/, 60],
    [/standard (to|from) mexico/, 61],
    [/standard/, 62]
  ];

  var MOVEMENT_RANK = { N: 0, E: 1, I: 2 };

  function coreServiceRank(label) {
    var s = String(label == null ? '' : label).trim();
    var movement = 3;
    var prefix = /^([NEI])-\s*/.exec(s);
    if (prefix) {
      movement = MOVEMENT_RANK[prefix[1]];
      s = s.slice(prefix[0].length);
    }
    var lower = s.toLowerCase();
    for (var i = 0; i < CORE_SERVICE_RANKS.length; i++) {
      if (CORE_SERVICE_RANKS[i][0].test(lower)) {
        return movement * 1000 + CORE_SERVICE_RANKS[i][1];
      }
    }
    return movement * 1000 + 900;
  }

  /** A row's core-service label, from whichever key it uses -- `label` in
      the summary tree, `service` / `serviceLabel` in the Analyzer tables. */
  function coreServiceLabelOf(row) {
    return row.label || row.serviceLabel || row.service || '';
  }

  function isSubtotalRow(row) {
    return /^(sub-?total|total)$/i.test(String(coreServiceLabelOf(row)).trim());
  }

  /** Comparator: orders two core-service rows by coreServiceRank(). */
  function byCoreServiceRow(a, b) {
    return coreServiceRank(coreServiceLabelOf(a)) - coreServiceRank(coreServiceLabelOf(b));
  }

  /** Sorts core-service rows by coreServiceRank(), keeping any Sub-total /
      Total row pinned at the top of its group. */
  function sortByCoreService(rows) {
    var pinned = rows.filter(isSubtotalRow);
    var rest = rows.filter(function (r) { return !isSubtotalRow(r); });
    rest.sort(byCoreServiceRow);
    return pinned.concat(rest);
  }

  DA.data.coreServiceRank = coreServiceRank;

  /**
   * Analyzer > Comparisons row hierarchy, as of the row-header/hierarchy-only
   * update: Total, an Unincented PLD group (broken out by individual
   * service/lane), and a Hormel 2024 group (its own Sub-total, no further
   * children given). Current and Scenario 1 share the same row structure
   * (labels, hierarchy) so the two panels line up row for row -- a fresh
   * array per call (not one array shared by both panels) since each
   * panel's own DataTable tracks its row-expanded state by row-object
   * identity -- but Scenario 1's own figures are SCENARIO_1_SCALE's scaled
   * version of Current's (see packetSummaryTrees below), not identical
   * copies, so Comparisons' own Change column has real deltas to show.
   *
   * Unincented PLD keeps only its own Sub-total plus 3 lanes (N-3 Day
   * Select, E-/I-Standard to Canada); the other 11 lanes that used to sit
   * under it move down into Hormel 2024's own children instead, after its
   * existing Sub-total -- per explicit request, so Unincented PLD's own
   * group doesn't dominate the table with every lane while Hormel 2024
   * shows just one. This is the only tree shape either Comparisons option
   * or either scenario panel renders -- moving the rows here moves them
   * everywhere at once.
   */
  function comparisonSummaryTree() {
    var tree = [
      { label: 'Total', total: true, adv: '198.8', baseFrt: '0.1%', totalDisc: '0.0%', rpp: '$ 2,859.09', annRev: '$ 147,780,476', or: '0.98', profit: '$ 2,955,610' },
      {
        label: 'Unincented PLD',
        expanded: true,
        adv: '195.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 2,914.29', annRev: '$ 147,754,284', or: '0.98', profit: '$ 2,955,086',
        children: [
          { label: 'Sub-total', adv: '-', baseFrt: '-', totalDisc: '-', rpp: '$ 2,914.29', annRev: '$ 147,754,284', or: '0.98', profit: '$ 2,955,086' },
          { label: 'N-3 Day Select', adv: '85.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 3,389.67', annRev: '$ 74,911,779', or: '0.91', profit: '$ 6,742,060' },
          { label: 'E-Standard to Canada', adv: '10.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 2.64', annRev: '$ 6,864', or: '1.15', profit: '$ -1,030' },
          { label: 'I-Standard from Canada', adv: '2.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 6.60', annRev: '$ 3,432', or: '1.20', profit: '$ -686' }
        ]
      },
      {
        label: 'Hormel 2024',
        expanded: true,
        adv: '3.8', baseFrt: '70.3%', totalDisc: '64.6%', rpp: '$ 26.51', annRev: '$ 26,191', or: '0.64', profit: '$ 9,429',
        children: [
          { label: 'Sub-total', adv: '-', baseFrt: '-', totalDisc: '-', rpp: '$ 26.51', annRev: '$ 26,191', or: '0.64', profit: '$ 9,429' },
          { label: 'N-Ground', adv: '4.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 2,982.32', annRev: '$ 3,101,612', or: '0.88', profit: '$ 372,193' },
          { label: 'E-Worldwide Express Saver', adv: '42.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 3,800.87', annRev: '$ 41,505,464', or: '0.93', profit: '$ 2,905,382' },
          { label: 'I-Worldwide Express Saver', adv: '4.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 3,596.00', annRev: '$ 3,739,840', or: '0.82', profit: '$ 673,171' },
          { label: 'E-Worldwide Express Midday', adv: '10.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 2,828.40', annRev: '$ 7,353,840', or: '0.95', profit: '$ 367,692' },
          { label: 'I-Worldwide Express Midday', adv: '2.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 7,552.70', annRev: '$ 3,927,404', or: '0.79', profit: '$ 824,755' },
          { label: 'E-Worldwide Express', adv: '10.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 96.78', annRev: '$ 251,628', or: '1.05', profit: '$ -12,581' },
          { label: 'I-Worldwide Express', adv: '2.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 9,617.90', annRev: '$ 5,001,308', or: '0.86', profit: '$ 700,183' },
          { label: 'E-Worldwide Expedited', adv: '10.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 96.78', annRev: '$ 251,628', or: '1.05', profit: '$ -12,581' },
          { label: 'I-Worldwide Expedited', adv: '2.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 13,721.90', annRev: '$ 7,135,388', or: '0.83', profit: '$ 1,213,016' },
          { label: 'E-Standard to Mexico', adv: '10.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 2.64', annRev: '$ 6,864', or: '1.15', profit: '$ -1,030' },
          { label: 'I-Standard from Mexico', adv: '2.0', baseFrt: '0.0%', totalDisc: '0.0%', rpp: '$ 1,071.60', annRev: '$ 557,232', or: '0.97', profit: '$ 16,717' }
        ]
      }
    ];
    // Each group's own lanes read in the client's core-service hierarchy
    // (Domestic then Export then Import, Air before Ground, fixed order
    // within) rather than transcription order -- Sub-total stays pinned
    // at the top of its group. scaledSummaryTree() below preserves this
    // order for the Scenario 1 panel.
    tree.forEach(function (row) {
      if (row.children) row.children = sortByCoreService(row.children);
    });
    return tree;
  }

  DA.data.packetSummaryTrees = {
    Current: comparisonSummaryTree(),
    'Scenario 1': scaledSummaryTree(comparisonSummaryTree(), SCENARIO_1_SCALE)
  };

  /* ---- Shipping Profiles tab ---------------------------------------------- */

  /*
   * Cost Details, Zones and Weight & Cube all list the same core
   * services as the Services tab, in the same order -- built from
   * DA.data.packetServices (below) rather than three hand-typed sets.
   * The assignments live just after packetServices.
   */

  /**
   * Analyzer > Charges' own Gross RPP / Net RPP / Profit / OR columns --
   * missing entirely until the client's own reference screenshot called
   * them out, added here the same way Services' own Total set was
   * (withTotalMetrics() above): derived from each row's existing
   * Gross Revenue/Net Revenue/Total Units/Discount rather than a second
   * hand-typed set. Gross/Net RPP are the same rate-per-unit relationship
   * Services' own baseRpp already uses (revenue / units); OR is a
   * plausible per-row ratio scaled off how deeply that row is discounted
   * (0% off reads as a lean 0.30 operating ratio, 100% off would read as
   * a lossy 1.20 -- nothing in this row shape gives a real cost figure to
   * derive OR from directly, the way it does exist for Services), and
   * Profit follows from Net Revenue and that OR the same way Services'
   * own profit/OR pairing already roughly holds (profit ~= netRevenue x
   * (1 - OR)). Applied recursively (a charge's own children carry the
   * same 4 fields too, not just its top-level rows).
   */
  function withAccessorialMetrics(row) {
    var gross = parseFigureNumber(row.grossRevenue);
    var net = parseFigureNumber(row.netRevenue);
    var discPct = parseFigureNumber(row.discount);
    var units = parseFloat(String(row.totalUnits).replace(/,/g, '')) || 0;

    var grossRppNum = units > 0 ? gross.number / units : 0;
    var netRppNum = units > 0 ? net.number / units : 0;
    var orNum = 0.30 + (discPct ? discPct.number / 100 : 0) * 0.9;
    var profitNum = net.number * (1 - orNum);

    var mapped = Object.assign({}, row, {
      grossRpp: '$ ' + grossRppNum.toFixed(2),
      netRpp: '$ ' + netRppNum.toFixed(2),
      profit: formatFigureNumber(profitNum, net),
      or: orNum.toFixed(2)
    });
    if (row.children) mapped.children = row.children.map(withAccessorialMetrics);
    return mapped;
  }

  /**
   * Accessorial charges: a parent total over the services that incurred it.
   * Row headers/hierarchy taken from the client's reference screenshot
   * (Analyzer > Charges update). Two rows -- Additional Handling Packaging
   * and Delivery Area Commercial -- show broken-out children there; every
   * other row is collapsed in that screenshot with its contents not shown,
   * so it's kept as a leaf here rather than inventing unseen child rows.
   * Units/ADU/Discount figures are placeholders (the screenshot's own
   * Discount column was cut off and unreadable), formatted to match this
   * table's existing convention (no thousands separators on Units/ADU,
   * "$ #,###.00" on revenue, one-decimal "%") rather than the screenshot's.
   * Each row (and its own children, if any) runs through
   * withAccessorialMetrics() below for Gross RPP/Net RPP/Profit/OR.
   */
  DA.data.shippingProfileAccessorial = [
    {
      type: 'Fuel Surcharge',
      group: 'Fuel Surcharge',
      detail: 'Fuel Surcharge',
      totalUnits: '17888.0', pctTotalVolume: '97.2%', adu: '596.3',
      grossRevenue: '$ 65,904,390.00', netRevenue: '$ 65,903,160.00', discount: '0.0%'
    },
    {
      type: 'Transportation Charges',
      group: 'Additional Handling',
      detail: 'Additional Handling Packaging',
      expanded: true,
      totalUnits: '9360.0', pctTotalVolume: '18.1%', adu: '312.0',
      grossRevenue: '$ 340,236.00', netRevenue: '$ 340,236.00', discount: '0.0%',
      children: [
        { type: '', group: '', detail: 'Worldwide Express Saver', totalUnits: '6760.0', pctTotalVolume: '13.1%', adu: '225.3', grossRevenue: '$ 245,726.00', netRevenue: '$ 245,726.00', discount: '0.0%' },
        { type: '', group: '', detail: 'Worldwide Express Midday', totalUnits: '2600.0', pctTotalVolume: '5.0%', adu: '260.0', grossRevenue: '$ 94,510.00', netRevenue: '$ 94,510.00', discount: '0.0%' }
      ]
    },
    {
      type: 'Transportation Charges',
      group: 'Delivery Area',
      detail: 'Delivery Area Commercial',
      expanded: true,
      totalUnits: '104.0', pctTotalVolume: '0.6%', adu: '10.4',
      grossRevenue: '$ 468.00', netRevenue: '$ 210.00', discount: '55.0%',
      children: [
        { type: '', group: '', detail: 'Next Day Air Saver', totalUnits: '26.0', pctTotalVolume: '0.1%', adu: '2.6', grossRevenue: '$ 117.00', netRevenue: '$ 53.00', discount: '55.0%' },
        { type: '', group: '', detail: '2nd Day Air', totalUnits: '26.0', pctTotalVolume: '0.1%', adu: '2.6', grossRevenue: '$ 117.00', netRevenue: '$ 53.00', discount: '55.0%' },
        { type: '', group: '', detail: 'Ground', totalUnits: '52.0', pctTotalVolume: '0.3%', adu: '5.2', grossRevenue: '$ 234.00', netRevenue: '$ 105.00', discount: '55.0%' }
      ]
    },
    {
      type: 'Transportation Charges',
      group: 'Delivery Area',
      detail: 'Delivery Area Residential',
      totalUnits: '260.0', pctTotalVolume: '1.4%', adu: '26.0',
      grossRevenue: '$ 681.00', netRevenue: '$ 307.00', discount: '55.0%'
    },
    {
      type: 'Transportation Charges',
      group: 'Large Package',
      detail: 'Large Package Commercial',
      totalUnits: '29380.0', pctTotalVolume: '56.8%', adu: '1469.0',
      grossRevenue: '$ 7,748,780.00', netRevenue: '$ 7,748,780.00', discount: '0.0%'
    },
    {
      type: 'Transportation Charges',
      group: 'Over Maximum Limits',
      detail: 'Over Max Weight Surcharge',
      totalUnits: '19240.0', pctTotalVolume: '37.2%', adu: '1924.0',
      grossRevenue: '$ 36,075,000.00', netRevenue: '$ 36,075,000.00', discount: '0.0%'
    },
    {
      type: 'Transportation Charges',
      group: 'Residential Surcharge',
      detail: 'Residential Surcharge',
      totalUnits: '9620.0', pctTotalVolume: '52.3%', adu: '320.7',
      grossRevenue: '$ 65,910.00', netRevenue: '$ 63,047.00', discount: '4.5%'
    },
    {
      type: 'Other Charges',
      group: 'Other Charges',
      detail: 'Address Correction',
      totalUnits: '26.0', pctTotalVolume: '0.1%', adu: '2.6',
      grossRevenue: '$ 656.00', netRevenue: '$ 328.00', discount: '50.0%'
    },
    {
      type: 'Other Charges',
      group: 'Other Charges',
      detail: 'Third Party Billing Service',
      totalUnits: '520.0', pctTotalVolume: '2.8%', adu: '52.0',
      grossRevenue: '$ 427.00', netRevenue: '$ 171.00', discount: '60.0%'
    }
  ].map(withAccessorialMetrics);

  /* ---- Pricing terms tab -------------------------------------------------- */

  /**
   * Region > mode > service, as the service incentive plans are grouped --
   * Domestic/Export/Import each carrying their own real Air/Ground modes
   * now, per the client's own exact hierarchy (Export and Import used to
   * be header-only placeholders with no children of their own).
   *
   * Export's and Import's own Air leaves and Ground leaves share the
   * same labels across both regions (e.g. "WorldwideExpress" under both,
   * "StandardtoCanada" under both) -- left as plain `{ label }` nodes
   * (no explicit `value`) like every other node here, same as the
   * pre-existing tree. Confirmed this is safe before relying on it: every
   * click path (planSidebar's own select(), TreeSelectField's own
   * choose()) matches a row to its own leaf object by identity
   * (`entry.leaf === leaf`), not by value/label text, so two rows
   * sharing a label never cross-select each other. The one place a value
   * string IS compared (TreeSelectField's initial `currentLeaf` lookup)
   * only ever runs against firstLeaf(tree)'s own value, which is always
   * Domestic's first Air leaf -- unique, never one of these later
   * duplicates.
   */
  DA.data.pricingServiceTree = [
    {
      label: 'Domestic',
      children: [
        {
          label: 'Air',
          children: [
            { label: 'Next Day Air Early' },
            { label: 'Next Day Air' },
            { label: 'Next Day Air Saver' },
            { label: '2nd Day Air A.M.' },
            { label: '2nd Day Air' },
            { label: '3 Day Select' }
          ]
        },
        {
          label: 'Ground',
          children: [
            { label: 'Ground' },
            { label: 'Ground Saver>1' },
            { label: 'Ground Saver<1' }
          ]
        }
      ]
    },
    {
      label: 'Export',
      children: [
        {
          label: 'Air',
          children: [
            { label: 'WorldwideExpress' },
            { label: 'WorldwideSaver' },
            { label: 'WorldwideExportExpress Freight Midday' },
            { label: 'WorldwideExportExpress Freight' },
            { label: 'WorldwideExpedited' },
            { label: 'Worldwide Express Plus' }
          ]
        },
        {
          label: 'Ground',
          children: [
            { label: 'StandardtoCanada' },
            { label: 'StandardtoMexico' }
          ]
        }
      ]
    },
    {
      label: 'Import',
      children: [
        {
          label: 'Air',
          children: [
            { label: 'WorldwideExpress' },
            { label: 'WorldwideSaver' },
            { label: 'WorldwideImportExpress Freight Midday' },
            { label: 'WorldwideImportExpress Freight' },
            { label: 'WorldwideExpedited' },
            { label: 'Worldwide Express Plus' }
          ]
        },
        {
          label: 'Ground',
          children: [
            { label: 'StandardtoCanada' },
            { label: 'StandardtoMexico' }
          ]
        }
      ]
    }
  ];

  /** Zone columns and weight bands behind a service's incentive grid. */
  DA.data.rateZones = ['2', '3', '4', '5', '6', '7', '8', '44', '45', '46'];

  /** The Cell-by-cell method's own, smaller zone set (zero-padded, as the
      reference screen shows them -- distinct from rateZones' un-padded
      codes, which the Custom Net Rate method reuses instead). */
  DA.data.weightBreakZones = ['002', '003', '004', '005', '006', '007', '008'];

  /**
   * The last band ("51+") carries no `to` -- an open-ended top band, per
   * the client's reference screenshot, whose own empty cell is where
   * "Add weight break band" seats its new editable boundary (see
   * weightBreakGrid() in js/views/pricingTerms.js).
   */
  DA.data.weightBreaks = [
    { from: '1', to: '5', rate: '23.2%' },
    { from: '6', to: '10', rate: '27.2%' },
    { from: '11', to: '20', rate: '32.2%' },
    { from: '21', to: '40', rate: '32.5%' },
    { from: '41', to: '50', rate: '31.2%' },
    { from: '51+', to: '', rate: '31.1%' }
  ];

  /**
   * Base/Zone method: a flat zone/ADV/incentive-amount table, no weight
   * bands -- the incentive is set once per zone rather than varying by
   * billable weight.
   */
  DA.data.baseZoneIncentives = [
    { zone: '401', adv: '0.51', incentiveAmount: '25.00%' },
    { zone: '402', adv: '0.00', incentiveAmount: '14.50%' },
    { zone: '403', adv: '0.02', incentiveAmount: '4.50%' },
    { zone: '404', adv: '0.38', incentiveAmount: '4.50%' },
    { zone: '405', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '406', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '407', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '409', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '411', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '412', adv: '0.03', incentiveAmount: '4.50%' },
    { zone: '413', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '420', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '421', adv: '0.00', incentiveAmount: '4.50%' },
    { zone: '481', adv: '5.31', incentiveAmount: '4.50%' },
    { zone: '482', adv: '2.43', incentiveAmount: '4.50%' },
    { zone: '484', adv: '0.00', incentiveAmount: '45.00%' }
  ];

  /**
   * Custom Net Rate method: a $ rate per billable weight (1 lb at a time,
   * not banded) and zone -- uploaded from a template rather than set as a
   * percentage, so every cell is a flat, non-editable figure. Keyed by
   * rateZones' own zone codes.
   */
  DA.data.customNetRateRows = [
    { weight: '1', rates: { '2': '$6.22', '3': '$6.22', '4': '$6.22', '5': '$6.22', '6': '$6.22', '7': '$6.22', '8': '$6.22', '44': '$15.22', '45': '$15.18', '46': '$20.05' } },
    { weight: '2', rates: { '2': '$0.00', '3': '$0.00', '4': '$0.00', '5': '$0.00', '6': '$0.00', '7': '$0.00', '8': '$0.00', '44': '$16.93', '45': '$17.00', '46': '$21.77' } },
    { weight: '3', rates: { '2': '$0.00', '3': '$0.00', '4': '$0.00', '5': '$0.00', '6': '$6.25', '7': '$6.47', '8': '$6.79', '44': '$18.40', '45': '$19.38', '46': '$23.18' } },
    { weight: '4', rates: { '2': '$0.00', '3': '$0.00', '4': '$0.00', '5': '$6.35', '6': '$6.51', '7': '$6.94', '8': '$7.28', '44': '$20.20', '45': '$20.65', '46': '$25.14' } },
    { weight: '5', rates: { '2': '$0.00', '3': '$0.00', '4': '$0.00', '5': '$6.62', '6': '$6.90', '7': '$7.25', '8': '$7.70', '44': '$21.90', '45': '$22.41', '46': '$26.73' } },
    { weight: '6', rates: { '2': '$0.00', '3': '$0.00', '4': '$0.00', '5': '$6.65', '6': '$0.00', '7': '$7.28', '8': '$0.00', '44': '$23.64', '45': '$23.87', '46': '$27.76' } },
    { weight: '7', rates: { '2': '$0.00', '3': '$0.00', '4': '$6.33', '5': '$6.86', '6': '$7.03', '7': '$7.48', '8': '$7.99', '44': '$25.24', '45': '$25.69', '46': '$29.17' } },
    { weight: '8', rates: { '2': '$0.00', '3': '$0.00', '4': '$6.54', '5': '$7.05', '6': '$7.30', '7': '$7.77', '8': '$8.35', '44': '$26.22', '45': '$27.04', '46': '$30.79' } },
    { weight: '9', rates: { '2': '$0.00', '3': '$0.00', '4': '$6.57', '5': '$7.14', '6': '$7.47', '7': '$8.08', '8': '$8.79', '44': '$28.07', '45': '$28.91', '46': '$32.60' } }
  ];

  DA.data.flowThroughOptions = [
    'P/P Pre-Paid',
    'F/C Freight Collect',
    'T/P Third Party',
    'Return Service'
  ];

  DA.data.tierIncentive = {
    tier: 'Tier 1',
    meta: [
      { label: 'Basis', value: 'Gross Revenue' },
      { label: 'Rolling Avg', value: '52 Weeks' },
      { label: 'Modeled', value: '$481,401' }
    ],
    bands: [
      { modeled: '0.0%', low: '$0.01', high: '$249,999.99', locked: true },
      { modeled: '51.9%', low: '$250,000.00', high: '$289,999.99' },
      { modeled: '60.2%', low: '$290,000.00', high: '$329,999.99' },
      // The two bands nearest the target, and the target itself, are still
      // open for negotiation -- their service group rates stay editable.
      { modeled: '68.6%', low: '$330,000.00', high: '$359,999.99', ratesEditable: true },
      { modeled: '74.8%', low: '$360,000.00', high: '$444,999.99', ratesEditable: true },
      { modeled: '92.4%', low: '$445,000.00', high: '$9,999,999,999.99', target: true, ratesEditable: true }
    ],
    serviceGroups: [
      { name: 'UPS N-Next Day Air', sublabel: '-LTR FC PP TP', rates: ['0.0%', '72.1%', '76.3%', '76.7%', '78.7%', '79.0%'] },
      { name: 'UPS N-Next Day Air', sublabel: '-PKG-Hundredweight FC PP TP', rates: ['0.0%', '38.0%', '43.0%', '44.0%', '46.3%', '46.6%'] },
      { name: 'UPS N-Next Day Air', sublabel: '-PKG FC PP RS TP', rates: ['0.0%', '72.8%', '76.8%', '77.3%', '81.7%', '82.2%'] },
      { name: 'UPS N-Next Day Air Saver', sublabel: '-LTR FC PP TP', rates: ['0.0%', '72.9%', '77.0%', '77.4%', '79.4%', '79.6%'] },
      { name: 'UPS N-Next Day Air Saver', sublabel: '-PKG-Hundredweight FC PP TP', rates: ['0.0%', '38.0%', '43.0%', '44.0%', '46.3%', '46.6%'] }
    ]
  };

  /**
   * Accessorial incentive plans under pricing terms, grouped by charge
   * family the same way the service incentive plans are grouped by region
   * -- rebuilt to match the client's own reference hierarchy screenshots
   * (Fuel Surcharge / Transportation Charges / Pickup And Delivery /
   * Returns / Other Charges / Customs Brokerage as the six top-level
   * groups, each opening onto its own charge groups and leaves). Every
   * leaf now carries its own `incentives` rows (accessorialPlan() below
   * reads `node.incentives` from whichever leaf is open, instead of one
   * shared table for every leaf) -- Fuel Surcharge's nine rows and Early
   * Surcharge/Additional Handling Cubic Size/Length/Remote Area US48
   * Commercial's rows come straight from that reference; every other leaf
   * not shown expanded there reuses the same "ALL/ALL/ALL" single-row
   * shape confirmed on the leaves that were shown (Additional Handling's
   * own siblings, Remote Area's own Residential counterpart), with a
   * plausible incentive amount consistent with its family -- placeholder
   * figures, not sourced, the same convention packetAccounts already
   * documents for rows the reference doesn't spell out.
   */
  DA.data.pricingAccessorialTree = (function () {
    function leaf(label, incentives) {
      return { label: label, incentives: incentives };
    }
    function row(movement, mode, serviceGroup, service, adu, nrpp, incentiveAmount) {
      return {
        movement: movement, mode: mode, serviceGroup: serviceGroup, service: service,
        adu: adu, nrpp: nrpp, incentiveType: '% Off', incentiveAmount: incentiveAmount
      };
    }
    // The single-row shape most leaves open onto -- flat across every
    // lane rather than varying by service the way Fuel Surcharge does,
    // matching Additional Handling Cubic Size/Length's own confirmed row.
    function allLanesRow(incentiveAmount, movement) {
      return row(movement || 'Domestic', 'ALL', 'ALL', 'ALL', '0.00', '$0.00', incentiveAmount);
    }

    return [
      {
        label: 'Fuel Surcharge',
        incentives: [
          row('Domestic', 'Air', 'Next Day', 'Next Day Air Early', '0.04', '$77.98', '20.00%'),
          row('Domestic', 'Air', 'Next Day', 'Next Day Air', '1.56', '$33.34', '20.00%'),
          row('Domestic', 'Air', 'Next Day', 'Next Day Air Saver', '0.44', '$47.43', '20.00%'),
          row('Domestic', 'Air', '2nd Day', '2nd Day Air A.M.', '0.08', '$38.14', '20.00%'),
          row('Domestic', 'Air', '2nd Day', '2nd Day Air', '1.44', '$16.12', '20.00%'),
          row('Domestic', 'Air', '3rd Day', '3 Day Select', '0.04', '$123.33', '20.00%'),
          row('Domestic', 'Ground', 'Ground', 'Ground', '3.00', '$11.79', '20.00%'),
          row('Import', 'ALL', 'ALL', 'ALL', '6.64', '$21.98', '20.00%'),
          row('Export', 'ALL', 'ALL', 'ALL', '6.64', '$21.98', '20.00%')
        ]
      },
      {
        label: 'Transportation Charges',
        children: [
          {
            label: 'Additional Handling',
            children: [
              leaf('Additional Handling Cubic Size', [allLanesRow('55.00%')]),
              leaf('Additional Handling Length', [allLanesRow('55.00%')]),
              leaf('Additional Handling Length + Girth', [allLanesRow('55.00%')]),
              leaf('Additional Handling Packaging', [allLanesRow('55.00%')]),
              leaf('Additional Handling Weight', [allLanesRow('55.00%')]),
              leaf('Additional Handling Width', [allLanesRow('55.00%')])
            ]
          },
          { label: 'Delivery Area', children: [leaf('Delivery Area Commercial', [allLanesRow('20.00%')])] },
          {
            label: 'Extended/Remote Area',
            children: [
              leaf('Remote Area US48 Commercial', [row('Domestic', 'Ground', 'Ground', 'Ground', '0.00', '$0.00', '25.00%')]),
              leaf('Remote Area US48 Residential', [row('Domestic', 'Ground', 'Ground', 'Ground', '0.00', '$0.00', '25.00%')])
            ]
          },
          {
            label: 'Large Package',
            children: [
              leaf('Large Package Commercial Length', [allLanesRow('25.00%')]),
              leaf('Large Package Commercial Length + Girth', [allLanesRow('25.00%')]),
              leaf('Large Package Residential Length', [allLanesRow('25.00%')]),
              leaf('Large Package Residential Length + Girth', [allLanesRow('25.00%')]),
              leaf('Large Package Surcharge Cubic Size Commercial', [allLanesRow('25.00%')]),
              leaf('Large Package Surcharge Cubic Size Residential', [allLanesRow('25.00%')]),
              leaf('Large Package Surcharge Weight Commercial', [allLanesRow('25.00%')]),
              leaf('Large Package Surcharge Weight Residential', [allLanesRow('25.00%')])
            ]
          },
          {
            label: 'Other Transportation',
            children: [
              leaf('Early Surcharge', [row('Domestic', 'Air', 'Next Day', 'Next Day Air Early', '0.04', '$90.00', '25.00%')])
            ]
          },
          {
            label: 'Peak/Seasonal Surcharges',
            children: [
              leaf('Demand Surcharge - Additional Handling', [allLanesRow('15.00%')]),
              leaf('Demand Surcharge - Large Package', [allLanesRow('15.00%')])
            ]
          },
          {
            label: 'Residential Surcharge',
            children: [
              leaf('Residential Surcharge', [allLanesRow('20.00%')]),
              leaf('Residential Surcharge CWT', [allLanesRow('20.00%')])
            ]
          }
        ]
      },
      {
        label: 'Pickup And Delivery',
        children: [
          {
            label: 'Other Pickup And Delivery',
            children: [
              leaf('Saturday Air Processing Fee (Saturday Pickup)', [row('Domestic', 'Air', 'ALL', 'ALL', '0.00', '$0.00', '15.00%')])
            ]
          },
          leaf('Saturday Delivery', [allLanesRow('15.00%')]),
          leaf('Saturday Service', [allLanesRow('15.00%')]),
          leaf('Scheduled Pickup Options', [allLanesRow('15.00%')])
        ]
      },
      {
        label: 'Returns',
        children: [leaf('Return Labels', [allLanesRow('10.00%')])]
      },
      {
        label: 'Other Charges',
        children: [
          leaf('Dangerous Goods', [allLanesRow('10.00%')]),
          leaf('Other Charges', [allLanesRow('10.00%')])
        ]
      },
      {
        label: 'Customs Brokerage',
        children: [
          leaf('Entry Preparation', [allLanesRow('10.00%', 'Import')]),
          leaf('Other Brokerage Charges', [allLanesRow('10.00%', 'Import')])
        ]
      }
    ];
  })();

  /**
   * The full accessorial catalog "Add Accessorial Incentive Plan" opens
   * onto -- every chargeable line a plan could be built from, Product and
   * Non-Product types mixed together the way the reference screen shows
   * them (Customs Brokerage's own charge lines are all Non-Product; the
   * surcharge-style lines below them are Product).
   */
  DA.data.accessorialCatalog = [
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Complex Entries', detail: 'Complex Entry - Entry Status Upgrade' },
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Complex Entries', detail: 'Complex Entry - US Goods Return' },
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Complex Entries', detail: 'Live Entry Fee' },
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Entry Preparation', detail: 'Document Fee' },
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Other Brokerage Charges', detail: '1st Refund Charge' },
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Other Brokerage Charges', detail: '3299 Personal Effects' },
    { accessorialType: 'Customs Brokerage', productType: 'Non-Product', group: 'Other Brokerage Charges', detail: 'Additional Entry Preparation Fee' },
    { accessorialType: 'Fuel Surcharge', productType: 'Product', group: 'Fuel', detail: 'Fuel Surcharge - Domestic' },
    { accessorialType: 'Fuel Surcharge', productType: 'Product', group: 'Fuel', detail: 'Fuel Surcharge - International' },
    { accessorialType: 'Delivery Area Surcharge', productType: 'Product', group: 'Delivery Area', detail: 'Delivery Area Commercial' },
    { accessorialType: 'Delivery Area Surcharge', productType: 'Product', group: 'Delivery Area', detail: 'Delivery Area Residential' },
    { accessorialType: 'Additional Handling', productType: 'Product', group: 'Additional Handling', detail: 'Additional Handling - Weight' },
    { accessorialType: 'Additional Handling', productType: 'Product', group: 'Additional Handling', detail: 'Additional Handling - Dimension' },
    { accessorialType: 'Additional Handling', productType: 'Product', group: 'Additional Handling', detail: 'Additional Handling - Packaging' },
    { accessorialType: 'Residential Surcharge', productType: 'Product', group: 'Residential', detail: 'Residential Surcharge' },
    { accessorialType: 'Large Package Surcharge', productType: 'Product', group: 'Large Package', detail: 'Large Package Surcharge' },
    { accessorialType: 'Signature Required', productType: 'Product', group: 'Delivery Confirmation', detail: 'Direct Signature Required' },
    { accessorialType: 'Signature Required', productType: 'Product', group: 'Delivery Confirmation', detail: 'Adult Signature Required' },
    { accessorialType: 'Address Correction', productType: 'Non-Product', group: 'Address Correction', detail: 'Address Correction Fee' },
    { accessorialType: 'Return Service', productType: 'Non-Product', group: 'Returns', detail: 'UPS Return Service' }
  ];

  /**
   * The incentive plan every accessorial leaf opens onto -- one shared
   * table, same as servicePlan()'s weight-break grid is shared across every
   * service leaf regardless of which one opened it.
   */
  DA.data.pricingAccessorialIncentives = [
    { movement: 'Domestic', mode: 'Air', serviceGroup: 'Next Day', service: 'Next Day Air Early', adu: '0.00', nrpp: '$0.00', incentiveType: '% Off', incentiveAmount: '60.00%' },
    { movement: 'Domestic', mode: 'Air', serviceGroup: 'Next Day', service: 'Next Day Air', adu: '0.42', nrpp: '$1.80', incentiveType: '% Off', incentiveAmount: '60.00%' },
    { movement: 'Domestic', mode: 'Air', serviceGroup: 'Next Day', service: 'Next Day Air Saver', adu: '0.00', nrpp: '$0.00', incentiveType: '% Off', incentiveAmount: '60.00%' },
    { movement: 'Domestic', mode: 'Air', serviceGroup: '2nd Day', service: '2nd Day Air A.M.', adu: '0.00', nrpp: '$0.00', incentiveType: '% Off', incentiveAmount: '60.00%' },
    { movement: 'Domestic', mode: 'Air', serviceGroup: '2nd Day', service: '2nd Day Air', adu: '0.40', nrpp: '$1.80', incentiveType: '% Off', incentiveAmount: '60.00%' },
    { movement: 'Domestic', mode: 'Air', serviceGroup: '3rd Day', service: '3 Day Select', adu: '0.03', nrpp: '$1.80', incentiveType: '% Off', incentiveAmount: '60.00%' },
    { movement: 'Domestic', mode: 'Ground', serviceGroup: 'Ground', service: 'Ground', adu: '1.68', nrpp: '$1.82', incentiveType: '% Off', incentiveAmount: '60.00%' }
  ];

  /**
   * Rows behind Analyzer > Accounts: the customer's parent account, grouped
   * by subparent, over the individual UPS account numbers billing under it.
   * Volume/ADV/Zone on the parent are the group's totals, not independent
   * figures, so they're written down directly rather than summed from
   * children the way an additive breakdown would -- there's no shared
   * "share of the whole" to derive per account here, each is its own record.
   * Billable Wt/PPS/Base Gross Rev/Base Net Rev/Base Disc/Base RPP/Base
   * Profit/Base OR (missing entirely until the client's own reference
   * screenshot) follow the same convention -- plausible figures per row,
   * not summed either. Total Gross Revenue/Net Revenue/Discount %/RPP/
   * Profit/OR (same screenshot) reuse withTotalMetrics() (defined above,
   * by Services' own Total columns), applied via .map() below.
   */
  DA.data.packetAccounts = [
    {
      parent: '{customer}',
      subParent: 'No Sub Parent',
      accountNumber: '-',
      expanded: true,
      volume: '172658.0', adv: '2656.3', zone: '19.4',
      billableWt: '9.2', pps: '1.0',
      baseGrossRev: '$3,842,650', baseNetRev: '$1,306,501', baseDisc: '66.0%',
      baseRpp: '$7.57', baseProfit: '$285,420', baseOr: '0.78',
      children: [
        {
          parent: '', subParent: '', accountNumber: '0000AW0689', volume: '19307.0', adv: '297.0', zone: '65.8',
          billableWt: '11.4', pps: '1.0',
          baseGrossRev: '$612,480', baseNetRev: '$198,420', baseDisc: '67.6%',
          baseRpp: '$10.28', baseProfit: '$38,240', baseOr: '0.81'
        },
        {
          parent: '', subParent: '', accountNumber: '000082W208', volume: '153317.0', adv: '2358.7', zone: '13.6',
          billableWt: '8.6', pps: '1.0',
          baseGrossRev: '$3,102,640', baseNetRev: '$1,061,280', baseDisc: '65.8%',
          baseRpp: '$6.92', baseProfit: '$241,050', baseOr: '0.77'
        },
        {
          parent: '', subParent: '', accountNumber: '000083E306', volume: '34.0', adv: '0.5', zone: '3.6',
          billableWt: '4.2', pps: '1.0',
          baseGrossRev: '$1,240', baseNetRev: '$418', baseDisc: '66.3%',
          baseRpp: '$12.29', baseProfit: '$62', baseOr: '0.85'
        }
      ]
    }
  ].map(withTotalMetrics);


  /** Parses one of this file's own formatted figures ("$407,142", "79.7%",
      "0.52", "$ -341") into a plain number plus the prefix/suffix/decimal
      precision needed to format a derived figure back in the same style --
      see withTotalMetrics() below. */
  function parseFigureNumber(raw) {
    var match = /^(\$\s*)?(-?[\d,]+(?:\.\d+)?)\s*(%)?$/.exec(String(raw).trim());
    if (!match) return null;
    return {
      number: parseFloat(match[2].replace(/,/g, '')),
      prefix: match[1] || '',
      suffix: match[3] || '',
      decimals: (match[2].split('.')[1] || '').length
    };
  }

  /** The inverse of parseFigureNumber() -- `like` supplies the prefix/
      suffix/decimals to format `number` back into. */
  function formatFigureNumber(number, like) {
    var fixed = Math.abs(number).toFixed(like.decimals);
    var grouped = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (like.prefix || '') + (number < 0 ? '-' : '') + grouped + (like.suffix || '');
  }

  /**
   * Analyzer > Services' "Total" columns (Total Gross Rev / Net Rev / Disc
   * / RPP / Profit / OR) -- the fully-loaded figures (accessorials and
   * other charges folded in), alongside the "Base" set every row already
   * carries (the pre-incentive freight-only figures). Derived from each
   * row's own Base figures at load time rather than a second hand-typed
   * set of numbers across 20 rows: Total Gross Rev runs 12% above Base
   * (the accessorial layer), Total Disc a few points sharper against that
   * larger base, Total Net Rev computed from those two rather than scaled
   * independently (so it stays internally consistent, matching how
   * baseRpp = baseNetRev / volume already holds for this same data), Total
   * RPP the same net-rev-over-volume relationship, and Total Profit/OR
   * scaled from their own Base figures.
   */
  function withTotalMetrics(row) {
    // Services' own rows key their discount column `disc`; Accounts' (and
    // Weight & Cube's) own key it `baseDisc` -- both pre-date this
    // function, so it reads whichever this row actually has rather than
    // forcing one convention onto the other.
    var gross = parseFigureNumber(row.baseGrossRev);
    var discPct = parseFigureNumber(row.disc != null ? row.disc : row.baseDisc);
    var rpp = parseFigureNumber(row.baseRpp);
    var profit = parseFigureNumber(row.baseProfit);
    var or_ = parseFigureNumber(row.baseOr);
    var volume = parseFloat(String(row.volume).replace(/,/g, '')) || 0;

    var totalGrossNum = gross.number * 1.12;
    var totalDiscNum = Math.max(0, discPct.number - 3);
    var totalNetNum = totalGrossNum * (1 - totalDiscNum / 100);
    var totalRppNum = volume > 0 ? totalNetNum / volume : totalNetNum;

    var mapped = Object.assign({}, row, {
      totalGrossRev: formatFigureNumber(totalGrossNum, gross),
      totalNetRev: formatFigureNumber(totalNetNum, gross),
      totalDisc: formatFigureNumber(totalDiscNum, discPct),
      totalRpp: formatFigureNumber(totalRppNum, rpp),
      totalProfit: formatFigureNumber(profit.number * 1.18, profit),
      totalOr: formatFigureNumber(Math.max(0.05, or_.number - 0.05), or_)
    });
    // packetServices' own rows never carry a `children` array (Services'
    // own children come from packageBreakdown() at render time instead) --
    // packetAccounts' do, so this recurses for its sake. A no-op for every
    // row that doesn't have one.
    if (row.children) mapped.children = row.children.map(withTotalMetrics);
    return mapped;
  }

  /**
   * Rows behind Analyzer > Services. Reference screen order: 2nd Day Air,
   * 3 Day Select, Next Day Air, Next Day Air Saver, Ground (its own
   * volume/ADV/Avg Zone/Billable Wt lifted directly from that screen).
   * N-2nd Day Air, N-Next Day Air, and N-Next Day Air Saver share the
   * same volume/ADV with their packetWeightCube rows below -- the same
   * packet's shipments, just organized by a different breakdown -- so
   * their revenue figures are carried over unchanged rather than
   * re-invented. N-Ground is expanded by default, matching the
   * reference. The remaining domestic and international services round
   * the list out past 20 rows. Each row runs through withTotalMetrics()
   * (see above) for its own Total Gross Rev/Net Rev/Disc/RPP/Profit/OR,
   * alongside the Base set already given here directly.
   */
  DA.data.packetServices = [
    { service: 'N-2nd Day Air', volume: '4203', adv: '64.7', avgZone: '206.3', billableWt: '8.5', pps: '1.0', baseGrossRev: '$407,142', baseNetRev: '$82,709', disc: '79.7%', baseRpp: '$19.68', baseProfit: '$ -341', baseOr: '0.52' },
    { service: 'N-3 Day Select', volume: '741', adv: '11.4', avgZone: '307.1', billableWt: '6.4', pps: '1.0', baseGrossRev: '$62,480', baseNetRev: '$14,213', disc: '77.3%', baseRpp: '$19.18', baseProfit: '$2,046', baseOr: '0.86' },
    { service: 'N-Next Day Air', volume: '890', adv: '13.7', avgZone: '106.3', billableWt: '8.8', pps: '1.0', baseGrossRev: '$164,299', baseNetRev: '$29,249', disc: '82.2%', baseRpp: '$32.85', baseProfit: '$5,037', baseOr: '0.50' },
    { service: 'N-Next Day Air Saver', volume: '1', adv: '0.0', avgZone: '136.0', billableWt: '0.0', pps: '1.0', baseGrossRev: '$59', baseNetRev: '$12', disc: '79.6%', baseRpp: '$11.98', baseProfit: '$0', baseOr: '0.99' },
    { service: 'N-Ground', volume: '14926', adv: '229.6', avgZone: '5.9', billableWt: '12.6', pps: '1.0', baseGrossRev: '$298,940', baseNetRev: '$131,835', disc: '55.9%', baseRpp: '$8.83', baseProfit: '$18,213', baseOr: '0.86', expanded: true },
    { service: 'N-2nd Day Air A.M.', volume: '186', adv: '2.9', avgZone: '245.0', billableWt: '21.2', pps: '1.0', baseGrossRev: '$27,830', baseNetRev: '$16,984', disc: '39.0%', baseRpp: '$91.31', baseProfit: '$6,412', baseOr: '0.62' },
    { service: 'N-Next Day Air Early', volume: '54', adv: '0.8', avgZone: '105.0', billableWt: '9.6', pps: '1.0', baseGrossRev: '$9,845', baseNetRev: '$5,712', disc: '42.0%', baseRpp: '$105.78', baseProfit: '$2,014', baseOr: '0.65' },
    { service: 'N-Ground Saver', volume: '3812', adv: '58.6', avgZone: '5.4', billableWt: '4.1', pps: '1.0', baseGrossRev: '$41,230', baseNetRev: '$28,842', disc: '30.1%', baseRpp: '$7.57', baseProfit: '$2,105', baseOr: '0.93' },
    { service: 'N-Ground Saver > 1lb', volume: '1548', adv: '23.8', avgZone: '5.2', billableWt: '2.6', pps: '1.0', baseGrossRev: '$18,920', baseNetRev: '$13,244', disc: '30.0%', baseRpp: '$8.55', baseProfit: '$890', baseOr: '0.93' },
    { service: 'N-Ground Saver < 1lb', volume: '2960', adv: '45.5', avgZone: '4.9', billableWt: '0.9', pps: '1.0', baseGrossRev: '$12,470', baseNetRev: '$8,724', disc: '30.0%', baseRpp: '$2.95', baseProfit: '$ -612', baseOr: '1.07' },
    { service: 'E-Worldwide Expedited', volume: '4', adv: '0.0', avgZone: '71.0', billableWt: '7.0', pps: '1.0', baseGrossRev: '$697', baseNetRev: '$334', disc: '52.1%', baseRpp: '$83.44', baseProfit: '$233', baseOr: '0.30' },
    { service: 'E-Worldwide Express Saver', volume: '4', adv: '0.0', avgZone: '481.0', billableWt: '10.0', pps: '1.0', baseGrossRev: '$787', baseNetRev: '$326', disc: '58.5%', baseRpp: '$81.61', baseProfit: '$213', baseOr: '0.35' },
    { service: 'E-Worldwide Express', volume: '62', adv: '0.5', avgZone: '512.0', billableWt: '9.4', pps: '1.0', baseGrossRev: '$18,940', baseNetRev: '$9,845', disc: '48.0%', baseRpp: '$158.79', baseProfit: '$6,102', baseOr: '0.38' },
    { service: 'E-Worldwide Express Plus', volume: '11', adv: '0.1', avgZone: '512.0', billableWt: '14.1', pps: '1.0', baseGrossRev: '$4,982', baseNetRev: '$2,610', disc: '47.6%', baseRpp: '$237.30', baseProfit: '$1,540', baseOr: '0.41' },
    { service: 'E-Worldwide Saver', volume: '38', adv: '0.3', avgZone: '498.0', billableWt: '8.2', pps: '1.0', baseGrossRev: '$7,214', baseNetRev: '$3,802', disc: '47.3%', baseRpp: '$100.05', baseProfit: '$2,046', baseOr: '0.46' },
    { service: 'E-Worldwide Economy DDU', volume: '26', adv: '0.2', avgZone: '512.0', billableWt: '6.7', pps: '1.0', baseGrossRev: '$2,984', baseNetRev: '$1,712', disc: '42.6%', baseRpp: '$65.85', baseProfit: '$612', baseOr: '0.64' },
    { service: 'E-Worldwide Economy DDP', volume: '19', adv: '0.2', avgZone: '512.0', billableWt: '7.9', pps: '1.0', baseGrossRev: '$3,127', baseNetRev: '$1,896', disc: '39.4%', baseRpp: '$99.79', baseProfit: '$701', baseOr: '0.63' },
    { service: 'E-Standard', volume: '84', adv: '0.7', avgZone: '12.4', billableWt: '5.3', pps: '1.0', baseGrossRev: '$5,612', baseNetRev: '$4,215', disc: '24.9%', baseRpp: '$50.18', baseProfit: '$1,890', baseOr: '0.55' },
    { service: 'E-Import Express', volume: '9', adv: '0.1', avgZone: '498.0', billableWt: '8.8', pps: '1.0', baseGrossRev: '$3,845', baseNetRev: '$2,014', disc: '47.6%', baseRpp: '$223.78', baseProfit: '$1,102', baseOr: '0.45' },
    { service: 'E-Import Express Saver', volume: '7', adv: '0.1', avgZone: '481.0', billableWt: '7.5', pps: '1.0', baseGrossRev: '$2,690', baseNetRev: '$1,412', disc: '47.5%', baseRpp: '$201.71', baseProfit: '$780', baseOr: '0.45' },
    { service: 'E-Worldwide Express Freight', volume: '3', adv: '0.0', avgZone: '512.0', billableWt: '412.0', pps: '1.0', baseGrossRev: '$8,940', baseNetRev: '$5,203', disc: '41.8%', baseRpp: '$1,734.33', baseProfit: '$2,014', baseOr: '0.61' },
    { service: 'E-Worldwide Express Freight Midday', volume: '2', adv: '0.0', avgZone: '512.0', billableWt: '398.0', pps: '1.0', baseGrossRev: '$6,214', baseNetRev: '$3,618', disc: '41.8%', baseRpp: '$1,809.00', baseProfit: '$1,402', baseOr: '0.61' }
  // Same core-service hierarchy the Comparisons tree uses -- Domestic Air
  // (Next Day Air Early/Air/Saver, 2nd Day A.M./Air, 3 Day Select) then
  // Domestic Ground, then the Export lanes, rather than transcription
  // order (which opened on N-2nd Day Air).
  ].sort(byCoreServiceRow).map(withTotalMetrics);

  /* ---- Shipping-profile tables, from the shared core-service list ------- */

  /**
   * Cost Details, Zones and Weight & Cube list the exact same core
   * services as the Services tab, in the same order -- one row per
   * DA.data.packetServices entry (already sorted into the client's
   * hierarchy), mapped into each tab's own column set. Figures that line
   * up with a Services figure are carried across; the rest are plausible
   * dummy values, varied a little per row so a column doesn't read as a
   * flat repeat. Rows are leaves (children: []), so no per-service zone /
   * package drill-down -- the point is the shared, ordered list.
   */
  function figNum(raw) {
    var m = parseFigureNumber(raw);
    return m ? m.number : 0;
  }
  function money2(n) { return '$ ' + n.toFixed(2); }
  function dec(n, places) { return n.toFixed(places == null ? 2 : places); }

  var CORE_SERVICE_ROWS = DA.data.packetServices.map(function (r, i) {
    var rpp = figNum(r.baseRpp); // stands in as freight cost per piece
    return {
      label: r.service,
      volume: r.volume, adv: r.adv, pps: r.pps, weightPiece: r.billableWt,
      baseGrossRev: r.baseGrossRev, baseNetRev: r.baseNetRev,
      disc: r.disc, baseRpp: r.baseRpp, baseProfit: r.baseProfit, baseOr: r.baseOr,
      // Cost Details' own columns -- no Services counterpart, so cost
      // components are fixed fractions of the row's own rate and the
      // cube/density figures a small per-row wobble off a base value.
      avgCube: dec(1.05 + (i % 5) * 0.14),
      avgCubeFactor: dec(0.92 + (i % 4) * 0.11),
      puDens: dec(1.6 + (i % 6) * 0.45, 1),
      dlDens: dec(1.3 + (i % 3) * 0.5),
      pu: money2(rpp * 0.07), ls: money2(rpp * 0.02), cs: money2(rpp * 0.11),
      ar: money2(rpp * 0.10), jf: money2(rpp * 0.19), gf: money2(rpp * 0.07),
      br: '$ 0.0', pd: money2(rpp * 0.09), dl: money2(rpp * 0.24),
      no: money2(rpp * 0.11), oth: '$ 0.0',
      totalFreightCost: money2(rpp), costAdj: '-', newCost: money2(rpp)
    };
  });

  DA.data.shippingProfileCost = CORE_SERVICE_ROWS.map(function (r) {
    return {
      serviceLabel: r.label, zone: '-', lane: '-', children: [],
      volume: r.volume, adv: r.adv, pps: r.pps, weightPiece: r.weightPiece,
      avgCube: r.avgCube, avgCubeFactor: r.avgCubeFactor, puDens: r.puDens, dlDens: r.dlDens,
      pu: r.pu, ls: r.ls, cs: r.cs, ar: r.ar, jf: r.jf, gf: r.gf, br: r.br,
      pd: r.pd, dl: r.dl, no: r.no, oth: r.oth,
      totalFreightCost: r.totalFreightCost, costAdj: r.costAdj, newCost: r.newCost
    };
  });

  DA.data.shippingProfileZone = CORE_SERVICE_ROWS.map(function (r) {
    return {
      serviceLabel: r.label, zone: '-', lane: '-', children: [],
      volume: r.volume, adv: r.adv, pps: r.pps, weightPiece: r.weightPiece,
      freightGrossSpent: r.baseGrossRev, freightNetSpent: r.baseNetRev,
      freightDiscount: r.disc, freightRpp: r.baseRpp,
      freightProfit: r.baseProfit, freightOr: r.baseOr
    };
  });

  DA.data.packetWeightCube = CORE_SERVICE_ROWS.map(function (r) {
    return {
      service: r.label, billable: '-', children: [],
      volume: r.volume, adv: r.adv, pps: r.pps, weightPiece: r.weightPiece,
      baseGrossRev: r.baseGrossRev, baseNetRev: r.baseNetRev, baseDisc: r.disc,
      baseRpp: r.baseRpp, baseProfit: r.baseProfit, baseOr: r.baseOr
    };
  });

  /**
   * Rate Charts' Net-basis grid: a $ rate per zone/weight-tier cell, the same
   * for every scenario in this demo (the reference screen shows Current and
   * Scenario 1 landing on identical figures). Gross and Volume bases have no
   * reference data yet -- the view's own empty state covers them.
   */
  DA.data.rateChartGrid = {
    zones: ['051', '052', '053', '054'],
    rows: [
      { weight: '1', net: ['$15.14', '$15.21', '$15.28', '$20.20'] },
      { weight: '2', net: ['$15.14', '$15.21', '$15.28', '$20.20'] },
      { weight: '3', net: ['$15.14', '$15.21', '$15.28', '$20.20'] },
      { weight: '4', net: ['$15.14', '$15.21', '$15.28', '$20.20'] },
      { weight: '5', net: ['$15.14', '$15.21', '$15.28', '$20.20'] },
      { weight: '6', net: ['$15.29', '$15.43', '$15.54', '$20.20'] },
      { weight: '7', net: ['$15.99', '$16.14', '$16.25', '$20.20'] },
      { weight: '8', net: ['$16.72', '$16.87', '$17.00', '$20.20'] },
      { weight: '9', net: ['$17.41', '$17.57', '$17.70', '$20.23'] }
    ]
  };

  /**
   * Rows behind Other Terms > Dim Divisor. Published Fuel Surcharge has no
   * reference screen yet. Each row's threshold band data (divisorCode,
   * cubicVolumeFrom, divisor) feeds the Structure Details dialog rather
   * than a flat column -- the outer table only ever shows the drill-down.
   *
   * Row headers replaced per explicit request with the client's own 6
   * service names (was 8 rows built from Movement/Mode/Service Group,
   * repeating "Next Day Air Early" x6 and "Next Day Air" x2) --
   * `coreServiceLabel` renders directly in dimDivisorView()'s Core Service
   * column now, one row per named service. Every other column's own
   * figures are carried over unchanged from the old rows (same
   * placeholder incentiveType/divisorCode/cubicVolumeFrom/divisor on
   * every row already, before and after).
   */
  DA.data.packetDimDivisor = [
    { coreServiceLabel: 'N-Next Day Air', serviceGroup: 'N-Next Day Air', incentiveType: 'DIM Divisor', divisorCode: '01 - Dim Weight Divisor', cubicVolumeFrom: '0.0', divisor: '194.0' },
    { coreServiceLabel: 'N-Next Day Saver', serviceGroup: 'N-Next Day Saver', incentiveType: 'DIM Divisor', divisorCode: '01 - Dim Weight Divisor', cubicVolumeFrom: '0.0', divisor: '194.0' },
    { coreServiceLabel: 'N-2nd Day AM', serviceGroup: 'N-2nd Day AM', incentiveType: 'DIM Divisor', divisorCode: '01 - Dim Weight Divisor', cubicVolumeFrom: '0.0', divisor: '194.0' },
    { coreServiceLabel: 'N-2nd Day Air', serviceGroup: 'N-2nd Day Air', incentiveType: 'DIM Divisor', divisorCode: '01 - Dim Weight Divisor', cubicVolumeFrom: '0.0', divisor: '194.0' },
    { coreServiceLabel: 'N-3rd Day Select', serviceGroup: 'N-3rd Day Select', incentiveType: 'DIM Divisor', divisorCode: '01 - Dim Weight Divisor', cubicVolumeFrom: '0.0', divisor: '194.0' },
    { coreServiceLabel: 'N-Ground', serviceGroup: 'N-Ground', incentiveType: 'DIM Divisor', divisorCode: '01 - Dim Weight Divisor', cubicVolumeFrom: '0.0', divisor: '194.0' }
  ];
})(window.DA);
