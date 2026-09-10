/**
 * Dim divisor structure details — opened from the "Structure Details" link
 * in Other Terms > Dim Divisor's table.
 *
 * Shows the cubic volume threshold bands behind one line's dim weight
 * divisor code. Same 2-level header / editable-cell / trash-per-row grid
 * shape as the Services rate grid, just with different columns.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;

  DA.dialogs = DA.dialogs || {};

  /** A figure with an inline edit affordance, matching Pricing Terms' cells. */
  function editableCell(value, options) {
    options = options || {};
    return el('span', { className: 'cell-value' }, [
      el('span', { className: options.italic ? 'u-italic' : '', text: value }),
      el('button', {
        className: 'icon-action u-tap-target',
        attrs: { type: 'button', 'aria-label': 'Edit ' + value }
      }, [DA.icons.pencil(13)])
    ]);
  }

  /**
   * @param {Object} row      the Dim Divisor table row whose Structure
   *                          Details link was clicked -- carries the
   *                          divisor code shown
   * @param {Element} trigger the link to hand focus back to on close
   */
  DA.dialogs.DimDivisorDetailsDialog = function DimDivisorDetailsDialog(row, trigger) {
    var C = DA.components;

    var grid = el('table', { className: 'matrix' }, [
      el('caption', { className: 'u-visually-hidden', text: 'Cubic volume threshold bands' }),
      el('thead', {}, [
        el('tr', {}, [
          el('th', { attrs: { scope: 'colgroup', colspan: 2 }, text: 'Cubic Volume Threshold' }),
          el('th', { attrs: { scope: 'col' }, text: 'Dim Weight Divisor' }),
          el('th', { attrs: { scope: 'col' }, text: '' })
        ]),
        el('tr', {}, [
          el('th', { className: 'matrix__rowhead', attrs: { scope: 'col' }, text: 'Volume (cu.in)' }),
          el('th', { className: 'matrix__rowhead', attrs: { scope: 'col' }, text: '' }),
          el('th', { className: 'matrix__rowhead', attrs: { scope: 'col' }, text: 'Zone : All' }),
          el('th', { attrs: { scope: 'col' }, text: '' })
        ])
      ]),
      el('tbody', {}, [
        el('tr', {}, [
          el('td', { className: 'matrix__cell' }, [editableCell(row.cubicVolumeFrom || '0.0')]),
          el('td', { className: 'matrix__cell' }, [editableCell('or more', { italic: true })]),
          el('td', { className: 'matrix__cell' }, [editableCell(row.divisor || '-')]),
          el('td', {}, [
            el('button', {
              className: 'icon-action u-tap-target',
              attrs: {
                type: 'button',
                disabled: true,
                'aria-label': 'Remove threshold band',
                title: 'The last threshold band can’t be removed'
              }
            }, [DA.icons.trash(14)])
          ])
        ])
      ])
    ]);

    var body = el('div', {}, [
      C.SelectField({
        label: 'Select Dim Divisor Code',
        value: row.divisorCode || '01 - Dim Weight Divisor',
        options: [row.divisorCode || '01 - Dim Weight Divisor'].map(function (value) {
          return { value: value, label: value };
        })
      }),
      el('div', { className: 'card', style: { 'margin-top': 'var(--space-4)' } }, [
        el('div', { className: 'grid-scroll scroll-area' }, [grid])
      ]),
      el('div', { style: { padding: 'var(--space-4) 0 0' } }, [
        el('a', { className: 'link-with-icon', attrs: { href: '#add-threshold-band' } }, [
          DA.icons.plusCircle(18),
          el('span', { text: 'Add threshold band' })
        ])
      ]),
      el('div', { className: 'dialog-footer' }, [
        C.Button({
          label: 'Apply',
          variant: 'primary',
          shape: 'pill',
          icon: DA.icons.chevronRight(14, ''),
          iconPosition: 'end',
          onClick: function () { modal.close(); }
        }),
        C.Button({
          label: 'Cancel',
          variant: 'link',
          onClick: function () { modal.close(); }
        })
      ])
    ]);

    var modal = C.Modal({
      variant: 'drawer',
      title: 'Details',
      returnFocusTo: trigger,
      body: body
    });

    return modal;
  };
})(window.DA);
