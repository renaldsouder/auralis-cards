import { css } from "lit";

export const sharedStyles = css`
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
`;
