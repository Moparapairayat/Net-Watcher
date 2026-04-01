"use client";

export type LiveTelemetrySample = {
  protocol: "ping" | "tcpping";
  target: string;
  port?: number;
  ts: number;
  rttMs: number | null;
  error?: string;
  addr?: string;
};

const eventName = "netwatcher:live-telemetry";
const channelName = "netwatcher-live-telemetry";

let sharedChannel: BroadcastChannel | null = null;

function getChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!sharedChannel) {
    sharedChannel = new BroadcastChannel(channelName);
  }
  return sharedChannel;
}

export function publishLiveTelemetry(sample: LiveTelemetrySample) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<LiveTelemetrySample>(eventName, { detail: sample }));
  getChannel()?.postMessage(sample);
}

export function subscribeLiveTelemetry(handler: (sample: LiveTelemetrySample) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onWindowEvent = (event: Event) => {
    const customEvent = event as CustomEvent<LiveTelemetrySample>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  window.addEventListener(eventName, onWindowEvent as EventListener);

  const channel = getChannel();
  const onMessage = (event: MessageEvent<LiveTelemetrySample>) => {
    if (event.data) {
      handler(event.data);
    }
  };

  if (channel) {
    channel.addEventListener("message", onMessage as EventListener);
  }

  return () => {
    window.removeEventListener(eventName, onWindowEvent as EventListener);
    if (channel) {
      channel.removeEventListener("message", onMessage as EventListener);
    }
  };
}
