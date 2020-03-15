import Grapick from 'grapick';

const cpKey = 'data-cp';
let inputDirection, inputType;

const getColor = color => {
  let cl = color.getAlpha() == 1 ? color.toHexString() : color.toRgbString();
  return cl.replace(/ /g, '');
}

export default (editor, config = {}) => {
  const sm = editor.StyleManager;
  let colorPicker = config.colorPicker;

  sm.addType('gradient', {
    view: {

      // I don't need any event
      events: {},


      // Don't need a template as the input will be created by Grapick
      templateInput: () => '',


      // With `setValue` I should indicate how to update the custom input,
      // in our case Grapick instance.
      // The `value` in this case might be something like:
      // `linear-gradient(90deg, red 1%, blue 99%)`
      setValue(value) {
        const gp = this.gp;
        const defValue = this.model.getDefaultValue();
        value = value || defValue;
        gp && gp.setValue(value, {silent: 1});
        // Update also our optional inputs for the type and the
        // direction of a gradient color
        inputType && inputType.setValue(gp.getType());
        inputDirection && inputDirection.setValue(gp.getDirection());
      },


      // Here all I need is to setup the Grapick input and append it somewhere
      // on the property
      onRender() {
        const { ppfx, em, model } = this;
        const el = document.createElement('div');
        const colorEl = colorPicker && `<div class="grp-handler-cp-wrap">
          <div class="${ppfx}field-colorp-c">
            <div class="${ppfx}checker-bg"></div>
            <div class="${ppfx}field-color-picker" ${cpKey}></div>
          </div>
        </div>`;

        // Setup Grapick
        const gp = new Grapick({
          el,
          colorEl,
          ...config.grapickOpts,
        });
        const fields = this.el.querySelector(`.${ppfx}fields`);
        fields.style.flexWrap = 'wrap';
        fields.appendChild(el.children[0]);
        this.gp = gp;

        // Do stuff on gradient change
        gp.on('change', complete => {
          const value = gp.getSafeValue();
          // You should use `model.setValue` when you expect to reflect changes
          // on the input, `model.setValueFromInput` is to used when the change comes
          // from the input itself, like in this case
          model.setValueFromInput(value, complete);
        });

        // Add custom inputs, if requested
        [
          ['inputDirection', 'integer', 'setDirection', {
            name: 'Direction',
            units: ['deg'],
            fixedValues: ['top', 'right', 'bottom', 'left'],
          }], ['inputType', 'select', 'setType', {
            name: 'Type',
            options: [
              {value: 'radial'},
              {value: 'linear'},
              {value: 'repeating-radial'},
              {value: 'repeating-linear'},
            ]
          }]
        ].forEach(input => {
            const inputName = input[0];
            const inputConfig = config[input[0]];
            if (inputConfig) {
              const { parent } = model;
              const type = input[1];
              const inputObj = typeof inputConfig == 'object' ? inputConfig : {};
              const propInput = sm.createType(inputObj.type || type, {
                model: { ...input[3], ...inputObj }
              });
              parent && (propInput.model.parent = parent);
              propInput.render();
              propInput.model.on('change:value', (model) => {
                gp[input[2]](model.getFullValue());
              })
              fields.appendChild(propInput.el);
              inputName == 'inputDirection' && (inputDirection = propInput);
              inputName == 'inputType' && (inputType = propInput);
            }
        })

        // Add the custom color picker, if requested
        if (colorPicker == 'default') {
          colorPicker = handler => {
            const el = handler.getEl().querySelector(`[${cpKey}]`);
            const elStyle = el.style;
            elStyle.backgroundColor = handler.getColor();
            const emConf = em && em.getConfig() || {};
            const colorPickerConfig = emConf.colorPicker || {};
            const elToAppend = emConf.el;
            const updateColor = (color, complete = 1) => {
              const cl = getColor(color);
              elStyle.backgroundColor = cl;
              handler.setColor(cl, complete);
            };

            editor.$(el).spectrum({
              containerClassName: `${ppfx}one-bg ${ppfx}two-color`,
              appendTo: elToAppend || 'body',
              maxSelectionSize: 8,
              showPalette: true,
              palette: [],
              showAlpha: true,
              chooseText: 'Ok',
              cancelText: '⨯',
              color: handler.getColor(),
              change(color) {
                updateColor(color);
              },
              move(color) {
                updateColor(color, 0);
              },
              ...colorPickerConfig,
            });
          };
        }

        colorPicker && gp.setColorPicker(colorPicker);
      },
    }
  })
}
