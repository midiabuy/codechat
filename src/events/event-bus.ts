import { createEventBus, Slot, slot } from "ts-event-bus";
import { WebSocketClientChannel, WebSocketServerChannel } from "./channel";


const WhatsAppEvents = {
  sendMessage: slot<string>(),
};

const EventBus = createEventBus({
  events: WhatsAppEvents,
  channels: [new WebSocketClientChannel("ws://localhost:3001"), new WebSocketServerChannel(3001)],
});

EventBus.sendMessage.on((message) => {
  console.log(message);
});

export default EventBus;