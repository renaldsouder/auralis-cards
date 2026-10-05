export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    icon?: string;
    unit_of_measurement?: string;
    current_position?: number;
    brightness?: number;
    rgb_color?: number[];
    supported_color_modes?: string[];
    color_mode?: string;
    temperature?: number;
    current_temperature?: number;
    target_temp_step?: number;
    min_temp?: number;
    max_temp?: number;
  };
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  locale?: { language?: string };
  themes?: { darkMode?: boolean };
  callWS?<T>(message: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown>;
  formatEntityState?: (state: HassEntity) => string;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }

  interface HTMLElementTagNameMap {
    "auralis-room-card": HTMLElement;
    "auralis-pc-card": HTMLElement;
    "auralis-unraid-card": HTMLElement;
    "auralis-proxmox-card": HTMLElement;
    "orbit-room-card": HTMLElement;
    "orbit-pc-card": HTMLElement;
    "orbit-unraid-card": HTMLElement;
    "orbit-proxmox-card": HTMLElement;
  }
}
