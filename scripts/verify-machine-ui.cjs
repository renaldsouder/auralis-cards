const { chromium } = require(process.env.AURALIS_PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const output = process.env.AURALIS_UI_OUTPUT || path.join(process.cwd(), "dist", "ui-audit");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.AURALIS_BROWSER_CHANNEL || "msedge", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    // Exercise the distributable bundle inside the demo, not just Vite's source modules.
    await page.route("**/auralis-cards.ts", route => route.fulfill({
      path: path.join(process.cwd(), "dist", "auralis-cards.js"),
      contentType: "text/javascript",
    }));
    await page.goto(process.env.AURALIS_DEMO_URL || "http://127.0.0.1:4173");
    await page.locator("auralis-proxmox-card .machine-resource-gauges").waitFor();
    for (const tag of ["auralis-pc-card", "auralis-unraid-card", "auralis-proxmox-card"]) {
      const labels = await page.locator(tag + " .machine-resource-gauges [role=meter]").evaluateAll(nodes => nodes.map(n => n.getAttribute("aria-label")));
      assert.deepEqual(labels, ["CPU", "RAM"], tag);
    }
    const card = page.locator("auralis-proxmox-card");
    // Reproduce Sections' grid sizing (56px rows + 8px gaps) around real cards.
    // The old 11-row default reserved 696px around a roughly 568px card.
    await card.evaluate(async el => {
      const fixture = document.createElement("section");
      fixture.id = "proxmox-height-fixture";
      fixture.style.cssText = "display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:auto;gap:8px;width:788px;";
      document.body.append(fixture);
      for (const infoItems of [[], el.config.info_items]) {
        const copy = document.createElement("auralis-proxmox-card");
        copy.hass = el.hass;
        copy.setConfig({ ...el.config, info_items: infoItems });
        const options = copy.getGridOptions();
        const cell = document.createElement("div");
        cell.style.cssText = `grid-column:span 6;grid-row:span ${typeof options.rows === "number" ? options.rows : 1};position:relative;`;
        if (typeof options.rows === "number") cell.style.height = `${options.rows * 64 - 8}px`;
        cell.append(copy);
        fixture.append(cell);
        await copy.updateComplete;
      }
    });
    const heights = await page.locator("#proxmox-height-fixture > div").evaluateAll(cells => cells.map(cell => ({
      reserved: cell.getBoundingClientRect().height,
      visible: cell.firstElementChild.shadowRoot.querySelector("ha-card").getBoundingClientRect().height,
    })));
    for (const height of heights) assert.ok(Math.abs(height.reserved - height.visible) < 2, "Sections has no unused reserved height");
    assert.ok(Math.abs(heights[0].visible - heights[1].visible) < 2, "Three info tiles fit the same card height");
    await page.locator("#proxmox-height-fixture").screenshot({ path: path.join(output, "proxmox-height-0.12.3.png") });
    await page.locator("#proxmox-height-fixture").evaluate(el => el.remove());
    assert.equal(await card.locator(".info-tile").count(), 3);
    assert.match(await card.locator(".node-information").innerText(), /12 j 3 h/);
    assert.match(await card.locator(".node-information").innerText(), /11,3 \/ 15,4 Gio/);
    // Configured order, additional rows and availability transitions are live.
    await card.evaluate(el => {
      el._initialInfoItems = el.config.info_items;
      el.setConfig({ ...el.config, info_columns: 2, info_items: [
        ...el.config.info_items,
        { entity: "sensor.proxmox_version", label: "Version personnalisée" },
        { entity: "sensor.missing", label: "Masquée" },
        { entity: "sensor.missing", label: "Visible indisponible", hide_unavailable: false },
        { entity: "sensor.proxmox_version", label: "Désactivée", show: false },
      ] });
    });
    assert.equal(await card.locator(".info-tile").count(), 5);
    assert.match(await card.locator(".node-information").innerText(), /Version personnalisée/);
    assert.doesNotMatch(await card.locator(".node-information").innerText(), /Masquée|Désactivée/);
    await card.evaluate(el => {
      el.hass = { ...el.hass, states: { ...el.hass.states,
        "binary_sensor.proxmox_backup_running": { ...el.hass.states["binary_sensor.proxmox_backup_running"], state: "on" },
      } };
    });
    assert.match(await card.locator(".node-information").innerText(), /En cours/);
    await card.evaluate(el => el.setConfig({ ...el.config, info_items: [] }));
    assert.equal(await card.locator(".node-information").count(), 0);
    await card.evaluate(el => el.setConfig({ ...el.config, info_columns: 3, info_items: el._initialInfoItems }));
    await card.getByRole("button", { name: "Machines virtuelles", exact: true }).click();
    let dialog = card.getByRole("dialog");
    assert.match(await dialog.innerText(), /Home Assistant/);
    assert.doesNotMatch(await dialog.innerText(), /Mosquitto|Grafana|Conteneurs LXC/);
    const onColor = await dialog.locator(".service-icon.healthy").first().evaluate(n => getComputedStyle(n).color);
    const offColor = await dialog.locator(".service-icon.stopped").first().evaluate(n => getComputedStyle(n).color);
    assert.notEqual(onColor, offColor);
    assert.equal(await dialog.locator(".list-row").filter({ hasText: "Home Assistant" }).getByRole("checkbox").count(), 0, "No checkbox for running VM");
    // Supply an available start command for the selected-start transition fixture.
    await card.evaluate(el => {
      el.hass = { ...el.hass, states: { ...el.hass.states,
        "button.proxmox_vm_windows_start": {
          entity_id: "button.proxmox_vm_windows_start", state: "2026-10-06T08:00:00Z", attributes: {},
        },
      }};
    });
    await dialog.getByRole("checkbox", { name: "Sélectionner Windows 11", exact: true }).check();
    await card.evaluate(el => {
      el.hass = { ...el.hass, states: { ...el.hass.states,
        "switch.proxmox_vm_windows": { ...el.hass.states["switch.proxmox_vm_windows"], state: "on" },
      }};
    });
    await dialog.locator(".list-row").filter({ hasText: "Windows 11" }).getByRole("checkbox").waitFor({ state: "detached" });
    assert.match(await dialog.locator(".sticky-actions").innerText(), /0 sélectionné/);
    await card.evaluate(el => {
      el.hass = { ...el.hass, states: { ...el.hass.states,
        "switch.proxmox_vm_windows": { ...el.hass.states["switch.proxmox_vm_windows"], state: "off" },
      }};
    });
    await dialog.getByRole("checkbox", { name: "Sélectionner Windows 11", exact: true }).waitFor();
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
    await card.getByRole("button", { name: "Conteneurs LXC", exact: true }).click();
    dialog = card.getByRole("dialog");
    assert.match(await dialog.innerText(), /Mosquitto/);
    assert.equal(await dialog.getByRole("checkbox").count(), 0, "No checkbox for running LXC");
    assert.doesNotMatch(await dialog.innerText(), /Home Assistant|Windows 11|Machines virtuelles/);
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
    await card.getByRole("button", { name: "Détails du nœud", exact: true }).click();
    dialog = card.getByRole("dialog");
    assert.doesNotMatch(await dialog.innerText(), /Home Assistant|Mosquitto|Volumes des VM|NVMe physique/);
    assert.match(await dialog.innerText(), /RAM/);
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
    assert.equal(await card.locator(".machine-bars .machine-bar").count(), 2);
    await card.getByRole("button", { name: "Stockages et disques", exact: true }).click();
    dialog = card.getByRole("dialog");
    assert.match(await dialog.innerText(), /Sauvegardes/);
    assert.match(await dialog.innerText(), /NVMe physique/);
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click();

    // An arbitrarily long list must remain complete, including the final configured label.
    await card.evaluate(el => {
      el.setConfig({ ...el.config, storages: Array.from({length: 20}, (_, i) => ({
        name: "Volume " + (i + 1), usage_entity: "sensor.proxmox_storage"
      })) });
    });
    assert.equal(await card.locator(".machine-bars .machine-bar").count(), 20);
    assert.match(await card.locator(".machine-bars").innerText(), /Volume 20/);
    await card.locator(".machine-bars .machine-bar").last().scrollIntoViewIfNeeded();
    assert.ok(await card.locator(".machine-panel").evaluate(el => el.scrollTop > 0), "Long storage list scrolls");

    // Narrow cards: circular gauges on the same row, clear of the rail and each other.
    for (const width of [260, 300, 380, 500]) {
      for (const tag of ["auralis-pc-card", "auralis-unraid-card", "auralis-proxmox-card"]) {
        const target = page.locator(tag);
        await target.evaluate((el, width) => { el.style.width = width + "px"; }, width);
        const boxes = await target.locator(".machine-resource-gauges .machine-gauge").evaluateAll(nodes =>
          nodes.map(n => { const r=n.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,width:r.width,height:r.height}; }));
        assert.equal(boxes.length, 2);
        assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 1, tag + " same row");
        assert.ok(boxes[0].right < boxes[1].x, tag + " no gauge overlap");
        for (const b of boxes) assert.ok(Math.abs(b.width - b.height) < 1, tag + " circular");
        const rail = target.locator(".machine-rail");
        if (await rail.count()) {
          const r = await rail.boundingBox();
          assert.ok(boxes[1].right <= r.x, tag + " clear of rail");
        }
      }
      assert.ok(await card.locator(".node-information").evaluate(el => el.scrollWidth <= el.clientWidth), "Info tiles fit narrow cards");
    }
    await card.evaluate(el => el.setConfig({ ...el.config, storages: [
      { name: "Système local", usage_entity: "sensor.proxmox_storage" },
      { name: "Disques des VM", usage_entity: "sensor.proxmox_storage" },
      { name: "Sauvegardes", usage_entity: "sensor.proxmox_storage" },
    ] }));
    await card.evaluate(el => { el.style.width = "390px"; });
    await card.screenshot({ path: path.join(output, "proxmox-0.12.2.png") });
    // Unavailable metrics disappear while a real 0% CPU stays visible.
    await card.evaluate(el => {
      el.hass = { ...el.hass, states: { ...el.hass.states,
        [el.config.cluster_usage_entity]: { ...el.hass.states[el.config.cluster_usage_entity], state:"0" },
        [el.config.memory_entity]: { ...el.hass.states[el.config.memory_entity], state:"unavailable" },
      }};
    });
    assert.equal(await card.locator(".machine-resource-gauges [role=meter]").count(), 1);
    assert.equal(await card.locator(".machine-resource-gauges [role=meter]").getAttribute("aria-valuenow"), "0");
    await card.evaluate(el => {
      el.hass = { ...el.hass, states: { ...el.hass.states,
        [el.config.cluster_usage_entity]: { ...el.hass.states[el.config.cluster_usage_entity], state: "unavailable" },
      } };
    });
    assert.equal(await card.locator(".machine-resource-gauges").count(), 0);
    const infoBox = await card.locator(".node-information").boundingBox();
    const railBox = await card.locator(".machine-rail").boundingBox();
    assert.ok(infoBox.y > railBox.y + railBox.height, "Info zone clears the rail when CPU and RAM are unavailable");
    assert.deepEqual(errors, []);
    console.log("PASS: configurable info tiles, missing data, backup state transitions; CPU/RAM gauges on 3 cards at 4 widths; isolated VM/LXC/details/storage popups; active colors; 20 storages; unavailable metrics; no browser exceptions.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

