/**
 * @license
 *
 * Copyright IBM Corp. 2019, 2020
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * @license
 * 
 * This bundle contains the following third-party dependencies:
 * 
 * tslib:
 * 
 ****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
*****************************************************************************
 * 
 * flatpickr:
 * 
 *****************************************************************************
		    Copyright (c) Microsoft Corporation.

		    Permission to use, copy, modify, and/or distribute this software for any
		    purpose with or without fee is hereby granted.

		    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
		    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
		    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
		    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
		    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
		    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
		    PERFORMANCE OF THIS SOFTWARE.
		    *****************************************************************************
 * 
 * lit-html:
 * 
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 * 
 * lit-element:
 * 
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 * 
 * @lit/reactive-element:
 * 
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 * 
 * Also refer to the following links for the license of other third-party dependencies:
 * 
 * https://www.npmjs.com/package/lit
 * https://www.npmjs.com/package/@floating-ui/dom
 * https://www.npmjs.com/package/lodash-es
 * https://www.npmjs.com/package/@floating-ui/core
 * https://www.npmjs.com/package/@floating-ui/utils
 */

import{r as e,_ as t,x as o,p as a}from"./settings-a9cb5e4b.js";import{e as i}from"./class-map-e4ba9e2b.js";import{n as r}from"./property-4de26c93.js";import{s as l}from"./16-8449b4fa.js";import{s}from"./16-b826e67b.js";import{s as n}from"./checkbox-79c6103b.js";import{c}from"./carbon-element-017b212d.js";
/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */var d;!function(e){e.HORIZONTAL="horizontal",e.VERTICAL="vertical"}(d||(d={}));
/**
 * @license
 *
 * Copyright IBM Corp. 2019, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
let b=class extends e{constructor(){super(...arguments),this.orientation=d.VERTICAL,this.readonly=!1,this.warn=!1,this.warnText="",this._hasAILabel=!1}_handleSlotChange({target:e}){const t=e.assignedNodes().filter((e=>void 0!==e.matches&&(e.matches(this.constructor.aiLabelItem)||e.matches(this.constructor.slugItem))));this._hasAILabel=Boolean(t),t[0].setAttribute("size","mini"),this.requestUpdate()}updated(e){const{selectorCheckbox:t}=this.constructor,o=this.querySelectorAll(t);if(["disabled","readonly","orientation"].forEach((t=>{if(e.has(t)){const{[t]:e}=this;o.forEach((o=>{o[t]=e}))}})),e.has("invalid")){const{invalid:e}=this;o.forEach((t=>{e?t.setAttribute("invalid-group",""):t.removeAttribute("invalid-group")}))}}render(){const{ariaLabelledBy:e,disabled:t,helperText:r,invalid:n,invalidText:c,legendId:d,legendText:b,orientation:p,readonly:h,warn:g,warnText:u,_hasAILabel:$,_handleSlotChange:v}=this,x=!h&&!n&&g,y=!n&&!g,m=Math.random().toString(16).slice(2),f=r?`checkbox-group-helper-text-${m}`:void 0,k=r?o` <div id="${f}" class="${a}--form__helper-text">
          ${r}
        </div>`:null,_=i({[`${a}--checkbox-group`]:!0,[`${a}--checkbox-group--readonly`]:h,[`${a}--checkbox-group--invalid`]:!h&&n,[`${a}--checkbox-group--warning`]:x,[`${a}--checkbox-group--slug`]:$,[`${a}--checkbox-group--${p}`]:"horizontal"===p});return o`
      <fieldset
        class="${_}"
        ?data-invalid=${n}
        ?disabled=${t}
        aria-disabled=${h}
        ?aria-labelledby=${e||d}
        ?aria-describedby=${n||g||!k?void 0:f}
        orientation=${p}>
        <legend class="${a}--label" id=${d||e}>
          ${b}
          <slot name="ai-label" @slotchange="${v}"></slot>
          <slot name="slug" @slotchange="${v}"></slot>
        </legend>
        <slot></slot>
        <div class="${a}--checkbox-group__validation-msg">
          ${!h&&n?o`
                ${l({class:`${a}--checkbox__invalid-icon`})}
                <div class="${a}--form-requirement">${c}</div>
              `:null}
          ${x?o`
                ${s({class:`${a}--checkbox__invalid-icon ${a}--checkbox__invalid-icon--warning`})}
                <div class="${a}--form-requirement">${u}</div>
              `:null}
        </div>
        ${y?k:null}
      </fieldset>
    `}static get selectorCheckbox(){return`${a}-checkbox`}static get slugItem(){return`${a}-slug`}static get aiLabelItem(){return`${a}-ai-label`}};b.shadowRootOptions=Object.assign(Object.assign({},e.shadowRootOptions),{delegatesFocus:!0}),b.styles=n,t([r({type:String,reflect:!0,attribute:"aria-labelledby"})],b.prototype,"ariaLabelledBy",void 0),t([r({type:Boolean})],b.prototype,"disabled",void 0),t([r({type:String,reflect:!0,attribute:"helper-text"})],b.prototype,"helperText",void 0),t([r({type:Boolean,attribute:"invalid"})],b.prototype,"invalid",void 0),t([r({type:String,reflect:!0,attribute:"invalid-text"})],b.prototype,"invalidText",void 0),t([r({type:String,reflect:!0,attribute:"legend-id"})],b.prototype,"legendId",void 0),t([r({type:String,reflect:!0,attribute:"legend-text"})],b.prototype,"legendText",void 0),t([r({type:String,reflect:!0,attribute:"orientation"})],b.prototype,"orientation",void 0),t([r({type:Boolean,reflect:!0})],b.prototype,"readonly",void 0),t([r({type:Boolean,reflect:!0})],b.prototype,"warn",void 0),t([r({type:String,reflect:!0,attribute:"warn-text"})],b.prototype,"warnText",void 0),b=t([c(`${a}-checkbox-group`)],b);
/**
 * @license
 *
 * Copyright IBM Corp. 2019, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
let p=class extends e{render(){return o`
      <label class="${a}--checkbox-label" for="checkbox" part="label">
        <span class="${a}--checkbox-label-text ${a}--skeleton"
          ><slot></slot
        ></span>
      </label>
    `}};p.styles=n,p=t([c(`${a}-checkbox-skeleton`)],p);
