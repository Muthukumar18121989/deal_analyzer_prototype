/**
 * Create Scenarios and Analyzer Packet — step two of the workflow.
 *
 * Reached from "Source Data" on the Customer Details form, which arrives with
 * the sourcing-in-progress dialog open. Shows the packet that was created, its
 * scenarios, and the route onward to the analyzer packet.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var C = DA.components;

  DA.pages = DA.pages || {};

  DA.pages.CreateScenariosPage = function CreateScenariosPage(options) {
    options = options || {};
    var packet = options.packet || {};
    var scenarios = packet.scenarios || [];
    var owner = packet.owner || '';

    /* ---- Packet summary -------------------------------------------------- */

    /** Both ends of the window on one line -- a range, not two fields.
        Option 1 only: Option 2 lists From/To as their own fields. */
    function shippingProfileRange() {
      if (!packet.from && !packet.to) return null;
      return (packet.from || '-') + '  –  ' + (packet.to || '-');
    }

    /** Two sparse, optional linked-record IDs -- paired rather than each
        claiming a full row for what's usually just a dash. Option 1 only. */
    function linkedRecords() {
      return 'PQR ' + (packet.pqr || '-') + '   ·   OPPs ' + (packet.opps || '-');
    }

    /** Option 1: the panel's original flat layout, fields side by side. */
    function flatSummary() {
      return C.SummaryPanelFlat({
        ariaLabel: 'Analyzer packet summary',
        expanded: false,
        headline: [
          { label: 'Analyzer Packet ID', value: packet.packetId },
          { label: 'Customer Name', value: packet.customerName },
          { label: 'Reference Number', value: packet.referenceNumber }
        ],
        columns: [
          [
            { label: 'Customer Hierarchy', value: packet.hierarchy },
            { label: 'Industry', value: packet.industry },
            { label: 'Linked Records', value: linkedRecords() },
            { label: 'Shipping Profile', value: shippingProfileRange() }
          ],
          [
            { label: 'Owner', value: owner },
            { label: 'Created Date', value: packet.createdAt },
            { label: 'Last Modified By', value: packet.lastModifiedBy || owner },
            { label: 'Last Modified Date', value: packet.lastModifiedAt }
          ]
        ],
        rows: [
          { label: 'Analyzer Packet Description', value: packet.description, wide: true }
        ]
      });
    }

    /** The three Packet/Customer/User field groups Option 2's sections and
        Option 3's columns both render from -- one shared source rather
        than the same field lists typed out twice. */
    function summarySections() {
      return [
        {
          // Packet ID, Customer Name and Reference Number dropped -- all
          // three already sit in the collapsed headline row above (see
          // groupedSummary()/columnsSummaryPanel()'s own `headline`), so
          // repeating them again here in the expanded body was redundant.
          // Shipping Profile From/To moved in from Customer Information --
          // the packet's own sourcing window reads as packet-level detail,
          // not a property of the customer record.
          title: 'Packet Information',
          columns: 3,
          fields: [
            { label: 'Shipping Profile From', value: packet.from },
            { label: 'Shipping Profile To', value: packet.to },
            // Last, and wide -- a description can run onto two or three
            // lines, which one of three grid columns was too narrow for
            // (Option 2's own section-grid; Option 3's columns already
            // stack every field full-width regardless, `wide` is a no-op
            // there per columnsSummary()'s own comment). `wide` claims the
            // whole row, and From/To already fill the first row's other
            // two columns, so it lands on its own row beneath them instead
            // of squeezed into the row's last column.
            { label: 'Analyzer Packet Description', value: packet.description, wide: true }
          ]
        },
        {
          title: 'Customer Information',
          columns: 3,
          fields: [
            { label: 'Customer Hierarchy', value: packet.hierarchy },
            { label: 'Industry', value: packet.industry },
            { label: 'PQR', value: packet.pqr },
            { label: 'OPPs', value: packet.opps }
          ]
        },
        {
          title: 'User Information',
          columns: 3,
          fields: [
            { label: 'Owner', value: owner },
            { label: 'Created Date', value: packet.createdAt },
            { label: 'Last Modified Date', value: packet.lastModifiedAt },
            // Last, and wide -- a username can run long enough to wrap
            // onto two lines, which a single 1-of-4 column was too
            // narrow for; giving it the whole row (same as Packet
            // Information's own Description field) means it wraps
            // wide instead of squeezed, and lands on its own row the
            // same way every other section's own extra field does.
            { label: 'Last Modified By', value: packet.lastModifiedBy || owner, wide: true }
          ]
        }
      ];
    }

    /** Option 2: fields grouped into titled Packet/Customer/User sections. */
    function groupedSummary() {
      return C.SummaryPanel({
        ariaLabel: 'Analyzer packet summary',
        expanded: false,
        headline: [
          { label: 'Analyzer Packet ID', value: packet.packetId },
          { label: 'Customer Name', value: packet.customerName },
          { label: 'Reference Number', value: packet.referenceNumber }
        ],
        sections: summarySections()
      });
    }

    /**
     * Option 3's body: the same three groups as columns side by side
     * instead of titled boxes stacked one under another -- a reference
     * screen's own layout (three cards, a title over "Label : Value"
     * rows), but with that screen's own sample titles/fields swapped out
     * for Option 2's real ones (Packet/Customer/User Information and
     * their actual fields), not copied verbatim.
     */
    function columnsSummary() {
      return el('div', { className: 'summary-columns' },
        summarySections().map(function (group) {
          return el('div', { className: 'summary-columns__col' }, [
            el('p', { className: 'summary-panel__section-title', text: group.title }),
            el('div', { className: 'summary-columns__fields' },
              group.fields.map(function (field) {
                // `wide` is meaningless here -- every field already has
                // the column's full width to itself in a single-column
                // stack.
                return C.Detail({ label: field.label, value: field.value, chip: field.chip });
              })
            )
          ]);
        })
      );
    }

    /**
     * Option 3: the same collapsible header/body shell Option 1/2 use,
     * carrying the same 3-field headline Option 2's own collapsed state
     * shows (Packet ID, Customer Name, Reference Number) -- but with the
     * disclosure chevron on the header's right edge instead of the left,
     * Option 3's own placement.
     */
    function columnsSummaryPanel() {
      return C.SummaryPanel({
        ariaLabel: 'Analyzer packet summary',
        chevronPosition: 'end',
        expanded: false,
        headline: [
          { label: 'Analyzer Packet ID', value: packet.packetId },
          { label: 'Customer Name', value: packet.customerName },
          { label: 'Reference Number', value: packet.referenceNumber }
        ],
        bodyContent: [columnsSummary()]
      });
    }

    // All three layouts stay live side by side behind a switch -- not a
    // decision made once and thrown away -- so any can be pulled up on
    // demand while presenting, without a code change. Option 1 is the
    // default: its collapsed header carries Packet ID, Customer Name and
    // Reference Number together, where Option 2's collapsed header only
    // carries Packet ID (plus Customer Name as a secondary) and drops
    // Reference Number entirely. Option 3's collapsed header matches
    // Option 1's own three fields, with its chevron on the right instead
    // of the left.
    var summaryMount = el('div', {});
    var summaryOption = 'option1';

    function renderSummary() {
      DA.dom.clear(summaryMount).appendChild(
        summaryOption === 'option1' ? flatSummary()
          : summaryOption === 'option3' ? columnsSummaryPanel()
          : groupedSummary()
      );
    }

    var summaryOptionSwitch = C.SegmentedControl({
      ariaLabel: 'Packet summary layout',
      value: summaryOption,
      items: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
      ],
      onChange: function (value) {
        summaryOption = value;
        renderSummary();
      }
    });

    renderSummary();

    /* ---- Scenarios -------------------------------------------------------- */

    var scenarioList = el('div', { className: 'scenario-list' });

    function renderScenarios() {
      DA.dom.clear(scenarioList);
      scenarios.forEach(function (scenario) {
        scenarioList.appendChild(C.ScenarioBlock(scenario, {
          packet: packet,
          onOpenAccounts: options.onOpenAccounts
        }));
      });
    }

    /** Drawer: copy an existing scenario into a new one. */
    function openCreateScenario(trigger) {
      var nextIndex = scenarios.length;

      var copyFrom = C.SelectField({
        label: 'Choose Scenario to Copy',
        value: scenarios[0].title,
        options: scenarios.map(function (scenario) {
          return { value: scenario.title, label: scenario.title };
        })
      });

      var nameField = C.Field({
        label: 'Scenario Name',
        value: 'Scenario ' + nextIndex
      });

      var descriptionField = C.Field({
        label: 'Scenario Description',
        multiline: true
      });

      var drawer = C.Modal({
        variant: 'drawer',
        title: 'Create New Scenario',
        returnFocusTo: trigger,
        body: el('div', { className: 'drawer-form' }, [
          C.Alert({
            plain: true,
            message: 'Choose an existing Scenario to copy to create a new scenario.'
          }),
          copyFrom,
          nameField,
          descriptionField,
          el('div', { className: 'drawer-form__actions' }, [
            C.Button({
              label: 'Save',
              variant: 'primary',
              shape: 'pill',
              onClick: function () {
                var source = scenarios.filter(function (scenario) {
                  return scenario.title === copyFrom.getValue();
                })[0] || scenarios[0];

                // The new scenario opens; the others fold away behind it.
                scenarios.forEach(function (scenario) { scenario.expanded = false; });
                scenarios.push(DA.data.copyScenario(
                  source,
                  nextIndex,
                  nameField.input.value || 'Scenario ' + nextIndex,
                  descriptionField.input.value
                ));

                drawer.close();
                renderScenarios();
              }
            })
          ])
        ])
      });

      drawer.open();
    }

    var createScenarioButton = C.Button({
      label: 'Create New Scenario',
      variant: 'outline',
      shape: 'pill',
      icon: DA.icons.chevronRight(14, ''),
      iconPosition: 'end',
      onClick: function () { openCreateScenario(createScenarioButton); }
    });

    renderScenarios();

    /* ---- Composition ------------------------------------------------------ */

    var panel = el('section', { className: 'panel panel--auto' }, [
      el('div', { className: 'panel__content' }, [
        el('div', { className: 'summary-option-switch' }, [summaryOptionSwitch]),
        summaryMount,
        C.Alert({ message: 'Active Bids sourced for existing customers' }),
        scenarioList,
        el('div', {}, [createScenarioButton])
      ])
    ]);

    var actions = el('div', { className: 'page-actions page-actions--wide' }, [
      C.Button({
        label: 'Back',
        variant: 'link',
        icon: DA.icons.chevronLeft(14),
        onClick: function () { if (options.onBack) options.onBack(); }
      }),
      C.Button({
        label: 'Proceed to Analyzer Packet',
        variant: 'primary',
        shape: 'pill',
        icon: DA.icons.chevronRight(14, ''),
        iconPosition: 'end',
        onClick: function () { if (options.onProceed) options.onProceed(); }
      })
    ]);

    var page = el('main', { className: 'page', attrs: { id: 'main-content' } }, [
      el('h2', { className: 'page-title', text: 'Create Scenarios and Analyzer Packet' }),
      panel,
      actions
    ]);

    if (options.showSourcingDialog) {
      window.setTimeout(function () {
        C.Modal({
          accent: true,
          title: 'Sourcing Data is in progress',
          body:
            'Sourcing Data is in progress. The links will be enabled after the ' +
            'process is complete. Thank you for your patience.'
        }).open();
      }, 0);
    }

    return page;
  };
})(window.DA);
