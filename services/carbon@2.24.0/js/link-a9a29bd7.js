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

import{i as e,r as i,_ as t,p as s,x as d}from"./settings-a9cb5e4b.js";import{e as n}from"./class-map-e4ba9e2b.js";import{o as c}from"./if-defined-446d5754.js";import{n as o}from"./property-4de26c93.js";import{e as r}from"./query-602de8af.js";import{F as a}from"./focus-969beaed.js";import{c as l}from"./carbon-element-017b212d.js";var h=e([':root{--cds-caption-01-font-size:0.75rem;--cds-caption-01-font-weight:400;--cds-caption-01-line-height:1.33333;--cds-caption-01-letter-spacing:0.32px;--cds-caption-02-font-size:0.875rem;--cds-caption-02-font-weight:400;--cds-caption-02-line-height:1.28572;--cds-caption-02-letter-spacing:0.32px;--cds-label-01-font-size:0.75rem;--cds-label-01-font-weight:400;--cds-label-01-line-height:1.33333;--cds-label-01-letter-spacing:0.32px;--cds-label-02-font-size:0.875rem;--cds-label-02-font-weight:400;--cds-label-02-line-height:1.28572;--cds-label-02-letter-spacing:0.16px;--cds-helper-text-01-font-size:0.75rem;--cds-helper-text-01-line-height:1.33333;--cds-helper-text-01-letter-spacing:0.32px;--cds-helper-text-02-font-size:0.875rem;--cds-helper-text-02-font-weight:400;--cds-helper-text-02-line-height:1.28572;--cds-helper-text-02-letter-spacing:0.16px;--cds-body-short-01-font-size:0.875rem;--cds-body-short-01-font-weight:400;--cds-body-short-01-line-height:1.28572;--cds-body-short-01-letter-spacing:0.16px;--cds-body-short-02-font-size:1rem;--cds-body-short-02-font-weight:400;--cds-body-short-02-line-height:1.375;--cds-body-short-02-letter-spacing:0;--cds-body-long-01-font-size:0.875rem;--cds-body-long-01-font-weight:400;--cds-body-long-01-line-height:1.42857;--cds-body-long-01-letter-spacing:0.16px;--cds-body-long-02-font-size:1rem;--cds-body-long-02-font-weight:400;--cds-body-long-02-line-height:1.5;--cds-body-long-02-letter-spacing:0;--cds-code-01-font-family:"IBM Plex Mono",system-ui,-apple-system,BlinkMacSystemFont,".SFNSText-Regular",monospace;--cds-code-01-font-size:0.75rem;--cds-code-01-font-weight:400;--cds-code-01-line-height:1.33333;--cds-code-01-letter-spacing:0.32px;--cds-code-02-font-family:"IBM Plex Mono",system-ui,-apple-system,BlinkMacSystemFont,".SFNSText-Regular",monospace;--cds-code-02-font-size:0.875rem;--cds-code-02-font-weight:400;--cds-code-02-line-height:1.42857;--cds-code-02-letter-spacing:0.32px;--cds-heading-01-font-size:0.875rem;--cds-heading-01-font-weight:600;--cds-heading-01-line-height:1.42857;--cds-heading-01-letter-spacing:0.16px;--cds-heading-02-font-size:1rem;--cds-heading-02-font-weight:600;--cds-heading-02-line-height:1.5;--cds-heading-02-letter-spacing:0;--cds-productive-heading-01-font-size:0.875rem;--cds-productive-heading-01-font-weight:600;--cds-productive-heading-01-line-height:1.28572;--cds-productive-heading-01-letter-spacing:0.16px;--cds-productive-heading-02-font-size:1rem;--cds-productive-heading-02-font-weight:600;--cds-productive-heading-02-line-height:1.375;--cds-productive-heading-02-letter-spacing:0;--cds-productive-heading-03-font-size:1.25rem;--cds-productive-heading-03-font-weight:400;--cds-productive-heading-03-line-height:1.4;--cds-productive-heading-03-letter-spacing:0;--cds-productive-heading-04-font-size:1.75rem;--cds-productive-heading-04-font-weight:400;--cds-productive-heading-04-line-height:1.28572;--cds-productive-heading-04-letter-spacing:0;--cds-productive-heading-05-font-size:2rem;--cds-productive-heading-05-font-weight:400;--cds-productive-heading-05-line-height:1.25;--cds-productive-heading-05-letter-spacing:0;--cds-productive-heading-06-font-size:2.625rem;--cds-productive-heading-06-font-weight:300;--cds-productive-heading-06-line-height:1.199;--cds-productive-heading-06-letter-spacing:0;--cds-productive-heading-07-font-size:3.375rem;--cds-productive-heading-07-font-weight:300;--cds-productive-heading-07-line-height:1.19;--cds-productive-heading-07-letter-spacing:0;--cds-expressive-paragraph-01-font-size:1.5rem;--cds-expressive-paragraph-01-font-weight:300;--cds-expressive-paragraph-01-line-height:1.334;--cds-expressive-paragraph-01-letter-spacing:0;--cds-expressive-heading-01-font-size:0.875rem;--cds-expressive-heading-01-font-weight:600;--cds-expressive-heading-01-line-height:1.42857;--cds-expressive-heading-01-letter-spacing:0.16px;--cds-expressive-heading-02-font-size:1rem;--cds-expressive-heading-02-font-weight:600;--cds-expressive-heading-02-line-height:1.5;--cds-expressive-heading-02-letter-spacing:0;--cds-expressive-heading-03-font-size:1.25rem;--cds-expressive-heading-03-font-weight:400;--cds-expressive-heading-03-line-height:1.4;--cds-expressive-heading-03-letter-spacing:0;--cds-expressive-heading-04-font-size:1.75rem;--cds-expressive-heading-04-font-weight:400;--cds-expressive-heading-04-line-height:1.28572;--cds-expressive-heading-04-letter-spacing:0;--cds-expressive-heading-05-font-size:2rem;--cds-expressive-heading-05-font-weight:400;--cds-expressive-heading-05-line-height:1.25;--cds-expressive-heading-05-letter-spacing:0;--cds-expressive-heading-06-font-size:2rem;--cds-expressive-heading-06-font-weight:600;--cds-expressive-heading-06-line-height:1.25;--cds-expressive-heading-06-letter-spacing:0;--cds-quotation-01-font-family:"IBM Plex Serif",system-ui,-apple-system,BlinkMacSystemFont,".SFNSText-Regular",serif;--cds-quotation-01-font-size:1.25rem;--cds-quotation-01-font-weight:400;--cds-quotation-01-line-height:1.3;--cds-quotation-01-letter-spacing:0;--cds-quotation-02-font-family:"IBM Plex Serif",system-ui,-apple-system,BlinkMacSystemFont,".SFNSText-Regular",serif;--cds-quotation-02-font-size:2rem;--cds-quotation-02-font-weight:300;--cds-quotation-02-line-height:1.25;--cds-quotation-02-letter-spacing:0;--cds-display-01-font-size:2.625rem;--cds-display-01-font-weight:300;--cds-display-01-line-height:1.19;--cds-display-01-letter-spacing:0;--cds-display-02-font-size:2.625rem;--cds-display-02-font-weight:600;--cds-display-02-line-height:1.19;--cds-display-02-letter-spacing:0;--cds-display-03-font-size:2.625rem;--cds-display-03-font-weight:300;--cds-display-03-line-height:1.19;--cds-display-03-letter-spacing:0;--cds-display-04-font-size:2.625rem;--cds-display-04-font-weight:300;--cds-display-04-line-height:1.19;--cds-display-04-letter-spacing:0;--cds-legal-01-font-size:0.75rem;--cds-legal-01-font-weight:400;--cds-legal-01-line-height:1.33333;--cds-legal-01-letter-spacing:0.32px;--cds-legal-02-font-size:0.875rem;--cds-legal-02-font-weight:400;--cds-legal-02-line-height:1.28572;--cds-legal-02-letter-spacing:0.16px;--cds-body-compact-01-font-size:0.875rem;--cds-body-compact-01-font-weight:400;--cds-body-compact-01-line-height:1.28572;--cds-body-compact-01-letter-spacing:0.16px;--cds-body-compact-02-font-size:1rem;--cds-body-compact-02-font-weight:400;--cds-body-compact-02-line-height:1.375;--cds-body-compact-02-letter-spacing:0;--cds-heading-compact-01-font-size:0.875rem;--cds-heading-compact-01-font-weight:600;--cds-heading-compact-01-line-height:1.28572;--cds-heading-compact-01-letter-spacing:0.16px;--cds-heading-compact-02-font-size:1rem;--cds-heading-compact-02-font-weight:600;--cds-heading-compact-02-line-height:1.375;--cds-heading-compact-02-letter-spacing:0;--cds-body-01-font-size:0.875rem;--cds-body-01-font-weight:400;--cds-body-01-line-height:1.42857;--cds-body-01-letter-spacing:0.16px;--cds-body-02-font-size:1rem;--cds-body-02-font-weight:400;--cds-body-02-line-height:1.5;--cds-body-02-letter-spacing:0;--cds-heading-03-font-size:1.25rem;--cds-heading-03-font-weight:400;--cds-heading-03-line-height:1.4;--cds-heading-03-letter-spacing:0;--cds-heading-04-font-size:1.75rem;--cds-heading-04-font-weight:400;--cds-heading-04-line-height:1.28572;--cds-heading-04-letter-spacing:0;--cds-heading-05-font-size:2rem;--cds-heading-05-font-weight:400;--cds-heading-05-line-height:1.25;--cds-heading-05-letter-spacing:0;--cds-heading-06-font-size:2.625rem;--cds-heading-06-font-weight:300;--cds-heading-06-line-height:1.199;--cds-heading-06-letter-spacing:0;--cds-heading-07-font-size:3.375rem;--cds-heading-07-font-weight:300;--cds-heading-07-line-height:1.19;--cds-heading-07-letter-spacing:0}.cds--link{border:0;box-sizing:border-box;color:var(--cds-link-text-color,var(--cds-link-primary,#0f62fe));display:inline-flex;font-family:inherit;font-size:100%;font-size:var(--cds-body-compact-01-font-size,.875rem);font-weight:var(--cds-body-compact-01-font-weight,400);letter-spacing:var(--cds-body-compact-01-letter-spacing,.16px);line-height:var(--cds-body-compact-01-line-height,1.28572);margin:0;outline:none;padding:0;text-decoration:none;transition:color 70ms cubic-bezier(.2,0,.38,.9);vertical-align:baseline}.cds--link *,.cds--link :after,.cds--link :before{box-sizing:inherit}.cds--link:hover{color:var(--cds-link-hover-text-color,var(--cds-link-primary-hover,#0043ce));text-decoration:underline}.cds--link:active,.cds--link:active:visited,.cds--link:active:visited:hover{color:var(--cds-link-text-color,var(--cds-link-primary,#0f62fe));outline:1px solid var(--cds-focus,#0f62fe);outline-color:var(--cds-link-focus-text-color,var(--cds-focus,#0f62fe));text-decoration:underline}@media screen and (prefers-contrast){.cds--link:active,.cds--link:active:visited,.cds--link:active:visited:hover{outline-style:dotted}}.cds--link:focus{outline:1px solid var(--cds-focus,#0f62fe);outline-color:var(--cds-link-focus-text-color,var(--cds-focus,#0f62fe));text-decoration:underline}@media screen and (prefers-contrast){.cds--link:focus{outline-style:dotted}}.cds--link:visited{color:var(--cds-link-text-color,var(--cds-link-primary,#0f62fe))}.cds--link:visited:hover{color:var(--cds-link-hover-text-color,var(--cds-link-primary-hover,#0043ce))}.cds--link--disabled,.cds--link--disabled:hover{border:0;box-sizing:border-box;color:var(--cds-text-disabled,hsla(0,0%,9%,.25));cursor:not-allowed;font-family:inherit;font-size:100%;font-size:var(--cds-body-compact-01-font-size,.875rem);font-weight:var(--cds-body-compact-01-font-weight,400);font-weight:400;letter-spacing:var(--cds-body-compact-01-letter-spacing,.16px);line-height:var(--cds-body-compact-01-line-height,1.28572);margin:0;padding:0;text-decoration:none;vertical-align:baseline}.cds--link--disabled *,.cds--link--disabled :after,.cds--link--disabled :before,.cds--link--disabled:hover *,.cds--link--disabled:hover :after,.cds--link--disabled:hover :before{box-sizing:inherit}.cds--link.cds--link--visited:visited{color:var(--cds-link-visited-text-color,var(--cds-link-visited,#8a3ffc))}.cds--link.cds--link--visited:visited:hover{color:var(--cds-link-hover-text-color,var(--cds-link-primary-hover,#0043ce))}.cds--link.cds--link--inline{display:inline;text-decoration:underline}.cds--link--disabled.cds--link--inline{text-decoration:underline}.cds--link--sm,.cds--link--sm.cds--link--disabled:hover{font-size:var(--cds-helper-text-01-font-size,.75rem);letter-spacing:var(--cds-helper-text-01-letter-spacing,.32px);line-height:var(--cds-helper-text-01-line-height,1.33333)}.cds--link--lg,.cds--link--lg.cds--link--disabled:hover{font-size:var(--cds-body-compact-02-font-size,1rem);font-weight:var(--cds-body-compact-02-font-weight,400);letter-spacing:var(--cds-body-compact-02-letter-spacing,0);line-height:var(--cds-body-compact-02-line-height,1.375)}.cds--link__icon{align-self:center;display:inline-flex;margin-inline-start:.5rem}:host(cds-link){outline:none}:host(cds-link) .cds--link--disabled{color:var(--cds-text-disabled,hsla(0,0%,9%,.25))}:host(cds-link) .cds--link__icon[hidden]{display:none}']);
/**
 * @license
 *
 * Copyright IBM Corp. 2019, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */const g="md";let p=class extends(a(i)){constructor(){super(...arguments),this._hasIcon=!1,this.disabled=!1,this.inline=!1,this.size=g,this.visited=!1}_handleSlotChange({target:e}){const{name:i}=e,t=e.assignedNodes().some((e=>e.nodeType!==Node.TEXT_NODE||e.textContent.trim()));this["icon"===i?"_hasIcon":""]=t,this.requestUpdate()}get _classes(){const{disabled:e,size:i,inline:t,visited:d,_hasIcon:c}=this;return n({[`${s}--link`]:!0,[`${s}--link--disabled`]:e,[`${s}--link--icon`]:c,[`${s}--link--inline`]:t,[`${s}--link--${i}`]:i,[`${s}--link--visited`]:d})}_handleClick(e){}_renderInner(){const{_hasIcon:e,_handleSlotChange:i}=this;return d`
      <slot @slotchange="${i}"></slot>
      <div ?hidden="${!e}" class="${s}--link__icon">
        <slot name="icon" @slotchange="${i}"></slot>
      </div>
    `}_renderDisabledLink(){const{_classes:e}=this;return d`
      <p id="link" part="link" class="${e}">${this._renderInner()}</p>
    `}_renderLink(){const{download:e,href:i,hreflang:t,linkRole:s,ping:n,rel:o,target:r,type:a,_classes:l,_handleClick:h}=this;return d`
      <a
        tabindex="0"
        id="link"
        role="${c(s)}"
        class="${l}"
        part="link"
        download="${c(e)}"
        href="${c(i)}"
        hreflang="${c(t)}"
        ping="${c(n)}"
        rel="${c(o)}"
        target="${c(r)}"
        type="${c(a)}"
        @click="${h}">
        ${this._renderInner()}
      </a>
    `}render(){const{disabled:e}=this;return e?this._renderDisabledLink():this._renderLink()}};p.shadowRootOptions=Object.assign(Object.assign({},i.shadowRootOptions),{delegatesFocus:!0}),p.styles=h,t([r("#link")],p.prototype,"_linkNode",void 0),t([o({type:Boolean,reflect:!0})],p.prototype,"disabled",void 0),t([o({reflect:!0})],p.prototype,"download",void 0),t([o({reflect:!0})],p.prototype,"href",void 0),t([o({reflect:!0})],p.prototype,"hreflang",void 0),t([o({type:Boolean,reflect:!0})],p.prototype,"inline",void 0),t([o({attribute:"link-role"})],p.prototype,"linkRole",void 0),t([o({reflect:!0})],p.prototype,"ping",void 0),t([o({reflect:!0})],p.prototype,"rel",void 0),t([o({reflect:!0})],p.prototype,"size",void 0),t([o({reflect:!0})],p.prototype,"target",void 0),t([o({reflect:!0})],p.prototype,"type",void 0),t([o({type:Boolean,reflect:!0})],p.prototype,"visited",void 0),p=t([l(`${s}-link`)],p);var f=p;export{f as C};
