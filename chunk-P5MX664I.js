import{$ as Pe,B as Ut,C as Fn,E as pt,F as kn,G as Gt,H as Wt,I as ht,J as Nn,K as Ie,L as On,M as ft,N as gt,O as Oe,P as Pn,Q as Bn,S as qt,T as Ln,V as mt,W as oe,Y as Zt,Z as Qt,_ as xe,aa as $,b as Ee,ba as $n,c as En,d as pe,e as In,f as xn,g as Sn,m as An,v as zt,y as Vn,z as Tn}from"./chunk-2XPZBQAU.js";import{a as Ht,d as Dn,e as Mn,f as ut,g as wn,h as ct,j as ne,k as ze,l as jt}from"./chunk-D7UUCSFC.js";import{$a as h,Ab as le,Bb as C,Cb as be,Db as ve,Eb as st,Gb as ue,Hb as ce,I as nt,Ja as v,K as he,L,Lb as yn,M as j,Mb as at,Nb as lt,O as k,Ob as w,Pb as Me,Q as f,Qa as De,Qb as Ne,Ra as y,Rb as Cn,V as Ae,W as Ve,Wa as I,Wb as E,X as T,Xa as z,Ya as _,Yb as _n,Z as Lt,Zb as je,_ as ot,_a as re,a as c,ab as Y,b as H,ba as q,c as hn,ca as it,cb as vn,dc as te,ec as A,ga as P,gb as M,hb as fe,hc as N,i as fn,ib as ge,ic as d,ja as G,ka as Te,l as gn,la as g,mb as b,mc as dt,na as de,nb as se,ob as ae,pb as W,q as mn,qb as X,qc as x,ra as rt,rb as K,rc as we,sb as U,sc as Rt,tb as Fe,ub as ke,v as bn,vb as He,wb as $t,xb as me}from"./chunk-LD7HP2X4.js";function ye(...t){if(t){let o=[];for(let e=0;e<t.length;e++){let n=t[e];if(!n)continue;let i=typeof n;if(i==="string"||i==="number")o.push(n);else if(i==="object"){let r=Array.isArray(n)?[ye(...n)]:Object.entries(n).map(([s,a])=>a?s:void 0);o=r.length?o.concat(r.filter(s=>!!s)):o}}return o.join(" ").trim()}}var li=Object.defineProperty,Rn=Object.getOwnPropertySymbols,di=Object.prototype.hasOwnProperty,ui=Object.prototype.propertyIsEnumerable,Hn=(t,o,e)=>o in t?li(t,o,{enumerable:!0,configurable:!0,writable:!0,value:e}):t[o]=e,jn=(t,o)=>{for(var e in o||(o={}))di.call(o,e)&&Hn(t,e,o[e]);if(Rn)for(var e of Rn(o))ui.call(o,e)&&Hn(t,e,o[e]);return t};function zn(...t){if(t){let o=[];for(let e=0;e<t.length;e++){let n=t[e];if(!n)continue;let i=typeof n;if(i==="string"||i==="number")o.push(n);else if(i==="object"){let r=Array.isArray(n)?[zn(...n)]:Object.entries(n).map(([s,a])=>a?s:void 0);o=r.length?o.concat(r.filter(s=>!!s)):o}}return o.join(" ").trim()}}function ci(t){return typeof t=="function"&&"call"in t&&"apply"in t}function pi({skipUndefined:t=!1},...o){return o?.reduce((e,n={})=>{for(let i in n){let r=n[i];if(!(t&&r===void 0))if(i==="style")e.style=jn(jn({},e.style),n.style);else if(i==="class"||i==="className")e[i]=zn(e[i],n[i]);else if(ci(r)){let s=e[i];e[i]=s?(...a)=>{s(...a),r(...a)}:r}else e[i]=r}return e},{})}function Yt(...t){return pi({skipUndefined:!1},...t)}var bt={};function Z(t="pui_id_"){return Object.hasOwn(bt,t)||(bt[t]=0),bt[t]++,`${t}${bt[t]}`}var Un=(()=>{class t extends ${name="common";static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac,providedIn:"root"})}return t})(),J=new k("PARENT_INSTANCE"),O=(()=>{class t{document=f(ot);platformId=f(rt);el=f(de);injector=f(Lt);cd=f(dt);renderer=f(De);config=f($n);$parentInstance=f(J,{optional:!0,skipSelf:!0})??void 0;baseComponentStyle=f(Un);baseStyle=f($);scopedStyleEl;parent=this.$params.parent;cn=ye;_themeScopedListener;themeChangeListenerMap=new Map;dt=d();unstyled=d();pt=d();ptOptions=d();$attrSelector=Z("pc");get $name(){return this.componentName||"UnknownComponent"}get $hostName(){return this.hostName}get $el(){return this.el?.nativeElement}directivePT=P(void 0);directiveUnstyled=P(void 0);$unstyled=A(()=>this.unstyled()??this.directiveUnstyled()??this.config?.unstyled()??!1);$pt=A(()=>ft(this.pt()||this.directivePT(),this.$params));get $globalPT(){return this._getPT(this.config?.pt(),void 0,e=>ft(e,this.$params))}get $defaultPT(){return this._getPT(this.config?.pt(),void 0,e=>this._getOptionValue(e,this.$hostName||this.$name,this.$params)||ft(e,this.$params))}get $style(){return c(c({theme:void 0,css:void 0,classes:void 0,inlineStyles:void 0},(this._getHostInstance(this)||{}).$style),this._componentStyle)}get $styleOptions(){return{nonce:this.config?.csp().nonce}}get $params(){let e=this._getHostInstance(this)||this.$parentInstance;return{instance:this,parent:{instance:e}}}onInit(){}onChanges(e){}onDoCheck(){}onAfterContentInit(){}onAfterContentChecked(){}onAfterViewInit(){}onAfterViewChecked(){}onDestroy(){}constructor(){G(e=>{this.document&&!jt(this.platformId)&&(this.dt()?(this._loadScopedThemeStyles(this.dt()),this._themeScopedListener=()=>this._loadScopedThemeStyles(this.dt()),this._themeChangeListener("_themeScopedListener",this._themeScopedListener)):this._unloadScopedThemeStyles()),e(()=>{this._offThemeChangeListener("_themeScopedListener")})}),G(e=>{this.document&&!jt(this.platformId)&&(this.$unstyled()||(this._loadCoreStyles(),this._themeChangeListener("_loadCoreStyles",this._loadCoreStyles))),e(()=>{this._offThemeChangeListener("_loadCoreStyles")})}),this._hook("onBeforeInit")}ngOnInit(){this._loadCoreStyles(),this._loadStyles(),this.onInit(),this._hook("onInit")}ngOnChanges(e){this.onChanges(e),this._hook("onChanges",e)}ngDoCheck(){this.onDoCheck(),this._hook("onDoCheck")}ngAfterContentInit(){this.onAfterContentInit(),this._hook("onAfterContentInit")}ngAfterContentChecked(){this.onAfterContentChecked(),this._hook("onAfterContentChecked")}ngAfterViewInit(){this.$el?.setAttribute(this.$attrSelector,""),this.onAfterViewInit(),this._hook("onAfterViewInit")}ngAfterViewChecked(){this.onAfterViewChecked(),this._hook("onAfterViewChecked")}ngOnDestroy(){this._removeThemeListeners(),this._unloadScopedThemeStyles(),this.onDestroy(),this._hook("onDestroy")}_mergeProps(e,...n){return Nn(e)?e(...n):Yt(...n)}_getHostInstance(e){return e?this.$hostName?this.$name===this.$hostName?e:this._getHostInstance(e.$parentInstance):e.$parentInstance:void 0}_getPropValue(e){return this[e]||this._getHostInstance(this)?.[e]}_getOptionValue(e,n="",i={}){return Pn(e,n,i)}_hook(e,...n){if(!this.$hostName){let i=this._usePT(this._getPT(this.$pt(),this.$name),this._getOptionValue,`hooks.${e}`),r=this._useDefaultPT(this._getOptionValue,`hooks.${e}`);i?.(...n),r?.(...n)}}_load(){Pe.isStyleNameLoaded("base")||(this.baseStyle.loadBaseCSS(this.$styleOptions),this._loadGlobalStyles(),Pe.setLoadedStyleName("base")),this._loadThemeStyles()}_loadStyles(){this._load(),this._themeChangeListener("_load",()=>this._load())}_loadGlobalStyles(){let e=this._useGlobalPT(this._getOptionValue,"global.css",this.$params);Ie(e)&&this.baseStyle.load(e,c({name:"global"},this.$styleOptions))}_loadCoreStyles(){!Pe.isStyleNameLoaded(this.$style?.name)&&this.$style?.name&&(this.baseComponentStyle.loadCSS(this.$styleOptions),this.$style.loadCSS(this.$styleOptions),Pe.setLoadedStyleName(this.$style.name))}_loadThemeStyles(){if(!(this.$unstyled()||this.config?.theme()==="none")){if(!xe.isStyleNameLoaded("common")){let{primitive:e,semantic:n,global:i,style:r}=this.$style?.getCommonTheme?.()||{};this.baseStyle.load(e?.css,c({name:"primitive-variables"},this.$styleOptions)),this.baseStyle.load(n?.css,c({name:"semantic-variables"},this.$styleOptions)),this.baseStyle.load(i?.css,c({name:"global-variables"},this.$styleOptions)),this.baseStyle.loadBaseStyle(c({name:"global-style"},this.$styleOptions),r),xe.setLoadedStyleName("common")}if(!xe.isStyleNameLoaded(this.$style?.name)&&this.$style?.name){let{css:e,style:n}=this.$style?.getComponentTheme?.()||{};this.$style?.load(e,c({name:`${this.$style?.name}-variables`},this.$styleOptions)),this.$style?.loadStyle(c({name:`${this.$style?.name}-style`},this.$styleOptions),n),xe.setLoadedStyleName(this.$style?.name)}if(!xe.isStyleNameLoaded("layer-order")){let e=this.$style?.getLayerOrderThemeCSS?.();this.baseStyle.load(e,c({name:"layer-order",first:!0},this.$styleOptions)),xe.setLoadedStyleName("layer-order")}}}_loadScopedThemeStyles(e){let{css:n}=this.$style?.getPresetTheme?.(e,`[${this.$attrSelector}]`)||{},i=this.$style?.load(n,c({name:`${this.$attrSelector}-${this.$style?.name}`},this.$styleOptions));this.scopedStyleEl=i?.el}_unloadScopedThemeStyles(){this.scopedStyleEl?.remove()}_themeChangeListener(e,n=()=>{}){this._offThemeChangeListener(e),Pe.clearLoadedStyleNames();let i=n.bind(this);this.themeChangeListenerMap.set(e,i),Zt.on("theme:change",i)}_removeThemeListeners(){this._offThemeChangeListener("_themeScopedListener"),this._offThemeChangeListener("_loadCoreStyles"),this._offThemeChangeListener("_load")}_offThemeChangeListener(e){this.themeChangeListenerMap.has(e)&&(Zt.off("theme:change",this.themeChangeListenerMap.get(e)),this.themeChangeListenerMap.delete(e))}_getPTValue(e={},n="",i={},r=!0){let s=/./g.test(n)&&!!i[n.split(".")[0]],{mergeSections:a=!0,mergeProps:l=!1}=this._getPropValue("ptOptions")?.()||this.config?.ptOptions?.()||{},p=r?s?this._useGlobalPT(this._getPTClassValue,n,i):this._useDefaultPT(this._getPTClassValue,n,i):void 0,u=s?void 0:this._usePT(this._getPT(e,this.$hostName||this.$name),this._getPTClassValue,n,H(c({},i),{global:p||{}})),m=this._getPTDatasets(n);return a||!a&&u?l?this._mergeProps(l,p,u,m):c(c(c({},p),u),m):c(c({},u),m)}_getPTDatasets(e=""){let n="data-pc-",i=e==="root"&&Ie(this.$pt()?.["data-pc-section"]);return e!=="transition"&&H(c({},e==="root"&&H(c({[`${n}name`]:Oe(i?this.$pt()?.["data-pc-section"]:this.$name)},i&&{[`${n}extend`]:Oe(this.$name)}),{[`${this.$attrSelector}`]:""})),{[`${n}section`]:Oe(e.includes(".")?e.split(".").at(-1)??"":e)})}_getPTClassValue(e,n,i){let r=this._getOptionValue(e,n,i);return gt(r)||Bn(r)?{class:r}:r}_getPT(e,n="",i){let r=(s,a=!1)=>{let l=i?i(s):s,p=Oe(n),u=Oe(this.$hostName||this.$name);return(a?p!==u?l?.[p]:void 0:l?.[p])??l};return e?.hasOwnProperty("_usept")?{_usept:e._usept,originalValue:r(e.originalValue),value:r(e.value)}:r(e,!0)}_usePT(e,n,i,r){let s=a=>n?.call(this,a,i,r);if(e?.hasOwnProperty("_usept")){let{mergeSections:a=!0,mergeProps:l=!1}=e._usept||this.config?.ptOptions()||{},p=s(e.originalValue),u=s(e.value);return p===void 0&&u===void 0?void 0:gt(u)?u:gt(p)?p:a||!a&&u?l?this._mergeProps(l,p,u):c(c({},p),u):u}return s(e)}_useGlobalPT(e,n,i){return this._usePT(this.$globalPT,e,n,i)}_useDefaultPT(e,n,i){return this._usePT(this.$defaultPT,e,n,i)}ptm(e="",n={}){return this._getPTValue(this.$pt(),e,c(c({},this.$params),n))}ptms(e,n={}){return e.reduce((i,r)=>(i=Yt(i,this.ptm(r,n))||{},i),{})}ptmo(e={},n="",i={}){return this._getPTValue(e,n,c({instance:this},i),!1)}cx(e,n={}){return this.$unstyled()?void 0:ye(this._getOptionValue(this.$style.classes,e,c(c({},this.$params),n)))}sx(e="",n=!0,i={}){if(n){let r=this._getOptionValue(this.$style.inlineStyles,e,c(c({},this.$params),i)),s=this._getOptionValue(this.baseComponentStyle.inlineStyles,e,c(c({},this.$params),i));return c(c({},s),r)}}static \u0275fac=function(n){return new(n||t)};static \u0275dir=_({type:t,inputs:{dt:[1,"dt"],unstyled:[1,"unstyled"],pt:[1,"pt"],ptOptions:[1,"ptOptions"]},features:[E([Un,$]),Te]})}return t})();var V=(()=>{class t{el;renderer;pBind=d(void 0);_attrs=P(void 0);attrs=A(()=>this._attrs()||this.pBind());styles=A(()=>this.attrs()?.style);classes=A(()=>ye(this.attrs()?.class));listeners=[];constructor(e,n){this.el=e,this.renderer=n,G(()=>{let a=this.attrs()||{},{style:i,class:r}=a,s=hn(a,["style","class"]);for(let[l,p]of Object.entries(s))if(l.startsWith("on")&&typeof p=="function"){let u=l.slice(2).toLowerCase();if(!this.listeners.some(m=>m.eventName===u)){let m=this.renderer.listen(this.el.nativeElement,u,p);this.listeners.push({eventName:u,unlisten:m})}}else p==null?this.renderer.removeAttribute(this.el.nativeElement,l):(this.renderer.setAttribute(this.el.nativeElement,l,p.toString()),l in this.el.nativeElement&&(this.el.nativeElement[l]=p))})}ngOnDestroy(){this.clearListeners()}setAttrs(e){On(this._attrs(),e)||this._attrs.set(e)}clearListeners(){this.listeners.forEach(({unlisten:e})=>e()),this.listeners=[]}static \u0275fac=function(n){return new(n||t)(y(de),y(De))};static \u0275dir=_({type:t,selectors:[["","pBind",""]],hostVars:4,hostBindings:function(n,i){n&2&&(lt(i.styles()),w(i.classes()))},inputs:{pBind:[1,"pBind"]}})}return t})(),vt=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({})}return t})();var hi=["*"],fi=`
.p-icon {
    display: inline-block;
    vertical-align: baseline;
    flex-shrink: 0;
}

.p-icon-spin {
    -webkit-animation: p-icon-spin 2s infinite linear;
    animation: p-icon-spin 2s infinite linear;
}

@-webkit-keyframes p-icon-spin {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
    }
    100% {
        -webkit-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}

@keyframes p-icon-spin {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
    }
    100% {
        -webkit-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}
`,Gn=(()=>{class t extends ${name="baseicon";css=fi;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac,providedIn:"root"})}return t})();var ee=(()=>{class t extends O{spin=!1;_componentStyle=f(Gn);getClassNames(){return ye("p-icon",{"p-icon-spin":this.spin})}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["ng-component"]],hostAttrs:["width","14","height","14","viewBox","0 0 14 14","fill","none","xmlns","http://www.w3.org/2000/svg"],hostVars:2,hostBindings:function(n,i){n&2&&w(i.getClassNames())},inputs:{spin:[2,"spin","spin",x]},features:[E([Gn]),h],ngContentSelectors:hi,decls:1,vars:0,template:function(n,i){n&1&&(be(),ve(0))},encapsulation:2,changeDetection:0})}return t})();var gi=["data-p-icon","check"],Wn=(()=>{class t extends ee{static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["","data-p-icon","check"]],features:[h],attrs:gi,decls:1,vars:0,consts:[["d","M4.86199 11.5948C4.78717 11.5923 4.71366 11.5745 4.64596 11.5426C4.57826 11.5107 4.51779 11.4652 4.46827 11.4091L0.753985 7.69483C0.683167 7.64891 0.623706 7.58751 0.580092 7.51525C0.536478 7.44299 0.509851 7.36177 0.502221 7.27771C0.49459 7.19366 0.506156 7.10897 0.536046 7.03004C0.565935 6.95111 0.613367 6.88 0.674759 6.82208C0.736151 6.76416 0.8099 6.72095 0.890436 6.69571C0.970973 6.67046 1.05619 6.66385 1.13966 6.67635C1.22313 6.68886 1.30266 6.72017 1.37226 6.76792C1.44186 6.81567 1.4997 6.8786 1.54141 6.95197L4.86199 10.2503L12.6397 2.49483C12.7444 2.42694 12.8689 2.39617 12.9932 2.40745C13.1174 2.41873 13.2343 2.47141 13.3251 2.55705C13.4159 2.64268 13.4753 2.75632 13.4938 2.87973C13.5123 3.00315 13.4888 3.1292 13.4271 3.23768L5.2557 11.4091C5.20618 11.4652 5.14571 11.5107 5.07801 11.5426C5.01031 11.5745 4.9368 11.5923 4.86199 11.5948Z","fill","currentColor"]],template:function(n,i){n&1&&(T(),U(0,"path",0))},encapsulation:2})}return t})();var mi=["data-p-icon","exclamation-triangle"],qn=(()=>{class t extends ee{pathId;onInit(){this.pathId="url(#"+Z()+")"}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["","data-p-icon","exclamation-triangle"]],features:[h],attrs:mi,decls:7,vars:2,consts:[["d","M13.4018 13.1893H0.598161C0.49329 13.189 0.390283 13.1615 0.299143 13.1097C0.208003 13.0578 0.131826 12.9832 0.0780112 12.8932C0.0268539 12.8015 0 12.6982 0 12.5931C0 12.4881 0.0268539 12.3848 0.0780112 12.293L6.47985 1.08982C6.53679 1.00399 6.61408 0.933574 6.70484 0.884867C6.7956 0.836159 6.897 0.810669 7 0.810669C7.103 0.810669 7.2044 0.836159 7.29516 0.884867C7.38592 0.933574 7.46321 1.00399 7.52015 1.08982L13.922 12.293C13.9731 12.3848 14 12.4881 14 12.5931C14 12.6982 13.9731 12.8015 13.922 12.8932C13.8682 12.9832 13.792 13.0578 13.7009 13.1097C13.6097 13.1615 13.5067 13.189 13.4018 13.1893ZM1.63046 11.989H12.3695L7 2.59425L1.63046 11.989Z","fill","currentColor"],["d","M6.99996 8.78801C6.84143 8.78594 6.68997 8.72204 6.57787 8.60993C6.46576 8.49782 6.40186 8.34637 6.39979 8.18784V5.38703C6.39979 5.22786 6.46302 5.0752 6.57557 4.96265C6.68813 4.85009 6.84078 4.78686 6.99996 4.78686C7.15914 4.78686 7.31179 4.85009 7.42435 4.96265C7.5369 5.0752 7.60013 5.22786 7.60013 5.38703V8.18784C7.59806 8.34637 7.53416 8.49782 7.42205 8.60993C7.30995 8.72204 7.15849 8.78594 6.99996 8.78801Z","fill","currentColor"],["d","M6.99996 11.1887C6.84143 11.1866 6.68997 11.1227 6.57787 11.0106C6.46576 10.8985 6.40186 10.7471 6.39979 10.5885V10.1884C6.39979 10.0292 6.46302 9.87658 6.57557 9.76403C6.68813 9.65147 6.84078 9.58824 6.99996 9.58824C7.15914 9.58824 7.31179 9.65147 7.42435 9.76403C7.5369 9.87658 7.60013 10.0292 7.60013 10.1884V10.5885C7.59806 10.7471 7.53416 10.8985 7.42205 11.0106C7.30995 11.1227 7.15849 11.1866 6.99996 11.1887Z","fill","currentColor"],[3,"id"],["width","14","height","14","fill","white"]],template:function(n,i){n&1&&(T(),X(0,"g"),U(1,"path",0)(2,"path",1)(3,"path",2),K(),X(4,"defs")(5,"clipPath",3),U(6,"rect",4),K()()),n&2&&(M("clip-path",i.pathId),v(5),me("id",i.pathId))},encapsulation:2})}return t})();var bi=["data-p-icon","info-circle"],Zn=(()=>{class t extends ee{pathId;onInit(){this.pathId="url(#"+Z()+")"}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["","data-p-icon","info-circle"]],features:[h],attrs:bi,decls:5,vars:2,consts:[["fill-rule","evenodd","clip-rule","evenodd","d","M3.11101 12.8203C4.26215 13.5895 5.61553 14 7 14C8.85652 14 10.637 13.2625 11.9497 11.9497C13.2625 10.637 14 8.85652 14 7C14 5.61553 13.5895 4.26215 12.8203 3.11101C12.0511 1.95987 10.9579 1.06266 9.67879 0.532846C8.3997 0.00303296 6.99224 -0.13559 5.63437 0.134506C4.2765 0.404603 3.02922 1.07129 2.05026 2.05026C1.07129 3.02922 0.404603 4.2765 0.134506 5.63437C-0.13559 6.99224 0.00303296 8.3997 0.532846 9.67879C1.06266 10.9579 1.95987 12.0511 3.11101 12.8203ZM3.75918 2.14976C4.71846 1.50879 5.84628 1.16667 7 1.16667C8.5471 1.16667 10.0308 1.78125 11.1248 2.87521C12.2188 3.96918 12.8333 5.45291 12.8333 7C12.8333 8.15373 12.4912 9.28154 11.8502 10.2408C11.2093 11.2001 10.2982 11.9478 9.23232 12.3893C8.16642 12.8308 6.99353 12.9463 5.86198 12.7212C4.73042 12.4962 3.69102 11.9406 2.87521 11.1248C2.05941 10.309 1.50384 9.26958 1.27876 8.13803C1.05367 7.00647 1.16919 5.83358 1.61071 4.76768C2.05222 3.70178 2.79989 2.79074 3.75918 2.14976ZM7.00002 4.8611C6.84594 4.85908 6.69873 4.79698 6.58977 4.68801C6.48081 4.57905 6.4187 4.43185 6.41669 4.27776V3.88888C6.41669 3.73417 6.47815 3.58579 6.58754 3.4764C6.69694 3.367 6.84531 3.30554 7.00002 3.30554C7.15473 3.30554 7.3031 3.367 7.4125 3.4764C7.52189 3.58579 7.58335 3.73417 7.58335 3.88888V4.27776C7.58134 4.43185 7.51923 4.57905 7.41027 4.68801C7.30131 4.79698 7.1541 4.85908 7.00002 4.8611ZM7.00002 10.6945C6.84594 10.6925 6.69873 10.6304 6.58977 10.5214C6.48081 10.4124 6.4187 10.2652 6.41669 10.1111V6.22225C6.41669 6.06754 6.47815 5.91917 6.58754 5.80977C6.69694 5.70037 6.84531 5.63892 7.00002 5.63892C7.15473 5.63892 7.3031 5.70037 7.4125 5.80977C7.52189 5.91917 7.58335 6.06754 7.58335 6.22225V10.1111C7.58134 10.2652 7.51923 10.4124 7.41027 10.5214C7.30131 10.6304 7.1541 10.6925 7.00002 10.6945Z","fill","currentColor"],[3,"id"],["width","14","height","14","fill","white"]],template:function(n,i){n&1&&(T(),X(0,"g"),U(1,"path",0),K(),X(2,"defs")(3,"clipPath",1),U(4,"rect",2),K()()),n&2&&(M("clip-path",i.pathId),v(3),me("id",i.pathId))},encapsulation:2})}return t})();var vi=["data-p-icon","spinner"],Qn=(()=>{class t extends ee{pathId;onInit(){this.pathId="url(#"+Z()+")"}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["","data-p-icon","spinner"]],features:[h],attrs:vi,decls:5,vars:2,consts:[["d","M6.99701 14C5.85441 13.999 4.72939 13.7186 3.72012 13.1832C2.71084 12.6478 1.84795 11.8737 1.20673 10.9284C0.565504 9.98305 0.165424 8.89526 0.041387 7.75989C-0.0826496 6.62453 0.073125 5.47607 0.495122 4.4147C0.917119 3.35333 1.59252 2.4113 2.46241 1.67077C3.33229 0.930247 4.37024 0.413729 5.4857 0.166275C6.60117 -0.0811796 7.76026 -0.0520535 8.86188 0.251112C9.9635 0.554278 10.9742 1.12227 11.8057 1.90555C11.915 2.01493 11.9764 2.16319 11.9764 2.31778C11.9764 2.47236 11.915 2.62062 11.8057 2.73C11.7521 2.78503 11.688 2.82877 11.6171 2.85864C11.5463 2.8885 11.4702 2.90389 11.3933 2.90389C11.3165 2.90389 11.2404 2.8885 11.1695 2.85864C11.0987 2.82877 11.0346 2.78503 10.9809 2.73C9.9998 1.81273 8.73246 1.26138 7.39226 1.16876C6.05206 1.07615 4.72086 1.44794 3.62279 2.22152C2.52471 2.99511 1.72683 4.12325 1.36345 5.41602C1.00008 6.70879 1.09342 8.08723 1.62775 9.31926C2.16209 10.5513 3.10478 11.5617 4.29713 12.1803C5.48947 12.7989 6.85865 12.988 8.17414 12.7157C9.48963 12.4435 10.6711 11.7264 11.5196 10.6854C12.3681 9.64432 12.8319 8.34282 12.8328 7C12.8328 6.84529 12.8943 6.69692 13.0038 6.58752C13.1132 6.47812 13.2616 6.41667 13.4164 6.41667C13.5712 6.41667 13.7196 6.47812 13.8291 6.58752C13.9385 6.69692 14 6.84529 14 7C14 8.85651 13.2622 10.637 11.9489 11.9497C10.6356 13.2625 8.85432 14 6.99701 14Z","fill","currentColor"],[3,"id"],["width","14","height","14","fill","white"]],template:function(n,i){n&1&&(T(),X(0,"g"),U(1,"path",0),K(),X(2,"defs")(3,"clipPath",1),U(4,"rect",2),K()()),n&2&&(M("clip-path",i.pathId),v(3),me("id",i.pathId))},encapsulation:2})}return t})();var yi=["data-p-icon","times"],Yn=(()=>{class t extends ee{static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["","data-p-icon","times"]],features:[h],attrs:yi,decls:1,vars:0,consts:[["d","M8.01186 7.00933L12.27 2.75116C12.341 2.68501 12.398 2.60524 12.4375 2.51661C12.4769 2.42798 12.4982 2.3323 12.4999 2.23529C12.5016 2.13827 12.4838 2.0419 12.4474 1.95194C12.4111 1.86197 12.357 1.78024 12.2884 1.71163C12.2198 1.64302 12.138 1.58893 12.0481 1.55259C11.9581 1.51625 11.8617 1.4984 11.7647 1.50011C11.6677 1.50182 11.572 1.52306 11.4834 1.56255C11.3948 1.60204 11.315 1.65898 11.2488 1.72997L6.99067 5.98814L2.7325 1.72997C2.59553 1.60234 2.41437 1.53286 2.22718 1.53616C2.03999 1.53946 1.8614 1.61529 1.72901 1.74767C1.59663 1.88006 1.5208 2.05865 1.5175 2.24584C1.5142 2.43303 1.58368 2.61419 1.71131 2.75116L5.96948 7.00933L1.71131 11.2675C1.576 11.403 1.5 11.5866 1.5 11.7781C1.5 11.9696 1.576 12.1532 1.71131 12.2887C1.84679 12.424 2.03043 12.5 2.2219 12.5C2.41338 12.5 2.59702 12.424 2.7325 12.2887L6.99067 8.03052L11.2488 12.2887C11.3843 12.424 11.568 12.5 11.7594 12.5C11.9509 12.5 12.1346 12.424 12.27 12.2887C12.4053 12.1532 12.4813 11.9696 12.4813 11.7781C12.4813 11.5866 12.4053 11.403 12.27 11.2675L8.01186 7.00933Z","fill","currentColor"]],template:function(n,i){n&1&&(T(),U(0,"path",0))},encapsulation:2})}return t})();var Ci=["data-p-icon","times-circle"],Xn=(()=>{class t extends ee{pathId;onInit(){this.pathId="url(#"+Z()+")"}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["","data-p-icon","times-circle"]],features:[h],attrs:Ci,decls:5,vars:2,consts:[["fill-rule","evenodd","clip-rule","evenodd","d","M7 14C5.61553 14 4.26215 13.5895 3.11101 12.8203C1.95987 12.0511 1.06266 10.9579 0.532846 9.67879C0.00303296 8.3997 -0.13559 6.99224 0.134506 5.63437C0.404603 4.2765 1.07129 3.02922 2.05026 2.05026C3.02922 1.07129 4.2765 0.404603 5.63437 0.134506C6.99224 -0.13559 8.3997 0.00303296 9.67879 0.532846C10.9579 1.06266 12.0511 1.95987 12.8203 3.11101C13.5895 4.26215 14 5.61553 14 7C14 8.85652 13.2625 10.637 11.9497 11.9497C10.637 13.2625 8.85652 14 7 14ZM7 1.16667C5.84628 1.16667 4.71846 1.50879 3.75918 2.14976C2.79989 2.79074 2.05222 3.70178 1.61071 4.76768C1.16919 5.83358 1.05367 7.00647 1.27876 8.13803C1.50384 9.26958 2.05941 10.309 2.87521 11.1248C3.69102 11.9406 4.73042 12.4962 5.86198 12.7212C6.99353 12.9463 8.16642 12.8308 9.23232 12.3893C10.2982 11.9478 11.2093 11.2001 11.8502 10.2408C12.4912 9.28154 12.8333 8.15373 12.8333 7C12.8333 5.45291 12.2188 3.96918 11.1248 2.87521C10.0308 1.78125 8.5471 1.16667 7 1.16667ZM4.66662 9.91668C4.58998 9.91704 4.51404 9.90209 4.44325 9.87271C4.37246 9.84333 4.30826 9.8001 4.2544 9.74557C4.14516 9.6362 4.0838 9.48793 4.0838 9.33335C4.0838 9.17876 4.14516 9.0305 4.2544 8.92113L6.17553 7L4.25443 5.07891C4.15139 4.96832 4.09529 4.82207 4.09796 4.67094C4.10063 4.51982 4.16185 4.37563 4.26872 4.26876C4.3756 4.16188 4.51979 4.10066 4.67091 4.09799C4.82204 4.09532 4.96829 4.15142 5.07887 4.25446L6.99997 6.17556L8.92106 4.25446C9.03164 4.15142 9.1779 4.09532 9.32903 4.09799C9.48015 4.10066 9.62434 4.16188 9.73121 4.26876C9.83809 4.37563 9.89931 4.51982 9.90198 4.67094C9.90464 4.82207 9.84855 4.96832 9.74551 5.07891L7.82441 7L9.74554 8.92113C9.85478 9.0305 9.91614 9.17876 9.91614 9.33335C9.91614 9.48793 9.85478 9.6362 9.74554 9.74557C9.69168 9.8001 9.62748 9.84333 9.55669 9.87271C9.4859 9.90209 9.40996 9.91704 9.33332 9.91668C9.25668 9.91704 9.18073 9.90209 9.10995 9.87271C9.03916 9.84333 8.97495 9.8001 8.9211 9.74557L6.99997 7.82444L5.07884 9.74557C5.02499 9.8001 4.96078 9.84333 4.88999 9.87271C4.81921 9.90209 4.74326 9.91704 4.66662 9.91668Z","fill","currentColor"],[3,"id"],["width","14","height","14","fill","white"]],template:function(n,i){n&1&&(T(),X(0,"g"),U(1,"path",0),K(),X(2,"defs")(3,"clipPath",1),U(4,"rect",2),K()()),n&2&&(M("clip-path",i.pathId),v(3),me("id",i.pathId))},encapsulation:2})}return t})();var _i=Object.defineProperty,Kn=Object.getOwnPropertySymbols,Di=Object.prototype.hasOwnProperty,Mi=Object.prototype.propertyIsEnumerable,Jn=(t,o,e)=>o in t?_i(t,o,{enumerable:!0,configurable:!0,writable:!0,value:e}):t[o]=e,eo=(t,o)=>{for(var e in o||(o={}))Di.call(o,e)&&Jn(t,e,o[e]);if(Kn)for(var e of Kn(o))Mi.call(o,e)&&Jn(t,e,o[e]);return t},wi=(t,o,e)=>new Promise((n,i)=>{var r=l=>{try{a(e.next(l))}catch(p){i(p)}},s=l=>{try{a(e.throw(l))}catch(p){i(p)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(r,s);a((e=e.apply(t,o)).next())}),yt="animation",Ge="transition";function Ei(t){return t?t.disabled||!!(t.safe&&Fn()):!1}function Ii(t,o){return t?eo(eo({},t),Object.entries(o).reduce((e,[n,i])=>{var r;return e[n]=(r=t[n])!=null?r:i,e},{})):o}function xi(t){let{name:o,enterClass:e,leaveClass:n}=t||{};return{enter:{from:e?.from||`${o}-enter-from`,to:e?.to||`${o}-enter-to`,active:e?.active||`${o}-enter-active`},leave:{from:n?.from||`${o}-leave-from`,to:n?.to||`${o}-leave-to`,active:n?.active||`${o}-leave-active`}}}function Si(t){return{enter:{onBefore:t?.onBeforeEnter,onStart:t?.onEnter,onAfter:t?.onAfterEnter,onCancelled:t?.onEnterCancelled},leave:{onBefore:t?.onBeforeLeave,onStart:t?.onLeave,onAfter:t?.onAfterLeave,onCancelled:t?.onLeaveCancelled}}}function Ai(t,o){let e=window.getComputedStyle(t),n=D=>{let F=e[`${D}Delay`],B=e[`${D}Duration`];return[F.split(", ").map(qt),B.split(", ").map(qt)]},[i,r]=n(Ge),[s,a]=n(yt),l=Math.max(...r.map((D,F)=>D+i[F])),p=Math.max(...a.map((D,F)=>D+s[F])),u,m=0,S=0;return o===Ge?l>0&&(u=Ge,m=l,S=r.length):o===yt?p>0&&(u=yt,m=p,S=a.length):(m=Math.max(l,p),u=m>0?l>p?Ge:yt:void 0,S=u?u===Ge?r.length:a.length:0),{type:u,timeout:m,count:S}}function Ct(t,o){return typeof t=="number"?t:typeof t=="object"&&t[o]!=null?t[o]:null}function Vi(t,o=!0,e=!1){if(!o&&!e)return;let n=Sn(t);o&&Wt(t,"--pui-motion-height",n.height+"px"),e&&Wt(t,"--pui-motion-width",n.width+"px")}var Ti={name:"p",safe:!0,disabled:!1,enter:!0,leave:!0,autoHeight:!0,autoWidth:!1};function Xt(t,o){if(!t)throw new Error("Element is required.");let e={},n=!1,i={},r=null,s={},a=u=>{if(Object.assign(e,Ii(u,Ti)),!e.enter&&!e.leave)throw new Error("Enter or leave must be true.");s=Si(e),n=Ei(e),i=xi(e),r=null},l=u=>wi(null,null,function*(){r?.();let{onBefore:m,onStart:S,onAfter:D,onCancelled:F}=s[u]||{},B={element:t};if(n){m?.(B),S?.(B),D?.(B);return}let{from:_e,active:Re,to:tt}=i[u]||{};return Vi(t,e.autoHeight,e.autoWidth),m?.(B),Ee(t,_e),Ee(t,Re),t.offsetHeight,pe(t,_e),Ee(t,tt),S?.(B),new Promise(ie=>{let si=Ct(e.duration,u),pn=()=>{pe(t,[tt,Re]),r=null},ai=()=>{pn(),D?.(B),ie()};r=()=>{pn(),F?.(B),ie()},ki(t,e.type,si,ai)})});a(o);let p={enter:()=>e.enter?l("enter"):Promise.resolve(),leave:()=>e.leave?l("leave"):Promise.resolve(),cancel:()=>{r?.(),r=null},update:(u,m)=>{if(!u)throw new Error("Element is required.");t=u,p.cancel(),a(m)}};return e.appear&&p.enter(),p}var Fi=0;function ki(t,o,e,n){let i=t._motionEndId=++Fi,r=()=>{i===t._motionEndId&&n()};if(e!=null)return setTimeout(r,e);let{type:s,timeout:a,count:l}=Ai(t,o);if(!s){n();return}let p=s+"end",u=0,m=()=>{t.removeEventListener(p,S,!0),r()},S=D=>{D.target===t&&++u>=l&&m()};t.addEventListener(p,S,{capture:!0,once:!0}),setTimeout(()=>{u<l&&m()},a+1)}var Ni=["*"];function Oi(t,o){t&1&&ve(0)}var _t=new WeakMap;function We(t,o){if(t)switch(_t.has(t)||_t.set(t,{display:t.style.display,visibility:t.style.visibility,maxHeight:t.style.maxHeight,overflow:t.style.overflow}),o){case"display":t.style.display="none";break;case"visibility":t.style.visibility="hidden",t.style.maxHeight="0",t.style.overflow="hidden";break}}function Dt(t,o){if(!t)return;let e=_t.get(t)??t.style;switch(o){case"display":t.style.display=e?.display||"";break;case"visibility":t.style.visibility=e?.visibility||"",t.style.maxHeight=e?.maxHeight||"",t.style.overflow=e?.overflow||"";break}_t.delete(t)}var Pi=`
    .p-motion {
        display: block;
    }
`,Bi={root:"p-motion"},Kt=(()=>{class t extends ${name="motion";style=Pi;classes=Bi;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac})}return t})();var to=new k("MOTION_INSTANCE"),Li=(()=>{class t extends O{$pcMotion=f(to,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=f(V,{self:!0});onAfterViewChecked(){let n=this.options()?.root||{};this.bindDirectiveInstance.setAttrs(c(c({},this.ptms(["host","root"])),n))}_componentStyle=f(Kt);visible=d(!1);mountOnEnter=d(!0);unmountOnLeave=d(!0);name=d(void 0);type=d(void 0);safe=d(void 0);disabled=d(!1);appear=d(!1);enter=d(!0);leave=d(!0);duration=d(void 0);hideStrategy=d("display");enterFromClass=d(void 0);enterToClass=d(void 0);enterActiveClass=d(void 0);leaveFromClass=d(void 0);leaveToClass=d(void 0);leaveActiveClass=d(void 0);options=d({});onBeforeEnter=N();onEnter=N();onAfterEnter=N();onEnterCancelled=N();onBeforeLeave=N();onLeave=N();onAfterLeave=N();onLeaveCancelled=N();motionOptions=A(()=>{let e=this.options();return{name:e.name??this.name(),type:e.type??this.type(),safe:e.safe??this.safe(),disabled:e.disabled??this.disabled(),appear:!1,enter:e.enter??this.enter(),leave:e.leave??this.leave(),duration:e.duration??this.duration(),enterClass:{from:e.enterClass?.from??(e.name?void 0:this.enterFromClass()),to:e.enterClass?.to??(e.name?void 0:this.enterToClass()),active:e.enterClass?.active??(e.name?void 0:this.enterActiveClass())},leaveClass:{from:e.leaveClass?.from??(e.name?void 0:this.leaveFromClass()),to:e.leaveClass?.to??(e.name?void 0:this.leaveToClass()),active:e.leaveClass?.active??(e.name?void 0:this.leaveActiveClass())},onBeforeEnter:e.onBeforeEnter??this.handleBeforeEnter,onEnter:e.onEnter??this.handleEnter,onAfterEnter:e.onAfterEnter??this.handleAfterEnter,onEnterCancelled:e.onEnterCancelled??this.handleEnterCancelled,onBeforeLeave:e.onBeforeLeave??this.handleBeforeLeave,onLeave:e.onLeave??this.handleLeave,onAfterLeave:e.onAfterLeave??this.handleAfterLeave,onLeaveCancelled:e.onLeaveCancelled??this.handleLeaveCancelled}});motion;isInitialMount=!0;cancelled=!1;destroyed=!1;rendered=P(!1);handleBeforeEnter=e=>!this.destroyed&&this.onBeforeEnter.emit(e);handleEnter=e=>!this.destroyed&&this.onEnter.emit(e);handleAfterEnter=e=>!this.destroyed&&this.onAfterEnter.emit(e);handleEnterCancelled=e=>!this.destroyed&&this.onEnterCancelled.emit(e);handleBeforeLeave=e=>!this.destroyed&&this.onBeforeLeave.emit(e);handleLeave=e=>!this.destroyed&&this.onLeave.emit(e);handleAfterLeave=e=>!this.destroyed&&this.onAfterLeave.emit(e);handleLeaveCancelled=e=>!this.destroyed&&this.onLeaveCancelled.emit(e);constructor(){super(),G(()=>{let e=this.hideStrategy();this.isInitialMount?(We(this.$el,e),this.rendered.set(this.visible()&&this.mountOnEnter()||!this.mountOnEnter())):this.visible()&&!this.rendered()&&(We(this.$el,e),this.rendered.set(!0))}),G(()=>{this.motion||(this.motion=Xt(this.$el,this.motionOptions()))}),Rt(async()=>{if(!this.$el)return;let e=this.isInitialMount&&this.visible()&&this.appear(),n=this.hideStrategy();this.visible()?(await pt(),Dt(this.$el,n),(e||!this.isInitialMount)&&(this.applyMotionDuration("enter"),this.motion?.enter())):this.isInitialMount||(await pt(),this.applyMotionDuration("leave"),this.motion?.leave()?.then(async()=>{this.$el&&!this.cancelled&&!this.visible()&&(We(this.$el,n),this.unmountOnLeave()&&(await pt(),this.cancelled||this.rendered.set(!1)))})),this.isInitialMount=!1})}applyMotionDuration(e){let n=te(this.motionOptions),i=Ct(n.duration,e);if(i==null||!this.$el)return;let r=this.$el,s=`${i}ms`;n.type==="transition"?r.style.transitionDuration=s:r.style.animationDuration=s}onDestroy(){this.destroyed=!0,this.cancelled=!0,this.motion?.cancel(),this.motion=void 0,Dt(this.$el,this.hideStrategy()),this.$el?.remove(),this.isInitialMount=!0}static \u0275fac=function(n){return new(n||t)};static \u0275cmp=I({type:t,selectors:[["p-motion"]],hostVars:2,hostBindings:function(n,i){n&2&&w(i.cx("root"))},inputs:{visible:[1,"visible"],mountOnEnter:[1,"mountOnEnter"],unmountOnLeave:[1,"unmountOnLeave"],name:[1,"name"],type:[1,"type"],safe:[1,"safe"],disabled:[1,"disabled"],appear:[1,"appear"],enter:[1,"enter"],leave:[1,"leave"],duration:[1,"duration"],hideStrategy:[1,"hideStrategy"],enterFromClass:[1,"enterFromClass"],enterToClass:[1,"enterToClass"],enterActiveClass:[1,"enterActiveClass"],leaveFromClass:[1,"leaveFromClass"],leaveToClass:[1,"leaveToClass"],leaveActiveClass:[1,"leaveActiveClass"],options:[1,"options"]},outputs:{onBeforeEnter:"onBeforeEnter",onEnter:"onEnter",onAfterEnter:"onAfterEnter",onEnterCancelled:"onEnterCancelled",onBeforeLeave:"onBeforeLeave",onLeave:"onLeave",onAfterLeave:"onAfterLeave",onLeaveCancelled:"onLeaveCancelled"},features:[E([Kt,{provide:to,useExisting:t},{provide:J,useExisting:t}]),re([V]),h],ngContentSelectors:Ni,decls:1,vars:1,template:function(n,i){n&1&&(be(),fe(0,Oi,1,0)),n&2&&ge(i.rendered()?0:-1)},dependencies:[ne,vt],encapsulation:2})}return t})(),no=new k("MOTION_DIRECTIVE_INSTANCE"),oo=(()=>{class t extends O{$pcMotionDirective=f(no,{optional:!0,skipSelf:!0})??void 0;visible=d(!1,{alias:"pMotion"});name=d(void 0,{alias:"pMotionName"});type=d(void 0,{alias:"pMotionType"});safe=d(void 0,{alias:"pMotionSafe"});disabled=d(!1,{alias:"pMotionDisabled"});appear=d(!1,{alias:"pMotionAppear"});enter=d(!0,{alias:"pMotionEnter"});leave=d(!0,{alias:"pMotionLeave"});duration=d(void 0,{alias:"pMotionDuration"});hideStrategy=d("display",{alias:"pMotionHideStrategy"});enterFromClass=d(void 0,{alias:"pMotionEnterFromClass"});enterToClass=d(void 0,{alias:"pMotionEnterToClass"});enterActiveClass=d(void 0,{alias:"pMotionEnterActiveClass"});leaveFromClass=d(void 0,{alias:"pMotionLeaveFromClass"});leaveToClass=d(void 0,{alias:"pMotionLeaveToClass"});leaveActiveClass=d(void 0,{alias:"pMotionLeaveActiveClass"});options=d({},{alias:"pMotionOptions"});onBeforeEnter=N({alias:"pMotionOnBeforeEnter"});onEnter=N({alias:"pMotionOnEnter"});onAfterEnter=N({alias:"pMotionOnAfterEnter"});onEnterCancelled=N({alias:"pMotionOnEnterCancelled"});onBeforeLeave=N({alias:"pMotionOnBeforeLeave"});onLeave=N({alias:"pMotionOnLeave"});onAfterLeave=N({alias:"pMotionOnAfterLeave"});onLeaveCancelled=N({alias:"pMotionOnLeaveCancelled"});motionOptions=A(()=>{let e=this.options()??{};return{name:e.name??this.name(),type:e.type??this.type(),safe:e.safe??this.safe(),disabled:e.disabled??this.disabled(),appear:!1,enter:e.enter??this.enter(),leave:e.leave??this.leave(),duration:e.duration??this.duration(),enterClass:{from:e.enterClass?.from??(e.name?void 0:this.enterFromClass()),to:e.enterClass?.to??(e.name?void 0:this.enterToClass()),active:e.enterClass?.active??(e.name?void 0:this.enterActiveClass())},leaveClass:{from:e.leaveClass?.from??(e.name?void 0:this.leaveFromClass()),to:e.leaveClass?.to??(e.name?void 0:this.leaveToClass()),active:e.leaveClass?.active??(e.name?void 0:this.leaveActiveClass())},onBeforeEnter:e.onBeforeEnter??this.handleBeforeEnter,onEnter:e.onEnter??this.handleEnter,onAfterEnter:e.onAfterEnter??this.handleAfterEnter,onEnterCancelled:e.onEnterCancelled??this.handleEnterCancelled,onBeforeLeave:e.onBeforeLeave??this.handleBeforeLeave,onLeave:e.onLeave??this.handleLeave,onAfterLeave:e.onAfterLeave??this.handleAfterLeave,onLeaveCancelled:e.onLeaveCancelled??this.handleLeaveCancelled}});motion;isInitialMount=!0;cancelled=!1;destroyed=!1;handleBeforeEnter=e=>!this.destroyed&&this.onBeforeEnter.emit(e);handleEnter=e=>!this.destroyed&&this.onEnter.emit(e);handleAfterEnter=e=>!this.destroyed&&this.onAfterEnter.emit(e);handleEnterCancelled=e=>!this.destroyed&&this.onEnterCancelled.emit(e);handleBeforeLeave=e=>!this.destroyed&&this.onBeforeLeave.emit(e);handleLeave=e=>!this.destroyed&&this.onLeave.emit(e);handleAfterLeave=e=>!this.destroyed&&this.onAfterLeave.emit(e);handleLeaveCancelled=e=>!this.destroyed&&this.onLeaveCancelled.emit(e);constructor(){super(),G(()=>{this.motion||(this.motion=Xt(this.$el,this.motionOptions()))}),Rt(()=>{if(!this.$el)return;let e=this.isInitialMount&&this.visible()&&this.appear(),n=this.hideStrategy();this.visible()?(Dt(this.$el,n),(e||!this.isInitialMount)&&(this.applyMotionDuration("enter"),this.motion?.enter())):this.isInitialMount?We(this.$el,n):(this.applyMotionDuration("leave"),this.motion?.leave()?.then(()=>{this.$el&&!this.cancelled&&!this.visible()&&We(this.$el,n)})),this.isInitialMount=!1})}applyMotionDuration(e){let n=te(this.motionOptions),i=Ct(n.duration,e);if(i==null||!this.$el)return;let r=this.$el,s=`${i}ms`;n.type==="transition"?r.style.transitionDuration=s:r.style.animationDuration=s}onDestroy(){this.destroyed=!0,this.cancelled=!0,this.motion?.cancel(),this.motion=void 0,Dt(this.$el,this.hideStrategy()),this.$el?.remove(),this.isInitialMount=!0}static \u0275fac=function(n){return new(n||t)};static \u0275dir=_({type:t,selectors:[["","pMotion",""]],inputs:{visible:[1,"pMotion","visible"],name:[1,"pMotionName","name"],type:[1,"pMotionType","type"],safe:[1,"pMotionSafe","safe"],disabled:[1,"pMotionDisabled","disabled"],appear:[1,"pMotionAppear","appear"],enter:[1,"pMotionEnter","enter"],leave:[1,"pMotionLeave","leave"],duration:[1,"pMotionDuration","duration"],hideStrategy:[1,"pMotionHideStrategy","hideStrategy"],enterFromClass:[1,"pMotionEnterFromClass","enterFromClass"],enterToClass:[1,"pMotionEnterToClass","enterToClass"],enterActiveClass:[1,"pMotionEnterActiveClass","enterActiveClass"],leaveFromClass:[1,"pMotionLeaveFromClass","leaveFromClass"],leaveToClass:[1,"pMotionLeaveToClass","leaveToClass"],leaveActiveClass:[1,"pMotionLeaveActiveClass","leaveActiveClass"],options:[1,"pMotionOptions","options"]},outputs:{onBeforeEnter:"pMotionOnBeforeEnter",onEnter:"pMotionOnEnter",onAfterEnter:"pMotionOnAfterEnter",onEnterCancelled:"pMotionOnEnterCancelled",onBeforeLeave:"pMotionOnBeforeLeave",onLeave:"pMotionOnLeave",onAfterLeave:"pMotionOnAfterLeave",onLeaveCancelled:"pMotionOnLeaveCancelled"},features:[E([Kt,{provide:no,useExisting:t},{provide:J,useExisting:t}]),h]})}return t})(),io=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({imports:[Li]})}return t})();function Ri(){let t=[],o=(r,s)=>{let a=t.length>0?t[t.length-1]:{key:r,value:s},l=a.value+(a.key===r?0:s)+2;return t.push({key:r,value:l}),l},e=r=>{t=t.filter(s=>s.value!==r)},n=()=>t.length>0?t[t.length-1].value:0,i=r=>r&&parseInt(r.style.zIndex,10)||0;return{get:i,set:(r,s,a)=>{s&&(s.style.zIndex=String(o(r,a)))},clear:r=>{r&&(e(i(r)),r.style.zIndex="")},getCurrent:()=>n(),generateZIndex:o,revertZIndex:e}}var Mt=Ri();var ro=`
    .p-toast {
        width: dt('toast.width');
        white-space: pre-line;
        word-break: break-word;
    }

    .p-toast-message {
        margin: 0 0 1rem 0;
        display: grid;
        grid-template-rows: 1fr;
    }

    .p-toast-message-icon {
        flex-shrink: 0;
        font-size: dt('toast.icon.size');
        width: dt('toast.icon.size');
        height: dt('toast.icon.size');
    }

    .p-toast-message-content {
        display: flex;
        align-items: flex-start;
        padding: dt('toast.content.padding');
        gap: dt('toast.content.gap');
        min-height: 0;
        overflow: hidden;
        transition: padding 250ms ease-in;
    }

    .p-toast-message-text {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: dt('toast.text.gap');
    }

    .p-toast-summary {
        font-weight: dt('toast.summary.font.weight');
        font-size: dt('toast.summary.font.size');
    }

    .p-toast-detail {
        font-weight: dt('toast.detail.font.weight');
        font-size: dt('toast.detail.font.size');
    }

    .p-toast-close-button {
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        background: transparent;
        transition:
            background dt('toast.transition.duration'),
            color dt('toast.transition.duration'),
            outline-color dt('toast.transition.duration'),
            box-shadow dt('toast.transition.duration');
        outline-color: transparent;
        color: inherit;
        width: dt('toast.close.button.width');
        height: dt('toast.close.button.height');
        border-radius: dt('toast.close.button.border.radius');
        margin: -25% 0 0 0;
        right: -25%;
        padding: 0;
        border: none;
        user-select: none;
    }

    .p-toast-close-button:dir(rtl) {
        margin: -25% 0 0 auto;
        left: -25%;
        right: auto;
    }

    .p-toast-message-info,
    .p-toast-message-success,
    .p-toast-message-warn,
    .p-toast-message-error,
    .p-toast-message-secondary,
    .p-toast-message-contrast {
        border-width: dt('toast.border.width');
        border-style: solid;
        backdrop-filter: blur(dt('toast.blur'));
        border-radius: dt('toast.border.radius');
    }

    .p-toast-close-icon {
        font-size: dt('toast.close.icon.size');
        width: dt('toast.close.icon.size');
        height: dt('toast.close.icon.size');
    }

    .p-toast-close-button:focus-visible {
        outline-width: dt('focus.ring.width');
        outline-style: dt('focus.ring.style');
        outline-offset: dt('focus.ring.offset');
    }

    .p-toast-message-info {
        background: dt('toast.info.background');
        border-color: dt('toast.info.border.color');
        color: dt('toast.info.color');
        box-shadow: dt('toast.info.shadow');
    }

    .p-toast-message-info .p-toast-detail {
        color: dt('toast.info.detail.color');
    }

    .p-toast-message-info .p-toast-close-button:focus-visible {
        outline-color: dt('toast.info.close.button.focus.ring.color');
        box-shadow: dt('toast.info.close.button.focus.ring.shadow');
    }

    .p-toast-message-info .p-toast-close-button:hover {
        background: dt('toast.info.close.button.hover.background');
    }

    .p-toast-message-success {
        background: dt('toast.success.background');
        border-color: dt('toast.success.border.color');
        color: dt('toast.success.color');
        box-shadow: dt('toast.success.shadow');
    }

    .p-toast-message-success .p-toast-detail {
        color: dt('toast.success.detail.color');
    }

    .p-toast-message-success .p-toast-close-button:focus-visible {
        outline-color: dt('toast.success.close.button.focus.ring.color');
        box-shadow: dt('toast.success.close.button.focus.ring.shadow');
    }

    .p-toast-message-success .p-toast-close-button:hover {
        background: dt('toast.success.close.button.hover.background');
    }

    .p-toast-message-warn {
        background: dt('toast.warn.background');
        border-color: dt('toast.warn.border.color');
        color: dt('toast.warn.color');
        box-shadow: dt('toast.warn.shadow');
    }

    .p-toast-message-warn .p-toast-detail {
        color: dt('toast.warn.detail.color');
    }

    .p-toast-message-warn .p-toast-close-button:focus-visible {
        outline-color: dt('toast.warn.close.button.focus.ring.color');
        box-shadow: dt('toast.warn.close.button.focus.ring.shadow');
    }

    .p-toast-message-warn .p-toast-close-button:hover {
        background: dt('toast.warn.close.button.hover.background');
    }

    .p-toast-message-error {
        background: dt('toast.error.background');
        border-color: dt('toast.error.border.color');
        color: dt('toast.error.color');
        box-shadow: dt('toast.error.shadow');
    }

    .p-toast-message-error .p-toast-detail {
        color: dt('toast.error.detail.color');
    }

    .p-toast-message-error .p-toast-close-button:focus-visible {
        outline-color: dt('toast.error.close.button.focus.ring.color');
        box-shadow: dt('toast.error.close.button.focus.ring.shadow');
    }

    .p-toast-message-error .p-toast-close-button:hover {
        background: dt('toast.error.close.button.hover.background');
    }

    .p-toast-message-secondary {
        background: dt('toast.secondary.background');
        border-color: dt('toast.secondary.border.color');
        color: dt('toast.secondary.color');
        box-shadow: dt('toast.secondary.shadow');
    }

    .p-toast-message-secondary .p-toast-detail {
        color: dt('toast.secondary.detail.color');
    }

    .p-toast-message-secondary .p-toast-close-button:focus-visible {
        outline-color: dt('toast.secondary.close.button.focus.ring.color');
        box-shadow: dt('toast.secondary.close.button.focus.ring.shadow');
    }

    .p-toast-message-secondary .p-toast-close-button:hover {
        background: dt('toast.secondary.close.button.hover.background');
    }

    .p-toast-message-contrast {
        background: dt('toast.contrast.background');
        border-color: dt('toast.contrast.border.color');
        color: dt('toast.contrast.color');
        box-shadow: dt('toast.contrast.shadow');
    }
    
    .p-toast-message-contrast .p-toast-detail {
        color: dt('toast.contrast.detail.color');
    }

    .p-toast-message-contrast .p-toast-close-button:focus-visible {
        outline-color: dt('toast.contrast.close.button.focus.ring.color');
        box-shadow: dt('toast.contrast.close.button.focus.ring.shadow');
    }

    .p-toast-message-contrast .p-toast-close-button:hover {
        background: dt('toast.contrast.close.button.hover.background');
    }

    .p-toast-top-center {
        transform: translateX(-50%);
    }

    .p-toast-bottom-center {
        transform: translateX(-50%);
    }

    .p-toast-center {
        min-width: 20vw;
        transform: translate(-50%, -50%);
    }

    .p-toast-message-enter-active {
        animation: p-animate-toast-enter 300ms ease-out;
    }

    .p-toast-message-leave-active {
        animation: p-animate-toast-leave 250ms ease-in;
    }

    .p-toast-message-leave-to .p-toast-message-content {
        padding-top: 0;
        padding-bottom: 0;
    }

    @keyframes p-animate-toast-enter {
        from {
            opacity: 0;
            transform: scale(0.6);
        }
        to {
            opacity: 1;
            grid-template-rows: 1fr;
        }
    }

     @keyframes p-animate-toast-leave {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
            margin-bottom: 0;
            grid-template-rows: 0fr;
            transform: translateY(-100%) scale(0.6);
        }
    }
`;var ji=(t,o)=>({$implicit:t,closeFn:o}),zi=t=>({$implicit:t});function Ui(t,o){t&1&&He(0)}function Gi(t,o){if(t&1&&Y(0,Ui,1,0,"ng-container",3),t&2){let e=C();b("ngTemplateOutlet",e.headlessTemplate)("ngTemplateOutletContext",je(2,ji,e.message,e.onCloseIconClick))}}function Wi(t,o){if(t&1&&W(0,"span",4),t&2){let e=C(3);w(e.cn(e.cx("messageIcon"),e.message==null?null:e.message.icon)),b("pBind",e.ptm("messageIcon"))}}function qi(t,o){if(t&1&&(T(),W(0,"svg",11)),t&2){let e=C(4);w(e.cx("messageIcon")),b("pBind",e.ptm("messageIcon")),M("aria-hidden",!0)}}function Zi(t,o){if(t&1&&(T(),W(0,"svg",12)),t&2){let e=C(4);w(e.cx("messageIcon")),b("pBind",e.ptm("messageIcon")),M("aria-hidden",!0)}}function Qi(t,o){if(t&1&&(T(),W(0,"svg",13)),t&2){let e=C(4);w(e.cx("messageIcon")),b("pBind",e.ptm("messageIcon")),M("aria-hidden",!0)}}function Yi(t,o){if(t&1&&(T(),W(0,"svg",14)),t&2){let e=C(4);w(e.cx("messageIcon")),b("pBind",e.ptm("messageIcon")),M("aria-hidden",!0)}}function Xi(t,o){if(t&1&&(T(),W(0,"svg",12)),t&2){let e=C(4);w(e.cx("messageIcon")),b("pBind",e.ptm("messageIcon")),M("aria-hidden",!0)}}function Ki(t,o){if(t&1&&fe(0,qi,1,4,":svg:svg",7)(1,Zi,1,4,":svg:svg",8)(2,Qi,1,4,":svg:svg",9)(3,Yi,1,4,":svg:svg",10)(4,Xi,1,4,":svg:svg",8),t&2){let e,n=C(3);ge((e=n.message.severity)==="success"?0:e==="info"?1:e==="error"?2:e==="warn"?3:4)}}function Ji(t,o){if(t&1&&(Fe(0),fe(1,Wi,1,3,"span",2)(2,Ki,5,1),se(3,"div",6)(4,"div",6),Me(5),ae(),se(6,"div",6),Me(7),ae()(),ke()),t&2){let e=C(2);v(),ge(e.message.icon?1:2),v(2),b("pBind",e.ptm("messageText"))("ngClass",e.cx("messageText")),M("data-p",e.dataP),v(),b("pBind",e.ptm("summary"))("ngClass",e.cx("summary")),M("data-p",e.dataP),v(),Cn(" ",e.message.summary," "),v(),b("pBind",e.ptm("detail"))("ngClass",e.cx("detail")),M("data-p",e.dataP),v(),Ne(e.message.detail)}}function er(t,o){t&1&&He(0)}function tr(t,o){if(t&1&&W(0,"span",4),t&2){let e=C(4);w(e.cn(e.cx("closeIcon"),e.message==null?null:e.message.closeIcon)),b("pBind",e.ptm("closeIcon"))}}function nr(t,o){if(t&1&&Y(0,tr,1,3,"span",17),t&2){let e=C(3);b("ngIf",e.message.closeIcon)}}function or(t,o){if(t&1&&(T(),W(0,"svg",18)),t&2){let e=C(3);w(e.cx("closeIcon")),b("pBind",e.ptm("closeIcon")),M("aria-hidden",!0)}}function ir(t,o){if(t&1){let e=$t();se(0,"div")(1,"button",15),le("click",function(i){Ae(e);let r=C(2);return Ve(r.onCloseIconClick(i))})("keydown.enter",function(i){Ae(e);let r=C(2);return Ve(r.onCloseIconClick(i))}),fe(2,nr,1,1,"span",2)(3,or,1,4,":svg:svg",16),ae()()}if(t&2){let e=C(2);v(),b("pBind",e.ptm("closeButton")),M("class",e.cx("closeButton"))("aria-label",e.closeAriaLabel)("data-p",e.dataP),v(),ge(e.message.closeIcon?2:3)}}function rr(t,o){if(t&1&&(se(0,"div",4),Y(1,Ji,8,12,"ng-container",5)(2,er,1,0,"ng-container",3),fe(3,ir,4,5,"div"),ae()),t&2){let e=C();w(e.cn(e.cx("messageContent"),e.message==null?null:e.message.contentStyleClass)),b("pBind",e.ptm("messageContent")),v(),b("ngIf",!e.template),v(),b("ngTemplateOutlet",e.template)("ngTemplateOutletContext",_n(7,zi,e.message)),v(),ge((e.message==null?null:e.message.closable)!==!1?3:-1)}}var sr=["message"],ar=["headless"];function lr(t,o){if(t&1){let e=$t();se(0,"p-toastItem",1),le("onClose",function(i){Ae(e);let r=C();return Ve(r.onMessageClose(i))})("onAnimationEnd",function(){Ae(e);let i=C();return Ve(i.onAnimationEnd())})("onAnimationStart",function(){Ae(e);let i=C();return Ve(i.onAnimationStart())}),ae()}if(t&2){let e=o.$implicit,n=o.index,i=C();b("message",e)("index",n)("life",i.life)("clearAll",i.clearAllTrigger())("template",i.template||i._template)("headlessTemplate",i.headlessTemplate||i._headlessTemplate)("pt",i.pt)("unstyled",i.unstyled())("motionOptions",i.computedMotionOptions())}}var dr={root:({instance:t})=>{let{_position:o}=t;return{position:"fixed",top:o==="top-right"||o==="top-left"||o==="top-center"?"20px":o==="center"?"50%":null,right:(o==="top-right"||o==="bottom-right")&&"20px",bottom:(o==="bottom-left"||o==="bottom-right"||o==="bottom-center")&&"20px",left:o==="top-left"||o==="bottom-left"?"20px":o==="center"||o==="top-center"||o==="bottom-center"?"50%":null}}},ur={root:({instance:t})=>["p-toast p-component",`p-toast-${t._position}`],message:({instance:t})=>({"p-toast-message":!0,"p-toast-message-info":t.message.severity==="info"||t.message.severity===void 0,"p-toast-message-warn":t.message.severity==="warn","p-toast-message-error":t.message.severity==="error","p-toast-message-success":t.message.severity==="success","p-toast-message-secondary":t.message.severity==="secondary","p-toast-message-contrast":t.message.severity==="contrast"}),messageContent:"p-toast-message-content",messageIcon:({instance:t})=>({"p-toast-message-icon":!0,[`pi ${t.message.icon}`]:!!t.message.icon}),messageText:"p-toast-message-text",summary:"p-toast-summary",detail:"p-toast-detail",closeButton:"p-toast-close-button",closeIcon:({instance:t})=>({"p-toast-close-icon":!0,[`pi ${t.message.closeIcon}`]:!!t.message.closeIcon})},wt=(()=>{class t extends ${name="toast";style=ro;classes=ur;inlineStyles=dr;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac})}return t})();var so=new k("TOAST_INSTANCE"),cr=(()=>{class t extends O{zone;message;index;life;template;headlessTemplate;showTransformOptions;hideTransformOptions;showTransitionOptions;hideTransitionOptions;motionOptions=d();clearAll=d(null);onAnimationStart=N();onAnimationEnd=N();onBeforeEnter(e){this.onAnimationStart.emit(e.element)}onAfterLeave(e){!this.visible()&&!this.isDestroyed&&(this.onClose.emit({index:this.index,message:this.message}),this.isDestroyed||this.onAnimationEnd.emit(e.element))}onClose=new q;_componentStyle=f(wt);timeout;visible=P(void 0);isDestroyed=!1;isClosing=!1;constructor(e){super(),this.zone=e,G(()=>{this.clearAll()&&this.visible.set(!1)})}onAfterViewInit(){this.message?.sticky&&this.visible.set(!0),this.initTimeout()}initTimeout(){this.message?.sticky||(this.clearTimeout(),this.zone.runOutsideAngular(()=>{this.visible.set(!0),this.timeout=setTimeout(()=>{this.visible.set(!1)},this.message?.life||this.life||3e3)}))}clearTimeout(){this.timeout&&(clearTimeout(this.timeout),this.timeout=null)}onMouseEnter(){this.clearTimeout()}onMouseLeave(){this.isClosing||this.initTimeout()}onCloseIconClick=e=>{this.isClosing=!0,this.clearTimeout(),this.visible.set(!1),e.preventDefault()};get closeAriaLabel(){return this.config.translation.aria?this.config.translation.aria.close:void 0}onDestroy(){this.isDestroyed=!0,this.clearTimeout(),this.visible.set(!1)}get dataP(){return this.cn({[this.message?.severity]:this.message?.severity})}static \u0275fac=function(n){return new(n||t)(y(it))};static \u0275cmp=I({type:t,selectors:[["p-toastItem"]],inputs:{message:"message",index:[2,"index","index",we],life:[2,"life","life",we],template:"template",headlessTemplate:"headlessTemplate",showTransformOptions:"showTransformOptions",hideTransformOptions:"hideTransformOptions",showTransitionOptions:"showTransitionOptions",hideTransitionOptions:"hideTransitionOptions",motionOptions:[1,"motionOptions"],clearAll:[1,"clearAll"]},outputs:{onAnimationStart:"onAnimationStart",onAnimationEnd:"onAnimationEnd",onClose:"onClose"},features:[E([wt]),h],decls:4,vars:10,consts:[["container",""],["role","alert","aria-live","assertive","aria-atomic","true",3,"pMotionOnBeforeEnter","pMotionOnAfterLeave","mouseenter","mouseleave","pMotion","pMotionAppear","pMotionName","pMotionOptions","pBind"],[3,"pBind","class"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],[3,"pBind"],[4,"ngIf"],[3,"pBind","ngClass"],["data-p-icon","check",3,"pBind","class"],["data-p-icon","info-circle",3,"pBind","class"],["data-p-icon","times-circle",3,"pBind","class"],["data-p-icon","exclamation-triangle",3,"pBind","class"],["data-p-icon","check",3,"pBind"],["data-p-icon","info-circle",3,"pBind"],["data-p-icon","times-circle",3,"pBind"],["data-p-icon","exclamation-triangle",3,"pBind"],["type","button","autofocus","",3,"click","keydown.enter","pBind"],["data-p-icon","times",3,"pBind","class"],[3,"pBind","class",4,"ngIf"],["data-p-icon","times",3,"pBind"]],template:function(n,i){n&1&&(se(0,"div",1,0),le("pMotionOnBeforeEnter",function(s){return i.onBeforeEnter(s)})("pMotionOnAfterLeave",function(s){return i.onAfterLeave(s)})("mouseenter",function(){return i.onMouseEnter()})("mouseleave",function(){return i.onMouseLeave()}),fe(2,Gi,1,5,"ng-container")(3,rr,4,9,"div",2),ae()),n&2&&(w(i.cn(i.cx("message"),i.message==null?null:i.message.styleClass)),b("pMotion",i.visible())("pMotionAppear",!0)("pMotionName","p-toast-message")("pMotionOptions",i.motionOptions())("pBind",i.ptm("message")),M("id",i.message==null?null:i.message.id)("data-p",i.dataP),v(2),ge(i.headlessTemplate?2:3))},dependencies:[ne,Dn,ut,ct,Wn,qn,Zn,Yn,Xn,oe,V,io,oo],encapsulation:2,changeDetection:0})}return t})(),pr=(()=>{class t extends O{componentName="Toast";$pcToast=f(so,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=f(V,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}key;autoZIndex=!0;baseZIndex=0;life=3e3;styleClass;get position(){return this._position}set position(e){this._position=e,this.cd.markForCheck()}preventOpenDuplicates=!1;preventDuplicates=!1;showTransformOptions="translateY(100%)";hideTransformOptions="translateY(-100%)";showTransitionOptions="300ms ease-out";hideTransitionOptions="250ms ease-in";motionOptions=d(void 0);computedMotionOptions=A(()=>c(c({},this.ptm("motion")),this.motionOptions()));breakpoints;onClose=new q;template;headlessTemplate;messageSubscription;clearSubscription;messages;messagesArchieve;_position="top-right";messageService=f(Ln);_componentStyle=f(wt);styleElement;id=Z("pn_id_");templates;clearAllTrigger=P(null);constructor(){super()}onInit(){this.messageSubscription=this.messageService.messageObserver.subscribe(e=>{if(e)if(Array.isArray(e)){let n=e.filter(i=>this.canAdd(i));this.add(n)}else this.canAdd(e)&&this.add([e])}),this.clearSubscription=this.messageService.clearObserver.subscribe(e=>{e?this.key===e&&this.clearAll():this.clearAll(),this.cd.markForCheck()})}clearAll(){this.clearAllTrigger.set({})}_template;_headlessTemplate;onAfterContentInit(){this.templates?.forEach(e=>{switch(e.getType()){case"message":this._template=e.template;break;case"headless":this._headlessTemplate=e.template;break;default:this._template=e.template;break}})}onAfterViewInit(){this.breakpoints&&this.createStyle()}add(e){this.messages=this.messages?[...this.messages,...e]:[...e],this.preventDuplicates&&(this.messagesArchieve=this.messagesArchieve?[...this.messagesArchieve,...e]:[...e]),this.cd.markForCheck()}canAdd(e){let n=this.key===e.key;return n&&this.preventOpenDuplicates&&(n=!this.containsMessage(this.messages,e)),n&&this.preventDuplicates&&(n=!this.containsMessage(this.messagesArchieve,e)),n}containsMessage(e,n){return e?e.find(i=>i.summary===n.summary&&i.detail==n.detail&&i.severity===n.severity)!=null:!1}onMessageClose(e){this.messages?.splice(e.index,1),this.onClose.emit({message:e.message}),this.onAnimationEnd(),this.cd.detectChanges()}onAnimationStart(){this.renderer.setAttribute(this.el?.nativeElement,this.id,""),this.autoZIndex&&this.el?.nativeElement.style.zIndex===""&&Mt.set("modal",this.el?.nativeElement,this.baseZIndex||this.config.zIndex.modal)}onAnimationEnd(){this.autoZIndex&&ht(this.messages)&&Mt.clear(this.el?.nativeElement)}createStyle(){if(!this.styleElement){this.styleElement=this.renderer.createElement("style"),this.styleElement.type="text/css",Gt(this.styleElement,"nonce",this.config?.csp()?.nonce),this.renderer.appendChild(this.document.head,this.styleElement);let e="";for(let n in this.breakpoints){let i="";for(let r in this.breakpoints[n])i+=r+":"+this.breakpoints[n][r]+" !important;";e+=`
                    @media screen and (max-width: ${n}) {
                        .p-toast[${this.id}] {
                           ${i}
                        }
                    }
                `}this.renderer.setProperty(this.styleElement,"innerHTML",e),Gt(this.styleElement,"nonce",this.config?.csp()?.nonce)}}destroyStyle(){this.styleElement&&(this.renderer.removeChild(this.document.head,this.styleElement),this.styleElement=null)}onDestroy(){this.messageSubscription&&this.messageSubscription.unsubscribe(),this.el&&this.autoZIndex&&Mt.clear(this.el.nativeElement),this.clearSubscription&&this.clearSubscription.unsubscribe(),this.destroyStyle()}get dataP(){return this.cn({[this.position]:this.position})}static \u0275fac=function(n){return new(n||t)};static \u0275cmp=I({type:t,selectors:[["p-toast"]],contentQueries:function(n,i,r){if(n&1&&st(r,sr,5)(r,ar,5)(r,mt,4),n&2){let s;ue(s=ce())&&(i.template=s.first),ue(s=ce())&&(i.headlessTemplate=s.first),ue(s=ce())&&(i.templates=s)}},hostVars:5,hostBindings:function(n,i){n&2&&(M("data-p",i.dataP),lt(i.sx("root")),w(i.cn(i.cx("root"),i.styleClass)))},inputs:{key:"key",autoZIndex:[2,"autoZIndex","autoZIndex",x],baseZIndex:[2,"baseZIndex","baseZIndex",we],life:[2,"life","life",we],styleClass:"styleClass",position:"position",preventOpenDuplicates:[2,"preventOpenDuplicates","preventOpenDuplicates",x],preventDuplicates:[2,"preventDuplicates","preventDuplicates",x],showTransformOptions:"showTransformOptions",hideTransformOptions:"hideTransformOptions",showTransitionOptions:"showTransitionOptions",hideTransitionOptions:"hideTransitionOptions",motionOptions:[1,"motionOptions"],breakpoints:"breakpoints"},outputs:{onClose:"onClose"},features:[E([wt,{provide:so,useExisting:t},{provide:J,useExisting:t}]),re([V]),h],decls:1,vars:1,consts:[[3,"message","index","life","clearAll","template","headlessTemplate","pt","unstyled","motionOptions","onClose","onAnimationEnd","onAnimationStart",4,"ngFor","ngForOf"],[3,"onClose","onAnimationEnd","onAnimationStart","message","index","life","clearAll","template","headlessTemplate","pt","unstyled","motionOptions"]],template:function(n,i){n&1&&Y(0,lr,1,9,"p-toastItem",0),n&2&&b("ngForOf",i.messages)},dependencies:[ne,Mn,cr,oe],encapsulation:2,changeDetection:0})}return t})(),Za=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({imports:[pr,oe,oe]})}return t})();var bo=(()=>{class t{_renderer;_elementRef;onChange=e=>{};onTouched=()=>{};constructor(e,n){this._renderer=e,this._elementRef=n}setProperty(e,n){this._renderer.setProperty(this._elementRef.nativeElement,e,n)}registerOnTouched(e){this.onTouched=e}registerOnChange(e){this.onChange=e}setDisabledState(e){this.setProperty("disabled",e)}static \u0275fac=function(n){return new(n||t)(y(De),y(de))};static \u0275dir=_({type:t})}return t})(),vo=(()=>{class t extends bo{static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,features:[h]})}return t})(),kt=new k("");var hr={provide:kt,useExisting:he(()=>yo),multi:!0};function fr(){let t=Ht()?Ht().getUserAgent():"";return/android (\d+)/.test(t.toLowerCase())}var gr=new k(""),yo=(()=>{class t extends bo{_compositionMode;_composing=!1;constructor(e,n,i){super(e,n),this._compositionMode=i,this._compositionMode==null&&(this._compositionMode=!fr())}writeValue(e){let n=e??"";this.setProperty("value",n)}_handleInput(e){(!this._compositionMode||this._compositionMode&&!this._composing)&&this.onChange(e)}_compositionStart(){this._composing=!0}_compositionEnd(e){this._composing=!1,this._compositionMode&&this.onChange(e)}static \u0275fac=function(n){return new(n||t)(y(De),y(de),y(gr,8))};static \u0275dir=_({type:t,selectors:[["input","formControlName","",3,"type","checkbox"],["textarea","formControlName",""],["input","formControl","",3,"type","checkbox"],["textarea","formControl",""],["input","ngModel","",3,"type","checkbox"],["textarea","ngModel",""],["","ngDefaultControl",""]],hostBindings:function(n,i){n&1&&le("input",function(s){return i._handleInput(s.target.value)})("blur",function(){return i.onTouched()})("compositionstart",function(){return i._compositionStart()})("compositionend",function(s){return i._compositionEnd(s.target.value)})},standalone:!1,features:[E([hr]),h]})}return t})();function rn(t){return t==null||sn(t)===0}function sn(t){return t==null?null:Array.isArray(t)||typeof t=="string"?t.length:t instanceof Set?t.size:null}var Je=new k(""),et=new k(""),mr=/^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,ao=class{static min(o){return br(o)}static max(o){return vr(o)}static required(o){return yr(o)}static requiredTrue(o){return Cr(o)}static email(o){return _r(o)}static minLength(o){return Dr(o)}static maxLength(o){return Mr(o)}static pattern(o){return wr(o)}static nullValidator(o){return Co()}static compose(o){return Io(o)}static composeAsync(o){return So(o)}};function br(t){return o=>{if(o.value==null||t==null)return null;let e=parseFloat(o.value);return!isNaN(e)&&e<t?{min:{min:t,actual:o.value}}:null}}function vr(t){return o=>{if(o.value==null||t==null)return null;let e=parseFloat(o.value);return!isNaN(e)&&e>t?{max:{max:t,actual:o.value}}:null}}function yr(t){return rn(t.value)?{required:!0}:null}function Cr(t){return t.value===!0?null:{required:!0}}function _r(t){return rn(t.value)||mr.test(t.value)?null:{email:!0}}function Dr(t){return o=>{let e=o.value?.length??sn(o.value);return e===null||e===0?null:e<t?{minlength:{requiredLength:t,actualLength:e}}:null}}function Mr(t){return o=>{let e=o.value?.length??sn(o.value);return e!==null&&e>t?{maxlength:{requiredLength:t,actualLength:e}}:null}}function wr(t){if(!t)return Co;let o,e;return typeof t=="string"?(e="",t.charAt(0)!=="^"&&(e+="^"),e+=t,t.charAt(t.length-1)!=="$"&&(e+="$"),o=new RegExp(e)):(e=t.toString(),o=t),n=>{if(rn(n.value))return null;let i=n.value;return o.test(i)?null:{pattern:{requiredPattern:e,actualValue:i}}}}function Co(t){return null}function _o(t){return t!=null}function Do(t){return vn(t)?gn(t):t}function Mo(t){let o={};return t.forEach(e=>{o=e!=null?c(c({},o),e):o}),Object.keys(o).length===0?null:o}function wo(t,o){return o.map(e=>e(t))}function Er(t){return!t.validate}function Eo(t){return t.map(o=>Er(o)?o:e=>o.validate(e))}function Io(t){if(!t)return null;let o=t.filter(_o);return o.length==0?null:function(e){return Mo(wo(e,o))}}function xo(t){return t!=null?Io(Eo(t)):null}function So(t){if(!t)return null;let o=t.filter(_o);return o.length==0?null:function(e){let n=wo(e,o).map(Do);return bn(n).pipe(mn(Mo))}}function Ao(t){return t!=null?So(Eo(t)):null}function lo(t,o){return t===null?[o]:Array.isArray(t)?[...t,o]:[t,o]}function Vo(t){return t._rawValidators}function To(t){return t._rawAsyncValidators}function Jt(t){return t?Array.isArray(t)?t:[t]:[]}function It(t,o){return Array.isArray(t)?t.includes(o):t===o}function uo(t,o){let e=Jt(o);return Jt(t).forEach(i=>{It(e,i)||e.push(i)}),e}function co(t,o){return Jt(o).filter(e=>!It(t,e))}var xt=class{get value(){return this.control?this.control.value:null}get valid(){return this.control?this.control.valid:null}get invalid(){return this.control?this.control.invalid:null}get pending(){return this.control?this.control.pending:null}get disabled(){return this.control?this.control.disabled:null}get enabled(){return this.control?this.control.enabled:null}get errors(){return this.control?this.control.errors:null}get pristine(){return this.control?this.control.pristine:null}get dirty(){return this.control?this.control.dirty:null}get touched(){return this.control?this.control.touched:null}get status(){return this.control?this.control.status:null}get untouched(){return this.control?this.control.untouched:null}get statusChanges(){return this.control?this.control.statusChanges:null}get valueChanges(){return this.control?this.control.valueChanges:null}get path(){return null}_composedValidatorFn;_composedAsyncValidatorFn;_rawValidators=[];_rawAsyncValidators=[];_setValidators(o){this._rawValidators=o||[],this._composedValidatorFn=xo(this._rawValidators)}_setAsyncValidators(o){this._rawAsyncValidators=o||[],this._composedAsyncValidatorFn=Ao(this._rawAsyncValidators)}get validator(){return this._composedValidatorFn||null}get asyncValidator(){return this._composedAsyncValidatorFn||null}_onDestroyCallbacks=[];_registerOnDestroy(o){this._onDestroyCallbacks.push(o)}_invokeOnDestroyCallbacks(){this._onDestroyCallbacks.forEach(o=>o()),this._onDestroyCallbacks=[]}reset(o=void 0){this.control?.reset(o)}hasError(o,e){return this.control?this.control.hasError(o,e):!1}getError(o,e){return this.control?this.control.getError(o,e):null}},Q=class extends xt{name;get formDirective(){return null}get path(){return null}},Se=class extends xt{_parent=null;name=null;valueAccessor=null},St=class{_cd;constructor(o){this._cd=o}get isTouched(){return this._cd?.control?._touched?.(),!!this._cd?.control?.touched}get isUntouched(){return!!this._cd?.control?.untouched}get isPristine(){return this._cd?.control?._pristine?.(),!!this._cd?.control?.pristine}get isDirty(){return!!this._cd?.control?.dirty}get isValid(){return this._cd?.control?._status?.(),!!this._cd?.control?.valid}get isInvalid(){return!!this._cd?.control?.invalid}get isPending(){return!!this._cd?.control?.pending}get isSubmitted(){return this._cd?._submitted?.(),!!this._cd?.submitted}};var bl=(()=>{class t extends St{constructor(e){super(e)}static \u0275fac=function(n){return new(n||t)(y(Se,2))};static \u0275dir=_({type:t,selectors:[["","formControlName",""],["","ngModel",""],["","formControl",""]],hostVars:14,hostBindings:function(n,i){n&2&&at("ng-untouched",i.isUntouched)("ng-touched",i.isTouched)("ng-pristine",i.isPristine)("ng-dirty",i.isDirty)("ng-valid",i.isValid)("ng-invalid",i.isInvalid)("ng-pending",i.isPending)},standalone:!1,features:[h]})}return t})(),vl=(()=>{class t extends St{constructor(e){super(e)}static \u0275fac=function(n){return new(n||t)(y(Q,10))};static \u0275dir=_({type:t,selectors:[["","formGroupName",""],["","formArrayName",""],["","ngModelGroup",""],["","formGroup",""],["","formArray",""],["form",3,"ngNoForm",""],["","ngForm",""]],hostVars:16,hostBindings:function(n,i){n&2&&at("ng-untouched",i.isUntouched)("ng-touched",i.isTouched)("ng-pristine",i.isPristine)("ng-dirty",i.isDirty)("ng-valid",i.isValid)("ng-invalid",i.isInvalid)("ng-pending",i.isPending)("ng-submitted",i.isSubmitted)},standalone:!1,features:[h]})}return t})();var qe="VALID",Et="INVALID",Be="PENDING",Ze="DISABLED",Ce=class{},At=class extends Ce{value;source;constructor(o,e){super(),this.value=o,this.source=e}},Qe=class extends Ce{pristine;source;constructor(o,e){super(),this.pristine=o,this.source=e}},Ye=class extends Ce{touched;source;constructor(o,e){super(),this.touched=o,this.source=e}},Le=class extends Ce{status;source;constructor(o,e){super(),this.status=o,this.source=e}},en=class extends Ce{source;constructor(o){super(),this.source=o}},Ke=class extends Ce{source;constructor(o){super(),this.source=o}};function an(t){return(Nt(t)?t.validators:t)||null}function Ir(t){return Array.isArray(t)?xo(t):t||null}function ln(t,o){return(Nt(o)?o.asyncValidators:t)||null}function xr(t){return Array.isArray(t)?Ao(t):t||null}function Nt(t){return t!=null&&!Array.isArray(t)&&typeof t=="object"}function Fo(t,o,e){let n=t.controls;if(!(o?Object.keys(n):n).length)throw new nt(1e3,"");if(!n[e])throw new nt(1001,"")}function ko(t,o,e){t._forEachChild((n,i)=>{if(e[i]===void 0)throw new nt(-1002,"")})}var $e=class{_pendingDirty=!1;_hasOwnPendingAsyncValidator=null;_pendingTouched=!1;_onCollectionChange=()=>{};_updateOn;_parent=null;_asyncValidationSubscription;_composedValidatorFn;_composedAsyncValidatorFn;_rawValidators;_rawAsyncValidators;value;constructor(o,e){this._assignValidators(o),this._assignAsyncValidators(e)}get validator(){return this._composedValidatorFn}set validator(o){this._rawValidators=this._composedValidatorFn=o}get asyncValidator(){return this._composedAsyncValidatorFn}set asyncValidator(o){this._rawAsyncValidators=this._composedAsyncValidatorFn=o}get parent(){return this._parent}get status(){return te(this.statusReactive)}set status(o){te(()=>this.statusReactive.set(o))}_status=A(()=>this.statusReactive());statusReactive=P(void 0);get valid(){return this.status===qe}get invalid(){return this.status===Et}get pending(){return this.status===Be}get disabled(){return this.status===Ze}get enabled(){return this.status!==Ze}errors;get pristine(){return te(this.pristineReactive)}set pristine(o){te(()=>this.pristineReactive.set(o))}_pristine=A(()=>this.pristineReactive());pristineReactive=P(!0);get dirty(){return!this.pristine}get touched(){return te(this.touchedReactive)}set touched(o){te(()=>this.touchedReactive.set(o))}_touched=A(()=>this.touchedReactive());touchedReactive=P(!1);get untouched(){return!this.touched}_events=new fn;events=this._events.asObservable();valueChanges;statusChanges;get updateOn(){return this._updateOn?this._updateOn:this.parent?this.parent.updateOn:"change"}setValidators(o){this._assignValidators(o)}setAsyncValidators(o){this._assignAsyncValidators(o)}addValidators(o){this.setValidators(uo(o,this._rawValidators))}addAsyncValidators(o){this.setAsyncValidators(uo(o,this._rawAsyncValidators))}removeValidators(o){this.setValidators(co(o,this._rawValidators))}removeAsyncValidators(o){this.setAsyncValidators(co(o,this._rawAsyncValidators))}hasValidator(o){return It(this._rawValidators,o)}hasAsyncValidator(o){return It(this._rawAsyncValidators,o)}clearValidators(){this.validator=null}clearAsyncValidators(){this.asyncValidator=null}markAsTouched(o={}){let e=this.touched===!1;this.touched=!0;let n=o.sourceControl??this;o.onlySelf||this._parent?.markAsTouched(H(c({},o),{sourceControl:n})),e&&o.emitEvent!==!1&&this._events.next(new Ye(!0,n))}markAllAsDirty(o={}){this.markAsDirty({onlySelf:!0,emitEvent:o.emitEvent,sourceControl:this}),this._forEachChild(e=>e.markAllAsDirty(o))}markAllAsTouched(o={}){this.markAsTouched({onlySelf:!0,emitEvent:o.emitEvent,sourceControl:this}),this._forEachChild(e=>e.markAllAsTouched(o))}markAsUntouched(o={}){let e=this.touched===!0;this.touched=!1,this._pendingTouched=!1;let n=o.sourceControl??this;this._forEachChild(i=>{i.markAsUntouched({onlySelf:!0,emitEvent:o.emitEvent,sourceControl:n})}),o.onlySelf||this._parent?._updateTouched(o,n),e&&o.emitEvent!==!1&&this._events.next(new Ye(!1,n))}markAsDirty(o={}){let e=this.pristine===!0;this.pristine=!1;let n=o.sourceControl??this;o.onlySelf||this._parent?.markAsDirty(H(c({},o),{sourceControl:n})),e&&o.emitEvent!==!1&&this._events.next(new Qe(!1,n))}markAsPristine(o={}){let e=this.pristine===!1;this.pristine=!0,this._pendingDirty=!1;let n=o.sourceControl??this;this._forEachChild(i=>{i.markAsPristine({onlySelf:!0,emitEvent:o.emitEvent})}),o.onlySelf||this._parent?._updatePristine(o,n),e&&o.emitEvent!==!1&&this._events.next(new Qe(!0,n))}markAsPending(o={}){this.status=Be;let e=o.sourceControl??this;o.emitEvent!==!1&&(this._events.next(new Le(this.status,e)),this.statusChanges.emit(this.status)),o.onlySelf||this._parent?.markAsPending(H(c({},o),{sourceControl:e}))}disable(o={}){let e=this._parentMarkedDirty(o.onlySelf);this.status=Ze,this.errors=null,this._forEachChild(i=>{i.disable(H(c({},o),{onlySelf:!0}))}),this._updateValue();let n=o.sourceControl??this;o.emitEvent!==!1&&(this._events.next(new At(this.value,n)),this._events.next(new Le(this.status,n)),this.valueChanges.emit(this.value),this.statusChanges.emit(this.status)),this._updateAncestors(H(c({},o),{skipPristineCheck:e}),this),this._onDisabledChange.forEach(i=>i(!0))}enable(o={}){let e=this._parentMarkedDirty(o.onlySelf);this.status=qe,this._forEachChild(n=>{n.enable(H(c({},o),{onlySelf:!0}))}),this.updateValueAndValidity({onlySelf:!0,emitEvent:o.emitEvent}),this._updateAncestors(H(c({},o),{skipPristineCheck:e}),this),this._onDisabledChange.forEach(n=>n(!1))}_updateAncestors(o,e){o.onlySelf||(this._parent?.updateValueAndValidity(o),o.skipPristineCheck||this._parent?._updatePristine({},e),this._parent?._updateTouched({},e))}setParent(o){this._parent=o}getRawValue(){return this.value}updateValueAndValidity(o={}){if(this._setInitialStatus(),this._updateValue(),this.enabled){let n=this._cancelExistingSubscription();this.errors=this._runValidator(),this.status=this._calculateStatus(),(this.status===qe||this.status===Be)&&this._runAsyncValidator(n,o.emitEvent)}let e=o.sourceControl??this;o.emitEvent!==!1&&(this._events.next(new At(this.value,e)),this._events.next(new Le(this.status,e)),this.valueChanges.emit(this.value),this.statusChanges.emit(this.status)),o.onlySelf||this._parent?.updateValueAndValidity(H(c({},o),{sourceControl:e}))}_updateTreeValidity(o={emitEvent:!0}){this._forEachChild(e=>e._updateTreeValidity(o)),this.updateValueAndValidity({onlySelf:!0,emitEvent:o.emitEvent})}_setInitialStatus(){this.status=this._allControlsDisabled()?Ze:qe}_runValidator(){return this.validator?this.validator(this):null}_runAsyncValidator(o,e){if(this.asyncValidator){this.status=Be,this._hasOwnPendingAsyncValidator={emitEvent:e!==!1,shouldHaveEmitted:o!==!1};let n=Do(this.asyncValidator(this));this._asyncValidationSubscription=n.subscribe(i=>{this._hasOwnPendingAsyncValidator=null,this.setErrors(i,{emitEvent:e,shouldHaveEmitted:o})})}}_cancelExistingSubscription(){if(this._asyncValidationSubscription){this._asyncValidationSubscription.unsubscribe();let o=(this._hasOwnPendingAsyncValidator?.emitEvent||this._hasOwnPendingAsyncValidator?.shouldHaveEmitted)??!1;return this._hasOwnPendingAsyncValidator=null,o}return!1}setErrors(o,e={}){this.errors=o,this._updateControlsErrors(e.emitEvent!==!1,this,e.shouldHaveEmitted)}get(o){let e=o;return e==null||(Array.isArray(e)||(e=e.split(".")),e.length===0)?null:e.reduce((n,i)=>n&&n._find(i),this)}getError(o,e){let n=e?this.get(e):this;return n?.errors?n.errors[o]:null}hasError(o,e){return!!this.getError(o,e)}get root(){let o=this;for(;o._parent;)o=o._parent;return o}_updateControlsErrors(o,e,n){this.status=this._calculateStatus(),o&&this.statusChanges.emit(this.status),(o||n)&&this._events.next(new Le(this.status,e)),this._parent&&this._parent._updateControlsErrors(o,e,n)}_initObservables(){this.valueChanges=new q,this.statusChanges=new q}_calculateStatus(){return this._allControlsDisabled()?Ze:this.errors?Et:this._hasOwnPendingAsyncValidator||this._anyControlsHaveStatus(Be)?Be:this._anyControlsHaveStatus(Et)?Et:qe}_anyControlsHaveStatus(o){return this._anyControls(e=>e.status===o)}_anyControlsDirty(){return this._anyControls(o=>o.dirty)}_anyControlsTouched(){return this._anyControls(o=>o.touched)}_updatePristine(o,e){let n=!this._anyControlsDirty(),i=this.pristine!==n;this.pristine=n,o.onlySelf||this._parent?._updatePristine(o,e),i&&this._events.next(new Qe(this.pristine,e))}_updateTouched(o={},e){this.touched=this._anyControlsTouched(),this._events.next(new Ye(this.touched,e)),o.onlySelf||this._parent?._updateTouched(o,e)}_onDisabledChange=[];_registerOnCollectionChange(o){this._onCollectionChange=o}_setUpdateStrategy(o){Nt(o)&&o.updateOn!=null&&(this._updateOn=o.updateOn)}_parentMarkedDirty(o){return!o&&!!this._parent?.dirty&&!this._parent._anyControlsDirty()}_find(o){return null}_assignValidators(o){this._rawValidators=Array.isArray(o)?o.slice():o,this._composedValidatorFn=Ir(this._rawValidators)}_assignAsyncValidators(o){this._rawAsyncValidators=Array.isArray(o)?o.slice():o,this._composedAsyncValidatorFn=xr(this._rawAsyncValidators)}},Vt=class extends $e{constructor(o,e,n){super(an(e),ln(n,e)),this.controls=o,this._initObservables(),this._setUpdateStrategy(e),this._setUpControls(),this.updateValueAndValidity({onlySelf:!0,emitEvent:!!this.asyncValidator})}controls;registerControl(o,e){return this.controls[o]?this.controls[o]:(this.controls[o]=e,e.setParent(this),e._registerOnCollectionChange(this._onCollectionChange),e)}addControl(o,e,n={}){this.registerControl(o,e),this.updateValueAndValidity({emitEvent:n.emitEvent}),this._onCollectionChange()}removeControl(o,e={}){this.controls[o]&&this.controls[o]._registerOnCollectionChange(()=>{}),delete this.controls[o],this.updateValueAndValidity({emitEvent:e.emitEvent}),this._onCollectionChange()}setControl(o,e,n={}){this.controls[o]&&this.controls[o]._registerOnCollectionChange(()=>{}),delete this.controls[o],e&&this.registerControl(o,e),this.updateValueAndValidity({emitEvent:n.emitEvent}),this._onCollectionChange()}contains(o){return this.controls.hasOwnProperty(o)&&this.controls[o].enabled}setValue(o,e={}){ko(this,!0,o),Object.keys(o).forEach(n=>{Fo(this,!0,n),this.controls[n].setValue(o[n],{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e)}patchValue(o,e={}){o!=null&&(Object.keys(o).forEach(n=>{let i=this.controls[n];i&&i.patchValue(o[n],{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e))}reset(o={},e={}){this._forEachChild((n,i)=>{n.reset(o?o[i]:null,H(c({},e),{onlySelf:!0}))}),this._updatePristine(e,this),this._updateTouched(e,this),this.updateValueAndValidity(e),e?.emitEvent!==!1&&this._events.next(new Ke(this))}getRawValue(){return this._reduceChildren({},(o,e,n)=>(o[n]=e.getRawValue(),o))}_syncPendingControls(){let o=this._reduceChildren(!1,(e,n)=>n._syncPendingControls()?!0:e);return o&&this.updateValueAndValidity({onlySelf:!0}),o}_forEachChild(o){Object.keys(this.controls).forEach(e=>{let n=this.controls[e];n&&o(n,e)})}_setUpControls(){this._forEachChild(o=>{o.setParent(this),o._registerOnCollectionChange(this._onCollectionChange)})}_updateValue(){this.value=this._reduceValue()}_anyControls(o){for(let[e,n]of Object.entries(this.controls))if(this.contains(e)&&o(n))return!0;return!1}_reduceValue(){let o={};return this._reduceChildren(o,(e,n,i)=>((n.enabled||this.disabled)&&(e[i]=n.value),e))}_reduceChildren(o,e){let n=o;return this._forEachChild((i,r)=>{n=e(n,i,r)}),n}_allControlsDisabled(){for(let o of Object.keys(this.controls))if(this.controls[o].enabled)return!1;return Object.keys(this.controls).length>0||this.disabled}_find(o){return this.controls.hasOwnProperty(o)?this.controls[o]:null}};var tn=class extends Vt{};var Ot=new k("",{factory:()=>Pt}),Pt="always";function Bt(t,o){return[...o.path,t]}function nn(t,o,e=Pt){dn(t,o),o.valueAccessor.writeValue(t.value),(t.disabled||e==="always")&&o.valueAccessor.setDisabledState?.(t.disabled),Ar(t,o),Tr(t,o),Vr(t,o),Sr(t,o)}function po(t,o,e=!0){let n=()=>{};o?.valueAccessor?.registerOnChange(n),o?.valueAccessor?.registerOnTouched(n),Ft(t,o),t&&(o._invokeOnDestroyCallbacks(),t._registerOnCollectionChange(()=>{}))}function Tt(t,o){t.forEach(e=>{e.registerOnValidatorChange&&e.registerOnValidatorChange(o)})}function Sr(t,o){if(o.valueAccessor.setDisabledState){let e=n=>{o.valueAccessor.setDisabledState(n)};t.registerOnDisabledChange(e),o._registerOnDestroy(()=>{t._unregisterOnDisabledChange(e)})}}function dn(t,o){let e=Vo(t);o.validator!==null?t.setValidators(lo(e,o.validator)):typeof e=="function"&&t.setValidators([e]);let n=To(t);o.asyncValidator!==null?t.setAsyncValidators(lo(n,o.asyncValidator)):typeof n=="function"&&t.setAsyncValidators([n]);let i=()=>t.updateValueAndValidity();Tt(o._rawValidators,i),Tt(o._rawAsyncValidators,i)}function Ft(t,o){let e=!1;if(t!==null){if(o.validator!==null){let i=Vo(t);if(Array.isArray(i)&&i.length>0){let r=i.filter(s=>s!==o.validator);r.length!==i.length&&(e=!0,t.setValidators(r))}}if(o.asyncValidator!==null){let i=To(t);if(Array.isArray(i)&&i.length>0){let r=i.filter(s=>s!==o.asyncValidator);r.length!==i.length&&(e=!0,t.setAsyncValidators(r))}}}let n=()=>{};return Tt(o._rawValidators,n),Tt(o._rawAsyncValidators,n),e}function Ar(t,o){o.valueAccessor.registerOnChange(e=>{t._pendingValue=e,t._pendingChange=!0,t._pendingDirty=!0,t.updateOn==="change"&&No(t,o)})}function Vr(t,o){o.valueAccessor.registerOnTouched(()=>{t._pendingTouched=!0,t.updateOn==="blur"&&t._pendingChange&&No(t,o),t.updateOn!=="submit"&&t.markAsTouched()})}function No(t,o){t._pendingDirty&&t.markAsDirty(),t.setValue(t._pendingValue,{emitModelToViewChange:!1}),o.viewToModelUpdate(t._pendingValue),t._pendingChange=!1}function Tr(t,o){let e=(n,i)=>{o.valueAccessor.writeValue(n),i&&o.viewToModelUpdate(n)};t.registerOnChange(e),o._registerOnDestroy(()=>{t._unregisterOnChange(e)})}function Fr(t,o){t==null,dn(t,o)}function kr(t,o){return Ft(t,o)}function Oo(t,o){if(!t.hasOwnProperty("model"))return!1;let e=t.model;return e.isFirstChange()?!0:!Object.is(o,e.currentValue)}function Nr(t){return Object.getPrototypeOf(t.constructor)===vo}function Or(t,o){t._syncPendingControls(),o.forEach(e=>{let n=e.control;n.updateOn==="submit"&&n._pendingChange&&(e.viewToModelUpdate(n._pendingValue),n._pendingChange=!1)})}function Po(t,o){if(!o)return null;Array.isArray(o);let e,n,i;return o.forEach(r=>{r.constructor===yo?e=r:Nr(r)?n=r:i=r}),i||n||e||null}function Pr(t,o){let e=t.indexOf(o);e>-1&&t.splice(e,1)}function ho(t,o){let e=t.indexOf(o);e>-1&&t.splice(e,1)}function fo(t){return typeof t=="object"&&t!==null&&Object.keys(t).length===2&&"value"in t&&"disabled"in t}var Xe=class extends $e{defaultValue=null;_onChange=[];_pendingValue;_pendingChange=!1;constructor(o=null,e,n){super(an(e),ln(n,e)),this._applyFormState(o),this._setUpdateStrategy(e),this._initObservables(),this.updateValueAndValidity({onlySelf:!0,emitEvent:!!this.asyncValidator}),Nt(e)&&(e.nonNullable||e.initialValueIsDefault)&&(fo(o)?this.defaultValue=o.value:this.defaultValue=o)}setValue(o,e={}){this.value=this._pendingValue=o,this._onChange.length&&e.emitModelToViewChange!==!1&&this._onChange.forEach(n=>n(this.value,e.emitViewToModelChange!==!1)),this.updateValueAndValidity(e)}patchValue(o,e={}){this.setValue(o,e)}reset(o=this.defaultValue,e={}){this._applyFormState(o),this.markAsPristine(e),this.markAsUntouched(e),this.setValue(this.value,e),e.overwriteDefaultValue&&(this.defaultValue=this.value),this._pendingChange=!1,e?.emitEvent!==!1&&this._events.next(new Ke(this))}_updateValue(){}_anyControls(o){return!1}_allControlsDisabled(){return this.disabled}registerOnChange(o){this._onChange.push(o)}_unregisterOnChange(o){ho(this._onChange,o)}registerOnDisabledChange(o){this._onDisabledChange.push(o)}_unregisterOnDisabledChange(o){ho(this._onDisabledChange,o)}_forEachChild(o){}_syncPendingControls(){return this.updateOn==="submit"&&(this._pendingDirty&&this.markAsDirty(),this._pendingTouched&&this.markAsTouched(),this._pendingChange)?(this.setValue(this._pendingValue,{onlySelf:!0,emitModelToViewChange:!1}),!0):!1}_applyFormState(o){fo(o)?(this.value=this._pendingValue=o.value,o.disabled?this.disable({onlySelf:!0,emitEvent:!1}):this.enable({onlySelf:!0,emitEvent:!1})):this.value=this._pendingValue=o}};var Br=t=>t instanceof Xe,Lr=(()=>{class t extends Q{_parent;ngOnInit(){this._checkParentType(),this.formDirective.addFormGroup(this)}ngOnDestroy(){this.formDirective?.removeFormGroup(this)}get control(){return this.formDirective.getFormGroup(this)}get path(){return Bt(this.name==null?this.name:this.name.toString(),this._parent)}get formDirective(){return this._parent?this._parent.formDirective:null}_checkParentType(){}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,standalone:!1,features:[h]})}return t})();var $r={provide:Se,useExisting:he(()=>Rr)},go=Promise.resolve(),Rr=(()=>{class t extends Se{_changeDetectorRef;callSetDisabledState;control=new Xe;static ngAcceptInputType_isDisabled;_registered=!1;viewModel;name="";isDisabled;model;options;update=new q;constructor(e,n,i,r,s,a){super(),this._changeDetectorRef=s,this.callSetDisabledState=a,this._parent=e,this._setValidators(n),this._setAsyncValidators(i),this.valueAccessor=Po(this,r)}ngOnChanges(e){if(this._checkForErrors(),!this._registered||"name"in e){if(this._registered&&(this._checkName(),this.formDirective)){let n=e.name.previousValue;this.formDirective.removeControl({name:n,path:this._getPath(n)})}this._setUpControl()}"isDisabled"in e&&this._updateDisabled(e),Oo(e,this.viewModel)&&(this._updateValue(this.model),this.viewModel=this.model)}ngOnDestroy(){this.formDirective?.removeControl(this)}get path(){return this._getPath(this.name)}get formDirective(){return this._parent?this._parent.formDirective:null}viewToModelUpdate(e){this.viewModel=e,this.update.emit(e)}_setUpControl(){this._setUpdateStrategy(),this._isStandalone()?this._setUpStandalone():this.formDirective.addControl(this),this._registered=!0}_setUpdateStrategy(){this.options&&this.options.updateOn!=null&&(this.control._updateOn=this.options.updateOn)}_isStandalone(){return!this._parent||!!(this.options&&this.options.standalone)}_setUpStandalone(){nn(this.control,this,this.callSetDisabledState),this.control.updateValueAndValidity({emitEvent:!1})}_checkForErrors(){this._checkName()}_checkName(){this.options&&this.options.name&&(this.name=this.options.name),!this._isStandalone()&&this.name}_updateValue(e){go.then(()=>{this.control.setValue(e,{emitViewToModelChange:!1}),this._changeDetectorRef?.markForCheck()})}_updateDisabled(e){let n=e.isDisabled.currentValue,i=n!==0&&x(n);go.then(()=>{i&&!this.control.disabled?this.control.disable():!i&&this.control.disabled&&this.control.enable(),this._changeDetectorRef?.markForCheck()})}_getPath(e){return this._parent?Bt(e,this._parent):[e]}static \u0275fac=function(n){return new(n||t)(y(Q,9),y(Je,10),y(et,10),y(kt,10),y(dt,8),y(Ot,8))};static \u0275dir=_({type:t,selectors:[["","ngModel","",3,"formControlName","",3,"formControl",""]],inputs:{name:"name",isDisabled:[0,"disabled","isDisabled"],model:[0,"ngModel","model"],options:[0,"ngModelOptions","options"]},outputs:{update:"ngModelChange"},exportAs:["ngModel"],standalone:!1,features:[E([$r]),h,Te]})}return t})();var Cl=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275dir=_({type:t,selectors:[["form",3,"ngNoForm","",3,"ngNativeValidate",""]],hostAttrs:["novalidate",""],standalone:!1})}return t})(),Hr={provide:kt,useExisting:he(()=>jr),multi:!0},jr=(()=>{class t extends vo{writeValue(e){let n=e??"";this.setProperty("value",n)}registerOnChange(e){this.onChange=n=>{e(n==""?null:parseFloat(n))}}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,selectors:[["input","type","number","formControlName",""],["input","type","number","formControl",""],["input","type","number","ngModel",""]],hostBindings:function(n,i){n&1&&le("input",function(s){return i.onChange(s.target.value)})("blur",function(){return i.onTouched()})},standalone:!1,features:[E([Hr]),h]})}return t})();var on=class extends $e{constructor(o,e,n){super(an(e),ln(n,e)),this.controls=o,this._initObservables(),this._setUpdateStrategy(e),this._setUpControls(),this.updateValueAndValidity({onlySelf:!0,emitEvent:!!this.asyncValidator})}controls;at(o){return this.controls[this._adjustIndex(o)]}push(o,e={}){Array.isArray(o)?o.forEach(n=>{this.controls.push(n),this._registerControl(n)}):(this.controls.push(o),this._registerControl(o)),this.updateValueAndValidity({emitEvent:e.emitEvent}),this._onCollectionChange()}insert(o,e,n={}){this.controls.splice(o,0,e),this._registerControl(e),this.updateValueAndValidity({emitEvent:n.emitEvent})}removeAt(o,e={}){let n=this._adjustIndex(o);n<0&&(n=0),this.controls[n]&&this.controls[n]._registerOnCollectionChange(()=>{}),this.controls.splice(n,1),this.updateValueAndValidity({emitEvent:e.emitEvent})}setControl(o,e,n={}){let i=this._adjustIndex(o);i<0&&(i=0),this.controls[i]&&this.controls[i]._registerOnCollectionChange(()=>{}),this.controls.splice(i,1),e&&(this.controls.splice(i,0,e),this._registerControl(e)),this.updateValueAndValidity({emitEvent:n.emitEvent}),this._onCollectionChange()}get length(){return this.controls.length}setValue(o,e={}){ko(this,!1,o),o.forEach((n,i)=>{Fo(this,!1,i),this.at(i).setValue(n,{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e)}patchValue(o,e={}){o!=null&&(o.forEach((n,i)=>{this.at(i)&&this.at(i).patchValue(n,{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e))}reset(o=[],e={}){this._forEachChild((n,i)=>{n.reset(o[i],H(c({},e),{onlySelf:!0}))}),this._updatePristine(e,this),this._updateTouched(e,this),this.updateValueAndValidity(e),e?.emitEvent!==!1&&this._events.next(new Ke(this))}getRawValue(){return this.controls.map(o=>o.getRawValue())}clear(o={}){this.controls.length<1||(this._forEachChild(e=>e._registerOnCollectionChange(()=>{})),this.controls.splice(0),this.updateValueAndValidity({emitEvent:o.emitEvent}))}_adjustIndex(o){return o<0?o+this.length:o}_syncPendingControls(){let o=this.controls.reduce((e,n)=>n._syncPendingControls()?!0:e,!1);return o&&this.updateValueAndValidity({onlySelf:!0}),o}_forEachChild(o){this.controls.forEach((e,n)=>{o(e,n)})}_updateValue(){this.value=this.controls.filter(o=>o.enabled||this.disabled).map(o=>o.value)}_anyControls(o){return this.controls.some(e=>e.enabled&&o(e))}_setUpControls(){this._forEachChild(o=>this._registerControl(o))}_allControlsDisabled(){for(let o of this.controls)if(o.enabled)return!1;return this.controls.length>0||this.disabled}_registerControl(o){o.setParent(this),o._registerOnCollectionChange(this._onCollectionChange)}_find(o){return this.at(o)??null}};var Bo=(()=>{class t extends Q{callSetDisabledState;get submitted(){return te(this._submittedReactive)}set submitted(e){this._submittedReactive.set(e)}_submitted=A(()=>this._submittedReactive());_submittedReactive=P(!1);_oldForm;_onCollectionChange=()=>this._updateDomValue();directives=[];constructor(e,n,i){super(),this.callSetDisabledState=i,this._setValidators(e),this._setAsyncValidators(n)}ngOnChanges(e){this.onChanges(e)}ngOnDestroy(){this.onDestroy()}onChanges(e){this._checkFormPresent(),e.hasOwnProperty("form")&&(this._updateValidators(),this._updateDomValue(),this._updateRegistrations(),this._oldForm=this.form)}onDestroy(){this.form&&(Ft(this.form,this),this.form._onCollectionChange===this._onCollectionChange&&this.form._registerOnCollectionChange(()=>{}))}get formDirective(){return this}get path(){return[]}addControl(e){let n=this.form.get(e.path);return nn(n,e,this.callSetDisabledState),n.updateValueAndValidity({emitEvent:!1}),this.directives.push(e),n}getControl(e){return this.form.get(e.path)}removeControl(e){po(e.control||null,e,!1),Pr(this.directives,e)}addFormGroup(e){this._setUpFormContainer(e)}removeFormGroup(e){this._cleanUpFormContainer(e)}getFormGroup(e){return this.form.get(e.path)}getFormArray(e){return this.form.get(e.path)}addFormArray(e){this._setUpFormContainer(e)}removeFormArray(e){this._cleanUpFormContainer(e)}updateModel(e,n){this.form.get(e.path).setValue(n)}onReset(){this.resetForm()}resetForm(e=void 0,n={}){this.form.reset(e,n),this._submittedReactive.set(!1)}onSubmit(e){return this.submitted=!0,Or(this.form,this.directives),this.ngSubmit.emit(e),this.form._events.next(new en(this.control)),e?.target?.method==="dialog"}_updateDomValue(){this.directives.forEach(e=>{let n=e.control,i=this.form.get(e.path);n!==i&&(po(n||null,e),Br(i)&&(nn(i,e,this.callSetDisabledState),e.control=i))}),this.form._updateTreeValidity({emitEvent:!1})}_setUpFormContainer(e){let n=this.form.get(e.path);Fr(n,e),n.updateValueAndValidity({emitEvent:!1})}_cleanUpFormContainer(e){let n=this.form?.get(e.path);n&&kr(n,e)&&n.updateValueAndValidity({emitEvent:!1})}_updateRegistrations(){this.form._registerOnCollectionChange(this._onCollectionChange),this._oldForm?._registerOnCollectionChange(()=>{})}_updateValidators(){dn(this.form,this),this._oldForm&&Ft(this._oldForm,this)}_checkFormPresent(){this.form}static \u0275fac=function(n){return new(n||t)(y(Je,10),y(et,10),y(Ot,8))};static \u0275dir=_({type:t,features:[h,Te]})}return t})();var Lo=new k("");var zr={provide:Q,useExisting:he(()=>$o)},$o=(()=>{class t extends Lr{name=null;constructor(e,n,i){super(),this._parent=e,this._setValidators(n),this._setAsyncValidators(i)}_checkParentType(){Ho(this._parent)}static \u0275fac=function(n){return new(n||t)(y(Q,13),y(Je,10),y(et,10))};static \u0275dir=_({type:t,selectors:[["","formGroupName",""]],inputs:{name:[0,"formGroupName","name"]},standalone:!1,features:[E([zr]),h]})}return t})(),Ur={provide:Q,useExisting:he(()=>Ro)},Ro=(()=>{class t extends Q{_parent;name=null;constructor(e,n,i){super(),this._parent=e,this._setValidators(n),this._setAsyncValidators(i)}ngOnInit(){Ho(this._parent),this.formDirective.addFormArray(this)}ngOnDestroy(){this.formDirective?.removeFormArray(this)}get control(){return this.formDirective.getFormArray(this)}get formDirective(){return this._parent?this._parent.formDirective:null}get path(){return Bt(this.name==null?this.name:this.name.toString(),this._parent)}static \u0275fac=function(n){return new(n||t)(y(Q,13),y(Je,10),y(et,10))};static \u0275dir=_({type:t,selectors:[["","formArrayName",""]],inputs:{name:[0,"formArrayName","name"]},standalone:!1,features:[E([Ur]),h]})}return t})();function Ho(t){return!(t instanceof $o)&&!(t instanceof Bo)&&!(t instanceof Ro)}var Gr={provide:Se,useExisting:he(()=>Wr)},Wr=(()=>{class t extends Se{_ngModelWarningConfig;_added=!1;viewModel;control;name=null;set isDisabled(e){}model;update=new q;static _ngModelWarningSentOnce=!1;_ngModelWarningSent=!1;constructor(e,n,i,r,s){super(),this._ngModelWarningConfig=s,this._parent=e,this._setValidators(n),this._setAsyncValidators(i),this.valueAccessor=Po(this,r)}ngOnChanges(e){this._added||this._setUpControl(),Oo(e,this.viewModel)&&(this.viewModel=this.model,this.formDirective.updateModel(this,this.model))}ngOnDestroy(){this.formDirective?.removeControl(this)}viewToModelUpdate(e){this.viewModel=e,this.update.emit(e)}get path(){return Bt(this.name==null?this.name:this.name.toString(),this._parent)}get formDirective(){return this._parent?this._parent.formDirective:null}_setUpControl(){this.control=this.formDirective.addControl(this),this._added=!0}static \u0275fac=function(n){return new(n||t)(y(Q,13),y(Je,10),y(et,10),y(kt,10),y(Lo,8))};static \u0275dir=_({type:t,selectors:[["","formControlName",""]],inputs:{name:[0,"formControlName","name"],isDisabled:[0,"disabled","isDisabled"],model:[0,"ngModel","model"]},outputs:{update:"ngModelChange"},standalone:!1,features:[E([Gr]),h,Te]})}return t})();var qr={provide:Q,useExisting:he(()=>Zr)},Zr=(()=>{class t extends Bo{form=null;ngSubmit=new q;get control(){return this.form}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,selectors:[["","formGroup",""]],hostBindings:function(n,i){n&1&&le("submit",function(s){return i.onSubmit(s)})("reset",function(){return i.onReset()})},inputs:{form:[0,"formGroup","form"]},outputs:{ngSubmit:"ngSubmit"},exportAs:["ngForm"],standalone:!1,features:[E([qr]),h]})}return t})();var jo=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({})}return t})();function mo(t){return!!t&&(t.asyncValidators!==void 0||t.validators!==void 0||t.updateOn!==void 0)}var _l=(()=>{class t{useNonNullable=!1;get nonNullable(){let e=new t;return e.useNonNullable=!0,e}group(e,n=null){let i=this._reduceControls(e),r={};return mo(n)?r=n:n!==null&&(r.validators=n.validator,r.asyncValidators=n.asyncValidator),new Vt(i,r)}record(e,n=null){let i=this._reduceControls(e);return new tn(i,n)}control(e,n,i){let r={};return this.useNonNullable?(mo(n)?r=n:(r.validators=n,r.asyncValidators=i),new Xe(e,H(c({},r),{nonNullable:!0}))):new Xe(e,n,i)}array(e,n,i){let r=e.map(s=>this._createControl(s));return new on(r,n,i)}_reduceControls(e){let n={};return Object.keys(e).forEach(i=>{n[i]=this._createControl(e[i])}),n}_createControl(e){if(e instanceof Xe)return e;if(e instanceof $e)return e;if(Array.isArray(e)){let n=e[0],i=e.length>1?e[1]:null,r=e.length>2?e[2]:null;return this.control(n,i,r)}else return this.control(e)}static \u0275fac=function(n){return new(n||t)};static \u0275prov=L({token:t,factory:t.\u0275fac,providedIn:"root"})}return t})();var Dl=(()=>{class t{static withConfig(e){return{ngModule:t,providers:[{provide:Ot,useValue:e.callSetDisabledState??Pt}]}}static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({imports:[jo]})}return t})(),Ml=(()=>{class t{static withConfig(e){return{ngModule:t,providers:[{provide:Lo,useValue:e.warnOnNgModelWithFormControl??"always"},{provide:Ot,useValue:e.callSetDisabledState??Pt}]}}static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({imports:[jo]})}return t})();var un=(()=>{class t{static zindex=1e3;static calculatedScrollbarWidth=null;static calculatedScrollbarHeight=null;static browser;static addClass(e,n){e&&n&&(e.classList?e.classList.add(n):e.className+=" "+n)}static addMultipleClasses(e,n){if(e&&n)if(e.classList){let i=n.trim().split(" ");for(let r=0;r<i.length;r++)e.classList.add(i[r])}else{let i=n.split(" ");for(let r=0;r<i.length;r++)e.className+=" "+i[r]}}static removeClass(e,n){e&&n&&(e.classList?e.classList.remove(n):e.className=e.className.replace(new RegExp("(^|\\b)"+n.split(" ").join("|")+"(\\b|$)","gi")," "))}static removeMultipleClasses(e,n){e&&n&&[n].flat().filter(Boolean).forEach(i=>i.split(" ").forEach(r=>this.removeClass(e,r)))}static hasClass(e,n){return e&&n?e.classList?e.classList.contains(n):new RegExp("(^| )"+n+"( |$)","gi").test(e.className):!1}static siblings(e){return Array.prototype.filter.call(e.parentNode.children,function(n){return n!==e})}static find(e,n){return Array.from(e.querySelectorAll(n))}static findSingle(e,n){return this.isElement(e)?e.querySelector(n):null}static index(e){let n=e.parentNode.childNodes,i=0;for(var r=0;r<n.length;r++){if(n[r]==e)return i;n[r].nodeType==1&&i++}return-1}static indexWithinGroup(e,n){let i=e.parentNode?e.parentNode.childNodes:[],r=0;for(var s=0;s<i.length;s++){if(i[s]==e)return r;i[s].attributes&&i[s].attributes[n]&&i[s].nodeType==1&&r++}return-1}static appendOverlay(e,n,i="self"){i!=="self"&&e&&n&&this.appendChild(e,n)}static alignOverlay(e,n,i="self",r=!0){e&&n&&(r&&(e.style.minWidth=`${t.getOuterWidth(n)}px`),i==="self"?this.relativePosition(e,n):this.absolutePosition(e,n))}static relativePosition(e,n,i=!0){let r=ie=>{if(ie)return getComputedStyle(ie).getPropertyValue("position")==="relative"?ie:r(ie.parentElement)},s=e.offsetParent?{width:e.offsetWidth,height:e.offsetHeight}:this.getHiddenElementDimensions(e),a=n.offsetHeight,l=n.getBoundingClientRect(),p=this.getWindowScrollTop(),u=this.getWindowScrollLeft(),m=this.getViewport(),D=r(e)?.getBoundingClientRect()||{top:-1*p,left:-1*u},F,B,_e="top";l.top+a+s.height>m.height?(F=l.top-D.top-s.height,_e="bottom",l.top+F<0&&(F=-1*l.top)):(F=a+l.top-D.top,_e="top");let Re=l.left+s.width-m.width,tt=l.left-D.left;if(s.width>m.width?B=(l.left-D.left)*-1:Re>0?B=tt-Re:B=l.left-D.left,e.style.top=F+"px",e.style.left=B+"px",e.style.transformOrigin=_e,i){let ie=xn(/-anchor-gutter$/)?.value;e.style.marginTop=_e==="bottom"?`calc(${ie??"2px"} * -1)`:ie??""}}static absolutePosition(e,n,i=!0){let r=e.offsetParent?{width:e.offsetWidth,height:e.offsetHeight}:this.getHiddenElementDimensions(e),s=r.height,a=r.width,l=n.offsetHeight,p=n.offsetWidth,u=n.getBoundingClientRect(),m=this.getWindowScrollTop(),S=this.getWindowScrollLeft(),D=this.getViewport(),F,B;u.top+l+s>D.height?(F=u.top+m-s,e.style.transformOrigin="bottom",F<0&&(F=m)):(F=l+u.top+m,e.style.transformOrigin="top"),u.left+a>D.width?B=Math.max(0,u.left+S+p-a):B=u.left+S,e.style.top=F+"px",e.style.left=B+"px",i&&(e.style.marginTop=origin==="bottom"?"calc(var(--p-anchor-gutter) * -1)":"calc(var(--p-anchor-gutter))")}static getParents(e,n=[]){return e.parentNode===null?n:this.getParents(e.parentNode,n.concat([e.parentNode]))}static getScrollableParents(e){let n=[];if(e){let i=this.getParents(e),r=/(auto|scroll)/,s=a=>{let l=window.getComputedStyle(a,null);return r.test(l.getPropertyValue("overflow"))||r.test(l.getPropertyValue("overflowX"))||r.test(l.getPropertyValue("overflowY"))};for(let a of i){let l=a.nodeType===1&&a.dataset.scrollselectors;if(l){let p=l.split(",");for(let u of p){let m=this.findSingle(a,u);m&&s(m)&&n.push(m)}}a.nodeType!==9&&s(a)&&n.push(a)}}return n}static getHiddenElementOuterHeight(e){e.style.visibility="hidden",e.style.display="block";let n=e.offsetHeight;return e.style.display="none",e.style.visibility="visible",n}static getHiddenElementOuterWidth(e){e.style.visibility="hidden",e.style.display="block";let n=e.offsetWidth;return e.style.display="none",e.style.visibility="visible",n}static getHiddenElementDimensions(e){let n={};return e.style.visibility="hidden",e.style.display="block",n.width=e.offsetWidth,n.height=e.offsetHeight,e.style.display="none",e.style.visibility="visible",n}static scrollInView(e,n){let i=getComputedStyle(e).getPropertyValue("borderTopWidth"),r=i?parseFloat(i):0,s=getComputedStyle(e).getPropertyValue("paddingTop"),a=s?parseFloat(s):0,l=e.getBoundingClientRect(),u=n.getBoundingClientRect().top+document.body.scrollTop-(l.top+document.body.scrollTop)-r-a,m=e.scrollTop,S=e.clientHeight,D=this.getOuterHeight(n);u<0?e.scrollTop=m+u:u+D>S&&(e.scrollTop=m+u-S+D)}static fadeIn(e,n){e.style.opacity=0;let i=+new Date,r=0,s=function(){r=+e.style.opacity.replace(",",".")+(new Date().getTime()-i)/n,e.style.opacity=r,i=+new Date,+r<1&&(window.requestAnimationFrame?window.requestAnimationFrame(s):setTimeout(s,16))};s()}static fadeOut(e,n){var i=1,r=50,s=n,a=r/s;let l=setInterval(()=>{i=i-a,i<=0&&(i=0,clearInterval(l)),e.style.opacity=i},r)}static getWindowScrollTop(){let e=document.documentElement;return(window.pageYOffset||e.scrollTop)-(e.clientTop||0)}static getWindowScrollLeft(){let e=document.documentElement;return(window.pageXOffset||e.scrollLeft)-(e.clientLeft||0)}static matches(e,n){var i=Element.prototype,r=i.matches||i.webkitMatchesSelector||i.mozMatchesSelector||i.msMatchesSelector||function(s){return[].indexOf.call(document.querySelectorAll(s),this)!==-1};return r.call(e,n)}static getOuterWidth(e,n){let i=e.offsetWidth;if(n){let r=getComputedStyle(e);i+=parseFloat(r.marginLeft)+parseFloat(r.marginRight)}return i}static getHorizontalPadding(e){let n=getComputedStyle(e);return parseFloat(n.paddingLeft)+parseFloat(n.paddingRight)}static getHorizontalMargin(e){let n=getComputedStyle(e);return parseFloat(n.marginLeft)+parseFloat(n.marginRight)}static innerWidth(e){let n=e.offsetWidth,i=getComputedStyle(e);return n+=parseFloat(i.paddingLeft)+parseFloat(i.paddingRight),n}static width(e){let n=e.offsetWidth,i=getComputedStyle(e);return n-=parseFloat(i.paddingLeft)+parseFloat(i.paddingRight),n}static getInnerHeight(e){let n=e.offsetHeight,i=getComputedStyle(e);return n+=parseFloat(i.paddingTop)+parseFloat(i.paddingBottom),n}static getOuterHeight(e,n){let i=e.offsetHeight;if(n){let r=getComputedStyle(e);i+=parseFloat(r.marginTop)+parseFloat(r.marginBottom)}return i}static getHeight(e){let n=e.offsetHeight,i=getComputedStyle(e);return n-=parseFloat(i.paddingTop)+parseFloat(i.paddingBottom)+parseFloat(i.borderTopWidth)+parseFloat(i.borderBottomWidth),n}static getWidth(e){let n=e.offsetWidth,i=getComputedStyle(e);return n-=parseFloat(i.paddingLeft)+parseFloat(i.paddingRight)+parseFloat(i.borderLeftWidth)+parseFloat(i.borderRightWidth),n}static getViewport(){let e=window,n=document,i=n.documentElement,r=n.getElementsByTagName("body")[0],s=e.innerWidth||i.clientWidth||r.clientWidth,a=e.innerHeight||i.clientHeight||r.clientHeight;return{width:s,height:a}}static getOffset(e){var n=e.getBoundingClientRect();return{top:n.top+(window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0),left:n.left+(window.pageXOffset||document.documentElement.scrollLeft||document.body.scrollLeft||0)}}static replaceElementWith(e,n){let i=e.parentNode;if(!i)throw"Can't replace element";return i.replaceChild(n,e)}static getUserAgent(){if(navigator&&this.isClient())return navigator.userAgent}static isIE(){var e=window.navigator.userAgent,n=e.indexOf("MSIE ");if(n>0)return!0;var i=e.indexOf("Trident/");if(i>0){var r=e.indexOf("rv:");return!0}var s=e.indexOf("Edge/");return s>0}static isIOS(){return/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream}static isAndroid(){return/(android)/i.test(navigator.userAgent)}static isTouchDevice(){return"ontouchstart"in window||navigator.maxTouchPoints>0}static appendChild(e,n){if(this.isElement(n))n.appendChild(e);else if(n&&n.el&&n.el.nativeElement)n.el.nativeElement.appendChild(e);else throw"Cannot append "+n+" to "+e}static removeChild(e,n){if(this.isElement(n))n.removeChild(e);else if(n.el&&n.el.nativeElement)n.el.nativeElement.removeChild(e);else throw"Cannot remove "+e+" from "+n}static removeElement(e){"remove"in Element.prototype?e.remove():e.parentNode?.removeChild(e)}static isElement(e){return typeof HTMLElement=="object"?e instanceof HTMLElement:e&&typeof e=="object"&&e!==null&&e.nodeType===1&&typeof e.nodeName=="string"}static calculateScrollbarWidth(e){if(e){let n=getComputedStyle(e);return e.offsetWidth-e.clientWidth-parseFloat(n.borderLeftWidth)-parseFloat(n.borderRightWidth)}else{if(this.calculatedScrollbarWidth!==null)return this.calculatedScrollbarWidth;let n=document.createElement("div");n.className="p-scrollbar-measure",document.body.appendChild(n);let i=n.offsetWidth-n.clientWidth;return document.body.removeChild(n),this.calculatedScrollbarWidth=i,i}}static calculateScrollbarHeight(){if(this.calculatedScrollbarHeight!==null)return this.calculatedScrollbarHeight;let e=document.createElement("div");e.className="p-scrollbar-measure",document.body.appendChild(e);let n=e.offsetHeight-e.clientHeight;return document.body.removeChild(e),this.calculatedScrollbarWidth=n,n}static invokeElementMethod(e,n,i){e[n].apply(e,i)}static clearSelection(){if(window.getSelection&&window.getSelection())window.getSelection()?.empty?window.getSelection()?.empty():window.getSelection()?.removeAllRanges&&(window.getSelection()?.rangeCount||0)>0&&(window.getSelection()?.getRangeAt(0)?.getClientRects()?.length||0)>0&&window.getSelection()?.removeAllRanges();else if(document.selection&&document.selection.empty)try{document.selection.empty()}catch{}}static getBrowser(){if(!this.browser){let e=this.resolveUserAgent();this.browser={},e.browser&&(this.browser[e.browser]=!0,this.browser.version=e.version),this.browser.chrome?this.browser.webkit=!0:this.browser.webkit&&(this.browser.safari=!0)}return this.browser}static resolveUserAgent(){let e=navigator.userAgent.toLowerCase(),n=/(chrome)[ \/]([\w.]+)/.exec(e)||/(webkit)[ \/]([\w.]+)/.exec(e)||/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(e)||/(msie) ([\w.]+)/.exec(e)||e.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(e)||[];return{browser:n[1]||"",version:n[2]||"0"}}static isInteger(e){return Number.isInteger?Number.isInteger(e):typeof e=="number"&&isFinite(e)&&Math.floor(e)===e}static isHidden(e){return!e||e.offsetParent===null}static isVisible(e){return e&&e.offsetParent!=null}static isExist(e){return e!==null&&typeof e<"u"&&e.nodeName&&e.parentNode}static focus(e,n){e&&document.activeElement!==e&&e.focus(n)}static getFocusableSelectorString(e=""){return`button:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        [href][clientHeight][clientWidth]:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        input:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        select:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        textarea:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        [tabIndex]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        [contenteditable]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        .p-inputtext:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
        .p-button:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e}`}static getFocusableElements(e,n=""){let i=this.find(e,this.getFocusableSelectorString(n)),r=[];for(let s of i){let a=getComputedStyle(s);this.isVisible(s)&&a.display!="none"&&a.visibility!="hidden"&&r.push(s)}return r}static getFocusableElement(e,n=""){let i=this.findSingle(e,this.getFocusableSelectorString(n));if(i){let r=getComputedStyle(i);if(this.isVisible(i)&&r.display!="none"&&r.visibility!="hidden")return i}return null}static getFirstFocusableElement(e,n=""){let i=this.getFocusableElements(e,n);return i.length>0?i[0]:null}static getLastFocusableElement(e,n){let i=this.getFocusableElements(e,n);return i.length>0?i[i.length-1]:null}static getNextFocusableElement(e,n=!1){let i=t.getFocusableElements(e),r=0;if(i&&i.length>0){let s=i.indexOf(i[0].ownerDocument.activeElement);n?s==-1||s===0?r=i.length-1:r=s-1:s!=-1&&s!==i.length-1&&(r=s+1)}return i[r]}static generateZIndex(){return this.zindex=this.zindex||999,++this.zindex}static getSelection(){return window.getSelection?window.getSelection()?.toString():document.getSelection?document.getSelection()?.toString():document.selection?document.selection.createRange().text:null}static getTargetElement(e,n){if(!e)return null;switch(e){case"document":return document;case"window":return window;case"@next":return n?.nextElementSibling;case"@prev":return n?.previousElementSibling;case"@parent":return n?.parentElement;case"@grandparent":return n?.parentElement?.parentElement;default:let i=typeof e;if(i==="string")return document.querySelector(e);if(i==="object"&&e.hasOwnProperty("nativeElement"))return this.isExist(e.nativeElement)?e.nativeElement:void 0;let s=(a=>!!(a&&a.constructor&&a.call&&a.apply))(e)?e():e;return s&&s.nodeType===9||this.isExist(s)?s:null}}static isClient(){return!!(typeof window<"u"&&window.document&&window.document.createElement)}static getAttribute(e,n){if(e){let i=e.getAttribute(n);return isNaN(i)?i==="true"||i==="false"?i==="true":i:+i}}static calculateBodyScrollbarWidth(){return window.innerWidth-document.documentElement.offsetWidth}static blockBodyScroll(e="p-overflow-hidden"){document.body.style.setProperty("--scrollbar-width",this.calculateBodyScrollbarWidth()+"px"),this.addClass(document.body,e)}static unblockBodyScroll(e="p-overflow-hidden"){document.body.style.removeProperty("--scrollbar-width"),this.removeClass(document.body,e)}static createElement(e,n={},...i){if(e){let r=document.createElement(e);return this.setAttributes(r,n),r.append(...i),r}}static setAttribute(e,n="",i){this.isElement(e)&&i!==null&&i!==void 0&&e.setAttribute(n,i)}static setAttributes(e,n={}){if(this.isElement(e)){let i=(r,s)=>{let a=e?.$attrs?.[r]?[e?.$attrs?.[r]]:[];return[s].flat().reduce((l,p)=>{if(p!=null){let u=typeof p;if(u==="string"||u==="number")l.push(p);else if(u==="object"){let m=Array.isArray(p)?i(r,p):Object.entries(p).map(([S,D])=>r==="style"&&(D||D===0)?`${S.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase()}:${D}`:D?S:void 0);l=m.length?l.concat(m.filter(S=>!!S)):l}}return l},a)};Object.entries(n).forEach(([r,s])=>{if(s!=null){let a=r.match(/^on(.+)/);a?e.addEventListener(a[1].toLowerCase(),s):r==="pBind"?this.setAttributes(e,s):(s=r==="class"?[...new Set(i("class",s))].join(" ").trim():r==="style"?i("style",s).join(";").trim():s,(e.$attrs=e.$attrs||{})&&(e.$attrs[r]=s),e.setAttribute(r,s))}})}}static isFocusableElement(e,n=""){return this.isElement(e)?e.matches(`button:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n},
                [href][clientHeight][clientWidth]:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n},
                input:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n},
                select:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n},
                textarea:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n},
                [tabIndex]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n},
                [contenteditable]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${n}`):!1}}return t})();function Al(){En({variableName:Qt("scrollbar.width").name})}function Vl(){In({variableName:Qt("scrollbar.width").name})}var zo=class{element;listener;scrollableParents;constructor(o,e=()=>{}){this.element=o,this.listener=e}bindScrollListener(){this.scrollableParents=un.getScrollableParents(this.element);for(let o=0;o<this.scrollableParents.length;o++)this.scrollableParents[o].addEventListener("scroll",this.listener)}unbindScrollListener(){if(this.scrollableParents)for(let o=0;o<this.scrollableParents.length;o++)this.scrollableParents[o].removeEventListener("scroll",this.listener)}destroy(){this.unbindScrollListener(),this.element=null,this.listener=null,this.scrollableParents=null}};var Uo=(()=>{class t extends O{autofocus=!1;focused=!1;platformId=f(rt);document=f(ot);host=f(de);onAfterContentChecked(){this.autofocus===!1?this.host.nativeElement.removeAttribute("autofocus"):this.host.nativeElement.setAttribute("autofocus",!0),this.focused||this.autoFocus()}onAfterViewChecked(){this.focused||this.autoFocus()}autoFocus(){ze(this.platformId)&&this.autofocus&&setTimeout(()=>{let e=un.getFocusableElements(this.host?.nativeElement);e.length===0&&this.host.nativeElement.focus(),e.length>0&&e[0].focus(),this.focused=!0})}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,selectors:[["","pAutoFocus",""]],inputs:{autofocus:[0,"pAutoFocus","autofocus"]},features:[h]})}return t})();var Qr=["*"],Yr={root:"p-fluid"},Go=(()=>{class t extends ${name="fluid";classes=Yr;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac})}return t})();var Wo=new k("FLUID_INSTANCE"),qo=(()=>{class t extends O{componentName="Fluid";$pcFluid=f(Wo,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=f(V,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}_componentStyle=f(Go);static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["p-fluid"]],hostVars:2,hostBindings:function(n,i){n&2&&w(i.cx("root"))},features:[E([Go,{provide:Wo,useExisting:t},{provide:J,useExisting:t}]),re([V]),h],ngContentSelectors:Qr,decls:1,vars:0,template:function(n,i){n&1&&(be(),ve(0))},dependencies:[ne],encapsulation:2,changeDetection:0})}return t})();var Zo=`
    .p-ink {
        display: block;
        position: absolute;
        background: dt('ripple.background');
        border-radius: 100%;
        transform: scale(0);
        pointer-events: none;
    }

    .p-ink-active {
        animation: ripple 0.4s linear;
    }

    @keyframes ripple {
        100% {
            opacity: 0;
            transform: scale(2.5);
        }
    }
`;var Xr=`
    ${Zo}

    /* For PrimeNG */
    .p-ripple {
        overflow: hidden;
        position: relative;
    }

    .p-ripple-disabled .p-ink {
        display: none !important;
    }

    @keyframes ripple {
        100% {
            opacity: 0;
            transform: scale(2.5);
        }
    }
`,Kr={root:"p-ink"},Qo=(()=>{class t extends ${name="ripple";style=Xr;classes=Kr;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac})}return t})();var Yo=(()=>{class t extends O{componentName="Ripple";zone=f(it);_componentStyle=f(Qo);animationListener;mouseDownListener;timeout;constructor(){super(),G(()=>{ze(this.platformId)&&(this.config.ripple()?this.zone.runOutsideAngular(()=>{this.create(),this.mouseDownListener=this.renderer.listen(this.el.nativeElement,"mousedown",this.onMouseDown.bind(this))}):this.remove())})}onAfterViewInit(){}onMouseDown(e){let n=this.getInk();if(!n||this.document.defaultView?.getComputedStyle(n,null).display==="none")return;if(!this.$unstyled()&&pe(n,"p-ink-active"),n.setAttribute("data-p-ink-active","false"),!zt(n)&&!Ut(n)){let a=Math.max(An(this.el.nativeElement),Tn(this.el.nativeElement));n.style.height=a+"px",n.style.width=a+"px"}let i=Vn(this.el.nativeElement),r=e.pageX-i.left+this.document.body.scrollTop-Ut(n)/2,s=e.pageY-i.top+this.document.body.scrollLeft-zt(n)/2;this.renderer.setStyle(n,"top",s+"px"),this.renderer.setStyle(n,"left",r+"px"),!this.$unstyled()&&Ee(n,"p-ink-active"),n.setAttribute("data-p-ink-active","true"),this.timeout=setTimeout(()=>{let a=this.getInk();a&&(!this.$unstyled()&&pe(a,"p-ink-active"),a.setAttribute("data-p-ink-active","false"))},401)}getInk(){let e=this.el.nativeElement.children;for(let n=0;n<e.length;n++)if(typeof e[n].className=="string"&&e[n].className.indexOf("p-ink")!==-1)return e[n];return null}resetInk(){let e=this.getInk();e&&(!this.$unstyled()&&pe(e,"p-ink-active"),e.setAttribute("data-p-ink-active","false"))}onAnimationEnd(e){this.timeout&&clearTimeout(this.timeout),!this.$unstyled()&&pe(e.currentTarget,"p-ink-active"),e.currentTarget.setAttribute("data-p-ink-active","false")}create(){let e=this.renderer.createElement("span");this.renderer.addClass(e,"p-ink"),this.renderer.appendChild(this.el.nativeElement,e),this.renderer.setAttribute(e,"data-p-ink","true"),this.renderer.setAttribute(e,"data-p-ink-active","false"),this.renderer.setAttribute(e,"aria-hidden","true"),this.renderer.setAttribute(e,"role","presentation"),this.animationListener||(this.animationListener=this.renderer.listen(e,"animationend",this.onAnimationEnd.bind(this)))}remove(){let e=this.getInk();e&&(this.mouseDownListener&&this.mouseDownListener(),this.animationListener&&this.animationListener(),this.mouseDownListener=null,this.animationListener=null,kn(e))}onDestroy(){this.config&&this.config.ripple()&&this.remove()}static \u0275fac=function(n){return new(n||t)};static \u0275dir=_({type:t,selectors:[["","pRipple",""]],hostAttrs:[1,"p-ripple"],features:[E([Qo]),h]})}return t})();var Xo=`
    .p-badge {
        display: inline-flex;
        border-radius: dt('badge.border.radius');
        align-items: center;
        justify-content: center;
        padding: dt('badge.padding');
        background: dt('badge.primary.background');
        color: dt('badge.primary.color');
        font-size: dt('badge.font.size');
        font-weight: dt('badge.font.weight');
        min-width: dt('badge.min.width');
        height: dt('badge.height');
    }

    .p-badge-dot {
        width: dt('badge.dot.size');
        min-width: dt('badge.dot.size');
        height: dt('badge.dot.size');
        border-radius: 50%;
        padding: 0;
    }

    .p-badge-circle {
        padding: 0;
        border-radius: 50%;
    }

    .p-badge-secondary {
        background: dt('badge.secondary.background');
        color: dt('badge.secondary.color');
    }

    .p-badge-success {
        background: dt('badge.success.background');
        color: dt('badge.success.color');
    }

    .p-badge-info {
        background: dt('badge.info.background');
        color: dt('badge.info.color');
    }

    .p-badge-warn {
        background: dt('badge.warn.background');
        color: dt('badge.warn.color');
    }

    .p-badge-danger {
        background: dt('badge.danger.background');
        color: dt('badge.danger.color');
    }

    .p-badge-contrast {
        background: dt('badge.contrast.background');
        color: dt('badge.contrast.color');
    }

    .p-badge-sm {
        font-size: dt('badge.sm.font.size');
        min-width: dt('badge.sm.min.width');
        height: dt('badge.sm.height');
    }

    .p-badge-lg {
        font-size: dt('badge.lg.font.size');
        min-width: dt('badge.lg.min.width');
        height: dt('badge.lg.height');
    }

    .p-badge-xl {
        font-size: dt('badge.xl.font.size');
        min-width: dt('badge.xl.min.width');
        height: dt('badge.xl.height');
    }
`;var Jr=`
    ${Xo}

    /* For PrimeNG (directive)*/
    .p-overlay-badge {
        position: relative;
    }

    .p-overlay-badge > .p-badge {
        position: absolute;
        top: 0;
        inset-inline-end: 0;
        transform: translate(50%, -50%);
        transform-origin: 100% 0;
        margin: 0;
    }
`,es={root:({instance:t})=>{let o=typeof t.value=="function"?t.value():t.value,e=typeof t.size=="function"?t.size():t.size,n=typeof t.badgeSize=="function"?t.badgeSize():t.badgeSize,i=typeof t.severity=="function"?t.severity():t.severity;return["p-badge p-component",{"p-badge-circle":Ie(o)&&String(o).length===1,"p-badge-dot":ht(o),"p-badge-sm":e==="small"||n==="small","p-badge-lg":e==="large"||n==="large","p-badge-xl":e==="xlarge"||n==="xlarge","p-badge-info":i==="info","p-badge-success":i==="success","p-badge-warn":i==="warn","p-badge-danger":i==="danger","p-badge-secondary":i==="secondary","p-badge-contrast":i==="contrast"}]}},Ko=(()=>{class t extends ${name="badge";style=Jr;classes=es;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac})}return t})();var Jo=new k("BADGE_INSTANCE");var cn=(()=>{class t extends O{componentName="Badge";$pcBadge=f(Jo,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=f(V,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}styleClass=d();badgeSize=d();size=d();severity=d();value=d();badgeDisabled=d(!1,{transform:x});_componentStyle=f(Ko);get dataP(){return this.cn({circle:this.value()!=null&&String(this.value()).length===1,empty:this.value()==null,disabled:this.badgeDisabled(),[this.severity()]:this.severity(),[this.size()]:this.size()})}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["p-badge"]],hostVars:5,hostBindings:function(n,i){n&2&&(M("data-p",i.dataP),w(i.cn(i.cx("root"),i.styleClass())),yn("display",i.badgeDisabled()?"none":null))},inputs:{styleClass:[1,"styleClass"],badgeSize:[1,"badgeSize"],size:[1,"size"],severity:[1,"severity"],value:[1,"value"],badgeDisabled:[1,"badgeDisabled"]},features:[E([Ko,{provide:Jo,useExisting:t},{provide:J,useExisting:t}]),re([V]),h],decls:1,vars:1,template:function(n,i){n&1&&Me(0),n&2&&Ne(i.value())},dependencies:[ne,oe,vt],encapsulation:2,changeDetection:0})}return t})(),ei=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=z({type:t});static \u0275inj=j({imports:[cn,oe,oe]})}return t})();var ti=`
    .p-button {
        display: inline-flex;
        cursor: pointer;
        user-select: none;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        color: dt('button.primary.color');
        background: dt('button.primary.background');
        border: 1px solid dt('button.primary.border.color');
        padding: dt('button.padding.y') dt('button.padding.x');
        font-size: 1rem;
        font-family: inherit;
        font-feature-settings: inherit;
        transition:
            background dt('button.transition.duration'),
            color dt('button.transition.duration'),
            border-color dt('button.transition.duration'),
            outline-color dt('button.transition.duration'),
            box-shadow dt('button.transition.duration');
        border-radius: dt('button.border.radius');
        outline-color: transparent;
        gap: dt('button.gap');
    }

    .p-button:disabled {
        cursor: default;
    }

    .p-button-icon-right {
        order: 1;
    }

    .p-button-icon-right:dir(rtl) {
        order: -1;
    }

    .p-button:not(.p-button-vertical) .p-button-icon:not(.p-button-icon-right):dir(rtl) {
        order: 1;
    }

    .p-button-icon-bottom {
        order: 2;
    }

    .p-button-icon-only {
        width: dt('button.icon.only.width');
        padding-inline-start: 0;
        padding-inline-end: 0;
        gap: 0;
    }

    .p-button-icon-only.p-button-rounded {
        border-radius: 50%;
        height: dt('button.icon.only.width');
    }

    .p-button-icon-only .p-button-label {
        visibility: hidden;
        width: 0;
    }

    .p-button-icon-only::after {
        content: "\xA0";
        visibility: hidden;
        width: 0;
    }

    .p-button-sm {
        font-size: dt('button.sm.font.size');
        padding: dt('button.sm.padding.y') dt('button.sm.padding.x');
    }

    .p-button-sm .p-button-icon {
        font-size: dt('button.sm.font.size');
    }

    .p-button-sm.p-button-icon-only {
        width: dt('button.sm.icon.only.width');
    }

    .p-button-sm.p-button-icon-only.p-button-rounded {
        height: dt('button.sm.icon.only.width');
    }

    .p-button-lg {
        font-size: dt('button.lg.font.size');
        padding: dt('button.lg.padding.y') dt('button.lg.padding.x');
    }

    .p-button-lg .p-button-icon {
        font-size: dt('button.lg.font.size');
    }

    .p-button-lg.p-button-icon-only {
        width: dt('button.lg.icon.only.width');
    }

    .p-button-lg.p-button-icon-only.p-button-rounded {
        height: dt('button.lg.icon.only.width');
    }

    .p-button-vertical {
        flex-direction: column;
    }

    .p-button-label {
        font-weight: dt('button.label.font.weight');
    }

    .p-button-fluid {
        width: 100%;
    }

    .p-button-fluid.p-button-icon-only {
        width: dt('button.icon.only.width');
    }

    .p-button:not(:disabled):hover {
        background: dt('button.primary.hover.background');
        border: 1px solid dt('button.primary.hover.border.color');
        color: dt('button.primary.hover.color');
    }

    .p-button:not(:disabled):active {
        background: dt('button.primary.active.background');
        border: 1px solid dt('button.primary.active.border.color');
        color: dt('button.primary.active.color');
    }

    .p-button:focus-visible {
        box-shadow: dt('button.primary.focus.ring.shadow');
        outline: dt('button.focus.ring.width') dt('button.focus.ring.style') dt('button.primary.focus.ring.color');
        outline-offset: dt('button.focus.ring.offset');
    }

    .p-button .p-badge {
        min-width: dt('button.badge.size');
        height: dt('button.badge.size');
        line-height: dt('button.badge.size');
    }

    .p-button-raised {
        box-shadow: dt('button.raised.shadow');
    }

    .p-button-rounded {
        border-radius: dt('button.rounded.border.radius');
    }

    .p-button-secondary {
        background: dt('button.secondary.background');
        border: 1px solid dt('button.secondary.border.color');
        color: dt('button.secondary.color');
    }

    .p-button-secondary:not(:disabled):hover {
        background: dt('button.secondary.hover.background');
        border: 1px solid dt('button.secondary.hover.border.color');
        color: dt('button.secondary.hover.color');
    }

    .p-button-secondary:not(:disabled):active {
        background: dt('button.secondary.active.background');
        border: 1px solid dt('button.secondary.active.border.color');
        color: dt('button.secondary.active.color');
    }

    .p-button-secondary:focus-visible {
        outline-color: dt('button.secondary.focus.ring.color');
        box-shadow: dt('button.secondary.focus.ring.shadow');
    }

    .p-button-success {
        background: dt('button.success.background');
        border: 1px solid dt('button.success.border.color');
        color: dt('button.success.color');
    }

    .p-button-success:not(:disabled):hover {
        background: dt('button.success.hover.background');
        border: 1px solid dt('button.success.hover.border.color');
        color: dt('button.success.hover.color');
    }

    .p-button-success:not(:disabled):active {
        background: dt('button.success.active.background');
        border: 1px solid dt('button.success.active.border.color');
        color: dt('button.success.active.color');
    }

    .p-button-success:focus-visible {
        outline-color: dt('button.success.focus.ring.color');
        box-shadow: dt('button.success.focus.ring.shadow');
    }

    .p-button-info {
        background: dt('button.info.background');
        border: 1px solid dt('button.info.border.color');
        color: dt('button.info.color');
    }

    .p-button-info:not(:disabled):hover {
        background: dt('button.info.hover.background');
        border: 1px solid dt('button.info.hover.border.color');
        color: dt('button.info.hover.color');
    }

    .p-button-info:not(:disabled):active {
        background: dt('button.info.active.background');
        border: 1px solid dt('button.info.active.border.color');
        color: dt('button.info.active.color');
    }

    .p-button-info:focus-visible {
        outline-color: dt('button.info.focus.ring.color');
        box-shadow: dt('button.info.focus.ring.shadow');
    }

    .p-button-warn {
        background: dt('button.warn.background');
        border: 1px solid dt('button.warn.border.color');
        color: dt('button.warn.color');
    }

    .p-button-warn:not(:disabled):hover {
        background: dt('button.warn.hover.background');
        border: 1px solid dt('button.warn.hover.border.color');
        color: dt('button.warn.hover.color');
    }

    .p-button-warn:not(:disabled):active {
        background: dt('button.warn.active.background');
        border: 1px solid dt('button.warn.active.border.color');
        color: dt('button.warn.active.color');
    }

    .p-button-warn:focus-visible {
        outline-color: dt('button.warn.focus.ring.color');
        box-shadow: dt('button.warn.focus.ring.shadow');
    }

    .p-button-help {
        background: dt('button.help.background');
        border: 1px solid dt('button.help.border.color');
        color: dt('button.help.color');
    }

    .p-button-help:not(:disabled):hover {
        background: dt('button.help.hover.background');
        border: 1px solid dt('button.help.hover.border.color');
        color: dt('button.help.hover.color');
    }

    .p-button-help:not(:disabled):active {
        background: dt('button.help.active.background');
        border: 1px solid dt('button.help.active.border.color');
        color: dt('button.help.active.color');
    }

    .p-button-help:focus-visible {
        outline-color: dt('button.help.focus.ring.color');
        box-shadow: dt('button.help.focus.ring.shadow');
    }

    .p-button-danger {
        background: dt('button.danger.background');
        border: 1px solid dt('button.danger.border.color');
        color: dt('button.danger.color');
    }

    .p-button-danger:not(:disabled):hover {
        background: dt('button.danger.hover.background');
        border: 1px solid dt('button.danger.hover.border.color');
        color: dt('button.danger.hover.color');
    }

    .p-button-danger:not(:disabled):active {
        background: dt('button.danger.active.background');
        border: 1px solid dt('button.danger.active.border.color');
        color: dt('button.danger.active.color');
    }

    .p-button-danger:focus-visible {
        outline-color: dt('button.danger.focus.ring.color');
        box-shadow: dt('button.danger.focus.ring.shadow');
    }

    .p-button-contrast {
        background: dt('button.contrast.background');
        border: 1px solid dt('button.contrast.border.color');
        color: dt('button.contrast.color');
    }

    .p-button-contrast:not(:disabled):hover {
        background: dt('button.contrast.hover.background');
        border: 1px solid dt('button.contrast.hover.border.color');
        color: dt('button.contrast.hover.color');
    }

    .p-button-contrast:not(:disabled):active {
        background: dt('button.contrast.active.background');
        border: 1px solid dt('button.contrast.active.border.color');
        color: dt('button.contrast.active.color');
    }

    .p-button-contrast:focus-visible {
        outline-color: dt('button.contrast.focus.ring.color');
        box-shadow: dt('button.contrast.focus.ring.shadow');
    }

    .p-button-outlined {
        background: transparent;
        border-color: dt('button.outlined.primary.border.color');
        color: dt('button.outlined.primary.color');
    }

    .p-button-outlined:not(:disabled):hover {
        background: dt('button.outlined.primary.hover.background');
        border-color: dt('button.outlined.primary.border.color');
        color: dt('button.outlined.primary.color');
    }

    .p-button-outlined:not(:disabled):active {
        background: dt('button.outlined.primary.active.background');
        border-color: dt('button.outlined.primary.border.color');
        color: dt('button.outlined.primary.color');
    }

    .p-button-outlined.p-button-secondary {
        border-color: dt('button.outlined.secondary.border.color');
        color: dt('button.outlined.secondary.color');
    }

    .p-button-outlined.p-button-secondary:not(:disabled):hover {
        background: dt('button.outlined.secondary.hover.background');
        border-color: dt('button.outlined.secondary.border.color');
        color: dt('button.outlined.secondary.color');
    }

    .p-button-outlined.p-button-secondary:not(:disabled):active {
        background: dt('button.outlined.secondary.active.background');
        border-color: dt('button.outlined.secondary.border.color');
        color: dt('button.outlined.secondary.color');
    }

    .p-button-outlined.p-button-success {
        border-color: dt('button.outlined.success.border.color');
        color: dt('button.outlined.success.color');
    }

    .p-button-outlined.p-button-success:not(:disabled):hover {
        background: dt('button.outlined.success.hover.background');
        border-color: dt('button.outlined.success.border.color');
        color: dt('button.outlined.success.color');
    }

    .p-button-outlined.p-button-success:not(:disabled):active {
        background: dt('button.outlined.success.active.background');
        border-color: dt('button.outlined.success.border.color');
        color: dt('button.outlined.success.color');
    }

    .p-button-outlined.p-button-info {
        border-color: dt('button.outlined.info.border.color');
        color: dt('button.outlined.info.color');
    }

    .p-button-outlined.p-button-info:not(:disabled):hover {
        background: dt('button.outlined.info.hover.background');
        border-color: dt('button.outlined.info.border.color');
        color: dt('button.outlined.info.color');
    }

    .p-button-outlined.p-button-info:not(:disabled):active {
        background: dt('button.outlined.info.active.background');
        border-color: dt('button.outlined.info.border.color');
        color: dt('button.outlined.info.color');
    }

    .p-button-outlined.p-button-warn {
        border-color: dt('button.outlined.warn.border.color');
        color: dt('button.outlined.warn.color');
    }

    .p-button-outlined.p-button-warn:not(:disabled):hover {
        background: dt('button.outlined.warn.hover.background');
        border-color: dt('button.outlined.warn.border.color');
        color: dt('button.outlined.warn.color');
    }

    .p-button-outlined.p-button-warn:not(:disabled):active {
        background: dt('button.outlined.warn.active.background');
        border-color: dt('button.outlined.warn.border.color');
        color: dt('button.outlined.warn.color');
    }

    .p-button-outlined.p-button-help {
        border-color: dt('button.outlined.help.border.color');
        color: dt('button.outlined.help.color');
    }

    .p-button-outlined.p-button-help:not(:disabled):hover {
        background: dt('button.outlined.help.hover.background');
        border-color: dt('button.outlined.help.border.color');
        color: dt('button.outlined.help.color');
    }

    .p-button-outlined.p-button-help:not(:disabled):active {
        background: dt('button.outlined.help.active.background');
        border-color: dt('button.outlined.help.border.color');
        color: dt('button.outlined.help.color');
    }

    .p-button-outlined.p-button-danger {
        border-color: dt('button.outlined.danger.border.color');
        color: dt('button.outlined.danger.color');
    }

    .p-button-outlined.p-button-danger:not(:disabled):hover {
        background: dt('button.outlined.danger.hover.background');
        border-color: dt('button.outlined.danger.border.color');
        color: dt('button.outlined.danger.color');
    }

    .p-button-outlined.p-button-danger:not(:disabled):active {
        background: dt('button.outlined.danger.active.background');
        border-color: dt('button.outlined.danger.border.color');
        color: dt('button.outlined.danger.color');
    }

    .p-button-outlined.p-button-contrast {
        border-color: dt('button.outlined.contrast.border.color');
        color: dt('button.outlined.contrast.color');
    }

    .p-button-outlined.p-button-contrast:not(:disabled):hover {
        background: dt('button.outlined.contrast.hover.background');
        border-color: dt('button.outlined.contrast.border.color');
        color: dt('button.outlined.contrast.color');
    }

    .p-button-outlined.p-button-contrast:not(:disabled):active {
        background: dt('button.outlined.contrast.active.background');
        border-color: dt('button.outlined.contrast.border.color');
        color: dt('button.outlined.contrast.color');
    }

    .p-button-outlined.p-button-plain {
        border-color: dt('button.outlined.plain.border.color');
        color: dt('button.outlined.plain.color');
    }

    .p-button-outlined.p-button-plain:not(:disabled):hover {
        background: dt('button.outlined.plain.hover.background');
        border-color: dt('button.outlined.plain.border.color');
        color: dt('button.outlined.plain.color');
    }

    .p-button-outlined.p-button-plain:not(:disabled):active {
        background: dt('button.outlined.plain.active.background');
        border-color: dt('button.outlined.plain.border.color');
        color: dt('button.outlined.plain.color');
    }

    .p-button-text {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.primary.color');
    }

    .p-button-text:not(:disabled):hover {
        background: dt('button.text.primary.hover.background');
        border-color: transparent;
        color: dt('button.text.primary.color');
    }

    .p-button-text:not(:disabled):active {
        background: dt('button.text.primary.active.background');
        border-color: transparent;
        color: dt('button.text.primary.color');
    }

    .p-button-text.p-button-secondary {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.secondary.color');
    }

    .p-button-text.p-button-secondary:not(:disabled):hover {
        background: dt('button.text.secondary.hover.background');
        border-color: transparent;
        color: dt('button.text.secondary.color');
    }

    .p-button-text.p-button-secondary:not(:disabled):active {
        background: dt('button.text.secondary.active.background');
        border-color: transparent;
        color: dt('button.text.secondary.color');
    }

    .p-button-text.p-button-success {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.success.color');
    }

    .p-button-text.p-button-success:not(:disabled):hover {
        background: dt('button.text.success.hover.background');
        border-color: transparent;
        color: dt('button.text.success.color');
    }

    .p-button-text.p-button-success:not(:disabled):active {
        background: dt('button.text.success.active.background');
        border-color: transparent;
        color: dt('button.text.success.color');
    }

    .p-button-text.p-button-info {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.info.color');
    }

    .p-button-text.p-button-info:not(:disabled):hover {
        background: dt('button.text.info.hover.background');
        border-color: transparent;
        color: dt('button.text.info.color');
    }

    .p-button-text.p-button-info:not(:disabled):active {
        background: dt('button.text.info.active.background');
        border-color: transparent;
        color: dt('button.text.info.color');
    }

    .p-button-text.p-button-warn {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.warn.color');
    }

    .p-button-text.p-button-warn:not(:disabled):hover {
        background: dt('button.text.warn.hover.background');
        border-color: transparent;
        color: dt('button.text.warn.color');
    }

    .p-button-text.p-button-warn:not(:disabled):active {
        background: dt('button.text.warn.active.background');
        border-color: transparent;
        color: dt('button.text.warn.color');
    }

    .p-button-text.p-button-help {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.help.color');
    }

    .p-button-text.p-button-help:not(:disabled):hover {
        background: dt('button.text.help.hover.background');
        border-color: transparent;
        color: dt('button.text.help.color');
    }

    .p-button-text.p-button-help:not(:disabled):active {
        background: dt('button.text.help.active.background');
        border-color: transparent;
        color: dt('button.text.help.color');
    }

    .p-button-text.p-button-danger {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.danger.color');
    }

    .p-button-text.p-button-danger:not(:disabled):hover {
        background: dt('button.text.danger.hover.background');
        border-color: transparent;
        color: dt('button.text.danger.color');
    }

    .p-button-text.p-button-danger:not(:disabled):active {
        background: dt('button.text.danger.active.background');
        border-color: transparent;
        color: dt('button.text.danger.color');
    }

    .p-button-text.p-button-contrast {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.contrast.color');
    }

    .p-button-text.p-button-contrast:not(:disabled):hover {
        background: dt('button.text.contrast.hover.background');
        border-color: transparent;
        color: dt('button.text.contrast.color');
    }

    .p-button-text.p-button-contrast:not(:disabled):active {
        background: dt('button.text.contrast.active.background');
        border-color: transparent;
        color: dt('button.text.contrast.color');
    }

    .p-button-text.p-button-plain {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.plain.color');
    }

    .p-button-text.p-button-plain:not(:disabled):hover {
        background: dt('button.text.plain.hover.background');
        border-color: transparent;
        color: dt('button.text.plain.color');
    }

    .p-button-text.p-button-plain:not(:disabled):active {
        background: dt('button.text.plain.active.background');
        border-color: transparent;
        color: dt('button.text.plain.color');
    }

    .p-button-link {
        background: transparent;
        border-color: transparent;
        color: dt('button.link.color');
    }

    .p-button-link:not(:disabled):hover {
        background: transparent;
        border-color: transparent;
        color: dt('button.link.hover.color');
    }

    .p-button-link:not(:disabled):hover .p-button-label {
        text-decoration: underline;
    }

    .p-button-link:not(:disabled):active {
        background: transparent;
        border-color: transparent;
        color: dt('button.link.active.color');
    }
`;var ns=["content"],os=["loadingicon"],is=["icon"],rs=["*"],ii=(t,o)=>({class:t,pt:o});function ss(t,o){t&1&&He(0)}function as(t,o){if(t&1&&W(0,"span",7),t&2){let e=C(3);w(e.cn(e.cx("loadingIcon"),"pi-spin",e.loadingIcon||(e.buttonProps==null?null:e.buttonProps.loadingIcon))),b("pBind",e.ptm("loadingIcon")),M("aria-hidden",!0)}}function ls(t,o){if(t&1&&(T(),W(0,"svg",8)),t&2){let e=C(3);w(e.cn(e.cx("loadingIcon"),e.cx("spinnerIcon"))),b("pBind",e.ptm("loadingIcon"))("spin",!0),M("aria-hidden",!0)}}function ds(t,o){if(t&1&&(Fe(0),Y(1,as,1,4,"span",3)(2,ls,1,5,"svg",6),ke()),t&2){let e=C(2);v(),b("ngIf",e.loadingIcon||(e.buttonProps==null?null:e.buttonProps.loadingIcon)),v(),b("ngIf",!(e.loadingIcon||e.buttonProps!=null&&e.buttonProps.loadingIcon))}}function us(t,o){}function cs(t,o){if(t&1&&Y(0,us,0,0,"ng-template",9),t&2){let e=C(2);b("ngIf",e.loadingIconTemplate||e._loadingIconTemplate)}}function ps(t,o){if(t&1&&(Fe(0),Y(1,ds,3,2,"ng-container",2)(2,cs,1,1,null,5),ke()),t&2){let e=C();v(),b("ngIf",!e.loadingIconTemplate&&!e._loadingIconTemplate),v(),b("ngTemplateOutlet",e.loadingIconTemplate||e._loadingIconTemplate)("ngTemplateOutletContext",je(3,ii,e.cx("loadingIcon"),e.ptm("loadingIcon")))}}function hs(t,o){if(t&1&&W(0,"span",7),t&2){let e=C(2);w(e.cn(e.cx("icon"),e.icon||(e.buttonProps==null?null:e.buttonProps.icon))),b("pBind",e.ptm("icon")),M("data-p",e.dataIconP)}}function fs(t,o){}function gs(t,o){if(t&1&&Y(0,fs,0,0,"ng-template",9),t&2){let e=C(2);b("ngIf",!e.icon&&(e.iconTemplate||e._iconTemplate))}}function ms(t,o){if(t&1&&(Fe(0),Y(1,hs,1,4,"span",3)(2,gs,1,1,null,5),ke()),t&2){let e=C();v(),b("ngIf",(e.icon||(e.buttonProps==null?null:e.buttonProps.icon))&&!e.iconTemplate&&!e._iconTemplate),v(),b("ngTemplateOutlet",e.iconTemplate||e._iconTemplate)("ngTemplateOutletContext",je(3,ii,e.cx("icon"),e.ptm("icon")))}}function bs(t,o){if(t&1&&(se(0,"span",7),Me(1),ae()),t&2){let e=C();w(e.cx("label")),b("pBind",e.ptm("label")),M("aria-hidden",(e.icon||(e.buttonProps==null?null:e.buttonProps.icon))&&!(e.label||e.buttonProps!=null&&e.buttonProps.label))("data-p",e.dataLabelP),v(),Ne(e.label||(e.buttonProps==null?null:e.buttonProps.label))}}function vs(t,o){if(t&1&&W(0,"p-badge",10),t&2){let e=C();b("value",e.badge||(e.buttonProps==null?null:e.buttonProps.badge))("severity",e.badgeSeverity||(e.buttonProps==null?null:e.buttonProps.badgeSeverity))("pt",e.ptm("pcBadge"))("unstyled",e.unstyled())}}var ys={root:({instance:t})=>["p-button p-component",{"p-button-icon-only":t.hasIcon&&!t.label&&!t.buttonProps?.label&&!t.badge,"p-button-vertical":(t.iconPos==="top"||t.iconPos==="bottom")&&t.label,"p-button-loading":t.loading||t.buttonProps?.loading,"p-button-link":t.link||t.buttonProps?.link,[`p-button-${t.severity||t.buttonProps?.severity}`]:t.severity||t.buttonProps?.severity,"p-button-raised":t.raised||t.buttonProps?.raised,"p-button-rounded":t.rounded||t.buttonProps?.rounded,"p-button-text":t.text||t.variant==="text"||t.buttonProps?.text||t.buttonProps?.variant==="text","p-button-outlined":t.outlined||t.variant==="outlined"||t.buttonProps?.outlined||t.buttonProps?.variant==="outlined","p-button-sm":t.size==="small"||t.buttonProps?.size==="small","p-button-lg":t.size==="large"||t.buttonProps?.size==="large","p-button-plain":t.plain||t.buttonProps?.plain,"p-button-fluid":t.hasFluid}],loadingIcon:"p-button-loading-icon",icon:({instance:t})=>["p-button-icon",{[`p-button-icon-${t.iconPos||t.buttonProps?.iconPos}`]:t.label||t.buttonProps?.label,"p-button-icon-left":(t.iconPos==="left"||t.buttonProps?.iconPos==="left")&&t.label||t.buttonProps?.label,"p-button-icon-right":(t.iconPos==="right"||t.buttonProps?.iconPos==="right")&&t.label||t.buttonProps?.label,"p-button-icon-top":(t.iconPos==="top"||t.buttonProps?.iconPos==="top")&&t.label||t.buttonProps?.label,"p-button-icon-bottom":(t.iconPos==="bottom"||t.buttonProps?.iconPos==="bottom")&&t.label||t.buttonProps?.label},t.icon,t.buttonProps?.icon],spinnerIcon:({instance:t})=>Object.entries(t.cx("icon")).filter(([,o])=>!!o).reduce((o,[e])=>o+` ${e}`,"p-button-loading-icon"),label:"p-button-label"},ni=(()=>{class t extends ${name="button";style=ti;classes=ys;static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275prov=L({token:t,factory:t.\u0275fac})}return t})();var oi=new k("BUTTON_INSTANCE");var Jd=(()=>{class t extends O{componentName="Button";hostName="";$pcButton=f(oi,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=f(V,{self:!0});_componentStyle=f(ni);onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptm("host"))}type="button";badge;disabled;raised=!1;rounded=!1;text=!1;plain=!1;outlined=!1;link=!1;tabindex;size;variant;style;styleClass;badgeClass;badgeSeverity="secondary";ariaLabel;autofocus;iconPos="left";icon;label;loading=!1;loadingIcon;severity;buttonProps;fluid=d(void 0,{transform:x});onClick=new q;onFocus=new q;onBlur=new q;contentTemplate;loadingIconTemplate;iconTemplate;templates;pcFluid=f(qo,{optional:!0,host:!0,skipSelf:!0});get hasFluid(){return this.fluid()??!!this.pcFluid}get hasIcon(){return this.icon||this.buttonProps?.icon||this.iconTemplate||this._iconTemplate||this.loadingIcon||this.loadingIconTemplate||this._loadingIconTemplate}_contentTemplate;_iconTemplate;_loadingIconTemplate;onAfterContentInit(){this.templates?.forEach(e=>{switch(e.getType()){case"content":this._contentTemplate=e.template;break;case"icon":this._iconTemplate=e.template;break;case"loadingicon":this._loadingIconTemplate=e.template;break;default:this._contentTemplate=e.template;break}})}get dataP(){return this.cn({[this.size]:this.size,"icon-only":this.hasIcon&&!this.label&&!this.badge,loading:this.loading,fluid:this.hasFluid,rounded:this.rounded,raised:this.raised,outlined:this.outlined||this.variant==="outlined",text:this.text||this.variant==="text",link:this.link,vertical:(this.iconPos==="top"||this.iconPos==="bottom")&&this.label})}get dataIconP(){return this.cn({[this.iconPos]:this.iconPos,[this.size]:this.size})}get dataLabelP(){return this.cn({[this.size]:this.size,"icon-only":this.hasIcon&&!this.label&&!this.badge})}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275cmp=I({type:t,selectors:[["p-button"]],contentQueries:function(n,i,r){if(n&1&&st(r,ns,5)(r,os,5)(r,is,5)(r,mt,4),n&2){let s;ue(s=ce())&&(i.contentTemplate=s.first),ue(s=ce())&&(i.loadingIconTemplate=s.first),ue(s=ce())&&(i.iconTemplate=s.first),ue(s=ce())&&(i.templates=s)}},inputs:{hostName:"hostName",type:"type",badge:"badge",disabled:[2,"disabled","disabled",x],raised:[2,"raised","raised",x],rounded:[2,"rounded","rounded",x],text:[2,"text","text",x],plain:[2,"plain","plain",x],outlined:[2,"outlined","outlined",x],link:[2,"link","link",x],tabindex:[2,"tabindex","tabindex",we],size:"size",variant:"variant",style:"style",styleClass:"styleClass",badgeClass:"badgeClass",badgeSeverity:"badgeSeverity",ariaLabel:"ariaLabel",autofocus:[2,"autofocus","autofocus",x],iconPos:"iconPos",icon:"icon",label:"label",loading:[2,"loading","loading",x],loadingIcon:"loadingIcon",severity:"severity",buttonProps:"buttonProps",fluid:[1,"fluid"]},outputs:{onClick:"onClick",onFocus:"onFocus",onBlur:"onBlur"},features:[E([ni,{provide:oi,useExisting:t},{provide:J,useExisting:t}]),re([V]),h],ngContentSelectors:rs,decls:7,vars:17,consts:[["pRipple","",3,"click","focus","blur","ngStyle","disabled","pAutoFocus","pBind"],[4,"ngTemplateOutlet"],[4,"ngIf"],[3,"class","pBind",4,"ngIf"],[3,"value","severity","pt","unstyled",4,"ngIf"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],["data-p-icon","spinner",3,"class","pBind","spin",4,"ngIf"],[3,"pBind"],["data-p-icon","spinner",3,"pBind","spin"],[3,"ngIf"],[3,"value","severity","pt","unstyled"]],template:function(n,i){n&1&&(be(),se(0,"button",0),le("click",function(s){return i.onClick.emit(s)})("focus",function(s){return i.onFocus.emit(s)})("blur",function(s){return i.onBlur.emit(s)}),ve(1),Y(2,ss,1,0,"ng-container",1)(3,ps,3,6,"ng-container",2)(4,ms,3,6,"ng-container",2)(5,bs,2,6,"span",3)(6,vs,1,4,"p-badge",4),ae()),n&2&&(w(i.cn(i.cx("root"),i.styleClass,i.buttonProps==null?null:i.buttonProps.styleClass)),b("ngStyle",i.style||(i.buttonProps==null?null:i.buttonProps.style))("disabled",i.disabled||i.loading||(i.buttonProps==null?null:i.buttonProps.disabled))("pAutoFocus",i.autofocus||(i.buttonProps==null?null:i.buttonProps.autofocus))("pBind",i.ptm("root")),M("type",i.type||(i.buttonProps==null?null:i.buttonProps.type))("aria-label",i.ariaLabel||(i.buttonProps==null?null:i.buttonProps.ariaLabel))("tabindex",i.tabindex||(i.buttonProps==null?null:i.buttonProps.tabindex))("data-p",i.dataP)("data-p-disabled",i.disabled||i.loading||(i.buttonProps==null?null:i.buttonProps.disabled))("data-p-severity",i.severity||(i.buttonProps==null?null:i.buttonProps.severity)),v(2),b("ngTemplateOutlet",i.contentTemplate||i._contentTemplate),v(),b("ngIf",i.loading||(i.buttonProps==null?null:i.buttonProps.loading)),v(),b("ngIf",!(i.loading||i.buttonProps!=null&&i.buttonProps.loading)),v(),b("ngIf",!i.contentTemplate&&!i._contentTemplate&&(i.label||(i.buttonProps==null?null:i.buttonProps.label))),v(),b("ngIf",!i.contentTemplate&&!i._contentTemplate&&(i.badge||(i.buttonProps==null?null:i.buttonProps.badge))))},dependencies:[ne,ut,ct,wn,Yo,Uo,Qn,ei,cn,oe,V],encapsulation:2,changeDetection:0})}return t})();var ri=(()=>{class t extends O{modelValue=P(void 0);$filled=A(()=>Ie(this.modelValue()));writeModelValue(e){this.modelValue.set(e)}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,features:[h]})}return t})();var uu=(()=>{class t extends ri{required=d(void 0,{transform:x});invalid=d(void 0,{transform:x});disabled=d(void 0,{transform:x});name=d();_disabled=P(!1);$disabled=A(()=>this.disabled()||this._disabled());onModelChange=()=>{};onModelTouched=()=>{};writeDisabledState(e){this._disabled.set(e)}writeControlValue(e,n){}writeValue(e){this.writeControlValue(e,this.writeModelValue.bind(this))}registerOnChange(e){this.onModelChange=e}registerOnTouched(e){this.onModelTouched=e}setDisabledState(e){this.writeDisabledState(e),this.cd.markForCheck()}static \u0275fac=(()=>{let e;return function(i){return(e||(e=g(t)))(i||t)}})();static \u0275dir=_({type:t,inputs:{required:[1,"required"],invalid:[1,"invalid"],disabled:[1,"disabled"],name:[1,"name"]},features:[h]})}return t})();export{Z as a,J as b,O as c,V as d,vt as e,ee as f,Yn as g,Li as h,oo as i,io as j,Mt as k,pr as l,Za as m,kt as n,yo as o,ao as p,Se as q,bl as r,vl as s,Rr as t,Cl as u,jr as v,$o as w,Ro as x,Wr as y,Zr as z,_l as A,Dl as B,Ml as C,Al as D,Vl as E,zo as F,Uo as G,qo as H,Yo as I,Jd as J,ri as K,uu as L};
