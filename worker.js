
// Task worker in node.js
// Connects PULL socket to tcp://localhost:5557
// Collects workloads from ventilator via that socket
// Connects PUSH socket to tcp://localhost:5558
// Sends results to sink via that socket

var zmq = require('zeromq')
  , receiver = zmq.socket('pull')
  , sender = zmq.socket('push');


receiver.connect('tcp://localhost:5557');
sender.connect('tcp://localhost:5558');

receiver.on('message', async function (buf) {
  const [next, current] = buf.toString().split(' ')
  const message = `${parseInt(current) + parseInt(next)}`


  await sender.send(message)
  console.log(`${current} + ${next}`, `sent ${message}`);
});

process.on('SIGINT', function () {
  receiver.close();
  sender.close();
  process.exit();
});