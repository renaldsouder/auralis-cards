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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, ee = g ? g.emptyScript : "", te = h.reactiveElementPolyfillSupport, _ = (e, t) => e, v = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ee : null;
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
}, ne = (e, t) => !l(e, t), re = {
	attribute: !0,
	type: String,
	converter: v,
	reflect: !1,
	useDefault: !1,
	hasChanged: ne
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = re) {
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
		return this.elementProperties.get(e) ?? re;
	}
	static _$Ei() {
		if (this.hasOwnProperty(_("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(_("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(_("properties"))) {
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
			let i = (n.converter?.toAttribute === void 0 ? v : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? v : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ne)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[_("elementProperties")] = /* @__PURE__ */ new Map(), y[_("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: y }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ie = globalThis, ae = (e) => e, oe = ie.trustedTypes, se = oe ? oe.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ce = "$lit$", b = `lit$${Math.random().toFixed(9).slice(2)}$`, le = "?" + b, ue = `<${le}>`, x = document, S = () => x.createComment(""), C = (e) => e === null || typeof e != "object" && typeof e != "function", de = Array.isArray, fe = (e) => de(e) || typeof e?.[Symbol.iterator] == "function", pe = "[ 	\n\f\r]", w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, he = />/g, T = RegExp(`>|${pe}(?:([^\\s"'>=/]+)(${pe}*=${pe}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, _e = /"/g, ve = /^(?:script|style|textarea|title)$/i, E = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), D = Symbol.for("lit-noChange"), O = Symbol.for("lit-nothing"), ye = /* @__PURE__ */ new WeakMap(), k = x.createTreeWalker(x, 129);
function be(e, t) {
	if (!de(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return se === void 0 ? t : se.createHTML(t);
}
var xe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === w ? c[1] === "!--" ? o = me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = T) : (ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = T) : o = he : o === T ? c[0] === ">" ? (o = i ?? w, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? T : c[3] === "\"" ? _e : ge) : o === _e || o === ge ? o = T : o === me || o === he ? o = w : (o = T, i = void 0);
		let d = o === T && e[t + 1].startsWith("/>") ? " " : "";
		a += o === w ? n + ue : l >= 0 ? (r.push(s), n.slice(0, l) + ce + n.slice(l) + b + d) : n + b + (l === -2 ? t : d);
	}
	return [be(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Se = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = xe(t, n);
		if (this.el = e.createElement(l, r), k.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = k.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ce)) {
					let t = u[o++], n = i.getAttribute(e).split(b), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Te : r[1] === "?" ? Ee : r[1] === "@" ? De : j
					}), i.removeAttribute(e);
				} else e.startsWith(b) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ve.test(i.tagName)) {
					let e = i.textContent.split(b), t = e.length - 1;
					if (t > 0) {
						i.textContent = oe ? oe.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], S()), k.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], S());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === le) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(b, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += b.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = x.createElement("template");
		return n.innerHTML = e, n;
	}
};
function A(e, t, n = e, r) {
	if (t === D) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = C(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = A(e, i._$AS(e, t.values), i, r)), t;
}
var Ce = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? x).importNode(t, !0);
		k.currentNode = r;
		let i = k.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new we(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Oe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = k.nextNode(), a++);
		}
		return k.currentNode = x, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, we = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = O, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = A(this, e, t), C(e) ? e === O || e == null || e === "" ? (this._$AH !== O && this._$AR(), this._$AH = O) : e !== this._$AH && e !== D && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? fe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== O && C(this._$AH) ? this._$AA.nextSibling.data = e : this.T(x.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Se.createElement(be(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ce(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ye.get(e.strings);
		return t === void 0 && ye.set(e.strings, t = new Se(e)), t;
	}
	k(t) {
		de(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(S()), this.O(S()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ae(e).nextSibling;
			ae(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, j = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = O, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = O;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = A(this, e, t, 0), a = !C(e) || e !== this._$AH && e !== D, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = A(this, r[n + o], t, o), s === D && (s = this._$AH[o]), a ||= !C(s) || s !== this._$AH[o], s === O ? e = O : e !== O && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === O ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Te = class extends j {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === O ? void 0 : e;
	}
}, Ee = class extends j {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== O);
	}
}, De = class extends j {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = A(this, e, t, 0) ?? O) === D) return;
		let n = this._$AH, r = e === O && n !== O || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== O && (n === O || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Oe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		A(this, e);
	}
}, ke = ie.litHtmlPolyfillSupport;
ke?.(Se, we), (ie.litHtmlVersions ??= []).push("3.3.3");
var Ae = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new we(t.insertBefore(S(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, je = globalThis, M = class extends y {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ae(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return D;
	}
};
M._$litElement$ = !0, M.finalized = !0, je.litElementHydrateSupport?.({ LitElement: M });
var Me = je.litElementPolyfillSupport;
Me?.({ LitElement: M }), (je.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/styles/shared.ts
var Ne = o`
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

  .machine-resource-gauges {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 100px));
    gap: 22px;
    padding: 10px;
    margin: 32px 58px 24px 0;
  }

  .machine-resource-gauges .machine-gauge {
    width: 100%;
    max-width: 100px;
    margin-top: 0;
  }

  .machine-resource-gauges .machine-gauge::before { width: 77%; }
  .machine-resource-gauges .machine-gauge-content strong { font-size: clamp(16px, 6cqw, 24px); }
  .machine-resource-gauges:empty { display: none; }
  .rail-button.has-active { color: var(--auralis-healthy); }

  @container (max-width: 320px) {
    .machine-resource-gauges { gap: 18px; padding: 8px; margin-right: 54px; }
    .machine-resource-gauges .machine-gauge { box-shadow: 0 0 0 4px rgba(8,12,18,.88), 0 0 0 6px rgba(195,211,229,.16); }
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
`, N = class extends M {
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
		this.styles = Ne;
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
	renderResourceGauges(e, t) {
		let n = [{
			label: "CPU",
			value: e
		}, {
			label: "RAM",
			value: t
		}].filter((e) => e.value !== void 0 && Number.isFinite(e.value));
		return n.length ? E`<div class="machine-resource-gauges">
      ${n.map(({ label: e, value: t }) => E`<div class="machine-gauge"
        style=${`--value:${Math.min(100, Math.max(0, t))}`}
        role="meter" aria-label=${e} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${t}>
        <div class="machine-gauge-content"><strong>${Math.round(t)}%</strong><small>${e}</small></div>
      </div>`)}
    </div>` : E``;
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
		return E`
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
		return E`
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
}, Pe = /* @__PURE__ */ new Set([
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
function P(e, t) {
	return t && e ? e.states[t] : void 0;
}
function F(e) {
	return !!(e && e.state !== "unknown" && e.state !== "unavailable");
}
function I(e) {
	return !!(e && Pe.has(e.state.toLowerCase()));
}
function L(e, t = "Appareil") {
	return e?.attributes.friendly_name || t;
}
function R(e, t = 0) {
	if (!e) return t;
	let n = Number.parseFloat(e.state.replace(",", "."));
	return Number.isFinite(n) ? n : t;
}
function z(e, t = 0, n = 100) {
	return Math.min(n, Math.max(t, e));
}
function B(e, t, n = "—") {
	let r = P(e, t);
	if (!r || !F(r)) return n;
	if (e?.formatEntityState) return e.formatEntityState(r);
	let i = r.attributes.unit_of_measurement;
	return `${r.state}${i ? ` ${i}` : ""}`;
}
function Fe(e) {
	let t = e?.attributes.current_position;
	return typeof t == "number" ? z(t) : void 0;
}
function Ie(e) {
	let t = e?.attributes.brightness;
	return typeof t == "number" ? Math.round(t / 255 * 100) : I(e) ? 100 : 0;
}
function V(e) {
	let t = e?.attributes.rgb_color;
	if (!Array.isArray(t) || t.length < 3) return;
	let n = t.slice(0, 3).map((e) => z(Number(e), 0, 255));
	return n.every(Number.isFinite) ? [
		Math.round(n[0]),
		Math.round(n[1]),
		Math.round(n[2])
	] : void 0;
}
function Le(e) {
	if (V(e)) return !0;
	let t = e?.attributes.supported_color_modes;
	return Array.isArray(t) && t.some((e) => [
		"hs",
		"rgb",
		"rgbw",
		"rgbww",
		"xy"
	].includes(e));
}
function Re(e, t = "#ffd166") {
	return e ? `#${e.map((e) => Math.round(z(e, 0, 255)).toString(16).padStart(2, "0")).join("")}` : t;
}
function ze(e) {
	let t = /^#([0-9a-f]{6})$/i.exec(e.trim());
	if (!t) return;
	let n = Number.parseInt(t[1], 16);
	return [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	];
}
function Be(e) {
	let t = e.filter((e) => typeof e == "number");
	if (!t.length) return "—";
	let n = Math.round(Math.min(...t)), r = Math.round(Math.max(...t));
	return n === r ? `${n} %` : `${n}–${r} %`;
}
function Ve(e) {
	return e?.split(".")[0] || "";
}
//#endregion
//#region src/utils/actions.ts
async function H(e, t) {
	if (!t) return;
	let n = Ve(t);
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
async function He(e, t) {
	t && await e.callService("homeassistant", "turn_off", {}, { entity_id: t });
}
async function Ue(e, t, n) {
	await e.callService("light", "turn_on", { brightness_pct: Math.round(n) }, { entity_id: t });
}
async function We(e, t, n) {
	let r = ze(n);
	t.length && r && await e.callService("light", "turn_on", { rgb_color: r }, { entity_id: t });
}
async function U(e, t, n) {
	t.length && await e.callService("cover", `${n}_cover`, {}, { entity_id: t });
}
function W(e, t) {
	t && e.dispatchEvent(new CustomEvent("hass-more-info", {
		bubbles: !0,
		composed: !0,
		detail: { entityId: t }
	}));
}
//#endregion
//#region src/cards/auralis-room-card.ts
var Ge = class extends N {
	constructor(...e) {
		super(...e), this.historyGraphConfigs = /* @__PURE__ */ new Map(), this.selectedMediaKind = "media", this.toggleAllLights = async () => {
			let e = this.config?.lights || [], t = e.some((e) => I(P(this.hass, e)));
			await this.hass?.callService("light", t ? "turn_off" : "turn_on", {}, { entity_id: e });
		};
	}
	static {
		this.styles = [N.styles, o`
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

      @container (max-width: 420px) {
        .room-photo.split-bottom-controls .photo-overlay-slot.bottom-right {
          top: 8px;
          bottom: auto;
        }
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
		return typeof n == "string" && n.trim() ? n.trim() : L(P(this.hass, e), t);
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
				H(this.hass, e.entity);
				return;
			}
			if (e.action === "more-info") {
				W(this, e.entity);
				return;
			}
			this.hass?.callService("homeassistant", "toggle", {}, { entity_id: e.entity });
		}
	}
	renderSideControl(e) {
		let t = this.config?.lights || [], n = this.config?.covers || [], r = e.entity || (e.type === "media" ? this.config?.media_player_entity : void 0) || (e.type === "climate" ? this.config?.climate_entity : void 0) || (e.type === "scene" ? this.config?.scene_entity || this.sceneModes()[0]?.entity : void 0), i = P(this.hass, r), a = e.icon || i?.attributes.icon || "mdi:circle-outline", o = e.label || (r ? this.entityLabel(r, r) : "Commande"), s = r ? B(this.hass, r) : "—", c = r ? !F(i) : !1, l = I(i);
		if (e.type === "lights") {
			let n = t.filter((e) => I(P(this.hass, e))).length;
			a = e.icon || (n ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline"), o = e.label || "Lumières", s = `${n}/${t.length}`, c = !t.length, l = n > 0;
		} else if (e.type === "covers") {
			let t = n.filter((e) => I(P(this.hass, e))).length;
			a = e.icon || "mdi:blinds-horizontal", o = e.label || "Volets", s = `${t}/${n.length}`, c = !n.length, l = t > 0;
		} else e.type === "climate" ? (a = e.icon || "mdi:thermostat", o = e.label || "Climat", s = B(this.hass, this.config?.temperature_entity), c = !this.config?.temperature_entity && !this.config?.climate_entity) : e.type === "media" ? (a = e.icon || "mdi:music-note", o = e.label || "Musique", s = I(i) && typeof i?.attributes.media_title == "string" ? i.attributes.media_title : "Lecture") : e.type === "tv" ? (l = F(i) && i?.state !== "off" && i?.state !== "standby", a = e.icon || (l ? "mdi:television" : "mdi:television-off"), o = e.label || "TV", s = l ? "Allumée" : "Éteinte") : e.type === "scene" && (a = e.icon || "mdi:creation-outline", o = e.label || "Ambiance", s = "Activer", c = !r);
		return E`
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
		return E`<div class="side-control-column ${e} ${t.length > 1 ? "dual" : "single"}">${t.map((e) => this.renderSideControl(e))}</div>`;
	}
	thermostatEntityId() {
		return this.config?.thermostat?.entity || this.config?.climate_entity;
	}
	thermostatTarget() {
		let e = P(this.hass, this.thermostatEntityId()), t = e?.attributes.temperature ?? e?.attributes.current_temperature;
		return typeof t == "number" && Number.isFinite(t) ? t : void 0;
	}
	adjustThermostat(e) {
		let t = this.thermostatEntityId(), n = P(this.hass, t), r = this.thermostatTarget();
		if (!t || r === void 0 || !F(n)) return;
		let i = Number(this.config?.thermostat?.step ?? n?.attributes.target_temp_step ?? .5), a = Number.isFinite(i) && i > 0 ? i : .5, o = typeof n?.attributes.min_temp == "number" ? n.attributes.min_temp : 5, s = typeof n?.attributes.max_temp == "number" ? n.attributes.max_temp : 35, c = Math.min(s, Math.max(o, Math.round((r + e * a) * 10) / 10));
		this.hass?.callService("climate", "set_temperature", { temperature: c }, { entity_id: t });
	}
	renderThermostatControl() {
		let e = this.config?.thermostat, t = this.thermostatEntityId();
		if (e?.show === !1 || !t) return O;
		let n = P(this.hass, t), r = this.thermostatTarget(), i = F(n) && r !== void 0, a = e?.label === void 0 ? this.entityLabel(t, "Thermostat") : e.label.trim(), o = e?.show_border !== !1, s = e?.show_background !== !1, c = this.safeCssColor(e?.border_color, "rgba(255,255,255,.16)"), l = this.safeCssColor(e?.background_color, "rgba(13,18,25,.76)"), u = [
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
		return E`
      <div class="thermostat-control ${o ? "" : "no-border"} ${s ? "" : "no-background"}" style=${u}>
        ${a ? E`<span class="thermostat-label">${a}</span>` : O}
        <div class="thermostat-row">
          <button class="thermostat-step" aria-label="Baisser la température" ?disabled=${!i} @click=${() => this.adjustThermostat(-1)}>−</button>
          <button class="thermostat-value" aria-label="Ouvrir la température et l'humidité" ?disabled=${!i} @click=${() => this.openDialog("climate")}>${d}</button>
          <button class="thermostat-step" aria-label="Augmenter la température" ?disabled=${!i} @click=${() => this.adjustThermostat(1)}>+</button>
        </div>
      </div>
    `;
	}
	renderAmbianceButton(e) {
		if (!e.length) return O;
		let t = this.config?.ambiance?.label?.trim() || "Ambiance";
		return E`
      <button class="scene-chip" title=${t} aria-haspopup="dialog" @click=${() => this.openDialog("ambiance")}>
        <ha-icon .icon=${this.config?.ambiance?.icon?.trim() || "mdi:creation-outline"}></ha-icon>${t}
      </button>
    `;
	}
	renderOverlaySlot(e, t) {
		let n = this.overlayPosition(this.config?.thermostat?.position, "bottom-left"), r = this.config?.thermostat?.show !== !1 && !!this.thermostatEntityId() && n === e, i = t.length > 0 && this.ambiancePosition(t) === e;
		return !r && !i ? O : E`
      <div class="photo-overlay-slot ${e}">
        ${r ? this.renderThermostatControl() : O}
        ${i ? this.renderAmbianceButton(t) : O}
      </div>
    `;
	}
	render() {
		if (!this.config || !this.hass) return E``;
		let e = this.config.lights || [], t = this.config.covers || [], n = t.map((e) => Fe(P(this.hass, e))), r = R(P(this.hass, this.config.temperature_entity), NaN), i = R(P(this.hass, this.config.humidity_entity), NaN), a = [...e, ...t].filter((e) => !F(P(this.hass, e))).length, o = this.sideControls("left"), s = this.sideControls("right"), c = this.sceneModes(), l = this.config.thermostat?.show !== !1 && !!this.thermostatEntityId() && this.overlayPosition(this.config.thermostat?.position, "bottom-left") === "bottom-left" && c.length > 0 && this.ambiancePosition(c) === "bottom-right", u = this.roomCardBackground(), d = a ? `${a} appareil${a > 1 ? "s" : ""} indisponible${a > 1 ? "s" : ""}` : "Aucun appareil en alerte", f = this.config.subtitle === void 0 ? d : this.config.subtitle.trim(), p = (this.config.background_image?.trim() || "data:image/jpeg;base64,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").replaceAll("\\", "\\\\").replaceAll("\"", "\\\""), m = this.config.background_position?.trim(), h = m && /^[\w\s.%+-]+$/.test(m) ? m : "center", g = this.config.accent_color?.trim(), ee = `--room-image:url("${p}");--room-image-position:${h};--room-accent:${g && !/[;{}]/.test(g) ? g : "#79d6f2"}`;
		return E`
      <ha-card>
        <div class="cinema-shell background-${u.mode} ${u.showGrid ? "show-grid" : ""}" style=${u.style}>
          <header class="cinema-header">
            <span class="room-avatar"><ha-icon .icon=${this.config.icon || "mdi:sofa-outline"}></ha-icon></span>
            <button class="cinema-title room-title-button" aria-label="Ouvrir les détails du salon" @click=${() => this.openDialog("details")}>
              <h2>${this.config.name || "Pièce"}</h2>
              ${f ? E`<p>${f}</p>` : O}
            </button>
            <div class="climate-pills">
              <button class="climate-pill" @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:thermometer"></ha-icon>${Number.isFinite(r) ? `${r.toLocaleString("fr-FR")}°` : "—"}</button>
              <button class="climate-pill" @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:water-percent"></ha-icon>${Number.isFinite(i) ? `${Math.round(i)}%` : "—"}</button>
            </div>
          </header>
          <div class="cinema-body">
            ${this.renderSideColumn("left", o)}
            <div class="room-photo ${l ? "split-bottom-controls" : ""}" style=${ee}>
              ${this.renderOverlaySlot("top-left", c)}
              ${this.renderOverlaySlot("top-right", c)}
              ${this.renderOverlaySlot("bottom-left", c)}
              ${this.renderOverlaySlot("bottom-right", c)}
            </div>
            ${this.renderSideColumn("right", s)}
            <div class="cover-dock">
              <button class="cover-command" @click=${() => U(this.hass, t, "open")}><ha-icon icon="mdi:chevron-double-up"></ha-icon>Ouvrir</button>
              <button class="cover-command center" @click=${() => this.openDialog("covers")}><ha-icon icon="mdi:blinds-horizontal"></ha-icon>${Be(n)}</button>
              <button class="cover-command" @click=${() => U(this.hass, t, "close")}><ha-icon icon="mdi:chevron-double-down"></ha-icon>Fermer</button>
            </div>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "lights" ? this.renderLightsDialog() : O}
      ${this.dialog === "covers" ? this.renderCoversDialog() : O}
      ${this.dialog === "climate" ? this.renderClimateDialog() : O}
      ${this.dialog === "media" ? this.renderMediaDialog() : O}
      ${this.dialog === "ambiance" ? this.renderAmbianceDialog() : O}
      ${this.dialog === "details" ? this.renderDetailsDialog() : O}
    `;
	}
	renderLightsDialog() {
		let e = this.config?.lights || [], t = e.map((e) => P(this.hass, e)), n = t.filter(I).length, r = t.filter(I).map(Ie), i = r.length ? Math.round(r.reduce((e, t) => e + t, 0) / r.length) : 0, a = e.filter((e) => {
			let t = P(this.hass, e);
			return F(t) && Le(t);
		}), o = Re(V(a.map((e) => P(this.hass, e)).find((e) => I(e) && V(e)) ?? P(this.hass, a[0])));
		return this.renderDialog(this.popupTitle("lights", "Lumières"), "mdi:lightbulb-group-outline", E`
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
            ${a.length ? E`
                  <label class="global-color-control">
                    <input class="color-picker" type="color" .value=${o} aria-label="Couleur générale" @change=${(e) => We(this.hass, a, e.target.value)} />
                    <span><strong>Couleur générale</strong><small>${a.length} éclairage${a.length > 1 ? "s" : ""} compatible${a.length > 1 ? "s" : ""}</small></span>
                  </label>
                ` : O}
          </div>
          <label class="tile" style="display:block;margin-bottom:14px;">
            <div class="row-between"><span style="display:flex;align-items:center;gap:8px;"><ha-icon style="color:var(--auralis-active);" icon="mdi:white-balance-sunny"></ha-icon><strong>Luminosité générale</strong></span><strong>${i} %</strong></div>
            <input class="range light-slider" style=${`--range-value:${i}%`} type="range" min="1" max="100" .value=${String(i)}
              @change=${(t) => e.forEach((e) => Ue(this.hass, e, Number(t.target.value)))} />
          </label>
          <div class="dialog-section-title">Lumières</div>
          <div class="list">
            ${e.map((e) => {
			let t = P(this.hass, e), n = Ie(t), r = this.entityLabel(e, e), i = I(t), a = Le(t), o = Re(V(t));
			return E`
                <div class="list-row">
                  <span class="tile-icon light-status-icon ${i ? "on" : ""}" style=${`--light-status-color:${o}`}><ha-icon .icon=${i ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon></span>
                  <div class="meta">
                    <div class="row-between"><span class="name">${r}</span><span>${n} %</span></div>
                    <div class="light-setting-row">
                      <input class="range light-slider" style=${`--range-value:${n}%`} type="range" min="1" max="100" .value=${String(Math.max(n, 1))} ?disabled=${!F(t)}
                        aria-label=${`Luminosité de ${r}`} @change=${(t) => Ue(this.hass, e, Number(t.target.value))} />
                      ${a ? E`<input class="color-picker" type="color" .value=${o} title=${`Couleur de ${r}`} aria-label=${`Couleur de ${r}`} ?disabled=${!F(t)} @change=${(t) => We(this.hass, [e], t.target.value)} />` : O}
                    </div>
                  </div>
                  <button class="device-toggle ${i ? "on" : ""}" aria-label=${i ? `Éteindre ${r}` : `Allumer ${r}`} aria-pressed=${i ? "true" : "false"} ?disabled=${!F(t)} @click=${() => this.hass.callService("light", i ? "turn_off" : "turn_on", {}, { entity_id: e })}></button>
                </div>
              `;
		})}
          </div>
        </div>
      `);
	}
	activateSceneMode(e) {
		H(this.hass, e.entity), this.closeDialog();
	}
	renderAmbianceDialog() {
		let e = this.sceneModes(), t = this.popupTitle("ambiance", "Ambiance"), n = this.config?.ambiance?.icon?.trim() || "mdi:creation-outline";
		return this.renderDialog(t, n, E`
        <div class="dialog-body">
          <div class="dialog-section-title">Choisir un mode</div>
          <div class="ambiance-options">
            ${e.map((e) => {
			let t = P(this.hass, e.entity), n = e.label?.trim() || this.entityLabel(e.entity, "Ambiance");
			return E`
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
		let e = this.config?.covers || [], t = e.map((e) => P(this.hass, e)), n = t.filter((e) => e?.state === "open" || e?.state === "opening").length, r = t.filter((e) => e?.state === "opening" || e?.state === "closing").length, i = t.filter((e) => F(e)).length;
		return this.renderDialog(this.popupTitle("covers", "Volets"), "mdi:blinds-horizontal", E`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Ouvertures de la pièce</span><strong>${n} volet${n === 1 ? "" : "s"} ouvert${n === 1 ? "" : "s"} sur ${e.length}</strong><span class="muted">${r ? `${r} en mouvement` : "Commandes directes, sans position intermédiaire"}</span></div>
            <div class="dialog-stat"><strong>${i}/${e.length}</strong><small>disponibles</small></div>
          </div>
          <div class="dialog-section-title">Commande groupée</div>
          <div class="group-bar">
            <button class="action" @click=${() => U(this.hass, e, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
            <button class="action" @click=${() => U(this.hass, e, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
            <button class="action" @click=${() => U(this.hass, e, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
          </div>
          <div class="dialog-section-title">Volets</div>
          <div class="list">
            ${e.map((e) => {
			let t = P(this.hass, e), n = F(t) ? t?.state === "open" ? "Ouvert" : t?.state === "opening" ? "Ouverture en cours" : t?.state === "closing" ? "Fermeture en cours" : t?.state === "closed" ? "Fermé" : B(this.hass, e) : "Indisponible";
			return E`
                <div class="list-row cover-device-row">
                  <span class="tile-icon"><ha-icon .icon=${t?.attributes.icon || "mdi:blinds-horizontal"}></ha-icon></span>
                  <div class="meta">
                    <span class="name">${this.entityLabel(e, e)}</span>
                    <span class="muted">${n}</span>
                  </div>
                  <div class="cover-device-actions">
                    <button class="action" ?disabled=${!F(t)} @click=${() => U(this.hass, [e], "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
                    <button class="action" ?disabled=${!F(t)} @click=${() => U(this.hass, [e], "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
                    <button class="action" ?disabled=${!F(t)} @click=${() => U(this.hass, [e], "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
                  </div>
                </div>
              `;
		})}
          </div>
        </div>
      `);
	}
	renderDetailsDialog() {
		let e = [...this.config?.lights || [], ...this.config?.covers || []], t = (this.config?.lights || []).filter((e) => I(P(this.hass, e))).length, n = B(this.hass, this.config?.temperature_entity), r = B(this.hass, this.config?.humidity_entity);
		return this.renderDialog(this.popupTitle("details", this.config?.name || "Pièce"), this.config?.icon || "mdi:sofa-outline", E`
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
			let t = P(this.hass, e), n = this.entityLabel(e, e);
			return E`
                <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => W(this, e)}>
                  <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${t?.attributes.icon || "mdi:circle-outline"}></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div>
                  <div style="margin-top:12px;font-weight:680;">${n}</div>
                  <div class="muted">${B(this.hass, e)}</div>
                </button>
              `;
		})}
          </div>
        </div>
      `);
	}
	renderClimateDialog() {
		let e = B(this.hass, this.config?.temperature_entity), t = B(this.hass, this.config?.humidity_entity), n = B(this.hass, this.config?.climate_entity, "Confort"), r = [this.config?.temperature_entity, this.config?.humidity_entity].filter((e) => !!e), i = this.config?.climate_popup?.graph_entities, a = [...new Set(i === void 0 ? r : i.filter(Boolean))], o = this.config?.climate_popup?.graph_period_unit || "hours", s = this.config?.climate_popup?.graph_hours, c = Number(this.config?.climate_popup?.graph_period ?? s ?? 24), l = o === "months" ? 60 : o === "days" ? 1825 : 43800, u = Number.isFinite(c) ? Math.min(l, Math.max(1, Math.round(c))) : 24, d = u * (o === "months" ? 720 : o === "days" ? 24 : 1), f = `${u.toLocaleString("fr-FR")} ${o === "months" ? "mois" : o === "days" ? `jour${u > 1 ? "s" : ""}` : `heure${u > 1 ? "s" : ""}`}`, p = this.config?.climate_popup?.show_overview !== !1, m = this.config?.climate_popup?.show_current_values === !0, h = !!this.config?.climate_entity && this.config?.climate_popup?.show_thermostat !== !1;
		return this.renderDialog(this.popupTitle("climate", "Température et humidité"), "mdi:thermometer", E`
        <div class="dialog-body">
          ${p ? E`<div class="dialog-overview"><div><span class="eyebrow">Confort de la pièce</span><strong>${e} · ${t}</strong><span class="muted">Historique sur ${f}</span></div><div class="dialog-stat"><strong>${this.config?.climate_entity ? n : a.length}</strong><small>${this.config?.climate_entity ? "mode" : `graphe${a.length > 1 ? "s" : ""}`}</small></div></div>` : O}
          ${m && a.length ? E`
                <div class="dialog-section-title">Valeurs actuelles</div>
                <div class="grid two">
                  ${a.map((e) => {
			let t = e === this.config?.temperature_entity, n = e === this.config?.humidity_entity, r = this.entityLabel(e, t ? "Température" : n ? "Humidité" : e);
			return E`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${P(this.hass, e)?.attributes.icon || (t ? "mdi:thermometer" : n ? "mdi:water-percent" : "mdi:chart-line")}></ha-icon></span><strong>${B(this.hass, e)}</strong></div><div style="margin-top:10px;">${r}</div></div>`;
		})}
                </div>
              ` : O}
          ${a.length ? E`
                <div class="history-graphs">
                  ${a.map((e) => {
			let t = e === this.config?.temperature_entity ? "Température" : e === this.config?.humidity_entity ? "Humidité" : e, n = this.entityLabel(e, t);
			return E`<hui-card class="history-graph" .hass=${this.hass} .config=${this.historyGraphConfig(e, n, d)}></hui-card>`;
		})}
                </div>
              ` : O}
          ${h ? E`<div class="dialog-section"><div class="dialog-section-title">Réglages</div><button class="action primary" style="width:100%;" @click=${() => W(this, this.config?.climate_entity)}><ha-icon icon="mdi:tune-variant"></ha-icon>Ouvrir ${this.entityLabel(this.config?.climate_entity, "le thermostat Home Assistant")}</button></div>` : O}
        </div>
      `);
	}
	renderMediaDialog() {
		let e = this.selectedMediaEntity || this.config?.media_player_entity, t = this.selectedMediaKind, n = P(this.hass, e), r = this.entityLabel(e, t === "tv" ? "Télévision" : "Lecteur multimédia"), i = typeof n?.attributes.media_title == "string" ? n.attributes.media_title : r, a = typeof n?.attributes.media_artist == "string" ? n.attributes.media_artist : "Salon", o = n?.attributes.volume_level, s = typeof o == "number" ? Math.round(o * 100) : 0, c = n?.state === "playing", l = F(n) && n?.state !== "off" && n?.state !== "standby", u = this.selectedMediaTitle?.trim() || this.popupTitle(t === "tv" ? "tv" : "media", t === "tv" ? "Télévision" : "Multimédia"), d = this.selectedMediaIcon || (t === "tv" ? "mdi:television" : "mdi:music-note");
		return this.renderDialog(u, d, E`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${r}</span><strong>${i}</strong><span class="muted">${t === "tv" ? l ? "allumée" : "éteinte" : `${a} · ${c ? "lecture en cours" : "en pause"}`}</span></div><div class="dialog-stat"><strong>${s}%</strong><small>volume</small></div></div>
          <div class="dialog-section-title">${t === "tv" ? "Commandes TV" : "Lecture"}</div>
          ${t === "tv" ? E`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action ${l ? "danger" : "primary"}" @click=${() => this.hass?.callService("media_player", l ? "turn_off" : "turn_on", {}, { entity_id: e })}><ha-icon icon="mdi:power"></ha-icon>${l ? "Éteindre" : "Allumer"}</button>
                  <button class="action" ?disabled=${!l} @click=${() => this.hass?.callService("media_player", "media_play_pause", {}, { entity_id: e })}><ha-icon icon=${c ? "mdi:pause" : "mdi:play"}></ha-icon>${c ? "Pause" : "Lecture"}</button>
                  <button class="action" @click=${() => W(this, e)}><ha-icon icon="mdi:tune-variant"></ha-icon>Détails</button>
                </div>
              ` : E`
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
}, Ke = class extends N {
	static {
		this.styles = [N.styles, o`
      ha-card {
        background: #09111a;
      }

      .covers-shell {
        min-width: 0;
        padding: 16px;
        background: linear-gradient(145deg, #09111a 0%, #0d1822 58%, #081018 100%);
        color: #f4f8fc;
        container-type: inline-size;
      }

      .groups-grid {
        display: grid;
        grid-template-columns: repeat(var(--group-columns, 2), minmax(0, 1fr));
        gap: 11px;
      }

      .group-tile {
        position: relative;
        display: flex;
        min-width: 0;
        min-height: 184px;
        overflow: hidden;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        padding: 0;
        isolation: isolate;
        border: 1px solid rgba(169, 190, 214, 0.22);
        border-radius: 18px;
        background: #172430;
        color: white;
        text-align: left;
      }

      .group-tile:hover,
      .group-tile:focus-within {
        border-color: #79d6f2;
      }

      .group-open:focus-visible,
      .group-control:focus-visible {
        outline: 2px solid #79d6f2;
        outline-offset: -2px;
      }

      .group-open {
        display: flex;
        flex: 1;
        min-height: 126px;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        padding: 14px;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .group-tile::after {
        position: absolute;
        z-index: -1;
        inset: 0;
        background: linear-gradient(180deg, rgba(4, 10, 17, 0.39), rgba(4, 10, 17, 0.1) 36%, rgba(4, 10, 17, 0.88));
        content: "";
        pointer-events: none;
      }

      .group-photo {
        position: absolute;
        z-index: -2;
        width: 100%;
        height: 100%;
        max-width: none;
        inset: 0;
        object-fit: cover;
        pointer-events: none;
      }

      .group-photo.mosaic {
        width: 200%;
        height: 200%;
        object-fit: fill;
      }

      .group-photo.quadrant-1,
      .group-photo.quadrant-3 {
        left: -100%;
      }

      .group-photo.quadrant-2,
      .group-photo.quadrant-3 {
        top: -100%;
      }

      .group-topline,
      .group-bottomline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
      }

      .group-topline {
        justify-content: flex-start;
      }

      .group-topline .tile-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        background: rgba(20, 52, 74, 0.91);
        color: #83cafa;
      }

      .group-arrow {
        flex: 0 0 auto;
        --mdc-icon-size: 22px;
        color: white;
        filter: drop-shadow(0 1px 2px #000);
      }

      .group-name {
        font-size: 20px;
        font-weight: 780;
        line-height: 1.1;
        text-shadow: 0 2px 5px rgba(0, 0, 0, 0.8);
      }

      .group-state {
        display: inline-flex;
        align-items: center;
        padding: 5px 8px;
        border: 1px solid rgba(121, 214, 242, 0.38);
        border-radius: 9px;
        background: rgba(8, 30, 43, 0.82);
        color: #b6edfb;
        font-size: 11px;
        font-weight: 750;
      }

      .group-state.moving {
        border-color: rgba(255, 204, 113, 0.48);
        background: rgba(54, 37, 13, 0.82);
        color: #ffdc9f;
      }

      .group-state.unavailable {
        border-color: rgba(185, 195, 207, 0.32);
        background: rgba(26, 32, 39, 0.82);
        color: #c1cbd5;
      }

      .group-controls {
        position: relative;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        padding: 0 10px 10px;
      }

      .group-control {
        display: flex;
        min-width: 0;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border: 1px solid rgba(192, 216, 235, 0.28);
        border-radius: 10px;
        background: rgba(9, 20, 30, 0.88);
        color: #f4f8fc;
        font: inherit;
        cursor: pointer;
      }

      .group-control ha-icon {
        --mdc-icon-size: 21px;
        color: #9cdef6;
      }

      .group-control:hover:not(:disabled) {
        background: rgba(24, 55, 75, 0.96);
      }

      .group-control:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .group-bar,
      .cover-device-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .group-bar {
        margin-bottom: 14px;
      }

      .cover-device-row {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .cover-device-actions {
        grid-column: 1 / -1;
      }

      .cover-device-actions .action {
        min-height: 40px;
        padding: 8px 10px;
      }

      @container (max-width: 400px) {
        .group-name {
          font-size: 18px;
        }
      }

      @container (max-width: 720px) {
        .groups-grid:not(.single-column) {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @container (max-width: 310px) {
        .groups-grid:not(.single-column),
        .groups-grid.single-column {
          grid-template-columns: 1fr;
        }

        .group-tile {
          min-height: 180px;
        }
      }
    `];
	}
	setConfig(e) {
		if (!Array.isArray(e.groups) || e.groups.length === 0) throw Error("Configurez au moins un groupe de volets.");
		if (e.group_columns !== void 0 && (!Number.isInteger(e.group_columns) || e.group_columns < 1 || e.group_columns > 4)) throw Error("group_columns doit être un nombre entier entre 1 et 4.");
		for (let t of e.groups) {
			if (!t || typeof t.name != "string" || !t.name.trim() || !Array.isArray(t.covers)) throw Error("Chaque groupe doit avoir un nom et une liste de volets.");
			if (!t.covers.every((e) => typeof e == "string" && e.startsWith("cover."))) throw Error("Les groupes acceptent uniquement des entités cover.");
		}
		this.config = {
			...e,
			theme: e.theme || "carbon"
		};
	}
	static getStubConfig() {
		return {
			theme: "carbon",
			groups: [
				{
					name: "Salon",
					covers: []
				},
				{
					name: "Bureau",
					covers: []
				},
				{
					name: "Chambres",
					covers: []
				},
				{
					name: "Salle à manger",
					covers: []
				}
			]
		};
	}
	static getConfigForm() {
		return { schema: [
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
				name: "group_columns",
				selector: { number: {
					min: 1,
					max: 4,
					step: 1,
					mode: "box"
				} }
			},
			{
				name: "groups",
				selector: { object: {} }
			},
			{
				name: "entity_labels",
				selector: { object: {} }
			},
			{
				name: "background_image",
				selector: { text: {} }
			}
		] };
	}
	groupStats(e) {
		let t = [...new Set(e.covers)], n = t.map((e) => P(this.hass, e));
		return {
			total: t.length,
			open: n.filter((e) => e?.state === "open" || e?.state === "opening").length,
			closed: n.filter((e) => e?.state === "closed").length,
			opening: n.filter((e) => e?.state === "opening").length,
			closing: n.filter((e) => e?.state === "closing").length,
			available: n.filter((e) => F(e)).length,
			moving: n.filter((e) => e?.state === "opening" || e?.state === "closing").length,
			availableIds: t.filter((e) => F(P(this.hass, e)))
		};
	}
	groupStatus(e) {
		return e.available ? e.opening && e.closing ? {
			label: "En mouvement",
			tone: "moving"
		} : e.opening ? {
			label: "Ouverture en cours",
			tone: "moving"
		} : e.closing ? {
			label: "Fermeture en cours",
			tone: "moving"
		} : e.open === e.total ? {
			label: e.total === 1 ? "Ouvert" : "Tous ouverts",
			tone: ""
		} : e.closed === e.total ? {
			label: e.total === 1 ? "Fermé" : "Tous fermés",
			tone: ""
		} : {
			label: `${e.open}/${e.total} ouverts`,
			tone: ""
		} : {
			label: "Indisponible",
			tone: "unavailable"
		};
	}
	stateLabel(e, t) {
		return F(t) ? t?.state === "open" ? "Ouvert" : t?.state === "opening" ? "Ouverture en cours" : t?.state === "closing" ? "Fermeture en cours" : t?.state === "closed" ? "Fermé" : B(this.hass, e) : "Indisponible";
	}
	renderGroup(e, t) {
		let n = this.groupStats(e), r = this.groupStatus(n), i = e.background_image?.trim() || this.config?.background_image?.trim(), a = e.background_position?.trim(), o = a && /^[\w\s.%+-]+$/.test(a) ? a : "center", s = i ? "group-photo" : `group-photo mosaic quadrant-${t % 4}`, c = e.name.trim();
		return E`
      <div class="group-tile">
        <img class=${s} src=${i || "data:image/jpeg;base64,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"} alt="" style=${i ? `object-position:${o}` : ""} loading="lazy" />
        <button class="group-open" type="button" aria-haspopup="dialog" aria-label=${`Afficher les volets du groupe ${c}`} @click=${() => this.openDialog(`group:${t}`)}>
          <span class="group-topline">
            <span class="tile-icon"><ha-icon .icon=${e.icon || "mdi:blinds-horizontal"}></ha-icon></span>
            <span class="group-name">${c}</span>
          </span>
          <span class="group-bottomline">
            <span class=${`group-state ${r.tone}`}>${r.label}</span>
            <ha-icon class="group-arrow" icon="mdi:chevron-right"></ha-icon>
          </span>
        </button>
        <div class="group-controls" aria-label=${`Commandes du groupe ${c}`}>
          <button class="group-control" type="button" title="Monter" aria-label=${`Monter les volets du groupe ${c}`} ?disabled=${!n.available} @click=${() => U(this.hass, n.availableIds, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button class="group-control" type="button" title="Stop" aria-label=${`Arrêter les volets du groupe ${c}`} ?disabled=${!n.available} @click=${() => U(this.hass, n.availableIds, "stop")}><ha-icon icon="mdi:stop"></ha-icon></button>
          <button class="group-control" type="button" title="Descendre" aria-label=${`Descendre les volets du groupe ${c}`} ?disabled=${!n.available} @click=${() => U(this.hass, n.availableIds, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
        </div>
      </div>
    `;
	}
	render() {
		if (!this.config || !this.hass) return E``;
		let e = this.config.groups, t = this.config.group_columns ?? Math.min(2, e.length), n = this.dialog?.startsWith("group:") ? Number(this.dialog.slice(6)) : -1, r = Number.isInteger(n) ? e[n] : void 0;
		return E`
      <ha-card>
        <div class="covers-shell">
          <div class=${t === 1 ? "groups-grid single-column" : "groups-grid"} style=${`--group-columns:${t}`}>
            ${e.map((e, t) => this.renderGroup(e, t))}
          </div>
        </div>
      </ha-card>
      ${r ? this.renderGroupDialog(r) : O}
    `;
	}
	renderGroupDialog(e) {
		let t = [...new Set(e.covers)], n = this.groupStats(e);
		return this.renderDialog(e.name.trim(), e.icon || "mdi:blinds-horizontal", E`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div>
              <span class="eyebrow">Ouvertures de la pièce</span>
              <strong>${n.open} volet${n.open === 1 ? "" : "s"} ouvert${n.open === 1 ? "" : "s"} sur ${n.total}</strong>
              <span class="muted">${n.moving ? `${n.moving} en mouvement` : "Commandes directes, sans position intermédiaire"}</span>
            </div>
            <div class="dialog-stat"><strong>${n.available}/${n.total}</strong><small>disponibles</small></div>
          </div>
          <div class="dialog-section-title">Commande groupée</div>
          <div class="group-bar">
            <button class="action" ?disabled=${!n.available} @click=${() => U(this.hass, n.availableIds, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
            <button class="action" ?disabled=${!n.available} @click=${() => U(this.hass, n.availableIds, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
            <button class="action" ?disabled=${!n.available} @click=${() => U(this.hass, n.availableIds, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
          </div>
          <div class="dialog-section-title">Volets</div>
          <div class="list">
            ${t.length ? t.map((e) => {
			let t = P(this.hass, e);
			return E`
                <div class="list-row cover-device-row">
                  <span class="tile-icon"><ha-icon .icon=${t?.attributes.icon || "mdi:blinds-horizontal"}></ha-icon></span>
                  <div class="meta">
                    <span class="name">${this.config?.entity_labels?.[e] || L(t, e)}</span>
                    <span class="muted">${this.stateLabel(e, t)}</span>
                  </div>
                  <div class="cover-device-actions">
                    <button class="action" ?disabled=${!F(t)} @click=${() => U(this.hass, [e], "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
                    <button class="action" ?disabled=${!F(t)} @click=${() => U(this.hass, [e], "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
                    <button class="action" ?disabled=${!F(t)} @click=${() => U(this.hass, [e], "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
                  </div>
                </div>
              `;
		}) : E`<div class="list-row">Aucun volet configuré dans ce groupe.</div>`}
          </div>
        </div>
      `);
	}
	getCardSize() {
		let e = this.config?.groups.length ?? 4, t = this.config?.group_columns ?? Math.min(2, e);
		return 2 + Math.ceil(e / Math.min(t, 2)) * 3;
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 3
		};
	}
}, qe = /* @__PURE__ */ new Set([
	"off",
	"offline",
	"disconnected",
	"not_home",
	"stopped"
]);
function Je(e) {
	return !e || !F(e) ? "unavailable" : I(e) ? "online" : qe.has(e.state.toLowerCase()) ? "offline" : e.entity_id.startsWith("sensor.") ? "online" : "offline";
}
function G(e) {
	if (!F(e)) return;
	let t = R(e, NaN);
	return Number.isFinite(t) ? z(t) : void 0;
}
function Ye(e) {
	if (!e || !F(e)) return;
	let t = R(e, NaN);
	return Number.isFinite(t) && t > 0 ? t : void 0;
}
function Xe(e, t) {
	if (!e) return;
	let n = Object.entries(e.attributes);
	for (let e of t) {
		let t = n.find(([t]) => t.toLowerCase() === e.toLowerCase());
		if (!t) continue;
		let r = typeof t[1] == "number" ? t[1] : Number.parseFloat(String(t[1]).replace(",", "."));
		if (Number.isFinite(r)) return r;
	}
}
function Ze(e) {
	if (!e || !F(e)) return;
	let t = Xe(e, [
		"UsedSpacePercentage",
		"used_space_percentage",
		"used_percentage"
	]);
	return t === void 0 ? G(e) : z(t);
}
function Qe(e) {
	return e >= 1024 ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(e / 1024)} Go` : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(e)} Mo`;
}
function $e(e) {
	if (!e || !F(e)) return "—";
	let t = Xe(e, ["UsedSpaceMB", "used_space_mb"]), n = Xe(e, ["TotalSizeMB", "total_size_mb"]);
	return t === void 0 || n === void 0 || n <= 0 ? q(Ze(e)) : `${Qe(t)} / ${Qe(n)}`;
}
function et(e, t = Date.now()) {
	if (!e || !F(e)) return "—";
	let n = Date.parse(e.state);
	if (!Number.isFinite(n)) return "—";
	let r = Math.max(0, Math.floor((t - n) / 6e4)), i = Math.floor(r / 1440), a = Math.floor(r % 1440 / 60), o = r % 60;
	return `${i > 0 ? `${i} j ` : ""}${a} h ${o} min`;
}
function tt(e) {
	return !e || !F(e) ? "—" : {
		active: "Active",
		connected: "Connectée",
		disconnected: "Déconnectée",
		locked: "Verrouillée",
		unlocked: "Déverrouillée"
	}[e.state.toLowerCase()] || e.state;
}
function K(e, t) {
	return !!(t && F(P(e, t)));
}
function q(e) {
	return e === void 0 ? "—" : `${Math.round(e)}%`;
}
function nt(e, t = "Muet", n = "Actif") {
	return !e || !F(e) ? "—" : [
		"true",
		"on",
		"yes",
		"1"
	].includes(e.state.toLowerCase()) ? t : n;
}
function rt(e) {
	return !e || !F(e) ? "Indisponible" : [
		"up",
		"on",
		"online",
		"connected",
		"active"
	].includes(e.state.toLowerCase()) ? "Connecté" : "Déconnecté";
}
function it(e, t) {
	let n = P(e, t);
	if (!F(n)) return "—";
	let r = R(n, NaN);
	return Number.isFinite(r) && r < 0 ? "—" : B(e, t);
}
var at = class extends N {
	constructor(...e) {
		super(...e), this.confirmRestart = () => {
			K(this.hass, this.config?.restart_entity) && (this.askConfirmation({
				title: "Redémarrer le PC ?",
				message: "Les applications ouvertes pourront perdre leurs données non enregistrées.",
				confirmLabel: "Redémarrer",
				action: () => H(this.hass, this.config?.restart_entity)
			}), this.dialog = "details");
		}, this.confirmShutdown = () => {
			K(this.hass, this.config?.shutdown_entity) && (this.askConfirmation({
				title: "Éteindre le PC ?",
				message: "Cette action arrêtera la machine et les services qui y sont exécutés.",
				confirmLabel: "Éteindre",
				action: () => H(this.hass, this.config?.shutdown_entity)
			}), this.dialog = "details");
		};
	}
	static {
		this.styles = [N.styles, o`
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
		if (!this.config || !this.hass) return E``;
		let e = Je(P(this.hass, this.config.online_entity)), t = G(P(this.hass, this.config.cpu_entity)), n = G(P(this.hass, this.config.gpu_entity)), r = G(P(this.hass, this.config.memory_entity)), i = this.temperatureLabel(this.config.cpu_temperature_entity), a = this.temperatureLabel(this.config.gpu_temperature_entity), o = this.validDrives(), s = P(this.hass, this.config.session_entity), c = P(this.hass, this.config.user_entity), l = F(s) ? tt(s) : void 0, u = F(c) ? B(this.hass, this.config.user_entity) : void 0, d = this.uptimeLabel(), f = G(P(this.hass, this.config.battery_percentage_entity)), p = this.availableDisplay(this.config.system_state_entity), m = this.availableDisplay(this.config.network_down_entity), h = this.availableDisplay(this.config.network_up_entity), g = this.machineStyle("#7898ff"), ee = e === "online" ? "En ligne et disponible" : e === "offline" ? "Hors ligne" : "État indisponible", te = e === "online" ? "healthy" : e === "offline" ? "danger" : "", _ = !!(u || l || d), v = [n === void 0 ? void 0 : {
			label: "GPU",
			value: n
		}, ...o.map((e) => ({
			label: e.label,
			value: e.usage
		}))].filter((e) => !!e);
		return E`
      <ha-card>
        <div class="machine-shell pc-shell ${this.machineGridClass()}" style=${g}>
          <div class="machine-content pc-content">
            <header class="machine-header pc-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${te}"></span>${ee}</div></div></header>
            ${i || a ? E`<div class="machine-stat-stack">${i ? E`<div class="machine-mini-stat"><small>CPU</small><strong>${i}</strong></div>` : O}${a ? E`<div class="machine-mini-stat"><small>GPU</small><strong>${a}</strong></div>` : O}</div>` : O}
            ${this.renderResourceGauges(t, r)}
            ${_ ? E`<div class="machine-context"><small>${u ? "Utilisateur" : l ? "Session" : "Uptime"}</small><strong>${u || l || d}</strong>${u && l ? E`<span>Session · ${l}</span>` : O}${d && (u || l) ? E`<span>Uptime · ${d}</span>` : O}</div>` : O}
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Performance</small><strong>${e === "online" ? `${this.config.name} fonctionne normalement` : e === "offline" ? `${this.config.name} est hors ligne` : `État de ${this.config.name} indisponible`}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("details")}><ha-icon icon="mdi:pulse"></ha-icon>Détails</button></div>
              ${v.length ? E`<div class="machine-bars">${v.map((e) => this.renderBar(e.label, e.value))}</div>` : O}
              ${p || m || h || f !== void 0 ? E`<div class="machine-foot">${p ? E`<span class="pc-foot-item">Événement <strong>${p}</strong></span>` : O}${m || h ? E`<span class="pc-foot-item">Réseau <strong>${m ? `↓ ${m}` : ""}${m && h ? " · " : ""}${h ? `↑ ${h}` : ""}</strong></span>` : O}${f === void 0 ? O : E`<span class="pc-foot-item">Batterie <strong>${q(f)}</strong></span>`}</div>` : O}
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "details" ? this.renderDetails() : O}
    `;
	}
	uptimeLabel() {
		if (this.config?.uptime_entity && F(P(this.hass, this.config.uptime_entity))) return B(this.hass, this.config.uptime_entity);
		let e = et(P(this.hass, this.config?.last_boot_entity));
		return e === "—" ? void 0 : e;
	}
	availableDisplay(e) {
		return F(P(this.hass, e)) ? B(this.hass, e) : void 0;
	}
	temperatureLabel(e) {
		return Ye(P(this.hass, e)) === void 0 ? "" : B(this.hass, e);
	}
	renderBar(e, t) {
		return E`<div class="machine-bar"><span title=${e}>${e}</span><div class="track"><span style=${`width:${t}%`}></span></div><strong>${q(t)}</strong></div>`;
	}
	validDrives() {
		return (this.config?.drives?.length ? this.config.drives : this.config?.storage_entity ? [{
			entity: this.config.storage_entity,
			label: "Disque"
		}] : []).flatMap((e) => {
			let t = P(this.hass, e.entity), n = Ze(t);
			return !t || n === void 0 ? [] : [{
				config: e,
				state: t,
				label: this.driveLabel(e, t),
				usage: n,
				summary: $e(t)
			}];
		});
	}
	driveLabel(e, t) {
		if (e.label) return e.label;
		let n = t?.attributes.Label;
		return typeof n == "string" && n.trim() ? n : t?.state && t.state.length <= 3 ? `Disque ${t.state}` : L(t, "Stockage");
	}
	renderDetails() {
		let e = Je(P(this.hass, this.config?.online_entity)), t = e === "online", n = [
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
		].filter(([e, t]) => e.includes("Température") ? Ye(P(this.hass, t)) !== void 0 : F(P(this.hass, t))), r = this.validDrives(), i = (this.config?.network_interfaces || []).filter((e) => F(P(this.hass, e.entity))), a = [
			this.availableDisplay(this.config?.user_entity) ? ["Utilisateur", this.availableDisplay(this.config?.user_entity)] : void 0,
			F(P(this.hass, this.config?.session_entity)) ? ["Session", tt(P(this.hass, this.config?.session_entity))] : void 0,
			this.uptimeLabel() ? ["Uptime", this.uptimeLabel()] : void 0,
			this.availableDisplay(this.config?.last_boot_entity) ? ["Dernier démarrage", this.availableDisplay(this.config?.last_boot_entity)] : void 0,
			this.availableDisplay(this.config?.last_activity_entity) ? ["Dernière activité", this.availableDisplay(this.config?.last_activity_entity)] : void 0,
			this.availableDisplay(this.config?.system_state_entity) ? ["Dernier événement", this.availableDisplay(this.config?.system_state_entity)] : void 0
		].filter((e) => !!e), o = G(P(this.hass, this.config?.battery_percentage_entity)), s = [
			o === void 0 ? void 0 : ["Batterie", q(o)],
			this.availableDisplay(this.config?.battery_status_entity) ? ["État de charge", this.availableDisplay(this.config?.battery_status_entity)] : void 0,
			this.availableDisplay(this.config?.battery_powerline_entity) ? ["Alimentation", this.availableDisplay(this.config?.battery_powerline_entity)] : void 0,
			this.nonNegativeDisplay(this.config?.battery_remaining_entity) ? ["Autonomie restante", this.nonNegativeDisplay(this.config?.battery_remaining_entity)] : void 0,
			this.nonNegativeDisplay(this.config?.battery_full_lifetime_entity) ? ["Autonomie maximale", this.nonNegativeDisplay(this.config?.battery_full_lifetime_entity)] : void 0
		].filter((e) => !!e), c = [this.config?.audio_output_entity, this.config?.audio_input_entity].some((e) => F(P(this.hass, e))), l = [
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
		return this.renderDialog(this.config?.name || "PC", "mdi:laptop", E`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État de la machine</span><strong>${e === "online" ? "En ligne et disponible" : e === "offline" ? "Hors ligne" : "État indisponible"}</strong>${a.length ? E`<span class="muted">${a.slice(0, 2).map(([, e]) => e).join(" · ")}</span>` : O}</div>${o !== void 0 || G(P(this.hass, this.config?.cpu_entity)) !== void 0 ? E`<div class="dialog-stat"><strong>${q(o === void 0 ? G(P(this.hass, this.config?.cpu_entity)) : o)}</strong><small>${o === void 0 ? "CPU" : "Batterie"}</small></div>` : O}</div>
        ${n.length ? E`<section class="pc-detail-section"><div class="dialog-section-title">Performances principales</div><div class="grid two">${n.map(([e, t, n]) => E`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${n}></ha-icon></span><strong>${e.includes("Température") ? this.temperatureLabel(t) : B(this.hass, t)}</strong></div><div style="margin-top:10px;">${e}</div></div>`)}</div></section>` : O}
        ${r.length ? E`<section class="pc-detail-section"><div class="dialog-section-title">Stockage</div>${r.map((e) => E`<div class="pc-drive-row"><div class="pc-drive-top"><span>${e.label}</span><strong>${e.summary}</strong></div><div class="progress"><span style=${`width:${e.usage}%`}></span></div></div>`)}</section>` : O}
        ${a.length ? E`<section class="pc-detail-section"><div class="dialog-section-title">Session et système</div>${a.map(([e, t]) => this.infoRow(e, t))}</section>` : O}
        ${s.length ? E`<section class="pc-detail-section"><div class="dialog-section-title">Alimentation</div>${s.map(([e, t]) => this.infoRow(e, t))}</section>` : O}
        ${c || l.length ? E`<section class="pc-detail-section"><div class="dialog-section-title">Audio</div>${this.audioDevice("Sortie", this.config?.audio_output_entity, this.config?.audio_output_state_entity, this.config?.audio_output_volume_entity, this.config?.audio_output_muted_entity)}${this.audioDevice("Entrée", this.config?.audio_input_entity, this.config?.audio_input_state_entity, this.config?.audio_input_volume_entity, this.config?.audio_input_muted_entity)}${l.length ? E`<div class="grid two" style="margin-top:10px;">${l.map(([e, t]) => E`<div class="tile"><div class="tile-head"><span>${e}</span><strong>${t}</strong></div></div>`)}</div>` : O}</section>` : O}
        ${i.length ? E`<section class="pc-detail-section"><div class="dialog-section-title">Interfaces réseau${this.availableDisplay(this.config?.network_total_entity) ? ` · ${this.availableDisplay(this.config?.network_total_entity)}` : ""}</div>${i.map((e) => this.networkRow(e))}</section>` : O}
        ${u ? E`<section class="pc-detail-section"><div class="dialog-section-title">Commandes</div><div class="actions">${t && this.config?.lock_entity ? E`<button class="action" ?disabled=${!d} @click=${() => H(this.hass, this.config?.lock_entity)}><ha-icon icon="mdi:lock-outline"></ha-icon>Verrouiller</button>` : O}${t && this.config?.sleep_entity ? E`<button class="action" ?disabled=${!f} @click=${() => H(this.hass, this.config?.sleep_entity)}><ha-icon icon="mdi:power-sleep"></ha-icon>Veille</button>` : O}${t && this.config?.restart_entity ? E`<button class="action" ?disabled=${!p} @click=${this.confirmRestart}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : O}${e === "offline" && this.config?.wake_entity ? E`<button class="action primary" ?disabled=${!h} @click=${() => H(this.hass, this.config?.wake_entity)}><ha-icon icon="mdi:power"></ha-icon>Démarrer</button>` : O}</div>${t && this.config?.shutdown_entity ? E`<div class="dialog-danger-zone"><button class="action danger" style="width:100%;" ?disabled=${!m} @click=${this.confirmShutdown}><ha-icon icon="mdi:power"></ha-icon>Éteindre le PC</button></div>` : O}</section>` : O}
      </div>
    `, "pc-dialog");
	}
	infoRow(e, t) {
		return E`<div class="pc-info-row"><span>${e}</span><strong>${t}</strong></div>`;
	}
	nonNegativeDisplay(e) {
		let t = it(this.hass, e);
		return t === "—" ? void 0 : t;
	}
	audioDevice(e, t, n, r, i) {
		return F(P(this.hass, t)) ? E`<div class="pc-audio-device"><span class="eyebrow">${e}</span><strong>${B(this.hass, t)}</strong><div class="pc-audio-meta">${F(P(this.hass, n)) ? E`<span>État · ${B(this.hass, n)}</span>` : O}${F(P(this.hass, r)) ? E`<span>Volume · ${B(this.hass, r)}</span>` : O}${F(P(this.hass, i)) ? E`<span>${nt(P(this.hass, i))}</span>` : O}</div></div>` : O;
	}
	networkRow(e) {
		let t = P(this.hass, e.entity), n = rt(t);
		return E`<div class="pc-network-row"><span>${e.label || L(t, "Interface réseau")}</span><strong class="pc-network-state"><span class="dot ${n === "Connecté" ? "healthy" : ""}"></span>${n}</strong></div>`;
	}
};
//#endregion
//#region src/cards/auralis-unraid-card.ts
function ot(e) {
	if (!F(e)) return "unavailable";
	let t = e.state.toLowerCase();
	return t === "paused" || t === "suspended" ? "paused" : I(e) ? "active" : "stopped";
}
function J(e) {
	if (!F(e)) return;
	let t = R(e, NaN);
	return Number.isFinite(t) ? z(t) : void 0;
}
function Y(e, t = "on") {
	return !!(F(e) && e.state.toLowerCase() === t.trim().toLowerCase());
}
function st(e, t, n) {
	return t?.[e || "default"]?.trim() || t?.default?.trim() || e || n;
}
function X(e, t) {
	return !!(t && F(P(e, t)));
}
function ct(e, t) {
	return t === "start" ? e.start_entity || (Ve(e.entity) === "switch" ? e.entity : void 0) : t === "stop" ? e.stop_entity || (Ve(e.entity) === "switch" ? e.entity : void 0) : t === "restart" ? e.restart_entity : t === "pause" ? e.pause_entity : e.resume_entity;
}
function Z(e) {
	return e === void 0 ? "—" : `${Math.round(e)}%`;
}
var lt = class extends N {
	constructor(...e) {
		super(...e), this.serviceTab = "docker", this.serviceFilter = "all", this.query = "", this.selected = /* @__PURE__ */ new Set(), this.startSelected = async () => {
			let e = (this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || []).filter((e) => this.selected.has(e.entity));
			await Promise.all(e.map((e) => this.startItem(e))), this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
		}, this.confirmArrayStop = () => {
			X(this.hass, this.config?.array_stop_entity) && (this.askConfirmation({
				title: "Arrêter l’array ?",
				message: "Les partages, conteneurs et machines virtuelles dépendants pourront devenir indisponibles.",
				confirmLabel: "Arrêter l’array",
				action: () => H(this.hass, this.config?.array_stop_entity)
			}), this.dialog = "server");
		};
	}
	static {
		this.styles = [N.styles, o`
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

      .service-icon.active {
        background: color-mix(in srgb, var(--auralis-healthy) 18%, var(--auralis-layer));
        color: var(--auralis-healthy);
        box-shadow: 0 0 18px color-mix(in srgb, var(--auralis-healthy) 22%, transparent);
      }

      .service-icon.paused {
        background: color-mix(in srgb, var(--auralis-active) 16%, var(--auralis-layer));
        color: var(--auralis-active);
      }

      .service-icon.unavailable {
        opacity: 0.45;
      }

      .rail-button.has-active {
        color: var(--auralis-healthy);
      }

      .disk-summary-empty {
        padding: 12px;
        margin-top: 14px;
        border: 1px dashed rgba(195, 211, 229, 0.18);
        border-radius: 14px;
        color: #91a0b2;
        font-size: 10px;
        text-align: center;
      }

      .disk-summary {
        grid-template-columns: minmax(62px, 0.75fr) minmax(0, 1.35fr) 38px;
      }

      .disk-summary > span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
					name: "docker_group_labels",
					selector: { object: {} }
				},
				{
					name: "vm_group_labels",
					selector: { object: {} }
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
		if (!this.config || !this.hass) return E``;
		let e = P(this.hass, this.config.status_entity), t = F(e) && I(e), n = F(e), r = J(P(this.hass, this.config.array_usage_entity)), i = (this.config.docker || []).filter((e) => this.itemActive(e)).length, a = (this.config.vms || []).filter((e) => this.itemActive(e)).length, o = this.config.docker?.length || 0, s = this.config.vms?.length || 0, c = J(P(this.hass, this.config.cpu_entity)), l = J(P(this.hass, this.config.memory_entity)), u = this.featuredDisks(), d = this.config.array_state_entity ? B(this.hass, this.config.array_state_entity) : n ? t ? "Démarré" : "Arrêté" : "Indisponible", f = n ? t ? "serveur en ligne" : "serveur hors ligne" : "état indisponible", p = this.machineStyle("#ff7b55");
		return E`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${p}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${t ? "healthy" : "danger"}"></span>UNRAID · ${f}</div></div></header>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("server")} aria-label="Détails du serveur"><ha-icon icon="mdi:information-outline"></ha-icon></button>
              <button class="rail-button ${i ? "has-active" : ""}" @click=${() => this.openServices("docker")} aria-label="Docker"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
              <button class="rail-button ${a ? "has-active" : ""}" @click=${() => this.openServices("vm")} aria-label="Machines virtuelles"><ha-icon icon="mdi:monitor-multiple"></ha-icon></button>
            </div>
            ${this.renderResourceGauges(c, l)}
            <div class="machine-context"><small>Array${r === void 0 ? "" : ` · ${Z(r)} utilisés`}</small><strong>${d}</strong></div>
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Stockage</small><strong>${u.length ? `${u.length} disque${u.length > 1 ? "s" : ""} affiché${u.length > 1 ? "s" : ""}` : "Aucun disque sélectionné"}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("disks")}><ha-icon icon="mdi:harddisk"></ha-icon>Disques</button></div>
              <div class="machine-bars">
                ${u.map((e) => this.renderDiskSummary(e))}
              </div>
              ${u.length ? O : E`<div class="disk-summary-empty">Ajoutez <strong>show_on_card: true</strong> aux disques à afficher ici.</div>`}
              <div class="machine-foot"><span>Docker <strong>${i}/${o || "—"} actifs</strong></span><span>VM <strong>${a}/${s || "—"} actives</strong></span></div>
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "services" ? this.renderServicesDialog() : O}
      ${this.dialog === "server" ? this.renderServerDialog() : O}
      ${this.dialog === "disks" ? this.renderDisksDialog() : O}
    `;
	}
	statusTile(e, t, n) {
		return E`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${n}></ha-icon></span></div><div style="margin-top:10px;font-weight:680;">${e}</div><div class="muted">${t}</div></div>`;
	}
	serviceTile(e, t, n, r, i) {
		return E`
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
		return ot(P(this.hass, e.entity));
	}
	serviceItems() {
		let e = this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [], t = this.query.trim().toLocaleLowerCase("fr");
		return e.filter((e) => {
			let n = !t || e.name.toLocaleLowerCase("fr").includes(t) || e.group?.toLocaleLowerCase("fr").includes(t), r = this.itemState(e), i = this.serviceFilter === "all" || this.serviceFilter === "active" && r === "active" || this.serviceFilter === "paused" && r === "paused" || this.serviceFilter === "stopped" && r === "stopped";
			return n && i;
		});
	}
	groupedItems() {
		let e = /* @__PURE__ */ new Map(), t = this.serviceTab === "docker" ? this.config?.docker_group_labels : this.config?.vm_group_labels, n = this.serviceTab === "docker" ? "Services" : "Machines virtuelles";
		for (let r of this.serviceItems()) {
			let i = st(r.group, t, n);
			e.set(i, [...e.get(i) || [], r]);
		}
		return e;
	}
	renderServicesDialog() {
		let e = this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [], t = e.filter((e) => this.itemActive(e)).length, n = e.filter((e) => this.itemState(e) === "stopped").length, r = e.filter((e) => this.itemPaused(e)).length;
		return this.renderDialog(this.serviceTab === "docker" ? "Docker" : "Machines virtuelles", this.serviceTab === "docker" ? "mdi:cube-outline" : "mdi:monitor-multiple", E`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${this.serviceTab === "docker" ? "Conteneurs Docker" : "Machines virtuelles"}</span><strong>${t} actif${t > 1 ? "s" : ""} sur ${e.length}</strong><span class="muted">Rechercher, filtrer et piloter sans quitter le tableau de bord</span></div><div class="dialog-stat"><strong>${n}</strong><small>arrêté${n > 1 ? "s" : ""}</small></div></div>
          <input class="search" placeholder=${this.serviceTab === "docker" ? "Rechercher un service" : "Rechercher une VM"} .value=${this.query} @input=${(e) => {
			this.query = e.target.value, this.requestUpdate();
		}} />
          <div class="filters">
            ${this.filterButton("all", `Tous · ${e.length}`)}
            ${this.filterButton("active", `Actifs · ${t}`)}
            ${this.filterButton("stopped", `Arrêtés · ${n}`)}
            ${this.serviceTab === "vm" ? this.filterButton("paused", `Suspendues · ${r}`) : O}
          </div>
          ${this.serviceItems().length ? Array.from(this.groupedItems()).map(([e, t]) => E`
                <div class="section-label">${e}</div>
                <div class="list">${t.map((e) => this.renderServiceRow(e))}</div>
              `) : E`<div class="empty">Aucun élément ne correspond à ce filtre.</div>`}
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
		return E`<button class=${this.serviceFilter === e ? "active" : ""} @click=${() => {
			this.serviceFilter = e, this.requestUpdate();
		}}>${t}</button>`;
	}
	renderServiceRow(e) {
		let t = this.itemState(e), n = t === "active" ? "healthy" : t === "paused" ? "warning" : "danger", r = t === "active" ? "Actif" : t === "paused" ? "Suspendue" : t === "stopped" ? "Arrêté" : "Indisponible", i = this.serviceTab === "vm", a = e, o = X(this.hass, ct(e, "start"));
		return E`
      <div class="list-row">
        <input class="selection" type="checkbox" .checked=${this.selected.has(e.entity)} ?disabled=${t !== "stopped" || !o} @change=${() => this.toggleSelected(e.entity)} />
        <div class="service-main">
          <span class="service-icon ${t}"><ha-icon .icon=${e.icon || (i ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
          <div class="meta">
            <div class="name">${e.name}</div>
            <div class="state"><span class="dot ${n}" style="display:inline-block;margin-right:5px;"></span>${r}${e.cpu_entity ? ` · CPU ${B(this.hass, e.cpu_entity)}` : ""}</div>
            ${i ? E`<div class="resource-tags">${a.vcpus ? E`<span>${a.vcpus} vCPU</span>` : O}${a.memory ? E`<span>${a.memory}</span>` : O}${a.storage ? E`<span>${a.storage}</span>` : O}${a.ip_entity ? E`<span>${B(this.hass, a.ip_entity)}</span>` : O}</div>` : O}
          </div>
        </div>
        ${this.renderServiceActions(e, t)}
      </div>
    `;
	}
	renderServiceActions(e, t) {
		let n = e, r = this.serviceTab === "vm", i = (n, r, i, a = "", o = !1) => {
			let s = ct(e, n);
			if (!s) return E``;
			let c = t !== "unavailable" && X(this.hass, s), l = o ? () => this.confirmItemAction(e, n) : () => this.runItemAction(e, n);
			return E`<button class=${`action ${a}`.trim()} ?disabled=${!c} @click=${l}><ha-icon .icon=${i}></ha-icon>${r}</button>`;
		};
		return E`
      <div class="service-actions">
        ${t === "stopped" ? i("start", "Démarrer", "mdi:play", "primary") : O}
        ${t === "paused" ? i("resume", "Reprendre", "mdi:play", "primary") : O}
        ${t === "active" && r ? i("pause", "Pause", "mdi:pause") : O}
        ${t === "active" ? i("restart", "Redémarrer", "mdi:restart", "", !0) : O}
        ${t === "active" || t === "paused" ? i("stop", r ? "Éteindre" : "Arrêter", "mdi:stop-circle-outline", "danger", !0) : O}
        ${r && n.console_url ? E`<button class="action" @click=${() => window.open(n.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>` : O}
      </div>
    `;
	}
	toggleSelected(e) {
		let t = new Set(this.selected);
		t.has(e) ? t.delete(e) : t.add(e), this.selected = t, this.requestUpdate();
	}
	async runItemAction(e, t) {
		let n = ct(e, t);
		if (!X(this.hass, n)) return;
		let r = t === "start" && !e.start_entity && n === e.entity || t === "stop" && !e.stop_entity && n === e.entity;
		if (t === "stop" && r) {
			await He(this.hass, n);
			return;
		}
		await H(this.hass, n);
	}
	async startItem(e) {
		await this.runItemAction(e, "start");
	}
	confirmItemAction(e, t) {
		let n = ct(e, t);
		if (!X(this.hass, n)) return;
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
		X(this.hass, n) && (this.askConfirmation({
			title: `${t ? "Redémarrer" : "Éteindre"} le serveur ?`,
			message: "L’array, les conteneurs Docker et les machines virtuelles pourront devenir indisponibles.",
			confirmLabel: t ? "Redémarrer" : "Éteindre",
			action: () => H(this.hass, n)
		}), this.dialog = "server");
	}
	renderDiskRow(e) {
		let t = J(P(this.hass, e.usage_entity)), n = P(this.hass, e.status_entity), r = Y(n, e.healthy_state || "on"), i = !e.status_entity || r ? "healthy" : "danger", a = e.status_entity ? F(n) ? r ? "Sain" : "À contrôler" : "Indisponible" : "Suivi";
		return E`
      <div class="disk-row">
        <div class="disk-row-head">
          <strong>${e.name}</strong>
          <span class="disk-state"><span class="dot ${i}"></span>${a}</span>
        </div>
        <div class="progress"><span style=${`width:${t ?? 0}%`}></span></div>
        <div class="disk-meta">
          <span>${e.capacity_entity ? B(this.hass, e.capacity_entity) : `${Z(t)} utilisés`}</span>
          ${e.temperature_entity ? E`<span>${B(this.hass, e.temperature_entity)}</span>` : O}
        </div>
      </div>
    `;
	}
	featuredDisks() {
		let e = this.config?.disks || [], t = e.filter((e) => e.show_on_card === !0);
		return t.length ? t : e.filter((e) => e.show_on_card !== !1);
	}
	renderDiskSummary(e) {
		let t = J(P(this.hass, e.usage_entity));
		return E`
      <div class="machine-bar disk-summary">
        <span title=${e.name}>${e.name}</span>
        <div class="track"><span style=${`width:${t ?? 0}%`}></span></div>
        <strong>${Z(t)}</strong>
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
	renderDisksDialog() {
		let e = this.config?.disks || [], t = e.filter((e) => F(P(this.hass, e.status_entity))).length, n = e.filter((e) => e.status_entity && Y(P(this.hass, e.status_entity), e.healthy_state || "on")).length;
		return this.renderDialog("Disques", "mdi:harddisk", E`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Stockage UNRAID</span><strong>${e.length} disque${e.length > 1 ? "s" : ""} configuré${e.length > 1 ? "s" : ""}</strong><span class="muted">Occupation, capacité, température et état de santé</span></div>
            <div class="dialog-stat"><strong>${n}/${t || "—"}</strong><small>sains</small></div>
          </div>
          ${e.length ? Array.from(this.groupedDisks(e)).map(([e, t]) => E`
                <div class="disk-group"><div class="disk-group-title">${e}</div><div class="disk-list">${t.map((e) => this.renderDiskRow(e))}</div></div>
              `) : E`<div class="empty">Aucun disque n’est configuré.</div>`}
        </div>
      `);
	}
	configuredServerUrl() {
		let e = P(this.hass, this.config?.server_url_entity)?.state;
		if (e) try {
			let t = new URL(e);
			return t.protocol === "http:" || t.protocol === "https:" ? t.href : void 0;
		} catch {
			return;
		}
	}
	renderServerDialog() {
		let e = J(P(this.hass, this.config?.array_usage_entity)), t = P(this.hass, this.config?.status_entity), n = F(t) && I(t), r = P(this.hass, this.config?.parity_entity), i = this.config?.parity_healthy_state ? Y(r, this.config.parity_healthy_state) : F(r) && /^(ok|valid|valide|healthy|protected|protégée)$/i.test(r.state.trim()), a = this.config?.parity_entity ? F(r) ? i ? "Valide" : B(this.hass, this.config.parity_entity) : "Indisponible" : "—", o = !!(this.config?.parity_entity || this.config?.parity_age_entity || this.config?.parity_errors_entity), s = !!(this.config?.version_entity || this.config?.updates_entity || this.config?.notifications_entity), c = !!(this.config?.network_down_entity || this.config?.network_up_entity), l = !!(this.config?.ups_connected_entity || this.config?.ups_status_entity || this.config?.ups_battery_entity || this.config?.ups_load_entity || this.config?.ups_runtime_entity), u = !!(this.config?.docker_cpu_entity || this.config?.docker_memory_entity), d = !!(this.config?.array_stop_entity || this.config?.restart_entity || this.config?.shutdown_entity), f = this.configuredServerUrl(), p = this.config?.array_state_entity ? B(this.hass, this.config.array_state_entity) : n ? "Démarré" : "Indisponible", m = this.config?.array_label_entity ? B(this.hass, this.config.array_label_entity) : Z(e), h = this.config?.ups_connected_entity ? Y(P(this.hass, this.config.ups_connected_entity), "on") ? "Connecté" : "Déconnecté" : B(this.hass, this.config?.ups_status_entity);
		return this.renderDialog(this.config?.name || "Serveur UNRAID", "mdi:server", E`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">État du serveur</span><strong>Serveur ${n ? "en ligne" : "indisponible"}</strong><span class="muted">${this.config?.uptime_entity ? `En service depuis ${B(this.hass, this.config.uptime_entity)}` : "Stockage et services disponibles"}</span></div><div class="dialog-stat"><strong>${Z(e)}</strong><small>utilisé</small></div></div>
          <div class="dialog-section-title">Stockage et santé</div>
          <div class="grid two">
            ${this.statusTile("Array", `${p} · ${m}`, "mdi:database-outline")}
            ${this.statusTile("CPU", `${B(this.hass, this.config?.cpu_entity)} · ${B(this.hass, this.config?.cpu_temperature_entity)}`, "mdi:cpu-64-bit")}
            ${this.statusTile("RAM", B(this.hass, this.config?.memory_entity), "mdi:memory")}
            ${u ? this.statusTile("Docker", `CPU ${B(this.hass, this.config?.docker_cpu_entity)} · RAM ${B(this.hass, this.config?.docker_memory_entity)}`, "mdi:docker") : this.statusTile("Parité", a, "mdi:shield-check-outline")}
          </div>
          ${s ? E`<div class="parity-summary">
                ${this.config?.version_entity ? E`<div class="dialog-stat"><strong>${B(this.hass, this.config.version_entity)}</strong><small>version UNRAID</small></div>` : O}
                ${this.config?.updates_entity ? E`<div class="dialog-stat"><strong>${B(this.hass, this.config.updates_entity)}</strong><small>mises à jour</small></div>` : O}
                ${this.config?.notifications_entity ? E`<div class="dialog-stat"><strong>${B(this.hass, this.config.notifications_entity)}</strong><small>notifications</small></div>` : O}
              </div>` : O}
          ${o ? E`<div class="dialog-section"><div class="dialog-section-title">Parité</div><div class="parity-summary">
                ${this.config?.parity_entity ? E`<div class="dialog-stat"><strong>${a}</strong><small>état</small></div>` : O}
                ${this.config?.parity_age_entity ? E`<div class="dialog-stat"><strong>${B(this.hass, this.config.parity_age_entity)}</strong><small>dernière vérification</small></div>` : O}
                ${this.config?.parity_errors_entity ? E`<div class="dialog-stat"><strong>${B(this.hass, this.config.parity_errors_entity)}</strong><small>erreurs détectées</small></div>` : O}
              </div></div>` : O}
          ${c ? E`<div class="dialog-section"><div class="dialog-section-title">Activité réseau</div><div class="grid two">
                ${this.config?.network_down_entity ? this.statusTile("Entrant", B(this.hass, this.config.network_down_entity), "mdi:download-network-outline") : O}
                ${this.config?.network_up_entity ? this.statusTile("Sortant", B(this.hass, this.config.network_up_entity), "mdi:upload-network-outline") : O}
              </div></div>` : O}
          ${l ? E`<div class="dialog-section"><div class="dialog-section-title">Onduleur</div><div class="grid two">
                ${this.statusTile("Connexion", h, "mdi:power-plug-outline")}
                ${this.config?.ups_status_entity ? this.statusTile("État", B(this.hass, this.config.ups_status_entity), "mdi:information-outline") : O}
                ${this.config?.ups_battery_entity ? this.statusTile("Batterie", B(this.hass, this.config.ups_battery_entity), "mdi:battery-high") : O}
                ${this.config?.ups_load_entity ? this.statusTile("Charge", B(this.hass, this.config.ups_load_entity), "mdi:gauge") : O}
                ${this.config?.ups_runtime_entity ? this.statusTile("Autonomie", B(this.hass, this.config.ups_runtime_entity), "mdi:timer-outline") : O}
              </div></div>` : O}
          <div class="dialog-section">
            <div class="dialog-section-title">Services</div>
            <div class="actions">
              ${this.config?.array_start_entity ? E`<button class="action primary" ?disabled=${!X(this.hass, this.config.array_start_entity)} @click=${() => H(this.hass, this.config?.array_start_entity)}><ha-icon icon="mdi:play"></ha-icon>Démarrer l’array</button>` : O}
              ${f ? E`<button class="action primary" @click=${() => window.open(f, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:open-in-new"></ha-icon>Ouvrir UNRAID</button>` : O}
            </div>
          </div>
          ${d ? E`<div class="dialog-danger-zone"><div class="dialog-section-title">Zone sensible</div><div class="actions">
                ${this.config?.array_stop_entity ? E`<button class="action danger" ?disabled=${!X(this.hass, this.config.array_stop_entity)} @click=${this.confirmArrayStop}><ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter l’array</button>` : O}
                ${this.config?.restart_entity ? E`<button class="action danger" ?disabled=${!X(this.hass, this.config.restart_entity)} @click=${() => this.confirmServerAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer le serveur</button>` : O}
                ${this.config?.shutdown_entity ? E`<button class="action danger" ?disabled=${!X(this.hass, this.config.shutdown_entity)} @click=${() => this.confirmServerAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Éteindre le serveur</button>` : O}
              </div></div>` : O}
        </div>
      `);
	}
};
//#endregion
//#region src/utils/information.ts
function ut(e, t) {
	return F(e) ? t ? e?.attributes[t] : e?.state : void 0;
}
function dt(e) {
	if (typeof e != "string" && typeof e != "number" || typeof e == "string" && !e.trim()) return;
	let t = Number(typeof e == "string" ? e.replace(",", ".") : e);
	return Number.isFinite(t) ? t : void 0;
}
function ft(e, t) {
	let n = P(e, t.active_entity);
	if (F(n) && n?.state === (t.active_state ?? "on")) return t.active_text ?? "En cours";
	let r = P(e, t.entity), i = ut(r, t.attribute);
	if (i == null || i === "" || i === "unknown" || i === "unavailable") return;
	let a = Number.isFinite(t.precision) ? Math.max(0, Math.min(6, Math.round(t.precision))) : 1, o = (e) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: a }).format(e), s = t.unit ?? (t.attribute ? "" : r?.attributes.unit_of_measurement ?? ""), c = s ? ` ${s}` : "";
	switch (t.format) {
		case "duration": {
			let e = dt(i);
			if (e === void 0 || e < 0) return;
			let n = {
				seconds: 1,
				s: 1,
				minutes: 60,
				min: 60,
				hours: 3600,
				h: 3600,
				days: 86400,
				d: 86400
			}[t.duration_unit ?? r?.attributes.unit_of_measurement ?? "seconds"];
			if (!n) return;
			let a = Math.floor(e * n / 60), o = Math.floor(a / 1440), s = Math.floor(a % 1440 / 60);
			return o ? `${o} j ${s} h` : s ? `${s} h ${a % 60} min` : `${a} min`;
		}
		case "datetime": {
			if (typeof i != "string" || !/^\d{4}-\d{2}-\d{2}/.test(i)) return;
			let e = new Date(i);
			return Number.isFinite(e.getTime()) ? new Intl.DateTimeFormat("fr-FR", {
				day: "2-digit",
				month: "2-digit",
				year: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			}).format(e) : void 0;
		}
		case "ratio": {
			let n = dt(i), r = dt(ut(P(e, t.total_entity), t.total_attribute));
			return n === void 0 || n < 0 || r === void 0 || r <= 0 ? void 0 : `${o(n)} / ${o(r)}${c}`;
		}
		default: {
			if (typeof i == "object") return;
			if (!t.attribute && t.unit === void 0 && t.precision === void 0) return B(e, t.entity);
			let n = dt(i);
			return `${n === void 0 ? String(i) : o(n)}${c}`;
		}
	}
}
//#endregion
//#region src/cards/auralis-proxmox-card.ts
function pt(e) {
	return F(e) ? I(e) ? "online" : "offline" : "unavailable";
}
function mt(e) {
	if (!F(e)) return;
	let t = e?.attributes.unit_of_measurement;
	if (t && t !== "%") return;
	let n = R(e, NaN);
	return Number.isFinite(n) ? z(n) : void 0;
}
function Q(e, t) {
	return !!(t && F(P(e, t)));
}
function ht(e) {
	return e === void 0 ? "—" : `${Math.round(e)}%`;
}
var gt = class extends N {
	constructor(...e) {
		super(...e), this.workloadTab = "vm", this.workloadFilter = "all", this.query = "", this.selected = /* @__PURE__ */ new Set(), this.startSelected = async () => {
			let e = this.allWorkloads();
			await Promise.all(e.filter((e) => this.selected.has(e.entity) && !this.itemActive(e) && !this.itemPaused(e)).map((e) => this.startItem(e))), this.selected = /* @__PURE__ */ new Set(), this.requestUpdate();
		};
	}
	static {
		this.styles = [N.styles, o`
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

      .service-icon.healthy { color: var(--auralis-healthy); background: color-mix(in srgb, var(--auralis-healthy) 16%, transparent); }
      .service-icon.warning { color: var(--auralis-active); }
      .service-icon.stopped, .service-icon.unavailable { color: var(--auralis-muted); background: var(--auralis-layer); }
      .service-icon.unavailable { opacity: .5; }
      .storage-bar { grid-template-columns: minmax(70px, 1fr) minmax(50px, 2fr) 38px; }
      .storage-bar > span { overflow-wrap: anywhere; }
      .storage-detail { padding: 16px 0; border-bottom: 1px solid var(--auralis-border); }
      .storage-detail .muted { margin-top: 8px; font-size: 12px; }
      .storage-detail .machine-bar, .storage-detail .machine-bar strong { color: var(--auralis-text); }
      .storage-detail .track span { background: var(--auralis-healthy); }
      .machine-panel { margin-top: auto; max-height: 285px; overflow: auto; }
      .node-information {
        display: grid;
        grid-template-columns: repeat(var(--info-columns, 3), minmax(0, 1fr));
        gap: 8px;
        margin: 10px 0 20px;
      }
      .info-tile {
        min-width: 0;
        padding: 11px 10px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        background: rgba(9, 14, 20, var(--machine-glass-alpha, .84));
        color: var(--auralis-text);
        backdrop-filter: blur(8px);
        overflow-wrap: anywhere;
      }
      .info-label { display: flex; align-items: center; gap: 5px; color: #a1b0c2; font-size: 10px; line-height: 1.35; }
      .info-label ha-icon { flex: 0 0 auto; --mdc-icon-size: 14px; color: var(--machine-accent); }
      .info-value { display: block; margin-top: 7px; color: #f7f9fc; font-size: 12px; line-height: 1.45; font-weight: 700; }
      .machine-rail + .node-information { margin-top: 120px; }
      @container (max-width: 310px) {
        .node-information { grid-template-columns: repeat(var(--info-mobile-columns, 2), minmax(0, 1fr)); }
      }
      .selection {
        grid-column: 1;
      }
      .selection-placeholder { width: 25px; height: 19px; }

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

    `];
	}
	updated() {
		super.updated();
		let e = new Set(this.allWorkloads().filter((e) => !this.itemActive(e) && !this.itemPaused(e) && F(P(this.hass, e.entity))).map((e) => e.entity)), t = new Set([...this.selected].filter((t) => e.has(t)));
		t.size !== this.selected.size && (this.selected = t, this.requestUpdate());
	}
	setConfig(e) {
		if (!e.status_entity) throw Error("status_entity est obligatoire.");
		if (e.info_items !== void 0 && (!Array.isArray(e.info_items) || e.info_items.some((e) => !e || typeof e.entity != "string" || !e.entity.trim()))) throw Error("info_items doit être une liste de tuiles avec une entity pour chacune.");
		if (e.info_columns !== void 0 && (!Number.isInteger(e.info_columns) || e.info_columns < 1 || e.info_columns > 4)) throw Error("info_columns doit être un entier entre 1 et 4.");
		this.config = {
			...e,
			name: e.name || "Proxmox",
			theme: e.theme || "auto",
			nodes: e.nodes || [],
			vms: e.vms || [],
			containers: e.containers || []
		};
	}
	static getStubConfig() {
		return {
			name: "Proxmox",
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
					name: "cpu_entity",
					selector: { entity: {} }
				},
				{
					name: "uptime_entity",
					selector: { entity: {} }
				},
				{
					name: "info_items",
					selector: { object: {} }
				},
				{
					name: "info_columns",
					selector: { number: {
						min: 1,
						max: 4,
						mode: "box"
					} }
				},
				{
					name: "temperature_entity",
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
					name: "storages",
					selector: { object: {} }
				},
				{
					name: "disks",
					selector: { object: {} }
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
			computeHelper: (e) => e.name === "backup_action_entity" ? "Les stockages, disques, VM et conteneurs se configurent en YAML." : void 0
		};
	}
	getCardSize() {
		return 12;
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 3
		};
	}
	render() {
		if (!this.config || !this.hass) return E``;
		let e = pt(P(this.hass, this.config.status_entity)), t = mt(P(this.hass, this.config.cpu_entity || this.config.cluster_usage_entity)), n = mt(P(this.hass, this.config.memory_entity)), r = (this.config.vms || []).some((e) => this.itemActive(e)), i = (this.config.containers || []).some((e) => this.itemActive(e)), a = this.storageItems().filter((e) => e.show_on_card !== !1), o = e === "online" ? "Nœud en ligne et disponible" : e === "offline" ? "Nœud hors ligne" : "État du nœud indisponible";
		return E`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${this.machineStyle("#50d59b")}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2>
              <div class="machine-status"><span class="dot ${e === "online" ? "healthy" : e === "offline" ? "danger" : ""}"></span>${o}</div>
            </div></header>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("cluster")} title="Détails du nœud" aria-label="Détails du nœud"><ha-icon icon="mdi:information-outline"></ha-icon></button>
              <button class="rail-button ${r ? "has-active" : ""}" @click=${() => this.openWorkloads("vm")} title="Machines virtuelles" aria-label="Machines virtuelles"><ha-icon icon="mdi:monitor-multiple"></ha-icon></button>
              <button class="rail-button ${i ? "has-active" : ""}" @click=${() => this.openWorkloads("container")} title="Conteneurs LXC" aria-label="Conteneurs LXC"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
            </div>
            ${this.renderResourceGauges(t, n)}
            ${this.renderInformation()}
            <section class="machine-panel">
              <div class="machine-panel-head">
                <div class="machine-panel-title"><small>Stockage</small><strong>Espaces de stockage</strong></div>
                <button class="machine-accent-action" @click=${() => this.openDialog("storage")} aria-label="Stockages et disques"><ha-icon icon="mdi:harddisk"></ha-icon>Disques</button>
              </div>
              <div class="machine-bars">${a.map((e) => this.renderStorageBar(e))}</div>
              ${a.length ? O : E`<div class="empty">Aucun stockage sélectionné.</div>`}
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "cluster" ? this.renderClusterDialog() : O}
      ${this.dialog === "workloads" ? this.renderWorkloadsDialog() : O}
      ${this.dialog === "storage" ? this.renderStorageDialog() : O}
    `;
	}
	renderInformation() {
		let e = (this.config?.info_items ?? []).filter((e) => e.show !== !1).map((e) => ({
			item: e,
			value: ft(this.hass, e)
		})).filter(({ item: e, value: t }) => t !== void 0 || e.hide_unavailable === !1);
		if (!e.length) return O;
		let t = this.config?.info_columns ?? 3;
		return E`<section class="node-information" aria-label="Informations du nœud"
      style=${`--info-columns:${t};--info-mobile-columns:${Math.min(t, 2)}`}>
      ${e.map(({ item: e, value: t }) => E`<div class="info-tile">
        <div class="info-label">${e.icon ? E`<ha-icon icon=${e.icon}></ha-icon>` : O}
          <span>${e.label ?? P(this.hass, e.entity)?.attributes.friendly_name ?? e.entity}</span>
        </div>
        <strong class="info-value">${t ?? "Indisponible"}</strong>
      </div>`)}
    </section>`;
	}
	storageItems() {
		return this.config?.storages === void 0 ? this.config?.storage_entity ? [{
			name: "Stockage",
			usage_entity: this.config.storage_entity,
			capacity_entity: this.config.storage_label_entity
		}] : [] : this.config.storages;
	}
	renderStorageBar(e) {
		let t = mt(P(this.hass, e.usage_entity));
		return E`<div class="machine-bar storage-bar">
      <span title=${e.name}>${e.name}</span>
      <div class="track" role="meter" aria-label=${e.name}
        aria-valuemin="0" aria-valuemax="100" aria-valuenow=${t ?? O}
        aria-valuetext=${t === void 0 ? "Indisponible" : ht(t)}>
        <span style=${`width:${t ?? 0}%`}></span>
      </div><strong>${ht(t)}</strong>
    </div>`;
	}
	renderStorageDialog() {
		let e = (e, t) => E`
      <div class="dialog-section-title">${e}</div>
      ${t.length ? t.map((e) => E`<div class="storage-detail">
        ${this.renderStorageBar(e)}
        <div class="muted">${[
			e.capacity_entity ? B(this.hass, e.capacity_entity) : "",
			e.status_entity ? B(this.hass, e.status_entity) : "",
			e.temperature_entity ? B(this.hass, e.temperature_entity) : ""
		].filter(Boolean).join(" · ")}</div>
      </div>`) : E`<div class="empty">Aucun élément configuré.</div>`}`;
		return this.renderDialog("Stockages et disques", "mdi:harddisk", E`
      <div class="dialog-body">
        ${e("Espaces de stockage", this.storageItems())}
        ${e("Disques physiques", this.config?.disks || [])}
      </div>`);
	}
	itemActive(e) {
		return I(P(this.hass, e.entity));
	}
	itemPaused(e) {
		let t = P(this.hass, e.entity)?.state.toLowerCase();
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
		return this.renderDialog(this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC", this.workloadTab === "vm" ? "mdi:layers-triple-outline" : "mdi:cube-outline", E`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">${this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC"}</span><strong>${t} actif${t > 1 ? "s" : ""} sur ${e.length}</strong><span class="muted">Filtrer, démarrer et ouvrir les consoles depuis le dashboard</span></div>
            <div class="dialog-stat"><strong>${r}</strong><small>arrêté${r > 1 ? "s" : ""}</small></div>
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
          ${this.workloadItems().length ? Array.from(this.groupedItems()).map(([e, t]) => E`<div class="section-label">${e}</div><div class="list">${t.map((e) => this.renderWorkloadRow(e))}</div>`) : E`<div class="empty">Aucune charge ne correspond à ce filtre.</div>`}
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
		return E`<button class=${this.workloadFilter === e ? "active" : ""} @click=${() => {
			this.workloadFilter = e, this.requestUpdate();
		}}>${t}</button>`;
	}
	renderWorkloadRow(e) {
		let t = this.itemActive(e), n = this.itemPaused(e), r = F(P(this.hass, e.entity)) && Q(this.hass, e.start_entity || (e.entity.startsWith("switch.") ? e.entity : void 0)), i = F(P(this.hass, e.entity)), a = i ? t ? "healthy" : n ? "warning" : "stopped" : "unavailable", o = i ? t ? "Actif" : n ? "Suspendu" : "Arrêté" : "Indisponible";
		return E`
      <div class="list-row">
        ${t ? E`<span class="selection selection-placeholder" aria-hidden="true"></span>` : E`<input class="selection" type="checkbox" aria-label=${`Sélectionner ${e.name}`} .checked=${this.selected.has(e.entity)} ?disabled=${n || !r} @change=${() => this.toggleSelected(e.entity)} />`}
        <div class="service-main">
          <span class="service-icon ${a}"><ha-icon .icon=${e.icon || (this.workloadTab === "vm" ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
          <div class="meta">
            <div class="name">${e.name}</div>
            <div class="state"><span class="dot ${a}" style="display:inline-block;margin-right:5px;"></span>${o}${e.node ? ` · ${e.node}` : ""}${e.cpu_entity ? ` · CPU ${B(this.hass, e.cpu_entity)}` : ""}</div>
            <div class="resource-tags">${e.vcpus ? E`<span>${e.vcpus} vCPU</span>` : O}${e.memory ? E`<span>${e.memory}</span>` : O}${e.storage ? E`<span>${e.storage}</span>` : O}${e.ip_entity ? E`<span>${B(this.hass, e.ip_entity)}</span>` : O}</div>
          </div>
        </div>
        ${this.renderWorkloadAction(e, t, n)}
      </div>
    `;
	}
	renderWorkloadAction(e, t, n) {
		return F(P(this.hass, e.entity)) ? n ? E`<button class="action primary" ?disabled=${!Q(this.hass, e.resume_entity)} @click=${() => H(this.hass, e.resume_entity)}><ha-icon icon="mdi:play"></ha-icon>Reprendre</button>` : t ? e.console_url ? E`<button class="action" @click=${() => window.open(e.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>` : E`<button class="action" ?disabled=${!Q(this.hass, e.restart_entity)} @click=${() => H(this.hass, e.restart_entity)}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : E`<button class="action primary" ?disabled=${!Q(this.hass, e.start_entity || (e.entity.startsWith("switch.") ? e.entity : void 0))} @click=${() => this.startItem(e)}><ha-icon icon="mdi:play"></ha-icon>Démarrer</button>` : E`<span class="muted">Indisponible</span>`;
	}
	toggleSelected(e) {
		let t = new Set(this.selected);
		t.has(e) ? t.delete(e) : t.add(e), this.selected = t, this.requestUpdate();
	}
	async startItem(e) {
		if (!F(P(this.hass, e.entity)) || this.itemActive(e) || this.itemPaused(e)) return;
		let t = e.start_entity || (e.entity.startsWith("switch.") ? e.entity : void 0);
		Q(this.hass, t) && await H(this.hass, t);
	}
	confirmClusterAction(e) {
		let t = e === "restart", n = t ? this.config?.restart_entity : this.config?.shutdown_entity;
		pt(P(this.hass, this.config?.status_entity)) === "online" && Q(this.hass, n) && (this.askConfirmation({
			title: `${t ? "Redémarrer" : "Arrêter"} ${this.config?.name || "le nœud"} ?`,
			message: "Cette action peut interrompre plusieurs machines virtuelles et services. Vérifiez les migrations avant de continuer.",
			confirmLabel: t ? "Redémarrer" : "Arrêter",
			action: () => H(this.hass, n)
		}), this.dialog = "cluster");
	}
	renderClusterDialog() {
		let e = this.config, t = pt(P(this.hass, e.status_entity)), n = t === "online", r = [
			[
				"CPU",
				e.cpu_entity || e.cluster_usage_entity,
				"mdi:cpu-64-bit"
			],
			[
				"RAM",
				e.memory_label_entity || e.memory_entity,
				"mdi:memory"
			],
			[
				"Durée de fonctionnement",
				e.uptime_entity,
				"mdi:clock-outline"
			],
			[
				"Température",
				e.temperature_entity,
				"mdi:thermometer"
			],
			[
				"Réception réseau",
				e.network_down_entity,
				"mdi:download-network"
			],
			[
				"Émission réseau",
				e.network_up_entity,
				"mdi:upload-network"
			],
			[
				"Version",
				e.version_entity,
				"mdi:server"
			],
			[
				"Quorum",
				e.quorum_entity,
				"mdi:lan"
			],
			[
				"Ceph",
				e.ceph_entity,
				"mdi:database-check-outline"
			],
			[
				"Dernière sauvegarde",
				e.backup_entity,
				"mdi:calendar-clock"
			],
			[
				"Alertes",
				e.alerts_entity,
				"mdi:alert-circle-outline"
			]
		].filter(([, e]) => F(P(this.hass, e)));
		return this.renderDialog(e.name || "Détails du nœud", "mdi:information-outline", E`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État du nœud</span>
          <strong>${n ? "En ligne et disponible" : t === "offline" ? "Hors ligne" : "État indisponible"}</strong>
        </div></div>
        <div class="grid two">${r.map(([e, t, n]) => E`<div class="tile">
          <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${n}></ha-icon></span><strong>${B(this.hass, t)}</strong></div>
          <div style="margin-top:10px">${e}</div>
        </div>`)}</div>
        ${e.backup_action_entity ? E`<div class="dialog-section"><button class="action"
          ?disabled=${!n || !Q(this.hass, e.backup_action_entity)}
          @click=${() => H(this.hass, e.backup_action_entity)}>
          <ha-icon icon="mdi:backup-restore"></ha-icon>Lancer la sauvegarde</button></div>` : O}
        ${e.restart_entity || e.shutdown_entity ? E`
          <div class="dialog-danger-zone"><div class="dialog-section-title">Actions du nœud</div><div class="actions">
            ${e.restart_entity ? E`<button class="action danger" ?disabled=${!n || !Q(this.hass, e.restart_entity)} @click=${() => this.confirmClusterAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : O}
            ${e.shutdown_entity ? E`<button class="action danger" ?disabled=${!n || !Q(this.hass, e.shutdown_entity)} @click=${() => this.confirmClusterAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Arrêter</button>` : O}
          </div></div>` : O}
      </div>`);
	}
}, _t = /* @__PURE__ */ new Set([
	"unknown",
	"unavailable",
	""
]);
function vt(e) {
	try {
		return new URL(e, "https://home-assistant.local").pathname.replace(/\/$/, "") || "/";
	} catch {
		return "/";
	}
}
function $(e) {
	let t = (e.path || e.navigation_path || "").trim();
	if (!(!t || t.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(t))) return t.startsWith("/") || t.startsWith("#") ? t : `/${t}`;
}
function yt(e, t) {
	let n = [$(e), ...e.active_paths || []].filter((e) => !!e).map(vt), r = vt(t);
	return n.some((t) => e.exact ? r === t : r === t || t !== "/" && r.startsWith(`${t}/`));
}
function bt(e, t, n) {
	let r = e ? Math.max(t.offsetLeft, e.left) : t.offsetLeft, i = e ? Math.min(t.offsetLeft + t.width, e.right) : t.offsetLeft + t.width, a = i > r ? r : t.offsetLeft, o = i > r ? i - r : t.width;
	return {
		centerX: a + o / 2,
		availableWidth: o,
		top: t.offsetTop,
		bottom: Math.max(0, n - t.offsetTop - t.height),
		centerY: t.offsetTop + t.height / 2
	};
}
var xt = class extends N {
	constructor(...e) {
		super(...e), this.routeChanged = () => this.requestUpdate(), this.isPortal = !1, this.updateOverlayGeometry = () => {
			if (!this.overlay) return;
			let e = window.visualViewport, t = bt(this.dashboardElement?.getBoundingClientRect(), {
				offsetLeft: e?.offsetLeft ?? 0,
				offsetTop: e?.offsetTop ?? 0,
				width: e?.width ?? window.innerWidth,
				height: e?.height ?? window.innerHeight
			}, window.innerHeight);
			this.overlay.style.setProperty("--auralis-navbar-center-x", `${t.centerX}px`), this.overlay.style.setProperty("--auralis-navbar-available-width", `${t.availableWidth}px`), this.overlay.style.setProperty("--auralis-navbar-visual-top", `${t.top}px`), this.overlay.style.setProperty("--auralis-navbar-visual-bottom", `${t.bottom}px`), this.overlay.style.setProperty("--auralis-navbar-visual-center-y", `${t.centerY}px`);
		};
	}
	static {
		this.styles = [Ne, o`
      :host { container-type: inline-size; }
      :host([data-position]:not([data-position="inline"]):not([data-portal])) {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
      }
      :host([data-portal]) {
        position: fixed;
        z-index: 1000;
        box-sizing: border-box;
      }
      :host([data-portal][data-position="top"]),
      :host([data-portal][data-position="bottom"]) {
        left: var(--auralis-navbar-center-x, 50vw);
        width: min(720px, var(--auralis-navbar-available-width, 100vw));
        transform: translateX(-50%);
      }
      :host([data-portal][data-position="top"]) { top: var(--auralis-navbar-visual-top, 0px); }
      :host([data-portal][data-position="bottom"]) { bottom: var(--auralis-navbar-visual-bottom, 0px); }
      :host([data-portal][data-position="left"]),
      :host([data-portal][data-position="right"]) {
        top: var(--auralis-navbar-visual-center-y, 50%);
        width: min(160px, 100vw);
        max-height: 100dvh;
        transform: translateY(-50%);
      }
      :host([data-portal][data-position="left"]) { left: 0; }
      :host([data-portal][data-position="right"]) { right: 0; }
      ha-card {
        height: var(--navbar-height-desktop, 76px);
        box-sizing: border-box;
        overflow: visible;
        background: var(--machine-base-background, var(--auralis-bg));
      }
      :host([data-position="left"]) ha-card,
      :host([data-position="right"]) ha-card { height: auto; }
      .navbar-shell {
        position: relative;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        padding: 8px;
        border-radius: inherit;
        background: color-mix(in srgb, var(--auralis-card) 92%, transparent);
        backdrop-filter: blur(18px);
      }
      .navbar-shell::before {
        position: absolute;
        inset: 0;
        z-index: -1;
        background-image: var(--machine-image, none);
        background-position: var(--machine-image-position, center);
        background-size: cover;
        opacity: var(--machine-image-opacity, 0);
        filter: brightness(var(--machine-image-brightness, 0.72));
        content: "";
      }
      nav {
        display: flex;
        height: 100%;
        box-sizing: border-box;
        align-items: stretch;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
        scroll-snap-type: x proximity;
      }
      nav::-webkit-scrollbar { display: none; }
      :host([data-position="bottom"]) nav { padding-bottom: env(safe-area-inset-bottom, 0); }
      :host([data-position="top"]) nav { padding-top: env(safe-area-inset-top, 0); }
      :host([data-position="left"]) .navbar-shell,
      :host([data-position="right"]) .navbar-shell,
      :host([data-position="left"]) nav,
      :host([data-position="right"]) nav {
        height: auto;
      }
      :host([data-position="left"]) nav,
      :host([data-position="right"]) nav {
        max-height: calc(100dvh - 16px);
        flex-direction: column;
        overflow-x: hidden;
        overflow-y: auto;
        padding-bottom: 0;
        scroll-snap-type: y proximity;
      }
      :host([data-position="left"]) .nav-item,
      :host([data-position="right"]) .nav-item {
        flex: 0 0 auto;
        min-height: 48px;
        flex-direction: row;
        justify-content: flex-start;
      }
      .nav-item {
        position: relative;
        display: flex;
        flex: 1 0 76px;
        min-width: 0;
        min-height: 0;
        align-items: center;
        justify-content: center;
        gap: 7px;
        box-sizing: border-box;
        padding: 10px 12px;
        overflow: hidden;
        border: 1px solid transparent;
        border-radius: 17px;
        color: var(--auralis-muted);
        text-decoration: none;
        scroll-snap-align: center;
        transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .nav-item:hover, .nav-item:focus-visible {
        color: var(--auralis-text);
        background: color-mix(in srgb, var(--auralis-layer) 76%, transparent);
        outline: none;
      }
      .nav-item:focus-visible { box-shadow: 0 0 0 2px var(--machine-accent, var(--auralis-info)); }
      .nav-item:active { transform: scale(0.97); }
      .nav-item.active {
        border-color: color-mix(in srgb, var(--machine-accent, var(--auralis-info)) 30%, transparent);
        background: color-mix(in srgb, var(--machine-accent, var(--auralis-info)) 14%, var(--auralis-layer));
        color: var(--auralis-text);
      }
      .nav-item.active::after {
        position: absolute;
        right: 22%;
        bottom: 4px;
        left: 22%;
        height: 3px;
        border-radius: 99px;
        background: var(--machine-accent, var(--auralis-info));
        box-shadow: 0 0 12px color-mix(in srgb, var(--machine-accent, var(--auralis-info)) 65%, transparent);
        content: "";
      }
      .icon-wrap { position: relative; display: grid; place-items: center; flex: 0 0 auto; }
      ha-icon { --mdc-icon-size: 23px; }
      .active ha-icon { color: var(--machine-accent, var(--auralis-info)); }
      .label {
        min-width: 0;
        overflow: hidden;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .badge {
        position: absolute;
        top: -7px;
        right: -10px;
        min-width: 16px;
        height: 16px;
        box-sizing: border-box;
        padding: 0 4px;
        border: 2px solid var(--auralis-card);
        border-radius: 999px;
        background: var(--machine-accent, var(--auralis-info));
        color: white;
        font-size: 8px;
        font-weight: 800;
        line-height: 12px;
        text-align: center;
      }
      .compact .nav-item { min-height: 48px; padding: 8px 10px; }
      .labels-hidden .nav-item { flex-basis: 54px; }
      @container (max-width: 520px) {
        .nav-item { flex: 1 0 64px; flex-direction: column; gap: 4px; padding: 5px 8px; }
        .label { max-width: 74px; font-size: 10px; }
      }
      @media (max-width: 1024px) {
        ha-card { height: var(--navbar-height-tablet, 72px); }
      }
      @media (max-width: 600px) {
        ha-card { height: var(--navbar-height-mobile, 72px); }
        :host([data-position="bottom"]) ha-card {
          height: calc(var(--navbar-height-mobile, 72px) + env(safe-area-inset-bottom, 0px));
        }
        :host([data-position="top"]) ha-card {
          height: calc(var(--navbar-height-mobile, 72px) + env(safe-area-inset-top, 0px));
        }
        .navbar-shell { padding: 6px; }
        .nav-item { padding: 2px 6px; gap: 2px; }
        ha-icon { --mdc-icon-size: 20px; }
      }
    `];
	}
	findDashboardElement() {
		let e = this, t;
		for (; e;) {
			if (e instanceof Element) {
				let n = e.tagName.toLowerCase();
				if (n === "ha-panel-lovelace" || n === "hui-root") return e;
				n === "main" && (t = e);
			}
			e = e.parentNode || (e instanceof ShadowRoot ? e.host : null);
		}
		return t;
	}
	syncOverlay() {
		if (this.isPortal) return;
		if (!this.config || this.config.position === "inline") {
			this.removeOverlay();
			return;
		}
		this.overlay || (this.overlay = document.createElement("auralis-navbar-card"), this.overlay.isPortal = !0, this.overlay.setAttribute("data-portal", ""), document.body.append(this.overlay)), this.overlayConfig !== this.config && (this.overlay.setConfig(this.config), this.overlayConfig = this.config), this.overlay.hass = this.hass;
		let e = this.findDashboardElement();
		e !== this.dashboardElement && (this.dashboardObserver?.disconnect(), this.dashboardElement = e, e && typeof ResizeObserver < "u" && (this.dashboardObserver = new ResizeObserver(this.updateOverlayGeometry), this.dashboardObserver.observe(e))), this.updateOverlayGeometry();
	}
	removeOverlay() {
		this.dashboardObserver?.disconnect(), this.dashboardObserver = void 0, this.dashboardElement = void 0, this.overlay?.remove(), this.overlay = void 0, this.overlayConfig = void 0;
	}
	connectedCallback() {
		super.connectedCallback(), window.addEventListener("location-changed", this.routeChanged), window.addEventListener("popstate", this.routeChanged), this.isPortal || (window.addEventListener("resize", this.updateOverlayGeometry), window.visualViewport?.addEventListener("resize", this.updateOverlayGeometry), window.visualViewport?.addEventListener("scroll", this.updateOverlayGeometry));
	}
	disconnectedCallback() {
		window.removeEventListener("location-changed", this.routeChanged), window.removeEventListener("popstate", this.routeChanged), this.isPortal || (window.removeEventListener("resize", this.updateOverlayGeometry), window.visualViewport?.removeEventListener("resize", this.updateOverlayGeometry), window.visualViewport?.removeEventListener("scroll", this.updateOverlayGeometry), this.removeOverlay()), super.disconnectedCallback();
	}
	updated() {
		super.updated(), this.syncOverlay();
	}
	setConfig(e) {
		if (!Array.isArray(e.items) || e.items.length === 0) throw Error("items doit contenir au moins une destination.");
		let t = e.position || "bottom";
		if (![
			"inline",
			"top",
			"bottom",
			"left",
			"right"
		].includes(t)) throw Error("position doit être inline, top, bottom, left ou right.");
		let n = e.items.map((e) => ({
			...e,
			label: e.label?.trim()
		}));
		if (n.some((e) => !e.label || !$(e))) throw Error("Chaque entrée de navigation doit avoir un label et un path valides.");
		for (let t of [
			"height_desktop",
			"height_tablet",
			"height_mobile"
		]) {
			let n = e[t];
			if (n !== void 0 && (!Number.isInteger(n) || n < 56 || n > 160)) throw Error(`${t} doit être un nombre entier entre 56 et 160 pixels.`);
		}
		this.config = {
			theme: "auto",
			accent_color: "#79d6f2",
			show_labels: !0,
			...e,
			position: t,
			items: n
		}, this.setAttribute?.("data-position", t);
	}
	static getConfigForm() {
		return { schema: [
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
				name: "accent_color",
				selector: { text: {} }
			},
			{
				name: "position",
				selector: { select: {
					options: [
						"inline",
						"top",
						"bottom",
						"left",
						"right"
					],
					mode: "dropdown"
				} }
			},
			{
				name: "height_desktop",
				selector: { number: {
					min: 56,
					max: 160,
					mode: "box"
				} }
			},
			{
				name: "height_tablet",
				selector: { number: {
					min: 56,
					max: 160,
					mode: "box"
				} }
			},
			{
				name: "height_mobile",
				selector: { number: {
					min: 56,
					max: 160,
					mode: "box"
				} }
			},
			{
				name: "show_labels",
				selector: { boolean: {} }
			},
			{
				name: "compact",
				selector: { boolean: {} }
			},
			{
				name: "items",
				selector: { object: {} }
			}
		] };
	}
	static getStubConfig() {
		return {
			type: "custom:auralis-navbar-card",
			position: "bottom",
			items: [
				{
					label: "Accueil",
					icon: "mdi:home-outline",
					path: "/dashboard-auralis/accueil"
				},
				{
					label: "Pièces",
					icon: "mdi:floor-plan",
					path: "/dashboard-auralis/pieces"
				},
				{
					label: "Systèmes",
					icon: "mdi:server-network",
					path: "/dashboard-auralis/systemes"
				}
			]
		};
	}
	badge(e) {
		if (!e.badge_entity) return;
		let t = this.hass?.states[e.badge_entity];
		if (t && !_t.has(t.state.toLowerCase())) return this.hass?.formatEntityState?.(t) || t.state;
	}
	navigate(e, t) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		let n = $(t);
		n && (e.preventDefault(), `${window.location.pathname}${window.location.search}${window.location.hash}` !== n && (window.history.pushState(null, "", n), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }))));
	}
	render() {
		if (!this.config || this.config.position !== "inline" && !this.isPortal) return E``;
		let e = typeof window > "u" ? "/" : window.location.pathname, t = this.config.show_labels !== !1, n = [this.config.compact ? "compact" : "", t ? "" : "labels-hidden"].filter(Boolean).join(" "), r = [
			"desktop",
			"tablet",
			"mobile"
		].map((e) => {
			let t = this.config?.[`height_${e}`];
			return t === void 0 ? "" : `--navbar-height-${e}:${t}px`;
		}).filter(Boolean).join(";");
		return E`
      <ha-card style=${`${this.machineStyle("#79d6f2")};${r}`}>
        <div class="navbar-shell ${n}">
          <nav aria-label=${this.config.aria_label || this.config.name || "Navigation Auralis"}>
            ${this.config.items.map((n) => {
			let r = $(n), i = yt(n, e), a = this.badge(n);
			return E`<a class="nav-item ${i ? "active" : ""}" href=${r} aria-current=${i ? "page" : O} title=${n.label} @click=${(e) => this.navigate(e, n)}>
                <span class="icon-wrap"><ha-icon .icon=${n.icon || "mdi:circle-outline"}></ha-icon>${a ? E`<span class="badge">${a}</span>` : O}</span>
                ${t ? E`<span class="label">${n.label}</span>` : O}
              </a>`;
		})}
          </nav>
        </div>
      </ha-card>`;
	}
	getCardSize() {
		return 1;
	}
	getGridOptions() {
		return this.config?.position === "inline" ? {
			rows: 2,
			min_rows: 1,
			columns: 12,
			min_columns: 4
		} : {
			columns: 1,
			min_columns: 1
		};
	}
}, St = "0.13.0";
customElements.get("auralis-room-card") || customElements.define("auralis-room-card", Ge), customElements.get("auralis-covers-card") || customElements.define("auralis-covers-card", Ke), customElements.get("auralis-pc-card") || customElements.define("auralis-pc-card", at), customElements.get("auralis-unraid-card") || customElements.define("auralis-unraid-card", lt), customElements.get("auralis-proxmox-card") || customElements.define("auralis-proxmox-card", gt), customElements.get("auralis-navbar-card") || customElements.define("auralis-navbar-card", xt), customElements.get("orbit-room-card") || customElements.define("orbit-room-card", class extends Ge {}), customElements.get("orbit-pc-card") || customElements.define("orbit-pc-card", class extends at {}), customElements.get("orbit-unraid-card") || customElements.define("orbit-unraid-card", class extends lt {}), customElements.get("orbit-proxmox-card") || customElements.define("orbit-proxmox-card", class extends gt {}), customElements.get("orbit-navbar-card") || customElements.define("orbit-navbar-card", class extends xt {}), window.customCards = window.customCards || [];
var Ct = [
	{
		type: "auralis-navbar-card",
		name: "Auralis · Navigation",
		description: "Navigation thématique entre les vues et sous-vues d’un tableau de bord.",
		preview: !0
	},
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
		type: "auralis-covers-card",
		name: "Auralis · Volets",
		description: "Groupes de volets illustrés et commandes individuelles.",
		preview: !0,
		getEntitySuggestion: (e, t) => t.startsWith("cover.") ? { config: {
			type: "custom:auralis-covers-card",
			groups: [{
				name: "Volets",
				covers: [t]
			}]
		} } : null
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
for (let e of Ct) window.customCards.some((t) => t.type === e.type) || window.customCards.push(e);
console.info(`%c AURALIS CARDS %c v${St} `, "color:#fff;background:#3d7ce8;font-weight:700;padding:3px 7px;border-radius:7px 0 0 7px;", "color:#17233d;background:#dfeaff;font-weight:700;padding:3px 7px;border-radius:0 7px 7px 0;");
//#endregion

//# sourceMappingURL=auralis-cards.js.map