/**
 * Analyzer Packet — the report built from the packet's scenarios.
 *
 * Reached from "Proceed to Analyzer Packet". The comparison selector chooses
 * which scenarios the report covers; the tabs below split it into Analyzer,
 * Pricing Terms, Other Terms, Adjustments and Rate Charts. Analyzer holds its
 * own sub-tabs: Comparisons, Services, Charges, Accounts, Cost Details,
 * Zones and Weight & Cube.
 *
 * Comparisons, Services, Charges, Cost Details and Zones are documented by
 * reference screens. Accounts and Weight & Cube are built from the same
 * conventions (is-rowhead label columns, a breakdown that always sums back
 * to its parent) rather than a reference screenshot of this exact packet's
 * data. Rate Charts, Adjustments and Other Terms > Dim Divisor are now built
 * from their own reference screens too, transcribed as flat (non-expanding)
 * tables since none of them open onto a breakdown. Other Terms > Minimums
 * still renders the product's empty table state -- not built yet.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var C = DA.components;

  DA.pages = DA.pages || {};

  /** Right-aligned numeric column; `link` makes the figure a drill-down. */
  function numeric(key, label, options) {
    options = options || {};
    return {
      key: key,
      label: label,
      width: options.width || '110px',
      className: 'is-numeric is-end',
      headerClassName: 'is-end',
      render: options.link
        ? function (row) {
            return el('a', {
              text: row[key] == null ? '-' : row[key],
              attrs: { href: '#detail', 'aria-label': label + ' ' + row[key] }
            });
          }
        : function (row) { return row[key] == null ? '-' : row[key]; }
    };
  }

  /**
   * The one-line expansion behind each comparison metric's abbreviation --
   * shown as a native tooltip in both comparison views, keyed by the same
   * column keys DRIVER_KEYS uses.
   */
  var METRIC_DESCRIPTIONS = {
    adv: 'Average Daily Volume',
    baseFrtDisc: 'Base Freight Discount excluding Accessorials',
    totalDisc: 'Total Discount including Accessorials',
    rpp: 'Net Revenue per Piece',
    or: 'Operating Ratio',
    revenue: 'Total Net Revenue',
    profit: 'Net Profit after Cost'
  };

  /**
   * A distinct icon per metric for Key Scenario Drivers' corner info
   * button -- every card showed the same generic "?" regardless of which
   * metric it was, keyed by the same column keys METRIC_DESCRIPTIONS is.
   */
  var METRIC_ICONS = {
    adv: DA.icons.box,
    baseFrtDisc: DA.icons.percent,
    totalDisc: DA.icons.tag,
    rpp: DA.icons.coins,
    or: DA.icons.gauge,
    revenue: DA.icons.trendingUp,
    profit: DA.icons.dollarCircle
  };

  /** A figure with an inline edit affordance -- the Adjustments dollar cell. */
  function editableCell(value) {
    return el('span', { className: 'cell-value' }, [
      el('span', { text: value }),
      el('button', {
        className: 'icon-action u-tap-target',
        attrs: { type: 'button', 'aria-label': 'Edit ' + value }
      }, [DA.icons.pencil(13)])
    ]);
  }

  function emptyView(label) {
    return function () {
      return el('div', { className: 'card' }, [
        C.DataTable({
          caption: label,
          embedded: true,
          headerTone: 'warm',
          columns: [{ key: 'name', label: label }],
          rows: [],
          emptyState: el('p', { className: 'table-empty', text: 'No data available.' })
        })
      ]);
    };
  }

  DA.pages.AnalyzerPacketPage = function AnalyzerPacketPage(options) {
    options = options || {};
    var packet = options.packet || {};
    var customer = packet.customerName || '-';
    var scenarios = packet.scenarios || [];

    function withCustomer(text) {
      return String(text).replace('{customer}', customer);
    }

    function asOptions(values) {
      return values.map(function (value) { return { value: value, label: value }; });
    }

    /** The customer's accounts, as the bid and account pickers list them. */
    function accountOptions() {
      return DA.data.filterOptions.accountSuffix.map(function (suffix) {
        return { value: customer + ' ' + suffix, label: customer + ' ' + suffix };
      });
    }

    /* ---- Comparison selector --------------------------------------------- */

    // The baseline scenario is always part of a comparison; the rest are opt-in.
    var chosen = scenarios.slice(0, 1).map(function (scenario) { return scenario.name; });
    var pending = chosen.slice();
    var comparisonBand = el('section', { className: 'panel panel--auto' });

    var comparisonSelector = C.Dropdown({
      label: 'Comparison View',
      value: chosen.join(', '),
      content: [
        el('div', {}, scenarios.map(function (scenario) {
          return el('div', { className: 'dropdown__option' }, [
            C.Checkbox({
              checked: pending.indexOf(scenario.name) !== -1,
              label: scenario.name,
              onChange: function (checked) {
                var at = pending.indexOf(scenario.name);
                if (checked && at === -1) pending.push(scenario.name);
                if (!checked && at !== -1) pending.splice(at, 1);
              }
            })
          ]);
        })),
        el('div', { className: 'dropdown__footer' }, [
          C.Button({
            label: 'Apply',
            variant: 'outline',
            shape: 'pill',
            onClick: function () {
              chosen = pending.slice();
              renderComparisonView();
              comparisonSelector.setValue(chosen.join(', '));
              comparisonSelector.close();
            }
          })
        ])
      ]
    });

    /**
     * One row per chosen scenario, padded to two, then their difference.
     * A recorded difference is used when there is one; otherwise it is derived
     * from the figures shown, which can land a unit off where those are
     * rounded for display.
     */
    function comparisonRows() {
      var figures = DA.data.scenarioFigures;
      var keys = DA.data.comparisonKeys;
      var picked = scenarios.filter(function (scenario) {
        return chosen.indexOf(scenario.name) !== -1;
      });

      var rows = picked.map(function (scenario) {
        var values = figures[scenario.name] || {};
        var row = { scenario: scenario.name };
        keys.forEach(function (key) { row[key] = values[key]; });
        return row;
      });

      while (rows.length < 2) rows.push({ scenario: '-' });

      var difference = { scenario: 'Change', difference: true };
      if (picked.length === 2) {
        var a = figures[picked[0].name] || {};
        var b = figures[picked[1].name] || {};
        var recorded = DA.data.scenarioDifferences[picked[0].name + '|' + picked[1].name];
        keys.forEach(function (key) {
          difference[key] = recorded ? recorded[key] : DA.figures.difference(a[key], b[key]);
        });
      }
      rows.push(difference);
      return rows;
    }

    /** Up / down / flat, from a figure that may carry $, %, commas or a sign. */
    function deltaDirection(value) {
      var n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      if (isNaN(n) || n === 0) return 'flat';
      return n > 0 ? 'up' : 'down';
    }

    /**
     * An arrow + green/red span for a difference figure -- shared by the
     * Tile view's driverCard() (its own "Scenario impact" line) and the
     * Table view's renderComparisonCards() (its Change row), reusing
     * driverCard()'s own col-driver-card__delta styling rather than a
     * one-off pair just for the Scenario comparison view.
     */
    function comparisonDelta(value) {
      var dir = deltaDirection(value);
      return el('span', { className: 'col-driver-card__delta col-driver-card__delta--' + dir }, [
        dir === 'up' ? DA.icons.chevronUp(12) : dir === 'down' ? DA.icons.chevronDown(12) : null,
        el('span', { text: String(value) })
      ]);
    }

    /** A stored delta's own sign, made explicit -- "27.2" reads as "+27.2". */
    function signed(text) {
      var n = DA.figures.toNumber(text);
      if (n == null || n <= 0) return String(text);
      return '+' + text;
    }

    /** A percentage-shaped delta reads as a point change, not a percent of
        itself -- "-0.4%" becomes "-0.4 pp" wherever it's shown as a change. */
    function asPointChange(text) {
      var s = String(text);
      return /%$/.test(s) ? s.replace(/%$/, ' pp') : s;
    }

    // Same order the comparison table's own columns use (comparisonKeys),
    // shared by both comparison views (Tile and Table).
    var DRIVER_KEYS = [
      { key: 'adv', label: 'ADV' },
      { key: 'baseFrtDisc', label: 'Base Frt Disc' },
      { key: 'totalDisc', label: 'Total Disc' },
      { key: 'rpp', label: 'RPP' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'or', label: 'OR' },
      { key: 'profit', label: 'Profit' }
    ];

    /**
     * Tile view: the comparison read as always-visible cards instead of a
     * table -- one Key Scenario Drivers grid covers all 7 metrics
     * (Revenue/Profit included), all seven in a single row.
     */
    function renderImpactCards() {
      var rows = comparisonRows();
      var current = rows[0] || {};
      var scenario = rows[1] || {};
      var change = rows[rows.length - 1] || {};
      var hasScenario = scenario.scenario && scenario.scenario !== '-';

      if (!hasScenario) {
        DA.dom.clear(comparisonBand).appendChild(
          C.Alert({ plain: true, message: 'Add a scenario to the comparison to see its impact.' })
        );
        return;
      }

      function driverCard(key, label) {
        var card = el('div', { className: 'driver-card' });
        var dir = deltaDirection(change[key]);
        // The corner used to repeat the same up/down chevron the Scenario
        // impact line already shows below -- replaced with an info button
        // carrying the metric's own icon (not the generic "?" HelpButton
        // otherwise uses) and its description as the tooltip, so the
        // corner both reads as "this card" at a glance and adds
        // information instead of repeating the arrow.
        var iconFn = METRIC_ICONS[key] || DA.icons.info;
        card.appendChild(el('div', { className: 'driver-card__head' }, [
          el('p', { className: 'col-driver-card__title', style: { margin: 0 }, text: label }),
          METRIC_DESCRIPTIONS[key]
            ? el('button', {
                className: 'help-button u-tap-target',
                attrs: { type: 'button', 'aria-label': METRIC_DESCRIPTIONS[key], title: METRIC_DESCRIPTIONS[key] }
              }, [iconFn(18)])
            : null
        ]));
        card.appendChild(el('div', { className: 'col-driver-card__flow' }, [
          el('div', { className: 'col-driver-card__step' }, [
            el('span', { className: 'col-driver-card__scen', text: current.scenario }),
            el('span', { className: 'col-driver-card__val', text: current[key] == null ? '-' : DA.figures.compact(current[key]) })
          ]),
          el('span', { className: 'col-driver-card__arrow', text: '→' }),
          el('div', { className: 'col-driver-card__step' }, [
            el('span', { className: 'col-driver-card__scen', text: scenario.scenario }),
            el('span', { className: 'col-driver-card__val', text: scenario[key] == null ? '-' : DA.figures.compact(scenario[key]) })
          ])
        ]));
        var delta = change[key];
        if (delta != null && delta !== '-') {
          // No "Scenario impact" caption -- it repeated identically on
          // all 7 cards, adding nothing the arrow + colored figure
          // didn't already say on its own.
          card.appendChild(el('div', { className: 'col-driver-card__impact' }, [
            el('span', { className: 'col-driver-card__delta col-driver-card__delta--' + dir }, [
              dir === 'down' ? DA.icons.chevronDown(12) : DA.icons.chevronUp(12),
              el('span', { text: signed(asPointChange(delta)) })
            ])
          ]));
        }
        return card;
      }

      DA.dom.clear(comparisonBand).appendChild(el('div', { className: 'impact-cards-panel' }, [
        el('p', { className: 'impact-section-title', text: 'Key Scenario Drivers' }),
        el('div', { className: 'driver-cards-grid' },
          DRIVER_KEYS.map(function (item) { return driverCard(item.key, item.label); }))
      ]));
    }

    /**
     * Table view: a card-per-row layout for the same comparison -- one
     * row per scenario as its own bordered card on a white surface,
     * instead of a plain grid table, so it can carry the row hover state
     * below. No row is singled out permanently; the gold outline is a
     * hover state any row picks up, not a fixed marker on Current.
     * Metric columns carry the same METRIC_ICONS glyph the Tile view
     * uses for that metric. Metric headers and values are right-aligned
     * (numbers read right-to-left for comparison); the leading
     * "Scenario" column stays left-aligned since it's a row label, not a
     * figure. No sort affordance -- nothing in this product actually
     * sorts yet, and the decorative sort glyph this column header used
     * to carry was dropped as noise rather than left in as a false
     * promise.
     */
    function renderComparisonCards() {
      var rows = comparisonRows();

      function headerCell(label, isFirst, iconFn) {
        return el('div', {
          className: 'comparison-cards__header-cell' + (isFirst ? '' : ' comparison-cards__header-cell--metric'),
          attrs: { role: 'columnheader' }
        }, [
          iconFn ? iconFn(13) : null,
          el('span', { text: label })
        ]);
      }

      // One cell list per metric column (Scenario excluded, per explicit
      // request -- it's the row's own label, not a metric to compare),
      // filled in as each cell below is built, then wired so hovering any
      // one of them highlights every cell sharing that column, header
      // included, instead of the row it sits in.
      var columnCells = DRIVER_KEYS.map(function () { return []; });

      var header = el('div', {
        className: 'comparison-cards__header',
        attrs: { role: 'row' }
      }, [
        headerCell('Scenario', true, null)
      ].concat(DRIVER_KEYS.map(function (item, index) {
        var cell = headerCell(item.label, false, METRIC_ICONS[item.key]);
        columnCells[index].push(cell);
        return cell;
      })));

      var cards = rows.map(function (row) {
        var metricFields = DRIVER_KEYS.map(function (item, index) {
          var value = row[item.key];
          var content = row.difference && value != null && value !== '-'
            ? comparisonDelta(value)
            : el('span', { text: value == null ? '-' : String(value) });
          var cell = el('div', { className: 'comparison-card__field comparison-card__field--metric', attrs: { role: 'cell' } }, [content]);
          columnCells[index].push(cell);
          return cell;
        });

        return el('div', {
          className: 'comparison-card',
          attrs: { role: 'row' }
        }, [
          el('div', { className: 'comparison-card__field comparison-card__field--scenario', attrs: { role: 'cell' } }, [
            el('span', { text: row.scenario })
          ])
        ].concat(metricFields));
      });

      var wrap = el('div', {
        className: 'comparison-cards scroll-area',
        attrs: { role: 'table', 'aria-label': 'Scenario comparison' }
      }, [header].concat(cards));

      // Each row (header, then every card) is its own independent CSS grid
      // -- .comparison-cards only stacks them with a flex `gap` between, so
      // a highlighted column's own cells (is-col-highlight, below) read as
      // separate tinted boxes with a visible break at every gap rather than
      // one continuous column. This layer fills exactly those gaps, one
      // absolutely-positioned strip per join, computed from the real cell
      // rects so the fill lines up regardless of column widths.
      var connectorLayer = el('div', { className: 'comparison-cards__connectors' });
      wrap.appendChild(connectorLayer);

      // Every column's own cell list is complete once every row has been
      // built above, so the hover wiring happens last.
      columnCells.forEach(function (cells) {
        cells.forEach(function (cell) {
          cell.addEventListener('mouseenter', function () {
            // Relative to the layer's own box, not wrap's -- wrap carries
            // its own border/padding (offset from its border-box, which is
            // what getBoundingClientRect reports, vs. the padding-box
            // `position: absolute` offsets resolve against), so anchoring
            // to the layer itself (inset: 0 against that same padding box)
            // keeps every piece below exactly aligned with the real cells
            // regardless of that border/padding rather than off by it.
            var layerRect = connectorLayer.getBoundingClientRect();
            var rects = cells.map(function (c) { return c.getBoundingClientRect(); });

            cells.forEach(function (c, i) {
              c.classList.add('is-col-highlight');
              if (i === 0) return;
              var prevRect = rects[i - 1];
              var rect = rects[i];
              // The header and each card are independent grids sharing the
              // same column template, but the header's own computed column
              // rect can still land a sub-pixel off a card's (browsers
              // round each grid's fractional 1fr tracks separately) --
              // spanning the union of both cells' edges, instead of just
              // the lower one's, means the fill always fully covers both,
              // with no gap on either side at that seam.
              var left = Math.min(prevRect.left, rect.left);
              var right = Math.max(prevRect.right, rect.right);
              connectorLayer.appendChild(el('div', {
                className: 'comparison-cards__connector',
                style: {
                  left: (left - layerRect.left) + 'px',
                  width: (right - left) + 'px',
                  top: (prevRect.bottom - layerRect.top) + 'px',
                  height: Math.max(0, rect.top - prevRect.bottom) + 'px'
                }
              }));
            });

            // The fill above is deliberately per-seam (it only has to cover
            // a gap, not read as a straight edge) -- the outline is
            // different: drawn per-cell, that same header-vs-card
            // sub-pixel gap means each row's own border segment lands a
            // hair left or right of its neighbors', and stacked down a
            // column that reads as a visibly kinked line rather than a
            // straight one. One outline spanning every cell's own
            // top/bottom/left/right union, drawn once, is a single
            // rectangle -- it has no seams to kink at.
            //
            // Padded a few px beyond that exact union on the top and
            // bottom (not left/right -- those already sit flush against
            // the column's own divider) so the rounded border reads as a
            // ring around the header/value text with some breathing room,
            // rather than a box clipped tight against it.
            var outlinePadY = 6;
            var outlineLeft = Math.min.apply(null, rects.map(function (r) { return r.left; }));
            var outlineRight = Math.max.apply(null, rects.map(function (r) { return r.right; }));
            var outlineWidthPx = outlineRight - outlineLeft;
            var outlineLeftPx = outlineLeft - layerRect.left;

            // The outline itself has no fill (just the ring), so the pad
            // above left those top/bottom margins plain background instead
            // of tinted -- reuse the same fill strips the seam connectors
            // above use, sized to exactly that padding, so the tint runs
            // the ring's full height instead of stopping at the header/
            // last row's own edges. --cap-top/--cap-bottom round the two
            // outer corners of each strip to match the ring's own radius --
            // plain square corners here would poke past the ring's curve,
            // since the pad is no taller than the radius itself.
            connectorLayer.appendChild(el('div', {
              className: 'comparison-cards__connector comparison-cards__connector--cap-top',
              style: {
                left: outlineLeftPx + 'px',
                width: outlineWidthPx + 'px',
                top: (rects[0].top - layerRect.top - outlinePadY) + 'px',
                height: outlinePadY + 'px'
              }
            }));
            connectorLayer.appendChild(el('div', {
              className: 'comparison-cards__connector comparison-cards__connector--cap-bottom',
              style: {
                left: outlineLeftPx + 'px',
                width: outlineWidthPx + 'px',
                top: (rects[rects.length - 1].bottom - layerRect.top) + 'px',
                height: outlinePadY + 'px'
              }
            }));

            connectorLayer.appendChild(el('div', {
              className: 'comparison-cards__col-outline',
              style: {
                left: outlineLeftPx + 'px',
                width: outlineWidthPx + 'px',
                top: (rects[0].top - layerRect.top - outlinePadY) + 'px',
                height: (rects[rects.length - 1].bottom - rects[0].top + outlinePadY * 2) + 'px'
              }
            }));
          });
          cell.addEventListener('mouseleave', function () {
            cells.forEach(function (c) { c.classList.remove('is-col-highlight'); });
            DA.dom.clear(connectorLayer);
          });
        });
      });

      DA.dom.clear(comparisonBand).appendChild(wrap);
    }

    // Table view is the default -- the fuller, more scannable read of the
    // comparison; Tile view is the alternate for someone who wants each
    // metric called out as its own card instead.
    var comparisonOption = 'table';

    function renderComparisonView() {
      if (comparisonOption === 'tile') renderImpactCards();
      else renderComparisonCards();
    }

    var comparisonOptionSwitch = C.SegmentedControl({
      ariaLabel: 'Scenario comparison view',
      value: comparisonOption,
      items: [
        { value: 'tile', label: 'Tile view', icon: DA.icons.gridView },
        { value: 'table', label: 'Table view', icon: DA.icons.tableViewIcon }
      ],
      onChange: function (value) {
        comparisonOption = value;
        renderComparisonView();
      }
    });

    renderComparisonView();

    /**
     * Only the band collapses -- the header (title, view switch, and the
     * show/hide toggle itself) stays put as an always-visible accordion
     * header, the only way back in once the band is hidden. Freeing the
     * band gives Analyzer / Pricing Terms / Other Terms / Adjustments /
     * Rate Charts the full page height below the filters instead of
     * losing a fixed chunk of it to the comparison by default.
     */
    var comparisonVisibilityToggle = C.Toggle({
      checked: true,
      label: 'Show Scenario Comparison',
      onChange: function (checked) {
        comparisonBand.hidden = !checked;
      }
    });

    var comparisonHeader = el('div', { className: 'comparison-header' }, [
      el('div', { className: 'comparison-header__left' }, [
        el('h3', { className: 'comparison-header__title', text: 'Scenario Comparison' }),
        comparisonOptionSwitch
      ]),
      comparisonVisibilityToggle
    ]);

    /* ---- Summary tab ------------------------------------------------------ */

    function summaryColumns() {
      return [
        {
          key: 'label',
          label: 'Cost Basis: FA',
          // Widened from 150px so labels like "E-Worldwide Express Midday"
          // and "I-Standard from Canada" (added when the row hierarchy was
          // replaced) show in full instead of truncating with an ellipsis.
          width: '230px',
          className: 'is-rowhead',
          render: function (row) { return withCustomer(row.label); }
        },
        numeric('adv', 'ADV', { link: true, width: '110px' }),
        numeric('baseFrt', 'Base Frt', { link: true, width: '105px' }),
        numeric('totalDisc', 'Total Disc', { link: true, width: '110px' }),
        numeric('rpp', 'RPP', { link: true, width: '110px' }),
        numeric('annRev', 'Annual Revenue', { link: true, width: '140px' }),
        numeric('or', 'OR', { link: true, width: '90px' }),
        numeric('profit', 'Annual Profit', { link: true, width: '130px' })
      ];
    }

    /**
     * Side-by-side scenario summaries share the same column layout, but not
     * necessarily the same rows -- a scenario carrying non-incented revenue
     * (Unincented PLD) adds a top-level row the others don't have, which
     * shifted every row below it out of alignment when this matched by
     * position. Matches by the row-header cell's own label text instead, so
     * "1DA" finds "1DA" in every other panel regardless of what rows come
     * before it or how deep the tree is expanded there. Assumes a label is
     * unique within its own table, true for this single-account demo data;
     * a second account sharing a service code's label would need a richer
     * key than text.
     */
    function summaryComparisonSync() {
      var panels = []; // { viewport, table }
      var enabled = false;
      var suppressScroll = false;

      function clearHighlights(exceptTable) {
        panels.forEach(function (p) {
          if (p.table === exceptTable) return;
          Array.prototype.forEach.call(
            p.table.querySelectorAll('.is-sync-highlight'),
            function (cell) { cell.classList.remove('is-sync-highlight'); }
          );
        });
      }

      function register(viewport) {
        var table = viewport.querySelector('table');
        if (!table) return;
        var entry = { viewport: viewport, table: table };
        panels.push(entry);

        viewport.addEventListener('scroll', function () {
          if (!enabled || suppressScroll) return;
          suppressScroll = true;
          panels.forEach(function (p) {
            if (p === entry) return;
            p.viewport.scrollLeft = viewport.scrollLeft;
            // Vertical too -- each panel's own DataTable viewport now
            // scrolls both ways (the `scrollable` option), and the toggle
            // reads as "sync scroll", not "sync horizontal scroll".
            p.viewport.scrollTop = viewport.scrollTop;
          });
          suppressScroll = false;
        });

        table.addEventListener('mouseover', function (event) {
          if (!enabled) return;
          var cell = event.target.closest('td');
          if (!cell || !table.tBodies[0]) return;
          var row = cell.parentElement;
          var cellIndex = Array.prototype.indexOf.call(row.cells, cell);
          var rowHead = row.querySelector('.is-rowhead');
          var rowKey = rowHead && rowHead.textContent.trim();
          if (!rowKey) return;
          panels.forEach(function (p) {
            if (p === entry || !p.table.tBodies[0]) return;
            var otherRow = Array.prototype.find.call(p.table.tBodies[0].rows, function (candidate) {
              var candidateHead = candidate.querySelector('.is-rowhead');
              return candidateHead && candidateHead.textContent.trim() === rowKey;
            });
            var otherCell = otherRow && otherRow.cells[cellIndex];
            if (otherCell) otherCell.classList.add('is-sync-highlight');
          });
        });

        table.addEventListener('mouseout', function (event) {
          if (!enabled || !event.target.closest('td')) return;
          clearHighlights(table);
        });
      }

      var toggle = C.Toggle({
        checked: enabled,
        label: 'Sync scroll & highlight across scenarios',
        onChange: function (checked) {
          enabled = checked;
          if (!checked) clearHighlights(null);
        }
      });

      return { register: register, toggle: toggle };
    }

    /**
     * `toggleSlot`, when given, is the persistent node analyzerView() seats
     * in the Comparisons tab's own tab-bar row -- summaryView() re-renders
     * on every visit to that tab (a fresh sync/panels set each time, so
     * stale detached tables from the previous render don't stay wired up),
     * so the toggle mounted into the slot is replaced along with it rather
     * than reused across renders.
     */
    function summaryOption1(toggleSlot) {
      var trees = DA.data.packetSummaryTrees;
      var sync = summaryComparisonSync();

      if (toggleSlot) {
        DA.dom.clear(toggleSlot).appendChild(
          el('div', { className: 'comparison-sync-toggle' }, [sync.toggle])
        );
      }

      return el('div', { className: 'comparison-grid' },
        scenarios.map(function (scenario) {
          var rows = trees[scenario.name] || trees.Current;
          var table = C.DataTable({
            caption: scenario.name + ' summary',
            embedded: true,
            scrollable: true,
            headerTone: 'warm',
            expandKey: 'label',
            getChildren: function (row) { return row.children; },
            columns: summaryColumns(),
            rows: rows
          });
          sync.register(table);
          return C.Accordion({
            title: scenario.name,
            expanded: true,
            className: 'accordion--filled',
            content: [table]
          });
        })
      );
    }

    /**
     * Parses one of summaryColumns()'s own formatted figures ("198.8",
     * "0.1%", "$2,859.09") into a number plus the prefix/suffix/decimal
     * precision needed to format a same-styled delta back out. Returns null
     * for "-"/blank/unparseable -- nothing to diff, so Change reads as "--"
     * for these (a placeholder row like Sub-total's own ADV/Base Frt/Total
     * Disc cells) rather than a fabricated zero.
     */
    function parseMetricFigure(raw) {
      var str = raw == null ? '' : String(raw).trim();
      if (!str || str === '-') return null;
      // The app's own $ figures carry a space after the sign ("$ 2,914.29",
      // see comparisonSummaryTree()) -- \$\s* here, not a literal \$, or
      // every one of them would fail to match and silently read as "-- ".
      var match = /^(\$\s*)?(-?[\d,]+(?:\.\d+)?)\s*(%)?$/.exec(str);
      if (!match) return null;
      var number = parseFloat(match[2].replace(/,/g, ''));
      if (isNaN(number)) return null;
      // Normalized to the app's own "$ " (always a space), regardless of
      // whether this particular figure's own source string happened to
      // have one -- so a delta reads the same style either way.
      return { number: number, prefix: match[1] ? '$ ' : '', suffix: match[3] || '', decimals: (match[2].split('.')[1] || '').length };
    }

    /** 1234.5 -> "1,234.5", matching the comma grouping every other figure in this table already uses. */
    function groupDigits(fixedString) {
      var parts = fixedString.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }

    /**
     * Current -> Scenario's own delta, formatted in the scenario figure's
     * own style (its $/% and decimal precision) with an explicit sign and
     * direction arrow -- "+4.6 ↑" / "-2.1 ↓" -- or "--" when either side has
     * nothing to compare, or the two round to the same displayed value (a
     * real but sub-precision difference shouldn't read as a change neither
     * figure itself shows).
     */
    function summaryChange(currentRaw, scenarioRaw) {
      var current = parseMetricFigure(currentRaw);
      var scenario = parseMetricFigure(scenarioRaw);
      if (!current || !scenario) return { text: '—', direction: 'none' };
      var delta = scenario.number - current.number;
      var rounded = parseFloat(delta.toFixed(scenario.decimals));
      if (rounded === 0) return { text: '—', direction: 'none' };
      var direction = rounded > 0 ? 'up' : 'down';
      var sign = rounded > 0 ? '+' : '−';
      var magnitude = groupDigits(Math.abs(rounded).toFixed(scenario.decimals));
      var arrow = rounded > 0 ? '↑' : '↓';
      return { text: sign + scenario.prefix + magnitude + scenario.suffix + ' ' + arrow, direction: direction };
    }

    /**
     * Option 2: the same figures as Option 1's per-scenario panels, but as
     * one table instead of one per scenario, redesigned around the question
     * this view exists to answer -- "what changes if I use Scenario 1
     * instead of Current?" -- rather than around listing every scenario's
     * own figures side by side. Each metric column (ADV, Base Frt, ...)
     * still groups its own sub-columns under one shared header, but now as
     * Current | Scenario | Change per non-baseline scenario, not one
     * repeated sub-column per scenario: Current reads muted (it's the
     * baseline, not the thing being evaluated), Scenario reads stronger
     * (it's the proposal), and Change is its own compact, directional
     * figure -- so the comparison this table exists for doesn't require
     * mentally subtracting two columns by eye. Two scenarios (today's only
     * case in this demo) means one Change column per metric; a third
     * scenario would add its own Scenario/Change pair after it, each still
     * diffed against the same baseline (scenarios[0]) rather than a chain.
     *
     * Built by hand rather than through DataTable: DataTable's own columns
     * are flat (one header cell each), with no notion of a header cell
     * spanning several grouped sub-columns, which this table's whole shape
     * depends on. The row hierarchy (expand/collapse, indentation, "-"
     * placeholders) is reimplemented to match DataTable's own behavior
     * rather than reused, for the same reason. Deliberately not built on
     * the shared .data-table/.matrix classes either -- this is a scoped,
     * presentation-only redesign of this one table (Option 1, and every
     * other table in the app, is unaffected), so its own visual rules live
     * under their own .comparison-merged namespace in components.css
     * instead of touching either shared pattern's rules.
     *
     * Rows come from one reference scenario's tree (scenarios[0] -- the
     * baseline every Change column diffs against, same as Option 1's own
     * panel order); every other scenario's figures for that row are looked
     * up against its own tree by full ancestor path (e.g. "Unincented PLD >
     * Sub-total"), not bare label -- this tree has more than one row named
     * "Sub-total" (one under Unincented PLD, another under Hormel 2024),
     * and a plain label-keyed map collapses those into whichever one a
     * given walk visits last, quietly showing one branch's figures under
     * the other's row. A path missing from a given scenario's tree
     * (shouldn't happen with this demo's parallel trees, but not assumed)
     * renders "-" rather than throwing.
     */
    function mergedSummaryTable() {
      var trees = DA.data.packetSummaryTrees;
      var metricColumns = summaryColumns().slice(1); // drop the row-label column -- built separately below
      var baseline = scenarios[0] || { name: 'Current' };
      var referenceTree = trees[baseline.name] || trees.Current;

      function indexByPath(tree) {
        var map = {};
        (function walk(list, ancestors) {
          (list || []).forEach(function (row) {
            var path = ancestors.concat(row.label);
            map[path.join(' > ')] = row;
            if (row.children) walk(row.children, path);
          });
        })(tree, []);
        return map;
      }

      var indexByScenario = {};
      scenarios.forEach(function (scenario) {
        indexByScenario[scenario.name] = indexByPath(trees[scenario.name] || trees.Current);
      });

      // One Current sub-column, then one Scenario+Change pair per
      // non-baseline scenario -- every metric shares this same shape, so
      // it's built once rather than per column.
      var subColumns = [{ kind: 'current', scenario: baseline }].concat(
        scenarios.slice(1).reduce(function (cols, scenario) {
          return cols.concat([
            { kind: 'scenario', scenario: scenario },
            { kind: 'change', scenario: scenario, against: baseline }
          ]);
        }, [])
      );

      var rowheadFrozenStyle = { position: 'sticky', left: '0' };

      var colgroup = el('colgroup', {}, [el('col', { style: { width: '210px' } })].concat(
        metricColumns.reduce(function (cols, metric) {
          return cols.concat(subColumns.map(function (sub) {
            return el('col', { style: { width: sub.kind === 'change' ? '76px' : (metric.width || '96px') } });
          }));
        }, [])
      ));

      // The divider between one metric's own columns and the next
      // (.comparison-merged__group-start) belongs on the FIRST sub-column
      // of a metric group -- but only once that group is itself past the
      // first metric, since the frozen row-header column already borders
      // that one. `subColumns` is one shared, metric-agnostic array reused
      // for every metric, so which sub-column is "first" is a per-metric
      // fact (subIndex === 0), and whether it needs a divider at all is a
      // per-metric-position fact (metricIndex > 0) -- neither belongs on
      // the shared descriptor itself, so both are passed in here instead.
      function subColClass(sub, isGroupStart) {
        return 'comparison-merged__col--' + sub.kind + (isGroupStart ? ' comparison-merged__group-start' : '');
      }

      var thead = el('thead', {}, [
        el('tr', {}, [
          el('th', {
            className: 'is-rowhead is-frozen-col is-frozen-edge comparison-merged__rowhead',
            attrs: { scope: 'col', rowspan: '2' },
            style: rowheadFrozenStyle,
            text: 'Cost Basis: FA'
          })
        ].concat(metricColumns.map(function (metric, metricIndex) {
          return el('th', {
            className: 'comparison-merged__metric-head' + (metricIndex > 0 ? ' comparison-merged__group-start' : ''),
            attrs: { scope: 'colgroup', colspan: String(subColumns.length) },
            text: metric.label
          });
        }))),
        el('tr', {}, metricColumns.reduce(function (cells, metric, metricIndex) {
          return cells.concat(subColumns.map(function (sub, subIndex) {
            return el('th', {
              className: subColClass(sub, metricIndex > 0 && subIndex === 0),
              attrs: { scope: 'col' },
              text: sub.kind === 'change' ? 'Change' : sub.scenario.name
            });
          }));
        }, []))
      ]);

      var tbody = el('tbody');
      var open = [];
      (function seed(list) {
        (list || []).forEach(function (row) {
          if (row.expanded) open.push(row);
          if (row.children) seed(row.children);
        });
      })(referenceTree);

      function childrenOf(row) { return row.children && row.children.length ? row.children : null; }

      function addRow(row, depth, path) {
        var expanded = open.indexOf(row) !== -1;
        var children = childrenOf(row);

        // A leaf row (no children) has no toggle button, and skipping it
        // outright (rather than reserving its own space) left its label
        // flush against the cell's own padding -- lining up with the
        // *depth*-based padding step alone, not with a toggle-bearing
        // row's own label at that same depth (its parent, or a sibling
        // that does have children), whose label sits row-toggle's own
        // width + the expand-cell gap further right. Same fix as
        // DataTable.js's own cell(): a same-size, invisible spacer when
        // there's no toggle, so every row's label lands at one consistent
        // position for its depth.
        var toggle = children
          ? el('button', {
              className: 'row-toggle u-tap-target',
              attrs: {
                type: 'button',
                'aria-expanded': expanded ? 'true' : 'false',
                'aria-label': (expanded ? 'Collapse ' : 'Expand ') + row.label
              },
              on: {
                click: function () {
                  var at = open.indexOf(row);
                  if (at === -1) open.push(row); else open.splice(at, 1);
                  renderRows();
                }
              }
            }, [expanded ? DA.icons.chevronDown(14) : DA.icons.chevronRight(14, '')])
          : el('span', { className: 'row-toggle-spacer', attrs: { 'aria-hidden': 'true' } });

        var labelCell = el('td', {
          className: 'is-rowhead is-frozen-col is-frozen-edge comparison-merged__rowhead has-expander' + (depth ? ' is-child-cell' : ''),
          style: Object.assign({}, rowheadFrozenStyle, depth ? { 'padding-left': (depth * 20 + 12) + 'px' } : {})
        }, [
          el('span', { className: 'expand-cell' }, [toggle, el('span', { text: withCustomer(row.label) })])
        ]);

        var valueCells = metricColumns.reduce(function (cells, metric, metricIndex) {
          var matchedByScenario = {};
          subColumns.forEach(function (sub) {
            var matched = indexByScenario[sub.scenario.name][path];
            matchedByScenario[sub.scenario.name] = matched ? matched[metric.key] : null;
          });

          return cells.concat(subColumns.map(function (sub, subIndex) {
            var groupStart = metricIndex > 0 && subIndex === 0;
            if (sub.kind === 'change') {
              var change = summaryChange(matchedByScenario[sub.against.name], matchedByScenario[sub.scenario.name]);
              return el('td', {
                className: subColClass(sub, groupStart) + ' comparison-merged__change comparison-merged__change--' + change.direction,
                text: change.text
              });
            }
            var value = matchedByScenario[sub.scenario.name];
            return el('td', { className: subColClass(sub, groupStart), text: value == null ? '-' : value });
          }));
        }, []);

        tbody.appendChild(el('tr', { className: depth ? 'is-child-row' : '' }, [labelCell].concat(valueCells)));
      }

      // flatten (row, depth, path) triples depth-first so a parent's own row
      // renders immediately before its (currently open) children, same
      // order/shape DataTable's own flatten() produces -- path carries each
      // row's own full ancestor chain, the same key indexByPath() uses, so
      // addRow() can look up the *this* "Sub-total", not just any row that
      // happens to share its label elsewhere in the tree.
      function flatten() {
        var flat = [];
        function visit(row, depth, ancestors) {
          var path = ancestors.concat(row.label);
          flat.push({ row: row, depth: depth, path: path.join(' > ') });
          if (open.indexOf(row) !== -1) {
            (childrenOf(row) || []).forEach(function (child) { visit(child, depth + 1, path); });
          }
        }
        referenceTree.forEach(function (row) { visit(row, 0, []); });
        return flat;
      }

      function renderRows() {
        DA.dom.clear(tbody);
        flatten().forEach(function (entry) { addRow(entry.row, entry.depth, entry.path); });
      }

      renderRows();

      var table = el('table', { className: 'comparison-merged' }, [
        el('caption', { className: 'u-visually-hidden', text: 'Scenario comparison: Current vs Scenario, with Change' }),
        colgroup,
        thead,
        tbody
      ]);

      return el('div', {
        className: 'comparison-merged__viewport scroll-area',
        attrs: { tabindex: '0', role: 'region', 'aria-label': 'Scenario comparison' }
      }, [table]);
    }

    /**
     * Comparisons tab: Option 1 (today's side-by-side per-scenario panels)
     * or Option 2 (one merged table, each metric split into a sub-column
     * per scenario), swapped live -- same switcher pattern Pricing Terms'
     * Services/Accessorials tabs already use for their own Option 1/2/3.
     */
    function summaryView(toggleSlot) {
      var option = 'option1';
      var mount = el('div', {});

      function render() {
        if (option === 'option2') {
          if (toggleSlot) DA.dom.clear(toggleSlot);
          DA.dom.clear(mount).appendChild(
            el('div', { className: 'card' }, [mergedSummaryTable()])
          );
        } else {
          DA.dom.clear(mount).appendChild(summaryOption1(toggleSlot));
        }
      }

      var switcher = C.SegmentedControl({
        ariaLabel: 'Comparisons view layout',
        value: option,
        items: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' }
        ],
        onChange: function (value) {
          option = value;
          render();
        }
      });

      render();

      return el('div', {}, [
        el('div', { className: 'plan-view-option-switch' }, [switcher]),
        mount
      ]);
    }

    /* ---- Shipping Profiles tab -------------------------------------------- */

    /**
     * The Filters drawer shared by every Analyzer sub-tab from Services
     * through Weight & Cube (each reaches it through its own
     * profileFilters()/accessorialView()'s Filters button below) -- same
     * drawer shell Create New Scenario uses. All 6 fields are real,
     * multi-select trees per the client's reference screenshots (Choose
     * Account and Choose Service alone go a level deeper, into actual
     * hierarchy rather than a flat list); every one of the 6 gets its own
     * "Default" badge on the All row, matching every field's own
     * screenshot. Choose Accessorial, Choose Service Feature Code and
     * Choose Movement Direction Code each pull from their own flat list
     * in js/data/analyzerPacket.js.
     */
    function openFiltersDrawer(trigger) {
      var fields = [
        C.TreeCheckboxField({ label: 'Choose Account', tree: DA.data.filterAccountTree, allBadge: 'Default' }),
        C.TreeCheckboxField({ label: 'Choose Service', tree: DA.data.filterServiceTree, allBadge: 'Default' }),
        C.TreeCheckboxField({
          label: 'Choose Accessorial',
          allBadge: 'Default',
          tree: DA.data.filterAccessorialTypes.map(function (label) { return { label: label }; })
        }),
        C.TreeCheckboxField({
          label: 'Choose Service Feature Code',
          allBadge: 'Default',
          tree: DA.data.filterServiceFeatureCodes.map(function (label) { return { label: label }; })
        }),
        C.TreeCheckboxField({
          label: 'Choose Movement Direction Code',
          allBadge: 'Default',
          tree: DA.data.filterMovementDirectionCodes.map(function (label) { return { label: label }; })
        }),
        C.TreeCheckboxField({
          label: 'Choose Container Type',
          allBadge: 'Default',
          tree: DA.data.filterContainerTypes.map(function (label) { return { label: label }; })
        })
      ];

      var drawer = C.Modal({
        variant: 'drawer',
        title: 'Filters',
        returnFocusTo: trigger,
        body: el('div', { className: 'drawer-form' }, fields.concat([
          el('div', { className: 'drawer-form__actions' }, [
            C.Button({
              label: 'Apply Filters',
              variant: 'primary',
              shape: 'pill',
              onClick: function () { drawer.close(); }
            }),
            C.Button({
              label: 'Clear All',
              variant: 'outline',
              shape: 'pill',
              onClick: function () { fields.forEach(function (field) { field.reset(); }); }
            })
          ])
        ]))
      });

      drawer.open();
    }

    function profileFilters() {
      var filtersButton = C.Button({
        label: 'Filters',
        variant: 'ghost',
        icon: DA.icons.filter(16),
        onClick: function () { openFiltersDrawer(filtersButton); }
      });

      return el('div', { className: 'card' }, [
        el('div', { className: 'view-filters' }, [
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Scenario',
              value: scenarios[0] && scenarios[0].name,
              options: scenarios.map(function (scenario) {
                return { value: scenario.name, label: scenario.name };
              })
            })
          ]),
          el('span', { className: 'view-filters__divider' }),
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Account',
              value: customer + ' MAIN',
              options: accountOptions()
            })
          ]),
          filtersButton
        ])
      ]);
    }

    /**
     * The lane key every shipping profile view opens with: Movement, Mode and
     * (the raw) Core Service joined into one Core Service label column --
     * `row.serviceLabel`, when a row carries one, renders in its place as a
     * plain friendly name instead (Cost Details' own N-Next Day Air etc.).
     * `row.pkgType` renders the same two-line "UPS <service> -Pkg <type>"
     * plus superscript product/rate codes serviceLabel() (Services tab)
     * already established -- same .service-pkg* classes, reused rather than
     * duplicated, for the package-type row Cost Details' own Core Service
     * rows can now open onto.
     */
    function profileKeyColumns() {
      return [
        {
          key: 'coreService',
          label: 'Core Service',
          width: '220px',
          className: 'is-rowhead',
          // A Core Service group's own row, its package row and every
          // zone/lane row underneath read as one merged block -- no
          // divider between them -- rather than each carrying its own
          // separator; the line only returns once a fresh, top-level
          // Core Service row starts.
          mergeExpanded: true,
          render: function (row) {
            if (row.pkgType) {
              return el('span', { className: 'service-pkg' }, [
                el('span', { className: 'service-pkg__line', text: 'UPS ' + row.pkgParentLabel }),
                el('span', { className: 'service-pkg__meta' }, [
                  el('span', { text: '-Pkg ' + row.pkgType }),
                  el('sup', { className: 'service-pkg__codes', text: ' ' + row.pkgCodes })
                ])
              ]);
            }
            if (row.serviceLabel) return row.serviceLabel;
            if (!row.movement && !row.mode && !row.service) return '';
            return [row.movement, row.mode, row.service].join('-');
          }
        },
        numeric('zone', 'Zone', { width: '85px' }),
        numeric('lane', 'Lane', { width: '85px' })
      ];
    }

    function profileTable(options) {
      return el('div', { className: 'view-stack' }, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: options.caption,
            embedded: true,
            scrollable: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'coreService',
            // A row's own static `children` (Cost Details' package-type
            // rows, and the zone rows under them) win over the generic
            // zone split every other lane still opens onto dynamically. A
            // package-type row with no real `children` of its own (Cost
            // Details' two collapsed-in-the-screenshot rows, with no
            // visible contents to give it) stays a leaf rather than
            // falling through to that generic split -- it shares
            // zone: '-' with an ordinary lane row (so its own Zone column
            // reads as a dash, matching the screenshot) but isn't one.
            getChildren: function (row) {
              if (row.children) return row.children;
              if (row.pkgType) return null;
              if (row.zone !== '-') return null;
              return DA.data.zoneBreakdown(row, 'service', DA.data.additive[options.additive]);
            },
            columns: profileKeyColumns().concat(options.columns),
            rows: options.rows
          })
        ])
      ]);
    }

    /** Filter row for the pricing term views. */
    function pricingFilters() {
      return el('div', { className: 'card' }, [
        el('div', { className: 'view-filters' }, [
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Scenario',
              value: scenarios[scenarios.length - 1] && scenarios[scenarios.length - 1].name,
              options: scenarios.map(function (scenario) {
                return { value: scenario.name, label: scenario.name };
              })
            })
          ]),
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Bid',
              value: customer + ' MAIN',
              options: accountOptions()
            })
          ]),
          C.Button({
            label: 'Reset',
            variant: 'ghost',
            icon: DA.icons.refresh(15),
            iconPosition: 'end'
          }),
          el('span', { className: 'view-filters__divider' }),
          C.Button({
            label: 'Define Bid Structure',
            variant: 'ghost',
            icon: DA.icons.chevronRight(14, ''),
            iconPosition: 'end'
          })
        ])
      ]);
    }

    function costView() {
      return profileTable({
        caption: 'Shipping profile cost',
        additive: 'cost',
        rows: DA.data.shippingProfileCost,
        columns: [
          numeric('volume', 'Volume', { link: true, width: '110px' }),
          numeric('adv', 'ADV', { link: true, width: '100px' }),
          numeric('pps', 'PPS', { link: true, width: '80px' }),
          numeric('weightPiece', 'Weight/ Piece', { link: true, width: '120px' }),
          numeric('avgCube', 'Avg Cube', { link: true, width: '105px' }),
          numeric('avgCubeFactor', 'Avg Cube Factor', { link: true, width: '145px' }),
          numeric('puDens', 'PU Dens', { link: true, width: '105px' }),
          numeric('dlDens', 'DL Dens', { link: true, width: '105px' }),
          numeric('pu', 'PU', { link: true, width: '90px' }),
          numeric('ls', 'LS', { link: true, width: '90px' }),
          numeric('cs', 'CS', { link: true, width: '90px' }),
          numeric('ar', 'AR', { link: true, width: '90px' }),
          numeric('jf', 'JF', { link: true, width: '95px' }),
          numeric('gf', 'GF', { link: true, width: '90px' }),
          numeric('br', 'BR', { link: true, width: '90px' }),
          numeric('pd', 'PD', { link: true, width: '90px' }),
          numeric('dl', 'DL', { link: true, width: '90px' }),
          numeric('no', 'NO', { link: true, width: '90px' }),
          numeric('totalFreightCost', 'Base Cost', { link: true, width: '160px' })
        ]
      });
    }

    // Renamed/reordered from "Freight Gross Spent / Freight Discount (%) /
    // Freight RPP / Freight Net Spent / Freight Profit ($) / Freight OR"
    // to match the "Base Gross Rev / Base Net Rev / Base Disc / Base RPP /
    // Base Profit / Base OR" naming and order every other Analyzer sub-tab
    // (Services, Accounts, Weight & Cube) already uses for this same
    // metric set, per the client's own reference screenshot -- label and
    // position only, the underlying data keys (freightGrossSpent, etc.,
    // still DA.data.additive.zone's own additive list in breakdowns.js)
    // are unchanged.
    function zoneView() {
      return profileTable({
        caption: 'Shipping profile zones',
        additive: 'zone',
        rows: DA.data.shippingProfileZone,
        columns: [
          numeric('volume', 'Volume', { link: true, width: '110px' }),
          numeric('adv', 'ADV', { link: true, width: '100px' }),
          numeric('pps', 'PPS', { link: true, width: '80px' }),
          numeric('weightPiece', 'Weight/Piece', { link: true, width: '125px' }),
          numeric('freightGrossSpent', 'Base Gross Rev', { link: true, width: '135px' }),
          numeric('freightNetSpent', 'Base Net Rev', { link: true, width: '125px' }),
          numeric('freightDiscount', 'Base Disc', { link: true, width: '95px' }),
          numeric('freightRpp', 'Base RPP', { link: true, width: '105px' }),
          numeric('freightProfit', 'Base Profit', { link: true, width: '110px' }),
          numeric('freightOr', 'Base OR', { link: true, width: '95px' })
        ]
      });
    }

    function accessorialView() {
      function labelColumn(key, label, width, spanRepeats) {
        return {
          key: key,
          label: label,
          width: width || '135px',
          className: 'is-rowhead',
          spanRepeats: spanRepeats
        };
      }

      return el('div', { className: 'view-stack' }, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: 'Accessorial charges',
            embedded: true,
            scrollable: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'detail',
            // Accessorial Type, Group and Detail together identify the
            // row -- frozen as a group during horizontal scroll, the same
            // treatment Accounts' own Parent/Sub Parent/Account Number
            // triple gets (freezeColumns: 3 below).
            freezeColumns: 3,
            getChildren: function (row) { return row.children; },
            columns: [
              // Accessorial Type and Group repeat the same value down every
              // row a charge breaks into -- the children carry it blank
              // rather than restate it, so it reads as one merged field.
              labelColumn('type', 'Accessorial Type', null, true),
              labelColumn('group', 'Group', null, true),
              labelColumn('detail', 'Detail', '235px'),
              numeric('totalUnits', 'Total Units', { link: true, width: '120px' }),
              numeric('pctTotalVolume', '% Total Volume', { link: true, width: '150px' }),
              numeric('adu', 'ADU', { link: true, width: '110px' }),
              numeric('grossRevenue', 'Gross Revenue', { link: true, width: '150px' }),
              numeric('netRevenue', 'Net Revenue', { link: true, width: '145px' }),
              numeric('discount', 'Discount', { link: true, width: '110px' }),
              numeric('grossRpp', 'Gross RPP', { link: true, width: '115px' }),
              numeric('netRpp', 'Net RPP', { link: true, width: '110px' }),
              numeric('profit', 'Profit', { link: true, width: '110px' }),
              numeric('or', 'OR', { width: '90px' })
            ],
            rows: DA.data.shippingProfileAccessorial
          })
        ])
      ]);
    }

    /**
     * A top-level service renders as its plain name; a package-type child
     * (packageBreakdown's Commercial/Residential rows) renders as two
     * lines instead -- "UPS " + the service name, then "-Pkg " + the
     * package type with its product/rate codes in superscript beside it,
     * matching the reference screen exactly rather than reusing the
     * single-line Zone-child label.
     */
    function serviceLabel(row) {
      if (!row.pkgType) return row.service;
      return el('span', { className: 'service-pkg' }, [
        el('span', { className: 'service-pkg__line', text: 'UPS ' + row.service }),
        el('span', { className: 'service-pkg__meta' }, [
          el('span', { text: '-Pkg ' + row.pkgType }),
          el('sup', { className: 'service-pkg__codes', text: ' ' + row.pkgCodes })
        ])
      ]);
    }

    function serviceView() {
      return el('div', { className: 'view-stack' }, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: 'Shipping profile services',
            embedded: true,
            scrollable: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'service',
            getChildren: function (row) {
              // A package-type row (Commercial/Residential, already one
              // level deep) is a leaf -- without this guard it fell back
              // through to packageBreakdown() again and rendered an
              // expander chevron onto rows with nothing under them, the
              // same guard costView()/weightCubeView() already carry.
              if (row.pkgType) return null;
              return DA.data.packageBreakdown(row, 'service', DA.data.additive.service);
            },
            columns: [
              { key: 'service', label: 'Core Service', width: '250px', className: 'is-rowhead', render: serviceLabel },
              numeric('volume', 'Volume', { link: true, width: '95px' }),
              numeric('adv', 'ADV', { link: true, width: '80px' }),
              numeric('avgZone', 'Avg Zone', { link: true, width: '100px' }),
              numeric('billableWt', 'Billable Wt', { link: true, width: '105px' }),
              numeric('pps', 'PPS', { link: true, width: '80px' }),
              numeric('baseGrossRev', 'Base Gross Rev', { link: true, width: '135px' }),
              numeric('baseNetRev', 'Base Net Rev', { link: true, width: '125px' }),
              numeric('disc', 'Disc', { width: '85px' }),
              numeric('baseRpp', 'Base RPP', { link: true, width: '105px' }),
              numeric('baseProfit', 'Base Profit', { link: true, width: '110px' }),
              numeric('baseOr', 'Base OR', { width: '95px' }),
              numeric('totalGrossRev', 'Total Gross Rev', { link: true, width: '140px' }),
              numeric('totalNetRev', 'Total Net Rev', { link: true, width: '130px' }),
              numeric('totalDisc', 'Total Disc', { width: '95px' }),
              numeric('totalRpp', 'Total RPP', { link: true, width: '110px' }),
              numeric('totalProfit', 'Total Profit', { link: true, width: '115px' }),
              numeric('totalOr', 'Total OR', { width: '95px' })
            ],
            rows: DA.data.packetServices
          })
        ])
      ]);
    }

    function accountsView() {
      function labelColumn(key, label, width, render, spanRepeats) {
        return {
          key: key,
          label: label,
          width: width || '160px',
          className: 'is-rowhead',
          render: render,
          spanRepeats: spanRepeats
        };
      }

      return el('div', { className: 'view-stack' }, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: 'Accounts',
            embedded: true,
            scrollable: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'accountNumber',
            // Parent, Sub Parent and Account Number together identify the
            // record -- frozen as a group, the same treatment Movement/
            // Mode/Core Service gets.
            freezeColumns: 3,
            getChildren: function (row) { return row.children; },
            columns: [
              // Parent and Sub Parent repeat down every account under
              // them, left blank on the children the same way Accessorial
              // Type/Group are -- one merged field, not a fresh blank cell.
              labelColumn('parent', 'Parent', '170px', function (row) {
                return row.parent ? withCustomer(row.parent) : '';
              }, true),
              labelColumn('subParent', 'Sub Parent', '150px', null, true),
              labelColumn('accountNumber', 'Account Number', '170px'),
              numeric('volume', 'Volume', { link: true, width: '110px' }),
              numeric('adv', 'ADV', { link: true, width: '100px' }),
              numeric('zone', 'Zone', { link: true, width: '90px' }),
              numeric('billableWt', 'Billable Wt', { link: true, width: '100px' }),
              numeric('pps', 'PPS', { link: true, width: '80px' }),
              numeric('baseGrossRev', 'Base Gross Rev', { link: true, width: '135px' }),
              numeric('baseNetRev', 'Base Net Rev', { link: true, width: '125px' }),
              numeric('baseDisc', 'Base Disc', { width: '95px' }),
              numeric('baseRpp', 'Base RPP', { link: true, width: '105px' }),
              numeric('baseProfit', 'Base Profit', { link: true, width: '110px' }),
              numeric('baseOr', 'Base OR', { width: '95px' }),
              numeric('totalGrossRev', 'Total Gross Revenue', { link: true, width: '150px' }),
              numeric('totalNetRev', 'Total Net Revenue', { link: true, width: '140px' }),
              numeric('totalDisc', 'Total Discount %', { width: '120px' }),
              numeric('totalRpp', 'Total RPP', { link: true, width: '105px' }),
              numeric('totalProfit', 'Total Profit', { link: true, width: '115px' }),
              numeric('totalOr', 'Total OR', { width: '95px' })
            ],
            rows: DA.data.packetAccounts
          })
        ])
      ]);
    }

    function weightCubeView() {
      return el('div', { className: 'view-stack' }, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: 'Weight and cube',
            embedded: true,
            scrollable: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'service',
            // A service opens onto the billable weight tiers behind it --
            // unless it already carries a real `children` array of its own
            // (the package-type row and the billable rows under it, on the
            // 2 services Weight & Cube's own reference screen breaks out),
            // which wins over the generic split. A package-type row with
            // no real children of its own (shown collapsed in that
            // reference, contents not given) stays a leaf rather than
            // falling through to it. A row that's already a billable-
            // weight-tier leaf (a real `billable` number of its own, not
            // the '-' every Core Service/package row carries) stays a
            // leaf too, rather than breaking down a second time.
            getChildren: function (row) {
              if (row.children) return row.children;
              if (row.pkgType) return null;
              if (row.billable !== '-') return null;
              return DA.data.weightBreakdown(row, 'service', DA.data.additive.service);
            },
            columns: [
              // serviceLabel() (defined above, already used by the
              // Services tab) renders a package-type row's two-line
              // "UPS <service> -Pkg <type>" plus superscript codes, and a
              // plain row's own service name otherwise -- reused as-is.
              // mergeExpanded matches Cost Details/Zones' own Core Service
              // column: no divider between a service row and the
              // package/billable-weight rows it opens onto.
              { key: 'service', label: 'Core Service', width: '220px', className: 'is-rowhead', render: serviceLabel, mergeExpanded: true },
              { key: 'billable', label: 'Billable Wt', width: '100px', className: 'is-numeric is-end' },
              numeric('volume', 'Volume', { link: true, width: '95px' }),
              numeric('adv', 'ADV', { link: true, width: '80px' }),
              numeric('pps', 'PPS', { link: true, width: '80px' }),
              numeric('weightPiece', 'Weight/Piece', { link: true, width: '120px' }),
              numeric('baseGrossRev', 'Base Gross Rev', { link: true, width: '135px' }),
              numeric('baseNetRev', 'Base Net Rev', { link: true, width: '125px' }),
              numeric('baseDisc', 'Base Disc', { width: '100px' }),
              numeric('baseRpp', 'Base RPP', { link: true, width: '105px' }),
              numeric('baseProfit', 'Base Profit', { link: true, width: '110px' }),
              numeric('baseOr', 'Base OR', { width: '95px' })
            ],
            rows: DA.data.packetWeightCube
          })
        ])
      ]);
    }

    /**
     * The bottom-of-page call to action every Pricing Terms, Other Terms
     * and Adjustments sub-tab shares -- one primary action for the whole
     * packet, not a per-table save, so it sits below everything else on
     * the tab rather than inside any one card. Disabled: nothing in this
     * demo actually persists yet, same as it's always been on Adjustments
     * (the one tab that already carried this button before this pass
     * added it to the rest).
     */
    function updatePacketCta() {
      return el('div', { className: 'page-actions page-actions--wide' }, [
        C.Button({
          label: 'Update Analyzer Packet',
          variant: 'primary',
          shape: 'pill',
          icon: DA.icons.chevronRight(14, ''),
          iconPosition: 'end',
          disabled: true
        })
      ]);
    }

    /** Filter row shared by Adjustments and Other Terms: scenario and bid pickers plus Reset. */
    function scenarioBidFilters() {
      return el('div', { className: 'card' }, [
        el('div', { className: 'view-filters' }, [
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Scenario',
              value: scenarios[0] && scenarios[0].name,
              options: scenarios.map(function (scenario) {
                return { value: scenario.name, label: scenario.name };
              })
            })
          ]),
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Bid',
              value: customer + ' MAIN',
              options: accountOptions()
            })
          ]),
          C.Button({
            label: 'Reset',
            variant: 'ghost',
            icon: DA.icons.refresh(15),
            iconPosition: 'end'
          })
        ])
      ]);
    }

    /** Filter row above a Rate Charts panel: bid and service group pickers, Export. */
    function rateChartPanelFilters() {
      var bid = 'P310041099 (SP- Stampin Up)';
      var serviceGroup = 'UPS E-Standard to Canada';
      return el('div', { className: 'card' }, [
        el('div', { className: 'view-filters' }, [
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({ label: 'Choose Bid', value: bid, options: [{ value: bid, label: bid }] })
          ]),
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Service Group',
              value: serviceGroup,
              options: [{ value: serviceGroup, label: serviceGroup }]
            })
          ]),
          C.Button({ label: 'Export', variant: 'ghost', icon: DA.icons.download(16) })
        ])
      ]);
    }

    /**
     * One scenario's rate grid: zones across, weight tiers down, a $ figure
     * per cell. The corner cell carries both axis labels on a diagonal --
     * "Zones" upper right, "Weight" lower left -- in one header row/cell
     * instead of two stacked ones; the row-header column is a single
     * <th colspan="2"> per row (was an empty <th> plus a separate <td>),
     * both per explicit request: the merge centers the weight figure under
     * the corner's own full width, and -- since a real <th> is naturally
     * excluded from .matrix's own tr:hover td rule -- also removes the
     * hover highlight that was catching the "to be" a <td> weight cell
     * along with the row's real values.
     * Net is the only basis with reference data; Gross and Volume show the
     * table's own empty state rather than invented figures.
     */
    function rateChartGrid(scenario, basis) {
      var data = DA.data.rateChartGrid;
      var zones = data.zones;

      if (basis !== 'net') {
        return el('p', { className: 'table-empty', text: 'No data available.' });
      }

      var head = el('thead', {}, [
        el('tr', {}, [
          el('th', { className: 'matrix__rowhead matrix__corner rate-chart__rowhead', attrs: { scope: 'col', colspan: 2 } }, [
            el('span', { className: 'matrix__corner-label matrix__corner-label--zones', text: 'Zones' }),
            el('span', { className: 'matrix__corner-label matrix__corner-label--weight', text: 'Weight' })
          ])
        ].concat(zones.map(function (zone) {
          return el('th', { attrs: { scope: 'col' }, text: zone });
        })))
      ]);

      var body = el('tbody', {}, data.rows.map(function (row) {
        return el('tr', {}, [
          el('th', { className: 'matrix__rowhead rate-chart__rowhead', attrs: { scope: 'row', colspan: 2 }, text: row.weight })
        ].concat(row.net.map(function (rate) {
          // A plain <a> here, same as every other report table's linked
          // figure -- it's what makes the value read as link-blue and
          // pick up the hover highlight, both for free from the base `a`
          // rule rather than a one-off color/hover rule just for this cell.
          return el('td', { className: 'matrix__cell' }, [
            el('a', { text: rate, attrs: { href: '#rate-detail', 'aria-label': 'Rate ' + rate } })
          ]);
        })));
      }));

      return el('div', { className: 'grid-scroll scroll-area' }, [
        el('table', { className: 'matrix matrix--sticky-head' }, [
          el('caption', { className: 'u-visually-hidden', text: scenario.name + ' rate chart' }),
          head,
          body
        ])
      ]);
    }

    function rateChartPanel(scenario) {
      var basis = 'net';
      var gridMount = el('div', {});

      function renderGrid() {
        DA.dom.clear(gridMount).appendChild(rateChartGrid(scenario, basis));
      }
      renderGrid();

      return el('div', { className: 'rate-chart-panel' }, [
        rateChartPanelFilters(),
        el('div', { className: 'card' }, [
          el('div', { className: 'card__body' }, [
            el('p', { className: 'section-title', style: { margin: 0 }, text: scenario.name })
          ])
        ]),
        el('div', { className: 'card' }, [
          el('div', { className: 'card__body' }, [
            C.RadioGroup({
              ariaLabel: 'Rate basis for ' + scenario.name,
              name: 'rate-basis-' + scenario.number,
              value: basis,
              items: [
                { value: 'net', label: 'Net' },
                { value: 'gross', label: 'Gross' },
                { value: 'volume', label: 'Volume' }
              ],
              onChange: function (value) { basis = value; renderGrid(); }
            }),
            el('div', { style: { 'margin-top': 'var(--space-4)' } }, [gridMount])
          ])
        ])
      ]);
    }

    /** Rate Charts: one panel per scenario, side by side. */
    function rateChartsView() {
      return el('div', { className: 'comparison-grid' },
        scenarios.map(function (scenario) { return rateChartPanel(scenario); })
      );
    }

    /**
     * A single, packet-wide dollar adjustment -- not one per lane the way
     * the reference screen this replaced first suggested. One row, one
     * editable figure.
     */
    function adjustmentsView() {
      // Only the filters+table pair goes in view-stack -- updatePacketCta()
      // stays outside it, as a plain sibling: .page-actions already carries
      // its own margin-top for the gap above it, and stacking that on top
      // of view-stack's own gap would double it up.
      return el('div', {}, [
        el('div', { className: 'view-stack' }, [
          scenarioBidFilters(),
          // .data-table itself is width: 100% unconditionally (every table
          // in the app relies on filling its own container) -- with only
          // one column here, there's nothing else for that column's own
          // 330px to proportion against under table-layout: fixed, so it
          // was being ignored and the table stretched to the full-width
          // .card instead. Capped the *card* itself to a narrow width
          // rather than touching the shared .data-table rule (which every
          // other, genuinely wide table in the app still needs), so the
          // single Dollar Amount column finally renders at its own
          // intended size.
          el('div', { className: 'card', style: { 'max-width': '350px' } }, [
            C.DataTable({
              caption: 'Adjustments',
              embedded: true,
              headerTone: 'warm',
              columns: [
                {
                  key: 'amount',
                  label: 'Dollar Amount',
                  width: '330px',
                  render: function (row) { return editableCell(row.amount); }
                }
              ],
              rows: [{ amount: '$0' }]
            }),
            el('div', { className: 'grid-footer' }, [
              el('a', { className: 'link-with-icon', attrs: { href: '#save-changes' } }, [
                DA.icons.save(15),
                el('span', { text: 'Save Changes' })
              ])
            ])
          ])
        ]),
        updatePacketCta()
      ]);
    }

    /** Other Terms > Dim Divisor: the DIM weight divisor set per service. */
    function dimDivisorView() {
      // Only the filters+table pair goes in view-stack -- updatePacketCta()
      // stays outside it, as a plain sibling: .page-actions already carries
      // its own margin-top for the gap above it, and stacking that on top
      // of view-stack's own gap would double it up.
      return el('div', {}, [
        el('div', { className: 'view-stack' }, [
          scenarioBidFilters(),
          el('div', { className: 'card' }, [
            el('div', { style: { padding: 'var(--space-4)' } }, [
              C.Button({ label: 'Add Service', variant: 'secondary', icon: DA.icons.plusCircle(16) })
            ]),
            C.DataTable({
              caption: 'Dim divisor',
              embedded: true,
              headerTone: 'warm',
              tinted: true,
              // Single Core Service column now, so nothing left to freeze
              // as a group.
              freezeColumns: 1,
              columns: [
                {
                  // `coreServiceLabel`, when a row carries one, renders as
                  // plain text (packetDimDivisor's own real service names);
                  // otherwise falls back to Movement/Mode/Service Group
                  // joined into one label, the same "Core Service" pattern
                  // Analyzer's Cost Details/Zones tables use
                  // (profileKeyColumns()).
                  key: 'coreService',
                  label: 'Core Service',
                  width: '280px',
                  className: 'is-rowhead',
                  render: function (row) {
                    if (row.coreServiceLabel) return row.coreServiceLabel;
                    return [row.movement, row.mode, row.serviceGroup].join('-');
                  }
                },
                // is-plain -- "DIM Divisor" is a fixed label, not a value
                // to edit or a link, so it shouldn't pick up the app-wide
                // teal treatment every other (non-rowhead, non-plain) cell
                // gets by default; dark text like the rest of the row
                // instead.
                { key: 'incentiveType', label: 'Incentive Type', width: '150px', className: 'is-plain' },
                {
                  key: 'incentiveAmount',
                  label: 'Incentive Amount',
                  width: '160px',
                  // The threshold bands behind the divisor code live in
                  // the Details dialog, not as a flat figure on this row.
                  render: function (row) {
                    return el('a', {
                      className: 'link-with-icon',
                      attrs: { href: '#structure-details-' + row.serviceGroup },
                      on: {
                        click: function (event) {
                          event.preventDefault();
                          DA.dialogs.DimDivisorDetailsDialog(row).open();
                        }
                      }
                    }, [el('span', { text: 'Structure Details' }), DA.icons.chevronRight(14, '')]);
                  }
                },
                {
                  key: 'remove',
                  label: '',
                  width: '56px',
                  render: function () {
                    return el('button', {
                      className: 'icon-action icon-action--danger u-tap-target',
                      attrs: { type: 'button', 'aria-label': 'Remove service' }
                    }, [DA.icons.trash(14)]);
                  }
                }
              ],
              rows: DA.data.packetDimDivisor
            })
          ])
        ]),
        updatePacketCta()
      ]);
    }

    /**
     * Other Terms: Dim Divisor is built; Published Fuel Surcharge has no
     * reference screen yet.
     */
    function otherTermsView() {
      return el('div', { className: 'tabs--boxed' }, [
        C.Tabs({
          ariaLabel: 'Other term views',
          value: 'dim-divisor',
          items: [
            { id: 'dim-divisor', label: 'Dim Divisor', render: dimDivisorView },
            {
              id: 'published-fuel-surcharge',
              label: 'Published Fuel Surcharge',
              render: function () {
                return el('div', {}, [emptyView('Published Fuel Surcharge')(), updatePacketCta()]);
              }
            }
          ]
        })
      ]);
    }

    /**
     * The merged "Analyzer" tab: Comparisons (the former standalone Summary
     * tab's content, unchanged) alongside the shipping-profile views, all as
     * one set of sub-tabs rather than two separate top-level tabs. Every
     * sub-tab's underlying content and data is exactly what it was before --
     * only the menu structure and labels moved, matching the reference menu.
     */
    function analyzerView() {
      // Seated once, into the tab bar's own right edge, instead of inside
      // the Comparisons panel -- summaryView() re-mounts its (re-created,
      // per render) toggle into this same slot each time that tab is
      // shown; Tabs itself hides the slot whenever any other tab is
      // active, so the control only ever appears next to the view it
      // affects.
      var comparisonSyncSlot = el('div', {});

      return el('div', { className: 'tabs--boxed' }, [
        C.Tabs({
          ariaLabel: 'Analyzer views',
          value: 'comparisons',
          extra: { node: comparisonSyncSlot, forTab: 'comparisons' },
          items: [
            {
              id: 'comparisons',
              label: 'Comparisons',
              render: function () { return summaryView(comparisonSyncSlot); }
            },
            { id: 'services', label: 'Services', render: serviceView },
            { id: 'charges', label: 'Charges', render: accessorialView },
            { id: 'accounts', label: 'Accounts', render: accountsView },
            { id: 'cost-details', label: 'Cost Details', render: costView },
            { id: 'zones', label: 'Zones', render: zoneView },
            { id: 'weight-cube', label: 'Weight & Cube', render: weightCubeView }
          ]
        })
      ]);
    }

    /* ---- Composition ------------------------------------------------------ */

    var page = el('main', { className: 'page', attrs: { id: 'main-content' } }, [
      C.Breadcrumb({
        separator: '/',
        items: [
          { label: 'My Analyzers', onClick: options.onExit },
          { label: 'Packet' }
        ]
      }),
      el('div', { className: 'record-header' }, [
        el('h2', {
          className: 'record-header__title title-rule title-rule--full',
          text: customer
        }),
        el('div', { className: 'record-header__meta' }, [
          el('span', { className: 'badge badge--success', text: packet.industry || '-' }),
          el('span', { text: 'Sub Industry : ' + (packet.subIndustry || '-') }),
          el('span', { className: 'meta-divider' }),
          el('span', { text: packet.referenceNumber || '-' }),
          el('span', { className: 'meta-divider' }),
          el('span', { text: 'Analyzer Packet: ' + (packet.packetId || '-') })
        ])
      ]),
      el('div', { className: 'page-back' }, [
        C.Button({
          label: 'Back to Scenarios',
          variant: 'link',
          icon: DA.icons.chevronLeft(14),
          onClick: function () { if (options.onBack) options.onBack(); }
        })
      ]),
      el('div', { className: 'report-filters' }, [
        el('div', { className: 'report-filters__field' }, [comparisonSelector]),
        el('div', { className: 'report-filters__field' }, [
          C.SelectField({ label: 'Revenue Basis', value: 'All', options: asOptions(DA.data.filterOptions.revenueBasis) })
        ]),
        el('div', { className: 'report-filters__field' }, [
          C.SelectField({
            label: 'Cost Basis',
            value: 'Fully Allocated Cost',
            options: asOptions(DA.data.filterOptions.costBasis)
          })
        ]),
        el('div', { className: 'report-filters__actions' }, [
          C.Button({
            label: 'Reset',
            variant: 'outline',
            shape: 'pill',
            icon: DA.icons.refresh(15),
            iconPosition: 'end'
          })
        ])
      ]),
      comparisonHeader,
      comparisonBand,
      el('div', { className: 'tabs--page' }, [
        C.Tabs({
          ariaLabel: 'Report sections',
          value: 'analyzer',
          items: [
            { id: 'analyzer', label: 'Analyzer', render: function () {
              return el('section', { className: 'panel panel--auto' }, [
                el('div', { className: 'panel__content' }, [analyzerView()])
              ]);
            } },
            { id: 'pricing-terms', label: 'Pricing Terms', render: function () {
              return el('section', { className: 'panel panel--auto' }, [
                el('div', { className: 'panel__content' }, [
                  DA.views.PricingTerms({
                    packet: packet,
                    numeric: numeric,
                    filters: pricingFilters,
                    emptyView: emptyView
                  })
                ])
              ]);
            } },
            { id: 'other-terms', label: 'Other Terms', render: otherTermsView },
            { id: 'adjustments', label: 'Adjustments', render: adjustmentsView },
            { id: 'rate-charts', label: 'Rate Charts', render: rateChartsView }
          ]
        })
      ])
    ]);

    return page;
  };
})(window.DA);
