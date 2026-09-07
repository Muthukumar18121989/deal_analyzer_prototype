/**
 * Pricing terms — the incentive structure behind a scenario's bid.
 *
 * Four views: Tier Incentives (revenue bands and the rates they unlock),
 * Services (an incentive plan per service), Accessorials, and Modifiers.
 * Modifiers has no reference screen yet.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;

  DA.views = DA.views || {};

  function editableCell(value, options) {
    options = options || {};
    return el('span', { className: 'cell-value' }, [
      el('span', {
        className: options.tone ? 'cell-value__text--' + options.tone : null,
        text: value
      }),
      options.editable === false
        ? null
        : el('button', {
            className: 'icon-action u-tap-target',
            attrs: { type: 'button', 'aria-label': 'Edit ' + value }
          }, [DA.icons.pencil(13)])
    ]);
  }

  /**
   * A Flow Through Option, shown as a plain outlined pill -- informational
   * only (which flow types this incentive plan can apply to), not a
   * pick list. Nothing here is actually selectable, so it's a plain
   * <span>, not a <button>: no click handler, no pressed state, no
   * affordance implying it can be toggled.
   */
  function flowThroughChip(label) {
    return el('span', { className: 'flow-chip' }, [el('span', { text: label })]);
  }

  /**
   * The bottom-of-page call to action every Pricing Terms sub-tab shares --
   * same "Update Analyzer Packet" pill Adjustments already carries at its
   * own tab's bottom (analyzerPacketPage.js's own updatePacketCta(), a
   * separate copy since that's a different module/closure) -- one primary
   * action for the whole packet, not a per-table save, so it sits below
   * everything else on the tab. Disabled: nothing in this demo actually
   * persists yet.
   */
  function updatePacketCta() {
    var C = DA.components;
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

  /* ---- Tier Incentives ---------------------------------------------------- */

  /**
   * A service group's sublabel pairs its billing type (LTR, PKG, or
   * PKG-Hundredweight) with the qualifier codes that follow it (FC, PP,
   * TP, RS...) -- the codes render as superscript, set off from the
   * billing type they qualify instead of reading as one flat string.
   */
  function serviceGroupSublabel(sublabel) {
    var match = /^(-(?:LTR|PKG(?:-Hundredweight)?))\s+(.+)$/.exec(sublabel || '');
    if (!match) return [el('span', { text: sublabel })];
    return [
      el('span', { text: match[1] }),
      ' ',
      el('sup', { text: match[2] })
    ];
  }

  function tierIncentivesView() {
    var C = DA.components;
    var tier = DA.data.tierIncentive;

    function bandCells(pick, options) {
      options = options || {};
      return tier.bands.map(function (band) {
        return el('td', {
          className: 'matrix__cell' + (band.target ? ' is-target' : '')
        }, [
          options.plain
            ? el('span', { text: band[pick] })
            : editableCell(band[pick], { editable: !band.locked })
        ]);
      });
    }

    var head = el('thead', {}, [
      el('tr', {}, [el('th', { attrs: { scope: 'col' }, text: '' })].concat(
        tier.bands.map(function (band) {
          return el('th', {
            attrs: { scope: 'col' },
            className: band.target ? 'is-target' : ''
          }, [
            band.target
              ? el('span', { className: 'matrix__target-flag', text: 'Target' })
              : el('span')
          ]);
        })
      ))
    ]);

    var body = el('tbody', {}, [
      el('tr', {}, [el('th', { className: 'matrix__label', attrs: { scope: 'row' }, text: '% Modeled' })]
        .concat(bandCells('modeled', { plain: true }))),
      el('tr', {}, [el('th', { className: 'matrix__label', attrs: { scope: 'row' }, text: 'Low' })]
        .concat(bandCells('low'))),
      el('tr', {}, [el('th', { className: 'matrix__label', attrs: { scope: 'row' }, text: 'High' })]
        .concat(bandCells('high', { plain: true }))),
      el('tr', { className: 'matrix__section' }, [
        el('td', { attrs: { colspan: tier.bands.length + 1 }, text: 'Service Group' })
      ])
    ].concat(tier.serviceGroups.map(function (group) {
      return el('tr', {}, [
        el('th', { className: 'matrix__label', attrs: { scope: 'row' } }, [
          el('span', { text: group.name }),
          el('span', { className: 'matrix__label-sub' }, serviceGroupSublabel(group.sublabel))
        ])
      ].concat(group.rates.map(function (rate, index) {
        var band = tier.bands[index];
        return el('td', { className: 'matrix__cell' + (band && band.target ? ' is-target' : '') }, [
          // Only the bands nearest the target stay open for negotiation --
          // the ones already past are read-only, same as Low's own locked band.
          editableCell(rate, { editable: Boolean(band && band.ratesEditable) })
        ]);
      })));
    })));

    var grid = el('div', { className: 'data-table__viewport scroll-area data-table__viewport--auto' }, [
      el('table', { className: 'matrix' }, [
        el('caption', { className: 'u-visually-hidden', text: tier.tier + ' incentives' }),
        head,
        body
      ])
    ]);

    var open = true;
    var toggle = el('button', {
      className: 'tier-header__toggle u-tap-target',
      attrs: { type: 'button', 'aria-expanded': 'true', 'aria-label': 'Collapse ' + tier.tier }
    }, [DA.icons.chevronDown(16)]);
    toggle.addEventListener('click', function () {
      open = !open;
      grid.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', (open ? 'Collapse ' : 'Expand ') + tier.tier);
      DA.dom.clear(toggle).appendChild(open ? DA.icons.chevronDown(16) : DA.icons.chevronRight(16, ''));
    });

    return el('div', { className: 'card' }, [
      el('div', { className: 'tier-header' }, [
        toggle,
        el('span', { className: 'tier-header__value', text: tier.tier }),
        el('div', { className: 'tier-header__meta' }, tier.meta.map(function (item) {
          return el('div', { className: 'tier-header__item' }, [
            el('span', { className: 'tier-header__label', text: item.label }),
            el('span', { className: 'tier-header__value', text: item.value })
          ]);
        })),
        el('div', { className: 'tier-header__actions' }, [
          C.Button({
            label: 'Tier Options',
            variant: 'link',
            icon: DA.icons.chevronRight(14, ''),
            iconPosition: 'end'
          })
        ])
      ]),
      grid
    ]);
  }

  /* ---- Services ----------------------------------------------------------- */

  /**
   * Cell-by-cell: a matrix grid, one row per weight band, rate an editable
   * percent per zone -- the method's own smaller, zero-padded zone set
   * (weightBreakZones), not the 10-zone set the other rate grids share.
   *
   * "Zone Reference: Daily" moved from a standalone caption above the
   * table into the table's own header (a third thead row, spanning the
   * zone columns only -- Billable Weight's own two columns sit blank
   * beneath it, matching the client's reference screenshot), and the last
   * band's `to` cell renders genuinely empty rather than an editable "-"
   * placeholder.
   *
   * The grid keeps its own working copy of the bands (not
   * DA.data.weightBreaks directly) so "Add weight break band" can grow it
   * without rewriting the shared demo data every other view of this same
   * table reads from. Per the client's own explicit description: clicking
   * "Add weight break band" turns the last band's empty `to` cell into a
   * live input; entering a value there bounds that band (its own "51+"
   * drops the "+", matching every bounded band above it) and appends a
   * fresh band below it, copying the completed band's own rate and left
   * with an empty `to` cell of its own -- the new open-ended band, in
   * exactly the same resting state the old one started in.
   */
  function weightBreakGrid() {
    var zones = DA.data.weightBreakZones;
    var bands = DA.data.weightBreaks.map(function (band) { return Object.assign({}, band); });
    var editingLast = false;
    var tableMount = el('div', {});

    function toCell(band, isLast) {
      if (isLast && editingLast) {
        var input = el('input', {
          className: 'cell-input',
          attrs: {
            type: 'text',
            inputmode: 'numeric',
            'aria-label': 'Weight break boundary after ' + band.from
          },
          on: {
            keydown: function (event) { if (event.key === 'Enter') input.blur(); },
            blur: function () { commitBoundary(band, input.value.trim()); }
          }
        });
        window.setTimeout(function () { input.focus(); }, 0);
        return el('span', { className: 'cell-value' }, [input]);
      }
      return band.to ? editableCell(band.to) : el('span', { className: 'cell-value' });
    }

    function commitBoundary(band, value) {
      editingLast = false;
      if (value) {
        band.to = value;
        band.from = band.from.replace('+', '');
        bands.push({ from: String(Number(value) + 1) + '+', to: '', rate: band.rate });
      }
      render();
    }

    function buildTable() {
      return el('table', { className: 'matrix matrix--sticky-head matrix--rowhead-no-hover' }, [
        el('caption', { className: 'u-visually-hidden', text: 'Weight break incentives by zone' }),
        el('thead', {}, [
          el('tr', {}, [
            el('th', { className: 'matrix__rowhead', attrs: { scope: 'col', colspan: 2 } }),
            el('th', {
              className: 'rate-grid__caption',
              attrs: { scope: 'colgroup', colspan: zones.length },
              text: 'Zone Reference: Daily'
            }),
            el('th', { className: 'matrix__rowhead', attrs: { scope: 'col' } })
          ]),
          el('tr', {}, [
            el('th', {
              className: 'matrix__rowhead',
              attrs: { scope: 'col', colspan: 2, rowspan: 2 },
              text: 'Billable Weight'
            }),
            el('th', { attrs: { scope: 'colgroup', colspan: zones.length }, text: 'Domestic' }),
            el('th', { attrs: { scope: 'col', rowspan: 2 }, text: '' })
          ]),
          el('tr', {}, zones.map(function (zone, index) {
            // The last zone column (008) sits at the end of this row's own
            // <th>s -- .matrix thead th:last-child would otherwise strip
            // its divider, meant for the table's real last header cell
            // (the rowspan'd action column, seated in the row above).
            return el('th', {
              className: index === zones.length - 1 ? 'is-last-zone' : null,
              attrs: { scope: 'col' },
              text: zone
            });
          }))
        ]),
        el('tbody', {}, bands.map(function (band, index) {
          var isLast = index === bands.length - 1;
          return el('tr', {}, [
            el('th', { className: 'matrix__rowhead', attrs: { scope: 'row' } }, [editableCell(band.from)]),
            el('td', { className: 'matrix__rowhead' }, [toCell(band, isLast)])
          ].concat(zones.map(function () {
            return el('td', { className: 'matrix__cell' }, [editableCell(band.rate)]);
          })).concat([
            el('td', {}, [
              el('button', {
                className: 'icon-action icon-action--danger u-tap-target',
                attrs: { type: 'button', 'aria-label': 'Remove weight break ' + band.from }
              }, [DA.icons.trash(14)])
            ])
          ]));
        }))
      ]);
    }

    function render() {
      DA.dom.clear(tableMount).appendChild(buildTable());
    }

    render();

    return el('div', { className: 'card' }, [
      el('div', { className: 'grid-scroll scroll-area' }, [tableMount]),
      el('div', { className: 'grid-footer' }, [
        el('a', {
          className: 'link-with-icon',
          attrs: { href: '#add-weight-break' },
          on: {
            click: function (event) {
              event.preventDefault();
              editingLast = true;
              render();
            }
          }
        }, [
          DA.icons.plusCircle(18),
          el('span', { text: 'Add weight break band' })
        ]),
        el('a', { className: 'link-with-icon', attrs: { href: '#save-changes' } }, [
          DA.icons.save(15),
          el('span', { text: 'Save Changes' })
        ])
      ])
    ]);
  }

  /**
   * Base/Zone: no weight bands at all -- one incentive amount per zone,
   * flat. A plain DataTable rather than a matrix grid, since there's no
   * second axis (zone columns x weight rows) to lay out.
   */
  function baseZoneGrid() {
    var C = DA.components;
    return el('div', { className: 'card' }, [
      C.DataTable({
        caption: 'Base/Zone incentive amounts',
        embedded: true,
        headerTone: 'warm',
        columns: [
          {
            key: 'zone', label: 'Zone', width: '160px',
            render: function (row) {
              return el('a', { text: row.zone, attrs: { href: '#zone-detail', 'aria-label': 'Zone ' + row.zone } });
            }
          },
          { key: 'adv', label: 'ADV', width: '160px', className: 'is-numeric is-end', headerClassName: 'is-end' },
          {
            key: 'incentiveAmount', label: 'Incentive Amount', width: '180px',
            className: 'is-numeric is-end', headerClassName: 'is-end',
            // A static sort affordance, matching the reference screen --
            // no other column in the app sorts yet, so this doesn't wire
            // up a real sort either, just the same chevron cue.
            renderHeader: function () {
              return el('span', { className: 'th-with-icon' }, [
                el('span', { text: 'Incentive Amount' }),
                DA.icons.chevronDown(14)
              ]);
            },
            render: function (row) { return editableCell(row.incentiveAmount, { tone: 'alert' }); }
          }
        ],
        rows: DA.data.baseZoneIncentives
      }),
      el('div', { className: 'grid-footer' }, [
        el('a', { className: 'link-with-icon', attrs: { href: '#save-changes' } }, [
          DA.icons.save(15),
          el('span', { text: 'Save Changes' })
        ])
      ])
    ]);
  }

  /**
   * Custom Net Rate: the same matrix shape Cell-by-cell uses, but keyed by
   * a single billable weight per row (not a from/to band) against
   * rateZones' full 10-zone set, and every cell is a flat $ figure -- set
   * by uploading a template, not edited cell by cell, so no pencil icons.
   */
  function customNetRateGrid() {
    var zones = DA.data.rateZones;

    var grid = el('table', { className: 'matrix' }, [
      el('caption', { className: 'u-visually-hidden', text: 'Custom net rate by weight and zone' }),
      el('thead', {}, [
        el('tr', {}, [
          el('th', {
            className: 'matrix__rowhead',
            attrs: { scope: 'col', rowspan: 2 },
            text: 'Billable Weight (lbs)'
          }),
          el('th', { attrs: { scope: 'colgroup', colspan: zones.length }, text: 'Domestic' })
        ]),
        el('tr', {}, zones.map(function (zone) {
          return el('th', { attrs: { scope: 'col' }, text: zone });
        }))
      ]),
      el('tbody', {}, DA.data.customNetRateRows.map(function (row) {
        return el('tr', {}, [
          el('th', { className: 'matrix__rowhead', attrs: { scope: 'row' }, text: row.weight })
        ].concat(zones.map(function (zone) {
          return el('td', { className: 'matrix__cell' }, [el('span', { text: row.rates[zone] })]);
        })));
      }))
    ]);

    return el('div', { className: 'card' }, [
      el('p', { className: 'rate-grid__caption', text: 'Zone Reference: Daily' }),
      el('div', { className: 'grid-scroll scroll-area' }, [grid]),
      el('div', { className: 'grid-footer' }, [
        el('a', { className: 'link-with-icon', attrs: { href: '#save-changes' } }, [
          DA.icons.save(15),
          el('span', { text: 'Save Changes' })
        ])
      ])
    ]);
  }

  /** The incentive settings for one service: options, method and rate grid --
      which of the three (Cell-by-cell, Base/Zone, Custom Net Rate) swaps
      live with the Incentive Method dropdown, each its own table shape. */
  function servicePlan() {
    var C = DA.components;
    var method = 'Cell-by-cell';
    var gridMount = el('div', {});

    // Only Custom Net Rate is set by uploading a template rather than
    // editing cells -- these stay out of the flow for the other two
    // methods rather than sitting there disabled.
    var templateActions = el('div', { className: 'field-row__actions' }, [
      el('a', { className: 'link-with-icon', attrs: { href: '#download-template' } }, [
        DA.icons.download(15),
        el('span', { text: 'Download Template' })
      ]),
      el('a', { className: 'link-with-icon', attrs: { href: '#upload-net-rate' } }, [
        DA.icons.upload(15),
        el('span', { text: 'Upload Net Rate Values' })
      ])
    ]);

    function renderMethod() {
      DA.dom.clear(gridMount).appendChild(
        method === 'Base/Zone' ? baseZoneGrid()
          : method === 'Custom Net Rate' ? customNetRateGrid()
          : weightBreakGrid()
      );
      templateActions.hidden = method !== 'Custom Net Rate';
    }

    renderMethod();

    return el('div', { className: 'plan-detail' }, [
      C.Tabs({
        ariaLabel: 'Freight type',
        value: 'commercial',
        items: [
          { id: 'commercial', label: 'Commercial Frt', render: function () { return el('div'); } },
          { id: 'residence', label: 'Residence Frt', render: function () { return el('div'); } }
        ]
      }),
      el('p', { className: 'plan-detail__label', text: 'Flow Through Options' }),
      el('div', { className: 'checkbox-row' }, DA.data.flowThroughOptions.map(function (option) {
        return flowThroughChip(option);
      })),
      C.SegmentedControl({
        ariaLabel: 'Incentive basis',
        value: 'base',
        items: [
          { value: 'base', label: 'Base Incentive' },
          { value: 'minimum', label: 'Minimum' }
        ]
      }),
      el('div', { className: 'field-row' }, [
        el('span', { className: 'field-row__label', text: 'Incentive Method' }),
        C.SelectField({
          label: 'Incentive Method',
          hideLabel: true,
          value: method,
          options: DA.data.filterOptions.incentiveMethod.map(function (value) {
            return { value: value, label: value };
          }),
          onChange: function (value) {
            method = value;
            renderMethod();
          }
        }),
        templateActions
      ]),
      gridMount
    ]);
  }

  /**
   * The first leaf (a node with no `children`) under a tree, depth-first,
   * shaped like TreeSelectField's own leaf records so the initial plan shown
   * before any selection reads the same as one chosen from the dropdown.
   */
  function firstLeaf(nodes, ancestors) {
    ancestors = ancestors || [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node.children) {
        return { label: node.label, value: node.label, path: ancestors.concat(node.label) };
      }
      var found = firstLeaf(node.children, ancestors.concat(node.label));
      if (found) return found;
    }
    return null;
  }

  /**
   * Shared shell for Services and Accessorials: a single-select tree dropdown
   * over `tree`, with the chosen leaf's plan (`leafRender`) shown below under
   * its full breadcrumb. Replaces the old always-expanded nested accordions.
   */
  function planPicker(options) {
    var C = DA.components;
    var tree = options.tree;
    var planSlot = el('div', {});

    function showPlan(leaf) {
      DA.dom.clear(planSlot).appendChild(
        el('div', { className: 'plan-detail-panel' }, [
          el('p', { className: 'plan-detail-panel__title', text: leaf.path.join(' / ') }),
          options.leafRender()
        ])
      );
    }

    var defaultLeaf = firstLeaf(tree);
    var select = C.TreeSelectField({
      label: options.selectLabel,
      tree: tree,
      value: defaultLeaf && defaultLeaf.value,
      onChange: function (value, leaf) { showPlan(leaf); }
    });

    if (defaultLeaf) showPlan(defaultLeaf);

    // Accessorials wires a real dialog behind its own add link; Services
    // has no add entry point at all -- omitted rather than left as a
    // dead link, since planPicker's callers no longer all pass one.
    var addLink = options.addLabel
      ? el('div', { style: { padding: 'var(--space-4) var(--space-4) 0' } }, [
          el('a', {
            className: 'link-with-icon',
            attrs: { href: options.addHref },
            on: options.onAddClick
              ? { click: function (event) { event.preventDefault(); options.onAddClick(); } }
              : {}
          }, [
            DA.icons.plusCircle(18),
            el('span', { text: options.addLabel })
          ])
        ])
      : null;

    return el('div', {}, [
      addLink,
      el('div', { className: 'view-filters' }, [
        el('div', { className: 'view-filters__field' }, [select])
      ]),
      planSlot
    ]);
  }

  /** Option 2: the searchable single-select tree dropdown, current default.
      No "Add Service Incentive Plan" entry point -- Accessorials keeps its
      own, Services doesn't need one. */
  function servicesView() {
    return planPicker({
      tree: DA.data.pricingServiceTree,
      leafRender: servicePlan,
      selectLabel: 'Choose Service'
    });
  }

  /**
   * One collapsible level of Option 1's tree. The last level -- the one
   * actually holding the table, not another branch to open -- gets its own
   * class so only it, not every expanded level above it, picks up the
   * "you're here" highlight (see accordion--plan-leaf in components.css).
   */
  function planNode(node, leafRender) {
    var C = DA.components;
    return C.Accordion({
      title: node.label,
      className: 'accordion--plan' + (node.children ? '' : ' accordion--plan-leaf'),
      expanded: Boolean(node.expanded),
      renderContent: node.children
        ? function () {
            return node.children.map(function (child) { return planNode(child, leafRender); });
          }
        : function () { return [leafRender()]; }
    });
  }

  /**
   * Option 1: the earlier always-expanded nested-accordion hierarchy,
   * predating the searchable dropdown planPicker() replaced it with. Kept
   * alongside Option 2 (not discarded) so either can be pulled up live
   * while presenting, the same choice the packet summary and comparison
   * band already offer elsewhere on this page.
   */
  function servicesTreeView() {
    return el('div', {}, [
      el('div', { className: 'plan-tree' }, DA.data.pricingServiceTree.map(function (region) {
        return planNode({ label: region.label, children: region.children, expanded: true }, servicePlan);
      }))
    ]);
  }

  /**
   * A top-level Choose Service category's own icon -- Domestic stays within
   * one country (home); Export and Import both cross one, so they share a
   * shipping-crate pair (exportBox/importBox, a literal logistics object --
   * per explicit request, replacing an earlier plain-arrow pair), mirrored
   * to show which direction the crate's own arrow points. Anything not one
   * of these three (a future category, or Option 1/2's own unrelated
   * top-level groups like "Transportation Charges") falls back to the
   * plain `box` every category used to share.
   */
  function categoryIcon(label) {
    if (label === 'Domestic') return DA.icons.home(16);
    if (label === 'Export') return DA.icons.exportBox(16);
    if (label === 'Import') return DA.icons.importBox(16);
    return DA.icons.box(16);
  }

  /**
   * A mode -- one level down from a top-level category -- gets its own
   * icon too (Domestic's own Air/Ground), sized and colored a visible
   * step down from categoryIcon()'s own: smaller (13px vs. 16px) and the
   * app's standard muted text color instead of the default (near-black)
   * icon color, via the same `dropdown__tree-subicon` class both share --
   * so the hierarchy (which icon is a main category vs. a mode under one)
   * still reads correctly even at a glance, not just from indentation.
   * Anything not Air/Ground (Export/Import have no modes of their own
   * yet) renders nothing, same as before this level had icons at all.
   */
  function subCategoryIcon(label) {
    if (label === 'Air') return DA.icons.plane(13, 'dropdown__tree-subicon');
    if (label === 'Ground') return DA.icons.truck(13, 'dropdown__tree-subicon');
    return null;
  }

  /**
   * Option 3: the same hierarchy Option 1 shows, but as a persistent
   * left-hand pane instead of a stack of accordions -- built on the exact
   * .dropdown__tree/.dropdown__option markup Option 2's popover tree
   * already uses (so it looks like the same tree, just always open), next
   * to the selected leaf's plan on the right. Lets the user see the whole
   * structure and the open leaf at once, without opening a dropdown or
   * scrolling past every collapsed sibling accordion first.
   */
  function planSidebar(options) {
    var tree = options.tree;
    var leafRows = []; // { row, leaf } across every leaf, for selection styling

    var detailMount = el('div', { className: 'plan-sidebar__detail' });

    function select(leaf) {
      leafRows.forEach(function (entry) {
        var selected = entry.leaf === leaf;
        entry.row.classList.toggle('is-selected', selected);
        entry.row.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      DA.dom.clear(detailMount).appendChild(
        el('div', { className: 'plan-detail-panel' }, [
          el('p', { className: 'plan-detail-panel__title', text: leaf.path.join(' / ') }),
          options.leafRender()
        ])
      );
    }

    function buildLeaf(node, ancestors, depth) {
      var value = node.value == null ? node.label : node.value;
      var leaf = { label: node.label, value: value, path: ancestors.concat(node.label) };

      var row = el('li', {
        className: 'dropdown__option dropdown__option--select dropdown__tree-leaf',
        attrs: { role: 'treeitem', tabindex: '0', 'aria-selected': 'false' },
        style: { '--tree-depth': String(depth) },
        on: {
          click: function () { select(leaf); },
          keydown: function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              select(leaf);
            }
          }
        }
      }, [
        DA.icons.check(16, 'dropdown__option-check'),
        el('span', { className: 'dropdown__option-label', text: node.label })
      ]);

      leafRows.push({ row: row, leaf: leaf });
      return row;
    }

    function buildGroup(node, ancestors, depth) {
      var childList = el('ul', { className: 'dropdown__tree-group', attrs: { role: 'group' } },
        node.children.map(function (child) {
          return child.children
            ? buildGroup(child, ancestors.concat(node.label), depth + 1)
            : buildLeaf(child, ancestors.concat(node.label), depth + 1);
        })
      );

      var toggle = el('button', {
        className: 'dropdown__tree-toggle',
        attrs: { type: 'button', 'aria-expanded': 'true' },
        style: { '--tree-depth': String(depth) },
        on: {
          click: function () {
            var open = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
            childList.hidden = open;
          }
        }
      }, [
        DA.icons.chevronDown(14, 'dropdown__tree-chevron'),
        // A top-level group ("Domestic", "Export", "Import") gets a category
        // icon alongside its chevron, so it still reads as "this is an
        // expandable group" at a glance, collapsed or not, rather than
        // relying on the chevron alone -- and, now that there's more than
        // one top-level category, so each one reads as what it actually is
        // rather than three identical packages (see icons.js). One level
        // down (Air, Ground) gets its own icon too, smaller and lighter
        // (subCategoryIcon()) so the two levels stay visually distinct;
        // deeper still (Ground - Package) has neither -- a mode is as
        // granular as this hierarchy's icons go.
        depth === 0 ? categoryIcon(node.label) : depth === 1 ? subCategoryIcon(node.label) : null,
        el('span', { className: 'dropdown__tree-label', text: node.label })
      ]);

      return el('li', { className: 'dropdown__tree-node', attrs: { role: 'treeitem' } }, [toggle, childList]);
    }

    var treeList = el('ul', {
      className: 'dropdown__tree',
      attrs: { role: 'tree', 'aria-label': options.selectLabel }
    }, tree.map(function (node) {
      return node.children ? buildGroup(node, [], 0) : buildLeaf(node, [], 0);
    }));

    var defaultLeaf = firstLeaf(tree);
    var defaultRow = defaultLeaf && leafRows.filter(function (entry) {
      return entry.leaf.value === defaultLeaf.value;
    })[0];
    if (defaultRow) select(defaultRow.leaf);

    // Collapsing the nav hides it outright rather than shrinking it, so
    // the detail pane's table can use the full page width when the
    // hierarchy isn't needed -- a slim expand strip stays in its place,
    // the only part of the nav that stays visible, so there's always a
    // way back in.
    var collapseButton = el('button', {
      className: 'icon-action u-tap-target',
      attrs: { type: 'button', 'aria-label': 'Collapse hierarchy panel', 'aria-expanded': 'true' }
    }, [DA.icons.chevronLeft(14)]);

    // Every top-level category this particular tree actually has, in
    // order -- Services' own tree gets Domestic/Export/Import,
    // Accessorials' own gets whatever its own top-level groups are
    // (categoryIcon()'s box fallback for anything not Domestic/Export/
    // Import). Built from `tree` itself rather than hardcoded, so the
    // collapsed strip stays correct for either caller instead of only
    // ever describing Services'.
    var collapsedCategoryIcons = tree
      .filter(function (node) { return node.children; })
      .map(function (node) { return categoryIcon(node.label); });

    var expandButton = el('button', {
      className: 'plan-sidebar__expand',
      attrs: { type: 'button', 'aria-label': 'Expand hierarchy panel' }
    }, [
      DA.icons.chevronRight(14, 'plan-sidebar__expand-chevron'),
      // The real category icons, stacked -- not one generic placeholder --
      // so the hierarchy this panel holds still reads (which categories,
      // and how many) even collapsed down to a bare strip, instead of
      // only once it's reopened. Modes (Air/Ground) are left out here:
      // they're one level further in, already collapsed inside their own
      // category, and wouldn't fit legibly at this width regardless.
      el('div', { className: 'plan-sidebar__expand-icons' }, collapsedCategoryIcons)
    ]);

    var wrap = el('div', { className: 'plan-sidebar' });

    function setCollapsed(collapsed) {
      wrap.classList.toggle('is-collapsed', collapsed);
      collapseButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    collapseButton.addEventListener('click', function () { setCollapsed(true); });
    expandButton.addEventListener('click', function () { setCollapsed(false); });

    var navEl = el('nav', { className: 'plan-sidebar__nav', attrs: { 'aria-label': options.selectLabel } }, [
      el('div', { className: 'plan-sidebar__nav-head' }, [
        el('span', { className: 'plan-sidebar__nav-title', text: options.selectLabel }),
        collapseButton
      ]),
      el('div', { className: 'plan-sidebar__nav-body' }, [treeList])
    ]);

    DA.dom.append(wrap, [navEl, expandButton, detailMount]);

    // The nav column and the detail pane sit side by side with
    // align-items: stretch, which -- when the tree has more rows than the
    // selected leaf's own plan needs -- stretches the *shorter* side
    // (detail) down to match the *taller* one (nav) instead of the other
    // way around: nav's own bordered box ends up genuinely as tall as the
    // row gets, while detail's real content stops well short of its own
    // (borderless, so invisible) box of the same height. Nav then reads as
    // taller than the table beside it, even though the two boxes are
    // technically equal. Capping nav's own max-height to detail's real
    // (content) height -- not the stretched box's -- and letting the tree
    // scroll internally past that (already overflow-y: auto, from the
    // shared .dropdown__tree rule) makes nav match what's actually visible
    // on the right instead of an invisible stretched box. Re-measured on
    // every resize/content change (a new leaf's table is usually a
    // different height), not just once at mount.
    var syncNavHeight = function () {
      // detailMount itself is the flex item align-items: stretch already
      // inflates to match nav -- measuring it directly here would just
      // feed that inflated height straight back into nav's own cap,
      // accomplishing nothing. Its child (.plan-detail-panel, replaced
      // wholesale on every select()) is a plain block box one level in,
      // sized by its own content regardless of how tall its stretched
      // parent became -- that's the real height to cap nav to.
      var content = detailMount.firstElementChild;
      var h = content ? content.getBoundingClientRect().height : 0;
      // An explicit height, not max-height: max-height only ever caps nav
      // from above, so if the tree's own real content happened to be
      // *shorter* than detail (a short table, a long tree), stretch was
      // still free to pad nav out to match detail's height anyway -- the
      // cap never stopped that, since nav wasn't hitting it. Nav's real
      // content then stopped short of its own now-taller box, leaving
      // blank space below it before its own border, which is exactly the
      // "still doesn't match" case reported. An explicit height overrides
      // stretch outright, so nav is always exactly this tall -- content
      // scrolling to fit it (already overflow-y: auto) if there's more
      // than this, never padded if there's less.
      navEl.style.height = h > 0 ? h + 'px' : '';
    };
    // Called once right away -- getBoundingClientRect() forces layout to
    // settle first, so this doesn't need to wait for anything -- rather
    // than depending solely on ResizeObserver's own first callback (also
    // wired below, for every later leaf switch) to reach the browser
    // before anything gets painted at the old, unsynced size.
    syncNavHeight();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(syncNavHeight).observe(detailMount);
    }
    // Purely a window-resize reflow (e.g. opening DevTools, or just
    // narrowing the browser) doesn't reliably retrigger the observer
    // above: detailMount is the *stretched* flex item, so its own
    // rendered box only ever grows to match nav's current (already-set)
    // height -- when nav is still holding an old, narrower-viewport
    // value, detailMount never visibly changes size even though its
    // child's true content did, and the observer stays silent. A plain
    // resize listener re-measures from the actual content (via the same
    // syncNavHeight) regardless of what detailMount's stretched box
    // currently reports, so a DevTools-narrowed table (columns wrapping,
    // a horizontal scrollbar appearing) doesn't leave nav stuck taller
    // than the table actually needs once the viewport settles.
    window.addEventListener('resize', syncNavHeight);

    // Accessorials wires a real dialog behind its own add link; Services
    // has no add entry point at all -- omitted rather than left as a
    // dead link, since planSidebar's callers no longer all pass one.
    var addLink = options.addLabel
      ? el('div', { style: { padding: 'var(--space-4) var(--space-4) 0' } }, [
          el('a', {
            className: 'link-with-icon',
            attrs: { href: options.addHref },
            on: options.onAddClick
              ? { click: function (event) { event.preventDefault(); options.onAddClick(); } }
              : {}
          }, [
            DA.icons.plusCircle(18),
            el('span', { text: options.addLabel })
          ])
        ])
      : null;

    return el('div', {}, [addLink, wrap]);
  }

  /** No "Add Service Incentive Plan" entry point -- Accessorials keeps its
      own, Services doesn't need one. */
  function servicesSidebarView() {
    return planSidebar({
      tree: DA.data.pricingServiceTree,
      leafRender: servicePlan,
      selectLabel: 'Choose Service'
    });
  }

  /** Services tab: Option 1 (tree) / Option 2 (dropdown) / Option 3 (left-pane hierarchy), swapped live. */
  function servicesViewSwitchable() {
    var C = DA.components;
    var option = 'option2';
    var mount = el('div', { className: 'card' });

    function render() {
      DA.dom.clear(mount).appendChild(
        option === 'option1' ? servicesTreeView()
          : option === 'option3' ? servicesSidebarView()
          : servicesView()
      );
    }

    var switcher = C.SegmentedControl({
      ariaLabel: 'Services view layout',
      value: option,
      items: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
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

  /* ---- Accessorials -------------------------------------------------------- */

  /**
   * An accessorial's incentive plan: the same generic table for every leaf,
   * mirroring servicePlan() -- what's edited is the incentive itself, not
   * which leaf you opened it from.
   */
  function accessorialPlan() {
    var C = DA.components;

    function editableColumn(key, label, width) {
      return {
        key: key,
        label: label,
        width: width,
        className: 'is-numeric is-end',
        headerClassName: 'is-end',
        render: function (row) { return editableCell(row[key]); }
      };
    }

    return el('div', { className: 'card' }, [
      C.DataTable({
        caption: 'Accessorial incentive plan',
        embedded: true,
        headerTone: 'warm',
        tinted: true,
        // Single Core Service column now, so nothing left to freeze as a
        // group -- the row-header column freezes on its own regardless.
        freezeColumns: 1,
        // Row hover here should read on the incentive figures alone --
        // the Core Service column stays at its normal resting color
        // instead of also darkening.
        noRowheadHover: true,
        columns: [
          {
            // Movement, Mode, Service Group and the leaf's own name joined
            // into one label -- the same "Core Service" pattern Analyzer's
            // Cost Details/Zones tables use (profileKeyColumns()), rather
            // than four separate frozen columns for what reads as a single
            // line identifying the row.
            key: 'coreService',
            label: 'Core Service',
            width: '280px',
            className: 'is-rowhead',
            render: function (row) {
              return [row.movement, row.mode, row.serviceGroup, row.service].join('-');
            }
          },
          {
            key: 'adu', label: 'ADU', width: '90px',
            className: 'is-numeric is-end', headerClassName: 'is-end'
          },
          {
            key: 'nrpp', label: 'NRPP', width: '100px',
            className: 'is-numeric is-end', headerClassName: 'is-end'
          },
          editableColumn('incentiveType', 'Incentive Type', '150px'),
          editableColumn('incentiveAmount', 'Incentive Amount', '165px')
        ],
        rows: DA.data.pricingAccessorialIncentives
      }),
      el('div', { className: 'grid-footer' }, [
        el('a', { className: 'link-with-icon', attrs: { href: '#save-changes' } }, [
          DA.icons.save(15),
          el('span', { text: 'Save Changes' })
        ])
      ])
    ]);
  }

  /** Shared by all three Accessorials layouts -- same trigger, same dialog. */
  function openAddAccessorialPlanDialog() {
    DA.dialogs.AddAccessorialIncentivePlanDialog().open();
  }

  /** Option 2: the searchable single-select tree dropdown, current default. */
  function accessorialsView() {
    return planPicker({
      tree: DA.data.pricingAccessorialTree,
      leafRender: accessorialPlan,
      selectLabel: 'Choose Accessorial',
      addHref: '#add-accessorial-plan',
      addLabel: 'Add Accessorial Incentive Plan',
      onAddClick: openAddAccessorialPlanDialog
    });
  }

  /** Option 1: the earlier always-expanded nested-accordion hierarchy,
      restored alongside Option 2 the same way Services' was. */
  function accessorialsTreeView() {
    return el('div', {}, [
      el('div', { style: { padding: 'var(--space-4) var(--space-4) 0' } }, [
        el('a', {
          className: 'link-with-icon',
          attrs: { href: '#add-accessorial-plan' },
          on: { click: function (event) { event.preventDefault(); openAddAccessorialPlanDialog(); } }
        }, [
          DA.icons.plusCircle(18),
          el('span', { text: 'Add Accessorial Incentive Plan' })
        ])
      ]),
      el('div', { className: 'plan-tree' }, DA.data.pricingAccessorialTree.map(function (node) {
        return planNode(node, accessorialPlan);
      }))
    ]);
  }

  function accessorialsSidebarView() {
    return planSidebar({
      tree: DA.data.pricingAccessorialTree,
      leafRender: accessorialPlan,
      selectLabel: 'Choose Accessorial',
      addHref: '#add-accessorial-plan',
      addLabel: 'Add Accessorial Incentive Plan',
      onAddClick: openAddAccessorialPlanDialog
    });
  }

  /** Accessorials tab: Option 1 (tree) / Option 2 (dropdown) / Option 3 (left-pane hierarchy), swapped live. */
  function accessorialsViewSwitchable() {
    var C = DA.components;
    var option = 'option2';
    var mount = el('div', { className: 'card' });

    function render() {
      DA.dom.clear(mount).appendChild(
        option === 'option1' ? accessorialsTreeView()
          : option === 'option3' ? accessorialsSidebarView()
          : accessorialsView()
      );
    }

    var switcher = C.SegmentedControl({
      ariaLabel: 'Accessorials view layout',
      value: option,
      items: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
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

  /**
   * @param {Object} context  { packet, numeric, filters, emptyView }
   */
  DA.views.PricingTerms = function PricingTerms(context) {
    var C = DA.components;

    return el('div', { className: 'tabs--boxed' }, [
      C.Tabs({
        ariaLabel: 'Pricing term views',
        value: 'tier-incentives',
        items: [
          // Only the filters+content pair goes in view-stack --
          // updatePacketCta() stays outside it, as a plain sibling:
          // .page-actions already carries its own margin-top for the gap
          // above it, and stacking that on top of view-stack's own gap
          // would double it up.
          { id: 'tier-incentives', label: 'Tier Incentives', render: function () {
            return el('div', {}, [
              el('div', { className: 'view-stack' }, [context.filters(), tierIncentivesView()]),
              updatePacketCta()
            ]);
          } },
          { id: 'services', label: 'Services', render: function () {
            return el('div', {}, [
              el('div', { className: 'view-stack' }, [context.filters(), servicesViewSwitchable()]),
              updatePacketCta()
            ]);
          } },
          { id: 'accessorials', label: 'Accessorials', render: function () {
            return el('div', {}, [
              el('div', { className: 'view-stack' }, [context.filters(), accessorialsViewSwitchable()]),
              updatePacketCta()
            ]);
          } },
          { id: 'modifiers', label: 'Modifiers', render: function () {
            return el('div', {}, [
              el('div', { className: 'view-stack' }, [context.filters(), context.emptyView('Modifier')()]),
              updatePacketCta()
            ]);
          } }
        ]
      })
    ]);
  };
})(window.DA);
