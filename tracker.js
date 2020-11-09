const { promisify } = require('util')
const zmq = require('zeromq');

const sender = zmq.socket('push');
sender.bindSync("tcp://*:5557");

const receiver = zmq.socket('pull');
receiver.bindSync("tcp://*:5558");

const sleep = promisify(setTimeout)

async function* streamify(element, event) {
  const pushQueue = [0,1]

  const sortAscending =  (a, b) => a-b

  const handler = (buf) => {

    pushQueue.push(parseInt(buf.toString()))
  }

  element.on(event, handler)

  await sleep(100)

  while (pushQueue.length) {
    yield result = pushQueue.sort(sortAscending).shift()
  }
}


async function* fib (n) {
  const isInfinite = n === undefined;
  let current = 0;
  let next = 1;

  const response_generator = streamify(receiver,'message')

  
  // Schedule the Jobs
  console.log("Sending tasks to workers...");
  sender.send( `${next} ${current}`) // Send the first job
  while (isInfinite || n--) {
    [current, next] = [next, current + next];
    await sender.send( `${next} ${current}`)    // Send all the rest
  }

  // Waiting for Responses
  for await ( const result of response_generator) {
    if(!result) {
      continue
    }
    yield result
  }
  return 
}

const main = async () => {
  

  process.stdin.on('data',async () => {
    const generator =  fib(30)
    for await( const num of generator) {
      console.log(num)
      await sleep(1000)
    }
    process.exit()
  })
}

main()