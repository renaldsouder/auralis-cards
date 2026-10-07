import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { RoomBackgroundMode, RoomCardConfig, RoomOverlayPosition, RoomSceneConfig, RoomSideControlConfig } from "../types/config";
import defaultSalonImage from "../assets/salon-default.jpg?inline";
import {
  coverPosition,
  displayState,
  entity,
  friendlyName,
  isActive,
  isAvailable,
  lightBrightness,
  lightRgbColor,
  lightSupportsColor,
  numericState,
  rgbToHex,
  summarizeRange,
} from "../utils/entities";
import {
  activateEntity,
  coverCommand,
  fireMoreInfo,
  setLightColor,
  setLightBrightness,
} from "../utils/actions";

export class AuralisRoomCard extends AuralisBaseCard<RoomCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    css`
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
    `,
  ];

  public setConfig(config: RoomCardConfig): void {
    const lights = config.lights || [];
    const covers = config.covers || [];
    if (!lights.length && !covers.length && !config.temperature_entity && !config.humidity_entity) {
      throw new Error("Configurez au moins une lumière, un volet ou un capteur.");
    }
    this.config = { ...config, theme: config.theme || "carbon", lights, covers };
  }

  static getStubConfig(): Partial<RoomCardConfig> {
    return {
      name: "Salon",
      theme: "carbon",
      lights: [],
      covers: [],
    };
  }

  static getConfigForm(): Record<string, unknown> {
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "subtitle", selector: { text: {} } },
        {
          name: "theme",
          selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } },
        },
        { name: "lights", selector: { entity: { multiple: true, filter: { domain: "light" } } } },
        { name: "covers", selector: { entity: { multiple: true, filter: { domain: "cover" } } } },
        { name: "left_controls", selector: { object: {} } },
        { name: "right_controls", selector: { object: {} } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
        { name: "thermostat", selector: { object: {} } },
        { name: "ambiance", selector: { object: {} } },
        { name: "scenes", selector: { object: {} } },
        { name: "entity_labels", selector: { object: {} } },
        { name: "cover_labels", selector: { object: {} } },
        { name: "popup_titles", selector: { object: {} } },
        { name: "climate_popup", selector: { object: {} } },
        { name: "temperature_entity", selector: { entity: {} } },
        { name: "humidity_entity", selector: { entity: {} } },
        { name: "climate_entity", selector: { entity: { filter: { domain: "climate" } } } },
        { name: "media_player_entity", selector: { entity: { filter: { domain: "media_player" } } } },
        { name: "scene_entity", selector: { entity: { filter: { domain: "scene" } } } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "accent_color", selector: { text: {} } },
      ],
    };
  }

  public getCardSize(): number {
    return 7;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }

  private readonly historyGraphConfigs = new Map<string, Record<string, unknown>>();
  private selectedMediaEntity?: string;
  private selectedMediaKind: "media" | "tv" = "media";
  private selectedMediaTitle?: string;
  private selectedMediaIcon?: string;

  private entityLabel(id: string | undefined, fallback: string): string {
    if (!id) return fallback;
    const configuredLabel = this.config?.entity_labels?.[id] ?? this.config?.cover_labels?.[id];
    return typeof configuredLabel === "string" && configuredLabel.trim()
      ? configuredLabel.trim()
      : friendlyName(entity(this.hass, id), fallback);
  }

  private popupTitle(key: "details" | "lights" | "covers" | "climate" | "media" | "tv" | "ambiance", fallback: string): string {
    const configuredTitle = this.config?.popup_titles?.[key];
    return typeof configuredTitle === "string" && configuredTitle.trim() ? configuredTitle.trim() : fallback;
  }

  private historyGraphConfig(entityId: string, label: string, hours: number): Record<string, unknown> {
    const normalizedHours = Math.min(43_800, Math.max(1, Math.round(hours)));
    const key = `${entityId}|${label}|${normalizedHours}`;
    const cached = this.historyGraphConfigs.get(key);
    if (cached) return cached;
    const graphConfig = {
      type: "history-graph",
      title: label,
      hours_to_show: normalizedHours,
      show_names: false,
      entities: [{ entity: entityId, name: label }],
    };
    this.historyGraphConfigs.set(key, graphConfig);
    return graphConfig;
  }

  private sideControls(side: "left" | "right"): RoomSideControlConfig[] {
    const configured = side === "left" ? this.config?.left_controls : this.config?.right_controls;
    if (configured !== undefined) {
      return configured.filter((control) => control && typeof control.type === "string").slice(0, 2);
    }
    if (side === "left" && this.config?.lights?.length) return [{ type: "lights" }];
    if (side === "right" && this.config?.media_player_entity) {
      return [{ type: "media", entity: this.config.media_player_entity }];
    }
    return [];
  }

  private safeCssColor(value: string | undefined, fallback: string): string {
    const color = value?.trim();
    return color && !/[;{}]/.test(color) ? color : fallback;
  }

  private roomCardBackground(): { mode: RoomBackgroundMode; showGrid: boolean; style: string } {
    const configuredMode = this.config?.card_background?.mode;
    const mode: RoomBackgroundMode = configuredMode === "solid" || configuredMode === "gradient"
      ? configuredMode
      : "grid";
    const configuredBackground = mode === "gradient"
      ? this.config?.card_background?.gradient
      : this.config?.card_background?.color;
    const background = configuredBackground?.trim();
    const safeBackground = background && !/[;{}]/.test(background) ? background : undefined;
    return {
      mode,
      showGrid: this.config?.show_grid ?? mode === "grid",
      style: safeBackground ? `--room-card-background:${safeBackground}` : "",
    };
  }

  private overlayPosition(value: string | undefined, fallback: RoomOverlayPosition): RoomOverlayPosition {
    return value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right"
      ? value
      : fallback;
  }

  private sceneModes(): RoomSceneConfig[] {
    if (this.config?.scenes !== undefined) {
      return this.config.scenes.filter((scene) => scene && typeof scene.entity === "string" && scene.entity.trim());
    }
    return this.config?.scene_entity
      ? [{ entity: this.config.scene_entity, label: "Mode soirée", icon: "mdi:creation-outline", position: "bottom-right" }]
      : [];
  }

  private ambiancePosition(modes: RoomSceneConfig[]): RoomOverlayPosition {
    return this.overlayPosition(this.config?.ambiance?.position || modes[0]?.position, "bottom-right");
  }

  private openMediaControl(control?: RoomSideControlConfig): void {
    const kind = control?.type === "tv" ? "tv" : "media";
    const fallbackEntity = kind === "media" ? this.config?.media_player_entity : undefined;
    const entityId = control?.entity || fallbackEntity;
    if (!entityId) return;
    this.selectedMediaEntity = entityId;
    this.selectedMediaKind = kind;
    this.selectedMediaTitle = control?.popup_title || control?.label;
    this.selectedMediaIcon = control?.icon;
    this.openDialog("media");
  }

  private handleSideControl(control: RoomSideControlConfig): void {
    if (control.type === "lights") return this.openDialog("lights");
    if (control.type === "covers") return this.openDialog("covers");
    if (control.type === "climate") return this.openDialog("climate");
    if (control.type === "media" || control.type === "tv") return this.openMediaControl(control);
    if (!control.entity) return;
    if (control.type === "scene" || control.action === "activate") {
      void activateEntity(this.hass!, control.entity);
      return;
    }
    if (control.action === "more-info") {
      fireMoreInfo(this, control.entity);
      return;
    }
    void this.hass?.callService("homeassistant", "toggle", {}, { entity_id: control.entity });
  }

  private renderSideControl(control: RoomSideControlConfig): TemplateResult {
    const lights = this.config?.lights || [];
    const covers = this.config?.covers || [];
    const entityId = control.entity
      || (control.type === "media" ? this.config?.media_player_entity : undefined)
      || (control.type === "climate" ? this.config?.climate_entity : undefined)
      || (control.type === "scene" ? this.config?.scene_entity || this.sceneModes()[0]?.entity : undefined);
    const state = entity(this.hass, entityId);
    let icon = control.icon || state?.attributes.icon || "mdi:circle-outline";
    let label = control.label || (entityId ? this.entityLabel(entityId, entityId) : "Commande");
    let value = entityId ? displayState(this.hass, entityId) : "—";
    let disabled = entityId ? !isAvailable(state) : false;
    let active = isActive(state);

    if (control.type === "lights") {
      const activeCount = lights.filter((id) => isActive(entity(this.hass, id))).length;
      icon = control.icon || (activeCount ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline");
      label = control.label || "Lumières";
      value = `${activeCount}/${lights.length}`;
      disabled = !lights.length;
      active = activeCount > 0;
    } else if (control.type === "covers") {
      const openCount = covers.filter((id) => isActive(entity(this.hass, id))).length;
      icon = control.icon || "mdi:blinds-horizontal";
      label = control.label || "Volets";
      value = `${openCount}/${covers.length}`;
      disabled = !covers.length;
      active = openCount > 0;
    } else if (control.type === "climate") {
      icon = control.icon || "mdi:thermostat";
      label = control.label || "Climat";
      value = displayState(this.hass, this.config?.temperature_entity);
      disabled = !this.config?.temperature_entity && !this.config?.climate_entity;
    } else if (control.type === "media") {
      icon = control.icon || "mdi:music-note";
      label = control.label || "Musique";
      value = isActive(state) && typeof state?.attributes.media_title === "string" ? state.attributes.media_title : "Lecture";
    } else if (control.type === "tv") {
      active = isAvailable(state) && state?.state !== "off" && state?.state !== "standby";
      icon = control.icon || (active ? "mdi:television" : "mdi:television-off");
      label = control.label || "TV";
      value = active ? "Allumée" : "Éteinte";
    } else if (control.type === "scene") {
      icon = control.icon || "mdi:creation-outline";
      label = control.label || "Ambiance";
      value = "Activer";
      disabled = !entityId;
    }

    return html`
      <button class="side-control ${active ? "active" : ""}" ?disabled=${disabled} title=${label} @click=${() => this.handleSideControl({ ...control, entity: entityId })}>
        <ha-icon .icon=${icon}></ha-icon>
        <strong>${value}</strong>
        <small>${label}</small>
      </button>
    `;
  }

  private renderSideColumn(side: "left" | "right", controls: RoomSideControlConfig[]): TemplateResult {
    return html`<div class="side-control-column ${side} ${controls.length > 1 ? "dual" : "single"}">${controls.map((control) => this.renderSideControl(control))}</div>`;
  }

  private thermostatEntityId(): string | undefined {
    return this.config?.thermostat?.entity || this.config?.climate_entity;
  }

  private thermostatTarget(): number | undefined {
    const state = entity(this.hass, this.thermostatEntityId());
    const target = state?.attributes.temperature ?? state?.attributes.current_temperature;
    return typeof target === "number" && Number.isFinite(target) ? target : undefined;
  }

  private adjustThermostat(direction: -1 | 1): void {
    const entityId = this.thermostatEntityId();
    const state = entity(this.hass, entityId);
    const target = this.thermostatTarget();
    if (!entityId || target === undefined || !isAvailable(state)) return;
    const configuredStep = Number(this.config?.thermostat?.step ?? state?.attributes.target_temp_step ?? 0.5);
    const step = Number.isFinite(configuredStep) && configuredStep > 0 ? configuredStep : 0.5;
    const min = typeof state?.attributes.min_temp === "number" ? state.attributes.min_temp : 5;
    const max = typeof state?.attributes.max_temp === "number" ? state.attributes.max_temp : 35;
    const next = Math.min(max, Math.max(min, Math.round((target + direction * step) * 10) / 10));
    void this.hass?.callService("climate", "set_temperature", { temperature: next }, { entity_id: entityId });
  }

  private renderThermostatControl(): TemplateResult | typeof nothing {
    const thermostat = this.config?.thermostat;
    const entityId = this.thermostatEntityId();
    if (thermostat?.show === false || !entityId) return nothing;
    const state = entity(this.hass, entityId);
    const target = this.thermostatTarget();
    const available = isAvailable(state) && target !== undefined;
    const label = thermostat?.label === undefined ? this.entityLabel(entityId, "Thermostat") : thermostat.label.trim();
    const showBorder = thermostat?.show_border !== false;
    const showBackground = thermostat?.show_background !== false;
    const borderColor = this.safeCssColor(thermostat?.border_color, "rgba(255,255,255,.16)");
    const backgroundColor = this.safeCssColor(thermostat?.background_color, "rgba(13,18,25,.76)");
    const style = [
      `--thermostat-label:${this.safeCssColor(thermostat?.label_color, "rgba(255,255,255,.72)")}`,
      `--thermostat-value:${this.safeCssColor(thermostat?.value_color, "#ffffff")}`,
      `--thermostat-button:${this.safeCssColor(thermostat?.button_color, "#ffd166")}`,
      `--thermostat-background:${backgroundColor}`,
      `--thermostat-border:${borderColor}`,
      `border:${showBorder ? `1px solid ${borderColor}` : "none"}`,
      `background:${showBackground ? backgroundColor : "transparent"}`,
      `backdrop-filter:${showBackground ? "blur(10px)" : "none"}`,
      `-webkit-backdrop-filter:${showBackground ? "blur(10px)" : "none"}`,
      `box-shadow:none`,
    ].join(";");
    const value = target === undefined
      ? "—"
      : `${target.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}°`;
    return html`
      <div class="thermostat-control ${showBorder ? "" : "no-border"} ${showBackground ? "" : "no-background"}" style=${style}>
        ${label ? html`<span class="thermostat-label">${label}</span>` : nothing}
        <div class="thermostat-row">
          <button class="thermostat-step" aria-label="Baisser la température" ?disabled=${!available} @click=${() => this.adjustThermostat(-1)}>−</button>
          <button class="thermostat-value" aria-label="Ouvrir la température et l'humidité" ?disabled=${!available} @click=${() => this.openDialog("climate")}>${value}</button>
          <button class="thermostat-step" aria-label="Augmenter la température" ?disabled=${!available} @click=${() => this.adjustThermostat(1)}>+</button>
        </div>
      </div>
    `;
  }

  private renderAmbianceButton(modes: RoomSceneConfig[]): TemplateResult | typeof nothing {
    if (!modes.length) return nothing;
    const label = this.config?.ambiance?.label?.trim() || "Ambiance";
    const icon = this.config?.ambiance?.icon?.trim() || "mdi:creation-outline";
    return html`
      <button class="scene-chip" title=${label} aria-haspopup="dialog" @click=${() => this.openDialog("ambiance")}>
        <ha-icon .icon=${icon}></ha-icon>${label}
      </button>
    `;
  }

  private renderOverlaySlot(position: RoomOverlayPosition, modes: RoomSceneConfig[]): TemplateResult | typeof nothing {
    const thermostatPosition = this.overlayPosition(this.config?.thermostat?.position, "bottom-left");
    const showThermostat = this.config?.thermostat?.show !== false
      && Boolean(this.thermostatEntityId())
      && thermostatPosition === position;
    const showAmbiance = modes.length > 0 && this.ambiancePosition(modes) === position;
    if (!showThermostat && !showAmbiance) return nothing;
    return html`
      <div class="photo-overlay-slot ${position}">
        ${showThermostat ? this.renderThermostatControl() : nothing}
        ${showAmbiance ? this.renderAmbianceButton(modes) : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const lights = this.config.lights || [];
    const covers = this.config.covers || [];
    const positions = covers.map((id) => coverPosition(entity(this.hass, id)));
    const temperature = numericState(entity(this.hass, this.config.temperature_entity), Number.NaN);
    const humidity = numericState(entity(this.hass, this.config.humidity_entity), Number.NaN);
    const unavailable = [...lights, ...covers].filter((id) => !isAvailable(entity(this.hass, id))).length;
    const leftControls = this.sideControls("left");
    const rightControls = this.sideControls("right");
    const sceneModes = this.sceneModes();
    const splitBottomControls = this.config.thermostat?.show !== false
      && Boolean(this.thermostatEntityId())
      && this.overlayPosition(this.config.thermostat?.position, "bottom-left") === "bottom-left"
      && sceneModes.length > 0
      && this.ambiancePosition(sceneModes) === "bottom-right";
    const cardBackground = this.roomCardBackground();
    const defaultSubtitle = unavailable
      ? `${unavailable} appareil${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}`
      : "Aucun appareil en alerte";
    const subtitle = this.config.subtitle === undefined ? defaultSubtitle : this.config.subtitle.trim();
    const image = (this.config.background_image?.trim() || defaultSalonImage)
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"');
    const configuredPosition = this.config.background_position?.trim();
    const position = configuredPosition && /^[\w\s.%+-]+$/.test(configuredPosition) ? configuredPosition : "center";
    const configuredAccent = this.config.accent_color?.trim();
    const accent = configuredAccent && !/[;{}]/.test(configuredAccent) ? configuredAccent : "#79d6f2";
    const roomImageStyle = `--room-image:url("${image}");--room-image-position:${position};--room-accent:${accent}`;

    return html`
      <ha-card>
        <div class="cinema-shell background-${cardBackground.mode} ${cardBackground.showGrid ? "show-grid" : ""}" style=${cardBackground.style}>
          <header class="cinema-header">
            <span class="room-avatar"><ha-icon .icon=${this.config.icon || "mdi:sofa-outline"}></ha-icon></span>
            <button class="cinema-title room-title-button" aria-label="Ouvrir les détails du salon" @click=${() => this.openDialog("details")}>
              <h2>${this.config.name || "Pièce"}</h2>
              ${subtitle ? html`<p>${subtitle}</p>` : nothing}
            </button>
            <div class="climate-pills">
              <button class="climate-pill" @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:thermometer"></ha-icon>${Number.isFinite(temperature) ? `${temperature.toLocaleString("fr-FR")}°` : "—"}</button>
              <button class="climate-pill" @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:water-percent"></ha-icon>${Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "—"}</button>
            </div>
          </header>
          <div class="cinema-body">
            ${this.renderSideColumn("left", leftControls)}
            <div class="room-photo ${splitBottomControls ? "split-bottom-controls" : ""}" style=${roomImageStyle}>
              ${this.renderOverlaySlot("top-left", sceneModes)}
              ${this.renderOverlaySlot("top-right", sceneModes)}
              ${this.renderOverlaySlot("bottom-left", sceneModes)}
              ${this.renderOverlaySlot("bottom-right", sceneModes)}
            </div>
            ${this.renderSideColumn("right", rightControls)}
            <div class="cover-dock">
              <button class="cover-command" @click=${() => coverCommand(this.hass!, covers, "open")}><ha-icon icon="mdi:chevron-double-up"></ha-icon>Ouvrir</button>
              <button class="cover-command center" @click=${() => this.openDialog("covers")}><ha-icon icon="mdi:blinds-horizontal"></ha-icon>${summarizeRange(positions)}</button>
              <button class="cover-command" @click=${() => coverCommand(this.hass!, covers, "close")}><ha-icon icon="mdi:chevron-double-down"></ha-icon>Fermer</button>
            </div>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "lights" ? this.renderLightsDialog() : nothing}
      ${this.dialog === "covers" ? this.renderCoversDialog() : nothing}
      ${this.dialog === "climate" ? this.renderClimateDialog() : nothing}
      ${this.dialog === "media" ? this.renderMediaDialog() : nothing}
      ${this.dialog === "ambiance" ? this.renderAmbianceDialog() : nothing}
      ${this.dialog === "details" ? this.renderDetailsDialog() : nothing}
    `;
  }

  private toggleAllLights = async (): Promise<void> => {
    const ids = this.config?.lights || [];
    const anyOn = ids.some((id) => isActive(entity(this.hass, id)));
    await this.hass?.callService("light", anyOn ? "turn_off" : "turn_on", {}, { entity_id: ids });
  };

  private renderLightsDialog(): TemplateResult {
    const ids = this.config?.lights || [];
    const states = ids.map((id) => entity(this.hass, id));
    const activeCount = states.filter(isActive).length;
    const activeBrightness = states.filter(isActive).map(lightBrightness);
    const average = activeBrightness.length
      ? Math.round(activeBrightness.reduce((sum, value) => sum + value, 0) / activeBrightness.length)
      : 0;
    const colorIds = ids.filter((id) => {
      const state = entity(this.hass, id);
      return isAvailable(state) && lightSupportsColor(state);
    });
    const referenceColorState = colorIds
      .map((id) => entity(this.hass, id))
      .find((state) => isActive(state) && lightRgbColor(state))
      ?? entity(this.hass, colorIds[0]);
    const groupColor = rgbToHex(lightRgbColor(referenceColorState));

    return this.renderDialog(
      this.popupTitle("lights", "Lumières"),
      "mdi:lightbulb-group-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Éclairage de la pièce</span><strong>${activeCount} lumière${activeCount > 1 ? "s" : ""} allumée${activeCount > 1 ? "s" : ""} sur ${ids.length}</strong><span class="muted">Commande globale et réglages individuels</span></div>
            <div class="dialog-stat"><strong>${average}%</strong><small>moyenne</small></div>
          </div>
          <div class="dialog-section-title">Commande générale</div>
          <div class="light-master-bar ${colorIds.length ? "" : "single"}">
            <button class="light-master-button ${activeCount ? "all-off" : "all-on"}" @click=${this.toggleAllLights}>
              <ha-icon icon=${activeCount ? "mdi:lightbulb-group-off-outline" : "mdi:lightbulb-group-outline"}></ha-icon>
              <strong>${activeCount ? "Tout éteindre" : "Tout allumer"}</strong>
            </button>
            ${colorIds.length
              ? html`
                  <label class="global-color-control">
                    <input class="color-picker" type="color" .value=${groupColor} aria-label="Couleur générale" @change=${(event: Event) => setLightColor(this.hass!, colorIds, (event.target as HTMLInputElement).value)} />
                    <span><strong>Couleur générale</strong><small>${colorIds.length} éclairage${colorIds.length > 1 ? "s" : ""} compatible${colorIds.length > 1 ? "s" : ""}</small></span>
                  </label>
                `
              : nothing}
          </div>
          <label class="tile" style="display:block;margin-bottom:14px;">
            <div class="row-between"><span style="display:flex;align-items:center;gap:8px;"><ha-icon style="color:var(--auralis-active);" icon="mdi:white-balance-sunny"></ha-icon><strong>Luminosité générale</strong></span><strong>${average} %</strong></div>
            <input class="range light-slider" style=${`--range-value:${average}%`} type="range" min="1" max="100" .value=${String(average)}
              @change=${(event: Event) => ids.forEach((id) => setLightBrightness(this.hass!, id, Number((event.target as HTMLInputElement).value)))} />
          </label>
          <div class="dialog-section-title">Lumières</div>
          <div class="list">
            ${ids.map((id) => {
              const state = entity(this.hass, id);
              const brightness = lightBrightness(state);
              const label = this.entityLabel(id, id);
              const active = isActive(state);
              const supportsColor = lightSupportsColor(state);
              const color = rgbToHex(lightRgbColor(state));
              return html`
                <div class="list-row">
                  <span class="tile-icon light-status-icon ${active ? "on" : ""}" style=${`--light-status-color:${color}`}><ha-icon .icon=${active ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon></span>
                  <div class="meta">
                    <div class="row-between"><span class="name">${label}</span><span>${brightness} %</span></div>
                    <div class="light-setting-row">
                      <input class="range light-slider" style=${`--range-value:${brightness}%`} type="range" min="1" max="100" .value=${String(Math.max(brightness, 1))} ?disabled=${!isAvailable(state)}
                        aria-label=${`Luminosité de ${label}`} @change=${(event: Event) => setLightBrightness(this.hass!, id, Number((event.target as HTMLInputElement).value))} />
                      ${supportsColor
                        ? html`<input class="color-picker" type="color" .value=${color} title=${`Couleur de ${label}`} aria-label=${`Couleur de ${label}`} ?disabled=${!isAvailable(state)} @change=${(event: Event) => setLightColor(this.hass!, [id], (event.target as HTMLInputElement).value)} />`
                        : nothing}
                    </div>
                  </div>
                  <button class="device-toggle ${active ? "on" : ""}" aria-label=${active ? `Éteindre ${label}` : `Allumer ${label}`} aria-pressed=${active ? "true" : "false"} ?disabled=${!isAvailable(state)} @click=${() => this.hass!.callService("light", active ? "turn_off" : "turn_on", {}, { entity_id: id })}></button>
                </div>
              `;
            })}
          </div>
        </div>
      `,
    );
  }

  private activateSceneMode(mode: RoomSceneConfig): void {
    void activateEntity(this.hass!, mode.entity);
    this.closeDialog();
  }

  private renderAmbianceDialog(): TemplateResult {
    const modes = this.sceneModes();
    const title = this.popupTitle("ambiance", "Ambiance");
    const icon = this.config?.ambiance?.icon?.trim() || "mdi:creation-outline";
    return this.renderDialog(
      title,
      icon,
      html`
        <div class="dialog-body">
          <div class="dialog-section-title">Choisir un mode</div>
          <div class="ambiance-options">
            ${modes.map((mode) => {
              const state = entity(this.hass, mode.entity);
              const label = mode.label?.trim() || this.entityLabel(mode.entity, "Ambiance");
              const modeIcon = mode.icon?.trim() || state?.attributes.icon || "mdi:creation-outline";
              return html`
                <button class="ambiance-option" @click=${() => this.activateSceneMode(mode)}>
                  <span class="tile-icon"><ha-icon .icon=${modeIcon}></ha-icon></span>
                  <span class="ambiance-option-copy">
                    <strong>${label}</strong>
                    <small>Activer cette ambiance</small>
                  </span>
                  <ha-icon icon="mdi:chevron-right"></ha-icon>
                </button>
              `;
            })}
          </div>
        </div>
      `,
      "ambiance-dialog",
    );
  }

  private renderCoversDialog(): TemplateResult {
    const ids = this.config?.covers || [];
    const states = ids.map((id) => entity(this.hass, id));
    const openCount = states.filter((state) => state?.state === "open" || state?.state === "opening").length;
    const movingCount = states.filter((state) => state?.state === "opening" || state?.state === "closing").length;
    const availableCount = states.filter((state) => isAvailable(state)).length;
    return this.renderDialog(
      this.popupTitle("covers", "Volets"),
      "mdi:blinds-horizontal",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Ouvertures de la pièce</span><strong>${openCount} volet${openCount === 1 ? "" : "s"} ouvert${openCount === 1 ? "" : "s"} sur ${ids.length}</strong><span class="muted">${movingCount ? `${movingCount} en mouvement` : "Commandes directes, sans position intermédiaire"}</span></div>
            <div class="dialog-stat"><strong>${availableCount}/${ids.length}</strong><small>disponibles</small></div>
          </div>
          <div class="dialog-section-title">Commande groupée</div>
          <div class="group-bar">
            <button class="action" @click=${() => coverCommand(this.hass!, ids, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
            <button class="action" @click=${() => coverCommand(this.hass!, ids, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
            <button class="action" @click=${() => coverCommand(this.hass!, ids, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
          </div>
          <div class="dialog-section-title">Volets</div>
          <div class="list">
            ${ids.map((id) => {
              const state = entity(this.hass, id);
              const stateLabel = !isAvailable(state)
                ? "Indisponible"
                : state?.state === "open"
                  ? "Ouvert"
                  : state?.state === "opening"
                    ? "Ouverture en cours"
                    : state?.state === "closing"
                      ? "Fermeture en cours"
                      : state?.state === "closed"
                        ? "Fermé"
                        : displayState(this.hass, id);
              return html`
                <div class="list-row cover-device-row">
                  <span class="tile-icon"><ha-icon .icon=${state?.attributes.icon || "mdi:blinds-horizontal"}></ha-icon></span>
                  <div class="meta">
                    <span class="name">${this.entityLabel(id, id)}</span>
                    <span class="muted">${stateLabel}</span>
                  </div>
                  <div class="cover-device-actions">
                    <button class="action" ?disabled=${!isAvailable(state)} @click=${() => coverCommand(this.hass!, [id], "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
                    <button class="action" ?disabled=${!isAvailable(state)} @click=${() => coverCommand(this.hass!, [id], "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
                    <button class="action" ?disabled=${!isAvailable(state)} @click=${() => coverCommand(this.hass!, [id], "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      `,
    );
  }

  private renderDetailsDialog(): TemplateResult {
    const all = [...(this.config?.lights || []), ...(this.config?.covers || [])];
    const activeLights = (this.config?.lights || []).filter((id) => isActive(entity(this.hass, id))).length;
    const temperature = displayState(this.hass, this.config?.temperature_entity);
    const humidity = displayState(this.hass, this.config?.humidity_entity);
    return this.renderDialog(
      this.popupTitle("details", this.config?.name || "Pièce"),
      this.config?.icon || "mdi:sofa-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Vue d'ensemble</span><strong>${this.config?.name || "Pièce"} est prête</strong><span class="muted">Climat, éclairage, ouvrants et multimédia</span></div>
            <div class="dialog-stat"><strong>${temperature}</strong><small>${humidity} humidité</small></div>
          </div>
          <div class="dialog-section-title">Accès rapides</div>
          <div class="grid two" style="margin-bottom:18px;">
            <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => this.openDialog("lights")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:lightbulb-group-outline"></ha-icon></span><strong>${activeLights}/${this.config?.lights?.length || 0}</strong></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("lights", "Lumières")}</div><div class="muted">Régler l'intensité</div></button>
            <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => this.openDialog("covers")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:blinds-horizontal"></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("covers", "Volets")}</div><div class="muted">Ouvrir, stopper ou fermer</div></button>
            <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => this.openDialog("climate")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:thermometer"></ha-icon></span><strong>${temperature}</strong></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("climate", "Température et humidité")}</div><div class="muted">${humidity} d'humidité</div></button>
            <button class="tile clickable" style="color:inherit;text-align:left;" ?disabled=${!this.config?.media_player_entity} @click=${() => this.openMediaControl({ type: "media", entity: this.config?.media_player_entity })}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:music-note"></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div><div style="margin-top:10px;font-weight:680;">${this.popupTitle("media", "Multimédia")}</div><div class="muted">Lecture indépendante</div></button>
          </div>
          <div class="dialog-section-title">Tous les appareils</div>
          <div class="grid two">
            ${all.map((id) => {
              const state = entity(this.hass, id);
              const label = this.entityLabel(id, id);
              return html`
                <button class="tile clickable" style="color:inherit;text-align:left;" @click=${() => fireMoreInfo(this, id)}>
                  <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${state?.attributes.icon || "mdi:circle-outline"}></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div>
                  <div style="margin-top:12px;font-weight:680;">${label}</div>
                  <div class="muted">${displayState(this.hass, id)}</div>
                </button>
              `;
            })}
          </div>
        </div>
      `,
    );
  }

  private renderClimateDialog(): TemplateResult {
    const temperature = displayState(this.hass, this.config?.temperature_entity);
    const humidity = displayState(this.hass, this.config?.humidity_entity);
    const climate = displayState(this.hass, this.config?.climate_entity, "Confort");
    const defaultEntities = [this.config?.temperature_entity, this.config?.humidity_entity].filter(
      (id): id is string => Boolean(id),
    );
    const configuredEntities = this.config?.climate_popup?.graph_entities;
    const graphEntities = [...new Set(configuredEntities === undefined ? defaultEntities : configuredEntities.filter(Boolean))];
    const periodUnit = this.config?.climate_popup?.graph_period_unit || "hours";
    const legacyHours = this.config?.climate_popup?.graph_hours;
    const configuredPeriod = Number(this.config?.climate_popup?.graph_period ?? legacyHours ?? 24);
    const maximumPeriod = periodUnit === "months" ? 60 : periodUnit === "days" ? 1_825 : 43_800;
    const graphPeriod = Number.isFinite(configuredPeriod)
      ? Math.min(maximumPeriod, Math.max(1, Math.round(configuredPeriod)))
      : 24;
    const periodMultiplier = periodUnit === "months" ? 30 * 24 : periodUnit === "days" ? 24 : 1;
    const graphHours = graphPeriod * periodMultiplier;
    const periodLabel = `${graphPeriod.toLocaleString("fr-FR")} ${periodUnit === "months" ? `mois` : periodUnit === "days" ? `jour${graphPeriod > 1 ? "s" : ""}` : `heure${graphPeriod > 1 ? "s" : ""}`}`;
    const showOverview = this.config?.climate_popup?.show_overview !== false;
    const showCurrentValues = this.config?.climate_popup?.show_current_values === true;
    const showThermostat = Boolean(this.config?.climate_entity) && this.config?.climate_popup?.show_thermostat !== false;
    return this.renderDialog(
      this.popupTitle("climate", "Température et humidité"),
      "mdi:thermometer",
      html`
        <div class="dialog-body">
          ${showOverview
            ? html`<div class="dialog-overview"><div><span class="eyebrow">Confort de la pièce</span><strong>${temperature} · ${humidity}</strong><span class="muted">Historique sur ${periodLabel}</span></div><div class="dialog-stat"><strong>${this.config?.climate_entity ? climate : graphEntities.length}</strong><small>${this.config?.climate_entity ? "mode" : `graphe${graphEntities.length > 1 ? "s" : ""}`}</small></div></div>`
            : nothing}
          ${showCurrentValues && graphEntities.length
            ? html`
                <div class="dialog-section-title">Valeurs actuelles</div>
                <div class="grid two">
                  ${graphEntities.map((id) => {
                    const isTemperature = id === this.config?.temperature_entity;
                    const isHumidity = id === this.config?.humidity_entity;
                    const label = this.entityLabel(id, isTemperature ? "Température" : isHumidity ? "Humidité" : id);
                    const icon = entity(this.hass, id)?.attributes.icon || (isTemperature ? "mdi:thermometer" : isHumidity ? "mdi:water-percent" : "mdi:chart-line");
                    return html`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span><strong>${displayState(this.hass, id)}</strong></div><div style="margin-top:10px;">${label}</div></div>`;
                  })}
                </div>
              `
            : nothing}
          ${graphEntities.length
            ? html`
                <div class="history-graphs">
                  ${graphEntities.map((id) => {
                    const fallback = id === this.config?.temperature_entity ? "Température" : id === this.config?.humidity_entity ? "Humidité" : id;
                    const label = this.entityLabel(id, fallback);
                    return html`<hui-card class="history-graph" .hass=${this.hass} .config=${this.historyGraphConfig(id, label, graphHours)}></hui-card>`;
                  })}
                </div>
              `
            : nothing}
          ${showThermostat
            ? html`<div class="dialog-section"><div class="dialog-section-title">Réglages</div><button class="action primary" style="width:100%;" @click=${() => fireMoreInfo(this, this.config?.climate_entity)}><ha-icon icon="mdi:tune-variant"></ha-icon>Ouvrir ${this.entityLabel(this.config?.climate_entity, "le thermostat Home Assistant")}</button></div>`
            : nothing}
        </div>
      `,
    );
  }

  private renderMediaDialog(): TemplateResult {
    const id = this.selectedMediaEntity || this.config?.media_player_entity;
    const kind = this.selectedMediaKind;
    const media = entity(this.hass, id);
    const playerLabel = this.entityLabel(id, kind === "tv" ? "Télévision" : "Lecteur multimédia");
    const title = typeof media?.attributes.media_title === "string" ? media.attributes.media_title : playerLabel;
    const artist = typeof media?.attributes.media_artist === "string" ? media.attributes.media_artist : "Salon";
    const rawVolume = media?.attributes.volume_level;
    const volume = typeof rawVolume === "number" ? Math.round(rawVolume * 100) : 0;
    const playing = media?.state === "playing";
    const powered = isAvailable(media) && media?.state !== "off" && media?.state !== "standby";
    const dialogTitle = this.selectedMediaTitle?.trim()
      || this.popupTitle(kind === "tv" ? "tv" : "media", kind === "tv" ? "Télévision" : "Multimédia");
    const dialogIcon = this.selectedMediaIcon || (kind === "tv" ? "mdi:television" : "mdi:music-note");
    return this.renderDialog(
      dialogTitle,
      dialogIcon,
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${playerLabel}</span><strong>${title}</strong><span class="muted">${kind === "tv" ? (powered ? "allumée" : "éteinte") : `${artist} · ${playing ? "lecture en cours" : "en pause"}`}</span></div><div class="dialog-stat"><strong>${volume}%</strong><small>volume</small></div></div>
          <div class="dialog-section-title">${kind === "tv" ? "Commandes TV" : "Lecture"}</div>
          ${kind === "tv"
            ? html`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action ${powered ? "danger" : "primary"}" @click=${() => this.hass?.callService("media_player", powered ? "turn_off" : "turn_on", {}, { entity_id: id })}><ha-icon icon="mdi:power"></ha-icon>${powered ? "Éteindre" : "Allumer"}</button>
                  <button class="action" ?disabled=${!powered} @click=${() => this.hass?.callService("media_player", "media_play_pause", {}, { entity_id: id })}><ha-icon icon=${playing ? "mdi:pause" : "mdi:play"}></ha-icon>${playing ? "Pause" : "Lecture"}</button>
                  <button class="action" @click=${() => fireMoreInfo(this, id)}><ha-icon icon="mdi:tune-variant"></ha-icon>Détails</button>
                </div>
              `
            : html`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action" @click=${() => this.hass?.callService("media_player", "media_previous_track", {}, { entity_id: id })}><ha-icon icon="mdi:skip-previous"></ha-icon>Précédent</button>
                  <button class="action primary" @click=${() => this.hass?.callService("media_player", "media_play_pause", {}, { entity_id: id })}><ha-icon icon=${playing ? "mdi:pause" : "mdi:play"}></ha-icon>${playing ? "Pause" : "Lecture"}</button>
                  <button class="action" @click=${() => this.hass?.callService("media_player", "media_next_track", {}, { entity_id: id })}><ha-icon icon="mdi:skip-next"></ha-icon>Suivant</button>
                </div>
              `}
          <label class="tile" style="display:block;margin-top:14px;"><div class="row-between"><span style="display:flex;align-items:center;gap:8px;"><ha-icon icon="mdi:volume-high"></ha-icon><strong>Volume</strong></span><strong>${volume}%</strong></div><input class="range" type="range" min="0" max="100" .value=${String(volume)} @change=${(event: Event) => this.hass?.callService("media_player", "volume_set", { volume_level: Number((event.target as HTMLInputElement).value) / 100 }, { entity_id: id })} /></label>
        </div>
      `,
    );
  }
}
