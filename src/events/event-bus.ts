import EventBus, { Subcriber } from '@tuxjs/eventbus';

const eventBus = new EventBus();

eventBus.subscribe('sendMessage', (message: string) => {
  console.log(message);
});

export default eventBus;