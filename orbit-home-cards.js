//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, _ = g ? g.emptyScript : "", v = h.reactiveElementPolyfillSupport, y = (e, t) => e, b = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? _ : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, ee = (e, t) => !l(e, t), x = {
	attribute: !0,
	type: String,
	converter: b,
	reflect: !1,
	useDefault: !1,
	hasChanged: ee
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var S = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = x) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? x;
	}
	static _$Ei() {
		if (this.hasOwnProperty(y("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(y("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(y("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? b : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? b : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ee)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[y("elementProperties")] = /* @__PURE__ */ new Map(), S[y("finalized")] = /* @__PURE__ */ new Map(), v?.({ ReactiveElement: S }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var te = globalThis, ne = (e) => e, C = te.trustedTypes, re = C ? C.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ie = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, ae = "?" + w, oe = `<${ae}>`, T = document, E = () => T.createComment(""), D = (e) => e === null || typeof e != "object" && typeof e != "function", se = Array.isArray, ce = (e) => se(e) || typeof e?.[Symbol.iterator] == "function", le = "[ 	\n\f\r]", O = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ue = /-->/g, de = />/g, k = RegExp(`>|${le}(?:([^\\s"'>=/]+)(${le}*=${le}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), fe = /'/g, pe = /"/g, me = /^(?:script|style|textarea|title)$/i, A = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), j = Symbol.for("lit-noChange"), M = Symbol.for("lit-nothing"), he = /* @__PURE__ */ new WeakMap(), N = T.createTreeWalker(T, 129);
function ge(e, t) {
	if (!se(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return re === void 0 ? t : re.createHTML(t);
}
var _e = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = O;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === O ? c[1] === "!--" ? o = ue : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = k) : (me.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = k) : o = de : o === k ? c[0] === ">" ? (o = i ?? O, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? k : c[3] === "\"" ? pe : fe) : o === pe || o === fe ? o = k : o === ue || o === de ? o = O : (o = k, i = void 0);
		let d = o === k && e[t + 1].startsWith("/>") ? " " : "";
		a += o === O ? n + oe : l >= 0 ? (r.push(s), n.slice(0, l) + ie + n.slice(l) + w + d) : n + w + (l === -2 ? t : d);
	}
	return [ge(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, ve = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = _e(t, n);
		if (this.el = e.createElement(l, r), N.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = N.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ie)) {
					let t = u[o++], n = i.getAttribute(e).split(w), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Se : r[1] === "?" ? Ce : r[1] === "@" ? we : xe
					}), i.removeAttribute(e);
				} else e.startsWith(w) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (me.test(i.tagName)) {
					let e = i.textContent.split(w), t = e.length - 1;
					if (t > 0) {
						i.textContent = C ? C.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], E()), N.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], E());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ae) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(w, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += w.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = T.createElement("template");
		return n.innerHTML = e, n;
	}
};
function P(e, t, n = e, r) {
	if (t === j) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = D(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = P(e, i._$AS(e, t.values), i, r)), t;
}
var ye = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? T).importNode(t, !0);
		N.currentNode = r;
		let i = N.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new be(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Te(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = N.nextNode(), a++);
		}
		return N.currentNode = T, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, be = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = M, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = P(this, e, t), D(e) ? e === M || e == null || e === "" ? (this._$AH !== M && this._$AR(), this._$AH = M) : e !== this._$AH && e !== j && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ce(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== M && D(this._$AH) ? this._$AA.nextSibling.data = e : this.T(T.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = ve.createElement(ge(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = he.get(e.strings);
		return t === void 0 && he.set(e.strings, t = new ve(e)), t;
	}
	k(t) {
		se(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(E()), this.O(E()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ne(e).nextSibling;
			ne(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, xe = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = M, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = M;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = P(this, e, t, 0), a = !D(e) || e !== this._$AH && e !== j, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = P(this, r[n + o], t, o), s === j && (s = this._$AH[o]), a ||= !D(s) || s !== this._$AH[o], s === M ? e = M : e !== M && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === M ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Se = class extends xe {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === M ? void 0 : e;
	}
}, Ce = class extends xe {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== M);
	}
}, we = class extends xe {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = P(this, e, t, 0) ?? M) === j) return;
		let n = this._$AH, r = e === M && n !== M || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== M && (n === M || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Te = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		P(this, e);
	}
}, Ee = te.litHtmlPolyfillSupport;
Ee?.(ve, be), (te.litHtmlVersions ??= []).push("3.3.3");
var De = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new be(t.insertBefore(E(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Oe = globalThis, F = class extends S {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = De(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return j;
	}
};
F._$litElement$ = !0, F.finalized = !0, Oe.litElementHydrateSupport?.({ LitElement: F });
var ke = Oe.litElementPolyfillSupport;
ke?.({ LitElement: F }), (Oe.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/styles/shared.ts
var Ae = o`
  :host {
    display: block;
    color: var(--auralis-text);
    font-family: var(--ha-font-family, Inter, ui-sans-serif, system-ui, sans-serif);
    --auralis-radius-xl: 28px;
    --auralis-radius-lg: 20px;
    --auralis-radius-md: 14px;
    --auralis-shadow: 0 18px 48px rgba(22, 30, 42, 0.1);
    --auralis-bg: #eef3f9;
    --auralis-card: rgba(255, 255, 255, 0.88);
    --auralis-layer: rgba(245, 248, 252, 0.92);
    --auralis-text: #132039;
    --auralis-muted: #6b7689;
    --auralis-border: rgba(81, 97, 122, 0.12);
    --auralis-info: #4388e8;
    --auralis-healthy: #32b879;
    --auralis-active: #f1ae31;
    --auralis-danger: #df5f67;
    --auralis-accent-soft: rgba(67, 136, 232, 0.12);
  }

  :host([data-theme="carbon"]) {
    --auralis-bg: #10151c;
    --auralis-card: #18202a;
    --auralis-layer: #202a36;
    --auralis-text: #f4f7fb;
    --auralis-muted: #a7b1c0;
    --auralis-border: rgba(255, 255, 255, 0.09);
    --auralis-info: #3d9cff;
    --auralis-healthy: #6ce896;
    --auralis-active: #ffc45f;
    --auralis-danger: #ff7b84;
    --auralis-accent-soft: rgba(61, 156, 255, 0.14);
    --auralis-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  }

  :host([data-theme="mono"]) {
    --auralis-bg: #090909;
    --auralis-card: #111;
    --auralis-layer: #171717;
    --auralis-text: #fafafa;
    --auralis-muted: #a4a4a4;
    --auralis-border: rgba(255, 255, 255, 0.13);
    --auralis-info: #f5f5f5;
    --auralis-healthy: #65dca2;
    --auralis-active: #f4bd5e;
    --auralis-danger: #f07378;
    --auralis-accent-soft: rgba(255, 255, 255, 0.08);
    --auralis-shadow: none;
  }

  :host([data-theme="aurora"]) {
    --auralis-bg: linear-gradient(145deg, #e8e4ff, #e5f7ff 52%, #def9ee);
    --auralis-card: rgba(255, 255, 255, 0.7);
    --auralis-layer: rgba(255, 255, 255, 0.58);
    --auralis-text: #172347;
    --auralis-muted: #65708c;
    --auralis-border: rgba(72, 88, 135, 0.12);
    --auralis-info: #558af2;
    --auralis-healthy: #38bd91;
    --auralis-active: #886bf1;
    --auralis-danger: #dd657d;
    --auralis-accent-soft: rgba(123, 101, 237, 0.12);
  }

  ha-card {
    position: relative;
    z-index: 0;
    display: block;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid var(--auralis-border);
    border-radius: var(--auralis-radius-xl);
    background: var(--auralis-bg);
    color: var(--auralis-text);
    box-shadow: var(--auralis-shadow);
  }

  .shell {
    position: relative;
    padding: 20px;
    background: var(--auralis-card);
    backdrop-filter: blur(18px);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .header ha-icon {
    --mdc-icon-size: 30px;
    color: var(--auralis-info);
  }

  .title-wrap {
    min-width: 0;
    flex: 1;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-size: 24px;
    line-height: 1.08;
    letter-spacing: -0.04em;
  }

  h3 {
    font-size: 18px;
    letter-spacing: -0.025em;
  }

  .subtitle,
  .muted {
    color: var(--auralis-muted);
    font-size: 13px;
  }

  .status-line {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 5px;
  }

  .dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--auralis-muted);
  }

  .dot.healthy {
    background: var(--auralis-healthy);
  }

  .dot.warning {
    background: var(--auralis-active);
  }

  .dot.danger {
    background: var(--auralis-danger);
  }

  button,
  input {
    font: inherit;
  }

  button {
    color: inherit;
  }

  .icon-button,
  .action,
  .pill,
  .link-button {
    border: 0;
    cursor: pointer;
  }

  .icon-button {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border: 1px solid var(--auralis-border);
    border-radius: 13px;
    background: var(--auralis-layer);
  }

  .icon-button:hover,
  .action:hover,
  .pill:hover,
  .list-row:hover {
    filter: brightness(0.97);
  }

  .grid {
    display: grid;
    gap: 10px;
  }

  .grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tile {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--auralis-border);
    border-radius: var(--auralis-radius-lg);
    background: var(--auralis-layer);
  }

  .tile.clickable {
    cursor: pointer;
  }

  .tile-head,
  .row-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .tile-icon {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border-radius: 13px;
    background: var(--auralis-accent-soft);
    color: var(--auralis-info);
  }

  .big-value {
    font-size: 28px;
    font-weight: 720;
    letter-spacing: -0.055em;
  }

  .progress {
    height: 7px;
    overflow: hidden;
    margin-top: 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--auralis-muted) 18%, transparent);
  }

  .progress > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--auralis-healthy);
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
    gap: 9px;
    margin-top: 12px;
  }

  .action,
  .pill {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--auralis-border);
    border-radius: var(--auralis-radius-md);
    background: var(--auralis-layer);
    font-size: 13px;
    font-weight: 650;
  }

  .action.primary {
    border-color: color-mix(in srgb, var(--auralis-healthy) 45%, transparent);
    background: color-mix(in srgb, var(--auralis-healthy) 13%, var(--auralis-layer));
    color: var(--auralis-healthy);
  }

  .action.danger {
    border-color: color-mix(in srgb, var(--auralis-danger) 46%, transparent);
    background: color-mix(in srgb, var(--auralis-danger) 9%, var(--auralis-layer));
    color: var(--auralis-danger);
  }

  .action[disabled],
  .icon-button[disabled] {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .link-button {
    width: 100%;
    padding: 15px 2px 5px;
    background: transparent;
    color: var(--auralis-text);
    text-align: left;
    font-weight: 650;
  }

  .dialog-backdrop {
    position: fixed;
    z-index: 999;
    inset: 0;
    display: grid;
    align-items: end;
    justify-items: center;
    padding: 20px;
    background: rgba(5, 10, 20, 0.46);
    backdrop-filter: blur(8px);
    --auralis-bg: #0b1118;
    --auralis-card: #101923;
    --auralis-layer: #17222e;
    --auralis-text: #f4f8fc;
    --auralis-muted: #93a2b5;
    --auralis-border: rgba(169, 190, 214, 0.16);
    --auralis-info: #72a5ff;
    --auralis-healthy: #54d7a4;
    --auralis-active: #ffb64d;
    --auralis-danger: #ff727c;
    color: var(--auralis-text);
  }

  .dialog {
    width: min(720px, calc(100vw - 24px));
    max-height: min(820px, calc(100vh - 32px));
    overflow: auto;
    border: 1px solid var(--auralis-border);
    border-radius: 30px;
    background:
      radial-gradient(circle at 8% 0%, rgba(77, 132, 185, 0.14), transparent 35%),
      var(--auralis-bg);
    color: var(--auralis-text);
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.28);
  }

  .dialog-header {
    position: sticky;
    z-index: 2;
    top: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--auralis-border);
    background: color-mix(in srgb, var(--auralis-bg) 92%, transparent);
    backdrop-filter: blur(16px);
  }

  .dialog-body {
    padding: 16px 20px 20px;
  }

  .dialog-overview {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid var(--auralis-border);
    border-radius: 20px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.015));
  }

  .dialog-overview .eyebrow,
  .dialog-section-title {
    color: var(--auralis-muted);
    font-size: 10px;
    font-weight: 760;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .dialog-overview strong {
    display: block;
    margin-top: 5px;
    font-size: 18px;
    letter-spacing: -0.025em;
  }

  .dialog-section {
    margin-top: 18px;
  }

  .dialog-section-title {
    margin: 0 2px 9px;
  }

  .dialog-stat {
    min-width: 74px;
    padding: 10px 12px;
    border: 1px solid var(--auralis-border);
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.035);
    text-align: center;
  }

  .dialog-stat strong {
    margin: 0;
    font-size: 18px;
  }

  .dialog-stat small {
    display: block;
    margin-top: 3px;
    color: var(--auralis-muted);
  }

  .dialog-danger-zone {
    padding: 14px;
    margin-top: 18px;
    border: 1px solid color-mix(in srgb, var(--auralis-danger) 32%, transparent);
    border-radius: 18px;
    background: color-mix(in srgb, var(--auralis-danger) 6%, transparent);
  }

  .tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    margin-bottom: 14px;
    border-radius: 16px;
    background: var(--auralis-layer);
  }

  .tabs button {
    padding: 10px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    font-weight: 650;
  }

  .tabs button.active {
    background: var(--auralis-card);
    box-shadow: 0 4px 16px rgba(15, 24, 38, 0.08);
  }

  .list {
    display: grid;
    gap: 8px;
  }

  .list-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--auralis-border);
    border-radius: 16px;
    background: var(--auralis-layer);
  }

  .list-row input[type="checkbox"] {
    width: 19px;
    height: 19px;
    accent-color: var(--auralis-healthy);
  }

  .list-row .meta {
    min-width: 0;
  }

  .list-row .name {
    overflow: hidden;
    font-weight: 680;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .list-row .state {
    margin-top: 3px;
    color: var(--auralis-muted);
    font-size: 12px;
  }

  .range {
    width: 100%;
    accent-color: var(--auralis-info);
  }

  .sticky-actions {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid var(--auralis-border);
    background: color-mix(in srgb, var(--auralis-bg) 94%, transparent);
    backdrop-filter: blur(16px);
  }

  .empty {
    padding: 28px 12px;
    color: var(--auralis-muted);
    text-align: center;
  }

  .machine-shell {
    --machine-accent: #7898ff;
    position: relative;
    min-height: 530px;
    overflow: hidden;
    padding: 18px;
    border-radius: inherit;
    background: var(--machine-base-background, #090d12);
    color: #f7f9fc;
    container-type: inline-size;
  }

  .machine-shell::before {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(180deg, rgba(3, 6, 10, 0.2), rgba(3, 6, 10, 0.08) 42%, rgba(3, 6, 10, 0.82) 76%),
      var(--machine-image, none);
    background-position: var(--machine-image-position, center);
    background-size: cover;
    filter: brightness(var(--machine-image-brightness, 0.72)) saturate(0.9);
    opacity: var(--machine-image-opacity, 1);
    content: "";
    pointer-events: none;
  }

  .machine-shell::after {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 15% 18%, color-mix(in srgb, var(--machine-accent) 15%, transparent), transparent 30%);
    content: "";
    pointer-events: none;
  }

  .machine-shell.show-grid::after {
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px) 0 0 / 32px 32px,
      radial-gradient(circle at 15% 18%, color-mix(in srgb, var(--machine-accent) 15%, transparent), transparent 30%);
  }

  .machine-content {
    position: relative;
    z-index: 1;
    display: flex;
    min-height: 530px;
    flex-direction: column;
  }

  .machine-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding-right: 58px;
  }

  .machine-header h2 {
    color: white;
    font-size: 23px;
    letter-spacing: -0.04em;
  }

  .machine-status {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    color: #c7d0dc;
    font-size: 11px;
  }

  .machine-status .dot {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--auralis-healthy) 14%, transparent);
  }

  .machine-rail {
    position: absolute;
    z-index: 2;
    top: 0;
    right: 0;
    display: grid;
    width: 48px;
    overflow: hidden;
    border: 1px solid rgba(195, 211, 229, 0.18);
    border-radius: 18px;
    background: rgba(10, 14, 20, var(--machine-glass-alpha, 0.84));
    backdrop-filter: blur(12px);
  }

  .rail-button {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border: 0;
    border-bottom: 1px solid rgba(195, 211, 229, 0.1);
    background: transparent;
    color: #bbc7d4;
    cursor: pointer;
  }

  .rail-button:first-child {
    background: var(--machine-accent);
    color: #071018;
  }

  .rail-button:last-child {
    border-bottom: 0;
  }

  .rail-button ha-icon {
    --mdc-icon-size: 19px;
  }

  .machine-stat-stack {
    position: absolute;
    top: 0;
    right: 58px;
    display: grid;
    gap: 7px;
  }

  .machine-mini-stat {
    width: 62px;
    padding: 9px 8px;
    border: 1px solid rgba(195, 211, 229, 0.16);
    border-radius: 15px;
    background: rgba(9, 14, 20, var(--machine-glass-alpha, 0.84));
    text-align: right;
    backdrop-filter: blur(10px);
  }

  .machine-mini-stat small {
    display: block;
    color: #91a0b2;
    font-size: 9px;
  }

  .machine-mini-stat strong {
    display: block;
    margin-top: 4px;
    font-size: 13px;
  }

  .machine-gauge {
    --value: 0;
    display: grid;
    width: 88px;
    aspect-ratio: 1;
    margin-top: 48px;
    place-items: center;
    border-radius: 50%;
    background: conic-gradient(var(--machine-accent) calc(var(--value) * 1%), rgba(255, 255, 255, 0.12) 0);
    box-shadow: 0 0 0 7px rgba(8, 12, 18, 0.88), 0 0 0 9px rgba(195, 211, 229, 0.16);
  }

  .machine-gauge::before {
    grid-area: 1 / 1;
    width: 68px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: rgba(11, 16, 23, 0.94);
    content: "";
  }

  .machine-gauge-content {
    z-index: 1;
    grid-area: 1 / 1;
    text-align: center;
  }

  .machine-gauge-content strong {
    display: block;
    font-size: 22px;
    letter-spacing: -0.05em;
  }

  .machine-gauge-content small {
    display: block;
    margin-top: 2px;
    color: #aab6c4;
    font-size: 9px;
  }

  .machine-context {
    align-self: flex-start;
    max-width: calc(100% - 38px);
    padding: 12px 13px;
    margin-top: 18px;
    border: 1px solid rgba(195, 211, 229, 0.16);
    border-radius: 16px;
    background: rgba(10, 14, 20, var(--machine-glass-alpha, 0.84));
    backdrop-filter: blur(12px);
  }

  .machine-context small {
    display: block;
    color: #91a0b2;
    font-size: 9px;
  }

  .machine-context strong {
    display: block;
    overflow: hidden;
    margin-top: 7px;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .machine-panel {
    padding: 15px;
    margin-top: auto;
    border: 1px solid rgba(195, 211, 229, 0.18);
    border-radius: 22px;
    background: rgba(9, 14, 20, var(--machine-glass-alpha, 0.84));
    backdrop-filter: blur(14px);
  }

  .machine-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .machine-panel-title small {
    color: #8f9daf;
    font-size: 9px;
    font-weight: 760;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .machine-panel-title strong {
    display: block;
    margin-top: 8px;
    font-size: 13px;
  }

  .machine-accent-action {
    display: flex;
    min-height: 40px;
    align-items: center;
    gap: 7px;
    padding: 0 12px;
    border: 0;
    border-radius: 13px;
    background: var(--machine-accent);
    color: #071018;
    cursor: pointer;
    font-size: 11px;
    font-weight: 740;
  }

  .machine-accent-action ha-icon {
    --mdc-icon-size: 17px;
  }

  .machine-bars {
    display: grid;
    gap: 11px;
    margin-top: 16px;
  }

  .machine-bar {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) 38px;
    align-items: center;
    gap: 8px;
    color: #aeb9c7;
    font-size: 9px;
  }

  .machine-bar .track {
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.13);
  }

  .machine-bar .track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--machine-accent);
  }

  .machine-bar strong {
    color: #f4f7fb;
    font-size: 9px;
    text-align: right;
  }

  .machine-foot {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 18px;
    color: #9ba8b7;
    font-size: 9px;
  }

  .machine-foot strong {
    color: #f4f7fb;
  }

  @container (max-width: 290px) {
    .machine-shell {
      padding: 14px;
    }

    .machine-stat-stack {
      display: none;
    }

    .machine-gauge {
      margin-top: 36px;
    }
  }

  @media (min-width: 700px) {
    .dialog-backdrop {
      align-items: center;
    }
  }

  @media (max-width: 480px) {
    .shell,
    .dialog-body {
      padding: 15px;
    }

    .dialog-backdrop {
      padding: 0;
    }

    .dialog {
      width: 100vw;
      max-height: 92vh;
      border-radius: 26px 26px 0 0;
    }

    .list-row {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .list-row > .action {
      grid-column: 2;
    }
  }
`, I = class extends F {
	constructor(...e) {
		super(...e), this.dialog = null, this.confirmState = null;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			config: { state: !0 },
			dialog: { state: !0 },
			confirmState: { state: !0 }
		};
	}
	static {
		this.styles = Ae;
	}
	get theme() {
		let e = this.config?.theme || "auto";
		return e === "auto" ? this.hass?.themes?.darkMode ? "carbon" : "halo" : e;
	}
	syncTheme() {
		this.dataset.theme = this.theme;
	}
	machineStyle(e) {
		let t = this.config?.background_image?.replaceAll("\\", "\\\\").replaceAll("\"", "\\\""), n = this.config?.accent_color?.trim(), r = n && !/[;{}]/.test(n) ? n : e, i = this.config?.background_position?.trim(), a = i && /^[\w\s.%+-]+$/.test(i) ? i : "center", o = Math.min(100, Math.max(30, Number(this.config?.image_brightness ?? 72))) / 100, s = Number(this.config?.image_opacity ?? 100), c = Number.isFinite(s) ? Math.min(100, Math.max(0, s)) / 100 : 1, l = Math.min(.96, Math.max(.45, Number(this.config?.glass_opacity ?? .84))), u = this.config?.card_background?.mode, d = (u === "gradient" ? this.config?.card_background?.gradient : this.config?.card_background?.color)?.trim(), f = (d && !/[;{}]/.test(d) ? d : void 0) || (u === "solid" || u === "grid" ? "#090d12" : "radial-gradient(circle at 70% 38%, #27354a, #111924 44%, #080c11 75%)");
		return [
			t ? `--machine-image:url("${t}")` : "",
			`--machine-accent:${r}`,
			`--machine-image-position:${a}`,
			`--machine-image-brightness:${o}`,
			`--machine-image-opacity:${c}`,
			`--machine-glass-alpha:${l}`,
			`--machine-base-background:${f}`
		].filter(Boolean).join(";");
	}
	machineGridClass() {
		let e = this.config?.card_background?.mode === "grid";
		return this.config?.show_grid ?? e ? "show-grid" : "";
	}
	updated() {
		this.syncTheme();
	}
	openDialog(e) {
		this.dialog = e;
	}
	closeDialog() {
		this.dialog = null, this.confirmState = null;
	}
	askConfirmation(e) {
		this.confirmState = e;
	}
	async runConfirmation() {
		let e = this.confirmState;
		this.confirmState = null, e && await e.action();
	}
	renderDialog(e, t, n, r = "") {
		return A`
      <div class="dialog-backdrop" @click=${(e) => e.target === e.currentTarget && this.closeDialog()}>
        <section class="dialog ${r}" role="dialog" aria-modal="true" aria-label=${e}>
          <header class="dialog-header">
            <span class="tile-icon"><ha-icon .icon=${t}></ha-icon></span>
            <div class="title-wrap"><h2>${e}</h2></div>
            <button class="icon-button" aria-label="Fermer" @click=${this.closeDialog}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </header>
          ${n}
        </section>
        ${this.confirmState ? this.renderConfirmation() : null}
      </div>
    `;
	}
	renderConfirmation() {
		let e = this.confirmState;
		return A`
      <section class="dialog" role="alertdialog" aria-modal="true" style="position:fixed;max-width:430px;">
        <header class="dialog-header"><h2>${e.title}</h2></header>
        <div class="dialog-body">
          <p class="muted" style="font-size:14px;line-height:1.5;">${e.message}</p>
          <div class="actions" style="margin-top:18px;grid-template-columns:1fr 1fr;">
            <button class="action" @click=${() => this.confirmState = null}>Annuler</button>
            <button class="action danger" @click=${this.runConfirmation}>${e.confirmLabel}</button>
          </div>
        </div>
      </section>
    `;
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			rows: 6,
			min_rows: 4,
			columns: 6,
			min_columns: 3
		};
	}
}, je = /* @__PURE__ */ new Set([
	"on",
	"open",
	"opening",
	"playing",
	"running",
	"starting",
	"active",
	"online",
	"ok",
	"home",
	"heat",
	"cool"
]);
function L(e, t) {
	return t && e ? e.states[t] : void 0;
}
function R(e) {
	return !!(e && e.state !== "unknown" && e.state !== "unavailable");
}
function z(e) {
	return !!(e && je.has(e.state.toLowerCase()));
}
function Me(e, t = "Appareil") {
	return e?.attributes.friendly_name || t;
}
function B(e, t = 0) {
	if (!e) return t;
	let n = Number.parseFloat(e.state.replace(",", "."));
	return Number.isFinite(n) ? n : t;
}
function V(e, t = 0, n = 100) {
	return Math.min(n, Math.max(t, e));
}
function H(e, t, n = "—") {
	let r = L(e, t);
	if (!r || !R(r)) return n;
	if (e?.formatEntityState) return e.formatEntityState(r);
	let i = r.attributes.unit_of_measurement;
	return `${r.state}${i ? ` ${i}` : ""}`;
}
function Ne(e) {
	let t = e?.attributes.current_position;
	return typeof t == "number" ? V(t) : void 0;
}
function Pe(e) {
	let t = e?.attributes.brightness;
	return typeof t == "number" ? Math.round(t / 255 * 100) : z(e) ? 100 : 0;
}
function Fe(e) {
	let t = e?.attributes.rgb_color;
	if (!Array.isArray(t) || t.length < 3) return;
	let n = t.slice(0, 3).map((e) => V(Number(e), 0, 255));
	return n.every(Number.isFinite) ? [
		Math.round(n[0]),
		Math.round(n[1]),
		Math.round(n[2])
	] : void 0;
}
function Ie(e) {
	if (Fe(e)) return !0;
	let t = e?.attributes.supported_color_modes;
	return Array.isArray(t) && t.some((e) => [
		"hs",
		"rgb",
		"rgbw",
		"rgbww",
		"xy"
	].includes(e));
}
function Le(e, t = "#ffd166") {
	return e ? `#${e.map((e) => Math.round(V(e, 0, 255)).toString(16).padStart(2, "0")).join("")}` : t;
}
function Re(e) {
	let t = /^#([0-9a-f]{6})$/i.exec(e.trim());
	if (!t) return;
	let n = Number.parseInt(t[1], 16);
	return [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	];
}
function ze(e) {
	let t = e.filter((e) => typeof e == "number");
	if (!t.length) return "—";
	let n = Math.round(Math.min(...t)), r = Math.round(Math.max(...t));
	return n === r ? `${n} %` : `${n}–${r} %`;
}
function Be(e) {
	return e?.split(".")[0] || "";
}
//#endregion
//#region src/utils/actions.ts
async function U(e, t) {
	if (!t) return;
	let n = Be(t);
	if (n === "button" || n === "input_button") {
		await e.callService(n, "press", {}, { entity_id: t });
		return;
	}
	if (n === "script") {
		await e.callService("script", "turn_on", {}, { entity_id: t });
		return;
	}
	if (n === "scene") {
		await e.callService("scene", "turn_on", {}, { entity_id: t });
		return;
	}
	await e.callService("homeassistant", "turn_on", {}, { entity_id: t });
}
async function Ve(e, t) {
	t && await e.callService("homeassistant", "turn_off", {}, { entity_id: t });
}
async function He(e, t, n) {
	await e.callService("light", "turn_on", { brightness_pct: Math.round(n) }, { entity_id: t });
}
async function Ue(e, t, n) {
	let r = Re(n);
	t.length && r && await e.callService("light", "turn_on", { rgb_color: r }, { entity_id: t });
}
async function W(e, t, n) {
	t.length && await e.callService("cover", `${n}_cover`, {}, { entity_id: t });
}
function We(e, t) {
	t && e.dispatchEvent(new CustomEvent("hass-more-info", {
		bubbles: !0,
		composed: !0,
		detail: { entityId: t }
	}));
}
//#endregion
//#region src/cards/auralis-room-card.ts
var Ge = class extends I {
	constructor(...e) {
		super(...e), this.historyGraphConfigs = /* @__PURE__ */ new Map(), this.selectedMediaKind = "media", this.toggleAllLights = async () => {
			let e = this.config?.lights || [], t = e.some((e) => z(L(this.hass, e)));
			await this.hass?.callService("light", t ? "turn_off" : "turn_on", {}, { entity_id: e });
		};
	}
	static {
		this.styles = [I.styles, o`
      .room-shell {
        container-type: inline-size;
        background:
          radial-gradient(circle at 50% 34%, color-mix(in srgb, var(--auralis-active) 5%, transparent), transparent 45%),
          var(--auralis-card);
      }

      .room-auralis {
        position: relative;
        display: grid;
        width: min(310px, 100%);
        aspect-ratio: 1;
        margin: -5px auto 4px;
        place-items: center;
      }

      .auralis-shapes {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        filter: drop-shadow(0 10px 22px rgba(38, 67, 104, 0.07));
      }

      .auralis-segment {
        stroke-width: 1.15;
        transition: filter 160ms ease, opacity 160ms ease;
      }

      .auralis-segment:hover {
        filter: brightness(0.985) saturate(1.08);
      }

      .segment-light {
        fill: url(#auralis-light-gradient);
        stroke: color-mix(in srgb, var(--auralis-active) 52%, transparent);
      }

      .segment-cover {
        fill: url(#auralis-cover-gradient);
        stroke: color-mix(in srgb, var(--auralis-info) 42%, transparent);
      }

      .segment-climate {
        fill: url(#auralis-neutral-gradient);
        stroke: var(--auralis-border);
      }

      .segment-humidity {
        fill: url(#auralis-humidity-gradient);
        stroke: color-mix(in srgb, var(--auralis-healthy) 36%, transparent);
      }

      .auralis-center {
        position: absolute;
        z-index: 3;
        display: grid;
        width: 43%;
        aspect-ratio: 1;
        place-content: center;
        border: 5px solid color-mix(in srgb, var(--auralis-card) 80%, transparent);
        border-radius: 50%;
        background: color-mix(in srgb, var(--auralis-card) 94%, transparent);
        color: var(--auralis-text);
        text-align: center;
        box-shadow: 0 12px 32px rgba(20, 35, 60, 0.09);
        cursor: pointer;
        backdrop-filter: blur(12px);
      }

      .auralis-center ha-icon {
        --mdc-icon-size: 37px;
        color: color-mix(in srgb, var(--auralis-text) 56%, var(--auralis-muted));
      }

      .center-state {
        margin-top: 4px;
        color: var(--auralis-muted);
        font-size: 12px;
      }

      .sector-button {
        position: absolute;
        z-index: 4;
        display: grid;
        min-width: 0;
        padding: 0;
        place-content: center;
        border: 0;
        background: transparent;
        color: var(--auralis-text);
        cursor: pointer;
        font: inherit;
        text-align: center;
        overflow: hidden;
      }

      .sector-button.top {
        top: 5%;
        left: 50%;
        width: 42%;
        height: 30%;
        transform: translateX(-50%);
      }

      .sector-button.right {
        top: 50%;
        right: 1%;
        width: 32%;
        height: 42%;
        transform: translateY(-50%);
      }

      .sector-button.bottom {
        bottom: 3%;
        left: 50%;
        width: 44%;
        height: 31%;
        transform: translateX(-50%);
      }

      .sector-button.left {
        top: 50%;
        left: 1%;
        width: 32%;
        height: 42%;
        transform: translateY(-50%);
      }

      .sector-button ha-icon {
        --mdc-icon-size: 30px;
        justify-self: center;
        margin-bottom: 3px;
      }

      .sector-button.top ha-icon {
        color: var(--auralis-active);
      }

      .sector-button.left ha-icon {
        color: var(--auralis-info);
      }

      .sector-button.right ha-icon {
        color: color-mix(in srgb, var(--auralis-info) 38%, var(--auralis-muted));
      }

      .sector-button.bottom ha-icon {
        color: var(--auralis-healthy);
      }

      .sector-name {
        display: block;
        max-width: 100%;
        justify-self: center;
        overflow: hidden;
        font-size: 13px;
        font-weight: 750;
        line-height: 1.12;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sector-value {
        display: block;
        max-width: 100%;
        margin-top: 2px;
        justify-self: center;
        overflow: hidden;
        color: var(--auralis-muted);
        font-size: 11px;
        line-height: 1.15;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sector-metric {
        display: block;
        max-width: 100%;
        justify-self: center;
        overflow: hidden;
        font-size: 17px;
        font-weight: 760;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sector-badge {
        position: absolute;
        top: 11px;
        right: 20px;
        display: grid;
        min-width: 21px;
        height: 21px;
        padding: 0 3px;
        place-items: center;
        border-radius: 999px;
        background: color-mix(in srgb, var(--auralis-info) 15%, var(--auralis-card));
        color: var(--auralis-text);
        font-size: 11px;
        font-weight: 800;
      }

      .sector-button.top .sector-badge {
        background: color-mix(in srgb, var(--auralis-active) 22%, var(--auralis-card));
      }

      .room-summary {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 8px;
        padding: 11px 3px;
        border-top: 1px solid var(--auralis-border);
        border-bottom: 1px solid var(--auralis-border);
        color: var(--auralis-muted);
        font-size: 11px;
      }

      .room-summary ha-icon {
        flex: 0 0 auto;
        --mdc-icon-size: 22px;
        color: var(--auralis-info);
      }

      .room-summary span {
        min-width: 0;
        white-space: nowrap;
      }

      .room-summary span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .summary-separator {
        color: color-mix(in srgb, var(--auralis-muted) 35%, transparent);
      }

      .group-bar {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }

      .cover-device-row {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .cover-device-actions {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .cover-device-actions .action {
        min-height: 40px;
        padding: 8px 10px;
      }

      .history-graphs {
        display: grid;
        gap: 14px;
        margin-top: 14px;
      }

      hui-card.history-graph {
        display: block;
        min-width: 0;
        --ha-card-background: var(--auralis-layer);
        --ha-card-border-color: var(--auralis-border);
        --ha-card-border-radius: 18px;
        --ha-card-box-shadow: none;
      }

      .light-master-bar {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .light-master-bar.single {
        grid-template-columns: 1fr;
      }

      .light-master-button,
      .global-color-control {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-height: 44px;
        padding: 9px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        background: var(--auralis-layer);
        color: var(--auralis-text);
        cursor: pointer;
      }

      .light-master-button ha-icon {
        --mdc-icon-size: 20px;
      }

      .light-master-button.all-on {
        border-color: color-mix(in srgb, var(--auralis-active) 48%, var(--auralis-border));
        background: color-mix(in srgb, var(--auralis-active) 16%, var(--auralis-layer));
      }

      .light-master-button.all-off {
        border-color: color-mix(in srgb, var(--auralis-danger) 42%, var(--auralis-border));
        color: color-mix(in srgb, var(--auralis-danger) 78%, var(--auralis-text));
      }

      .global-color-control {
        justify-content: flex-start;
      }

      .global-color-control span {
        display: grid;
        min-width: 0;
      }

      .global-color-control small {
        overflow: hidden;
        color: var(--auralis-muted);
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .color-picker {
        width: 34px;
        height: 34px;
        flex: 0 0 auto;
        padding: 2px;
        border: 1px solid var(--auralis-border);
        border-radius: 11px;
        background: var(--auralis-layer);
        cursor: pointer;
      }

      .color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      .color-picker::-webkit-color-swatch {
        border: 0;
        border-radius: 8px;
      }

      .color-picker::-moz-color-swatch {
        border: 0;
        border-radius: 8px;
      }

      .light-setting-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        margin-top: 5px;
      }

      .light-status-icon {
        transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease;
      }

      .light-status-icon.on {
        background: color-mix(in srgb, var(--light-status-color, #ffd166) 24%, var(--auralis-layer));
        color: var(--light-status-color, #ffd166);
        box-shadow: 0 0 18px color-mix(in srgb, var(--light-status-color, #ffd166) 34%, transparent);
      }

      .light-slider {
        --range-value: 0%;
        height: 5px;
        appearance: none;
        border-radius: 999px;
        outline: none;
        background: linear-gradient(
          to right,
          var(--auralis-active) 0 var(--range-value),
          color-mix(in srgb, var(--auralis-muted) 18%, transparent) var(--range-value) 100%
        );
      }

      .light-slider::-webkit-slider-thumb {
        width: 18px;
        height: 18px;
        appearance: none;
        border: 1px solid var(--auralis-border);
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.16);
        cursor: pointer;
      }

      .light-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border: 1px solid var(--auralis-border);
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.16);
        cursor: pointer;
      }

      .device-toggle {
        position: relative;
        width: 44px;
        height: 26px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: color-mix(in srgb, var(--auralis-muted) 30%, transparent);
        cursor: pointer;
        transition: background 160ms ease;
      }

      .device-toggle::after {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        content: "";
        transition: transform 160ms ease;
      }

      .device-toggle.on {
        background: var(--auralis-active);
      }

      .device-toggle.on::after {
        transform: translateX(18px);
      }

      .cinema-shell {
        container-type: inline-size;
        padding: 16px;
        overflow: hidden;
        border-radius: inherit;
        background:
          radial-gradient(circle at 12% 0%, rgba(58, 126, 172, 0.17), transparent 36%),
          #0d151d;
        color: #f4f8fc;
      }

      .cinema-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .room-avatar {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 14px;
        background: rgba(73, 184, 222, 0.14);
        color: #79d6f2;
      }

      .room-avatar ha-icon {
        --mdc-icon-size: 21px;
      }

      .cinema-title {
        min-width: 0;
        flex: 1;
      }

      .room-title-button {
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        text-align: left;
      }

      .cinema-title h2 {
        overflow: hidden;
        color: #f7f9fc;
        font-size: 20px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cinema-title p {
        overflow: hidden;
        margin-top: 3px;
        color: #91a3b7;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .climate-pills {
        display: flex;
        flex: 0 0 auto;
        gap: 7px;
      }

      .climate-pill {
        display: flex;
        min-width: 68px;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 11px;
        border: 0;
        border-radius: 14px;
        background: #17222e;
        color: #f7f9fc;
        cursor: pointer;
        font-size: 14px;
        font-weight: 760;
      }

      .climate-pill ha-icon {
        --mdc-icon-size: 17px;
        color: #b9c6d5;
      }

      .cinema-body {
        display: grid;
        grid-template-columns: 54px minmax(0, 1fr) 54px;
        align-items: stretch;
        gap: 10px;
      }

      .side-control-column {
        display: flex;
        min-width: 0;
        min-height: 180px;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
      }

      .side-control-column.left {
        grid-column: 1;
      }

      .side-control-column.right {
        grid-column: 3;
      }

      .side-control-column.dual .side-control {
        flex: 1 1 0;
      }

      .side-control {
        display: flex;
        width: 100%;
        min-height: 70px;
        min-width: 0;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 4px;
        padding: 6px 2px;
        border: 0;
        border-radius: 16px;
        background: transparent;
        color: #f3f6fa;
        cursor: pointer;
        text-align: center;
      }

      .side-control:hover {
        background: rgba(255, 255, 255, 0.045);
      }

      .side-control[disabled] {
        cursor: default;
        opacity: 0.42;
      }

      .side-control ha-icon {
        --mdc-icon-size: 19px;
        color: #b9c6d5;
      }

      .side-control.active ha-icon {
        color: var(--room-accent, #79d6f2);
        filter: drop-shadow(0 0 7px color-mix(in srgb, var(--room-accent, #79d6f2) 55%, transparent));
      }

      .side-control strong {
        width: 100%;
        overflow: hidden;
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .side-control small {
        width: 100%;
        overflow: hidden;
        color: #8495a9;
        font-size: 9px;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .room-photo {
        position: relative;
        min-height: 180px;
        overflow: hidden;
        border: 1px solid rgba(185, 205, 226, 0.14);
        border-radius: 20px;
        background-image:
          linear-gradient(180deg, rgba(5, 9, 14, 0.05), rgba(5, 9, 14, 0.32)),
          var(--room-image, linear-gradient(135deg, #3a2b23, #172432 62%, #0d141c));
        background-position: center;
        background-size: cover;
        box-shadow: inset 0 -45px 70px rgba(0, 0, 0, 0.24);
      }

      .room-photo::before {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 24% 35%, rgba(255, 171, 73, 0.24), transparent 30%),
          linear-gradient(115deg, transparent 45%, rgba(38, 116, 156, 0.16));
        content: "";
        pointer-events: none;
      }

      .scene-chip {
        display: flex;
        min-height: 34px;
        align-items: center;
        gap: 7px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(13, 18, 25, 0.72);
        color: white;
        cursor: pointer;
        font-size: 11px;
        font-weight: 680;
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .scene-chip[disabled] {
        cursor: default;
        opacity: 0.72;
      }

      .scene-chip ha-icon {
        --mdc-icon-size: 17px;
      }

      .photo-overlay-slot {
        position: absolute;
        z-index: 2;
        display: flex;
        max-width: calc(100% - 24px);
        flex-direction: column;
        gap: 7px;
        pointer-events: none;
      }

      .photo-overlay-slot.top-left {
        top: 12px;
        left: 12px;
        align-items: flex-start;
      }

      .photo-overlay-slot.top-right {
        top: 12px;
        right: 12px;
        align-items: flex-end;
      }

      .photo-overlay-slot.bottom-left {
        bottom: 12px;
        left: 12px;
        align-items: flex-start;
      }

      .photo-overlay-slot.bottom-right {
        right: 12px;
        bottom: 12px;
        align-items: flex-end;
      }

      .thermostat-control {
        display: grid;
        min-width: 132px;
        padding: 7px 9px;
        border: 1px solid var(--thermostat-border, rgba(255, 255, 255, 0.16));
        border-radius: 15px;
        background: var(--thermostat-background, rgba(13, 18, 25, 0.76));
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .thermostat-control.no-border {
        border-color: transparent;
      }

      .thermostat-control.no-background {
        background: transparent;
        backdrop-filter: none;
      }

      .thermostat-label {
        overflow: hidden;
        margin-bottom: 3px;
        color: var(--thermostat-label, rgba(255, 255, 255, 0.72));
        font-size: 9px;
        font-weight: 650;
        letter-spacing: 0.02em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .thermostat-row {
        display: grid;
        grid-template-columns: 28px minmax(58px, 1fr) 28px;
        align-items: center;
      }

      .thermostat-step,
      .thermostat-value {
        min-height: 28px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      .thermostat-step {
        color: var(--thermostat-button, #ffd166);
        font-size: 24px;
        font-weight: 520;
        line-height: 1;
      }

      .thermostat-value {
        color: var(--thermostat-value, #ffffff);
        font-size: 23px;
        font-weight: 720;
        letter-spacing: -0.04em;
      }

      .thermostat-step[disabled],
      .thermostat-value[disabled] {
        cursor: default;
        opacity: 0.55;
      }

      .ambiance-dialog {
        width: min(430px, calc(100vw - 24px));
        max-height: min(620px, calc(100vh - 32px));
        border-radius: 25px;
      }

      .ambiance-options {
        display: grid;
        gap: 8px;
      }

      .ambiance-option {
        display: grid;
        width: 100%;
        min-height: 62px;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 17px;
        background: var(--auralis-layer);
        color: var(--auralis-text);
        cursor: pointer;
        text-align: left;
      }

      .ambiance-option:hover {
        border-color: color-mix(in srgb, var(--room-accent, #79d6f2) 45%, var(--auralis-border));
        background: color-mix(in srgb, var(--room-accent, #79d6f2) 8%, var(--auralis-layer));
      }

      .ambiance-option .tile-icon {
        width: 42px;
        height: 42px;
      }

      .ambiance-option-copy {
        display: grid;
        min-width: 0;
        gap: 3px;
      }

      .ambiance-option-copy strong,
      .ambiance-option-copy small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ambiance-option-copy small {
        color: var(--auralis-muted);
        font-size: 11px;
      }

      .ambiance-option > ha-icon {
        --mdc-icon-size: 18px;
        color: var(--auralis-muted);
      }

      .cover-dock {
        display: grid;
        grid-column: 2;
        grid-template-columns: repeat(3, minmax(64px, 1fr));
        width: min(270px, 78%);
        min-height: 50px;
        margin: 8px auto 0;
        overflow: hidden;
        border: 1px solid rgba(185, 205, 226, 0.1);
        border-radius: 16px 16px 0 0;
        background: #17222e;
      }

      .cover-command {
        display: grid;
        place-content: center;
        gap: 3px;
        border: 0;
        background: transparent;
        color: #eaf0f7;
        cursor: pointer;
        font-size: 9px;
      }

      .cover-command:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .cover-command ha-icon {
        --mdc-icon-size: 16px;
        justify-self: center;
        color: #9fcbe0;
      }

      .cover-command.center {
        border-right: 1px solid rgba(185, 205, 226, 0.08);
        border-left: 1px solid rgba(185, 205, 226, 0.08);
      }

      .cinema-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding-top: 11px;
        color: #94a5b8;
        font-size: 10px;
      }

      .cinema-footer span {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 5px;
      }

      .cinema-footer span:last-child {
        justify-content: flex-end;
        text-align: right;
      }

      .cinema-footer ha-icon {
        --mdc-icon-size: 15px;
      }

      .cinema-details {
        display: grid;
        width: 30px;
        height: 30px;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid rgba(185, 205, 226, 0.13);
        border-radius: 11px;
        background: #17222e;
        color: #d8e2ec;
        cursor: pointer;
      }

      @container (max-width: 500px) {
        .cinema-header {
          flex-wrap: wrap;
        }

        .climate-pills {
          width: 100%;
          order: 3;
        }

        .climate-pill {
          flex: 1;
        }

        .cinema-body {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .room-photo {
          grid-column: 1 / -1;
          grid-row: 1;
          min-height: 170px;
        }

        .side-control {
          min-height: 58px;
          flex-direction: row;
          border: 1px solid rgba(185, 205, 226, 0.1);
          background: #131e28;
        }

        .side-control small {
          font-size: 10px;
        }

        .cover-dock {
          grid-column: 1 / -1;
          width: 100%;
          margin-top: 0;
          border-radius: 15px;
        }

        .cinema-footer span:nth-child(2) {
          display: none;
        }
      }

      @container (max-width: 310px) {
        .room-auralis {
          width: 100%;
          margin-top: -2px;
        }

        .sector-button.top {
          top: 4%;
          width: 40%;
        }

        .sector-button.right {
          right: 2.5%;
          width: 29%;
        }

        .sector-button.bottom {
          bottom: 3.5%;
          width: 42%;
        }

        .sector-button.left {
          left: 2.5%;
          width: 29%;
        }

        .sector-button ha-icon {
          --mdc-icon-size: 26px;
          margin-bottom: 2px;
        }

        .sector-name {
          font-size: 12px;
        }

        .sector-value {
          font-size: 10px;
        }

        .sector-button.right .sector-value,
        .sector-button.left .sector-value {
          font-size: 9.5px;
          letter-spacing: -0.02em;
        }

        .sector-metric {
          font-size: 16px;
        }

        .sector-badge {
          top: 9px;
          right: 12px;
        }

        .center-state {
          font-size: 11px;
        }

        .room-summary {
          gap: 6px;
          font-size: 10px;
        }
      }

      :host {
        --room-surface: #f7f8fa;
        --room-layer: #eceff3;
        --room-layer-strong: #e7ebef;
        --room-text: #18212b;
        --room-muted: #6b7582;
        --room-line: rgba(58, 69, 83, 0.12);
        --room-hover: rgba(21, 31, 42, 0.045);
        --room-accent: #79d6f2;
      }

      :host([data-theme="carbon"]),
      :host([data-theme="mono"]) {
        --room-surface: #0d151d;
        --room-layer: #17222e;
        --room-layer-strong: #131e28;
        --room-text: #f4f8fc;
        --room-muted: #91a3b7;
        --room-line: rgba(185, 205, 226, 0.14);
        --room-hover: rgba(255, 255, 255, 0.045);
      }

      .cinema-shell {
        --room-card-surface: var(--room-card-background, var(--room-surface));
        padding: 16px;
        background: var(--room-card-surface);
        color: var(--room-text);
      }

      .cinema-shell.background-grid {
        --room-card-surface: var(--room-card-background, var(--room-surface));
      }

      .cinema-shell.show-grid {
        background:
          linear-gradient(
              90deg,
              color-mix(in srgb, var(--room-text) 3%, transparent) 1px,
              transparent 1px
            )
            0 0 / 32px 32px,
          radial-gradient(
            circle at 88% 10%,
            color-mix(in srgb, var(--room-accent) 9%, transparent),
            transparent 32%
          ),
          var(--room-card-surface);
      }

      .cinema-shell.background-gradient {
        --room-card-surface: var(
          --room-card-background,
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--room-accent) 10%, var(--room-surface)),
            var(--room-surface) 56%,
            color-mix(in srgb, var(--room-text) 5%, var(--room-surface))
          )
        );
      }

      .room-avatar {
        background: color-mix(in srgb, var(--room-accent) 18%, transparent);
        color: color-mix(in srgb, var(--room-accent) 75%, var(--room-text));
      }

      .cinema-title h2 {
        color: var(--room-text);
      }

      .cinema-title p,
      .side-control small {
        color: var(--room-muted);
      }

      .climate-pill,
      .cinema-details {
        background: var(--room-layer);
        color: var(--room-text);
      }

      .climate-pill ha-icon,
      .side-control ha-icon,
      .cinema-details {
        color: color-mix(in srgb, var(--room-text) 68%, var(--room-muted));
      }

      .cinema-body {
        grid-template-columns: 54px minmax(0, 1fr) 54px;
        gap: 6px;
      }

      .side-control {
        color: var(--room-text);
      }

      .side-control:hover {
        background: var(--room-hover);
      }

      .room-photo {
        min-height: 180px;
        border-color: var(--room-line);
        background-position: var(--room-image-position, center);
      }

      .cover-dock {
        width: min(250px, 82%);
        min-height: 48px;
        border-color: var(--room-line);
        background: var(--room-layer);
      }

      .cover-command {
        color: var(--room-text);
      }

      .cover-command:hover {
        background: var(--room-hover);
      }

      .cover-command ha-icon {
        color: color-mix(in srgb, var(--room-accent) 62%, var(--room-text));
      }

      .cover-command.center {
        border-color: var(--room-line);
      }

      @container (max-width: 500px) {
        .cinema-header {
          flex-wrap: nowrap;
        }

        .climate-pills {
          width: auto;
          order: initial;
        }

        .climate-pill {
          flex: 0 1 auto;
          min-width: 61px;
          padding: 0 8px;
        }

        .cinema-body {
          grid-template-columns: 54px minmax(0, 1fr) 54px;
        }

        .room-photo {
          grid-column: auto;
          grid-row: auto;
          min-height: 180px;
        }

        .side-control {
          min-height: 0;
          flex-direction: column;
          border: 0;
          background: transparent;
        }

        .cover-dock {
          grid-column: 2;
          width: min(250px, 82%);
          margin-top: 8px;
          border-radius: 16px 16px 0 0;
        }
      }

      @container (max-width: 320px) {
        .cinema-header {
          flex-wrap: wrap;
        }

        .climate-pills {
          width: 100%;
          order: 3;
        }

        .climate-pill {
          flex: 1;
        }

        .cinema-body {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .room-photo {
          grid-column: 1 / -1;
          grid-row: 1;
          min-height: 170px;
        }

        .side-control {
          min-height: 56px;
          flex-direction: row;
          border: 1px solid var(--room-line);
          background: var(--room-layer-strong);
        }

        .side-control-column {
          grid-row: 2;
          min-height: 56px;
          flex-direction: row;
        }

        .side-control-column.left {
          grid-column: 1;
        }

        .side-control-column.right {
          grid-column: 2;
        }

        .side-control-column .side-control {
          flex: 1 1 0;
        }

        .thermostat-control {
          min-width: 118px;
          padding: 6px 7px;
        }

        .photo-overlay-slot {
          max-width: calc(100% - 16px);
        }

        .photo-overlay-slot.top-left {
          top: 8px;
          left: 8px;
        }

        .photo-overlay-slot.top-right {
          top: 8px;
          right: 8px;
        }

        .photo-overlay-slot.bottom-left {
          bottom: 8px;
          left: 8px;
        }

        .photo-overlay-slot.bottom-right {
          right: 8px;
          bottom: 8px;
        }

        .thermostat-label {
          display: none;
        }

        .thermostat-row {
          grid-template-columns: 26px minmax(52px, 1fr) 26px;
        }

        .thermostat-value {
          font-size: 20px;
        }

        .cover-dock {
          grid-column: 1 / -1;
          grid-row: 3;
          width: 100%;
          margin-top: 0;
          border-radius: 15px;
        }
      }
    `];
	}
	setConfig(e) {
		let t = e.lights || [], n = e.covers || [];
		if (!t.length && !n.length && !e.temperature_entity && !e.humidity_entity) throw Error("Configurez au moins une lumière, un volet ou un capteur.");
		this.config = {
			...e,
			theme: e.theme || "carbon",
			lights: t,
			covers: n
		};
	}
	static getStubConfig() {
		return {
			name: "Salon",
			theme: "carbon",
			lights: [],
			covers: []
		};
	}
	static getConfigForm() {
		return { schema: [
			{
				name: "name",
				selector: { text: {} }
			},
			{
				name: "subtitle",
				selector: { text: {} }
			},
			{
				name: "theme",
				selector: { select: {
					options: [
						"auto",
						"halo",
						"carbon",
						"mono",
						"aurora"
					],
					mode: "dropdown"
				} }
			},
			{
				name: "lights",
				selector: { entity: {
					multiple: !0,
					filter: { domain: "light" }
				} }
			},
			{
				name: "covers",
				selector: { entity: {
					multiple: !0,
					filter: { domain: "cover" }
				} }
			},
			{
				name: "left_controls",
				selector: { object: {} }
			},
			{
				name: "right_controls",
				selector: { object: {} }
			},
			{
				name: "card_background",
				selector: { object: {} }
			},
			{
				name: "show_grid",
				selector: { boolean: {} }
			},
			{
				name: "thermostat",
				selector: { object: {} }
			},
			{
				name: "ambiance",
				selector: { object: {} }
			},
			{
				name: "scenes",
				selector: { object: {} }
			},
			{
				name: "entity_labels",
				selector: { object: {} }
			},
			{
				name: "cover_labels",
				selector: { object: {} }
			},
			{
				name: "popup_titles",
				selector: { object: {} }
			},
			{
				name: "climate_popup",
				selector: { object: {} }
			},
			{
				name: "temperature_entity",
				selector: { entity: {} }
			},
			{
				name: "humidity_entity",
				selector: { entity: {} }
			},
			{
				name: "climate_entity",
				selector: { entity: { filter: { domain: "climate" } } }
			},
			{
				name: "media_player_entity",
				selector: { entity: { filter: { domain: "media_player" } } }
			},
			{
				name: "scene_entity",
				selector: { entity: { filter: { domain: "scene" } } }
			},
			{
				name: "background_image",
				selector: { text: {} }
			},
			{
				name: "background_position",
				selector: { text: {} }
			},
			{
				name: "accent_color",
				selector: { text: {} }
			}
		] };
	}
	getCardSize() {
		return 7;
	}
	getGridOptions() {
		return {
			rows: 7,
			min_rows: 6,
			columns: 12,
			min_columns: 6
		};
	}
	entityLabel(e, t) {
		if (!e) return t;
		let n = this.config?.entity_labels?.[e] ?? this.config?.cover_labels?.[e];
		return typeof n == "string" && n.trim() ? n.trim() : Me(L(this.hass, e), t);
	}
	popupTitle(e, t) {
		let n = this.config?.popup_titles?.[e];
		return typeof n == "string" && n.trim() ? n.trim() : t;
	}
	historyGraphConfig(e, t, n) {
		let r = Math.min(43800, Math.max(1, Math.round(n))), i = `${e}|${t}|${r}`, a = this.historyGraphConfigs.get(i);
		if (a) return a;
		let o = {
			type: "history-graph",
			title: t,
			hours_to_show: r,
			show_names: !1,
			entities: [{
				entity: e,
				name: t
			}]
		};
		return this.historyGraphConfigs.set(i, o), o;
	}
	sideControls(e) {
		let t = e === "left" ? this.config?.left_controls : this.config?.right_controls;
		return t === void 0 ? e === "left" && this.config?.lights?.length ? [{ type: "lights" }] : e === "right" && this.config?.media_player_entity ? [{
			type: "media",
			entity: this.config.media_player_entity
		}] : [] : t.filter((e) => e && typeof e.type == "string").slice(0, 2);
	}
	safeCssColor(e, t) {
		let n = e?.trim();
		return n && !/[;{}]/.test(n) ? n : t;
	}
	roomCardBackground() {
		let e = this.config?.card_background?.mode, t = e === "solid" || e === "gradient" ? e : "grid", n = (t === "gradient" ? this.config?.card_background?.gradient : this.config?.card_background?.color)?.trim(), r = n && !/[;{}]/.test(n) ? n : void 0;
		return {
			mode: t,
			showGrid: this.config?.show_grid ?? t === "grid",
			style: r ? `--room-card-background:${r}` : ""
		};
	}
	overlayPosition(e, t) {
		return e === "top-left" || e === "top-right" || e === "bottom-left" || e === "bottom-right" ? e : t;
	}
	sceneModes() {
		return this.config?.scenes === void 0 ? this.config?.scene_entity ? [{
			entity: this.config.scene_entity,
			label: "Mode soirée",
			icon: "mdi:creation-outline",
			position: "bottom-right"
		}] : [] : this.config.scenes.filter((e) => e && typeof e.entity == "string" && e.entity.trim());
	}
	ambiancePosition(e) {
		return this.overlayPosition(this.config?.ambiance?.position || e[0]?.position, "bottom-right");
	}
	openMediaControl(e) {
		let t = e?.type === "tv" ? "tv" : "media", n = t === "media" ? this.config?.media_player_entity : void 0, r = e?.entity || n;
		r && (this.selectedMediaEntity = r, this.selectedMediaKind = t, this.selectedMediaTitle = e?.popup_title || e?.label, this.selectedMediaIcon = e?.icon, this.openDialog("media"));
	}
	handleSideControl(e) {
		if (e.type === "lights") return this.openDialog("lights");
		if (e.type === "covers") return this.openDialog("covers");
		if (e.type === "climate") return this.openDialog("climate");
		if (e.type === "media" || e.type === "tv") return this.openMediaControl(e);
		if (e.entity) {
			if (e.type === "scene" || e.action === "activate") {
				U(this.hass, e.entity);
				return;
			}
			if (e.action === "more-info") {
				We(this, e.entity);
				return;
			}
			this.hass?.callService("homeassistant", "toggle", {}, { entity_id: e.entity });
		}
	}
	renderSideControl(e) {
		let t = this.config?.lights || [], n = this.config?.covers || [], r = e.entity || (e.type === "media" ? this.config?.media_player_entity : void 0) || (e.type === "climate" ? this.config?.climate_entity : void 0) || (e.type === "scene" ? this.config?.scene_entity || this.sceneModes()[0]?.entity : void 0), i = L(this.hass, r), a = e.icon || i?.attributes.icon || "mdi:circle-outline", o = e.label || (r ? this.entityLabel(r, r) : "Commande"), s = r ? H(this.hass, r) : "—", c = r ? !R(i) : !1, l = z(i);
		if (e.type === "lights") {
			let n = t.filter((e) => z(L(this.hass, e))).length;
			a = e.icon || (n ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline"), o = e.label || "Lumières", s = `${n}/${t.length}`, c = !t.length, l = n > 0;
		} else if (e.type === "covers") {
			let t = n.filter((e) => z(L(this.hass, e))).length;
			a = e.icon || "mdi:blinds-horizontal", o = e.label || "Volets", s = `${t}/${n.length}`, c = !n.length, l = t > 0;
		} else e.type === "climate" ? (a = e.icon || "mdi:thermostat", o = e.label || "Climat", s = H(this.hass, this.config?.temperature_entity), c = !this.config?.temperature_entity && !this.config?.climate_entity) : e.type === "media" ? (a = e.icon || "mdi:music-note", o = e.label || "Musique", s = z(i) && typeof i?.attributes.media_title == "string" ? i.attributes.media_title : "Lecture") : e.type === "tv" ? (l = R(i) && i?.state !== "off" && i?.state !== "standby", a = e.icon || (l ? "mdi:television" : "mdi:television-off"), o = e.label || "TV", s = l ? "Allumée" : "Éteinte") : e.type === "scene" && (a = e.icon || "mdi:creation-outline", o = e.label || "Ambiance", s = "Activer", c = !r);
		return A`
      <button class="side-control ${l ? "active" : ""}" ?disabled=${c} title=${o} @click=${() => this.handleSideControl({
			...e,
			entity: r
		})}>
        <ha-icon .icon=${a}></ha-icon>
        <strong>${s}</strong>
        <small>${o}</small>
      </button>
    `;
	}
	renderSideColumn(e, t) {
		return A`<div class="side-control-column ${e} ${t.length > 1 ? "dual" : "single"}">${t.map((e) => this.renderSideControl(e))}</div>`;
	}
	thermostatEntityId() {
		return this.config?.thermostat?.entity || this.config?.climate_entity;
	}
	thermostatTarget() {
		let e = L(this.hass, this.thermostatEntityId()), t = e?.attributes.temperature ?? e?.attributes.current_temperature;
		return typeof t == "number" && Number.isFinite(t) ? t : void 0;
	}
	adjustThermostat(e) {
		let t = this.thermostatEntityId(), n = L(this.hass, t), r = this.thermostatTarget();
		if (!t || r === void 0 || !R(n)) return;
		let i = Number(this.config?.thermostat?.step ?? n?.attributes.target_temp_step ?? .5), a = Number.isFinite(i) && i > 0 ? i : .5, o = typeof n?.attributes.min_temp == "number" ? n.attributes.min_temp : 5, s = typeof n?.attributes.max_temp == "number" ? n.attributes.max_temp : 35, c = Math.min(s, Math.max(o, Math.round((r + e * a) * 10) / 10));
		this.hass?.callService("climate", "set_temperature", { temperature: c }, { entity_id: t });
	}
	renderThermostatControl() {
		let e = this.config?.thermostat, t = this.thermostatEntityId();
		if (e?.show === !1 || !t) return M;
		let n = L(this.hass, t), r = this.thermostatTarget(), i = R(n) && r !== void 0, a = e?.label === void 0 ? this.entityLabel(t, "Thermostat") : e.label.trim(), o = e?.show_border !== !1, s = e?.show_background !== !1, c = this.safeCssColor(e?.border_color, "rgba(255,255,255,.16)"), l = this.safeCssColor(e?.background_color, "rgba(13,18,25,.76)"), u = [
			`--thermostat-label:${this.safeCssColor(e?.label_color, "rgba(255,255,255,.72)")}`,
			`--thermostat-value:${this.safeCssColor(e?.value_color, "#ffffff")}`,
			`--thermostat-button:${this.safeCssColor(e?.button_color, "#ffd166")}`,
			`--thermostat-background:${l}`,
			`--thermostat-border:${c}`,
			`border:${o ? `1px solid ${c}` : "none"}`,
			`background:${s ? l : "transparent"}`,
			`backdrop-filter:${s ? "blur(10px)" : "none"}`,
			`-webkit-backdrop-filter:${s ? "blur(10px)" : "none"}`,
			"box-shadow:none"
		].join(";"), d = r === void 0 ? "—" : `${r.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}°`;
		return A`
      <div class="thermostat-control ${o ? "" : "no-border"} ${s ? "" : "no-background"}" style=${u}>
        ${a ? A`<span class="thermostat-label">${a}</span>` : M}
        <div class="thermostat-row">
          <button class="thermostat-step" aria-label="Baisser la température" ?disabled=${!i} @click=${() => this.adjustThermostat(-1)}>−</button>
          <button class="thermostat-value" aria-label="Ouvrir la température et l'humidité" ?disabled=${!i} @click=${() => this.openDialog("climate")}>${d}</button>
          <button class="thermostat-step" aria-label="Augmenter la température" ?disabled=${!i} @click=${() => this.adjustThermostat(1)}>+</button>
        </div>
      </div>
    `;
	}
	renderAmbianceButton(e) {
		if (!e.length) return M;
		let t = this.config?.ambiance?.label?.trim() || "Ambiance";
		return A`
      <button class="scene-chip" title=${t} aria-haspopup="dialog" @click=${() => this.openDialog("ambiance")}>
        <ha-icon .icon=${this.config?.ambiance?.icon?.trim() || "mdi:creation-outline"}></ha-icon>${t}
      </button>
    `;
	}
	renderOverlaySlot(e, t) {
		let n = this.overlayPosition(this.config?.thermostat?.position, "bottom-left"), r = this.config?.thermostat?.show !== !1 && !!this.thermostatEntityId() && n === e, i = t.length > 0 && this.ambiancePosition(t) === e;
		return !r && !i ? M : A`
      <div class="photo-overlay-slot ${e}">
        ${r ? this.renderThermostatControl() : M}
        ${i ? this.renderAmbianceButton(t) : M}
      </div>
    `;
	}
	render() {
		if (!this.config || !this.hass) return A``;
		let e = this.config.lights || [], t = this.config.covers || [], n = t.map((e) => Ne(L(this.hass, e))), r = B(L(this.hass, this.config.temperature_entity), NaN), i = B(L(this.hass, this.config.humidity_entity), NaN), a = [...e, ...t].filter((e) => !R(L(this.hass, e))).length, o = this.sideControls("left"), s = this.sideControls("right"), c = this.sceneModes(), l = this.roomCardBackground(), u = a ? `${a} appareil${a > 1 ? "s" : ""} indisponible${a > 1 ? "s" : ""}` : "Aucun appareil en alerte", d = this.config.subtitle === void 0 ? u : this.config.subtitle.trim(), f = (this.config.background_image?.trim() || "data:image/jpeg;base64,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").replaceAll("\\", "\\\\").replaceAll("\"", "\\\""), p = this.config.background_position?.trim(), m = p && /^[\w\s.%+-]+$/.test(p) ? p : "center", h = this.config.accent_color?.trim(), g = `--room-image:url("${f}");--room-image-position:${m};--room-accent:${h && !/[;{}]/.test(h) ? h : "#79d6f2"}`;
		return A`
      <ha-card>
        <div class="cinema-shell background-${l.mode} ${l.showGrid ? "show-grid" : ""}" style=${l.style}>
          <header class="cinema-header">
            <span class="room-avatar"><ha-icon .icon=${this.config.icon || "mdi:sofa-outline"}></ha-icon></span>
            <button class="cinema-title room-title-button" aria-label="Ouvrir les détails du salon" @click=${() => this.openDialog("details")}>
              <h2>${this.config.name || "Pièce"}</h2>
              ${d ? A`<p>${d}</p>` : M}
            </button>
            <div class="climate-pills">
              <button class="climate-pill" @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:thermometer"></ha-icon>${Number.isFinite(r) ? `${r.toLocaleString("fr-FR")}°` : "—"}</button>
              <button class="climate-pill" @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:water-percent"></ha-icon>${Number.isFinite(i) ? `${Math.round(i)}%` : "—"}</button>
            </div>
          </header>
          <div class="cinema-body">
            ${this.renderSideColumn("left", o)}
            <div class="room-photo" style=${g}>
              ${this.renderOverlaySlot("top-left", c)}
              ${this.renderOverlaySlot("top-right", c)}
              ${this.renderOverlaySlot("bottom-left", c)}
              ${this.renderOverlaySlot("bottom-right", c)}
            </div>
            ${this.renderSideColumn("right", s)}
            <div class="cover-dock">
              <button class="cover-command" @click=${() => W(this.hass, t, "open")}><ha-icon icon="mdi:chevron-double-up"></ha-icon>Ouvrir</button>
              <button class="cover-command center" @click=${() => this.openDialog("covers")}><ha-icon icon="mdi:blinds-horizontal"></ha-icon>${ze(n)}</button>
              <button class="cover-command" @click=${() => W(this.hass, t, "close")}><ha-icon icon="mdi:chevron-double-down"></ha-icon>Fermer</button>
            </div>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "lights" ? this.renderLightsDialog() : M}
      ${this.dialog === "covers" ? this.renderCoversDialog() : M}
      ${this.dialog === "climate" ? this.renderClimateDialog() : M}
      ${this.dialog === "media" ? this.renderMediaDialog() : M}
      ${this.dialog === "ambiance" ? this.renderAmbianceDialog() : M}
      ${this.dialog === "details" ? this.renderDetailsDialog() : M}
    `;
	}
	renderLightsDialog() {
		let e = this.config?.lights || [], t = e.map((e) => L(this.hass, e)), n = t.filter(z).length, r = t.filter(z).map(Pe), i = r.length ? Math.round(r.reduce((e, t) => e + t, 0) / r.length) : 0, a = e.filter((e) => {
			let t = L(this.hass, e);
			return R(t) && Ie(t);
		}), o = Le(Fe(a.map((e) => L(this.hass, e)).find((e) => z(e) && Fe(e)) ?? L(this.hass, a[0])));
		return this.renderDialog(this.popupTitle("lights", "Lumières"), "mdi:lightbulb-group-outline", A`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Éclairage de la pièce</span><strong>${n} lumière${n > 1 ? "s" : ""} allumée${n > 1 ? "s" : ""} sur ${e.length}</strong><span class="muted">Commande globale et réglages individuels</span></div>
            <div class="dialog-stat"><strong>${i}%</strong><small>moyenne</small></div>
          </div>
          <div class="dialog-section-title">Commande générale</div>
          <div class="light-master-bar ${a.length ? "" : "single"}">
            <button class="light-master-button ${n ? "all-off" : "all-on"}" @click=${this.toggleAllLights}>
              <ha-icon icon=${n ? "mdi:lightbulb-group-off-outline" : "mdi:lightbulb-group-outline"}></ha-icon>
              <strong>${n ? "Tout éteindre" : "Tout allumer"}</strong>
            </button>
            ${a.length ? A`
                  <label class="global-color-control">
                    <input class="color-picker" type="color" .value=${o} aria-label="Couleur générale" @change=${(e) => Ue(this.hass, a, e.target.value)} />
                    <span><strong>Couleur générale</strong><small>${a.length} éclairage${a.length > 1 ? "s" : ""} compatible${a.length > 1 ? "s" : ""}</small></span>
                  </label>
                ` : M}
          </div>
          <label class="tile" style="display:block;margin-bottom:14px;">
            <div class="row-between"><span style="display:flex;align-items:center;gap:8px;"><ha-icon style="color:var(--auralis-active);" icon="mdi:white-balance-sunny"></ha-icon><strong>Luminosité générale</strong></span><strong>${i} %</strong></div>
            <input class="range light-slider" style=${`--range-value:${i}%`} type="range" min="1" max="100" .value=${String(i)}
              @change=${(t) => e.forEach((e) => He(this.hass, e, Number(t.target.value)))} />
          </label>
          <div class="dialog-section-title">Lumières</div>
          <div class="list">
            ${e.map((e) => {
			let t = L(this.hass, e), n = Pe(t), r = this.entityLabel(e, e), i = z(t), a = Ie(t), o = Le(Fe(t));
			return A`
                <div class="list-row">
                  <span class="tile-icon light-status-icon ${i ? "on" : ""}" style=${`--light-status-color:${o}`}><ha-icon .icon=${i ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon></span>
                  <div class="meta">
                    <div class="row-between"><span class="name">${r}</span><span>${n} %</span></div>
                    <div class="light-setting-row">
                      <input class="range light-slider" style=${`--range-value:${n}%`} type="range" min="1" max="100" .value=${String(Math.max(n, 1))} ?disabled=${!R(t)}
                        aria-label=${`Luminosité de ${r}`} @change=${(t) => He(this.hass, e, Number(t.target.value))} />
                      ${a ? A`<input class="color-picker" type="color" .value=${o} title=${`Couleur de ${r}`} aria-label=${`Couleur de ${r}`} ?disabled=${!R(t)} @change=${(t) => Ue(this.hass, [e], t.target.value)} />` : M}
                    </div>
                  </div>
                  <button class="device-toggle ${i ? "on" : ""}" aria-label=${i ? `Éteindre ${r}` : `Allumer ${r}`} aria-pressed=${i ? "true" : "false"} ?disabled=${!R(t)} @click=${() => this.hass.callService("light", i ? "turn_off" : "turn_on", {}, { entity_id: e })}></button>
                </div>
              `;
		})}
          </div>
        </div>
      `);
	}
	activateSceneMode(e) {
		U(this.hass, e.entity), this.closeDialog();
	}
	renderAmbianceDialog() {
		let e = this.sceneModes(), t = this.popupTitle("ambiance", "Ambiance"), n = this.config?.ambiance?.icon?.trim() || "mdi:creation-outline";
		return this.renderDialog(t, n, A`
        <div class="dialog-body">
          <div class="dialog-section-title">Choisir un mode</div>
          <div class="ambiance-options">
            ${e.map((e) => {
			let t = L(this.hass, e.entity), n = e.label?.trim() || this.entityLabel(e.entity, "Ambiance");
			return A`
                <button class="ambiance-option" @click=${() => this.activateSceneMode(e)}>
                  <span class="tile-icon"><ha-icon .icon=${e.icon?.trim() || t?.attributes.icon || "mdi:creation-outline"}></ha-icon></span>
                  <span class="ambiance-option-copy">
                    <strong>${n}</strong>
                    <small>Activer cette ambiance</small>
                  </span>
                  <ha-icon icon="mdi:chevron-right"></ha-icon>
                </button>
              `;
		})}
          </div>
        </div>
      `, "ambiance-dialog");
	}
	renderCoversDialog() {
		let e = this.config?.covers || [], t = e.map((e) => L(this.hass, e)), n = t.filter((e) => e?.state === "open" || e?.state === "opening").length, r = t.filter((e) => e?.state === "opening" || e?.state === "closing").length, i = t.filter((e) => R(e)).length;
		return this.renderDialog(this.popupTitle("covers", "Volets"), "mdi:blinds-horizontal", A`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Ouvertures de la pièce</span><strong>${n} volet${n === 1 ? "" : "s"} ouvert${n === 1 ? "" : "s"} sur ${e.length}</strong><span class="muted">${r ? `${r} en mouvement` : "Commandes directes, sans position intermédiaire"}</span></div>
            <div class="dialog-stat"><strong>${i}/${e.length}</strong><small>disponibles</small></div>
          </div>
          <div class="dialog-section-title">Commande groupée</div>
          <div class="group-bar">
            <button class="action" @click=${() => W(this.hass, e, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
            <button class="action" @click=${() => W(this.hass, e, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
            <button class="action" @click=${() => W(this.hass, e, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
          </div>
          <div class="dialog-section-title">Volets</div>
          <div class="list">
            ${e.map((e) => {
			let t = L(this.hass, e), n = R(t) ? t?.state === "open" ? "Ouvert" : t?.state === "opening" ? "Ouverture en cours" : t?.state === "closing" ? "Fermeture en cours" : t?.state === "closed" ? "Fermé" : H(this.hass, e) : "Indisponible";
			return A`
                <div class="list-row cover-device-row">
                  <span class="tile-icon"><ha-icon .icon=${t?.attributes.icon || "mdi:blinds-horizontal"}></ha-icon></span>
                  <div class="meta">
                    <span class="name">${this.entityLabel(e, e)}</span>
                    <span class="muted">${n}</span>
                  </div>
                  <div class="cover-device-actions">
                    <button class="action" ?disabled=${!R(t)} @click=${() => W(this.hass, [e], "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
                    <button class="action" ?disabled=${!R(t)} @click=${() => W(this.hass, [e], "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
                    <button class="action" ?disabled=${!R(t)} @click=${() => W(this.hass, [e], "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
                  </div>
                </div>
              `;
		})}
          </div>
        </div>
      `);
	}
	renderDetailsDialog() {
		let e = [...this.config?.lights || [], ...this.config?.covers || []], t = (this.config?.lights || []).filter((e) => z(L(this.hass, e))).length, n = H(this.hass, this.config?.temperature_entity), r = H(this.hass, this.config?.humidity_entity);
		return this.renderDialog(this.popupTitle("details", this.config?.name || "Pièce"), this.config?.icon || "mdi:sofa-outline", A`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Vue d'ensemble</span><strong>${this.config?.name || "Pièce"} est prête</strong><span class="muted">Climat, éclairage, ouvrants et multimédia</span></div>
            <div class="dialog-stat"><strong>${n}</strong><small>${r} humidité</small></div>
          </div>
          <div class="dialog-section-title">Accès rapides</div>
          <div class="grid two" style="margin-bottom:18px;">
            <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => this.openDialog("lights")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:lightbulb-group-outline"></ha-icon></span><strong>${t}/${this.config?.lights?.length || 0}</strong></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("lights", "Lumières")}</div><div class="muted">Régler l'intensité</div></button>
            <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => this.openDialog("covers")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:blinds-horizontal"></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("covers", "Volets")}</div><div class="muted">Ouvrir, stopper ou fermer</div></button>
            <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => this.openDialog("climate")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:thermometer"></ha-icon></span><strong>${n}</strong></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("climate", "Température et humidité")}</div><div class="muted">${r} d'humidité</div></button>
            <button class="tile clickable" style="color:inherit;text-align:left;" ?disabled=${!this.config?.media_player_entity} @click=${() => this.openMediaControl({
			type: "media",
			entity: this.config?.media_player_entity
		})}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:music-note"></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("media", "Multimédia")}</div><div class="muted">Lecture indépendante</div></button>
          </div>
          <div class="dialog-section-title">Tous les appareils</div>
          <div class="grid two">
            ${e.map((e) => {
			let t = L(this.hass, e), n = this.entityLabel(e, e);
			return A`
                <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => We(this, e)}>
                  <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${t?.attributes.icon || "mdi:circle-outline"}></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div>
                  <div style="margin-top:12px;font-weight:680;">${n}</div>
                  <div class="muted">${H(this.hass, e)}</div>
                </button>
              `;
		})}
          </div>
        </div>
      `);
	}
	renderClimateDialog() {
		let e = H(this.hass, this.config?.temperature_entity), t = H(this.hass, this.config?.humidity_entity), n = H(this.hass, this.config?.climate_entity, "Confort"), r = [this.config?.temperature_entity, this.config?.humidity_entity].filter((e) => !!e), i = this.config?.climate_popup?.graph_entities, a = [...new Set(i === void 0 ? r : i.filter(Boolean))], o = this.config?.climate_popup?.graph_period_unit || "hours", s = this.config?.climate_popup?.graph_hours, c = Number(this.config?.climate_popup?.graph_period ?? s ?? 24), l = o === "months" ? 60 : o === "days" ? 1825 : 43800, u = Number.isFinite(c) ? Math.min(l, Math.max(1, Math.round(c))) : 24, d = u * (o === "months" ? 720 : o === "days" ? 24 : 1), f = `${u.toLocaleString("fr-FR")} ${o === "months" ? "mois" : o === "days" ? `jour${u > 1 ? "s" : ""}` : `heure${u > 1 ? "s" : ""}`}`, p = this.config?.climate_popup?.show_overview !== !1, m = this.config?.climate_popup?.show_current_values === !0, h = !!this.config?.climate_entity && this.config?.climate_popup?.show_thermostat !== !1;
		return this.renderDialog(this.popupTitle("climate", "Température et humidité"), "mdi:thermometer", A`
        <div class="dialog-body">
          ${p ? A`<div class="dialog-overview"><div><span class="eyebrow">Confort de la pièce</span><strong>${e} · ${t}</strong><span class="muted">Historique sur ${f}</span></div><div class="dialog-stat"><strong>${this.config?.climate_entity ? n : a.length}</strong><small>${this.config?.climate_entity ? "mode" : `graphe${a.length > 1 ? "s" : ""}`}</small></div></div>` : M}
          ${m && a.length ? A`
                <div class="dialog-section-title">Valeurs actuelles</div>
                <div class="grid two">
                  ${a.map((e) => {
			let t = e === this.config?.temperature_entity, n = e === this.config?.humidity_entity, r = this.entityLabel(e, t ? "Température" : n ? "Humidité" : e);
			return A`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${L(this.hass, e)?.attributes.icon || (t ? "mdi:thermometer" : n ? "mdi:water-percent" : "mdi:chart-line")}></ha-icon></span><strong>${H(this.hass, e)}</strong></div><div style="margin-top:10px;">${r}</div></div>`;
		})}
                </div>
              ` : M}
          ${a.length ? A`
                <div class="history-graphs">
                  ${a.map((e) => {
			let t = e === this.config?.temperature_entity ? "Température" : e === this.config?.humidity_entity ? "Humidité" : e, n = this.entityLabel(e, t);
			return A`<hui-card class="history-graph" .hass=${this.hass} .config=${this.historyGraphConfig(e, n, d)}></hui-card>`;
		})}
                </div>
              ` : M}
          ${h ? A`<div class="dialog-section"><div class="dialog-section-title">Réglages</div><button class="action primary" style="width:100%;" @click=${() => We(this, this.config?.climate_entity)}><ha-icon icon="mdi:tune-variant"></ha-icon>Ouvrir ${this.entityLabel(this.config?.climate_entity, "le thermostat Home Assistant")}</button></div>` : M}
        </div>
      `);
	}
	renderMediaDialog() {
		let e = this.selectedMediaEntity || this.config?.media_player_entity, t = this.selectedMediaKind, n = L(this.hass, e), r = this.entityLabel(e, t === "tv" ? "Télévision" : "Lecteur multimédia"), i = typeof n?.attributes.media_title == "string" ? n.attributes.media_title : r, a = typeof n?.attributes.media_artist == "string" ? n.attributes.media_artist : "Salon", o = n?.attributes.volume_level, s = typeof o == "number" ? Math.round(o * 100) : 0, c = n?.state === "playing", l = R(n) && n?.state !== "off" && n?.state !== "standby", u = this.selectedMediaTitle?.trim() || this.popupTitle(t === "tv" ? "tv" : "media", t === "tv" ? "Télévision" : "Multimédia"), d = this.selectedMediaIcon || (t === "tv" ? "mdi:television" : "mdi:music-note");
		return this.renderDialog(u, d, A`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${r}</span><strong>${i}</strong><span class="muted">${t === "tv" ? l ? "allumée" : "éteinte" : `${a} · ${c ? "lecture en cours" : "en pause"}`}</span></div><div class="dialog-stat"><strong>${s}%</strong><small>volume</small></div></div>
          <div class="dialog-section-title">${t === "tv" ? "Commandes TV" : "Lecture"}</div>
          ${t === "tv" ? A`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action ${l ? "danger" : "primary"}" @click=${() => this.hass?.callService("media_player", l ? "turn_off" : "turn_on", {}, { entity_id: e })}><ha-icon icon="mdi:power"></ha-icon>${l ? "Éteindre" : "Allumer"}</button>
                  <button class="action" ?disabled=${!l} @click=${() => this.hass?.callService("media_player", "media_play_pause", {}, { entity_id: e })}><ha-icon icon=${c ? "mdi:pause" : "mdi:play"}></ha-icon>${c ? "Pause" : "Lecture"}</button>
                  <button class="action" @click=${() => We(this, e)}><ha-icon icon="mdi:tune-variant"></ha-icon>Détails</button>
                </div>
              ` : A`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action" @click=${() => this.hass?.callService("media_player", "media_previous_track", {}, { entity_id: e })}><ha-icon icon="mdi:skip-previous"></ha-icon>Précédent</button>
                  <button class="action primary" @click=${() => this.hass?.callService("media_player", "media_play_pause", {}, { entity_id: e })}><ha-icon icon=${c ? "mdi:pause" : "mdi:play"}></ha-icon>${c ? "Pause" : "Lecture"}</button>
                  <button class="action" @click=${() => this.hass?.callService("media_player", "media_next_track", {}, { entity_id: e })}><ha-icon icon="mdi:skip-next"></ha-icon>Suivant</button>
                </div>
              `}
          <label class="tile" style="display:block;margin-top:14px;"><div class="row-between"><span style="display:flex;align-items:center;gap:8px;"><ha-icon icon="mdi:volume-high"></ha-icon><strong>Volume</strong></span><strong>${s}%</strong></div><input class="range" type="range" min="0" max="100" .value=${String(s)} @change=${(t) => this.hass?.callService("media_player", "volume_set", { volume_level: Number(t.target.value) / 100 }, { entity_id: e })} /></label>
        </div>
      `);
	}
}, Ke = /* @__PURE__ */ new Set([
	"off",
	"offline",
	"disconnected",
	"not_home",
	"stopped"
]);
function qe(e) {
	return !e || !R(e) ? "unavailable" : z(e) ? "online" : Ke.has(e.state.toLowerCase()) ? "offline" : e.entity_id.startsWith("sensor.") ? "online" : "offline";
}
function G(e) {
	if (!R(e)) return;
	let t = B(e, NaN);
	return Number.isFinite(t) ? V(t) : void 0;
}
function Je(e) {
	if (!e || !R(e)) return;
	let t = B(e, NaN);
	return Number.isFinite(t) && t > 0 ? t : void 0;
}
function Ye(e, t) {
	if (!e) return;
	let n = Object.entries(e.attributes);
	for (let e of t) {
		let t = n.find(([t]) => t.toLowerCase() === e.toLowerCase());
		if (!t) continue;
		let r = typeof t[1] == "number" ? t[1] : Number.parseFloat(String(t[1]).replace(",", "."));
		if (Number.isFinite(r)) return r;
	}
}
function Xe(e) {
	if (!e || !R(e)) return;
	let t = Ye(e, [
		"UsedSpacePercentage",
		"used_space_percentage",
		"used_percentage"
	]);
	return t === void 0 ? G(e) : V(t);
}
function Ze(e) {
	return e >= 1024 ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(e / 1024)} Go` : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(e)} Mo`;
}
function Qe(e) {
	if (!e || !R(e)) return "—";
	let t = Ye(e, ["UsedSpaceMB", "used_space_mb"]), n = Ye(e, ["TotalSizeMB", "total_size_mb"]);
	return t === void 0 || n === void 0 || n <= 0 ? q(Xe(e)) : `${Ze(t)} / ${Ze(n)}`;
}
function $e(e, t = Date.now()) {
	if (!e || !R(e)) return "—";
	let n = Date.parse(e.state);
	if (!Number.isFinite(n)) return "—";
	let r = Math.max(0, Math.floor((t - n) / 6e4)), i = Math.floor(r / 1440), a = Math.floor(r % 1440 / 60), o = r % 60;
	return `${i > 0 ? `${i} j ` : ""}${a} h ${o} min`;
}
function et(e) {
	return !e || !R(e) ? "—" : {
		active: "Active",
		connected: "Connectée",
		disconnected: "Déconnectée",
		locked: "Verrouillée",
		unlocked: "Déverrouillée"
	}[e.state.toLowerCase()] || e.state;
}
function K(e, t) {
	return !!(t && R(L(e, t)));
}
function q(e) {
	return e === void 0 ? "—" : `${Math.round(e)}%`;
}
function tt(e, t = "Muet", n = "Actif") {
	return !e || !R(e) ? "—" : [
		"true",
		"on",
		"yes",
		"1"
	].includes(e.state.toLowerCase()) ? t : n;
}
function nt(e) {
	return !e || !R(e) ? "Indisponible" : [
		"up",
		"on",
		"online",
		"connected",
		"active"
	].includes(e.state.toLowerCase()) ? "Connecté" : "Déconnecté";
}
function rt(e, t) {
	let n = L(e, t);
	if (!R(n)) return "—";
	let r = B(n, NaN);
	return Number.isFinite(r) && r < 0 ? "—" : H(e, t);
}
var it = class extends I {
	constructor(...e) {
		super(...e), this.confirmRestart = () => {
			K(this.hass, this.config?.restart_entity) && (this.askConfirmation({
				title: "Redémarrer le PC ?",
				message: "Les applications ouvertes pourront perdre leurs données non enregistrées.",
				confirmLabel: "Redémarrer",
				action: () => U(this.hass, this.config?.restart_entity)
			}), this.dialog = "details");
		}, this.confirmShutdown = () => {
			K(this.hass, this.config?.shutdown_entity) && (this.askConfirmation({
				title: "Éteindre le PC ?",
				message: "Cette action arrêtera la machine et les services qui y sont exécutés.",
				confirmLabel: "Éteindre",
				action: () => U(this.hass, this.config?.shutdown_entity)
			}), this.dialog = "details");
		};
	}
	static {
		this.styles = [I.styles, o`
      .pc-shell, .pc-content { min-height: 530px; }
      .pc-header { padding-right: 82px; }
      .machine-stat-stack { right: 0; }
      .machine-gauge { margin-top: 50px; }
      .machine-context { max-width: 170px; }
      .machine-context span { display: block; margin-top: 6px; color: #91a0b2; font-size: 9px; }
      .machine-panel { max-height: 285px; overflow: auto; }
      .machine-bar { grid-template-columns: 72px minmax(0, 1fr) 46px; }
      .machine-bar > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-foot-item { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-dialog { max-width: 820px; }
      .pc-detail-section + .pc-detail-section { margin-top: 22px; }
      .pc-drive-row, .pc-network-row, .pc-info-row { padding: 12px 0; border-bottom: 1px solid var(--auralis-border); }
      .pc-drive-row:last-child, .pc-network-row:last-child, .pc-info-row:last-child { border-bottom: 0; }
      .pc-drive-top, .pc-network-row, .pc-info-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .pc-drive-top span, .pc-network-row span, .pc-info-row span { min-width: 0; color: var(--auralis-muted); font-size: 12px; }
      .pc-drive-top strong, .pc-network-row strong, .pc-info-row strong { min-width: 0; overflow-wrap: anywhere; text-align: right; }
      .pc-network-state { display: inline-flex; align-items: center; gap: 7px; }
      .pc-audio-device { padding: 14px; border: 1px solid var(--auralis-border); border-radius: 18px; background: var(--auralis-layer); }
      .pc-audio-device + .pc-audio-device { margin-top: 10px; }
      .pc-audio-device > strong { display: block; margin-top: 9px; overflow-wrap: anywhere; }
      .pc-audio-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; color: var(--auralis-muted); font-size: 12px; }
      @container (max-width: 290px) {
        .pc-header { padding-right: 0; }
        .machine-stat-stack { display: none; }
        .machine-gauge { margin-top: 36px; }
        .machine-bar { grid-template-columns: 58px minmax(0, 1fr) 40px; }
      }
    `];
	}
	setConfig(e) {
		if (!e.online_entity) throw Error("online_entity est obligatoire.");
		this.config = {
			...e,
			name: e.name || "PC Bureau",
			theme: e.theme || "auto"
		};
	}
	static getStubConfig() {
		return {
			name: "PC Bureau",
			theme: "carbon",
			online_entity: "binary_sensor.pc_online"
		};
	}
	static getConfigForm() {
		return { schema: [
			{
				name: "name",
				selector: { text: {} }
			},
			{
				name: "theme",
				selector: { select: { options: [
					"auto",
					"halo",
					"carbon",
					"mono",
					"aurora"
				] } }
			},
			...(/* @__PURE__ */ "online_entity.uptime_entity.last_boot_entity.last_activity_entity.system_state_entity.user_entity.session_entity.cpu_entity.cpu_temperature_entity.gpu_entity.gpu_temperature_entity.memory_entity.clock_speed_entity.storage_entity.storage_label_entity.network_down_entity.network_up_entity.network_total_entity.battery_percentage_entity.battery_status_entity.battery_powerline_entity.battery_remaining_entity.battery_full_lifetime_entity.audio_output_entity.audio_output_state_entity.audio_output_volume_entity.audio_output_muted_entity.audio_input_entity.audio_input_state_entity.audio_input_volume_entity.audio_input_muted_entity.audio_input_devices_entity.audio_output_devices_entity.audio_peak_entity.audio_sessions_entity.lock_entity.sleep_entity.restart_entity.shutdown_entity.wake_entity".split(".")).map((e) => ({
				name: e,
				required: e === "online_entity",
				selector: { entity: {} }
			})),
			{
				name: "drives",
				selector: { object: {} }
			},
			{
				name: "network_interfaces",
				selector: { object: {} }
			},
			{
				name: "card_background",
				selector: { object: {} }
			},
			{
				name: "show_grid",
				selector: { boolean: {} }
			},
			{
				name: "background_image",
				selector: { text: {} }
			},
			{
				name: "background_position",
				selector: { text: {} }
			},
			{
				name: "image_opacity",
				selector: { number: {
					min: 0,
					max: 100,
					step: 1,
					mode: "slider"
				} }
			},
			{
				name: "accent_color",
				selector: { text: {} }
			},
			{
				name: "image_brightness",
				selector: { number: {
					min: 30,
					max: 100,
					step: 1,
					mode: "slider"
				} }
			},
			{
				name: "glass_opacity",
				selector: { number: {
					min: .45,
					max: .96,
					step: .01,
					mode: "slider"
				} }
			}
		] };
	}
	getCardSize() {
		return 11;
	}
	getGridOptions() {
		return {
			rows: 11,
			min_rows: 10,
			columns: 6,
			min_columns: 3
		};
	}
	render() {
		if (!this.config || !this.hass) return A``;
		let e = qe(L(this.hass, this.config.online_entity)), t = G(L(this.hass, this.config.cpu_entity)), n = G(L(this.hass, this.config.gpu_entity)), r = G(L(this.hass, this.config.memory_entity)), i = this.temperatureLabel(this.config.cpu_temperature_entity), a = this.temperatureLabel(this.config.gpu_temperature_entity), o = this.validDrives(), s = L(this.hass, this.config.session_entity), c = L(this.hass, this.config.user_entity), l = R(s) ? et(s) : void 0, u = R(c) ? H(this.hass, this.config.user_entity) : void 0, d = this.uptimeLabel(), f = G(L(this.hass, this.config.battery_percentage_entity)), p = this.availableDisplay(this.config.system_state_entity), m = this.availableDisplay(this.config.network_down_entity), h = this.availableDisplay(this.config.network_up_entity), g = this.machineStyle("#7898ff"), _ = e === "online" ? "En ligne et disponible" : e === "offline" ? "Hors ligne" : "État indisponible", v = e === "online" ? "healthy" : e === "offline" ? "danger" : "", y = !!(u || l || d), b = [
			n === void 0 ? void 0 : {
				label: "GPU",
				value: n
			},
			r === void 0 ? void 0 : {
				label: "RAM",
				value: r
			},
			...o.map((e) => ({
				label: e.label,
				value: e.usage
			}))
		].filter((e) => !!e);
		return A`
      <ha-card>
        <div class="machine-shell pc-shell ${this.machineGridClass()}" style=${g}>
          <div class="machine-content pc-content">
            <header class="machine-header pc-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${v}"></span>${_}</div></div></header>
            ${i || a ? A`<div class="machine-stat-stack">${i ? A`<div class="machine-mini-stat"><small>CPU</small><strong>${i}</strong></div>` : M}${a ? A`<div class="machine-mini-stat"><small>GPU</small><strong>${a}</strong></div>` : M}</div>` : M}
            ${t === void 0 ? M : A`<div class="machine-gauge" style=${`--value:${t}`}><div class="machine-gauge-content"><strong>${q(t)}</strong><small>CPU</small></div></div>`}
            ${y ? A`<div class="machine-context"><small>${u ? "Utilisateur" : l ? "Session" : "Uptime"}</small><strong>${u || l || d}</strong>${u && l ? A`<span>Session · ${l}</span>` : M}${d && (u || l) ? A`<span>Uptime · ${d}</span>` : M}</div>` : M}
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Performance</small><strong>${e === "online" ? `${this.config.name} fonctionne normalement` : e === "offline" ? `${this.config.name} est hors ligne` : `État de ${this.config.name} indisponible`}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("details")}><ha-icon icon="mdi:pulse"></ha-icon>Détails</button></div>
              ${b.length ? A`<div class="machine-bars">${b.map((e) => this.renderBar(e.label, e.value))}</div>` : M}
              ${p || m || h || f !== void 0 ? A`<div class="machine-foot">${p ? A`<span class="pc-foot-item">Événement <strong>${p}</strong></span>` : M}${m || h ? A`<span class="pc-foot-item">Réseau <strong>${m ? `↓ ${m}` : ""}${m && h ? " · " : ""}${h ? `↑ ${h}` : ""}</strong></span>` : M}${f === void 0 ? M : A`<span class="pc-foot-item">Batterie <strong>${q(f)}</strong></span>`}</div>` : M}
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "details" ? this.renderDetails() : M}
    `;
	}
	uptimeLabel() {
		if (this.config?.uptime_entity && R(L(this.hass, this.config.uptime_entity))) return H(this.hass, this.config.uptime_entity);
		let e = $e(L(this.hass, this.config?.last_boot_entity));
		return e === "—" ? void 0 : e;
	}
	availableDisplay(e) {
		return R(L(this.hass, e)) ? H(this.hass, e) : void 0;
	}
	temperatureLabel(e) {
		return Je(L(this.hass, e)) === void 0 ? "" : H(this.hass, e);
	}
	renderBar(e, t) {
		return A`<div class="machine-bar"><span title=${e}>${e}</span><div class="track"><span style=${`width:${t}%`}></span></div><strong>${q(t)}</strong></div>`;
	}
	validDrives() {
		return (this.config?.drives?.length ? this.config.drives : this.config?.storage_entity ? [{
			entity: this.config.storage_entity,
			label: "Disque"
		}] : []).flatMap((e) => {
			let t = L(this.hass, e.entity), n = Xe(t);
			return !t || n === void 0 ? [] : [{
				config: e,
				state: t,
				label: this.driveLabel(e, t),
				usage: n,
				summary: Qe(t)
			}];
		});
	}
	driveLabel(e, t) {
		if (e.label) return e.label;
		let n = t?.attributes.Label;
		return typeof n == "string" && n.trim() ? n : t?.state && t.state.length <= 3 ? `Disque ${t.state}` : Me(t, "Stockage");
	}
	renderDetails() {
		let e = qe(L(this.hass, this.config?.online_entity)), t = e === "online", n = [
			[
				"CPU",
				this.config?.cpu_entity,
				"mdi:cpu-64-bit"
			],
			[
				"Température CPU",
				this.config?.cpu_temperature_entity,
				"mdi:thermometer"
			],
			[
				"GPU",
				this.config?.gpu_entity,
				"mdi:expansion-card"
			],
			[
				"Température GPU",
				this.config?.gpu_temperature_entity,
				"mdi:thermometer"
			],
			[
				"Mémoire",
				this.config?.memory_entity,
				"mdi:memory"
			],
			[
				"Fréquence",
				this.config?.clock_speed_entity,
				"mdi:speedometer"
			],
			[
				"Téléchargement",
				this.config?.network_down_entity,
				"mdi:download"
			],
			[
				"Envoi",
				this.config?.network_up_entity,
				"mdi:upload"
			]
		].filter(([e, t]) => e.includes("Température") ? Je(L(this.hass, t)) !== void 0 : R(L(this.hass, t))), r = this.validDrives(), i = (this.config?.network_interfaces || []).filter((e) => R(L(this.hass, e.entity))), a = [
			this.availableDisplay(this.config?.user_entity) ? ["Utilisateur", this.availableDisplay(this.config?.user_entity)] : void 0,
			R(L(this.hass, this.config?.session_entity)) ? ["Session", et(L(this.hass, this.config?.session_entity))] : void 0,
			this.uptimeLabel() ? ["Uptime", this.uptimeLabel()] : void 0,
			this.availableDisplay(this.config?.last_boot_entity) ? ["Dernier démarrage", this.availableDisplay(this.config?.last_boot_entity)] : void 0,
			this.availableDisplay(this.config?.last_activity_entity) ? ["Dernière activité", this.availableDisplay(this.config?.last_activity_entity)] : void 0,
			this.availableDisplay(this.config?.system_state_entity) ? ["Dernier événement", this.availableDisplay(this.config?.system_state_entity)] : void 0
		].filter((e) => !!e), o = G(L(this.hass, this.config?.battery_percentage_entity)), s = [
			o === void 0 ? void 0 : ["Batterie", q(o)],
			this.availableDisplay(this.config?.battery_status_entity) ? ["État de charge", this.availableDisplay(this.config?.battery_status_entity)] : void 0,
			this.availableDisplay(this.config?.battery_powerline_entity) ? ["Alimentation", this.availableDisplay(this.config?.battery_powerline_entity)] : void 0,
			this.nonNegativeDisplay(this.config?.battery_remaining_entity) ? ["Autonomie restante", this.nonNegativeDisplay(this.config?.battery_remaining_entity)] : void 0,
			this.nonNegativeDisplay(this.config?.battery_full_lifetime_entity) ? ["Autonomie maximale", this.nonNegativeDisplay(this.config?.battery_full_lifetime_entity)] : void 0
		].filter((e) => !!e), c = [this.config?.audio_output_entity, this.config?.audio_input_entity].some((e) => R(L(this.hass, e))), l = [
			this.availableDisplay(this.config?.audio_sessions_entity) ? ["Sessions", this.availableDisplay(this.config?.audio_sessions_entity)] : void 0,
			this.availableDisplay(this.config?.audio_peak_entity) ? ["Niveau de crête", this.availableDisplay(this.config?.audio_peak_entity)] : void 0,
			this.availableDisplay(this.config?.audio_output_devices_entity) ? ["Sorties détectées", this.availableDisplay(this.config?.audio_output_devices_entity)] : void 0,
			this.availableDisplay(this.config?.audio_input_devices_entity) ? ["Entrées détectées", this.availableDisplay(this.config?.audio_input_devices_entity)] : void 0
		].filter((e) => !!e), u = [
			this.config?.lock_entity,
			this.config?.sleep_entity,
			this.config?.restart_entity,
			this.config?.shutdown_entity,
			this.config?.wake_entity
		].some((e) => K(this.hass, e)), d = t && K(this.hass, this.config?.lock_entity), f = t && K(this.hass, this.config?.sleep_entity), p = t && K(this.hass, this.config?.restart_entity), m = t && K(this.hass, this.config?.shutdown_entity), h = e === "offline" && K(this.hass, this.config?.wake_entity);
		return this.renderDialog(this.config?.name || "PC", "mdi:laptop", A`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État de la machine</span><strong>${e === "online" ? "En ligne et disponible" : e === "offline" ? "Hors ligne" : "État indisponible"}</strong>${a.length ? A`<span class="muted">${a.slice(0, 2).map(([, e]) => e).join(" · ")}</span>` : M}</div>${o !== void 0 || G(L(this.hass, this.config?.cpu_entity)) !== void 0 ? A`<div class="dialog-stat"><strong>${q(o === void 0 ? G(L(this.hass, this.config?.cpu_entity)) : o)}</strong><small>${o === void 0 ? "CPU" : "Batterie"}</small></div>` : M}</div>
        ${n.length ? A`<section class="pc-detail-section"><div class="dialog-section-title">Performances principales</div><div class="grid two">${n.map(([e, t, n]) => A`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${n}></ha-icon></span><strong>${e.includes("Température") ? this.temperatureLabel(t) : H(this.hass, t)}</strong></div><div style="margin-top:10px;">${e}</div></div>`)}</div></section>` : M}
        ${r.length ? A`<section class="pc-detail-section"><div class="dialog-section-title">Stockage</div>${r.map((e) => A`<div class="pc-drive-row"><div class="pc-drive-top"><span>${e.label}</span><strong>${e.summary}</strong></div><div class="progress"><span style=${`width:${e.usage}%`}></span></div></div>`)}</section>` : M}
        ${a.length ? A`<section class="pc-detail-section"><div class="dialog-section-title">Session et système</div>${a.map(([e, t]) => this.infoRow(e, t))}</section>` : M}
        ${s.length ? A`<section class="pc-detail-section"><div class="dialog-section-title">Alimentation</div>${s.map(([e, t]) => this.infoRow(e, t))}</section>` : M}
        ${c || l.length ? A`<section class="pc-detail-section"><div class="dialog-section-title">Audio</div>${this.audioDevice("Sortie", this.config?.audio_output_entity, this.config?.audio_output_state_entity, this.config?.audio_output_volume_entity, this.config?.audio_output_muted_entity)}${this.audioDevice("Entrée", this.config?.audio_input_entity, this.config?.audio_input_state_entity, this.config?.audio_input_volume_entity, this.config?.audio_input_muted_entity)}${l.length ? A`<div class="grid two" style="margin-top:10px;">${l.map(([e, t]) => A`<div class="tile"><div class="tile-head"><span>${e}</span><strong>${t}</strong></div></div>`)}</div>` : M}</section>` : M}
        ${i.length ? A`<section class="pc-detail-section"><div class="dialog-section-title">Interfaces réseau${this.availableDisplay(this.config?.network_total_entity) ? ` · ${this.availableDisplay(this.config?.network_total_entity)}` : ""}</div>${i.map((e) => this.networkRow(e))}</section>` : M}
        ${u ? A`<section class="pc-detail-section"><div class="dialog-section-title">Commandes</div><div class="actions">${t && this.config?.lock_entity ? A`<button class="action" ?disabled=${!d} @click=${() => U(this.hass, this.config?.lock_entity)}><ha-icon icon="mdi:lock-outline"></ha-icon>Verrouiller</button>` : M}${t && this.config?.sleep_entity ? A`<button class="action" ?disabled=${!f} @click=${() => U(this.hass, this.config?.sleep_entity)}><ha-icon icon="mdi:power-sleep"></ha-icon>Veille</button>` : M}${t && this.config?.restart_entity ? A`<button class="action" ?disabled=${!p} @click=${this.confirmRestart}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : M}${e === "offline" && this.config?.wake_entity ? A`<button class="action primary" ?disabled=${!h} @click=${() => U(this.hass, this.config?.wake_entity)}><ha-icon icon="mdi:power"></ha-icon>Démarrer</button>` : M}</div>${t && this.config?.shutdown_entity ? A`<div class="dialog-danger-zone"><button class="action danger" style="width:100%;" ?disabled=${!m} @click=${this.confirmShutdown}><ha-icon icon="mdi:power"></ha-icon>Éteindre le PC</button></div>` : M}</section>` : M}
      </div>
    `, "pc-dialog");
	}
	infoRow(e, t) {
		return A`<div class="pc-info-row"><span>${e}</span><strong>${t}</strong></div>`;
	}
	nonNegativeDisplay(e) {
		let t = rt(this.hass, e);
		return t === "—" ? void 0 : t;
	}
	audioDevice(e, t, n, r, i) {
		return R(L(this.hass, t)) ? A`<div class="pc-audio-device"><span class="eyebrow">${e}</span><strong>${H(this.hass, t)}</strong><div class="pc-audio-meta">${R(L(this.hass, n)) ? A`<span>État · ${H(this.hass, n)}</span>` : M}${R(L(this.hass, r)) ? A`<span>Volume · ${H(this.hass, r)}</span>` : M}${R(L(this.hass, i)) ? A`<span>${tt(L(this.hass, i))}</span>` : M}</div></div>` : M;
	}
	networkRow(e) {
		let t = L(this.hass, e.entity), n = nt(t);
		return A`<div class="pc-network-row"><span>${e.label || Me(t, "Interface réseau")}</span><strong class="pc-network-state"><span class="dot ${n === "Connecté" ? "healthy" : ""}"></span>${n}</strong></div>`;
	}
};
//#endregion
//#region src/cards/auralis-unraid-card.ts
function at(e) {
	if (!R(e)) return "unavailable";
	let t = e.state.toLowerCase();
	return t === "paused" || t === "suspended" ? "paused" : z(e) ? "active" : "stopped";
}
function ot(e) {
	if (!R(e)) return;
	let t = B(e, NaN);
	return Number.isFinite(t) ? V(t) : void 0;
}
function J(e, t = "on") {
	return !!(R(e) && e.state.toLowerCase() === t.trim().toLowerCase());
}
function st(e) {
	if (!R(e)) return;
	let t = B(e, NaN);
	return Number.isFinite(t) ? t : void 0;
}
function Y(e, t) {
	return !!(t && R(L(e, t)));
}
function ct(e, t) {
	return t === "start" ? e.start_entity || (Be(e.entity) === "switch" ? e.entity : void 0) : t === "stop" ? e.stop_entity || (Be(e.entity) === "switch" ? e.entity : void 0) : t === "restart" ? e.restart_entity : t === "pause" ? e.pause_entity : e.resume_entity;
}
function X(e) {
	return e === void 0 ? "—" : `${Math.round(e)}%`;
}
var lt = class extends I {
	constructor(...e) {
		super(...e), this.serviceTab = "docker", this.serviceFilter = "all", this.query = "", this.selected = /* @__PURE__ */ new Set(), this.startSelected = async () => {
			let e = [...this.config?.docker || [], ...this.config?.vms || []].filter((e) => this.selected.has(e.entity));
			await Promise.all(e.map((e) => this.startItem(e))), this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
		}, this.confirmArrayStop = () => {
			Y(this.hass, this.config?.array_stop_entity) && (this.askConfirmation({
				title: "Arrêter l’array ?",
				message: "Les partages, conteneurs et machines virtuelles dépendants pourront devenir indisponibles.",
				confirmLabel: "Arrêter l’array",
				action: () => U(this.hass, this.config?.array_stop_entity)
			}), this.dialog = "server");
		};
	}
	static {
		this.styles = [I.styles, o`
      .array-card {
        margin-bottom: 10px;
      }

      .disk-dots {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 5px;
      }

      .disk-dots span {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--auralis-healthy);
      }

      .service-count {
        font-size: 26px;
        font-weight: 740;
        letter-spacing: -0.05em;
      }

      .search {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        margin-bottom: 10px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        outline: none;
        background: var(--auralis-layer);
        color: var(--auralis-text);
      }

      .filters {
        display: flex;
        overflow-x: auto;
        gap: 7px;
        padding-bottom: 10px;
      }

      .filters button {
        flex: 0 0 auto;
        padding: 8px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 999px;
        background: var(--auralis-layer);
        color: var(--auralis-muted);
        cursor: pointer;
      }

      .filters button.active {
        border-color: color-mix(in srgb, var(--auralis-healthy) 42%, transparent);
        background: color-mix(in srgb, var(--auralis-healthy) 12%, var(--auralis-layer));
        color: var(--auralis-healthy);
      }

      .section-label {
        margin: 16px 2px 8px;
        color: var(--auralis-muted);
        font-size: 12px;
        font-weight: 720;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .service-icon {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 12px;
        background: var(--auralis-accent-soft);
        color: var(--auralis-info);
      }

      .selection {
        grid-column: 1;
      }

      .service-main {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 10px;
      }

      .resource-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 5px;
      }

      .resource-tags span {
        padding: 3px 7px;
        border-radius: 999px;
        background: var(--auralis-card);
        color: var(--auralis-muted);
        font-size: 10px;
      }

      .danger-zone {
        margin-top: 10px;
        border-color: color-mix(in srgb, var(--auralis-danger) 40%, transparent);
      }

      .service-actions {
        display: flex;
        max-width: 250px;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }

      .service-actions .action {
        min-height: 36px;
        padding: 6px 9px;
        font-size: 11px;
      }

      .service-actions .action ha-icon {
        --mdc-icon-size: 16px;
      }

      .disk-list {
        display: grid;
        gap: 8px;
      }

      .disk-group + .disk-group {
        margin-top: 14px;
      }

      .disk-group-title {
        margin: 0 2px 8px;
        color: var(--auralis-muted);
        font-size: 11px;
        font-weight: 700;
      }

      .disk-row {
        padding: 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 16px;
        background: var(--auralis-layer);
      }

      .disk-row-head,
      .disk-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .disk-row-head strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .disk-state {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--auralis-muted);
        font-size: 11px;
      }

      .disk-meta {
        margin-top: 9px;
        color: var(--auralis-muted);
        font-size: 11px;
      }

      .disk-row .progress {
        height: 6px;
        margin-top: 9px;
      }

      .disk-row .progress > span {
        background: var(--machine-accent, var(--auralis-info));
      }

      .parity-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
      }

      .parity-summary .dialog-stat {
        min-width: 0;
      }

      @media (max-width: 560px) {
        .service-actions {
          grid-column: 2;
          max-width: none;
          justify-content: flex-start;
        }

        .parity-summary {
          grid-template-columns: 1fr;
        }
      }
    `];
	}
	setConfig(e) {
		if (!e.status_entity) throw Error("status_entity est obligatoire.");
		this.config = {
			...e,
			name: e.name || "Serveur UNRAID",
			theme: e.theme || "auto",
			docker: e.docker || [],
			vms: e.vms || [],
			disks: e.disks || []
		};
	}
	static getStubConfig() {
		return {
			name: "Serveur UNRAID",
			theme: "carbon",
			status_entity: "binary_sensor.unraid_online",
			docker: [],
			vms: []
		};
	}
	static getConfigForm() {
		return {
			schema: [
				{
					name: "name",
					selector: { text: {} }
				},
				{
					name: "theme",
					selector: { select: { options: [
						"auto",
						"halo",
						"carbon",
						"mono",
						"aurora"
					] } }
				},
				{
					name: "status_entity",
					required: !0,
					selector: { entity: {} }
				},
				{
					name: "array_state_entity",
					selector: { entity: {} }
				},
				{
					name: "uptime_entity",
					selector: { entity: {} }
				},
				{
					name: "version_entity",
					selector: { entity: {} }
				},
				{
					name: "array_usage_entity",
					selector: { entity: {} }
				},
				{
					name: "array_label_entity",
					selector: { entity: {} }
				},
				{
					name: "healthy_disks_entity",
					selector: { entity: {} }
				},
				{
					name: "total_disks_entity",
					selector: { entity: {} }
				},
				{
					name: "parity_entity",
					selector: { entity: {} }
				},
				{
					name: "parity_healthy_state",
					selector: { text: {} }
				},
				{
					name: "parity_age_entity",
					selector: { entity: {} }
				},
				{
					name: "parity_errors_entity",
					selector: { entity: {} }
				},
				{
					name: "cpu_entity",
					selector: { entity: {} }
				},
				{
					name: "cpu_temperature_entity",
					selector: { entity: {} }
				},
				{
					name: "disk_temperature_entity",
					selector: { entity: {} }
				},
				{
					name: "memory_entity",
					selector: { entity: {} }
				},
				{
					name: "network_down_entity",
					selector: { entity: {} }
				},
				{
					name: "network_up_entity",
					selector: { entity: {} }
				},
				{
					name: "docker_cpu_entity",
					selector: { entity: {} }
				},
				{
					name: "docker_memory_entity",
					selector: { entity: {} }
				},
				{
					name: "updates_entity",
					selector: { entity: {} }
				},
				{
					name: "notifications_entity",
					selector: { entity: {} }
				},
				{
					name: "ups_connected_entity",
					selector: { entity: {} }
				},
				{
					name: "ups_status_entity",
					selector: { entity: {} }
				},
				{
					name: "ups_battery_entity",
					selector: { entity: {} }
				},
				{
					name: "ups_load_entity",
					selector: { entity: {} }
				},
				{
					name: "ups_runtime_entity",
					selector: { entity: {} }
				},
				{
					name: "server_url_entity",
					selector: { entity: {} }
				},
				{
					name: "array_start_entity",
					selector: { entity: {} }
				},
				{
					name: "array_stop_entity",
					selector: { entity: {} }
				},
				{
					name: "restart_entity",
					selector: { entity: {} }
				},
				{
					name: "shutdown_entity",
					selector: { entity: {} }
				},
				{
					name: "background_image",
					selector: { text: {} }
				},
				{
					name: "background_position",
					selector: { text: {} }
				},
				{
					name: "image_opacity",
					selector: { number: {
						min: 0,
						max: 100,
						step: 1,
						mode: "slider"
					} }
				},
				{
					name: "card_background",
					selector: { object: {} }
				},
				{
					name: "show_grid",
					selector: { boolean: {} }
				},
				{
					name: "accent_color",
					selector: { text: {} }
				},
				{
					name: "image_brightness",
					selector: { number: {
						min: 30,
						max: 100,
						step: 1,
						mode: "slider"
					} }
				},
				{
					name: "glass_opacity",
					selector: { number: {
						min: .45,
						max: .96,
						step: .01,
						mode: "slider"
					} }
				}
			],
			computeHelper: (e) => e.name === "array_stop_entity" ? "Les listes de disques, Docker et VM se configurent en YAML." : void 0
		};
	}
	getCardSize() {
		return 12;
	}
	getGridOptions() {
		return {
			rows: 11,
			min_rows: 10,
			columns: 6,
			min_columns: 3
		};
	}
	render() {
		if (!this.config || !this.hass) return A``;
		let e = L(this.hass, this.config.status_entity), t = R(e) && z(e), n = R(e), r = ot(L(this.hass, this.config.array_usage_entity)), i = st(L(this.hass, this.config.healthy_disks_entity)), a = st(L(this.hass, this.config.total_disks_entity)), o = (this.config.disks || []).filter((e) => R(L(this.hass, e.status_entity))), s = o.filter((e) => J(L(this.hass, e.status_entity), e.healthy_state || "on")).length, c = i === void 0 ? o.length ? s : void 0 : Math.round(i), l = a === void 0 ? o.length || void 0 : Math.round(a), u = (this.config.docker || []).filter((e) => this.itemActive(e)).length, d = (this.config.vms || []).filter((e) => this.itemActive(e)).length, f = this.config.docker?.length || 0, p = this.config.vms?.length || 0, m = ot(L(this.hass, this.config.memory_entity)), h = c !== void 0 && l ? V(c / l * 100) : void 0, g = this.config.disk_temperature_entity || this.config.cpu_temperature_entity, _ = this.config.disk_temperature_entity ? "Disque max." : "CPU", v = L(this.hass, this.config.parity_entity), y = this.config.parity_healthy_state ? J(v, this.config.parity_healthy_state) : R(v) && /^(ok|valid|valide|healthy|protected|protégée)$/i.test(v.state.trim()), b = this.config.parity_entity ? R(v) ? y ? "Valide" : H(this.hass, this.config.parity_entity) : "Indisponible" : "—", ee = this.config.parity_entity ? "Parité" : this.config.array_state_entity ? "Array" : this.config.updates_entity || this.config.notifications_entity ? "Surveillance" : "Système", x = this.config.parity_entity ? `${b}${this.config.parity_age_entity ? ` · vérifiée ${H(this.hass, this.config.parity_age_entity)}` : ""}` : this.config.array_state_entity ? H(this.hass, this.config.array_state_entity) : [this.config.updates_entity ? `${H(this.hass, this.config.updates_entity)} mises à jour` : "", this.config.notifications_entity ? `${H(this.hass, this.config.notifications_entity)} notifications` : ""].filter(Boolean).join(" · ") || "—", S = n ? t ? y ? "array protégée" : "serveur en ligne" : "serveur hors ligne" : "état indisponible", te = this.machineStyle("#ff7b55");
		return A`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${te}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${t ? "healthy" : "danger"}"></span>UNRAID · ${S}</div></div></header>
            <div class="machine-stat-stack">
              <div class="machine-mini-stat"><small>Utilisé</small><strong>${X(r)}</strong></div>
              <div class="machine-mini-stat"><small>${_}</small><strong>${H(this.hass, g)}</strong></div>
            </div>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("server")} aria-label="Détails"><ha-icon icon="mdi:harddisk"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openServices("docker")} aria-label="Docker"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openServices("vm")} aria-label="Machines virtuelles"><ha-icon icon="mdi:shield-server-outline"></ha-icon></button>
            </div>
            <div class="machine-gauge" style=${`--value:${r ?? 0}`}><div class="machine-gauge-content"><strong>${X(r)}</strong><small>${this.config.array_label_entity ? H(this.hass, this.config.array_label_entity) : "Array"}</small></div></div>
            <div class="machine-context"><small>${ee}</small><strong>${x}</strong></div>
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Array</small><strong>${this.config.array_label_entity ? H(this.hass, this.config.array_label_entity) : `${X(r)} utilisés`}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("server")}><ha-icon icon="mdi:database-outline"></ha-icon>Explorer</button></div>
              <div class="machine-bars">
                <div class="machine-bar"><span>Disques</span><div class="track"><span style=${`width:${h ?? 0}%`}></span></div><strong>${c === void 0 || l === void 0 ? "—" : `${c}/${l}`}</strong></div>
                <div class="machine-bar"><span>RAM</span><div class="track"><span style=${`width:${m ?? 0}%`}></span></div><strong>${X(m)}</strong></div>
              </div>
              <div class="machine-foot"><span>Docker <strong>${u}/${f || "—"} actifs</strong></span><span>VM <strong>${d}/${p || "—"} actives</strong></span></div>
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "services" ? this.renderServicesDialog() : M}
      ${this.dialog === "server" ? this.renderServerDialog() : M}
    `;
	}
	statusTile(e, t, n) {
		return A`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${n}></ha-icon></span></div><div style="margin-top:10px;font-weight:680;">${e}</div><div class="muted">${t}</div></div>`;
	}
	serviceTile(e, t, n, r, i) {
		return A`
      <div class="tile clickable" @click=${() => this.openServices(i)}>
        <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${r}></ha-icon></span><span class="service-count">${t}/${n}</span></div>
        <div style="margin-top:10px;font-weight:680;">${e}</div><div class="muted">${t} actif${t > 1 ? "s" : ""}</div>
      </div>
    `;
	}
	openServices(e) {
		this.serviceTab = e, this.serviceFilter = "all", this.query = "", this.selected = /* @__PURE__ */ new Set(), this.openDialog("services");
	}
	itemActive(e) {
		return this.itemState(e) === "active";
	}
	itemPaused(e) {
		return this.itemState(e) === "paused";
	}
	itemState(e) {
		return at(L(this.hass, e.entity));
	}
	serviceItems() {
		let e = this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [], t = this.query.trim().toLocaleLowerCase("fr");
		return e.filter((e) => {
			let n = !t || e.name.toLocaleLowerCase("fr").includes(t) || e.group?.toLocaleLowerCase("fr").includes(t), r = this.itemState(e), i = this.serviceFilter === "all" || this.serviceFilter === "active" && r === "active" || this.serviceFilter === "paused" && r === "paused" || this.serviceFilter === "stopped" && r === "stopped";
			return n && i;
		});
	}
	groupedItems() {
		let e = /* @__PURE__ */ new Map();
		for (let t of this.serviceItems()) {
			let n = t.group || (this.serviceTab === "docker" ? "Services" : "Machines virtuelles");
			e.set(n, [...e.get(n) || [], t]);
		}
		return e;
	}
	renderServicesDialog() {
		let e = this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [], t = e.filter((e) => this.itemActive(e)).length, n = e.filter((e) => this.itemState(e) === "stopped").length, r = e.filter((e) => this.itemPaused(e)).length;
		return this.renderDialog("Services & machines", this.serviceTab === "docker" ? "mdi:cube-outline" : "mdi:monitor-multiple", A`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${this.serviceTab === "docker" ? "Conteneurs Docker" : "Machines virtuelles"}</span><strong>${t} actif${t > 1 ? "s" : ""} sur ${e.length}</strong><span class="muted">Rechercher, filtrer et piloter sans quitter le tableau de bord</span></div><div class="dialog-stat"><strong>${n}</strong><small>arrêté${n > 1 ? "s" : ""}</small></div></div>
          <div class="tabs">
            <button class=${this.serviceTab === "docker" ? "active" : ""} @click=${() => this.changeTab("docker")}>Docker · ${this.config?.docker?.length || 0}</button>
            <button class=${this.serviceTab === "vm" ? "active" : ""} @click=${() => this.changeTab("vm")}>Machines virtuelles · ${this.config?.vms?.length || 0}</button>
          </div>
          <input class="search" placeholder=${this.serviceTab === "docker" ? "Rechercher un service" : "Rechercher une VM"} .value=${this.query} @input=${(e) => {
			this.query = e.target.value, this.requestUpdate();
		}} />
          <div class="filters">
            ${this.filterButton("all", `Tous · ${e.length}`)}
            ${this.filterButton("active", `Actifs · ${t}`)}
            ${this.filterButton("stopped", `Arrêtés · ${n}`)}
            ${this.serviceTab === "vm" ? this.filterButton("paused", `Suspendues · ${r}`) : M}
          </div>
          ${this.serviceItems().length ? Array.from(this.groupedItems()).map(([e, t]) => A`
                <div class="section-label">${e}</div>
                <div class="list">${t.map((e) => this.renderServiceRow(e))}</div>
              `) : A`<div class="empty">Aucun élément ne correspond à ce filtre.</div>`}
        </div>
        <div class="sticky-actions">
          <strong>${this.selected.size} sélectionné${this.selected.size > 1 ? "s" : ""}</strong>
          <div style="display:flex;gap:8px;"><button class="action" @click=${() => {
			this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
		}}>Annuler</button><button class="action primary" ?disabled=${!this.selected.size} @click=${this.startSelected}><ha-icon icon="mdi:play"></ha-icon>Démarrer (${this.selected.size})</button></div>
        </div>
      `);
	}
	filterButton(e, t) {
		return A`<button class=${this.serviceFilter === e ? "active" : ""} @click=${() => {
			this.serviceFilter = e, this.requestUpdate();
		}}>${t}</button>`;
	}
	changeTab(e) {
		this.serviceTab = e, this.serviceFilter = "all", this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
	}
	renderServiceRow(e) {
		let t = this.itemState(e), n = t === "active" ? "healthy" : t === "paused" ? "warning" : "danger", r = t === "active" ? "Actif" : t === "paused" ? "Suspendue" : t === "stopped" ? "Arrêté" : "Indisponible", i = this.serviceTab === "vm", a = e, o = Y(this.hass, ct(e, "start"));
		return A`
      <div class="list-row">
        <input class="selection" type="checkbox" .checked=${this.selected.has(e.entity)} ?disabled=${t !== "stopped" || !o} @change=${() => this.toggleSelected(e.entity)} />
        <div class="service-main">
          <span class="service-icon"><ha-icon .icon=${e.icon || (i ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
          <div class="meta">
            <div class="name">${e.name}</div>
            <div class="state"><span class="dot ${n}" style="display:inline-block;margin-right:5px;"></span>${r}${e.cpu_entity ? ` · CPU ${H(this.hass, e.cpu_entity)}` : ""}</div>
            ${i ? A`<div class="resource-tags">${a.vcpus ? A`<span>${a.vcpus} vCPU</span>` : M}${a.memory ? A`<span>${a.memory}</span>` : M}${a.storage ? A`<span>${a.storage}</span>` : M}${a.ip_entity ? A`<span>${H(this.hass, a.ip_entity)}</span>` : M}</div>` : M}
          </div>
        </div>
        ${this.renderServiceActions(e, t)}
      </div>
    `;
	}
	renderServiceActions(e, t) {
		let n = e, r = this.serviceTab === "vm", i = (n, r, i, a = "", o = !1) => {
			let s = ct(e, n);
			if (!s) return A``;
			let c = t !== "unavailable" && Y(this.hass, s), l = o ? () => this.confirmItemAction(e, n) : () => this.runItemAction(e, n);
			return A`<button class=${`action ${a}`.trim()} ?disabled=${!c} @click=${l}><ha-icon .icon=${i}></ha-icon>${r}</button>`;
		};
		return A`
      <div class="service-actions">
        ${t === "stopped" ? i("start", "Démarrer", "mdi:play", "primary") : M}
        ${t === "paused" ? i("resume", "Reprendre", "mdi:play", "primary") : M}
        ${t === "active" && r ? i("pause", "Pause", "mdi:pause") : M}
        ${t === "active" ? i("restart", "Redémarrer", "mdi:restart", "", !0) : M}
        ${t === "active" || t === "paused" ? i("stop", r ? "Éteindre" : "Arrêter", "mdi:stop-circle-outline", "danger", !0) : M}
        ${r && n.console_url ? A`<button class="action" @click=${() => window.open(n.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>` : M}
      </div>
    `;
	}
	toggleSelected(e) {
		let t = new Set(this.selected);
		t.has(e) ? t.delete(e) : t.add(e), this.selected = t, this.requestUpdate();
	}
	async runItemAction(e, t) {
		let n = ct(e, t);
		if (!Y(this.hass, n)) return;
		let r = t === "start" && !e.start_entity && n === e.entity || t === "stop" && !e.stop_entity && n === e.entity;
		if (t === "stop" && r) {
			await Ve(this.hass, n);
			return;
		}
		await U(this.hass, n);
	}
	async startItem(e) {
		await this.runItemAction(e, "start");
	}
	confirmItemAction(e, t) {
		let n = ct(e, t);
		if (!Y(this.hass, n)) return;
		let r = t === "restart", i = this.serviceTab === "vm", a = r ? "Redémarrer" : i ? "Éteindre" : "Arrêter";
		this.askConfirmation({
			title: `${a} ${e.name} ?`,
			message: r ? "Le service sera brièvement indisponible pendant son redémarrage." : i ? "La machine virtuelle et ses services deviendront indisponibles." : "Le conteneur et le service qu’il fournit deviendront indisponibles.",
			confirmLabel: a,
			action: () => this.runItemAction(e, t)
		}), this.dialog = "services";
	}
	confirmServerAction(e) {
		let t = e === "restart", n = t ? this.config?.restart_entity : this.config?.shutdown_entity;
		Y(this.hass, n) && (this.askConfirmation({
			title: `${t ? "Redémarrer" : "Éteindre"} le serveur ?`,
			message: "L’array, les conteneurs Docker et les machines virtuelles pourront devenir indisponibles.",
			confirmLabel: t ? "Redémarrer" : "Éteindre",
			action: () => U(this.hass, n)
		}), this.dialog = "server");
	}
	renderDiskRow(e) {
		let t = ot(L(this.hass, e.usage_entity)), n = L(this.hass, e.status_entity), r = J(n, e.healthy_state || "on"), i = !e.status_entity || r ? "healthy" : "danger", a = e.status_entity ? R(n) ? r ? "Sain" : "À contrôler" : "Indisponible" : "Suivi";
		return A`
      <div class="disk-row">
        <div class="disk-row-head">
          <strong>${e.name}</strong>
          <span class="disk-state"><span class="dot ${i}"></span>${a}</span>
        </div>
        <div class="progress"><span style=${`width:${t ?? 0}%`}></span></div>
        <div class="disk-meta">
          <span>${e.capacity_entity ? H(this.hass, e.capacity_entity) : `${X(t)} utilisés`}</span>
          ${e.temperature_entity ? A`<span>${H(this.hass, e.temperature_entity)}</span>` : M}
        </div>
      </div>
    `;
	}
	groupedDisks(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e) {
			let e = n.group || "Stockage";
			t.set(e, [...t.get(e) || [], n]);
		}
		return t;
	}
	configuredServerUrl() {
		let e = L(this.hass, this.config?.server_url_entity)?.state;
		if (e) try {
			let t = new URL(e);
			return t.protocol === "http:" || t.protocol === "https:" ? t.href : void 0;
		} catch {
			return;
		}
	}
	renderServerDialog() {
		let e = ot(L(this.hass, this.config?.array_usage_entity)), t = (this.config?.docker || []).filter((e) => this.itemActive(e)).length, n = (this.config?.vms || []).filter((e) => this.itemActive(e)).length, r = this.config?.docker?.length || 0, i = this.config?.vms?.length || 0, a = L(this.hass, this.config?.status_entity), o = R(a) && z(a), s = this.config?.disks || [], c = L(this.hass, this.config?.parity_entity), l = this.config?.parity_healthy_state ? J(c, this.config.parity_healthy_state) : R(c) && /^(ok|valid|valide|healthy|protected|protégée)$/i.test(c.state.trim()), u = this.config?.parity_entity ? R(c) ? l ? "Valide" : H(this.hass, this.config.parity_entity) : "Indisponible" : "—", d = !!(this.config?.parity_entity || this.config?.parity_age_entity || this.config?.parity_errors_entity), f = !!(this.config?.version_entity || this.config?.updates_entity || this.config?.notifications_entity), p = !!(this.config?.network_down_entity || this.config?.network_up_entity), m = !!(this.config?.ups_connected_entity || this.config?.ups_status_entity || this.config?.ups_battery_entity || this.config?.ups_load_entity || this.config?.ups_runtime_entity), h = !!(this.config?.docker_cpu_entity || this.config?.docker_memory_entity), g = !!(this.config?.array_stop_entity || this.config?.restart_entity || this.config?.shutdown_entity), _ = this.configuredServerUrl(), v = this.config?.array_state_entity ? H(this.hass, this.config.array_state_entity) : o ? "Démarré" : "Indisponible", y = this.config?.array_label_entity ? H(this.hass, this.config.array_label_entity) : X(e), b = this.config?.ups_connected_entity ? J(L(this.hass, this.config.ups_connected_entity), "on") ? "Connecté" : "Déconnecté" : H(this.hass, this.config?.ups_status_entity);
		return this.renderDialog(this.config?.name || "Serveur UNRAID", "mdi:server", A`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">État du serveur</span><strong>Serveur ${o ? "en ligne" : "indisponible"}</strong><span class="muted">${this.config?.uptime_entity ? `En service depuis ${H(this.hass, this.config.uptime_entity)}` : "Stockage et services disponibles"}</span></div><div class="dialog-stat"><strong>${X(e)}</strong><small>utilisé</small></div></div>
          <div class="dialog-section-title">Stockage et santé</div>
          <div class="grid two">
            ${this.statusTile("Array", `${v} · ${y}`, "mdi:database-outline")}
            ${this.statusTile("CPU", `${H(this.hass, this.config?.cpu_entity)} · ${H(this.hass, this.config?.cpu_temperature_entity)}`, "mdi:cpu-64-bit")}
            ${this.statusTile("RAM", H(this.hass, this.config?.memory_entity), "mdi:memory")}
            ${h ? this.statusTile("Docker", `CPU ${H(this.hass, this.config?.docker_cpu_entity)} · RAM ${H(this.hass, this.config?.docker_memory_entity)}`, "mdi:docker") : this.statusTile("Parité", u, "mdi:shield-check-outline")}
          </div>
          ${f ? A`<div class="parity-summary">
                ${this.config?.version_entity ? A`<div class="dialog-stat"><strong>${H(this.hass, this.config.version_entity)}</strong><small>version UNRAID</small></div>` : M}
                ${this.config?.updates_entity ? A`<div class="dialog-stat"><strong>${H(this.hass, this.config.updates_entity)}</strong><small>mises à jour</small></div>` : M}
                ${this.config?.notifications_entity ? A`<div class="dialog-stat"><strong>${H(this.hass, this.config.notifications_entity)}</strong><small>notifications</small></div>` : M}
              </div>` : M}
          ${d ? A`<div class="dialog-section"><div class="dialog-section-title">Parité</div><div class="parity-summary">
                ${this.config?.parity_entity ? A`<div class="dialog-stat"><strong>${u}</strong><small>état</small></div>` : M}
                ${this.config?.parity_age_entity ? A`<div class="dialog-stat"><strong>${H(this.hass, this.config.parity_age_entity)}</strong><small>dernière vérification</small></div>` : M}
                ${this.config?.parity_errors_entity ? A`<div class="dialog-stat"><strong>${H(this.hass, this.config.parity_errors_entity)}</strong><small>erreurs détectées</small></div>` : M}
              </div></div>` : M}
          ${s.length ? A`<div class="dialog-section"><div class="dialog-section-title">Détail des disques</div>${Array.from(this.groupedDisks(s)).map(([e, t]) => A`<div class="disk-group"><div class="disk-group-title">${e}</div><div class="disk-list">${t.map((e) => this.renderDiskRow(e))}</div></div>`)}</div>` : M}
          ${p ? A`<div class="dialog-section"><div class="dialog-section-title">Activité réseau</div><div class="grid two">
                ${this.config?.network_down_entity ? this.statusTile("Entrant", H(this.hass, this.config.network_down_entity), "mdi:download-network-outline") : M}
                ${this.config?.network_up_entity ? this.statusTile("Sortant", H(this.hass, this.config.network_up_entity), "mdi:upload-network-outline") : M}
              </div></div>` : M}
          ${m ? A`<div class="dialog-section"><div class="dialog-section-title">Onduleur</div><div class="grid two">
                ${this.statusTile("Connexion", b, "mdi:power-plug-outline")}
                ${this.config?.ups_status_entity ? this.statusTile("État", H(this.hass, this.config.ups_status_entity), "mdi:information-outline") : M}
                ${this.config?.ups_battery_entity ? this.statusTile("Batterie", H(this.hass, this.config.ups_battery_entity), "mdi:battery-high") : M}
                ${this.config?.ups_load_entity ? this.statusTile("Charge", H(this.hass, this.config.ups_load_entity), "mdi:gauge") : M}
                ${this.config?.ups_runtime_entity ? this.statusTile("Autonomie", H(this.hass, this.config.ups_runtime_entity), "mdi:timer-outline") : M}
              </div></div>` : M}
          <div class="dialog-section">
            <div class="dialog-section-title">Services</div>
            <div class="actions">
              ${this.config?.array_start_entity ? A`<button class="action primary" ?disabled=${!Y(this.hass, this.config.array_start_entity)} @click=${() => U(this.hass, this.config?.array_start_entity)}><ha-icon icon="mdi:play"></ha-icon>Démarrer l’array</button>` : M}
              <button class="action" @click=${() => this.openServices("docker")}><ha-icon icon="mdi:cube-outline"></ha-icon>Docker · ${t}/${r}</button>
              <button class="action" @click=${() => this.openServices("vm")}><ha-icon icon="mdi:monitor-multiple"></ha-icon>VM · ${n}/${i}</button>
              ${_ ? A`<button class="action primary" @click=${() => window.open(_, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:open-in-new"></ha-icon>Ouvrir UNRAID</button>` : M}
            </div>
          </div>
          ${g ? A`<div class="dialog-danger-zone"><div class="dialog-section-title">Zone sensible</div><div class="actions">
                ${this.config?.array_stop_entity ? A`<button class="action danger" ?disabled=${!Y(this.hass, this.config.array_stop_entity)} @click=${this.confirmArrayStop}><ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter l’array</button>` : M}
                ${this.config?.restart_entity ? A`<button class="action danger" ?disabled=${!Y(this.hass, this.config.restart_entity)} @click=${() => this.confirmServerAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer le serveur</button>` : M}
                ${this.config?.shutdown_entity ? A`<button class="action danger" ?disabled=${!Y(this.hass, this.config.shutdown_entity)} @click=${() => this.confirmServerAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Éteindre le serveur</button>` : M}
              </div></div>` : M}
        </div>
      `);
	}
};
//#endregion
//#region src/cards/auralis-proxmox-card.ts
function ut(e) {
	return R(e) ? z(e) ? "online" : "offline" : "unavailable";
}
function Z(e) {
	if (!R(e)) return;
	let t = B(e, NaN);
	return Number.isFinite(t) ? V(t) : void 0;
}
function Q(e, t) {
	return !!(t && R(L(e, t)));
}
function $(e) {
	return e === void 0 ? "—" : `${Math.round(e)}%`;
}
function dt(e, t) {
	return t ? V(e / t * 100) : void 0;
}
var ft = class extends I {
	constructor(...e) {
		super(...e), this.workloadTab = "vm", this.workloadFilter = "all", this.query = "", this.selected = /* @__PURE__ */ new Set(), this.startSelected = async () => {
			let e = [...this.config?.vms || [], ...this.config?.containers || []];
			await Promise.all(e.filter((e) => this.selected.has(e.entity)).map((e) => this.startItem(e))), this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
		};
	}
	static {
		this.styles = [I.styles, o`
      .search {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        margin-bottom: 10px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        outline: none;
        background: var(--auralis-layer);
        color: var(--auralis-text);
      }

      .filters {
        display: flex;
        overflow-x: auto;
        gap: 7px;
        padding-bottom: 10px;
      }

      .filters button {
        flex: 0 0 auto;
        padding: 8px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 999px;
        background: var(--auralis-layer);
        color: var(--auralis-muted);
        cursor: pointer;
      }

      .filters button.active {
        border-color: color-mix(in srgb, var(--auralis-healthy) 42%, transparent);
        background: color-mix(in srgb, var(--auralis-healthy) 12%, var(--auralis-layer));
        color: var(--auralis-healthy);
      }

      .section-label {
        margin: 16px 2px 8px;
        color: var(--auralis-muted);
        font-size: 12px;
        font-weight: 720;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .service-main {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 10px;
      }

      .service-icon {
        display: grid;
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 12px;
        background: var(--auralis-accent-soft);
        color: var(--auralis-info);
      }

      .selection {
        grid-column: 1;
      }

      .resource-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 5px;
      }

      .resource-tags span {
        padding: 3px 7px;
        border-radius: 999px;
        background: var(--auralis-card);
        color: var(--auralis-muted);
        font-size: 10px;
      }

      .machine-gauge.metric-unavailable {
        --value: 0;
      }

      .machine-gauge.metric-unavailable .machine-gauge-content strong,
      .machine-bar.metric-unavailable strong {
        color: #8e9baa;
      }

      .machine-bar.metric-unavailable .track span {
        width: 0 !important;
        background: transparent;
      }

      .machine-bar.cluster-bar {
        grid-template-columns: 48px minmax(0, 1fr) minmax(42px, auto);
      }

      .cluster-signals {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin-top: 16px;
      }

      .cluster-signals.with-alerts {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .cluster-signal {
        min-width: 0;
        padding: 8px 9px;
        border: 1px solid rgba(195, 211, 229, 0.12);
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.035);
      }

      .cluster-signal small,
      .cluster-signal strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cluster-signal small {
        color: #8f9daf;
        font-size: 8px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .cluster-signal strong {
        margin-top: 5px;
        color: #f4f7fb;
        font-size: 9px;
      }

      .cluster-signal.warning strong {
        color: var(--auralis-active);
      }

      .node-list {
        display: grid;
        gap: 8px;
      }

      .node-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 16px;
        background: var(--auralis-layer);
      }

      .node-actions {
        display: flex;
        gap: 7px;
      }

      .node-actions .icon-button {
        width: 36px;
        height: 36px;
      }

      @media (max-width: 480px) {
        .node-row {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .node-actions {
          grid-column: 2;
        }
      }
    `];
	}
	setConfig(e) {
		if (!e.status_entity) throw Error("status_entity est obligatoire.");
		this.config = {
			...e,
			name: e.name || "Cluster Proxmox",
			theme: e.theme || "auto",
			nodes: e.nodes || [],
			vms: e.vms || [],
			containers: e.containers || []
		};
	}
	static getStubConfig() {
		return {
			name: "Cluster Proxmox",
			theme: "carbon",
			status_entity: "binary_sensor.proxmox_online",
			nodes: [],
			vms: [],
			containers: []
		};
	}
	static getConfigForm() {
		return {
			schema: [
				{
					name: "name",
					selector: { text: {} }
				},
				{
					name: "theme",
					selector: { select: { options: [
						"auto",
						"halo",
						"carbon",
						"mono",
						"aurora"
					] } }
				},
				{
					name: "status_entity",
					required: !0,
					selector: { entity: {} }
				},
				{
					name: "version_entity",
					selector: { entity: {} }
				},
				{
					name: "quorum_entity",
					selector: { entity: {} }
				},
				{
					name: "cluster_usage_entity",
					selector: { entity: {} }
				},
				{
					name: "memory_entity",
					selector: { entity: {} }
				},
				{
					name: "memory_label_entity",
					selector: { entity: {} }
				},
				{
					name: "storage_entity",
					selector: { entity: {} }
				},
				{
					name: "storage_label_entity",
					selector: { entity: {} }
				},
				{
					name: "ceph_entity",
					selector: { entity: {} }
				},
				{
					name: "backup_entity",
					selector: { entity: {} }
				},
				{
					name: "alerts_entity",
					selector: { entity: {} }
				},
				{
					name: "backup_action_entity",
					selector: { entity: {} }
				},
				{
					name: "restart_entity",
					selector: { entity: {} }
				},
				{
					name: "shutdown_entity",
					selector: { entity: {} }
				},
				{
					name: "background_image",
					selector: { text: {} }
				},
				{
					name: "background_position",
					selector: { text: {} }
				},
				{
					name: "accent_color",
					selector: { text: {} }
				},
				{
					name: "image_brightness",
					selector: { number: {
						min: 30,
						max: 100,
						step: 1,
						mode: "slider"
					} }
				},
				{
					name: "glass_opacity",
					selector: { number: {
						min: .45,
						max: .96,
						step: .01,
						mode: "slider"
					} }
				}
			],
			computeHelper: (e) => e.name === "backup_action_entity" ? "Les nœuds, VM et conteneurs se configurent en YAML." : void 0
		};
	}
	getCardSize() {
		return 12;
	}
	getGridOptions() {
		return {
			rows: 11,
			min_rows: 10,
			columns: 6,
			min_columns: 3
		};
	}
	render() {
		if (!this.config || !this.hass) return A``;
		let e = ut(L(this.hass, this.config.status_entity)), t = e === "online", n = Z(L(this.hass, this.config.cluster_usage_entity)), r = Z(L(this.hass, this.config.memory_entity)), i = Z(L(this.hass, this.config.storage_entity)), a = (this.config.nodes || []).filter((e) => this.nodeActive(e)).length, o = this.config.nodes?.length || 0, s = (this.config.vms || []).filter((e) => this.itemActive(e)).length, c = this.config.vms?.length || 0, l = (this.config.containers || []).filter((e) => this.itemActive(e)).length, u = this.config.containers?.length || 0, d = dt(s, c), f = dt(l, u), p = this.config.quorum_entity ? H(this.hass, this.config.quorum_entity) : `${a} / ${o || "—"}`, m = (this.config.nodes || []).map((e) => e.name).join(" · ") || "Aucun nœud configuré", h = this.config.memory_label_entity ? H(this.hass, this.config.memory_label_entity) : $(r), g = this.config.storage_label_entity ? H(this.hass, this.config.storage_label_entity) : $(i), _ = L(this.hass, this.config.alerts_entity), v = R(_) ? B(_, NaN) : void 0, y = v === 0 ? "Aucune" : Number.isFinite(v) ? `${Math.round(v)} active${v === 1 ? "" : "s"}` : H(this.hass, this.config.alerts_entity), b = o ? a === o ? o === 1 ? "Le nœud est disponible" : `Les ${o} nœuds sont disponibles` : `${a}/${o} nœuds disponibles` : "Aucun nœud configuré", ee = e === "online" ? `Proxmox · quorum ${p}` : e === "offline" ? "Proxmox · cluster hors ligne" : "État du cluster indisponible", x = e === "online" ? "healthy" : e === "offline" ? "danger" : "", S = t && Q(this.hass, this.config.backup_action_entity);
		return A`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${this.machineStyle("#50d59b")}>
          <div class="machine-content">
            <header class="machine-header">
              <div>
                <h2>${this.config.name}</h2>
                <div class="machine-status">
                  <span class="dot ${x}"></span>
                  ${ee}
                </div>
              </div>
            </header>
            <div class="machine-stat-stack">
              <div class="machine-mini-stat"><small>Charge</small><strong>${$(n)}</strong></div>
              <div class="machine-mini-stat"><small>Mémoire</small><strong>${h}</strong></div>
            </div>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("cluster")} aria-label="Détails du cluster"><ha-icon icon="mdi:lan"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openWorkloads("vm")} aria-label="Machines virtuelles"><ha-icon icon="mdi:layers-triple-outline"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openWorkloads("container")} aria-label="Conteneurs LXC"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
              <button class="rail-button" ?disabled=${!S} @click=${() => U(this.hass, this.config?.backup_action_entity)} aria-label="Lancer la sauvegarde"><ha-icon icon="mdi:backup-restore"></ha-icon></button>
            </div>
            <div class="machine-gauge ${n === void 0 ? "metric-unavailable" : ""}" style=${`--value:${n ?? 0}`}>
              <div class="machine-gauge-content"><strong>${$(n)}</strong><small>Cluster</small></div>
            </div>
            <div class="machine-context"><small>Nœuds</small><strong>${m}</strong></div>
            <section class="machine-panel">
              <div class="machine-panel-head">
                <div class="machine-panel-title"><small>Cluster</small><strong>${b}</strong></div>
                <button class="machine-accent-action" @click=${() => this.openDialog("cluster")}><ha-icon icon="mdi:source-branch"></ha-icon>Cluster</button>
              </div>
              <div class="machine-bars">
                <div class="machine-bar cluster-bar ${d === void 0 ? "metric-unavailable" : ""}"><span>VM</span><div class="track"><span style=${`width:${d ?? 0}%`}></span></div><strong>${s}/${c || "—"}</strong></div>
                <div class="machine-bar cluster-bar ${f === void 0 ? "metric-unavailable" : ""}"><span>LXC</span><div class="track"><span style=${`width:${f ?? 0}%`}></span></div><strong>${l}/${u || "—"}</strong></div>
                <div class="machine-bar cluster-bar ${i === void 0 ? "metric-unavailable" : ""}"><span>Stockage</span><div class="track"><span style=${`width:${i ?? 0}%`}></span></div><strong title=${g}>${g}</strong></div>
              </div>
              <div class="cluster-signals ${this.config.alerts_entity ? "with-alerts" : ""}">
                <span class="cluster-signal"><small>Ceph</small><strong title=${H(this.hass, this.config.ceph_entity)}>${H(this.hass, this.config.ceph_entity)}</strong></span>
                <span class="cluster-signal"><small>Backup</small><strong title=${H(this.hass, this.config.backup_entity)}>${H(this.hass, this.config.backup_entity)}</strong></span>
                ${this.config.alerts_entity ? A`<span class="cluster-signal ${typeof v == "number" && v > 0 ? "warning" : ""}"><small>Alertes</small><strong title=${y}>${y}</strong></span>` : M}
              </div>
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "cluster" ? this.renderClusterDialog() : M}
      ${this.dialog === "workloads" ? this.renderWorkloadsDialog() : M}
    `;
	}
	nodeActive(e) {
		return z(L(this.hass, e.status_entity));
	}
	itemActive(e) {
		return z(L(this.hass, e.entity));
	}
	itemPaused(e) {
		let t = L(this.hass, e.entity)?.state.toLowerCase();
		return t === "paused" || t === "suspended";
	}
	openWorkloads(e) {
		this.workloadTab = e, this.workloadFilter = "all", this.query = "", this.selected = /* @__PURE__ */ new Set(), this.openDialog("workloads");
	}
	allWorkloads() {
		return this.workloadTab === "vm" ? this.config?.vms || [] : this.config?.containers || [];
	}
	workloadItems() {
		let e = this.query.trim().toLocaleLowerCase("fr");
		return this.allWorkloads().filter((t) => {
			let n = !e || t.name.toLocaleLowerCase("fr").includes(e) || t.group?.toLocaleLowerCase("fr").includes(e) || t.node?.toLocaleLowerCase("fr").includes(e), r = this.itemActive(t), i = this.itemPaused(t), a = this.workloadFilter === "all" || this.workloadFilter === "active" && r || this.workloadFilter === "paused" && i || this.workloadFilter === "stopped" && !r && !i;
			return n && a;
		});
	}
	groupedItems() {
		let e = /* @__PURE__ */ new Map();
		for (let t of this.workloadItems()) {
			let n = t.group || t.node || (this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC");
			e.set(n, [...e.get(n) || [], t]);
		}
		return e;
	}
	renderWorkloadsDialog() {
		let e = this.allWorkloads(), t = e.filter((e) => this.itemActive(e)).length, n = e.filter((e) => this.itemPaused(e)).length, r = e.filter((e) => !this.itemActive(e) && !this.itemPaused(e)).length;
		return this.renderDialog("Charges virtuelles", this.workloadTab === "vm" ? "mdi:layers-triple-outline" : "mdi:cube-outline", A`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">${this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC"}</span><strong>${t} actif${t > 1 ? "s" : ""} sur ${e.length}</strong><span class="muted">Filtrer, démarrer et ouvrir les consoles depuis le dashboard</span></div>
            <div class="dialog-stat"><strong>${r}</strong><small>arrêté${r > 1 ? "s" : ""}</small></div>
          </div>
          <div class="tabs">
            <button class=${this.workloadTab === "vm" ? "active" : ""} @click=${() => this.changeTab("vm")}>VM · ${this.config?.vms?.length || 0}</button>
            <button class=${this.workloadTab === "container" ? "active" : ""} @click=${() => this.changeTab("container")}>LXC · ${this.config?.containers?.length || 0}</button>
          </div>
          <input class="search" placeholder=${this.workloadTab === "vm" ? "Rechercher une VM" : "Rechercher un conteneur"} .value=${this.query} @input=${(e) => {
			this.query = e.target.value, this.requestUpdate();
		}} />
          <div class="filters">
            ${this.filterButton("all", `Tous · ${e.length}`)}
            ${this.filterButton("active", `Actifs · ${t}`)}
            ${this.filterButton("stopped", `Arrêtés · ${r}`)}
            ${this.filterButton("paused", `Suspendus · ${n}`)}
          </div>
          ${this.workloadItems().length ? Array.from(this.groupedItems()).map(([e, t]) => A`<div class="section-label">${e}</div><div class="list">${t.map((e) => this.renderWorkloadRow(e))}</div>`) : A`<div class="empty">Aucune charge ne correspond à ce filtre.</div>`}
        </div>
        <div class="sticky-actions">
          <strong>${this.selected.size} sélectionné${this.selected.size > 1 ? "s" : ""}</strong>
          <div style="display:flex;gap:8px;"><button class="action" @click=${() => {
			this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
		}}>Annuler</button><button class="action primary" ?disabled=${!this.selected.size} @click=${this.startSelected}><ha-icon icon="mdi:play"></ha-icon>Démarrer (${this.selected.size})</button></div>
        </div>
      `);
	}
	filterButton(e, t) {
		return A`<button class=${this.workloadFilter === e ? "active" : ""} @click=${() => {
			this.workloadFilter = e, this.requestUpdate();
		}}>${t}</button>`;
	}
	changeTab(e) {
		this.workloadTab = e, this.workloadFilter = "all", this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
	}
	renderWorkloadRow(e) {
		let t = this.itemActive(e), n = this.itemPaused(e), r = Q(this.hass, e.start_entity || e.entity), i = t ? "healthy" : n ? "warning" : "danger", a = t ? "Actif" : n ? "Suspendu" : "Arrêté";
		return A`
      <div class="list-row">
        <input class="selection" type="checkbox" .checked=${this.selected.has(e.entity)} ?disabled=${t || n || !r} @change=${() => this.toggleSelected(e.entity)} />
        <div class="service-main">
          <span class="service-icon"><ha-icon .icon=${e.icon || (this.workloadTab === "vm" ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
          <div class="meta">
            <div class="name">${e.name}</div>
            <div class="state"><span class="dot ${i}" style="display:inline-block;margin-right:5px;"></span>${a}${e.node ? ` · ${e.node}` : ""}${e.cpu_entity ? ` · CPU ${H(this.hass, e.cpu_entity)}` : ""}</div>
            <div class="resource-tags">${e.vcpus ? A`<span>${e.vcpus} vCPU</span>` : M}${e.memory ? A`<span>${e.memory}</span>` : M}${e.storage ? A`<span>${e.storage}</span>` : M}${e.ip_entity ? A`<span>${H(this.hass, e.ip_entity)}</span>` : M}</div>
          </div>
        </div>
        ${this.renderWorkloadAction(e, t, n)}
      </div>
    `;
	}
	renderWorkloadAction(e, t, n) {
		return n ? A`<button class="action primary" ?disabled=${!Q(this.hass, e.resume_entity)} @click=${() => U(this.hass, e.resume_entity)}><ha-icon icon="mdi:play"></ha-icon>Reprendre</button>` : t ? e.console_url ? A`<button class="action" @click=${() => window.open(e.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>` : A`<button class="action" ?disabled=${!Q(this.hass, e.restart_entity)} @click=${() => U(this.hass, e.restart_entity)}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : A`<button class="action primary" ?disabled=${!Q(this.hass, e.start_entity || e.entity)} @click=${() => this.startItem(e)}><ha-icon icon="mdi:play"></ha-icon>Démarrer</button>`;
	}
	toggleSelected(e) {
		let t = new Set(this.selected);
		t.has(e) ? t.delete(e) : t.add(e), this.selected = t, this.requestUpdate();
	}
	async startItem(e) {
		let t = e.start_entity || e.entity;
		Q(this.hass, t) && await U(this.hass, t);
	}
	confirmNodeAction(e, t) {
		let n = t === "restart", r = n ? e.restart_entity : e.shutdown_entity;
		this.nodeActive(e) && Q(this.hass, r) && (this.askConfirmation({
			title: `${n ? "Redémarrer" : "Arrêter"} ${e.name} ?`,
			message: n ? "Les charges hébergées sur ce nœud pourront être interrompues pendant le redémarrage." : "Le nœud et les charges qui n’ont pas été migrées deviendront indisponibles.",
			confirmLabel: n ? "Redémarrer" : "Arrêter",
			action: () => U(this.hass, r)
		}), this.dialog = "cluster");
	}
	confirmClusterAction(e) {
		let t = e === "restart", n = t ? this.config?.restart_entity : this.config?.shutdown_entity;
		ut(L(this.hass, this.config?.status_entity)) === "online" && Q(this.hass, n) && (this.askConfirmation({
			title: `${t ? "Redémarrer" : "Arrêter"} le cluster ?`,
			message: "Cette action peut interrompre plusieurs machines virtuelles et services. Vérifiez les migrations avant de continuer.",
			confirmLabel: t ? "Redémarrer" : "Arrêter",
			action: () => U(this.hass, n)
		}), this.dialog = "cluster");
	}
	renderClusterDialog() {
		let e = (this.config?.nodes || []).filter((e) => this.nodeActive(e)).length, t = this.config?.nodes?.length || 0, n = Z(L(this.hass, this.config?.cluster_usage_entity)), r = ut(L(this.hass, this.config?.status_entity)), i = r === "online", a = i && Q(this.hass, this.config?.backup_action_entity), o = i && Q(this.hass, this.config?.restart_entity), s = i && Q(this.hass, this.config?.shutdown_entity), c = L(this.hass, this.config?.alerts_entity), l = R(c) ? B(c, NaN) : void 0, u = l === 0 ? "Aucune" : Number.isFinite(l) ? `${Math.round(l)} active${l === 1 ? "" : "s"}` : H(this.hass, this.config?.alerts_entity);
		return this.renderDialog(this.config?.name || "Cluster Proxmox", "mdi:server-network", A`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">État du cluster</span><strong>${i ? `${e}/${t || "—"} nœuds disponibles` : r === "offline" ? "Cluster hors ligne" : "État indisponible"}</strong><span class="muted">${this.config?.version_entity ? `Version ${H(this.hass, this.config.version_entity)}` : "Quorum, ressources et sauvegardes"}</span></div><div class="dialog-stat"><strong>${$(n)}</strong><small>charge</small></div></div>
          <div class="dialog-section-title">Nœuds</div>
          <div class="node-list">
            ${(this.config?.nodes || []).map((e) => {
			let t = ut(L(this.hass, e.status_entity)), n = t === "online", r = n ? "healthy" : t === "offline" ? "danger" : "", i = n ? "En ligne" : t === "offline" ? "Hors ligne" : "État indisponible", a = n && Q(this.hass, e.restart_entity), o = n && Q(this.hass, e.shutdown_entity);
			return A`
                <div class="node-row">
                  <span class="tile-icon"><ha-icon .icon=${e.icon || "mdi:server"}></ha-icon></span>
                  <div class="meta"><div class="name">${e.name}</div><div class="state"><span class="dot ${r}" style="display:inline-block;margin-right:5px;"></span>${i}${e.cpu_entity ? ` · CPU ${H(this.hass, e.cpu_entity)}` : ""}${e.memory_entity ? ` · RAM ${H(this.hass, e.memory_entity)}` : ""}${e.temperature_entity ? ` · ${H(this.hass, e.temperature_entity)}` : ""}</div></div>
                  <div class="node-actions"><button class="icon-button" ?disabled=${!a} @click=${() => this.confirmNodeAction(e, "restart")} aria-label=${`Redémarrer ${e.name}`}><ha-icon icon="mdi:restart"></ha-icon></button><button class="icon-button" ?disabled=${!o} @click=${() => this.confirmNodeAction(e, "shutdown")} aria-label=${`Arrêter ${e.name}`}><ha-icon icon="mdi:power"></ha-icon></button></div>
                </div>
              `;
		})}
            ${t ? M : A`<div class="empty">Ajoutez les nœuds dans la configuration YAML.</div>`}
          </div>
          <div class="dialog-section"><div class="dialog-section-title">Services du cluster</div><div class="actions"><button class="action" @click=${() => this.openWorkloads("vm")}><ha-icon icon="mdi:layers-triple-outline"></ha-icon>VM · ${this.config?.vms?.length || 0}</button><button class="action" @click=${() => this.openWorkloads("container")}><ha-icon icon="mdi:cube-outline"></ha-icon>LXC · ${this.config?.containers?.length || 0}</button><button class="action primary" ?disabled=${!a} @click=${() => U(this.hass, this.config?.backup_action_entity)}><ha-icon icon="mdi:backup-restore"></ha-icon>Lancer le backup</button></div></div>
          <div class="grid two" style="margin-top:18px;">
            <div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:harddisk"></ha-icon></span><strong>${this.config?.storage_label_entity ? H(this.hass, this.config.storage_label_entity) : $(Z(L(this.hass, this.config?.storage_entity)))}</strong></div><div style="margin-top:10px;">Stockage</div></div>
            <div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:database-check-outline"></ha-icon></span><strong>${H(this.hass, this.config?.ceph_entity)}</strong></div><div style="margin-top:10px;">Ceph</div></div>
            <div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:calendar-clock"></ha-icon></span><strong>${H(this.hass, this.config?.backup_entity)}</strong></div><div style="margin-top:10px;">Sauvegarde</div></div>
            ${this.config?.alerts_entity ? A`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:alert-circle-outline"></ha-icon></span><strong>${u}</strong></div><div style="margin-top:10px;">Alertes</div></div>` : M}
          </div>
          <div class="dialog-danger-zone"><div class="dialog-section-title">Zone sensible</div><div class="actions"><button class="action danger" ?disabled=${!o} @click=${() => this.confirmClusterAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button><button class="action danger" ?disabled=${!s} @click=${() => this.confirmClusterAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Arrêter</button></div></div>
        </div>
      `);
	}
}, pt = "0.10.1";
customElements.get("auralis-room-card") || customElements.define("auralis-room-card", Ge), customElements.get("auralis-pc-card") || customElements.define("auralis-pc-card", it), customElements.get("auralis-unraid-card") || customElements.define("auralis-unraid-card", lt), customElements.get("auralis-proxmox-card") || customElements.define("auralis-proxmox-card", ft), customElements.get("orbit-room-card") || customElements.define("orbit-room-card", class extends Ge {}), customElements.get("orbit-pc-card") || customElements.define("orbit-pc-card", class extends it {}), customElements.get("orbit-unraid-card") || customElements.define("orbit-unraid-card", class extends lt {}), customElements.get("orbit-proxmox-card") || customElements.define("orbit-proxmox-card", class extends ft {}), window.customCards = window.customCards || [];
var mt = [
	{
		type: "auralis-room-card",
		name: "Auralis · Pièce",
		description: "Contrôle moderne des lumières, volets et du climat d’une pièce.",
		preview: !0,
		getEntitySuggestion: (e, t) => {
			let n = t.split(".")[0];
			return n === "light" ? { config: {
				type: "custom:auralis-room-card",
				lights: [t]
			} } : n === "cover" ? { config: {
				type: "custom:auralis-room-card",
				covers: [t]
			} } : null;
		}
	},
	{
		type: "auralis-pc-card",
		name: "Auralis · PC",
		description: "Suivi des performances et commandes sécurisées d’un ordinateur.",
		preview: !1
	},
	{
		type: "auralis-unraid-card",
		name: "Auralis · UNRAID",
		description: "Supervision de l’array, de Docker et des machines virtuelles UNRAID.",
		preview: !1
	},
	{
		type: "auralis-proxmox-card",
		name: "Auralis · Proxmox",
		description: "Supervision d’un cluster Proxmox, de ses nœuds, VM et conteneurs LXC.",
		preview: !1
	}
];
for (let e of mt) window.customCards.some((t) => t.type === e.type) || window.customCards.push(e);
console.info(`%c AURALIS CARDS %c v${pt} `, "color:#fff;background:#3d7ce8;font-weight:700;padding:3px 7px;border-radius:7px 0 0 7px;", "color:#17233d;background:#dfeaff;font-weight:700;padding:3px 7px;border-radius:0 7px 7px 0;");
//#endregion

//# sourceMappingURL=auralis-cards.js.map